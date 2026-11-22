const MODULE = "gambits-premades";
const MARKER = "flags.gambits-premades.strokeOfLuck";
const pending = new Set();

function feature(actor) {
    if(!actor?.getFlag(MODULE, "strokeOfLuck")) return;
    return actor.appliedEffects.find(e => e.active && e.parent?.documentName === "Item"
        && e.system.changes.some(c => c.key === MARKER))?.parent;
}

const available = item => item && Number(item.system.uses.spent ?? 0) < Number(item.system.uses.max);

async function ask(actor, token, item, key) {
    const prompt = game.i18n.localize(`GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Rogue.StrokeOfLuck.${key}`);
    let dialogId = "strokeofluck";
    let dialogTitlePrimary = `${actor.name} | ${item.name}`;
    let dialogTitleGM = game.i18n.format("GAMBITSPREMADES.Dialogs.Common.WaitingForSelection", { actorName: actor.name, itemName: item.name });
    let browserUser = game.gps.getBrowserUser({ actorUuid: actor.uuid });
    let gmUser = game.gps.getPrimaryGM();
    let initialTimeLeft = 30;

    let dialogContent = `
        <div class="gps-dialog-container">
            <div class="gps-dialog-section">
                <div class="gps-dialog-content">
                    <div>
                        <div class="gps-dialog-flex">
                            <p class="gps-dialog-paragraph">${prompt}</p>
                            <div id="image-container" class="gps-dialog-image-container">
                                <img id="img_${dialogId}" src="${item.img}" class="gps-dialog-image">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="gps-dialog-button-container">
                <button id="pauseButton_${dialogId}" type="button" class="gps-dialog-button">
                    <i class="fas fa-pause" id="pauseIcon_${dialogId}" style="margin-right: 5px;"></i>${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Pause")}
                </button>
            </div>
        </div>
    `;

    if(!token) return game.gps.confirmAutomationDialog({window: {title: dialogTitlePrimary},
        content: `<p>${prompt}</p>`, initialTimeLeft, rejectClose: false});

    let content = `<span style='text-wrap: wrap;'><img src="${actor.img}" style="width: 25px; height: auto;" /> ${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Rogue.StrokeOfLuck.Available", { actorName: actor.name, itemName: item.name })}</span>`
    let chatData = { user: gmUser, content: content, roll: false };
    let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

    let result;

    if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
        let userDialogArgs = { dialogTitle: dialogTitlePrimary, dialogContent, dialogId, initialTimeLeft, validTokenPrimaryUuid: token.uuid, source: "user", type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };

        let gmDialogArgs = { dialogTitle: dialogTitleGM, dialogContent, dialogId, initialTimeLeft, validTokenPrimaryUuid: token.uuid, source: "gm", type: "multiDialog", notificationId: notificationMessage._id };

        result = await game.gps.handleDialogPromises({userDialogArgs, gmDialogArgs});
    } else {
        result = await game.gps.queryDialog("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
    }

    return result?.userDecision === true;
}

async function use(actor, token, item, key, apply) {
    if(!available(item) || pending.has(item.uuid)) return;
    pending.add(item.uuid);
    try {
        if(!await ask(actor, token, item, key) || !available(item) || feature(actor)?.uuid !== item.uuid) return;
        const result = await apply();
        await item.update({"system.uses.spent": Number(item.system.uses.spent ?? 0) + 1});
        return result;
    } finally { pending.delete(item.uuid); }
}

/** Replace the check before the system or Midi posts or consumes its result. */
export async function strokeOfLuckCheck(roll, config, message) {
    const actor = config.subject;
    const item = feature(actor);
    if(!available(item) || !actor.isOwner || roll.isSuccess) return;
    const die = roll.dice?.find(d => d.faces === 20);
    if(!die || !die.results.some(r => r.active !== false && !r.discarded && r.result !== 20)) return;
    const speaker = message?.data?.speaker;
    const doc = (speaker?.scene && game.scenes.get(speaker.scene)?.tokens.get(speaker.token))
        ?? actor.token ?? actor.getActiveTokens(false, true)[0];
    return use(actor, doc?.actor?.uuid === actor.uuid ? doc : undefined, item, "Prompt", () => game.gps.replaceD20Result(roll, 20));
}

export async function strokeOfLuck({actor, token, args, workflow}) {
    if(args?.[0]?.macroPass !== "preCheckHits" || workflow.targets.count !== 1) return;
    const target = workflow.targets.documents[0];
    if(workflow.isCritical || (!workflow.isFumble && workflow.attackTotal >= target.actor.system.attributes.ac.value)) return;
    return use(actor, game.gps.tokenDocument(token), feature(actor), "VeMissedAttack", async () => {
        const options = workflow.workflowOptions;
        const prior = options.noOnUseMacro;
        try {
            options.noOnUseMacro = true;
            await workflow.setAttackRoll(await new Roll(String(Math.max(50, target.actor.system.attributes.ac.value))).evaluate());
        } finally { options.noOnUseMacro = prior; }
    });
}

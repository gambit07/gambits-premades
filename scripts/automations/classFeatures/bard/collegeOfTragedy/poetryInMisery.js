export async function poetryInMisery({workflowData,workflowType,workflowCombat}) {
    const workflow = workflowCombat ? await MidiQOL.Workflow.getWorkflow(workflowData) ?? null : null;
    if(!workflow && workflowCombat === true) return;
    const gpsUuid = "f4b6923a-eda4-4c29-a6fb-a1728f6e71e3";
    if(workflow?.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Poetry in Misery";
    let dialogId = gpsUuid;
    const triggeringTokens = workflowType === "save" && workflow
        ? Object.entries(workflow.tokenSaves ?? {}).filter(([, roll]) => roll.isFumble)
            .map(([uuid]) => [...(workflow.targets ?? [])].find(token => token.document?.uuid === uuid) ?? fromUuidSync(uuid)?.object).filter(token => token?.actor)
        : (workflow ? workflow.attackRoll : workflowData.roll)?.isFumble
            ? [workflow?.token ?? await MidiQOL.tokenForActor(workflowData.actor)].filter(token => token?.actor)
            : [];
    if(!triggeringTokens.length) return;
    const gmUser = game.gps.getPrimaryGM();
    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));
    const candidates = new Map();
    for(const triggeringToken of triggeringTokens) {
        const validTokens = game.gps.findValidTokens({initiatingToken: triggeringToken, targetedToken: triggeringToken, itemName, itemType: null, itemChecked: null, reactionCheck: true, sightCheck: false, rangeCheck: true, rangeTotal: 30, dispositionCheck: true, dispositionCheckType: "ally", workflowType, workflowCombat, gpsUuid});
        for(const token of validTokens) if(!candidates.has(token.actor.uuid)) candidates.set(token.actor.uuid, {token, triggeringToken});
    }
    for(const {token: validTokenPrimary, triggeringToken: initiatingToken} of candidates.values()) {
        if(MidiQOL.hasUsedReaction(validTokenPrimary.actor)) continue;
        const itemData = validTokenPrimary.actor.items.find(item => item.identifier?.includes("bardic-inspiration"));
        if(!itemData || !Number.isFinite(itemData.system.uses.spent) || itemData.system.uses.spent <= 0) continue;
        const chosenItem = validTokenPrimary.actor.items.find(item => item.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        if(!chosenItem) continue;
        const itemProperName = chosenItem.name;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = game.i18n.format("GAMBITSPREMADES.Dialogs.Common.WaitingForSelection", {actorName: validTokenPrimary.actor.name, itemName: itemProperName});
        const browserUser = game.gps.getBrowserUser({actorUuid: validTokenPrimary.actor.uuid});
        const rollType = game.i18n.localize(`GAMBITSPREMADES.ChatMessages.PoetryInMisery.RollTypes.${workflowType}`);

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Bard.CollegeOfTragedy.PoetryInMisery.Prompts.UseYourReaction.Default", { itemName: itemProperName, rollType })}</p>
                                <div id="image-container" class="gps-dialog-image-container">
                                    <img id="img_${dialogId}" src="${chosenItem.img}" class="gps-dialog-image">
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

        let result;
        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${game.i18n.format("GAMBITSPREMADES.ChatMessages.Common.ReactionAvailableRollTrigger", { actorName: validTokenPrimary.actor.name, itemProperName: itemProperName })}</span>`
        let chatData = { user: gmUser, content: content, roll: false };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid, focusTokenUuid: initiatingToken.document.uuid,source: "user",type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
            
            let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid, focusTokenUuid: initiatingToken.document.uuid,source: "gm",type: "multiDialog", notificationId: notificationMessage._id };
        
            result = await game.gps.handleDialogPromises({userDialogArgs, gmDialogArgs});
        } else {
            result = await game.gps.queryDialog("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid, focusTokenUuid: initiatingToken.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
        }

        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, source, type } = result || {};

        if (!userDecision) {
            continue;
        }
        else if (userDecision) {
            await game.gps.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

            await itemData.update({'system.uses.spent': Math.max(0, itemData.system.uses.spent - 1)});

            const typeText = game.i18n.format("GAMBITSPREMADES.ChatMessages.PoetryInMisery.NaturalOne", {actorName: initiatingToken.actor.name, rollType});

            let contentOutcome = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Bard.CollegeOfTragedy.PoetryInMisery.SoliloquizeOverRegain", { itemProperName: itemProperName, typeText: typeText })}<br/><img src="${initiatingToken.actor.img}" width="30" height="30" style="border:0px"></span>`;
            let actorPlayer = MidiQOL.playerForActor(validTokenPrimary.actor);
            let chatDataOutcome = {
            user: actorPlayer?.id ?? game.user.id,
            speaker: ChatMessage.getSpeaker({ token: validTokenPrimary }),
            content: contentOutcome
            };
            await ChatMessage.create(chatDataOutcome);
            continue;
        }
    }
}
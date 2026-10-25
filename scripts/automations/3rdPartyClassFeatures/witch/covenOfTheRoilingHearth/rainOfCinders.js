export async function rainOfCinders({workflowData,workflowType,workflowCombat}) {
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    if(workflowType === "attack" && !game.gps.reactionCanChangeOutcome(workflow)) return;
    const gpsUuid = "a95f3926-ba77-45ab-90d9-c0cf3cca10aa";
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Rain of Cinders";
    let dialogId = gpsUuid;
    let target = workflow.targets.first();
    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    let gmUser = game.gps.getPrimaryGM();
    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));

    if(workflow.targets.size > 1) return;

    let findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: target, itemName: itemName, itemType: "feature", itemChecked: ["drawing the hearth"], reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});

    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        if(workflowType === "attack" && !game.gps.reactionCanChangeOutcome(workflow)) return;
        if(!validTokenPrimary.actor.appliedEffects.some(e => e.flags["gambits-premades"]?.gpsUuid === "2300dad6-8de1-4fa5-9878-40cec8ee37aa")) {
            if(debugEnabled) game.gps.logInfo(`${itemName} for ${validTokenPrimary.actor.name} failed at parent effect active`);
            continue;
        }
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        let cprConfig = game.gps.getCprConfig({itemUuid: chosenItem.uuid});
        const { animEnabled } = cprConfig;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = game.i18n.format("GAMBITSPREMADES.Dialogs.Common.WaitingForSelection", { actorName: validTokenPrimary.actor.name, itemName: itemProperName });
        browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.ThirdPartyClassFeatures.Witch.CovenOfTheRoilingHearth.RainOfCinders.AttackedInitiate", { targetName: target.actor.name, itemProperName: itemProperName })}</p>
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

        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${game.i18n.format("GAMBITSPREMADES.ChatMessages.Common.ReactionAvailableAttackTrigger", { actorName: validTokenPrimary.actor.name, itemProperName: itemProperName })}</span>`
        let chatData = { user: gmUser, content: content, roll: false };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid, focusTokenUuid: workflow.token.document.uuid,source: "user",type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
            
            let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid, focusTokenUuid: workflow.token.document.uuid,source: "gm",type: "multiDialog", notificationId: notificationMessage._id };
        
            result = await game.gps.handleDialogPromises({userDialogArgs, gmDialogArgs});
        } else {
            result = await game.gps.queryDialog("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid, focusTokenUuid: workflow.token.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
        }

        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, source, type } = result || {};

        if (!userDecision) {
            continue;
        }
        else if (userDecision) {
            if(animEnabled) {
                for (let i = 0; i < 5; i++) {
                    new Sequence()
                        .effect()
                            .file("jaamod.fire.fuse_new")
                            .fadeIn(250)
                            .fadeOut(250)
                            .atLocation(workflow.token, { randomOffset: 0.3 })
                            .scaleToObject(1.1)
                            .spriteRotation(90)
                        .play();
                }
            }

            let saveResult;
            if(source && source === "user") saveResult = await game.gps.queryUser("gpsActivityUse", browserUser, {itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: workflow.token.document.uuid});
            else if(source && source === "gm") saveResult = await game.gps.queryUser("gpsActivityUse", gmUser, {itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: workflow.token.document.uuid});
            if(!saveResult) continue;

            if (saveResult.failedSaves.size !== 0) {
                const effect = validTokenPrimary.actor.appliedEffects.find(e => e.active && e.getFlag("gambits-premades", "gpsUuid") === "2300dad6-8de1-4fa5-9878-40cec8ee37aa");
                const state = effect?.getFlag("gambits-premades", "hearthSpirits");
                if(!state?.remaining) continue;
                const hit = !workflow.isFumble && (workflow.isCritical || workflow.attackTotal >= 10 + validTokenPrimary.actor.system.attributes.prof);
                const resolved = await game.gps.queryUser("resolveHearthSpirit", gmUser, {effectUuid: effect.uuid, activation: state.activation, hit});
                if(!resolved) continue;
                if(animEnabled) {
                    game.gps.animation.spellEffect({kind: "hearthOrb", at: validTokenPrimary, to: target, mode: "travel", scale: 0.4, color: "green", duration: 850});
                    if(hit) game.gps.animation.spellEffect({kind: "cinderBurst", at: target, scale: 1.5, color: "green", delay: 850});
                    else game.gps.animation.spellEffect({kind: "hearthOrb", at: target, to: validTokenPrimary, mode: "travel", scale: 0.4, color: "green", duration: 850, delay: 850});
                }
                const message = hit ? "SootSpiritAttackedHit" : "SootSpiritAttackedMiss";
                await ChatMessage.create({
                    user: MidiQOL.playerForActor(validTokenPrimary.actor)?.id ?? game.user.id,
                    speaker: ChatMessage.getSpeaker({token: validTokenPrimary}),
                    content: game.i18n.format(`GAMBITSPREMADES.ChatMessages.Automations.ThirdPartyClassFeatures.Witch.CovenOfTheRoilingHearth.${message}`, {sootSpiritsRemaining: resolved.remaining})
                });
                workflow.aborted = true;
            }
        }
    }
}

export async function witchesHex({workflowData,workflowType,workflowCombat}) {
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    if(workflowType === "attack" && !game.gps.reactionCanChangeOutcome(workflow)) return;
    const gpsUuid = "02fc5000-7f5d-462e-94ac-42a27f453a8f";
    const gpsUuidFlamesEmbrace = "ac1b7150-bf0c-4a83-a815-607031ee9e07"
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Witches Hex";
    let dialogId = gpsUuid;
    let gmUser = game.gps.getPrimaryGM();
    
    if(workflowType === "save" && workflow.saveResults.length === 0) return;
    if(workflowType === "attack" && (workflow.isCritical === true || workflow.isFumble === true)) return;

    let findValidTokens;

    if(workflowType === "attack") {
        findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "feature", itemChecked: [itemName], reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});
    }
    else if(workflowType === "save") {
        findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "feature", itemChecked: [itemName], reactionCheck: true, sightCheck: false, rangeCheck: false, rangeTotal: null, dispositionCheck: false, dispositionCheckType: "ally", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});
    }
    
    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        if(workflowType === "attack" && !game.gps.reactionCanChangeOutcome(workflow)) return;
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        let cprConfig = game.gps.getCprConfig({itemUuid: chosenItem.uuid});
        const { animEnabled } = cprConfig;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = game.i18n.format("GAMBITSPREMADES.Dialogs.Common.WaitingForSelection", { actorName: validTokenPrimary.actor.name, itemName: itemProperName });
        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));
        let hexDie = validTokenPrimary.actor.system.scale?.["kp-witch"]?.["hex-die"]?.die;
        if(!hexDie) {
            ui.notifications.error(game.i18n.localize("GAMBITSPREMADES.Notifications.ThirdPartyClassFeatures.Witch.WitchesHex.MustScale"))
            continue;
        }
        browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });
        let content;
        let dialogContent;

        if(workflowType === "save") {
            let targets = Array.from(workflow.saves).filter(t => t.document.disposition !== validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary, t) && game.gps.withinRange(validTokenPrimary, t, 60));

            const targetUuids = targets.map(t => t.document.uuid);
            const targetNames = targets.map(t => t.document.name);
            if(targetUuids.length === 0) continue;

            targetUuids.map((uuid, index) => 
                `<option value="${uuid}">${targetNames[index]}</option>`
            ).join('');
            
            dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <p class="gps-dialog-paragraph">${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.ThirdPartyClassFeatures.Witch.WitchesHex.Prompts.UseYourReaction.ReduceSave", { itemName: itemProperName })}</p>
                            <div>
                                <div class="gps-dialog-flex">
                                    <label for="enemy-token" class="gps-dialog-label">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Target")}</label>
                                    <select id="enemy-token" class="gps-dialog-select">
                                        ${targetNames.map((name, index) => `<option class="gps-dialog-option" value="${targetUuids[index]}">${name}</option>`).join('')}
                                    </select>
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

            content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${game.i18n.format("GAMBITSPREMADES.ChatMessages.Common.ReactionAvailableSaveTrigger", { actorName: validTokenPrimary.actor.name, itemProperName: itemProperName })}</span>`
        }

        if(workflowType === "attack") {
            dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.ThirdPartyClassFeatures.Witch.WitchesHex.Prompts.UseYourReaction.ReduceAttack", { itemName: itemProperName })}</p>
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

            content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${game.i18n.format("GAMBITSPREMADES.ChatMessages.Common.ReactionAvailableAttackTrigger", { actorName: validTokenPrimary.actor.name, itemProperName: itemProperName })}</span>`
        }
            
        let chatData = { user: gmUser, content: content, roll: false };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

        let result;
        
        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid, focusTokenUuid: workflowType === "attack" ? workflow.token.document.uuid : undefined,source: "user",type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
            
            let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid, focusTokenUuid: workflowType === "attack" ? workflow.token.document.uuid : undefined,source: "gm",type: "multiDialog", notificationId: notificationMessage._id };
        
            result = await game.gps.handleDialogPromises({userDialogArgs, gmDialogArgs});
        } else {
            result = await game.gps.queryDialog("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid, focusTokenUuid: workflowType === "attack" ? workflow.token.document.uuid : undefined,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
        }
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, selectedItemUuid, favoriteCheck, source, type } = result || {};

        if (!userDecision) {
            continue;
        }
        else if (userDecision) {
            let target;
            let targetDocument;
            let chatContent;
            if(workflowType === "attack") {
                target = workflow.token;
            }
            if(workflowType === "save") {
                targetDocument = await fromUuid(enemyTokenUuid);
                target = targetDocument?.object;
                if(!target || !workflow.tokenSaves?.[enemyTokenUuid]) continue;
            }

            const options = {
                showFullCard: false,
                createWorkflow: true,
                versatile: false,
                configureDialog: true,
                targetUuids: [`${target.document.uuid}`],
            };

            let itemRoll;
            if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, config: { midiOptions: { ...options, workflowData: true } } });
            else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", gmUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, config: { midiOptions: { ...options, workflowData: true } } });
            if(!itemRoll || itemRoll.aborted) continue;

            if(animEnabled) {
                new Sequence()
                .effect()
                    .file("eskie.symbol.eye.01.green")
                    .fadeIn(250)
                    .fadeOut(250)
                    .atLocation(target)
                    .playbackRate(0.9)
                .play()
            }

            await game.gps.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

            let actorLevel = validTokenPrimary.actor.system.details.level;
            let flamesEmbrace = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuidFlamesEmbrace);
            
            if(actorLevel >= 6 && flamesEmbrace) {
                let saveResult;
                if(source && source === "user") saveResult = await game.gps.queryUser("gpsActivityUse", browserUser, {itemUuid: flamesEmbrace.uuid, identifier: "syntheticSave", targetUuid: target.document.uuid});
                else if(source && source === "gm") saveResult = await game.gps.queryUser("gpsActivityUse", gmUser, {itemUuid: flamesEmbrace.uuid, identifier: "syntheticSave", targetUuid: target.document.uuid});
                if(saveResult?.failedSaves.size > 0) {
                    if(animEnabled) {
                        const effect = target.actor.appliedEffects.find(e => e.active && e.getFlag("gambits-premades", "gpsUuid") === "c87befde-c36f-4237-b645-e98e1526de42" && DAE.effectMatchesSource(e, flamesEmbrace.uuid));
                        if(effect) await game.gps.queryGM("setSpellVisual", {effectUuid: effect.uuid, tokenUuid: target.document.uuid, itemUuid: chosenItem.uuid, kind: "embrace", color: "green"});
                    }
                }
            }

            let reroll;

            if(workflowType === "save") {
                let saveDC = workflow?.saveActivity?.save.dc?.value;
                

                if(source && source === "user") reroll = await game.gps.queryUser("rollAsUser", browserUser, { rollParams: `1${hexDie}`, type: workflowType });
                if(source && source === "gm") reroll = await game.gps.queryUser("rollAsUser", gmUser, { rollParams: `1${hexDie}`, type: workflowType });
                if(!reroll) continue;
                let rollFound = workflow.tokenSaves?.[enemyTokenUuid];
                let rollTotal = rollFound.total;
                let modifiedRoll = await game.gps.adjustRollTotal(rollFound, -reroll.total);
                const saved = await game.gps.updateSaveResult({workflow, token: target, roll: modifiedRoll});

                if(!saved) {

                    chatContent = `<span style='text-wrap: wrap;'>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ThirdPartyClassFeatures.Witch.WitchesHex.SaveFailed")} <img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.queryUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: modifiedRoll});
                    return;
                }
                else {
                    chatContent = `<span style='text-wrap: wrap;'>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ThirdPartyClassFeatures.Witch.WitchesHex.SaveSucceeded")} <img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.queryUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: modifiedRoll});
                    continue;
                }
            }
            else if(workflowType === "attack") {
                let targetAC = workflow.targets.first().actor.system.attributes.ac.value;

                if(source && source === "user") reroll = await game.gps.queryUser("rollAsUser", browserUser, { rollParams: `1${hexDie}`, type: workflowType });
                if(source && source === "gm") reroll = await game.gps.queryUser("rollAsUser", gmUser, { rollParams: `1${hexDie}`, type: workflowType });
                if(!reroll) continue;
                let rerollNew = await game.gps.adjustRollTotal(workflow.attackRoll, -reroll.total);

                await game.gps.setAttackResult(workflow, rerollNew);

                if(!game.gps.attackHits(workflow, workflow.targets.first())) {
                    chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ThirdPartyClassFeatures.Witch.WitchesHex.HexReducedAttackMiss", { reduction: reroll.total })} <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.queryUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: rerollNew});
                    if(game.gpsSettings.skipResolvedReactions && game.gps.reactionCanChangeOutcome(workflow)) continue;
                    return;
                }
                else {
                    chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ThirdPartyClassFeatures.Witch.WitchesHex.HexReducedAttackHit", { reduction: reroll.total })} <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.queryUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: rerollNew});
                    continue;
                }
            }
        }
    }
}
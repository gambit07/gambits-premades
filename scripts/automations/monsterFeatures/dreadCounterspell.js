export async function dreadCounterspell({ workflowData,workflowType,workflowCombat }) {
    const workflow = await MidiQOL.Workflow.getWorkflow(`${workflowData}`) ?? null;
    if(!workflow) return;
    const gpsUuid = "47d0c0d4-46c9-4e59-ac2e-3fba926d39c9";
    if(workflow?.item?.flags?.["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    let itemName = "Dread Counterspell";
    if(!workflow?.activity?.consumption.spellSlot) {
        if(debugEnabled) game.gps.logInfo(`${itemName} failed no activity spell slot consumption (assumed activity is not an initial spell cast)`);
        return;
    }
    let dialogId = gpsUuid;
    const lastMessage = game.messages.contents[game.messages.contents.length - 1]; // Use to hide initial spell message
    let gmUser = game.gps.getPrimaryGM();

    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));
    let selectedToken = workflow.token;
    let skillRoll;
    let castLevel;
    let itemRoll = false;
    let chatContent = [];
    let browserUser;

    await initialProcess(workflow, lastMessage, selectedToken);
    
    async function initialProcess(workflow, lastMessage, selectedToken) {
        let findValidTokens = game.gps.findValidTokens({initiatingToken: selectedToken, targetedToken: null, itemName: itemName, itemType: null, itemChecked: null, reactionCheck: true, sightCheck: true, rangeCheck: false, rangeTotal: null, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid, sourceRules: "2014"});

        if(findValidTokens.length === 0 || !findValidTokens) return;

        for (const validTokenPrimary of findValidTokens) {
            if(lastMessage && validTokenPrimary.actor.type === "character") lastMessage.update({ whisper: gmUser });
            if(workflow?.aborted === true) return;
            let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
            let itemProperName = chosenItem?.name;
            const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
            const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
            
            let castType = workflow.item?.system?.method;
            if(castType === "innate" || castType === "atwill") castLevel = workflow.castData.baseLevel;
            else castLevel = workflow.castData.castLevel;
            browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

            const currentIndex = findValidTokens.indexOf(validTokenPrimary);
            const isLastToken = currentIndex === findValidTokens.length - 1;

            let dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <div>
                                <div class="gps-dialog-flex">
                                    <p class="gps-dialog-paragraph">Would you like to use your reaction to initiate ${itemProperName}?</p>
                                    <div id="image-container" class="gps-dialog-image-container">
                                        <img id="img_${dialogId}" src="${chosenItem.img}" class="gps-dialog-image">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="gps-dialog-button-container">
                        <button id="pauseButton_${dialogId}" type="button" class="gps-dialog-button">
                            <i class="fas fa-pause" id="pauseIcon_${dialogId}" style="margin-right: 5px;"></i>Pause
                        </button>
                    </div>
                </div>
            `;
    
            let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for a spell triggering ${itemProperName}.</span>`;
            let chatData = { user: gmUser, content: content, roll: false };
            let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });
    
            let result;
    
            if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
                let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "user",type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage.id };
                
                let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "gm",type: "multiDialog", notificationId: notificationMessage.id };
            
                result = await game.gps.socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
            } else {
                result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage.id});
            }
                    
            const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, genericCheck, source, type } = result || {};

            if (!userDecision && isLastToken) {
                if(lastMessage && validTokenPrimary.actor.type === "character") lastMessage.update({ whisper: [] });
                return workflow.aborted = false;
            }
            else if (!userDecision) {
                if(lastMessage && validTokenPrimary.actor.type === "character") lastMessage.update({ whisper: [] });
                continue;
            }
            else if (userDecision) {
                if(lastMessage && validTokenPrimary.actor.type === "character") lastMessage.update({ whisper: [] });

                const options = {
                    showFullCard: false,
                    createWorkflow: true,
                    versatile: false,
                    configureDialog: true,
                    targetUuids: [selectedToken.document.uuid]
                };

                if(source && source === "user") itemRoll = await game.gps.socket.executeAsUser("remoteCompleteItemUse", browserUser, { itemUuid: chosenItem.uuid, actorUuid: validTokenPrimary.actor.uuid, options: options });
                else if(source && source === "gm") itemRoll = await game.gps.socket.executeAsUser("remoteCompleteItemUse", gmUser, { itemUuid: chosenItem.uuid, actorUuid: validTokenPrimary.actor.uuid, options: options });
    
                if(!itemRoll.baseLevel && !itemRoll.castLevel && !itemRoll.checkHits && !itemRoll.itemType) continue;

                let itemRollCastType = itemRoll.itemType;
                let itemRollCastLevel = itemRoll.castLevel;
                if ((itemRollCastType === "innate" || itemRollCastType === "atwill") && itemRollCastLevel === 0) itemRollCastLevel = itemRoll.baseLevel;

                const spellThreshold = castLevel + 10;
                let csFailure = false;

                if(castLevel >= 5) {
                    let activity = chosenItem.system.activities.find(a => a.identifier === "syntheticCheck");
                    await game.gps.socket.executeAsUser("gpsActivityUpdate", gmUser, { activityUuid: activity.uuid, updates: {"check.dc.calculation": "", "check.dc.formula": spellThreshold, "check.dc.value": spellThreshold} });
                    if(source && source === "user") skillCheck = await game.gps.socket.executeAsUser("gpsActivityUse", browserUser, {itemUuid: chosenItem.uuid, identifier: "syntheticCheck", targetUuid: validTokenPrimary.document.uuid});
                    else if(source && source === "gm") skillCheck = await game.gps.socket.executeAsUser("gpsActivityUse", gmUser, {itemUuid: chosenItem.uuid, identifier: "syntheticCheck", targetUuid: validTokenPrimary.document.uuid});
                    if(!skillCheck) continue;
                    let skillRoll = skillCheck.saveRolls;
                    let skillTotal = skillRoll.total;
                    let skillFlavor = validTokenPrimary.actor.system.attributes.spell.abilityLabel;
                    
                    if (skillTotal >= spellThreshold) {
                        chatContent = `<span style='text-wrap: wrap;'>The creature was dread counterspelled, you rolled a ${skillTotal} on your ${skillFlavor} ability check.<br><img src="${selectedToken.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    }
                    else {
                        chatContent = `<span style='text-wrap: wrap;'>The creature was not dread counterspelled, you rolled a ${skillTotal} on your ${skillFlavor} ability check and needed a ${spellThreshold}.${spellPenetrationChat}<br><img src="${selectedToken.actor.img}" width="30" height="30" style="border:0px"></span>`;
                        csFailure = true;
                    }
                }
                else {
                    chatContent = `<span style='text-wrap: wrap;'>The creature was dread counterspelled because you used ${itemProperName} on a spell that was 4th level or lower.<br><img src="${selectedToken.actor.img}" width="30" height="30" style="border:0px"></span>`;
                }

                if(!csFailure) {
                    await game.gps.socket.executeAsUser("gpsActivityUse", gmUser, {itemUuid: chosenItem.uuid, identifier: "syntheticDamage", targetUuid: selectedToken.document.uuid});
                }

                await game.gps.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

                await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: skillRoll});

                let cprConfig = game.gps.getCprConfig({itemUuid: chosenItem.uuid});
                const { animEnabled } = cprConfig;
                if(animEnabled) {
                    new Sequence()
                    .effect()
                        .file("animated-spell-effects-cartoon.energy.beam.01")
                        .fadeIn(500)
                        .fadeOut(500)
                        .atLocation(validTokenPrimary)
                        .stretchTo(selectedToken, {offset:{x: 100, y: 0}, local: true})
                        .filter("ColorMatrix", { hue: -100 })
                        .playbackRate(0.8)
                    .play()
                }

                return workflow.aborted = true;
            }
        }
    }
}
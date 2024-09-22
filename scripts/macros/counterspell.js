export async function counterspell({ workflowData,workflowType,workflowCombat }) {
    const module = await import('../module.js');
    const socket = module.socket;
    const helpers = await import('../helpers.js');
    const workflow = await MidiQOL.Workflow.getWorkflow(`${workflowData}`);
    if(!workflow) return;
    const gpsUuid = "a3992a10-f36a-4416-a995-f83d444c3c0a";
    if(workflow.item.type !== "spell" || workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Counterspell";
    let dialogId = gpsUuid;
    const lastMessage = game.messages.contents[game.messages.contents.length - 1]; // Use to hide initial spell message
    let gmUser = helpers.getPrimaryGM();

    const castProperties = ["vocal", "somatic", "material"];
    let hasVSMProperty = castProperties.some(prop => workflow.item.system.properties.has(prop));
    let isVocalOnly = workflow.item.system.properties.has("vocal") && !workflow.item.system.properties.has("somatic") && !workflow.item.system.properties.has("material");
    let hasDeafenedStatus;
    if (!hasVSMProperty) return;

    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));
    let selectedToken = workflow.token;
    let castLevel = false;
    let browserUser;

    await initialCounterspellProcess(workflow, lastMessage, castLevel, selectedToken);
    
    async function initialCounterspellProcess(workflow, lastMessage, castLevel, selectedToken) {

        let findValidTokens = helpers.findValidTokens({initiatingToken: selectedToken, targetedToken: null, itemName: itemName, itemType: "spell", itemChecked: null, reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});

        if(findValidTokens.length === 0 || !findValidTokens) return;

        for (const validTokenPrimary of findValidTokens) {
            if(lastMessage && validTokenPrimary.actor.type === "character") lastMessage.update({ whisper: gmUser });
            if(workflow.aborted === true) return;
            if(!castLevel) {
                hasDeafenedStatus = validTokenPrimary.document.hasStatusEffect("deafened");
                if (isVocalOnly && hasDeafenedStatus) continue;
            }
            let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
            let itemProperName = chosenItem?.name;
            const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
            const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
            castLevel = !castLevel ? workflow.castData.castLevel : castLevel;
            browserUser = helpers.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

            const currentIndex = findValidTokens.indexOf(validTokenPrimary);
            const isLastToken = currentIndex === findValidTokens.length - 1;

            let dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <div>
                                <div class="gps-dialog-flex">
                                    <p class="gps-dialog-paragraph">Would you like to use your reaction to ${itemProperName}?</p>
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
            let chatData = { user: gmUser, content: content, roll: false, whisper: gmUser };
            let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });
    
            let result;
    
            if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
                let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "user",type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
                
                let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "gm",type: "multiDialog", notificationId: notificationMessage._id };
            
                result = await socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
            } else {
                result = await socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
            }
                    
            const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, source, type } = result;

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

                let chosenSpell = validTokenPrimary.actor.items.find(i => i.name === itemProperName);

                hasVSMProperty = castProperties.some(prop => chosenSpell.system.properties.has(prop));

                chosenSpell.prepareData();
                chosenSpell.prepareFinalAttributes();
                chosenSpell.applyActiveEffects();

                const options = {
                    showFullCard: false,
                    createWorkflow: true,
                    versatile: false,
                    configureDialog: true,
                    targetUuids: [selectedToken.document.uuid],
                };

                let itemRollCastLevel;
                Hooks.once("midi-qol.postActiveEffects", async (workflow) => {
                    itemRollCastLevel = workflow.castData.castLevel;
                });

                let itemRoll = false;
                if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser, { itemData: chosenSpell, actorUuid: validTokenPrimary.actor.uuid, options: options });
                else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", gmUser, { itemData: chosenSpell, actorUuid: validTokenPrimary.actor.uuid, options: options });
    
                if(!itemRoll) continue;

                let counterspellLevel = false;

                let spellPenetrationEnabled = MidiQOL.safeGetGameSetting('gambits-premades', `enableCounterspellSpellPenetration`);
                let spellPenetration;
                let spellPenetrationGreater;
                let spellPenetrationChat;
                
                if(spellPenetrationEnabled) {
                    spellPenetration = selectedToken.actor.items.find(i => i.name === "Spell Penetration");
                    spellPenetrationGreater = selectedToken.actor.items.find(i => i.name === "Greater Spell Penetration");
                    if(spellPenetration) {
                        castLevel = castLevel + 3;
                        spellPenetrationChat = "<br><br>The spell being countered was considered 3 levels higher due to the caster's <b>Spell Penetration</b> feature.";
                    }
                    else if(spellPenetrationGreater) {
                        castLevel = castLevel + 5;
                        spellPenetrationChat = "<br><br>The spell being countered was considered 5 levels higher due to the caster's <b>Greater Spell Penetration</b> feature.";
                    }
                }

                let csFailure = false;
                let chatContent = [];

                const spellThreshold = castLevel + 10;
                let skillCheck;

                if(itemRollCastLevel < castLevel) {
                    skillCheck = await validTokenPrimary.actor.rollAbilityTest(validTokenPrimary.actor.system.attributes.spellcasting);
                    let skillCheckTotal;
                    let abjurationCheck = validTokenPrimary.actor.items.find(i => i.name.toLowerCase() === "improved abjuration");
                    abjurationCheck ? skillCheckTotal = skillCheck.total + validTokenPrimary.actor.system?.attributes?.prof : skillCheckTotal = skillCheck.total;
                    if (skillCheckTotal >= spellThreshold) {
                        chatContent = `<span style='text-wrap: wrap;'>The creature was counterspelled, you rolled a ${skillCheckTotal} ${skillCheck.options.flavor}.<br><img src="${selectedToken.actor.img}" width="30" height="30" style="border:0px"></span>`;
                        counterspellLevel = itemRollCastLevel;
                    }
                    else {
                        chatContent = `<span style='text-wrap: wrap;'>The creature was not counterspelled, you rolled a ${skillCheckTotal} ${skillCheck.options.flavor} and needed a ${spellThreshold}.${spellPenetrationChat}<br><img src="${selectedToken.actor.img}" width="30" height="30" style="border:0px"></span>`;
                        csFailure = true;
                    }
                }
                else {
                    chatContent = `<span style='text-wrap: wrap;'>The creature was counterspelled because you cast ${itemProperName} at an equal or higher level.<br><img src="${selectedToken.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    counterspellLevel = itemRollCastLevel;
                }

                await helpers.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

                await helpers.replaceChatCard({actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenSpell.uuid, chatContent: chatContent, rollData: skillCheck});

                if(csFailure === true) continue;
                if(!hasVSMProperty) return;
                castLevel = counterspellLevel;
                await secondaryCounterspellProcess(workflow, lastMessage, castLevel, validTokenPrimary);
                break;
            }
        }
    }

    async function secondaryCounterspellProcess(workflow, lastMessage, castLevel, validTokenPrimary) {        

            let findValidTokens = helpers.findValidTokens({initiatingToken: validTokenPrimary, targetedToken: null, itemName: itemName, itemType: "spell", itemChecked: null, reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});

            if(findValidTokens.length === 0 || !findValidTokens) return workflow.aborted = true;

            for (const validTokenSecondary of findValidTokens) {
                let chosenItem = validTokenSecondary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
                let itemProperName = chosenItem?.name;
                const dialogTitlePrimary = `${validTokenSecondary.actor.name} | ${itemProperName}`;
                const dialogTitleGM = `Waiting for ${validTokenSecondary.actor.name}'s selection | ${itemProperName}`;
                browserUser = helpers.getBrowserUser({ actorUuid: validTokenSecondary.actor.uuid });
                
                const currentIndex = findValidTokens.indexOf(validTokenSecondary);
                const isLastToken = currentIndex === findValidTokens.length - 1;

                let dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <div>
                                <div class="gps-dialog-flex">
                                    <p class="gps-dialog-paragraph">Would you like to use your reaction to ${itemProperName}?</p>
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
    
            let content = `<span style='text-wrap: wrap;'><img src="${validTokenSecondary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenSecondary.actor.name} has a reaction available for a spell triggering ${itemProperName}.</span>`;
            let chatData = { user: gmUser, content: content, roll: false, whisper: gmUser };
            let notificationMessageSecondary = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });
    
            let result;
    
            if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
                let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenSecondary.document.uuid,source: "user",type: "multiDialog", browserUser: browserUser, notificationId: notificationMessageSecondary._id };
                
                let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenSecondary.document.uuid,source: "gm",type: "multiDialog", notificationId: notificationMessageSecondary._id };
            
                result = await socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
            } else {
                result = await socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenSecondary.document.uuid,source:gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessageSecondary._id});
            }
                    
            const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, source, type } = result;

            if (!userDecision && isLastToken) {
                if(lastMessage && validTokenPrimary.actor.type === "character") lastMessage.update({ whisper: [] });
                return workflow.aborted = true;
            }
            else if (!userDecision) {
                if(lastMessage) lastMessage.update({ whisper: [] });
                continue;
            }
            else if (userDecision) {
                if(lastMessage && validTokenPrimary.actor.type === "character") lastMessage.update({ whisper: [] });

                let chosenSpell = validTokenSecondary.actor.items.find(i => i.name === itemProperName);

                hasVSMProperty = castProperties.some(prop => chosenSpell.system.properties.has(prop));

                chosenSpell.prepareData();
                chosenSpell.prepareFinalAttributes();
                chosenSpell.applyActiveEffects();

                const options = {
                    showFullCard: false,
                    createWorkflow: true,
                    versatile: false,
                    configureDialog: true,
                    targetUuids: [validTokenPrimary.document.uuid],
                };

                let itemRollCastLevel;
                Hooks.once("midi-qol.postActiveEffects", async (workflow) => {
                    itemRollCastLevel = workflow.castData.castLevel;
                });

                let itemRoll;
                if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser, { itemData: chosenSpell, actorUuid: validTokenSecondary.actor.uuid, options: options });
                else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", gmUser, { itemData: chosenSpell, actorUuid: validTokenSecondary.actor.uuid, options: options });
    
                if(itemRoll.aborted === true) continue;

                let counterspellLevel = false;

                let spellPenetrationEnabled = MidiQOL.safeGetGameSetting('gambits-premades', `enableCounterspellSpellPenetration`);
                let spellPenetration;
                let spellPenetrationGreater;
                let spellPenetrationChat;
                
                if(spellPenetrationEnabled) {
                    spellPenetration = validTokenPrimary.actor.items.find(i => i.name === "Spell Penetration");
                    spellPenetrationGreater = validTokenPrimary.actor.items.find(i => i.name === "Greater Spell Penetration");
                    if(spellPenetration) {
                        castLevel = castLevel + 3;
                        spellPenetrationChat = "<br><br>The spell being countered was considered 3 levels higher due to the caster's <b>Spell Penetration</b> feature.";
                    }
                    else if(spellPenetrationGreater) {
                        castLevel = castLevel + 5;
                        spellPenetrationChat = "<br><br>The spell being countered was considered 5 levels higher due to the caster's <b>Greater Spell Penetration</b> feature.";
                    }
                }

                let csFailure = false;
                let chatContent;

                const spellThreshold = castLevel + 10;
                let skillCheck;

                if(itemRollCastLevel < castLevel) {
                    skillCheck = await validTokenSecondary.actor.rollAbilityTest(validTokenSecondary.actor.system.attributes.spellcasting);
                    let skillCheckTotal;
                    let abjurationCheck = validTokenSecondary.actor.items.find(i => i.name.toLowerCase() === "improved abjuration");
                    abjurationCheck ? skillCheckTotal = skillCheck.total + validTokenSecondary.actor.system?.attributes?.prof : skillCheckTotal = skillCheck.total;
                    if (skillCheckTotal >= spellThreshold) {
                        chatContent = `<span style='text-wrap: wrap;'>The creature was counterspelled, you rolled a ${skillCheckTotal} ${skillCheck.options.flavor}.<br><img src="${validTokenPrimary.actor.img}" width="30" height="30" style="border:0px"></span>`;
                        counterspellLevel = itemRollCastLevel;
                    }
                    else {
                        chatContent = `<span style='text-wrap: wrap;'>The creature was not counterspelled, you rolled a ${skillCheckTotal} ${skillCheck.options.flavor} and needed a ${spellThreshold}.${spellPenetrationChat}<br><img src="${validTokenPrimary.actor.img}" width="30" height="30" style="border:0px"></span>`;
                        csFailure = true;
                    }
                }
                else {
                    chatContent = `<span style='text-wrap: wrap;'>The creature was counterspelled because you cast ${itemProperName} at an equal or higher level.<br><img src="${validTokenPrimary.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    counterspellLevel = itemRollCastLevel;
                }

                await helpers.addReaction({actorUuid: `${validTokenSecondary.actor.uuid}`});

                await helpers.replaceChatCard({actorUuid: validTokenSecondary.actor.uuid, itemUuid: chosenSpell.uuid, chatContent: chatContent, rollData: skillCheck});

                if(csFailure === true) continue;
                if(!hasVSMProperty) return;
                castLevel = counterspellLevel;
                await initialCounterspellProcess(workflow, lastMessage, castLevel, validTokenSecondary);
                break;
            }
        }
    }
}
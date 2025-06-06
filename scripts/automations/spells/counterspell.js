export async function counterspell({ workflowData,workflowType,workflowCombat }) {
    const workflow = await MidiQOL.Workflow.getWorkflow(`${workflowData}`);
    if(!workflow) return;
    const gpsUuid = "a3992a10-f36a-4416-a995-f83d444c3c0a";
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    let itemName = "Counterspell";
    if(!workflow.activity.consumption.spellSlot) {
        if(debugEnabled) console.error(`${itemName} failed no activity spell slot consumption (assumed activity is not an initial spell cast)`);
        return;
    }
    let dialogId = gpsUuid;
    const lastMessage = game.messages.contents[game.messages.contents.length - 1]; // Use to hide initial spell message
    let gmUser = game.gps.getPrimaryGM();

    const castProperties = ["vocal", "somatic", "material"];
    let hasVSMProperty = castProperties.some(prop => workflow.item.system.properties.has(prop));
    let isVocalOnly = workflow.item.system.properties.has("vocal") && !workflow.item.system.properties.has("somatic") && !workflow.item.system.properties.has("material");
    let hasDeafenedStatus;
    if (!hasVSMProperty) return;

    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));
    let spellPenetrationEnabled = MidiQOL.safeGetGameSetting('gambits-premades', `enableCounterspellSpellPenetration`);
    let selectedToken = workflow.token;
    let castLevel = false;
    let itemRoll = false;
    let counterspellLevel = false;
    let spellPenetration;
    let spellPenetrationGreater;
    let spellPenetrationChat = "";
    let csFailure = false;
    let chatContent = [];
    let skillCheck;
    let skillRoll;
    let browserUser;

    await initialCounterspellProcess(workflow, lastMessage, castLevel, selectedToken);
    
    async function initialCounterspellProcess(workflow, lastMessage, castLevel, selectedToken) {

        let findValidTokens = game.gps.findValidTokens({initiatingToken: selectedToken, targetedToken: null, itemName: itemName, itemType: "spell", itemChecked: null, reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});

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
            
            let castType = workflow.item?.system?.preparation?.mode;
            if(castType === "innate" || castType === "atwill") castLevel = !castLevel ? workflow.castData.baseLevel : castLevel;
            else castLevel = !castLevel ? workflow.castData.castLevel : castLevel;
            browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

            const currentIndex = findValidTokens.indexOf(validTokenPrimary);
            const isLastToken = currentIndex === findValidTokens.length - 1;

            let subtleSpell = getSubtleSpell({validToken: validTokenPrimary});
            const { dialogSubtle = "", itemSorcery = false } = subtleSpell;

            let dialogContent = `
                <style>
                #gps-checkbox {
                    position: absolute;
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                #gps-checkbox + label {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                }

                #gps-checkbox + label::before {
                    content: "\\f6a9";
                    font-family: "Font Awesome 5 Free";
                    font-weight: 400; /* Regular (outlined) style */
                    font-size: 20px;
                    margin-right: 5px;
                    line-height: 1;
                    vertical-align: middle;
                }

                #gps-checkbox:checked + label::before {
                    content: "\\f6a9";
                    font-family: "Font Awesome 5 Free";
                    font-weight: 900; /* Solid (filled) style */
                }
                </style>
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
                                ${dialogSubtle}
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
            
                result = await game.gps.socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
            } else {
                result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
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

                hasVSMProperty = castProperties.some(prop => chosenItem.system.properties.has(prop));

                if(genericCheck) await itemSorcery?.update({"system.uses.spent" : itemSorcery.system.uses.spent + 1})

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
                
                if(spellPenetrationEnabled) {
                    spellPenetration = selectedToken.actor.items.some(i => i.name === "Spell Penetration");
                    spellPenetrationGreater = selectedToken.actor.items.some(i => i.name === "Greater Spell Penetration");
                    if(spellPenetration) {
                        castLevel = castLevel + 3;
                        spellPenetrationChat = "<br><br>The spell being countered was considered 3 levels higher due to the caster's <b>Spell Penetration</b> feature.";
                    }
                    else if(spellPenetrationGreater) {
                        castLevel = castLevel + 5;
                        spellPenetrationChat = "<br><br>The spell being countered was considered 5 levels higher due to the caster's <b>Greater Spell Penetration</b> feature.";
                    }
                }

                const spellThreshold = castLevel + 10;

                if(itemRollCastLevel < castLevel) {
                    let activity = chosenItem.system.activities.find(a => a.identifier === "syntheticCheck");
                    await game.gps.socket.executeAsUser("gpsActivityUpdate", gmUser, { activityUuid: activity.uuid, updates: {"check.dc.calculation": "", "check.dc.formula": spellThreshold, "check.dc.value": spellThreshold} });
                    if(source && source === "user") skillCheck = await game.gps.socket.executeAsUser("gpsActivityUse", browserUser, {itemUuid: chosenItem.uuid, identifier: "syntheticCheck", targetUuid: validTokenPrimary.document.uuid});
                    else if(source && source === "gm") skillCheck = await game.gps.socket.executeAsUser("gpsActivityUse", gmUser, {itemUuid: chosenItem.uuid, identifier: "syntheticCheck", targetUuid: validTokenPrimary.document.uuid});
                    if(!skillCheck) continue;
                    let skillRoll = skillCheck.saveRolls;
                    let skillTotal = skillRoll.total;
                    let skillFlavor = validTokenPrimary.actor.system.attributes.spell.abilityLabel;
                    let abjurationCheck = validTokenPrimary.actor.items.some(i => i.identifier === "improved-abjuration");
                    let abjurationChat = "";
                    if (abjurationCheck) {
                        const prof = validTokenPrimary.actor.system?.attributes?.prof ?? 0;
                        skillTotal += prof;
                        abjurationChat = ` (+${prof} from Improved Abjuration)`;
                    }
                    
                    if (skillTotal >= spellThreshold) {
                        chatContent = `<span style='text-wrap: wrap;'>The creature was counterspelled, you rolled a ${skillTotal} on your ${skillFlavor} ability check${abjurationChat}.<br><img src="${selectedToken.actor.img}" width="30" height="30" style="border:0px"></span>`;
                        counterspellLevel = itemRollCastLevel;
                    }
                    else {
                        chatContent = `<span style='text-wrap: wrap;'>The creature was not counterspelled, you rolled a ${skillTotal} on your ${skillFlavor} ability check${abjurationChat} and needed a ${spellThreshold}.${spellPenetrationChat}<br><img src="${selectedToken.actor.img}" width="30" height="30" style="border:0px"></span>`;
                        csFailure = true;
                    }
                }
                else {
                    chatContent = `<span style='text-wrap: wrap;'>The creature was counterspelled because you cast ${itemProperName} at an equal or higher level.<br><img src="${selectedToken.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    counterspellLevel = itemRollCastLevel;
                }

                await game.gps.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

                await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: skillRoll});

                if(csFailure) continue;

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
                        .filter("ColorMatrix", { brightness: 0, contrast: 1 })
                        .playbackRate(0.8)
                    .play()
                }

                if((!hasVSMProperty || genericCheck) && !csFailure) return workflow.aborted = true;

                castLevel = counterspellLevel;
                await secondaryCounterspellProcess(workflow, lastMessage, castLevel, validTokenPrimary);
                break;
            }
        }
    }

    async function secondaryCounterspellProcess(workflow, lastMessage, castLevel, validTokenPrimary) {        

            let findValidTokens = game.gps.findValidTokens({initiatingToken: validTokenPrimary, targetedToken: null, itemName: itemName, itemType: "spell", itemChecked: null, reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});

            if(findValidTokens.length === 0 || !findValidTokens) return workflow.aborted = true;

            for (const validTokenSecondary of findValidTokens) {
                let chosenItem = validTokenSecondary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
                let itemProperName = chosenItem?.name;
                const dialogTitlePrimary = `${validTokenSecondary.actor.name} | ${itemProperName}`;
                const dialogTitleGM = `Waiting for ${validTokenSecondary.actor.name}'s selection | ${itemProperName}`;
                browserUser = game.gps.getBrowserUser({ actorUuid: validTokenSecondary.actor.uuid });
                
                const currentIndex = findValidTokens.indexOf(validTokenSecondary);
                const isLastToken = currentIndex === findValidTokens.length - 1;

                let subtleSpell = getSubtleSpell({validToken: validTokenSecondary});
                const { dialogSubtle = "", itemSorcery = false } = subtleSpell;

                let dialogContent = `
                    <style>
                    #gps-checkbox {
                        position: absolute;
                        opacity: 0;
                        width: 0;
                        height: 0;
                    }

                    #gps-checkbox + label {
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                    }

                    #gps-checkbox + label::before {
                        content: "\\f6a9";
                        font-family: "Font Awesome 5 Free";
                        font-weight: 400; /* Regular (outlined) style */
                        font-size: 20px;
                        margin-right: 5px;
                        line-height: 1;
                        vertical-align: middle;
                    }

                    #gps-checkbox:checked + label::before {
                        content: "\\f6a9";
                        font-family: "Font Awesome 5 Free";
                        font-weight: 900; /* Solid (filled) style */
                    }
                    </style>
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
                                    ${dialogSubtle}
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
            
                result = await game.gps.socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
            } else {
                result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenSecondary.document.uuid,source:gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessageSecondary._id});
            }
                    
            const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, genericCheck, source, type } = result || {};

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

                hasVSMProperty = castProperties.some(prop => chosenItem.system.properties.has(prop));

                if(genericCheck) await itemSorcery?.update({"system.uses.spent" : itemSorcery.system.uses.spent + 1})

                const options = {
                    showFullCard: false,
                    createWorkflow: true,
                    versatile: false,
                    configureDialog: true,
                    targetUuids: [validTokenPrimary.document.uuid]
                };

                if(source && source === "user") itemRoll = await game.gps.socket.executeAsUser("remoteCompleteItemUse", browserUser, { itemUuid: chosenItem.uuid, actorUuid: validTokenSecondary.actor.uuid, options: options });
                else if(source && source === "gm") itemRoll = await game.gps.socket.executeAsUser("remoteCompleteItemUse", gmUser, { itemUuid: chosenItem.uuid, actorUuid: validTokenSecondary.actor.uuid, options: options });
    
                if(!itemRoll.baseLevel && !itemRoll.castLevel && !itemRoll.checkHits && !itemRoll.itemType) continue;

                let itemRollCastType = itemRoll.itemType;
                let itemRollCastLevel = itemRoll.castLevel;
                if ((itemRollCastType === "innate" || itemRollCastType === "atwill") && itemRollCastLevel === 0) itemRollCastLevel = itemRoll.baseLevel;
                
                if(spellPenetrationEnabled) {
                    spellPenetration = validTokenPrimary.actor.items.some(i => i.name === "Spell Penetration");
                    spellPenetrationGreater = validTokenPrimary.actor.items.some(i => i.name === "Greater Spell Penetration");
                    if(spellPenetration) {
                        castLevel = castLevel + 3;
                        spellPenetrationChat = "<br><br>The spell being countered was considered 3 levels higher due to the caster's <b>Spell Penetration</b> feature.";
                    }
                    else if(spellPenetrationGreater) {
                        castLevel = castLevel + 5;
                        spellPenetrationChat = "<br><br>The spell being countered was considered 5 levels higher due to the caster's <b>Greater Spell Penetration</b> feature.";
                    }
                }

                const spellThreshold = castLevel + 10;

                if(itemRollCastLevel < castLevel) {
                    let activity = chosenItem.system.activities.find(a => a.identifier === "syntheticCheck");
                    await game.gps.socket.executeAsUser("gpsActivityUpdate", gmUser, { activityUuid: activity.uuid, updates: {"check.dc.calculation": "", "check.dc.formula": spellThreshold, "check.dc.value": spellThreshold} });
                    if(source && source === "user") skillCheck = await game.gps.socket.executeAsUser("gpsActivityUse", browserUser, {itemUuid: chosenItem.uuid, identifier: "syntheticCheck", targetUuid: validTokenSecondary.document.uuid});
                    else if(source && source === "gm") skillCheck = await game.gps.socket.executeAsUser("gpsActivityUse", gmUser, {itemUuid: chosenItem.uuid, identifier: "syntheticCheck", targetUuid: validTokenSecondary.document.uuid});
                    if(!skillCheck) continue;
                    let skillRoll = skillCheck.saveRolls;
                    let skillTotal = skillRoll.total;
                    let skillFlavor = validTokenSecondary.actor.system.attributes.spell.abilityLabel;
                    let abjurationCheck = validTokenSecondary.actor.items.some(i => i.identifier === "improved-abjuration");
                    let abjurationChat = "";
                    if (abjurationCheck) {
                        const prof = validTokenSecondary.actor.system?.attributes?.prof ?? 0;
                        skillTotal += prof;
                        abjurationChat = ` (+${prof} from Improved Abjuration)`;
                    }
                    
                    if (skillTotal >= spellThreshold) {
                        chatContent = `<span style='text-wrap: wrap;'>The creature was counterspelled, you rolled a ${skillTotal} on your ${skillFlavor} ability check${abjurationChat}.<br><img src="${validTokenPrimary.actor.img}" width="30" height="30" style="border:0px"></span>`;
                        counterspellLevel = itemRollCastLevel;
                    }
                    else {
                        chatContent = `<span style='text-wrap: wrap;'>The creature was not counterspelled, you rolled a ${skillTotal} on your ${skillFlavor} ability check${abjurationChat} and needed a ${spellThreshold}.${spellPenetrationChat}<br><img src="${validTokenPrimary.actor.img}" width="30" height="30" style="border:0px"></span>`;
                        csFailure = true;
                    }
                }
                else {
                    chatContent = `<span style='text-wrap: wrap;'>The creature was counterspelled because you cast ${itemProperName} at an equal or higher level.<br><img src="${validTokenPrimary.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    counterspellLevel = itemRollCastLevel;
                }

                await game.gps.addReaction({actorUuid: `${validTokenSecondary.actor.uuid}`});

                await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenSecondary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: skillRoll});
                

                if(csFailure === true) continue;

                let cprConfig = game.gps.getCprConfig({itemUuid: chosenItem.uuid});
                const { animEnabled } = cprConfig;
                if(animEnabled) {
                    new Sequence()
                    .effect()
                        .file("animated-spell-effects-cartoon.energy.beam.01")
                        .fadeIn(500)
                        .fadeOut(500)
                        .atLocation(validTokenSecondary)
                        .stretchTo(validTokenPrimary, {offset:{x: 100, y: 0}, local: true})
                        .filter("ColorMatrix", { brightness: 0, contrast: 1 })
                        .playbackRate(0.8)
                    .play()
                }

                if((!hasVSMProperty || genericCheck) && !csFailure) return;
                
                castLevel = counterspellLevel;
                await initialCounterspellProcess(workflow, lastMessage, castLevel, validTokenSecondary);
                break;
            }
        }
    }
}

function getSubtleSpell({validToken}) {
    let subtleSpell = validToken.actor.items.some(i => i.flags["chris-premades"]?.info?.identifier === "subtleSpell" || i.name === "Subtle Spell");
    let itemSorcery;
    let dialogSubtle = "";
    if(subtleSpell) itemSorcery = validToken.actor.items.find(i => (i.flags["chris-premades"]?.info?.identifier === "sorceryPoints" || i.name === "Sorcery Points" || i.name === "Font of Magic" || i.name === "Metamagic Adept") && i.system.uses?.max && i.system.uses?.spent < i.system.uses?.max);

    if(itemSorcery) {
        dialogSubtle = `
            <div style="display: flex; align-items: center;">
                <input type="checkbox" id="gps-checkbox" style="vertical-align: middle;"/>
                <label for="gps-checkbox">
                    Use Subtle Spell? | ${ itemSorcery.system.uses.max - itemSorcery.system.uses.spent } ${ itemSorcery.system.uses.max - itemSorcery.system.uses.spent > 1 ? "Points" : "Point" } Remaining
                </label>
            </div>
        `;
    }

    return {dialogSubtle, itemSorcery};
}
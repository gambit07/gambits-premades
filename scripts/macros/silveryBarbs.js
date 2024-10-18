//done
export async function silveryBarbs({workflowData,workflowType,workflowCombat}) {
    const module = await import('../module.js');
    const socket = module.socket;
    const helpers = await import('../helpers.js');
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    const gpsUuid = "548b5cab-f870-47b6-828a-8de7549debeb";
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Silvery Barbs";
    let dialogId = gpsUuid;
    let gmUser = helpers.getPrimaryGM();
    let homebrewDisableNat20 = MidiQOL.safeGetGameSetting('gambits-premades', 'disableSilveryBarbsOnNat20');
    let homebrewEnableNat20 = MidiQOL.safeGetGameSetting('gambits-premades', 'enableSilveryBarbsOnNat20');

    if(workflow.legendaryResistanceUsed) return;

    // Check if attack hits
    if(workflowType === "attack" && workflow.attackTotal < workflow.targets.first().actor.system.attributes.ac.value) return;
    // Check if there is a save success
    if(workflowType === "save" && workflow.saves.size === 0) return;

    let findValidTokens;
    
    if(workflowType === "attack") {
        findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "spell", itemChecked: null, reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});
    }
    else if(workflowType === "save") {
        findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "spell", itemChecked: null, reactionCheck: true, sightCheck: false, rangeCheck: false, rangeTotal: null, dispositionCheck: true, dispositionCheckType: "ally", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});
    }
    
    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemName}`;
        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemProperName} Timeout`));
        
        browserUser = helpers.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

        let dialogContent;
        const rollDetailSetting = MidiQOL.safeGetGameSetting('midi-qol', 'ConfigSettings').hideRollDetails;
        const nearbyFriendlies = MidiQOL.findNearby(null, validTokenPrimary, 60, { includeToken: true });
        let validFriendlies = nearbyFriendlies.filter(token => token.document.disposition === validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary.document.uuid,token.document.uuid) && !token.actor.effects.getName(`${itemProperName} - Advantage`));
        const optionBackground = (document.body.classList.contains("theme-dark")) ? 'black' : 'var(--color-bg)';

        if(workflowType === "save") {
            let targets = Array.from(workflow.saves).filter(t => t.document.disposition !== validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary, t) && MidiQOL.computeDistance(validTokenPrimary, t, true) <= 60);
            if(homebrewDisableNat20) targets = targets.filter(t => workflow.saveRolls.find(roll => roll.data.actorUuid === t.actor.uuid && !roll.isCritical));
            if(homebrewEnableNat20) targets = targets.filter(t => workflow.saveRolls.find(roll => roll.data.actorUuid === t.actor.uuid && roll.isCritical));

            if(targets.length === 0) continue;

            const targetUuids = targets.map(t => t.document.uuid);
            const targetNames = targets.map(t => t.document.name);
        
            dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <p class="gps-dialog-paragraph">Would you like to use your reaction to cast ${itemProperName}? An enemy succeeded their saving throw. Choose an enemy to target and an ally to give advantage to below.</p>
                            <div class="gps-dialog-flex-wrapper">
                                <div class="gps-dialog-select-container">
                                    <div class="gps-dialog-flex">
                                    <label for="enemy-token" class="gps-dialog-label">Target:</label>
                                    <select id="enemy-token" class="gps-dialog-select">
                                        ${targetNames.map((name, index) => `<option class="gps-dialog-option" value="${targetUuids[index]}">${name}</option>`).join('')}
                                    </select>
                                    </div>
                                    <div class="gps-dialog-flex">
                                    <label for="ally-token" class="gps-dialog-label">Advantage:</label>
                                    ${validFriendlies.length >= 1 ? 
                                    `<select id="ally-token" class="gps-dialog-select">
                                        ${validFriendlies.map(friendly => `<option class="gps-dialog-option" style="background-color: ${optionBackground};" value="${friendly.document.uuid}">${friendly.document.name}</option>`).join('')}
                                    </select>` : '<div style="padding: 4px; width: 100%; box-sizing: border-box; line-height: normal;"> No valid allies in range.</div>'
                                    }
                                    </div>
                                </div>
                                <div id="image-container" class="gps-dialog-image-container">
                                    <img id="img_${dialogId}" src="${chosenItem.img}" class="gps-dialog-image">
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
        }
        else if(workflowType === "attack") {
            if (workflow.token.document.disposition === validTokenPrimary.document.disposition) continue;
            if (MidiQOL.safeGetGameSetting('gambits-premades', 'disableSilveryBarbsOnNat20') === true && workflow.isCritical === true) return;
            if (MidiQOL.safeGetGameSetting('gambits-premades', 'enableSilveryBarbsOnNat20') === true && workflow.isCritical !== true) return;

            dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <p class="gps-dialog-paragraph">Would you like to use your reaction to cast ${itemProperName}? ${["none", "detailsDSN", "details"].includes(rollDetailSetting) ? `An enemy successfully hit your ally with a ${workflow.attackTotal}.` : "An enemy successfully hit your ally."} Choose an ally to give advantage to below.</p>
                            <div>
                                <div class="gps-dialog-flex">
                                    <label for="ally-token" class="gps-dialog-label">Advantage:</label>
                                    ${validFriendlies.length >= 1 ? 
                                    `<select id="ally-token" class="gps-dialog-select">
                                        ${validFriendlies.map(friendly => `<option class="gps-dialog-option" style="background-color: ${optionBackground};" value="${friendly.document.uuid}">${friendly.document.name}</option>`).join('')}
                                    </select>` : '<div style="padding: 4px; width: 100%; box-sizing: border-box; line-height: normal;"> No valid allies in range.</div>'
                                    }
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
        }

        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for a save triggering ${itemProperName}.</span>`
        let chatData = { user: gmUser, content: content, roll: false, whisper: gmUser };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });
        
        let result;

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle: dialogTitlePrimary, dialogContent, dialogId, initialTimeLeft, validTokenPrimaryUuid: validTokenPrimary.document.uuid, source: "user", type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
            
            let gmDialogArgs = { dialogTitle: dialogTitleGM, dialogContent, dialogId, initialTimeLeft, validTokenPrimaryUuid: validTokenPrimary.document.uuid, source: "gm", type: "multiDialog", notificationId: notificationMessage._id };
            
            result = await socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
        } else {
            result = await socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
        }
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, source, type } = result;

        if (!userDecision) {
            continue;
        }
        else if (userDecision) {
            let advantageToken;
            let enemyToken;
            if(allyTokenUuid) advantageToken = await fromUuid(allyTokenUuid);
            if(enemyTokenUuid) enemyToken = await fromUuid(enemyTokenUuid);
            let chatContent;

            const options = {
                showFullCard: false,
                createWorkflow: true,
                versatile: false,
                configureDialog: true,
                targetUuids: [(enemyTokenUuid) ? enemyTokenUuid : workflow.token.document.uuid],
            };
            
            let itemRoll;
            if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });
            else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", gmUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });

            if(!itemRoll) continue;

            await helpers.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

            let effectData = [
                {
                    "icon": `${chosenItem.img}`,
                    "origin": `${validTokenPrimary.actor.uuid}`,
                    "duration": {
                    "seconds": 60
                    },
                    "disabled": false,
                    "name": "Silvery Barbs - Advantage",
                    "changes": [
                    {
                        "key": "flags.midi-qol.advantage.attack.all",
                        "mode": 0,
                        "value": "1",
                        "priority": 20
                    },
                    {
                        "key": "flags.midi-qol.advantage.ability.check.all",
                        "mode": 0,
                        "value": "1",
                        "priority": 20
                    },
                    {
                        "key": "flags.midi-qol.advantage.ability.save.all",
                        "mode": 0,
                        "value": "1",
                        "priority": 20
                    }
                    ],
                    "transfer": false,
                    "flags": {
                    "dae": {
                        "specialDuration": [
                            "1Attack",
                            "isCheck",
                            "isSave",
                            "isSkill"
                        ]
                    }
                    }
                }
            ];
            if(advantageToken) await MidiQOL.socket().executeAsUser("createEffects", gmUser, { actorUuid: advantageToken.actor.uuid, effects: effectData });

            let cprConfig = helpers.getCprConfig({itemUuid: chosenItem.uuid});
            const { animEnabled } = cprConfig;
            if(animEnabled) {
                new Sequence()
                .effect()
                    .file("animated-spell-effects-cartoon.misc.music.01")
                    .fadeIn(500)
                    .fadeOut(500)
                    .atLocation(validTokenPrimary, {offset:{x: -550, y: 180}, local: true})
                    .stretchTo((enemyTokenUuid) ? enemyToken.object : workflow.token, {offset:{x: 200, y: -150}, local: true})
                    .playbackRate(1)
                .play()

                new Sequence()
                .effect()
                    .file("jb2a.cast_generic.sound.side01.pinkteal")
                    .fadeIn(500)
                    .fadeOut(500)
                    .atLocation((enemyTokenUuid) ? enemyToken.object : workflow.token)
                    .scaleToObject(4)
                    .playbackRate(1)
                .play()
            }

            if(workflowType === "save") {
                let saveDC = workflow.saveItem.system.save.dc;
                let saveAbility = workflow.saveItem.system.save.ability;
                let workflowTarget = Array.from(workflow.saves).find(t => t.document.uuid === enemyTokenUuid);
                let browserUserTarget = helpers.getBrowserUser({ actorUuid: workflowTarget.actor.uuid });
                let targetSaveBonus =  workflowTarget.actor.system.abilities[`${saveAbility}`].save + workflowTarget.actor.system.abilities[`${saveAbility}`].saveBonus;
                let reroll;
                if(workflowTarget.actor.type !== "npc") reroll = await socket.executeAsUser("rollAsUser", browserUserTarget, { rollParams: `1d20 + ${targetSaveBonus}` });
                else reroll = await socket.executeAsUser("rollAsUser", gmUser, { rollParams: `1d20 + ${targetSaveBonus}` });

                if(reroll.total < saveDC) {
                    workflow.saves.delete(workflowTarget);
                    workflow.failedSaves.add(workflowTarget);

                    chatContent = `<span style='text-wrap: wrap;'>The creature was silvery barbed and failed their save. <img src="${workflowTarget.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: reroll});
                    return;
                }

                else {
                    chatContent = `<span style='text-wrap: wrap;'>The creature was silvery barbed but still succeeded their save. <img src="${workflowTarget.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: reroll});
                    continue;
                }
            }
            else if(workflowType === "attack") {
                let rerollAddition = workflow.attackRoll.total - workflow.attackRoll.dice[0].total;
                let targetAC = workflow.hitTargets.first().actor.system.attributes.ac.value;
                const saveSetting = workflow.options.noOnUseMacro;
                workflow.options.noOnUseMacro = true;
                let reroll;
                if(source && source === "user") reroll = await socket.executeAsUser("rollAsUser", browserUser, { rollParams: `1d20 + ${rerollAddition}` });
                if(source && source === "gm") reroll = await socket.executeAsUser("rollAsUser", gmUser, { rollParams: `1d20 + ${rerollAddition}` });
                if(reroll.total < workflow.attackTotal) await workflow.setAttackRoll(reroll);

                workflow.options.noOnUseMacro = saveSetting;

                if(workflow.attackTotal < targetAC) {                    
                    chatContent = `<span style='text-wrap: wrap;'>The creature was silvery barbed, and failed their attack. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: reroll});
                    return;
                }

                else {
                    chatContent = `<span style='text-wrap: wrap;'>The creature was silvery barbed, but were still able to hit their target. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: reroll});
                    continue;
                }
            }
        }
    }
}
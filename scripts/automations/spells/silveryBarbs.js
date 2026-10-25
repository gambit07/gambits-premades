export async function silveryBarbs({workflowData,workflowType,workflowCombat}) {
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    if(workflowType === "attack" && !game.gps.reactionCanChangeOutcome(workflow)) return;
    const rollType = game.i18n.localize(workflow.saveActivity?.type === "check" || workflow.activity?.type === "check" ? "DND5E.ActionAbil" : "DND5E.SavingThrow");
    const gpsUuid = "548b5cab-f870-47b6-828a-8de7549debeb";
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Silvery Barbs";
    let dialogId = gpsUuid;
    let gmUser = game.gps.getPrimaryGM();
    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    let homebrewDisableNat20 = MidiQOL.safeGetGameSetting('gambits-premades', 'disableSilveryBarbsOnNat20');
    let homebrewEnableNat20 = MidiQOL.safeGetGameSetting('gambits-premades', 'enableSilveryBarbsOnNat20');
    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));

    if(workflow.legendaryResistanceUsed) return;

    // Check if attack hits
    if(workflowType === "attack" && !game.gpsSettings.skipResolvedReactions && workflow.attackTotal < workflow.targets?.first()?.actor.system.attributes.ac.value) return debugEnabled ? game.gps.logInfo(`${itemName} failed due to no valid attack targets`) : "";
    // Check if there is a save success
    if(workflowType === "save" && workflow.saves.size === 0) return debugEnabled ? game.gps.logInfo(`${itemName} failed due to no valid save targets`) : "";

    let findValidTokens;
    
    if(workflowType === "attack") {
        findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "spell", itemChecked: null, reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});
    }
    else if(workflowType === "save") {
        findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "spell", itemChecked: null, reactionCheck: true, sightCheck: false, rangeCheck: false, rangeTotal: null, dispositionCheck: false, dispositionCheckType: "ally", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});
    }
    
    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        if(workflowType === "attack" && !game.gps.reactionCanChangeOutcome(workflow)) return;
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = game.i18n.format("GAMBITSPREMADES.Dialogs.Common.WaitingForSelection", { actorName: validTokenPrimary.actor.name, itemName: itemName });
        
        browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

        let dialogContent;
        const rollDetailSetting = MidiQOL.safeGetGameSetting('midi-qol', 'ConfigSettings').hideRollDetails;
        const nearbyFriendlies = MidiQOL.findNearby(null, validTokenPrimary, game.gps.convertFromFeet({range: 60}), { includeToken: true });
        let validFriendlies = nearbyFriendlies.filter(token => token.document.disposition === validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary.document.uuid,token.document.uuid) && !token.actor.effects.getName(`${itemProperName} - Advantage`));

        if(workflowType === "save") {
            let targets = Array.from(workflow.saves).filter(t => t.document.disposition !== validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary, t) && game.gps.withinRange(validTokenPrimary, t, 60));

            if(targets.length === 0) {
                debugEnabled ? game.gps.logInfo(`${itemName} for ${validTokenPrimary.actor.name} failed due to no valid save targets`) : "";
                continue;
            }

            const targetUuids = targets.map(t => t.document.uuid);
            const targetNames = targets.map(t => t.document.name);
        
            dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <p class="gps-dialog-paragraph">${game.i18n.format(targets.length > 1 ? "GAMBITSPREMADES.Dialogs.Automations.Spells.SilveryBarbs.Prompts.UseYourReaction.AfterSave.Multiple" : "GAMBITSPREMADES.Dialogs.Automations.Spells.SilveryBarbs.Prompts.UseYourReaction.AfterSave.Single", { itemName: itemProperName })}</p>
                            <div class="gps-dialog-flex-wrapper">
                                <div class="gps-dialog-select-container">
                                    <div class="gps-dialog-flex">
                                    <label for="enemy-token" class="gps-dialog-label">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Target")}</label>
                                    <select id="enemy-token" class="gps-dialog-select">
                                        ${targetNames.map((name, index) => `<option class="gps-dialog-option" value="${targetUuids[index]}">${name}</option>`).join('')}
                                    </select>
                                    </div>
                                    <div class="gps-dialog-flex">
                                    <label for="ally-token" class="gps-dialog-label">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Advantage")}</label>
                                    ${validFriendlies.length >= 1 ? 
                                    `<select id="ally-token" class="gps-dialog-select">
                                        ${validFriendlies.map(friendly => `<option class="gps-dialog-option" value="${friendly.document.uuid}">${friendly.document.name}</option>`).join('')}
                                    </select>` : `<div style="padding: 4px; width: 100%; box-sizing: border-box; line-height: normal;">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.NoValidAlliesInRange")}</div>`
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
                            <i class="fas fa-pause" id="pauseIcon_${dialogId}" style="margin-right: 5px;"></i>${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Pause")}
                        </button>
                    </div>
                </div>
            `;
        }
        else if(workflowType === "attack") {
            if (workflow.token.document.disposition === validTokenPrimary.document.disposition) {
                debugEnabled ? game.gps.logInfo(`${itemName} for ${validTokenPrimary.actor.name} failed due to no valid attack targets`) : "";
                continue;
            }
            if (homebrewDisableNat20 && workflow.isCritical === true) return debugEnabled ? game.gps.logInfo(`${itemName} failed due to homebrew rule disabling on criticle success`) : "";
            if (homebrewEnableNat20 && workflow.isCritical !== true) return debugEnabled ? game.gps.logInfo(`${itemName} failed due to homebrew rule enabling only on criticle success`) : "";

            dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <p class="gps-dialog-paragraph">${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.Spells.SilveryBarbs.Prompts.UseYourReaction.AfterAttack", { itemName: itemProperName, triggerDetails: ["none", "detailsDSN", "details"].includes(rollDetailSetting) ? game.i18n.format("GAMBITSPREMADES.Dialogs.Common.EnemyHitsAllyWithAttackTotal", { attackTotal: workflow.attackTotal }) : game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.EnemyHitsAlly") })}</p>
                            <div>
                                <div class="gps-dialog-flex">
                                    <label for="ally-token" class="gps-dialog-label">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Advantage")}</label>
                                    ${validFriendlies.length >= 1 ? 
                                    `<select id="ally-token" class="gps-dialog-select">
                                        ${validFriendlies.map(friendly => `<option class="gps-dialog-option" value="${friendly.document.uuid}">${friendly.document.name}</option>`).join('')}
                                    </select>` : `<div style="padding: 4px; width: 100%; box-sizing: border-box; line-height: normal;">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.NoValidAlliesInRange")}</div>`
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
                            <i class="fas fa-pause" id="pauseIcon_${dialogId}" style="margin-right: 5px;"></i>${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Pause")}
                        </button>
                    </div>
                </div>
            `;
        }

        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${game.i18n.format("GAMBITSPREMADES.ChatMessages.Common.ReactionAvailableSaveTrigger", { actorName: validTokenPrimary.actor.name, itemProperName: itemProperName })}</span>`
        let chatData = { user: gmUser, content: content, roll: false };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });
        
        let result;

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle: dialogTitlePrimary, dialogContent, dialogId, initialTimeLeft, validTokenPrimaryUuid: validTokenPrimary.document.uuid, focusTokenUuid: workflowType === "attack" ? workflow.token.document.uuid : undefined, source: "user", type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
            
            let gmDialogArgs = { dialogTitle: dialogTitleGM, dialogContent, dialogId, initialTimeLeft, validTokenPrimaryUuid: validTokenPrimary.document.uuid, focusTokenUuid: workflowType === "attack" ? workflow.token.document.uuid : undefined, source: "gm", type: "multiDialog", notificationId: notificationMessage._id };
            
            result = await game.gps.handleDialogPromises({userDialogArgs, gmDialogArgs});
        } else {
            result = await game.gps.queryDialog("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid, focusTokenUuid: workflowType === "attack" ? workflow.token.document.uuid : undefined,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
        }
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, source, type } = result || {};

        if (!userDecision) {
            continue;
        }
        else if (userDecision) {
            let advantageToken;
            let enemyToken;
            if(allyTokenUuid) advantageToken = await fromUuid(allyTokenUuid);
            if(enemyTokenUuid) enemyToken = await fromUuid(enemyTokenUuid);
            if(workflowType === "save" && (!enemyToken?.actor || !workflow.tokenSaves?.[enemyTokenUuid])) continue;
            let chatContent;

            const options = {
                showFullCard: false,
                createWorkflow: true,
                versatile: false,
                configureDialog: true,
                targetUuids: [(enemyTokenUuid) ? enemyTokenUuid : workflow.token.document.uuid],
            };
            
            let itemRoll;
            if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, config: { midiOptions: { ...options, workflowData: true } } });
            else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", gmUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, config: { midiOptions: { ...options, workflowData: true } } });

            if(!itemRoll || itemRoll.aborted) continue;

            await game.gps.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

            let effectData = [
                {
                    img: `${chosenItem.img}`,
                    "origin": `${validTokenPrimary.actor.uuid}`,
                    "duration": { value: 60, units: "seconds" },
                    "disabled": false,
                    "name": "Silvery Barbs - Advantage",
                    system: { changes: [
                    {
                        "key": "attack",
                        type: "dnd5e.advantage",
                        "value": "1",
                        "priority": 100
                    },
                    {
                        "key": "check",
                        type: "dnd5e.advantage",
                        "value": "1",
                        "priority": 100
                    },
                    {
                        "key": "save",
                        type: "dnd5e.advantage",
                        "value": "1",
                        "priority": 100
                    }
                    ] },
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

            let cprConfig = game.gps.getCprConfig({itemUuid: chosenItem.uuid});
            const { animEnabled } = cprConfig;
            if(animEnabled) {
                game.gps.silveryBarbsAnimation({sourceToken: validTokenPrimary, targetToken: enemyTokenUuid ? enemyToken.object : workflow.token});
            }

            if(workflowType === "save") {
                const workflowTarget = Array.from(workflow.saves).find(t => t.document.uuid === enemyTokenUuid);
                if(!workflowTarget) continue;
                const original = workflow.tokenSaves[enemyTokenUuid];
                const rolled = await game.gps.queryUser("rollAsUser", game.gps.getBrowserUser({actorUuid: workflowTarget.actor.uuid}), {rollParams: "1d20"});
                if(!rolled) continue;
                const first = original.dice.find(die => die.faces === 20)?.total;
                const reroll = rolled.total < first ? game.gps.replaceD20Result(original, rolled.total) : original;
                const saved = await game.gps.updateSaveResult({workflow, token: workflowTarget, roll: reroll});
                if(!saved) {

                    chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.Spells.SilveryBarbs.FailedSaveCheck", { rollType, itemName: workflow.item.name })} <img src="${workflowTarget.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.queryUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: reroll});
                    return;
                }

                else {
                    chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.Spells.SilveryBarbs.Succeeded", { rollType, itemName: workflow.item.name })} <img src="${workflowTarget.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.queryUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: reroll});
                    continue;
                }
            }
            else if(workflowType === "attack") {
                let rerollAddition = workflow.attackRoll.total - workflow.attackRoll.dice[0].total;
                let targetAC = workflow.targets.first().actor.system.attributes.ac.value;
                let reroll;
                if(source && source === "user") reroll = await game.gps.queryUser("rollAsUser", browserUser, { rollParams: `1d20 + ${rerollAddition}` });
                if(source && source === "gm") reroll = await game.gps.queryUser("rollAsUser", gmUser, { rollParams: `1d20 + ${rerollAddition}` });
                if(reroll && reroll.total < workflow.attackTotal) await game.gps.setAttackResult(workflow, game.gps.replaceD20Result(workflow.attackRoll, reroll.total - rerollAddition));

                if(workflow.attackTotal < targetAC) {                    
                    chatContent = `<span style='text-wrap: wrap;'>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.Spells.SilveryBarbs.AttackFailed")} <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.queryUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: reroll});
                    if(game.gpsSettings.skipResolvedReactions && game.gps.reactionCanChangeOutcome(workflow)) continue;
                    return;
                }

                else {
                    chatContent = `<span style='text-wrap: wrap;'>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.Spells.SilveryBarbs.AttackHitAnyway")} <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.queryUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: reroll});
                    continue;
                }
            }
        }
    }
}

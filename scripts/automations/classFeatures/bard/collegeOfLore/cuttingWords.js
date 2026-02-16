export async function cuttingWords({workflowData,workflowType,workflowCombat}) {
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    const gpsUuid = "b352241e-5042-44a4-b632-3168ded51946";
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Cutting Words";
    let dialogId = gpsUuid;
    let gmUser = game.gps.getPrimaryGM();
    let homebrewDisableMaxMiss = MidiQOL.safeGetGameSetting('gambits-premades', 'disableCuttingWordsMaxMiss');
    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));

    if(workflowType === "damage" && workflow.hitTargets?.size === 0) return;

    let findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "feature", itemChecked: ["bardic-inspiration"], reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", rollType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});
    
    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        const scales = validTokenPrimary.actor.system.scale;
        const possibleScales = [
          scales?.bard?.["bardic-inspiration"],
          scales?.bard?.["inspiration"],
          scales?.ambassador?.["bardic-inspiration"] // Homebrew for SciFi 5e
        ];
        
        const foundScale = possibleScales.find(e => e?.die && e?.faces);
        if (!foundScale) {
          ui.notifications.error(game.i18n.localize("GAMBITSPREMADES.Notifications.ClassFeatures.Bard.CollegeOfLore.CuttingWords.MissingBardicInspirationScale"));
          continue;
        }
        
        const bardicDie = foundScale.die;
        const bardicNum = foundScale.faces;
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        let cprConfig = game.gps.getCprConfig({itemUuid: chosenItem.uuid});
        const { animEnabled, animColor } = cprConfig;
        let hue;
        switch (animColor) {
            case "blue":
                hue = 180;
                break;
            case "green":
                hue = 70;
                break;
            case "purple":
                hue = 220;
                break;
            case "pink":
                hue = 300;
                break;
            case "yellow":
                hue = 0;
                break;
            case "orange":
                hue = 330;
                break;
            default: hue = 0;
        }
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = game.i18n.format("GAMBITSPREMADES.Dialogs.Common.WaitingForSelection", { actorName: validTokenPrimary.actor.name, itemName: itemProperName });
        browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

        let dialogContent;
        const rollDetailSetting = MidiQOL.safeGetGameSetting('midi-qol', 'ConfigSettings').hideRollDetails;

        if(workflowType === "damage") {
            if (workflow.token.document.disposition === validTokenPrimary.document.disposition) continue;

            let damageTypes = workflow.damageRolls.map(roll => roll.options.type);
            let hasHealing = damageTypes.some(type => type === "healing");
            if (hasHealing) return;
            let damageTotals = workflow.damageRolls.map(roll => roll.total);

            dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <p class="gps-dialog-paragraph">${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Bard.CollegeOfLore.CuttingWords.Prompts.UseYourReaction.Default", { itemName: itemProperName, rollType: workflowType })}</p>
                            <div>
                                <div class="gps-dialog-flex">
                                    <label for="damage-list" class="gps-dialog-label">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.DamageLabel")}</label>
                                    <ul id="damage-list" class="sortable" style="padding: 0; margin: 0; list-style-type: none;">
                                        ${damageTypes.map((name, index) => `
                                        <li draggable="true" style="padding: 6px; margin-bottom: 4px; cursor: grab; border: 1px solid #ccc;">
                                            <span class="damage-type">${name}</span>${["none", "detailsDSN", "details", "d20Only", "hitDamage", "hitCriticalDamage"].includes(rollDetailSetting) ? game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Bard.CollegeOfLore.CuttingWords.Pts", { points: damageTotals[index] }) : ""}
                                        </li>`).join('')}
                                    </ul>
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
        else if(workflowType === "attack") {
            if(workflow.token.document.disposition === validTokenPrimary.document.disposition) {
                if(debugEnabled) game.gps.logInfo(`${itemName} for ${validTokenPrimary.actor.name} failed at failed at token disposition check`);
                continue;
            }
            if(((workflow.attackTotal - bardicNum) >= workflow.targets.first()?.actor.system.attributes.ac.value) && homebrewDisableMaxMiss) {
                if(debugEnabled) game.gps.logInfo(`${itemName} for ${validTokenPrimary.actor.name} failed at homebrew max bardic die would not effect hit`);
                continue;
            }

            dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <div>
                                <div class="gps-dialog-flex">
                                    <p class="gps-dialog-paragraph">${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Bard.CollegeOfLore.CuttingWords.Prompts.UseYourReaction.WithDetails", { details: ["none", "detailsDSN", "details"].includes(rollDetailSetting) ? game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Bard.CollegeOfLore.CuttingWords.TargetRolledAttack", { attackTotal: workflow.attackTotal }) : "", itemName: itemProperName, rollType: workflowType })}</p>
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

        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Bard.CollegeOfLore.CuttingWords.ReactionAvailable", { actorName: validTokenPrimary.actor.name, rollType: workflowType, itemName: itemProperName })}</span>`;
        let chatData = { user: gmUser, content: content, roll: false };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

        let result;

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "user",type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
            
            let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "gm",type: "multiDialog", notificationId: notificationMessage._id };
        
            result = await game.gps.socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
        } else {
            result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
        }
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, source, type } = result || {};

        if (!userDecision) {
            continue;
        }
        else if (userDecision) {            
            const options = {
                showFullCard: false,
                createWorkflow: true,
                versatile: false,
                configureDialog: true,
                targetUuids: [workflow.token.document.uuid],
            };

            let itemRoll;
            if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });
            else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", gmUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });

            if(!itemRoll) continue;
            let chatContent;

            await game.gps.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

            let hasDeafened = workflow.token.document.hasStatusEffect("deafened");
            let charmImmunity = workflow.actor.system.traits.ci.value.has("charmed");
            
            if (charmImmunity || hasDeafened) {
                chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Bard.CollegeOfLore.CuttingWords.SeemsNotBeEffectedBy", { itemName: itemProperName })}<img src="${workflow.actor.img}" width="30" height="30" style="border:0px"></span>`;

                let actorPlayer = MidiQOL.playerForActor(validTokenPrimary.actor);
                let chatData = {
                    user: actorPlayer.id,
                    speaker: ChatMessage.getSpeaker({ token: validTokenPrimary }),
                    content: chatContent
                };
                ChatMessage.create(chatData);

                continue;
            }

            if(animEnabled) {
                new Sequence()
                    .effect()
                        .atLocation(workflow.token)
                        .file("jb2a.melee_generic.slashing.two_handed")
                        .scaleToObject(2.5)
                        .spriteRotation(135)
                        .filter("ColorMatrix", { saturate: 1.5, hue: hue })
                    .play()

                    new Sequence()
                    .effect()
                        .atLocation(workflow.token)
                        .file("jb2a.melee_generic.slashing.two_handed")
                        .scaleToObject(2.5)
                        .spriteRotation(40)
                        .filter("ColorMatrix", { saturate: 1.5, hue: hue })
                    .play()
            }

            if(workflowType === "damage") {
                const saveSetting = workflow.workflowOptions.noOnUseMacro;
                workflow.workflowOptions.noOnUseMacro = true;
                let reroll;
                if(source && source === "user") reroll = await game.gps.socket.executeAsUser("rollAsUser", browserUser, { rollParams: `1${bardicDie}`, type: workflowType });
                if(source && source === "gm") reroll = await game.gps.socket.executeAsUser("rollAsUser", gmUser, { rollParams: `1${bardicDie}`, type: workflowType });

                let remainingReduction = reroll.total;
                let updatedRolls = [];
                let processedRolls = new Set();
                
                for (const priority of damageChosen) {
                    let rollFound = workflow.damageRolls.find(roll => roll.options.type === priority);
                
                    if (rollFound) {
                    processedRolls.add(rollFound);
                        let rollTotal = rollFound.total;
                        if (rollTotal >= remainingReduction) {
                            let modifiedRoll = await new CONFIG.Dice.DamageRoll(`${rollTotal} - ${remainingReduction}`).evaluate();
                            modifiedRoll.options = rollFound.options;
                            updatedRolls.push(modifiedRoll);
                            remainingReduction = 0;
                            break;
                        } else {
                            remainingReduction -= rollTotal;
                            let zeroRoll = await new CONFIG.Dice.DamageRoll(`${rollTotal} - ${rollTotal}`).evaluate();
                            zeroRoll.options = rollFound.options;
                            updatedRolls.push(zeroRoll);
                        }
                    }
                }
                
                workflow.damageRolls.forEach(roll => {
                    if (!processedRolls.has(roll)) {
                        updatedRolls.push(roll);
                    }
                });

                await workflow.setDamageRolls(updatedRolls);
        
                workflow.workflowOptions.noOnUseMacro = saveSetting;

                chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Bard.CollegeOfLore.CuttingWords.DamageReduced", { reduction: reroll.total })} <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;

                await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: reroll});

                continue;
            }

            else if(workflowType === "attack") {
                
                let targetAC = workflow.targets.first()?.actor.system.attributes.ac.value;
                const saveSetting = workflow.workflowOptions.noOnUseMacro;
                workflow.workflowOptions.noOnUseMacro = true;
                let reroll;
                if(source && source === "user") reroll = await game.gps.socket.executeAsUser("rollAsUser", browserUser, { rollParams: `1${bardicDie}`, type: workflowType });
                if(source && source === "gm") reroll = await game.gps.socket.executeAsUser("rollAsUser", gmUser, { rollParams: `1${bardicDie}`, type: workflowType });
                let rerollNew = await new Roll(`${workflow.attackRoll.result} - ${reroll.total}`).evaluate();

                await workflow.setAttackRoll(rerollNew);
                workflow.workflowOptions.noOnUseMacro = saveSetting;

                if((workflow.attackTotal - reroll.total) < targetAC) {
                    chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Bard.CollegeOfLore.CuttingWords.CuttingWordsReducedAttackMiss", { reduction: reroll.total })} <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;

                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: rerollNew});

                    return;
                }

                else {
                    chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Bard.CollegeOfLore.CuttingWords.CuttingWordsReducedAttackHit", { reduction: reroll.total })} <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;

                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: rerollNew});

                    continue;
                }
            }
        }
    }
}
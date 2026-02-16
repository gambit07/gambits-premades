export async function mageSlayer({workflowData,workflowType,workflowCombat}) {
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    const gpsUuid = "fc0e0473-038b-4e68-abd5-538b8fbbb4a5";
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Mage Slayer";
    let dialogId = gpsUuid;
    let gmUser = game.gps.getPrimaryGM();
    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));

    let findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: workflow.token, itemName: itemName, itemType: null, itemChecked: null, reactionCheck: true, sightCheck: false, rangeCheck: true, rangeTotal: 5, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});

    for (const validTokenPrimary of findValidTokens) {
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        
        if(workflowType === "save") {
            let target = Array.from(workflow.targets).filter(t => t.document.uuid === validTokenPrimary.document.uuid);
            if(target.length === 0) continue;
            else {
                let effectData = [{
                    "origin": chosenItem.uuid,
                    "disabled": false,
                    "name": `${chosenItem.name} - Advantage`,
                    "img": chosenItem.img,
                    "type": "base",
                    "changes": [
                      {
                        "key": "flags.midi-qol.advantage.save.all",
                        "mode": 0,
                        "value": "1",
                        "priority": 20
                      }
                    ],
                    "transfer": false,
                    "flags": {
                      "dae": {
                        "specialDuration": [
                          "isSave"
                        ]
                      }
                    }
                  }];
                
                  await MidiQOL.socket().executeAsUser("createEffects", gmUser, { actorUuid: validTokenPrimary.actor.uuid, effects: effectData });
                  continue;
            }
        }
        else {
            const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
            const dialogTitleGM = game.i18n.format("GAMBITSPREMADES.Dialogs.Common.WaitingForSelection", { actorName: validTokenPrimary.actor.name, itemName: itemProperName });
            let browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

            // Check valid weapons
            let validWeapons = validTokenPrimary.actor.items.filter(item => item.system.equipped === true && item.system.activities?.some(activity => activity?.actionType === "mwak"));
            if (!validWeapons.length) continue;
            
            // Sort the weapons alphabetically
            validWeapons.sort((a, b) => a.name.localeCompare(b.name));
            
            // Check for favorite weapon and put it on top
            let favoriteWeaponUuid = null;
            const favoriteWeaponIndex = validWeapons.findIndex(item => item.flags?.['midi-qol']?.oaFavoriteAttack);
            if (favoriteWeaponIndex > -1) {
                const favoriteWeapon = validWeapons.splice(favoriteWeaponIndex, 1)[0];
                favoriteWeaponUuid = favoriteWeapon.uuid;
                validWeapons.unshift(favoriteWeapon);
            }

            // Find 'Unarmed Strike' from the validWeapons array and add to end of list
            const unarmedIndex = validWeapons.findIndex(item => item.name.toLowerCase() === "unarmed strike");
            if (unarmedIndex > -1) {
                if(validWeapons[unarmedIndex]?.uuid !== favoriteWeaponUuid) {
                    let unarmedStrike = validWeapons.splice(unarmedIndex, 1)[0];
                    validWeapons.push(unarmedStrike);
                }
            }

            let dialogContent = `
                <style>
                #gps-favorite-checkbox { position: absolute; opacity: 0; width: 0; height: 0; } #gps-favorite-checkbox + label { display: flex; align-items: center; cursor: pointer; } #gps-favorite-checkbox + label::before { content: "\\2606"; font-size: 30px; margin-right: 5px; line-height: 1; vertical-align: middle; } #gps-favorite-checkbox:checked + label::before { content: "\\2605"; }
                </style>
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <p class="gps-dialog-paragraph">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.GenericFeatures.MageSlayer.Prompts.UseYourReaction.Default")}</p>
                            <div>
                                <div class="gps-dialog-flex">
                                    <label for="item-select_${dialogId}" class="gps-dialog-label">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Weapon")}</label>
                                    <select id="item-select_${dialogId}" class="gps-dialog-select">
                                        ${validWeapons.map(item => `<option name="${item.img}" value="${item.uuid}" class="gps-dialog-option">${item.name} ${favoriteWeaponUuid === item.uuid ? "&#9733;" : ""}</option>`).join('')}
                                    </select>
                                    <div id="image-container" class="gps-dialog-image-container">
                                        <img id="weapon-img_${dialogId}" class="gps-dialog-image">
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; margin-top: 12px;">
                                    <input type="checkbox" id="gps-favorite-checkbox" style="vertical-align: middle;"/>
                                    <label for="gps-favorite-checkbox">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.FavoriteThisOption")}</label>
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

            let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${game.i18n.format("GAMBITSPREMADES.ChatMessages.Common.ReactionAvailableAttackTrigger", { actorName: validTokenPrimary.actor.name, itemProperName: itemProperName })}</span>`
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

            const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, selectedItemUuid, favoriteCheck, source, type } = result || {};

            if (!userDecision) {
                continue;
            }
            else if (userDecision) {
                if (!selectedItemUuid) {
                    console.log("No weapon selected");
                    continue;
                }

                let chosenWeapon = await fromUuid(selectedItemUuid);
                let favoriteWeaponCheck = favoriteWeaponUuid;
                let favoriteWeapon;
                if(favoriteWeaponCheck !== "null") favoriteWeapon = await fromUuid(favoriteWeaponCheck);
                if(favoriteCheck && favoriteWeaponCheck) {
                    await chosenWeapon.setFlag("midi-qol", "oaFavoriteAttack", true);
                    if (favoriteWeapon.uuid !== chosenWeapon.uuid) {
                        await favoriteWeapon.unsetFlag("midi-qol", "oaFavoriteAttack");
                    }
                }
                else if(favoriteCheck) {
                    await chosenWeapon.setFlag("midi-qol", "oaFavoriteAttack", true);
                }

                let clonedWeapon = foundry.utils.deepClone(chosenWeapon);

                foundry.utils.mergeObject(clonedWeapon, {
                system: {
                    range: {
                        value: null,
                        long: null,
                        units: ""
                    }
                }
                }, { inplace: true });
        
                chosenWeapon = clonedWeapon;

                const options = {
                    showFullCard: false,
                    createWorkflow: true,
                    versatile: false,
                    configureDialog: false,
                    targetUuids: [`${workflow.token.document.uuid}`],
                    workflowOptions: {
                        autoRollDamage: 'always',
                        autoRollAttack: true,
                        autoFastDamage: true
                    }
                };

                let itemRoll;
                if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser, { itemData: chosenWeapon, actorUuid: validTokenPrimary.actor.uuid, options: options });
                else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", gmUser, { itemData: chosenWeapon, actorUuid: validTokenPrimary.actor.uuid, options: options });
                if(!itemRoll) continue;

                await game.gps.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});
            }
        }
    }
}
export async function riposte({workflowData,workflowType,workflowCombat}) {
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    const gpsUuid = "73ae66c4-4bd4-41cd-b75a-0056ef8b670c";
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Maneuvers: Riposte";
    let dialogId = gpsUuid;
    const actionTypes = ["mwak"];
    if (!actionTypes.some(type => workflow.activity?.actionType?.includes(type))) {
        return;
    }
    let target = workflow.targets.first();
    let gmUser = game.gps.getPrimaryGM();
    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `Riposte Timeout`));

    let targetAC = target.actor.system.attributes.ac.value;
    let attackTotal = workflow.attackTotal;
    if (attackTotal >= targetAC) return;

    let findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: target, itemName: itemName, itemType: "feature", itemChecked: ["superiority dice", "superiority die", "combat superiority"], reactionCheck: true, sightCheck: false, rangeCheck: false, rangeTotal: null, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});

    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        if(validTokenPrimary.id !== target.id) continue;
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

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
            #gps-favorite-checkbox {
            position: absolute;
            opacity: 0;
            width: 0;
            height: 0;
            }

            #gps-favorite-checkbox + label {
            display: flex;
            align-items: center;
            cursor: pointer;
            }

            #gps-favorite-checkbox + label::before {
            content: "\\2606"; /* Unicode empty star (☆) for my remembrance*/
            font-size: 30px;
            margin-right: 5px;
            line-height: 1;
            vertical-align: middle;
            }

            #gps-favorite-checkbox:checked + label::before {
                content: "\\2605"; /* Unicode filled star (★) also for my remembrance */
            }
            </style>
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <p class="gps-dialog-paragraph">Would you like to use your reaction to attack? This will initiate a use of your Superiority Die for the Riposte maneuver. Choose your weapon below.</p>
                        <div>
                            <div class="gps-dialog-flex">
                                <label for="item-select_${dialogId}" class="gps-dialog-label">Weapon:</label>
                                <select id="item-select_${dialogId}" class="gps-dialog-select">
                                    ${validWeapons.map(item => `<option name="${item.img}" value="${item.uuid}" class="gps-dialog-option">${item.name} ${favoriteWeaponUuid === item.uuid ? "&#9733;" : ""}</option>`).join('')}
                                </select>
                                <div id="image-container" class="gps-dialog-image-container">
                                    <img id="weapon-img_${dialogId}" class="gps-dialog-image">
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; margin-top: 12px;">
                                <input type="checkbox" id="gps-favorite-checkbox" style="vertical-align: middle;"/>
                                <label for="gps-favorite-checkbox">Favorite this Option?</label>
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

        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for an attack triggering ${itemProperName}.</span>`
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

        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, selectedItemUuid, favoriteCheck, source, type } = result || {};

        if (!userDecision) {
            continue;
        }
        else if (userDecision) {
            const riposteOptions = {
                showFullCard: false,
                createWorkflow: true,
                versatile: false,
                configureDialog: true,
                targetUuids: [workflow.token.document.uuid],
            };

            let riposteRoll;
            if(source && source === "user") riposteRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: riposteOptions });
            else if(source && source === "gm") riposteRoll = await MidiQOL.socket().executeAsUser("completeItemUse", gmUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: riposteOptions });
            if(riposteRoll.aborted === true) continue;

            if (!selectedItemUuid) {
                console.log("No weapon selected");
                continue;
            }

            await game.gps.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

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

            const hasEffectAppliedReaction = MidiQOL.hasUsedReaction(validTokenPrimary.actor);
            if (!hasEffectAppliedReaction) {
                MidiQOL.setReactionUsed(validTokenPrimary.actor)
            }
            await game.gps.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`})
        }
    }
}
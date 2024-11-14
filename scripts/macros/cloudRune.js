export async function cloudRune({workflowData,workflowType,workflowCombat}) {
    const module = await import('../module.js');
    const helpers = await import('../helpers.js');
    const socket = module.socket;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    const gpsUuid = "8b8a1e0a-54b8-4b11-9247-5e16e4d92b4b";
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Cloud Rune";
    let dialogId = gpsUuid;
    let target = workflow.targets.first();
    let gmUser = helpers.getPrimaryGM();
    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));

    if(workflow.attackTotal < target.actor.system.attributes.ac.value) return;
    if(workflow.targets.size > 1) return;

    let findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: target, itemName: itemName, itemType: "feature", itemChecked: [itemName], reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 30, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});

    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        const nearbyTokens = MidiQOL.findNearby(null, validTokenPrimary, 30, { includeToken: false });
        let targets = nearbyTokens.filter(token => token.document.disposition !== validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary.document.uuid,token.document.uuid) && token.document.uuid !== workflow.token.document.uuid);
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        const targetUuids = targets.map(t => t.document.uuid);
        const targetNames = targets.map(t => t.actor.name);
        if(targetUuids.length === 0) continue;
        
        targetUuids.map((uuid, index) => 
            `<option value="${uuid}">${targetNames[index]}</option>`
        ).join('');

        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        browserUser = helpers.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

        const optionBackground = (document.body.classList.contains("theme-dark")) ? 'black' : 'var(--color-bg)';

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <p class="gps-dialog-paragraph">Would you like to use your reaction to initiate ${itemProperName} and re-direct this attack?</p>
                        <div>
                            <div class="gps-dialog-flex">
                                <label for="enemy-token" class="gps-dialog-label">Target:</label>
                                ${targetNames.length >= 1 ? 
                                    `<select id="enemy-token" class="gps-dialog-select">
                                        ${targetNames.map((name, index) => `<option class="gps-dialog-option" style="background-color: ${optionBackground};" value="${targetUuids[index]}">${name}</option>`).join('')}
                                    </select>` : '<div style="padding: 4px; width: 100%; box-sizing: border-box; line-height: normal;"> No valid enemies in range.</div>'
                                }
                                <div id="image-container" class="gps-dialog-image-container">
                                    <img id="weapon-img_${dialogId}" src="${chosenItem.img}" class="gps-dialog-image">
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

        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has an option available for an attack triggering ${itemProperName}.</span>`
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
                
            const { userDecision, enemyTokenUuid, source, type } = result;

            if (!userDecision) {
            continue;
        }
        else if (userDecision) {
            chosenItem.prepareData();
            chosenItem.prepareFinalAttributes();
            chosenItem.applyActiveEffects();

            const optionsChosenItem = {
                showFullCard: false,
                createWorkflow: true,
                versatile: false,
                configureDialog: true,
                targetUuids: [validTokenPrimary.document.uuid]
            };                

            let itemRoll;
            if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: optionsChosenItem });
            else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", gmUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: optionsChosenItem });
            if(itemRoll.aborted === true) continue;

            await helpers.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});
            
            let rerollNew = await new Roll(`${workflow.attackRoll.result}`).evaluate();
            let newItemData = workflow.item;

            newItemData = newItemData.clone({
                system: {
                    "range": {
                        "value": null,
                        "long": null,
                        "units": ""
                    }
                }
            }, { keepId: true });

            newItemData.prepareData();
            newItemData.prepareFinalAttributes();
            newItemData.applyActiveEffects();
            
            const options = {
                showFullCard: false,
                createWorkflow: true,
                versatile: false,
                configureDialog: true,
                targetUuids: [enemyTokenUuid],
                workflowOptions: {autoFastForward: "on", autoRollAttack: true, attackRollDSN: false}
            };

            workflow.aborted = true;

            const hookid = Hooks.once("midi-qol.preAttackRollComplete", async (workflow) => {
                await workflow.setAttackRoll(rerollNew);
            });
            
            await MidiQOL.completeItemUse(newItemData, {}, options);
            
            Hooks.off('', hookid);
        }
    }
}
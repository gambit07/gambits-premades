export async function powerWordRebound({workflowData,workflowType,workflowCombat}) {
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    const gpsUuid = "b8949110-fd25-4d67-a65f-1bdc3d03b36e";
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Power Word Rebound";
    let dialogId = gpsUuid;
    let target = workflow.targets.first();
    if(!target) return;
    let gmUser = game.gps.getPrimaryGM();
    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));

    if(target.actor.system.attributes.hp.value >= Math.floor(target.actor.system.attributes.hp.max / 2)) return;
    if(workflow.attackTotal < target.actor.system.attributes.ac.value) return;
    if(workflow.targets.size > 1) return;

    let findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: target, itemName: itemName, itemType: "spell", itemChecked: null, reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});

    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">${target.actor.name} has been hit by an attack and is under half health, would you like to use ${itemProperName} to deflect it?</p>
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

        let result;

        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for a roll triggering ${itemProperName}.</span>`
        let chatData = { user: gmUser, content: content, roll: false };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

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
                targetUuids: [target.document.uuid]
            };

            let itemRoll;
            if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });
            else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", gmUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });
            if(!itemRoll) continue;

            await game.gps.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

            let diceConfig = game.settings.get("core", "diceConfiguration");
            const diceConfigOrig = diceConfig.d20;
            diceConfig.d20 = '';
            await game.settings.set("core", "diceConfiguration", diceConfig);
            let rerollNew = await new CONFIG.Dice.D20Roll(`${workflow.attackRoll.result}`).evaluate();
            await rerollNew.dice.forEach(d => d.results.forEach(r => foundry.utils.setProperty(r, "hidden", true)));
            diceConfig.d20 = diceConfigOrig;
            await game.settings.set("core", "diceConfiguration", diceConfig);

            let newItemData = workflow.item;

            const optionsNew = {
                showFullCard: false,
                createWorkflow: false,
                versatile: false,
                configureDialog: true,
                targetUuids: [workflow.token.document.uuid],
                workflowOptions: {autoRollDamage: 'always', autoFastDamage: true, autoRollAttack: true, autoFastAttack: true}
            };

            workflow.aborted = true;

            Hooks.once("midi-qol.preAttackRollComplete", async (workflow) => {
                await workflow.setAttackRoll(rerollNew);
            });
            
            await MidiQOL.completeItemUse(newItemData, {}, optionsNew);
        }
    }
}
export async function rainOfCinders({workflowData,workflowType,workflowCombat}) {
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    const gpsUuid = "a95f3926-ba77-45ab-90d9-c0cf3cca10aa";
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Rain of Cinders";
    let dialogId = gpsUuid;
    let target = workflow.targets.first();
    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    let gmUser = game.gps.getPrimaryGM();
    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));

    if(workflow.targets.size > 1) return;

    let findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: target, itemName: itemName, itemType: "feature", itemChecked: ["drawing the hearth"], reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});

    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        if(!validTokenPrimary.actor.appliedEffects.some(e => e.flags["gambits-premades"]?.gpsUuid === "2300dad6-8de1-4fa5-9878-40cec8ee37aa")) {
            if(debugEnabled) console.error(`${itemName} for ${validTokenPrimary.actor.name} failed at parent effect active`);
            continue;
        }
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        let cprConfig = game.gps.getCprConfig({itemUuid: chosenItem.uuid});
        const { animEnabled } = cprConfig;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        let baseItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "2300dad6-8de1-4fa5-9878-40cec8ee37aa");
        browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">${target.actor.name} has been attacked, would you like to initiate ${itemProperName} to use a Hearth Spirit to try and disrupt it?</p>
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

        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for an attack triggering ${itemProperName}.</span>`
        let chatData = { user: gmUser, content: content, roll: false, whisper: gmUser };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "user",type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
            
            let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "gm",type: "multiDialog", notificationId: notificationMessage._id };
        
            result = await game.gps.socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
        } else {
            result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
        }

        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, source, type } = result;

        if (!userDecision) {
            continue;
        }
        else if (userDecision) {
            if(animEnabled) {
                for (let i = 0; i < 5; i++) {
                    new Sequence()
                        .effect()
                            .file("jaamod.fire.fuse_new")
                            .fadeIn(250)
                            .fadeOut(250)
                            .atLocation(workflow.token, { randomOffset: 0.3 })
                            .scaleToObject(1.1)
                            .spriteRotation(90)
                        .play();
                }
            }

            let saveResult;
            if(source && source === "user") saveResult = await game.gps.socket.executeAsUser("gpsActivityUse", browserUser, {itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: workflow.token.document.uuid});
            else if(source && source === "gm") saveResult = await game.gps.socket.executeAsUser("gpsActivityUse", gmUser, {itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: workflow.token.document.uuid});
            if(!saveResult) continue;

            if (saveResult.failedSaves.size !== 0) {
                let itemUses = baseItem.system.uses.spent;
                let itemUsesRemaining = baseItem.system.uses.max - itemUses;
                let attackTotal = workflow.attackTotal;
                let spiritAC = 10 + validTokenPrimary.actor.system.attributes.prof;
                if(attackTotal >= spiritAC) {
                    let highestIndex = -1;

                    for (let i = 0; i < itemUsesRemaining; i++) {
                        const effects = Sequencer.EffectManager.getEffects({name: `DrawingTheHearth_${validTokenPrimary.actor.id}_${i}`, source: validTokenPrimary});
                        if (effects.length > 0) {
                            highestIndex = i;
                        }
                    }

                    if (highestIndex !== -1) {
                        Sequencer.EffectManager.endEffects({name: `DrawingTheHearth_${validTokenPrimary.actor.id}_${highestIndex}`, source: validTokenPrimary});

                        new Sequence()
                        .effect()
                            .atLocation(validTokenPrimary)
                            .file("animated-spell-effects-cartoon.fire.ball.05")
                            .fadeIn(100)
                            .fadeOut(100)
                            .moveTowards(target)
                            .scaleToObject(0.4)
                            .filter("ColorMatrix", { hue: 60 })
                            .waitUntilFinished()
                        .effect()
                            .atLocation(target)
                            .file("animated-spell-effects-cartoon.fire.10")
                            .fadeIn(100)
                            .fadeOut(100)
                            .scaleToObject(1.5)
                            .filter("ColorMatrix", { hue: 60 })
                        .play();
                    }

                    await baseItem.update({"system.uses.spent" : itemUses + 1})
                    let content = `The creature attacks one of your soot spirits and hits! You have ${itemUsesRemaining - 1} soot spirits remaining.`
                    let actorPlayer = MidiQOL.playerForActor(validTokenPrimary.actor);
                    let chatData = {
                        user: actorPlayer.id,
                        speaker: ChatMessage.getSpeaker({ token: validTokenPrimary }),
                        content: content
                    };
                    ChatMessage.create(chatData);
                    workflow.aborted = true;

                    if((itemUsesRemaining - 1) === 0) {
                        let effectData = validTokenPrimary.actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "2300dad6-8de1-4fa5-9878-40cec8ee37aa");
                        if(effectData) {
                            await effectData.delete();
                        }
                    }
                }
                else {
                    new Sequence()
                    .effect()
                        .atLocation(validTokenPrimary)
                        .file("animated-spell-effects-cartoon.fire.ball.05")
                        .fadeIn(100)
                        .fadeOut(100)
                        .moveTowards(target)
                        .scaleToObject(0.4)
                        .filter("ColorMatrix", { hue: 60 })
                        .waitUntilFinished()
                    .effect()
                        .atLocation(target)
                        .file("animated-spell-effects-cartoon.fire.ball.05")
                        .fadeIn(100)
                        .fadeOut(100)
                        .moveTowards(validTokenPrimary)
                        .scaleToObject(0.4)
                        .filter("ColorMatrix", { hue: 60 })
                        .waitUntilFinished()
                    .play();


                    let content = `The creature attacks one of your soot spirits and misses! You have ${itemUsesRemaining} soot spirits remaining.`
                    let actorPlayer = MidiQOL.playerForActor(validTokenPrimary.actor);
                    let chatData = {
                        user: actorPlayer.id,
                        speaker: ChatMessage.getSpeaker({ token: validTokenPrimary }),
                        content: content
                    };
                    ChatMessage.create(chatData);
                    workflow.aborted = true;            
                }
            }
        }
    }
}
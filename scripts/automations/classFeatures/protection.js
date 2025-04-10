export async function protection({workflowData,workflowType,workflowCombat}) {
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    const gpsUuid = "82548541-757a-4d56-961a-3f86bb8a14e6";
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Fighting Style: Protection";
    let dialogId = gpsUuid;
    let target = workflow.targets.first();
    let enableProtectionOnSuccess = MidiQOL.safeGetGameSetting('gambits-premades', 'enableProtectionOnSuccess');
    if ((enableProtectionOnSuccess && workflow.attackRoll.formula.includes("kl")) || (!enableProtectionOnSuccess && workflow.disadvantage === true)) return;
    let gmUser = game.gps.getPrimaryGM();
    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `Protection Timeout`));

    if(enableProtectionOnSuccess && (workflow.attackTotal < target.actor.system.attributes.ac.value)) return;

    let findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: target, itemName: itemName, itemType: "item", itemChecked: ["shield"], reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 5, dispositionCheck: true, dispositionCheckType: "enemyAlly", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});
    
    let browserUser;
    
    for (const validTokenPrimary of findValidTokens) {
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

        if (target.document.uuid === validTokenPrimary.document.uuid) continue;

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">Would you like to use <b>${itemProperName}</b> to disadvantage the attack against <b>${target.actor.name}</b>?</p>
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

        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, source, type } = result;

        if (!userDecision) {
            continue;
        }
        else if (userDecision) {
            await game.gps.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

            let primaryFile = "jaamod.condition.magic_shield";
            let alternateFile = "jb2a.icon.shield.blue";
    
            let fileToPlay = Sequencer.Database.getEntry(primaryFile) ? primaryFile : Sequencer.Database.getEntry(alternateFile) ? alternateFile : "";
    
            new Sequence()
                .effect()
                .file(fileToPlay)
                .atLocation(validTokenPrimary)
                .moveTowards(target)
                .scaleToObject(2.0)
                .zIndex(0)
                .belowTokens(false)
                .fadeIn(250)
                .fadeOut(250)
                .play();
    
            if(!enableProtectionOnSuccess) workflow.disadvantage = true;
            else if(enableProtectionOnSuccess) {
                let straightRoll = workflow.attackRoll.dice[0].results[0].result;
                let straightRollBonus = workflow.attackRoll.total - workflow.attackRoll.dice[0].total;
                if(workflow.attackRoll.formula.includes("kh")) {
                    const saveSetting = workflow.workflowOptions.noOnUseMacro;
                    workflow.workflowOptions.noOnUseMacro = true;
                    let reroll = await new Roll(`${straightRoll} + ${straightRollBonus}`).evaluate();
                    await workflow.setAttackRoll(reroll);
                    workflow.workflowOptions.noOnUseMacro = saveSetting;
    
                    if(target.actor.system.attributes.ac.value > reroll.total) content = `<span style='text-wrap: wrap;'>You use your Fighting Style - Protection to turn the advantage roll into a straight roll, and cause the target to miss ${target.actor.name}. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    else content = `<span style='text-wrap: wrap;'>You use your Fighting Style - Protection to turn the advantage roll into a straight roll, but the target still hits ${target.actor.name}. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
            
                    let actorPlayer = MidiQOL.playerForActor(validTokenPrimary.actor);
                    let chatData = {
                    user: actorPlayer.id,
                    speaker: ChatMessage.getSpeaker({ token: validTokenPrimary }),
                    content: content
                    };
                    ChatMessage.create(chatData);
                }
                else {
                    const saveSetting = workflow.workflowOptions.noOnUseMacro;
                    let rerollAddition = workflow.attackRoll.total - workflow.attackRoll.dice[0].total;
                    workflow.workflowOptions.noOnUseMacro = true;
                    let reroll = await new CONFIG.Dice.D20Roll(`1d20 + ${rerollAddition}`).evaluate();
                    if(reroll.total < workflow.attackTotal) await workflow.setAttackRoll(reroll);
                    await MidiQOL.displayDSNForRoll(reroll, 'damageRoll');
                    workflow.workflowOptions.noOnUseMacro = saveSetting;
            
                    let content;
            
                    if(target.actor.system.attributes.ac.value > reroll.total) content = `<span style='text-wrap: wrap;'>You use your Fighting Style - Protection and cause the target to miss ${target.actor.name}. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    else content = `<span style='text-wrap: wrap;'>You use your Fighting Style - Protection but the target still hits ${target.actor.name}. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
            
                    let actorPlayer = MidiQOL.playerForActor(validTokenPrimary.actor);
                    let chatData = {
                    user: actorPlayer.id,
                    speaker: ChatMessage.getSpeaker({ token: validTokenPrimary }),
                    content: content
                    };
                    ChatMessage.create(chatData);
                }
            }
        }
    }
}
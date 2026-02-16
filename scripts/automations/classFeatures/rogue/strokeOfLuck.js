export async function strokeOfLuck({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "preCheckHits") {
        if(workflow.targets.size !== 1 || item.system.uses.spent >= item.system.uses.max) return;
        if(workflow.attackTotal >= workflow.targets.first().actor.system.attributes.ac.value) return;

        let dialogId = "strokeofluck";
        let dialogTitlePrimary = `${token.actor.name} | ${item.name}`;
        let browserUser = game.gps.getBrowserUser({ actorUuid: actor.uuid });
        let gmUser = game.gps.getPrimaryGM();
        let initialTimeLeft = 30;

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Rogue.StrokeOfLuck.VeMissedAttack")}</p>
                                <div id="image-container" class="gps-dialog-image-container">
                                    <img id="img_${dialogId}" src="${item.img}" class="gps-dialog-image">
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
        
        let content = `<span style='text-wrap: wrap;'><img src="${token.actor.img}" style="width: 25px; height: auto;" /> ${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Rogue.StrokeOfLuck.ReactionAvailableSaveTrigger", { actorName: token.actor.name, itemName: macroItem.name })}</span>`
        let chatData = { user: gmUser, content: content, roll: false };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

        let result;

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle: dialogTitlePrimary, dialogContent, dialogId, initialTimeLeft, validTokenPrimaryUuid: token.document.uuid, source: "user", type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
            
            let gmDialogArgs = { dialogTitle: dialogTitleGM, dialogContent, dialogId, initialTimeLeft, validTokenPrimaryUuid: token.document.uuid, source: "gm", type: "multiDialog", notificationId: notificationMessage._id };
            
            result = await game.gps.socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
        } else {
            result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
        }
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result || {};

        if (!userDecision) {
            return;
        }
        else if (userDecision) {
            const saveSetting = workflow.workflowOptions.noOnUseMacro;
            workflow.workflowOptions.noOnUseMacro = true;
            let reroll = await new Roll(`50`).evaluate();
            await workflow.setAttackRoll(reroll);
            workflow.workflowOptions.noOnUseMacro = saveSetting;
            
            await item.update({"system.uses.spent":item.system.uses.spent + 1})
        }
    }

    if(args[0] === "off") {
        let effectData = Array.from(actor.allApplicableEffects()).find(e => e.name === item.name);
        await effectData.update({"disabled" : false});
        if(item.system.uses.spent >= item.system.uses.max) return;

        let msgHistory = [];
        game.messages.reduce((list, message) => {
            if (message.speaker.token === token.id) list.push(message.id);
            return list;
        }, msgHistory);
        let itemCard = msgHistory[msgHistory.length - 1];
        let chatMessage = await game.messages.get(itemCard);

        if(chatMessage?.rolls[0]?.dice[0]?.results[0]?.result === 20) return;

        let dialogId = "strokeofluck";
        let dialogTitlePrimary = `${token.actor.name} | ${item.name}`;
        let browserUser = game.gps.getBrowserUser({ actorUuid: actor.uuid });
        let gmUser = game.gps.getPrimaryGM();
        let initialTimeLeft = 30;

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Rogue.StrokeOfLuck.Prompt")}</p>
                                <div id="image-container" class="gps-dialog-image-container">
                                    <img id="img_${dialogId}" src="${item.img}" class="gps-dialog-image">
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

        let content = `<span style='text-wrap: wrap;'><img src="${token.actor.img}" style="width: 25px; height: auto;" /> ${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Rogue.StrokeOfLuck.ReactionAvailableSaveTrigger", { actorName: token.actor.name, itemName: macroItem.name })}</span>`
        let chatData = { user: gmUser, content: content, roll: false };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

        let result;

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle: dialogTitlePrimary, dialogContent, dialogId, initialTimeLeft, validTokenPrimaryUuid: token.document.uuid, source: "user", type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
            
            let gmDialogArgs = { dialogTitle: dialogTitleGM, dialogContent, dialogId, initialTimeLeft, validTokenPrimaryUuid: token.document.uuid, source: "gm", type: "multiDialog", notificationId: notificationMessage._id };
            
            result = await game.gps.socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
        } else {
            result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
        }
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result || {};

        if (!userDecision) {
            return;
        }
        else if (userDecision) {

            if(args[1]["expiry-reason"]?.includes("midi:special-duration:Check")) {
                let abilityType = chatMessage?.flags?.dnd5e.roll.abilityId;
                let abilityScore = actor.system.abilities[abilityType].mod;
                const newTotal = abilityScore + 20;
                let content = game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Rogue.StrokeOfLuck.ChangedAbilityCheck", { newTotal: newTotal })

                let actorPlayer = MidiQOL.playerForActor(actor);
                let chatData = {
                    user: actorPlayer.id,
                    speaker: ChatMessage.getSpeaker({ token: token }),
                    content: content,
                    whisper: actorPlayer.id
                };
                ChatMessage.create(chatData);

                
                await item.update({"system.uses.spent":item.system.uses.spent + 1})
            }

            else if(args[1]["expiry-reason"]?.includes("midi:special-duration:Skill")) {
                let abilityType = chatMessage?.flags?.dnd5e.roll.skillId;
                let abilityScore = actor.system.skills[abilityType].mod;
                const newTotal = abilityScore + 20;
                let content = game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Rogue.StrokeOfLuck.ChangedSkillCheck", { newTotal: newTotal })

                let actorPlayer = MidiQOL.playerForActor(actor);
                let chatData = {
                    user: actorPlayer.id,
                    speaker: ChatMessage.getSpeaker({ token: token }),
                    content: content,
                    whisper: actorPlayer.id
                };
                ChatMessage.create(chatData);

                await item.update({"system.uses.spent":item.system.uses.spent + 1})
            }
        }
    }
}
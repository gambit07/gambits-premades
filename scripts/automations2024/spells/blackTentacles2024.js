export async function blackTentacles2024({speaker, actor, character, item, args, scope, workflow, options, tokenUuid, regionUuid, regionScenario, regionStatus, userId}) {
    if(!game.combat) return ui.notifications.warn("Black Tentacles requires an active combat.");
    let gmUser = game.gps.getPrimaryGM();

    if (args?.[0]?.macroPass === "templatePlaced") {
        const template = await fromUuid(workflow.templateUuid);
        game.gps.animation.blackTentacles({template, itemUuid: workflow.item.uuid});
        return;
    }

    if(!tokenUuid || !regionUuid || !regionScenario) return;

    let region = await fromUuid(regionUuid);
    let tokenDocument = await fromUuid(tokenUuid);
    let token = tokenDocument?.object;

    if(game.user.id !== userId) return;
    
    if (!MidiQOL.isTargetable(token)) return;

    if ((token.actor.type !== 'npc' && token.actor.type !== 'character')) return;

    let chosenItem = await fromUuid(region.flags["region-attacher"].itemUuid);
    let itemProperName = chosenItem?.name;
    
    let dialogId = "blacktentacles";
    let dialogTitlePrimary = `${token.actor.name} | ${itemProperName}`;
    const hasEffectApplied = token.document.hasStatusEffect("restrained");
    const damagedThisTurn = await region.getFlag("gambits-premades", "checkBlackTentacleRound");
    if(damagedThisTurn && damagedThisTurn === `${token.id}_${game.combat.round}`) return;
    let browserUser = game.gps.getBrowserUser({ actorUuid: token.actor.uuid });

    let resumeMovement;

    if (hasEffectApplied && regionScenario === "tokenTurnEnd") {
        const dealDamage = await game.gps.gpsActivityUse({itemUuid: chosenItem.uuid, identifier: "syntheticDamage", targetUuid: token.document.uuid});
        if(!dealDamage) return;
    
        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <p class="gps-dialog-paragraph">Would you like to use your action to make an athletics ability check to escape Black Tentacles?</p>
                    </div>
                </div>
                <div class="gps-dialog-button-container">
                    <button id="pauseButton_${dialogId}" type="button" class="gps-dialog-button">
                        <i class="fas fa-pause" id="pauseIcon_${dialogId}" style="margin-right: 5px;"></i>Pause
                    </button>
                </div>
            </div>
        `;
        
        let result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft: 30,validTokenPrimaryUuid: token.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog"});
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result || {};

        if (!userDecision) {
            await game.gps.socket.executeAsUser("gmSetFlag", gmUser, { flagDocumentUuid: region.uuid, key: "checkBlackTentacleRound", value: `${token.id}_${game.combat.round}` });
            return;
        }
        else if (userDecision) {
            const skillCheck = await game.gps.gpsActivityUse({itemUuid: chosenItem.uuid, identifier: "syntheticCheck", targetUuid: token.document.uuid});
            if(!skillCheck) return;

            if (skillCheck.failedSaves.size === 0) {
                await game.gps.socket.executeAsUser("gmToggleStatus", gmUser, {tokenUuid: `${token.document.uuid}`, status: "restrained", active: false });
                let chatData = {
                user: browserUser.id,
                speaker: ChatMessage.getSpeaker({ token: token }),
                content: `You successfully escape from Black Tentacles!`
                };
                ChatMessage.create(chatData);
            }
            else {
                let chatData = {
                user: browserUser.id,
                speaker: ChatMessage.getSpeaker({ token: token }),
                content: `You are unable to escape Black Tentacles this turn.`
                };
                ChatMessage.create(chatData);
            }
        }
    
        await game.gps.socket.executeAsUser("gmSetFlag", gmUser, { flagDocumentUuid: region.uuid, key: "checkBlackTentacleRound", value: `${token.id}_${game.combat.round}` });
    }

    else if (!hasEffectApplied) {
        if(regionScenario === "tokenEnter") resumeMovement = await tokenDocument.pauseMovement();
        const saveResult = await game.gps.gpsActivityUse({itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: token.document.uuid});
        if(!saveResult) return;
        
        if (saveResult.failedSaves.size !== 0) {
            await game.gps.socket.executeAsUser("gmSetFlag", gmUser, { flagDocumentUuid: region.uuid, key: "checkBlackTentacleRound", value: `${token.id}_${game.combat.round}` });
            const hasEffectApplied = token.document.hasStatusEffect("restrained");

            if (!hasEffectApplied) {
                await game.gps.socket.executeAsUser("gmToggleStatus", gmUser, {tokenUuid: `${token.document.uuid}`, status: "restrained", active: true });
            }
            
            let dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <p class="gps-dialog-paragraph">Would you like to use your action to make an athletics ability check to escape Black Tentacles?</p>
                        </div>
                    </div>
                    <div class="gps-dialog-button-container">
                        <button id="pauseButton_${dialogId}" type="button" class="gps-dialog-button">
                            <i class="fas fa-pause" id="pauseIcon_${dialogId}" style="margin-right: 5px;"></i>Pause
                        </button>
                    </div>
                </div>
            `;
            
            let result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft: 30,validTokenPrimaryUuid: token.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog"});
                    
            const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result || {};
    
            if (!userDecision) {
                if(regionScenario === "tokenEnter") await game.gps.stopMovementEnter({token: tokenDocument});
                return;
            }
            else if (userDecision) {
                const skillCheck = await game.gps.gpsActivityUse({itemUuid: chosenItem.uuid, identifier: "syntheticCheck", targetUuid: token.document.uuid});
                if(!skillCheck && regionScenario === "tokenEnter") {
                    return await game.gps.stopMovementEnter({token: tokenDocument});
                }
                else if(!skillCheck) return;

                if (skillCheck.failedSaves.size === 0) {
                    await game.gps.socket.executeAsUser("gmToggleStatus", gmUser, {tokenUuid: `${token.document.uuid}`, status: "restrained", active: false });
                    let chatData = {
                    user: browserUser.id,
                    speaker: ChatMessage.getSpeaker({ token: token }),
                    content: `<span style='text-wrap: wrap;'>You successfully escape from Black Tentacles!</span>`
                    };
                    ChatMessage.create(chatData);
                    await resumeMovement();
                }
                else {
                    let chatData = {
                    user: browserUser.id,
                    speaker: ChatMessage.getSpeaker({ token: token }),
                    content: `<span style='text-wrap: wrap;'>You are unable to escape Black Tentacles this turn.</span>`
                    };
                    ChatMessage.create(chatData);

                    await game.gps.stopMovementEnter({token: tokenDocument});
                }
            }
        }
        else {
            if(regionScenario === "tokenEnter") await resumeMovement();
        }
        
        if(saveResult) {
            await game.gps.socket.executeAsUser("gmSetFlag", gmUser, { flagDocumentUuid: region.uuid, key: "checkBlackTentacleRound", value: `${token.id}_${game.combat.round}` });
        }
    }
}
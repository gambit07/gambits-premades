export async function blackTentacles({speaker, actor, character, item, args, scope, workflow, options, tokenUuid, regionUuid, regionScenario, originX, originY, regionStatus}) {
    if(!game.combat) return ui.notifications.warn("Black Tentacles requires an active combat.");
    let gmUser = game.gps.getPrimaryGM();

    if (args?.[0]?.macroPass === "templatePlaced") {
        let cprConfig = game.gps.getCprConfig({itemUuid: workflow.item.uuid});
        const { animEnabled } = cprConfig;
        if(animEnabled) {
            const template = await fromUuid(workflow.templateUuid);
        
            new Sequence()
                .effect()
                    .file("jb2a.darkness.black") //assets/animations/animated_spells/black_tentacles_border.webm
                    .stretchTo(template)
                    .attachTo(template)
                    .delay(500)
                    .scaleIn(0, 500, {ease: "easeOutCubic"})
                    .fadeIn(500)
                    .fadeOut(500)
                    .filter("ColorMatrix", { brightness:0 })
                    .belowTokens()
                    .persist()

                .effect()
                    .file("jaamod.spells_effects.tentacles_black") //assets/animations/animated_spells/black_tentacles_border.webm
                    .stretchTo(template)
                    .attachTo(template)
                    .delay(500)
                    .scaleIn(0, 500, {ease: "easeOutCubic"})
                    .fadeIn(500)
                    .fadeOut(500)
                    .opacity(0.8)
                    .persist()
            .play()
        }
        
        return;
    }

    if(!tokenUuid || !regionUuid || !regionScenario) return;

    let region = await fromUuid(regionUuid);
    let tokenDocument = await fromUuid(tokenUuid);
    let token = tokenDocument?.object;
    
    if (!MidiQOL.isTargetable(token)) return;

    if ((token.actor.type !== 'npc' && token.actor.type !== 'character')) return;

    if(regionScenario === "tokenExit") {
        const isRestrained = await token.actor.appliedEffects.find(e => e.name === "Restrained");
        if (isRestrained) await isRestrained.delete();
    }

    let validatedRegionMovement = game.gps.validateRegionMovement({ regionScenario: regionScenario, regionStatus: regionStatus, regionUuid: regionUuid, tokenUuid: tokenUuid, validExit: false });
    const { validRegionMovement, validReroute } = validatedRegionMovement;
    if(!validRegionMovement) return;

    let chosenItem = await fromUuid(region.flags["region-attacher"].itemUuid);
    let itemProperName = chosenItem?.name;
    
    let dialogId = "blacktentacles";
    let dialogTitlePrimary = `${token.actor.name} | ${itemProperName}`;
    let browserUser = game.gps.getBrowserUser({ actorUuid: token.actor.uuid });
    const hasEffectApplied = token.document.hasStatusEffect("restrained");
    const damagedThisTurn = await region.getFlag("gambits-premades", "checkBlackTentacleRound");
    if(damagedThisTurn && damagedThisTurn === `${token.id}_${game.combat.round}`) return;

    if (hasEffectApplied && regionScenario === "tokenTurnStart") {
        const dealDamage = await game.gps.gpsActivityUse({itemUuid: chosenItem.uuid, identifier: "syntheticDamage", targetUuid: token.document.uuid});
        if(!dealDamage) return;
    
        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <p class="gps-dialog-paragraph">Would you like to use your action to make an ability check to escape Black Tentacles?</p>
                        <div>
                            <div class="gps-dialog-flex">
                                <table style="background-color: rgba(181, 99, 69, 0.2);" width="100%"><tbody><tr><th>Strength</th><th>Dexterity</th></tr><tr><td style="text-align: center;vertical-align: middle;"><input type="radio" value="str" id="strength" name="ability-check" style="margin: 0 auto;"></td><td style="text-align: center;vertical-align: middle;"><input type="radio" value="dex" id="dexterity" name="ability-check" style="margin: 0 auto;"></td></tr></tbody></table>
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
        
        let result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft: 30,validTokenPrimaryUuid: token.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog"});
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result;

        if (!userDecision) {
            await region.setFlag("gambits-premades", "checkBlackTentacleRound", `${token.id}_${game.combat.round}`);
            return;
        }
        else if (userDecision) {
            if (abilityCheck) {
                let activity = chosenItem.system.activities.find(a => a.identifier === "syntheticCheck");
                await game.gps.socket.executeAsUser("gpsActivityUpdate", gmUser, { activityUuid: activity.uuid, updates: {"check.ability": abilityCheck} });
                
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
        }
    
        await region.setFlag("gambits-premades", "checkBlackTentacleRound", `${token.id}_${game.combat.round}`);
    }

    else if (!hasEffectApplied) {
        const saveResult = await game.gps.gpsActivityUse({itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: token.document.uuid});
        if(!saveResult) return;
        
        if (saveResult.failedSaves.size !== 0) {
            const hasEffectApplied = token.document.hasStatusEffect("restrained");

            if (!hasEffectApplied) {
                await game.gps.socket.executeAsUser("gmToggleStatus", gmUser, {tokenUuid: `${token.document.uuid}`, status: "restrained", active: true });
            }
            
            let dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <p class="gps-dialog-paragraph">Would you like to use your action to make an ability check to escape Black Tentacles?</p>
                            <div>
                                <div class="gps-dialog-flex">
                                    <table style="background-color: rgba(181, 99, 69, 0.2);" width="100%"><tbody><tr><th>Strength</th><th>Dexterity</th></tr><tr><td style="text-align: center;vertical-align: middle;"><input type="radio" value="str" id="strength" name="ability-check" style="margin: 0 auto;"></td><td style="text-align: center;vertical-align: middle;"><input type="radio" value="dex" id="dexterity" name="ability-check" style="margin: 0 auto;"></td></tr></tbody></table>
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
            
            let result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft: 30,validTokenPrimaryUuid: token.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog"});
                    
            const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result;
    
            if (!userDecision) {
                if(validReroute) {
                    game.gps.validateRegionMovement({ regionScenario: "tokenForcedMovement", regionStatus: regionStatus, regionUuid: regionUuid, tokenUuid: tokenUuid });
    
                    if(originX && originY) await token.document.update({ x: originX, y: originY }, { teleport: true });
                }

                return;
            }
            else if (userDecision) {
                if (abilityCheck) {
                    let activity = chosenItem.system.activities.find(a => a.identifier === "syntheticCheck");
                    await game.gps.socket.executeAsUser("gpsActivityUpdate", gmUser, { activityUuid: activity.uuid, updates: {"check.ability": abilityCheck} });
                    const skillCheck = await game.gps.gpsActivityUse({itemUuid: chosenItem.uuid, identifier: "syntheticCheck", targetUuid: token.document.uuid});
                    if(!skillCheck) return;

                    if (skillCheck.failedSaves.size === 0) {
                        await game.gps.socket.executeAsUser("gmToggleStatus", gmUser, {tokenUuid: `${token.document.uuid}`, status: "restrained", active: false });
                        let chatData = {
                        user: browserUser.id,
                        speaker: ChatMessage.getSpeaker({ token: token }),
                        content: `<span style='text-wrap: wrap;'>You successfully escape from Black Tentacles!</span>`
                        };
                        ChatMessage.create(chatData);
                    }
                    else {
                        if(validReroute) {
                            game.gps.validateRegionMovement({ regionScenario: "tokenForcedMovement", regionStatus: regionStatus, regionUuid: regionUuid, tokenUuid: tokenUuid });
            
                            if(originX && originY) await token.document.update({ x: originX, y: originY }, { teleport: true });
                        }
                        let chatData = {
                        user: browserUser.id,
                        speaker: ChatMessage.getSpeaker({ token: token }),
                        content: `<span style='text-wrap: wrap;'>You are unable to escape Black Tentacles this turn.</span>`
                        };
                        ChatMessage.create(chatData);
                    }
                }
            }
        }
        
        if(saveResult) {
            await region.setFlag("gambits-premades", "checkBlackTentacleRound", `${token.id}_${game.combat.round}`);
        }
    }
}
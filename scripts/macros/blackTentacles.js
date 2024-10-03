export async function blackTentacles({tokenUuid, regionUuid, regionScenario, originX, originY, regionStatus}) {
    if(!game.combat) return ui.notifications.warn("Black Tentacles requires an active combat.")
    const module = await import('../module.js');
    const socket = module.socket;
    const helpers = await import('../helpers.js');
    let gmUser = helpers.getPrimaryGM();

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

    let validatedRegionMovement = helpers.validateRegionMovement({ regionScenario: regionScenario, regionStatus: regionStatus, regionUuid: regionUuid, tokenUuid: tokenUuid, validExit: false });
    const { validRegionMovement, validReroute } = validatedRegionMovement;
    if(!validRegionMovement) return;

    let chosenItem = await fromUuid(region.flags["region-attacher"].itemUuid);
    let itemProperName = chosenItem?.name;
    
    let dialogId = "blacktentacles";
    let dialogTitlePrimary = `${token.actor.name} | ${itemProperName}`;
    let browserUser = helpers.getBrowserUser({ actorUuid: token.actor.uuid });

    const effectOriginActor = await fromUuid(region.flags["region-attacher"].actorUuid);

    const damageType = "bludgeoning";
    const spellDC = effectOriginActor.system.attributes.spelldc;
    let saveAbility = "dex";
    const hasEffectApplied = token.document.hasStatusEffect("restrained");
    const damagedThisTurn = await region.getFlag("gambits-premades", "checkBlackTentacleRound");
    if(damagedThisTurn && damagedThisTurn === `${token.id}_${game.combat.round}`) return;

    if (hasEffectApplied && regionScenario === "tokenTurnStart") {
        const itemData = {
            name: `${itemProperName} - Turn Damage`,
            type: "feat",
            img: chosenItem.img,
            effects: [],
            flags: {
                "midi-qol": {
                    noProvokeReaction: true,
                    onUseMacroName: null,
                    forceCEOff: true
                    },
                "midiProperties": {
                    magicdam: true,
                    magiceffect: true
                },
                "autoanimations": {
                    killAnim: true
                }
            },
            system: {
                equipped: true,
                actionType: "damage",
                damage: { parts: [[`3d6`, damageType]] },
                components: { concentration: false, material: false, ritual: false, somatic: false, value: "", vocal: false },
                duration: { units: "inst", value: undefined }
            }
        };
        const itemUpdate = new CONFIG.Item.documentClass(itemData, {parent: effectOriginActor});
        const options = { showFullCard: false, createWorkflow: true, versatile: false, configureDialog: false, targetUuids: [token.document.uuid], workflowOptions: {autoRollDamage: 'always', autoFastDamage: true} };
        const dealDamage = await MidiQOL.completeItemUse(itemUpdate, {}, options);
        
        if(dealDamage) {
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
            
            let result = await socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft: 30,validTokenPrimaryUuid: token.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog"});
                    
            const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result;
    
            if (!userDecision) {
                await region.setFlag("gambits-premades", "checkBlackTentacleRound", `${token.id}_${game.combat.round}`);
                return;
            }
            else if (userDecision) {
                if (abilityCheck) {
                    const skillCheck = await token.actor.rollAbilityTest(abilityCheck);
                    if (skillCheck.total >= spellDC) {
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
    }

    else if (!hasEffectApplied) {
        const itemData = {
            name: itemProperName,
            type: "feat",
            img: "icons/creatures/tentacles/tentacles-octopus-black-pink.webp",
            effects: [],
            flags: {
                "midi-qol": {
                  noProvokeReaction: true,
                  onUseMacroName: null,
                          forceCEOff: true
                },
                "midiProperties": {
                    saveDamage: "nodam",
                    magicdam: true,
                    magiceffect: true
                },
            },
            system: {
                equipped: true,
                actionType: "save",
                save: { dc: spellDC, ability: saveAbility, scaling: "flat" },
                damage: { parts: [[`3d6`, damageType]] },
                components: { concentration: false, material: false, ritual: false, somatic: false, value: "", vocal: false },
                duration: { units: "inst", value: undefined }
            },
        };
        const itemUpdate = new CONFIG.Item.documentClass(itemData, {parent: effectOriginActor});
        const options = { showFullCard: false, createWorkflow: true, versatile: false, configureDialog: false, targetUuids: [token.document.uuid], workflowOptions: {autoRollDamage: 'always', autoFastDamage: true} };
        const saveResult = await MidiQOL.completeItemUse(itemUpdate, {}, options);
        
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
            
            let result = await socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft: 30,validTokenPrimaryUuid: token.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog"});
                    
            const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result;
    
            if (!userDecision) {
                if(validReroute) {
                    helpers.validateRegionMovement({ regionScenario: "tokenForcedMovement", regionStatus: regionStatus, regionUuid: regionUuid, tokenUuid: tokenUuid });
    
                    if(originX && originY) await token.document.update({ x: originX, y: originY }, { animate: false });
                }

                return;
            }
            else if (userDecision) {
                if (abilityCheck) {
                    const skillCheck = await token.actor.rollAbilityTest(abilityCheck);
                    if (skillCheck.total >= spellDC) {
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
                            helpers.validateRegionMovement({ regionScenario: "tokenForcedMovement", regionStatus: regionStatus, regionUuid: regionUuid, tokenUuid: tokenUuid });
            
                            if(originX && originY) await token.document.update({ x: originX, y: originY }, { animate: false });
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
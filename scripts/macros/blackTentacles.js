const regionTokenStates = new Map();

export async function blackTentacles({tokenUuid, regionUuid, regionScenario, originX, originY}) {
    const module = await import('../module.js');
    const helpers = await import('../helpers.js');
    const socket = module.socket;
    let region = await fromUuid(regionUuid);
    let tokenDocument = await fromUuid(tokenUuid);
    let token = tokenDocument.object;
    if(!token || !region || !regionScenario) return;
    if (!MidiQOL.isTargetable(token)) return;

    if ((token.actor.type !== 'npc' && token.actor.type !== 'character')) return;

    const effectOriginActor = await fromUuid(region.flags["region-attacher"].actorUuid);

    let itemProperName = "Black Tentacles";
    let chosenItem = effectOriginActor.items.find(i => i.name === itemProperName);
    let dialogId = "blacktentacles";
    let dialogTitlePrimary = `${token.actor.name} | ${itemProperName}`;
    let browserUser = MidiQOL.playerForActor(token.actor);
    if (!browserUser.active) {
        browserUser = game.users?.activeGM;
    }

    if(regionScenario === "onExit") {
        const tokenState = regionTokenStates.get(region.id);
        if (tokenState) {
            tokenState.delete(token.id);
            regionTokenStates.set(region.id, tokenState);
        }
        regionTokenStates.set(`${region.id}-${token.id}-exited`, true);

        const isRestrained = await token.actor.appliedEffects(e => e.name === "Restrained");
        if (isRestrained) await isRestrained.delete();
        return;
    }
    else if(regionScenario === "onEnter") {
        const tokenState = regionTokenStates.get(region.id) || new Set();
        tokenState.add(token.id);
        regionTokenStates.set(region.id, tokenState);
        regionTokenStates.set(`${region.id}-${token.id}-entered`, true);
    }
    else if(regionScenario === "onPostMove") {
        if (token?.regions?.has(region)) return;
        const entered = regionTokenStates.get(`${region.id}-${token.id}-entered`);
        const exited = regionTokenStates.get(`${region.id}-${token.id}-exited`);
    
        if (entered || exited) {
            // This move is part of an enter or exit event, do not trigger the move logic
            regionTokenStates.delete(`${region.id}-${token.id}-entered`);
            regionTokenStates.delete(`${region.id}-${token.id}-exited`);
            return;
        }
    }

    const damageType = "bludgeoning";
    const spellDC = effectOriginActor.system.attributes.spelldc;
    let saveAbility = "dex";
    const hasEffectApplied = await token.actor.appliedEffects.find(e => e.name === 'Restrained');
    const damagedThisTurn = await region.getFlag("gambits-premades", "checkBlackTentacleRound");
    if(damagedThisTurn && damagedThisTurn === `${token.id}_${game.combat.round}`) return;

    if (hasEffectApplied) {
        const itemData = {
            name: "BT Damage",
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
        
        if(dealDamage){
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
            
            let result = await socket.executeAsUser("process3rdPartyReactionDialog", browserUser.id, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft: 30,validTokenPrimaryUuid: token.document.uuid,source:browserUser.isGM ? "gm" : "user",type:"singleDialog"});
                    
            const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result;
    
            if (!userDecision) {
                return;
            }
            else if (userDecision) {
                if (abilityCheck) {
                    const skillCheck = await token.actor.rollAbilityTest(abilityCheck);
                    if (skillCheck.total >= spellDC) {
                        await hasEffectApplied.delete();
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
            name: "BT Damage",
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
                    nodam: true,
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
        
        if (saveResult.failedSaves.size === 1) {
            let effectData = [{
                disabled: false,
                name: "Restrained",
                duration: {
                seconds: 60
                },
                transfer: false,
                icon: "modules/dfreds-convenient-effects/images/restrained.svg",
                origin: effectOriginActor.uuid,
                changes: [
                {
                    key: 'flags.midi-qol.disadvantage.ability.save.dex',
                    mode: 0,
                    priority: null,
                    value: 1
                },
                {
                    key: 'flags.midi-qol.disadvantage.attack.all',
                    mode: 0,
                    priority: null,
                    value: 1
                },
                {
                    key: 'flags.midi-qol.grants.advantage.attack.all',
                    mode: 0,
                    priority: null,
                    value: 1
                },
                {
                    key: 'system.attributes.movement.all',
                    mode: 0,
                    priority: 25,
                    value: "0"
                }]
            }];
            await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: token.actor.uuid, effects: effectData });
            
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
            
            let result = await socket.executeAsUser("process3rdPartyReactionDialog", browserUser.id, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft: 30,validTokenPrimaryUuid: token.document.uuid,source:browserUser.isGM ? "gm" : "user",type:"singleDialog"});
                    
            const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result;
    
            if (!userDecision) {
                if(originX && originY) await token.document.update({ x: originX, y: originY }, { animate: false });
                return;
            }
            else if (userDecision) {
                if (abilityCheck) {
                    const skillCheck = await token.actor.rollAbilityTest(abilityCheck);
                    if (skillCheck.total >= spellDC) {
                        await hasEffectApplied.delete();
                        let chatData = {
                        user: browserUser.id,
                        speaker: ChatMessage.getSpeaker({ token: token }),
                        content: `You successfully escape from Black Tentacles!`
                        };
                        ChatMessage.create(chatData);
                    }
                    else {
                        if(originX && originY) await token.document.update({ x: originX, y: originY }, { animate: false });
                        let chatData = {
                        user: browserUser.id,
                        speaker: ChatMessage.getSpeaker({ token: token }),
                        content: `You are unable to escape Black Tentacles this turn.`
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
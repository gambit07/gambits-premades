export async function web({tokenUuid, regionUuid, regionScenario, originX, originY, regionStatus}) {
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
    
    let dialogId = "web";
    let dialogTitlePrimary = `${token.actor.name} | ${itemProperName}`;
    let browserUser = helpers.getBrowserUser({ actorUuid: token.actor.uuid });

    const effectOriginActor = await fromUuid(region.flags["region-attacher"].actorUuid);

    const spellDC = effectOriginActor.system.attributes.spelldc;
    let saveAbility = "dex";
    const hasEffectApplied = token.document.hasStatusEffect("restrained");
    const damagedThisTurn = await region.getFlag("gambits-premades", "checkWebRound");
    if(damagedThisTurn && damagedThisTurn === `${token.id}_${game.combat.round}`) return;

    if (hasEffectApplied && regionScenario === "tokenTurnStart") {
        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">Would you like to use your action to make an athletics skill check to escape the ${chosenItem.name}?</p>
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
            await region.setFlag("gambits-premades", "checkWebRound", `${token.id}_${game.combat.round}`);
            return;
        }
        else if (userDecision) {
            const skillCheck = await token.actor.rollSkill("ath");
            if (skillCheck.total >= spellDC) {
                await game.gps.socket.executeAsUser("gmToggleStatus", gmUser, {tokenUuid: `${token.document.uuid}`, status: "restrained", active: false });
                let chatData = {
                    user: browserUser.id,
                    speaker: ChatMessage.getSpeaker({ token: token }),
                    content: `<span style='text-wrap: wrap;'>You successfully escape from the ${chosenItem.name}!</span>`
                };
                ChatMessage.create(chatData);
            }
            else {
                let chatData = {
                    user: browserUser.id,
                    speaker: ChatMessage.getSpeaker({ token: token }),
                    content: `<span style='text-wrap: wrap;'>You are unable to escape the ${chosenItem.name} this turn.</span>`
                };
                ChatMessage.create(chatData);
            }
        }
    
        await region.setFlag("gambits-premades", "checkWebRound", `${token.id}_${game.combat.round}`);
    }

    else if (!hasEffectApplied) {
        const itemData = {
            name: chosenItem.name,
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
                    magiceffect: true
                },
                "autoanimations": {
                    killAnim: true
                }
            },
            system: {
                equipped: true,
                actionType: "save",
                save: { dc: spellDC, ability: saveAbility, scaling: "flat" },
                components: { concentration: false, material: false, ritual: false, somatic: false, value: "", vocal: false },
                duration: { units: "inst", value: undefined }
            },
        };
        const itemUpdate = new CONFIG.Item.documentClass(itemData, {parent: effectOriginActor});
        const options = { showFullCard: false, createWorkflow: true, versatile: false, configureDialog: false, targetUuids: [token.document.uuid] };
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
                            <div>
                                <div class="gps-dialog-flex">
                                    <p class="gps-dialog-paragraph">Would you like to use your action to make an athletics skill check to escape the ${chosenItem.name}?</p>
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
    
                    if(originX && originY) await token.document.update({ x: originX, y: originY }, { teleport: true });
                }

                return;
            }
            else if (userDecision) {
                const skillCheck = await token.actor.rollSkill("ath");
                if (skillCheck.total >= spellDC) {
                    await game.gps.socket.executeAsUser("gmToggleStatus", gmUser, {tokenUuid: `${token.document.uuid}`, status: "restrained", active: false });
                        let chatData = {
                        user: browserUser.id,
                        speaker: ChatMessage.getSpeaker({ token: token }),
                        content: `<span style='text-wrap: wrap;'>You successfully escape from the ${chosenItem.name}!</span>`
                    };
                    ChatMessage.create(chatData);
                }
                else {
                    if(validReroute) {
                        helpers.validateRegionMovement({ regionScenario: "tokenForcedMovement", regionStatus: regionStatus, regionUuid: regionUuid, tokenUuid: tokenUuid });
        
                        if(originX && originY) await token.document.update({ x: originX, y: originY }, { teleport: true });
                    }
                    let chatData = {
                        user: browserUser.id,
                        speaker: ChatMessage.getSpeaker({ token: token }),
                        content: `<span style='text-wrap: wrap;'>You are unable to escape the ${chosenItem.name} this turn.</span>`
                    };
                    ChatMessage.create(chatData);
                }
            }
        }
        
        if(saveResult) {
            await region.setFlag("gambits-premades", "checkWebRound", `${token.id}_${game.combat.round}`);
        }
    }
}
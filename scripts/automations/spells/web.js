export async function web({tokenUuid, regionUuid, regionScenario, originX, originY, regionStatus, speaker, actor, character, item, args, scope, workflow, options}) {
    if(args[0].macroPass === "templatePlaced") {
        let cprConfig = game.gps.getCprConfig({itemUuid: item.uuid});
        const { animEnabled } = cprConfig;
        if(animEnabled) {
            const template = await fromUuid(workflow.templateUuid);
            let alignmentDecision;
            (MidiQOL.safeGetGameSetting('dnd5e', 'gridAlignedSquareTemplates') === true) ? alignmentDecision = "center" : alignmentDecision = "right";
    
            let position = template;
    
            new Sequence()
    
            .effect()
            .atLocation(token)
            .file(`jb2a.magic_signs.circle.02.conjuration.loop.yellow`)
            .scaleToObject(1.25)
            .rotateIn(180, 600, {ease: "easeOutCubic"})
            .scaleIn(0, 600, {ease: "easeOutCubic"})
            .loopProperty("sprite", "rotation", { from: 0, to: -360, duration: 10000})
            .belowTokens()
            .fadeOut(2000)
            .zIndex(0)
    
            .effect()
            .atLocation(token)
            .file(`jb2a.magic_signs.circle.02.conjuration.complete.dark_yellow`)
            .scaleToObject(1.25)
            .rotateIn(180, 600, {ease: "easeOutCubic"})
            .scaleIn(0, 600, {ease: "easeOutCubic"})
            .loopProperty("sprite", "rotation", { from: 0, to: -360, duration: 10000})
            .belowTokens(true)
            .filter("ColorMatrix", {saturate:-1, brightness:2})
            .filter("Blur", { blurX: 5, blurY: 10 })
            .zIndex(1)
            .duration(1200)
            .fadeIn(200, {ease: "easeOutCirc", delay: 500})
            .fadeOut(300, {ease: "linear"})
    
            .effect()
            .attachTo(position, { align: alignmentDecision })
            .file(`jb2a.magic_signs.circle.02.conjuration.complete.dark_yellow`)
            .size(4.2, {gridUnits: true})
            .fadeIn(600)
            .opacity(1)
            .rotateIn(180, 600, {ease: "easeOutCubic"})
            .scaleIn(0, 600, {ease: "easeOutCubic"})
            .belowTokens()
    
            .effect()
            .file("jb2a.particles.outward.white.01.02")
            .scaleIn(0, 500, {ease: "easeOutQuint"})
            .delay(500)
            .fadeOut(1000)
            .atLocation(token)
            .duration(1000)
            .size(1.75, {gridUnits: true})
            .animateProperty("spriteContainer", "position.y", {  from:0 , to: -0.5, gridUnits:true, duration: 1000})
            .zIndex(1)
            .waitUntilFinished(-500)
    
            .effect()
            .file("jb2a.markers.light_orb.loop.white")
            .attachTo(position, { align: alignmentDecision })
            .scaleIn(0, 1500, {ease: "easeOutCubic"})
            .fadeIn(500)
            .duration(2500)
            .belowTokens()
            .zIndex(2)
            .size(2, {gridUnits: true})
    
            .effect()
            .file("jb2a.shield_themed.above.eldritch_web.01.dark_green")
            .attachTo(position, { align: alignmentDecision })
            .scaleIn(0, 1500, {ease: "easeOutCubic"})
            .fadeIn(500)
            .duration(2500)
            .belowTokens()
            .zIndex(2.1)
            .size(0.9, {gridUnits: true})
            .opacity(0.5)
            .filter("ColorMatrix", { brightness:0 })
    
            .effect()
            .file("jb2a.shield_themed.below.eldritch_web.01.dark_green")
            .attachTo(position, { align: alignmentDecision })
            .scaleIn(0, 1500, {ease: "easeOutCubic"})
            .scaleOut(0, 1500, {ease: "linear"})
            .fadeIn(500)
            .duration(2500)
            .belowTokens()
            .zIndex(1.9)
            .size(0.9, {gridUnits: true})
            .filter("ColorMatrix", { brightness:0 })
            .opacity(0.5)
            .waitUntilFinished(-200)
    
            .effect()
            .file("jb2a.impact.004.yellow")
            .attachTo(position, { align: alignmentDecision })
            .size(6, {gridUnits: true})
            .scaleIn(0, 200, {ease: "easeOutCubic"})
            .filter("ColorMatrix", { saturate: -1 })
    
            .effect()
            .file('jb2a.web.01')
            .attachTo(position, { align: alignmentDecision })
            .tieToDocuments(position)
            .belowTokens()
            .fadeIn(1500)
            .zIndex(1)
            .fadeOut(1500)
            .scaleIn(0, 500, {ease: "easeOutCubic"})
            .size(4.3, {gridUnits: true})
            .persist() 
    
            .effect()
            .file('jb2a.web.01')
            .attachTo(position, { align: alignmentDecision })
            .tieToDocuments(position)
            .opacity(0.3)
            .fadeIn(1500)
            .zIndex(1)
            .fadeOut(1500)
            .scaleIn(0, 500, {ease: "easeOutCubic"})
            .size(4.3, {gridUnits: true})
            .persist() 
    
            .play();
        }
    }

    let gmUser = game.gps.getPrimaryGM();

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
    
    let dialogId = "web";
    let dialogTitlePrimary = `${token.actor.name} | ${itemProperName}`;
    let browserUser = game.gps.getBrowserUser({ actorUuid: token.actor.uuid });

    const effectOriginActor = await fromUuid(region.flags["region-attacher"].actorUuid);

    const spellDC = chosenItem.system.save.dc ? chosenItem.system.save.dc : effectOriginActor.system.attributes.spelldc;
    let saveAbility = chosenItem.system.save.ability ? chosenItem.system.save.ability : "dex";
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
        
        let result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft: 30,validTokenPrimaryUuid: token.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog"});
                
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
                                    <p class="gps-dialog-paragraph">Would you like to use your action to make an strength ability check to escape the ${chosenItem.name}?</p>
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
                const skillCheck = await token.actor.rollAbilityTest("str");
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
                        game.gps.validateRegionMovement({ regionScenario: "tokenForcedMovement", regionStatus: regionStatus, regionUuid: regionUuid, tokenUuid: tokenUuid });
        
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
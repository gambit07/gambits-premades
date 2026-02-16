export async function drawingTheHearth({ speaker, actor, token, character, item, args, scope, workflow, options, macroItem }) {
    if(args[0].macroPass === "postActiveEffects") {
        if(macroItem.system.uses.spent >= macroItem.system.uses.max) return workflow.aborted = true;

        let cprConfig = game.gps.getCprConfig({itemUuid: macroItem.uuid});
        const { animEnabled } = cprConfig;
        
        let effectData = actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "2300dad6-8de1-4fa5-9878-40cec8ee37aa");
        if(animEnabled) {
            new Sequence()
            .effect()
                .attachTo(token)
                .tieToDocuments(effectData)
                .file("jb2a.bonfire.02.green")
                .fadeIn(500)
                .fadeOut(500)
                .scaleToObject(2.7)
                .spriteOffset({ x: 0, y: 7 })
                .persist()
                .belowTokens()
                .name(`DrawingTheHearth_${token.actor.id}_bg`)
            .play();
        }
        
        let numMotes = macroItem.system.uses.max;
        if(animEnabled) {
            const offsets = [
                { x: -80, y: -55 },
                { x: -80, y: 55 },
                { x: 80, y: -55 },
                { x: 80, y: 55 }
            ];

            for (let i = 0; i < numMotes; i++) {
                let offset = offsets[i % offsets.length];
                    new Sequence()
                        .effect()
                            .attachTo(token)
                            .tieToDocuments(effectData)
                            .file("animated-spell-effects-cartoon.fire.ball.05")
                            .fadeIn(500)
                            .fadeOut(500)
                            .scaleToObject(0.4)
                            .spriteOffset({ x: offset.x, y: offset.y })
                            .filter("ColorMatrix", { hue: 60 })
                            .persist()
                            .name(`DrawingTheHearth_${token.actor.id}_${i}`)
                            .loopProperty("spriteContainer", "rotation", { from: 0, to: 360, duration: 10000, delay: 500 })
                            .loopProperty("sprite", "rotation", { from: 0, to: -360, duration: 10000, ease: "linear" })
                        .play();
            }
        }
    }

    if(args[0].macroPass === "isAttacked") {
        let itemUses = macroItem.system.uses.spent;
        let itemUsesRemaining = macroItem.system.uses.max - itemUses;
        let target = workflow.token;
        const saveCheck = await target.actor.rollAbilitySave(actor.system.attributes.spellcasting);
        if (saveCheck.total < actor.system.attributes.spelldc) {
            let attackTotal = workflow.attackTotal;
            let spiritAC = 10 + actor.system.attributes.prof;
            let cprConfig = game.gps.getCprConfig({itemUuid: macroItem.uuid});
            const { animEnabled } = cprConfig;
            
            if(attackTotal >= spiritAC) {
                if(animEnabled) {
                    let highestIndex = -1;

                    for (let i = 0; i < itemUsesRemaining; i++) {
                        const effects = Sequencer.EffectManager.getEffects({name: `DrawingTheHearth_${actor.id}_${i}`, source: token});
                        if (effects.length > 0) {
                            highestIndex = i;
                        }
                    }

                    if (highestIndex !== -1) {
                        Sequencer.EffectManager.endEffects({name: `DrawingTheHearth_${actor.id}_${highestIndex}`, source: token});
                    }
                }

                await macroItem.update({"system.uses.spent" : itemUses + 1})
                
                let content = game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ThirdPartyClassFeatures.Witch.CovenOfTheRoilingHearth.SootSpiritAttackedHit", { sootSpiritsRemaining: itemUsesRemaining - 1 })
                let actorPlayer = MidiQOL.playerForActor(actor);
                let chatData = {
                    user: actorPlayer.id,
                    speaker: ChatMessage.getSpeaker({ token: token }),
                    content: content
                };
                ChatMessage.create(chatData);
                workflow.aborted = true;

                if((itemUsesRemaining - 1) === 0) {
                    let effectData = actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "2300dad6-8de1-4fa5-9878-40cec8ee37aa");
                    if(effectData) {
                        await effectData.delete();
                    }
                }
            }
            else {
                let content = game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ThirdPartyClassFeatures.Witch.CovenOfTheRoilingHearth.SootSpiritAttackedMiss", { sootSpiritsRemaining: itemUsesRemaining })
                let actorPlayer = MidiQOL.playerForActor(actor);
                let chatData = {
                    user: actorPlayer.id,
                    speaker: ChatMessage.getSpeaker({ token: token }),
                    content: content
                };
                ChatMessage.create(chatData);
                workflow.aborted = true;            
            }
        }
    }
}
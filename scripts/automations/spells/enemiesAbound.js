export async function enemiesAbound({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(!game.modules.get("jaamod")?.active) return ui.notifications.error(game.i18n.localize("GAMBITSPREMADES.Notifications.ClassFeatures.Fighter.ArcaneArcher.GraspingArrow.MissingDependency"));
    if(args[0].macroPass === "postActiveEffects") {
        const targets = workflow.targets;
        for(let target of targets) {
            const immunity = target.actor.system.traits?.ci?.value?.has("frightened");

            if (immunity) {
                ui.notifications.notify(game.i18n.format("GAMBITSPREMADES.Notifications.Spells.EnemiesAbound.TargetImmuneCannotBeFrightened", { name: target.actor.name }));
                
                const hasConcApplied = await MidiQOL.getConcentrationEffect(actor, item.uuid)
                
                if (hasConcApplied) {
                    await hasConcApplied.delete();
                }
                
                return;
            }

            await MidiQOL.socket().executeAsGM('_gmSetFlag', { actorUuid : target.actor.uuid, base : 'gambits-premades', key : 'enemiesAboundDisposition', value : target.document.disposition });
            await game.gps.socket.executeAsGM("gmUpdateDisposition", {tokenUuid: `${target.document.uuid}`, disposition: 0 });

            let browserUser = game.users?.activeGM;
            let chatData = {
                user: browserUser.id,
                speaker: ChatMessage.getSpeaker({ token: target }),
                content: `${target.actor.name}'s disposition was changed to Neutral allowing them to attack enemies or allies. This change will be reverted to their original disposition when the effect ends.`,
                whisper: browserUser.id
            };
            await MidiQOL.socket().executeAsGM("createChatMessage", { chatData });

            let cprConfig = game.gps.getCprConfig({itemUuid: item.uuid});
            const { animEnabled } = cprConfig;
            if(animEnabled) {            
                new Sequence()
                .sound()
                    .file("modules/dnd5e-animations/assets/sounds/Spells/Debuff/spell-whispers-2.mp3")
                    .fadeInAudio(500)
                    .fadeOutAudio(500)
                    .delay(1000)
                .effect()
                    .atLocation(token)
                    .stretchTo(target)
                    .file("jb2a.energy_beam.normal.dark_red.01")
                    .belowTokens()
                    .fadeIn(500)
                    .fadeOut(500)
                    .duration(5000)
                .effect()
                    .attachTo(target)
                    .file("jaamod.spells_effects.fear2")
                    .belowTokens()
                    .filter("ColorMatrix", { hue: -15 })
                    .scaleToObject(2.5)
                    .fadeIn(500)
                    .fadeOut(500)
                    .delay(3000)
                .effect()
                    .attachTo(target)
                    .file("jb2a.dodecahedron.skull.below.dark_greenpurple")
                    .belowTokens()
                    .filter("ColorMatrix", { hue: 87 })
                    .scaleToObject(2.5)
                    .name(`EnemiesAbound_${target.actor.id}`)
                    .delay(5000)
                    .persist()
                .play()
            }
        }
    }

    if(args[0].macroPass === "isDamaged") {
        const effect = token.actor.appliedEffects.find(e => e.name === item?.name);
        if(!effect) return;

        const saveResult = await game.gps.gpsActivityUse({itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: token.document.uuid});

        if (saveResult.failedSaves.size === 0) {
            await effect.delete();
            Sequencer.EffectManager.endEffects({name: `EnemiesAbound_${actor.id}`, source: token});

            const hasConcApplied = await MidiQOL.getConcentrationEffect(actor, item.uuid);
            
            if (hasConcApplied) {
                await hasConcApplied.delete();
            }
        }
    }
    else if(args[0] === "off") {
        Sequencer.EffectManager.endEffects({name: `EnemiesAbound_${actor.id}`, source: token});
        let disposition = actor.getFlag("gambits-premades", "enemiesAboundDisposition");
        await game.gps.socket.executeAsGM("gmUpdateDisposition", {tokenUuid: `${token.document.uuid}`, disposition: disposition });
        await actor.unsetFlag("gambits-premades", "enemiesAboundDisposition");
    }
}
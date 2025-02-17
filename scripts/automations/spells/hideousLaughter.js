export async function hideousLaughter({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(!game.modules.get("animated-spell-effects-cartoon")?.active) return ui.notifications.error("You must install the Jack Kerouac's Animated Spell Effects - Cartoon module to use this automation.");
    if (args[0].macroPass === "isDamaged" || args[0] === "each")
    {
        let effectOriginActor;
        (args[0].macroPass === "isDamaged") ? effectOriginActor = item.parent : effectOriginActor = await fromUuid(args[2]);

        if(args[0].macroPass === "isDamaged") {
            let effectAdv = [{
                changes: [{ key: "flags.midi-qol.advantage.ability.save.wis", mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM, value: 1, priority: 20 }],
                flags: { "dae": { "token": actor.uuid, specialDuration: ["isSave"] } },
                disabled: false,
                name: `Damaged - Advantage on Save`
            }];
            let checkEffect = actor.appliedEffects.find(i => i.name ===  `Damaged - Advantage on Save`);
            if(!checkEffect) await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: actor.uuid, effects: effectAdv });
        }

        const saveResult = await game.gps.gpsActivityUse({itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: token.document.uuid});

        if (saveResult.failedSaves.size === 0)
        {
            let effectData = actor.appliedEffects.find(e => e.name === item.name)
            if (effectData)	await effectData.delete();
        }
    }

    else if (args[0].macroPass === "postActiveEffects")
    {
        let targets = workflow.failedSaves;
        const hasConcApplied = MidiQOL.getConcentrationEffect(actor, item.uuid)
        if(!targets && hasConcApplied) {
            await hasConcApplied.delete();
            return;
        }

        for(let target of targets) {
            const intScore = target.actor.system.abilities.int.value;

            if(intScore > 4)
            {
                const hasEffectApplied = target.document.hasStatusEffect("prone");

                if (!hasEffectApplied) {
                    await game.gps.socket.executeAsGM("gmToggleStatus", { tokenUuid: `${target.document.uuid}`, status: "prone", active: true });
                }

                let facing = 1;

                await new Sequence()

                .sound()
                    .file("modules/gambits-premades/assets/sounds/laugh.ogg")
                    .fadeInAudio(500)
                    .fadeOutAudio(500)

                .effect()
                .atLocation(token)
                .file(`jb2a.magic_signs.circle.02.enchantment.loop.dark_yellow`)
                .scaleToObject(1.25)
                .rotateIn(180, 600, {ease: "easeOutCubic"})
                .scaleIn(0, 600, {ease: "easeOutCubic"})
                .loopProperty("sprite", "rotation", { from: 0, to: -360, duration: 10000})
                .belowTokens()
                .fadeOut(2000)
                .zIndex(0)

                .effect()
                .atLocation(token)
                .file(`jb2a.magic_signs.circle.02.enchantment.loop.dark_yellow`)
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
                .file("jb2a.markers.fear.orange.03")
                .scaleIn(0, 500, {ease: "easeOutQuint"})
                .delay(500)
                .atLocation(token, {offset:{y:-0.2}, gridUnits:true, randomOffset: 1.5})
                .scaleToObject(0.5)
                .zIndex(1)
                .playbackRate(1.5)
                .repeats(5, 200, 200)
                .fadeOut(500)
                .waitUntilFinished(-1500)

                .effect()
                .file("animated-spell-effects-cartoon.level 01.bless.yellow")
                .atLocation(target, {randomOffset: 1.2, gridUnits:true})
                .scaleToObject(0.5)
                .repeats(8, 100,100)
                .zIndex(1)

                .effect()
                .file("animated-spell-effects-cartoon.cantrips.mending.yellow")
                .atLocation(target)
                .scaleToObject(3)
                .opacity(0.75)
                .filter("ColorMatrix", { saturate: 1,brightness: 1.3, hue: -5 })
                .zIndex(0)
                .waitUntilFinished(-500)

                .effect()
                .delay(300)
                .file("jb2a.impact.002.orange")
                .atLocation(target)
                .scaleToObject(2)
                .opacity(1)
                .filter("ColorMatrix", { hue: 6 })
                .zIndex(0)

                .effect()
                .file("jb2a.particles.inward.white.02.03")
                .scaleIn(0, 500, {ease: "easeOutQuint"})
                .delay(300)
                .fadeOut(1000)
                .atLocation(target)
                .duration(1000)
                .size(1.75, {gridUnits: true})
                .animateProperty("spriteContainer", "position.y", {  from:0 , to: -0.5, gridUnits:true, duration: 1000})
                .zIndex(1)

                .effect()
                .file("animated-spell-effects-cartoon.magic.impact.02")
                .atLocation(target)
                .scaleToObject(2)
                .opacity(1)
                .zIndex(0)
                .belowTokens()

                .play();

                new Sequence()

                .effect()
                .name(`Fear_${target.id}`)
                .file("jb2a.markers.fear.dark_orange.03")
                .attachTo(target,{local: true, bindAlpha: false})
                .scaleToObject(2)
                .opacity(1)
                .zIndex(0)
                .persist()

                .animation()
                .on(target)
                .opacity(0)

                .effect()
                .name(`Laugh_${target.id}_1`)
                .file("modules/gambits-premades/assets/images/laugh-1.webp")
                .attachTo(target, {offset:{x:0.4*token.document.width, y:-0.45*token.document.width}, gridUnits: true, local: true, bindAlpha: false})
                .loopProperty("sprite", "rotation", { from: 0, to: 15, duration: 250, ease: "easeOutCubic" })
                .loopProperty("sprite", "position.y", { from: 0, to: -0.025, duration: 250, gridUnits: true, pingPong: false })
                .scaleToObject(0.34)
                .private()
                .persist()

                .effect()
                .name(`Laugh_${target.id}_2`)
                .file("modules/gambits-premades/assets/images/laugh-2.webp")
                .attachTo(target, {offset:{x:0.55*token.document.width, y:0}, gridUnits: true, local: true, bindAlpha: false})
                .loopProperty("sprite", "rotation", { from: 0, to: -20, duration: 250,ease: "easeOutCubic" })
                .loopProperty("sprite", "position.y", { from: 0, to: -0.025, duration: 250, gridUnits: true, pingPong: false })
                .scaleToObject(0.34)
                .private()
                .persist()

                .effect()
                .name(`Laugh_${target.id}_3`)
                .copySprite(target)
                .scaleToObject(1, {considerTokenScale: true})
                .attachTo(target,{ bindAlpha: false})
                .loopProperty("sprite", "position.y", { from: 0, to: 0.01, duration: 150, gridUnits: true, pingPong: true, ease:"easeOutQuad" })
                .loopProperty("sprite", "rotation", { from: -33, to: 33, duration: 300, ease: "easeOutCubic", pingPong: true })
                .rotate(-90*facing)
                .loopProperty("sprite", "width", { from: 0, to: 0.015, duration: 150, gridUnits: true, pingPong: true, ease:"easeOutQuad" })
                .loopProperty("sprite", "height", { from: 0, to: 0.015, duration: 150, gridUnits: true, pingPong: true, ease:"easeOutQuad"  })
                .persist()
                .waitUntilFinished(-200)

                .animation()
                .on(target)
                .opacity(1)

                .play()
            }
            else if (intScore <= 4) {
                ui.notifications.warn("This creature is not effected, its Intelligence score is too low.");
                workflow.failedSaves.delete(target);
            }
        }

        targets = workflow.failedSaves;
        if(!targets && hasConcApplied) {
            await hasConcApplied.delete();
            return;
        }
    }

    else if(args[0] === "off") {
        Sequencer.EffectManager.endEffects({ name: `Laugh_${token.id}_1` });
        Sequencer.EffectManager.endEffects({ name: `Laugh_${token.id}_2` });
        Sequencer.EffectManager.endEffects({ name: `Laugh_${token.id}_3` });
        Sequencer.EffectManager.endEffects({ name: `Fear_${token.id}` });
    }
}
import {castConcentration, removeAppliedEffect} from "../../utils/castEffects.js";
/** Midi reads these values for this target's pending save, including a roll requested on another client. */
export function applyRepeatSaveAdvantage(token, workflow, details) {
    const uuid = workflow.workflowOptions?.gps?.advantageSaveTarget;
    if(!uuid || game.gps.tokenDocument(token)?.uuid !== uuid || workflow.activity?.identifier !== "syntheticSave") return;
    details.advantage = true;
    details.modifierTracker?.advantage.add("gpsRepeatSave", workflow.item.name);
}

export async function hideousLaughter({ speaker, actor, token, tokenDocument = game.gps.tokenDocument(token), character, item, args, scope, workflow, options }) {
    if(args[0]?.macroPass === "prePreambleComplete" && item.system.source.rules === "2014") {
        for(const target of workflow.targets.documents) {
            if(target.actor.system.abilities.int.value > 4) continue;
            workflow.targets.delete(target);
            ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Spells.HideousLaughter.TargetNotAffectedIntTooLow"));
        }
        if(!workflow.targets.count) workflow.aborted = true;
        return;
    }
    if (args[0].macroPass === "isDamaged" || args[0] === "each")
    {
        if(!tokenDocument?.uuid) return;
        const damaged = args[0]?.macroPass === "isDamaged";
        const effects = damaged ? actor.appliedEffects.filter(e => e.system?.changes?.some(c =>
            c.key === "flags.midi-qol.onUseMacroName" && String(c.value).includes("gps.hideousLaughter")))
            : [actor.effects.get(args.at(-1)?.effectId)];
        const handled = damaged ? ((workflow.gps ??= {}).laughterSaves ??= new Set()) : new Set();
        for(const effect of effects) {
            if(!effect?.active || handled.has(effect.uuid)) continue;
            handled.add(effect.uuid);
            const source = await DAE.getEffectItem(effect);
            if(!source) continue;
            const save = await game.gps.gpsActivityUse({itemUuid: source.uuid, identifier: "syntheticSave", targetUuid: tokenDocument.uuid, advantageSave: damaged});
            if(save?.failedSaves?.size === 0) await removeAppliedEffect(effect);
        }
    }

    else if (args[0].macroPass === "postActiveEffects")
    {
        let targets = workflow.failedSaves.documents;
        const hasConcApplied = castConcentration(actor, item, {workflow});
        if(!targets.length && hasConcApplied) {
            await hasConcApplied.delete();
            return;
        }

        for(const doc of targets) {
            const intScore = doc.actor.system.abilities.int.value;

            if(item.system.source.rules === "2024" || intScore > 4)
            {
                const hasEffectApplied = doc.hasStatusEffect("prone");

                if (!hasEffectApplied) {
                    await game.gps.queryGM("gmToggleStatus", { tokenUuid: `${doc.uuid}`, status: "prone", active: true });
                }

                const target = doc.object;
                if(!target || !token || !game.gps.getCprConfig({itemUuid: item.uuid}).animEnabled) continue;
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
                .file("eskie.star.02.yellow")
                .atLocation(target, {randomOffset: 1.2, gridUnits:true})
                .scaleToObject(0.5)
                .repeats(8, 100,100)
                .zIndex(1)

                .thenDo(() => game.gps.animation.spellEffect({kind: "mending", at: target, scale: 3, opacity: 0.75}))
                .wait(780)

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
                .file("eskie.damage.bludgeoning.01.yellow")
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
                ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Spells.HideousLaughter.TargetNotAffectedIntTooLow"));
                workflow.failedSaves.delete(doc);
            }
        }

        targets = workflow.failedSaves.documents;
        if(!targets.length && hasConcApplied) {
            await hasConcApplied.delete();
            return;
        }
    }

    else if(args[0] === "off" && tokenDocument && globalThis.Sequencer) {
        Sequencer.EffectManager.endEffects({ name: `Laugh_${tokenDocument.id}_1` });
        Sequencer.EffectManager.endEffects({ name: `Laugh_${tokenDocument.id}_2` });
        Sequencer.EffectManager.endEffects({ name: `Laugh_${tokenDocument.id}_3` });
        Sequencer.EffectManager.endEffects({ name: `Fear_${tokenDocument.id}` });
    }
}
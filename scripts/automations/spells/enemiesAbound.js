import {castConcentration, appliedSpellEffect, removeAppliedEffect} from "../../utils/castEffects.js";
import {effectToken, setEffectFlag} from "../../utils/effectTargetUtils.js";

const MODULE = "gambits-premades";
const SPELL = "4ad56aaf-b9b4-40ce-9869-ff62b999b7be";
const pending = new Map();

/** Reconcile overlapping casts against the disposition of this particular token. */
export async function syncEnemiesAboundDisposition({tokenUuid, effectUuid, active}) {
    const previous = pending.get(tokenUuid) ?? Promise.resolve();
    const task = previous.catch(() => {}).then(async () => {
        const doc = await fromUuid(tokenUuid);
        if(doc?.documentName !== "Token" || !doc.actor || !effectUuid) return;
        const claim = doc.getFlag(MODULE, "enemiesAbound");
        const ids = new Set(claim?.effects);
        if(active) {
            const effect = await fromUuid(effectUuid);
            if(!effect?.active || effect.parent?.uuid !== doc.actor.uuid || effect.getFlag(MODULE, "gpsUuid") !== SPELL
                || effect.getFlag(MODULE, "enemiesAboundTokenUuid") !== tokenUuid || ids.has(effectUuid)) return;
            ids.add(effectUuid);
            await doc.update({disposition: 0, ["flags." + MODULE + ".enemiesAbound"]: {
                original: claim?.original ?? doc.disposition, effects: [...ids]}});
        } else if(ids.delete(effectUuid)) {
            await doc.update(ids.size ? {["flags." + MODULE + ".enemiesAbound.effects"]: [...ids]}
                : {disposition: claim.original, ["flags." + MODULE + ".-=enemiesAbound"]: null});
        }
    });
    pending.set(tokenUuid, task);
    try { await task; } finally { if(pending.get(tokenUuid) === task) pending.delete(tokenUuid); }
}
export async function enemiesAbound({ speaker, actor, token, tokenDocument = game.gps.tokenDocument(token), character, item, macroItem, args, scope, workflow, options }) {
    if(args[0].macroPass === "postActiveEffects") {
        const targets = workflow.failedSaves.documents;
        for(let target of targets) {
            const immunity = target.actor.system.traits?.ci?.value?.has("frightened");

            if (immunity) {
                ui.notifications.notify(game.i18n.format("GAMBITSPREMADES.Notifications.Spells.EnemiesAbound.TargetImmuneCannotBeFrightened", { name: target.actor.name }));
                
                const hasConcApplied = castConcentration(actor, item, {workflow});
                
                if (hasConcApplied) {
                    await hasConcApplied.delete();
                }
                
                return;
            }

            const cast = castConcentration(actor, item, {workflow});
            if(!cast) continue;
            const effect = appliedSpellEffect(target.actor, item, {cast, workflow, matches: e => e.getFlag(MODULE, "gpsUuid") === SPELL});
            if(!effect) continue;
            await setEffectFlag(effect, "enemiesAboundTokenUuid", target.uuid);
            await game.gps.queryGM("syncEnemiesAboundDisposition", {tokenUuid: target.uuid, effectUuid: effect.uuid, active: true});

            let browserUser = game.users?.activeGM;
            let chatData = {
                user: browserUser.id,
                speaker: ChatMessage.getSpeaker({ token: target }),
                content: game.i18n.format("GAMBITSPREMADES.ChatMessages.EnemiesAbound.DispositionChanged", {actorName: target.actor.name}),
                whisper: browserUser.id
            };
            await MidiQOL.socket().executeAsGM("createChatMessage", { chatData });

            let cprConfig = game.gps.getCprConfig({itemUuid: item.uuid});
            const { animEnabled } = cprConfig;
            if(token && target.object && animEnabled && game.modules.get("jaamod")?.active) {
                new Sequence()
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
                    .name(`EnemiesAbound_${effect.uuid}`)
                    .delay(5000)
                    .persist()
                .play()
            }
        }
    }

    if(args[0].macroPass === "isDamaged") {
        const target = effectToken(tokenDocument, null, actor);
        if(!target) return;
        const effects = actor.appliedEffects.filter(e => e.active && e.getFlag(MODULE, "gpsUuid") === SPELL
            && e.getFlag(MODULE, "enemiesAboundTokenUuid") === target.uuid);
        const handled = ((workflow.gps ??= {}).enemiesAboundSaves ??= new Set());
        for(const effect of effects) {
            if(handled.has(effect.uuid)) continue;
            handled.add(effect.uuid);
            const spell = await DAE.getEffectItem(effect);
            if(!spell?.actor) continue;
            const cast = castConcentration(spell.actor, spell, {effect});
            const result = await game.gps.gpsActivityUse({itemUuid: spell.uuid, identifier: "syntheticSave", targetUuid: target.uuid});
            if(result?.failedSaves?.size !== 0 || result.aborted) continue;
            await removeAppliedEffect(cast);
            await removeAppliedEffect(effect);
        }
    } else if(args[0] === "off" || args[0] === "on") {
        const context = args.at(-1);
        const tokenUuid = actor.effects.get(context.effectId)?.getFlag(MODULE, "enemiesAboundTokenUuid")
            ?? context.efData?.flags?.[MODULE]?.enemiesAboundTokenUuid;
        if(!tokenUuid) return;
        if(args[0] === "off") await globalThis.Sequencer?.EffectManager?.endEffects({name: `EnemiesAbound_${context.effectUuid}`});
        await game.gps.queryGM("syncEnemiesAboundDisposition", {tokenUuid, effectUuid: context.effectUuid, active: args[0] === "on"});
    }
}

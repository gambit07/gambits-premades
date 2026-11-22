import {appliedSpellEffect, castConcentration, withEffectLock} from "../../utils/castEffects.js";

const gps = "gambits-premades";

export function grantGamutDisadvantage({effectUuid}) {
    return withEffectLock(effectUuid, async () => {
        const effect = await fromUuid(effectUuid);
        if(!effect?.active || !effect.flags[gps]?.gamutRecipient) return;
        const actor = effect.parent;
        if(actor.effects.some(e => e.flags.dnd5e?.dependentOn === effect.uuid && e.flags[gps]?.gamutDisadvantage)) return;
        const spell = await DAE.getEffectItem(effect);
        if(!spell || !actor.effects.get(effect.id)?.active) return;
        const [rider] = await actor.createEmbeddedDocuments("ActiveEffect", [{
            name: "Emotional Gamut - Disadvantage", img: spell.img, origin: spell.uuid, transfer: false,
            duration: {expiry: "sourceEnd"}, system: {magical: true, origin: {item: spell.uuid},
                changes: [{key: "attack", type: "dnd5e.advantage", value: "-1", priority: 100}]},
            flags: {dnd5e: {dependentOn: effect.uuid}, dae: {specialDuration: ["1Attack"]}, [gps]: {gamutDisadvantage: true}}
        }]);
        if(rider && !actor.effects.get(effect.id)?.active && actor.effects.has(rider.id)) await rider.delete();
    });
}

export async function emotionalGamut({actor, item, args, workflow}) {
    const pass = args[0]?.macroPass;
    if(pass === "postPreambleComplete" && workflow.targets.documents[0]?.actor?.system.traits.ci.value.has("charmed")) {
        ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.EffectHelpers.CharmImmune"));
        workflow.aborted = true;
        await castConcentration(actor, item, {workflow})?.delete();
        return;
    }
    if(pass === "postActiveEffects") {
        const cast = castConcentration(actor, item, {workflow});
        if(!cast) return;
        if(!workflow.failedSaves.count) return cast.delete();
        for(const target of workflow.failedSaves.documents) {
            const effect = appliedSpellEffect(target.actor, item, {cast, workflow, matches: e => e.flags[gps]?.gamutRecipient});
            if(effect) await game.gps.queryGM("grantGamutDisadvantage", {effectUuid: effect.uuid});
        }
    }
    if(args[0] === "off" && game.gps.effectSuspended(args.at(-1))) {
        const uuid = args.at(-1).effectUuid;
        const ids = actor.effects.filter(e => e.flags[gps]?.gamutDisadvantage && e.flags.dnd5e?.dependentOn === uuid).map(e => e.id);
        if(ids.length) await MidiQOL.socket().executeAsGM("removeEffects", {actorUuid: actor.uuid, effects: ids});
    }
    if(args[0] === "each") {
        const effect = actor.effects.get(args.at(-1)?.effectId);
        if(effect?.active && effect.flags[gps]?.gamutRecipient)
            await game.gps.queryGM("grantGamutDisadvantage", {effectUuid: effect.uuid});
    }
}

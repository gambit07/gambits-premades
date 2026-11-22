import {effectToken, nearbyChainRecipients, setEffectFlag, moveChainEffect} from "../../utils/effectTargetUtils.js";

const MODULE = "gambits-premades";
const KEY = "festeringFever";
const MESSAGE = "GAMBITSPREMADES.ChatMessages.Automations.ThirdPartySpells.FesteringFever";

export async function festeringFever({actor, token, item, args}) {
    const phase = args[0];
    const context = args.at(-1);
    if(phase !== "on" && !(phase === "each" && context.turn === "startTurn")) return;
    const effect = actor.effects.get(context.effectId);
    const target = effectToken(token, context, actor);
    if(!effect?.active || !target || !item) return;
    const state = effect.getFlag(MODULE, KEY) ?? {dice: Number(args[1]), dc: Number(args[2]), caster: args[3], visited: []};
    if(!(state.dice > 0) || !Number.isFinite(state.dc) || !state.caster) return;
    const announce = key => ChatMessage.create({speaker: ChatMessage.getSpeaker({actor, token: target}),
        content: game.i18n.format(`${MESSAGE}.${key}`, {name: foundry.utils.escapeHTML(target.name)})});
    if(phase === "each") {
        const eligible = state.dice > 1 ? nearbyChainRecipients(target, 10, state.visited) : [];
        if(eligible.length) return moveChainEffect(effect, eligible[Math.floor(Math.random() * eligible.length)], KEY, {...state, dice: state.dice - 1});
        await MidiQOL.socket().executeAsGM("removeEffects", {actorUuid: actor.uuid, effects: [effect.id]});
        return announce("NoTarget");
    }
    if(state.visited.includes(actor.uuid)) return;
    const caster = await fromUuid(state.caster);
    if(!caster?.actor) return;
    await setEffectFlag(effect, KEY, {...state, visited: [...state.visited, actor.uuid]});
    const data = game.gps.disableBlfxAutoRecognition({name: item.name, img: item.img, type: "feat", effects: [],
        flags: {"midi-qol": {noProvokeReaction: true, forceCEOff: true}, autoanimations: {version: 5, isEnabled: false, killAnim: true}},
        system: {activities: {gpsSynthetic0001: {type: "save", midiProperties: {magicEffect: true, magicDamage: true},
            activation: {type: "special"}, consumption: {spellSlot: false, targets: []}, target: {affects: {type: "creature", count: "1"}},
            save: {ability: ["con"], dc: {calculation: "", formula: String(state.dc)}},
            damage: {onSave: "half", parts: [{custom: {enabled: true, formula: `${state.dice}d8`}, types: ["necrotic"]}]}}}}});
    const spell = new CONFIG.Item.documentClass(data, {parent: caster.actor});
    const result = await MidiQOL.completeItemUse(spell, {midiOptions: {showFullCard: false, createWorkflow: true, targetUuids: [target.uuid],
        workflowOptions: {autoRollDamage: "always", autoFastDamage: true}}}, {configure: false}, {});
    if(!result || result.aborted) {
        await MidiQOL.socket().executeAsGM("removeEffects", {actorUuid: actor.uuid, effects: [effect.id]});
        return;
    }
    const saved = !result.failedSaves.has(target);
    if(saved || state.dice === 1) await MidiQOL.socket().executeAsGM("removeEffects", {actorUuid: actor.uuid, effects: [effect.id]});
    if(target.object && game.gps.getCprConfig({itemUuid: item.uuid}).animEnabled && globalThis.Sequence) {
        void new Sequence().effect().file("jb2a.magic_signs.rune.necromancy.complete.green").attachTo(target.object)
            .scaleToObject(2.5).opacity(1).zIndex(1).fadeIn(1500).fadeOut(1500)
            .filter("ColorMatrix", {hue: 140, brightness: 0.8, contrast: 1, saturate: 1}).play();
    }
    await announce(saved ? "Saved" : state.dice === 1 ? "Spent" : "Continues");
}

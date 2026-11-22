import {effectToken, nearbyChainRecipients, setEffectFlag, moveChainEffect} from "../../utils/effectTargetUtils.js";

const MODULE = "gambits-premades";
const KEY = "contagiousHealing";
const ID = "dabf704f-a59b-43b4-8552-9aa18734a362";

function burst(target, item) {
    if(!target?.object || !game.gps.getCprConfig({itemUuid: item.uuid}).animEnabled || !globalThis.Sequence) return;
    return new Sequence().effect().file("jb2a.particle_burst.01.circle.green").attachTo(target.object)
        .scaleToObject(3).opacity(1).zIndex(0).belowTokens(false).fadeIn(1500).fadeOut(1500).play();
}

export async function contagiousHealing({actor, token, tokenDocument, item, args, workflow, macroItem}) {
    const source = macroItem ?? item;
    const find = holder => holder?.appliedEffects.find(e => e.active && e.getFlag(MODULE, "gpsUuid") === ID && DAE.effectMatchesSource(e, source.uuid));
    if(args[0]?.macroPass === "postActiveEffects") {
        const target = workflow.targets.documents[0];
        const effect = find(target?.actor);
        const caster = tokenDocument ?? game.gps.tokenDocument(token);
        if(!effect || !caster || effect.getFlag(MODULE, KEY)) return;
        await setEffectFlag(effect, KEY, {caster: caster.uuid, dice: workflow.castData.castLevel - 1,
            mod: actor.system.abilities[actor.system.attributes.spellcasting].mod, visited: [target.actor.uuid]});
        void burst(target, source);
        return;
    }
    const context = args.at(-1);
    const target = tokenDocument ?? effectToken(token, context, actor);
    if(!target) return;
    if(args[0] === "on") {
        const effect = actor.effects.get(context.effectId);
        const state = effect?.getFlag(MODULE, KEY);
        if(!state || !effect.active || state.visited.includes(actor.uuid)) return;
        const caster = await fromUuid(state.caster);
        if(!caster?.actor) return;
        await setEffectFlag(effect, KEY, {...state, visited: [...state.visited, actor.uuid]});
        const roll = await new CONFIG.Dice.DamageRoll(`${state.dice}d8 + ${state.mod}`, {}, {type: "healing", properties: ["mgc"]}).evaluate();
        await MidiQOL.displayDSNForRoll(roll, "damageRoll");
        const itemData = game.gps.disableBlfxAutoRecognition({name: source.name, img: source.img, type: "feat", flags: {autoanimations: {isEnabled: false, version: 5}}});
        await new MidiQOL.DamageOnlyWorkflow(caster.actor, caster, roll.total, "healing", [target], roll, {itemData, flavor: source.name}).ready;
        void burst(target, source);
    } else if(args[0]?.macroPass === "isDamaged") {
        const effect = find(actor);
        const state = effect?.getFlag(MODULE, KEY);
        if(!state) return;
        const eligible = nearbyChainRecipients(target, 10, state.visited).filter(t => !["undead", "construct"].includes(MidiQOL.raceOrType(t.actor)));
        if(eligible.length) return moveChainEffect(effect, eligible[Math.floor(Math.random() * eligible.length)], KEY, state);
        await MidiQOL.socket().executeAsGM("removeEffects", {actorUuid: actor.uuid, effects: [effect.id]});
        await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor, token: target}),
            content: game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ThirdPartySpells.ContagiousHealing.NoAdditionalAlliesInRange")});
    }
}

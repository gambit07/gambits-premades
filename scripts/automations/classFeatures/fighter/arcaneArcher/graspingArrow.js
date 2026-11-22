import {effectToken} from "../../../../utils/effectTargetUtils.js";
import {grantEffectItems, withEffectLock} from "../../../../utils/castEffects.js";

const gps = "gambits-premades";
const helperId = "72bc5660-235c-4190-8aa2-4d23a3a592e3";
const isVines = e => e?.flags?.[gps]?.graspingVines === true;
const visual = uuid => `GraspingArrow.${uuid}`;

async function armMovement(vines, spell, target) {
    const actor = vines.parent;
    if(!actor.effects.get(vines.id)?.active || actor.effects.some(e => e.flags[gps]?.graspingMovement === vines.uuid)) return;
    const [watch] = await actor.createEmbeddedDocuments("ActiveEffect", [{
        name: "Grasping Arrow - Movement", img: spell.img, origin: spell.uuid, transfer: false,
        system: {origin: {item: spell.uuid}, changes: [{key: "macro.itemMacro", type: "custom", value: "function.game.gps.graspingArrow", priority: 20}]},
        flags: {dnd5e: {dependentOn: vines.uuid}, [gps]: {graspingMovement: vines.uuid, targetUuid: target.uuid}, dae: {specialDuration: ["isMoved"], stackable: "multi"}}
    }]);
    if(watch && !actor.effects.has(vines.id) && actor.effects.has(watch.id)) await watch.delete();
}

export async function initializeGraspingArrow({effectUuid, targetUuid}) {
    return withEffectLock(effectUuid, async () => {
        const vines = await fromUuid(effectUuid), target = await fromUuid(targetUuid);
        if(!vines?.active || !isVines(vines) || target?.actor?.uuid !== vines.parent.uuid) return;
        const spell = await DAE.getEffectItem(vines);
        if(!spell?.actor) return;
        const dc = 8 + spell.actor.system.abilities.int.mod + spell.actor.system.attributes.prof;
        const helper = {
            name: game.i18n.format("GAMBITSPREMADES.EffectHelpers.RemoveVines", {target: target.name}), type: "feat", img: spell.img,
            system: {type: {value: "feat"}, activities: {gpsGraspRemove01: {type: "utility", activation: {type: "action"},
                consumption: {spellSlot: false}, duration: {units: "inst"}, range: {value: 5, units: "ft"}, target: {affects: {type: "any"}}}}},
            flags: {"midi-qol": {onUseMacroName: "[preActiveEffects]function.game.gps.graspingArrow"},
                [gps]: {gpsUuid: helperId, targetUuid, vineDC: dc}}
        };
        await grantEffectItems(vines, target.parent.tokens.contents, helper);
        await armMovement(vines, spell, target);
        if(target.object && target.actor.effects.has(vines.id) && game.gps.getCprConfig({itemUuid: spell.uuid}).animEnabled && game.modules.get("jaamod")?.active && globalThis.Sequencer) {
            if(!Sequencer.EffectManager.getEffects({name: visual(vines.uuid)}).length)
                new Sequence().effect().name(visual(vines.uuid)).file("jaamod.spells_effects.vines4")
                    .attachTo(target.object, {bindVisibility: true}).scaleToObject(1.2).opacity(0.85)
                    .zIndex(0).mask(target.object).persist().fadeIn(2500).fadeOut(2500).play();
        }
    });
}

export async function graspingArrowMoved({effectUuid, targetUuid}) {
    return withEffectLock(effectUuid, async () => {
        const vines = await fromUuid(effectUuid), target = await fromUuid(targetUuid);
        if(!vines?.active || !isVines(vines) || target?.actor?.uuid !== vines.parent.uuid) return;
        const spell = await DAE.getEffectItem(vines);
        if(!spell?.actor) return;
        const combat = game.combat?.started ? game.combat : undefined;
        const turn = combat ? `${combat.id}:${combat.round}:${combat.turn}` : null;
        const previous = vines.getFlag(gps, "graspingDamageTurn");
        try {
            if(turn && turn === previous) return;
            if(turn) await vines.setFlag(gps, "graspingDamageTurn", turn);
            const formula = spell.actor.system.scale["arcane-archer"]?.["arcane-shot-options"]?.formula;
            if(!formula) return;
            const roll = await new CONFIG.Dice.DamageRoll(formula, {}, {type: "slashing", properties: ["mgc"]}).evaluate();
            await MidiQOL.displayDSNForRoll(roll, "damageRoll");
            const itemData = {name: "Grasping Arrow - Damage (Slashing)", type: "feat", img: spell.img,
                flags: {autoanimations: {isEnabled: false, version: 5}}};
            await new MidiQOL.DamageOnlyWorkflow(spell.actor, MidiQOL.tokenForActor(spell.actor), roll.total, "slashing", [target.object ?? target], roll,
                {itemData, flavor: itemData.name});
        } finally { await armMovement(vines, spell, target); }
    });
}

export async function graspingArrow({actor, token, item, args}) {
    const pass = args[0]?.macroPass;
    if(pass === "preActiveEffects" && item.flags[gps]?.gpsUuid === helperId) {
        const target = await fromUuid(item.getFlag(gps, "targetUuid"));
        const vines = await fromUuid(item.getFlag(gps, "ownerEffectUuid"));
        if(!vines?.active || !isVines(vines) || !target?.object || vines.parent.uuid !== target.actor.uuid || !game.gps.withinRange(token, target.object, 5)) return;
        const [roll] = await actor.rollAbilityCheck({ability: "str"}) ?? [];
        if(roll?.total >= item.getFlag(gps, "vineDC") && target.actor.effects.has(vines.id))
            await MidiQOL.socket().executeAsGM("removeEffects", {actorUuid: target.actor.uuid, effects: [vines.id]});
        return;
    }
    const context = args.at(-1);
    if(args[0] === "on" && isVines(context?.efData)) {
        const target = effectToken(token, context, actor);
        if(target) await game.gps.queryGM("initializeGraspingArrow", {effectUuid: context.effectUuid, targetUuid: target.uuid});
    }
    if(args[0] !== "off") return;
    if(isVines(context?.efData)) await globalThis.Sequencer?.EffectManager?.endEffects({name: visual(context.effectUuid)});
    const vines = context?.efData?.flags?.[gps]?.graspingMovement;
    if(vines && context["expiry-reason"]?.split(/[:,]/).includes("isMoved")) {
        const target = await fromUuid(context.efData.flags[gps].targetUuid);
        if(target?.actor?.uuid === actor.uuid) await game.gps.queryGM("graspingArrowMoved", {effectUuid: vines, targetUuid: target.uuid});
    }
}

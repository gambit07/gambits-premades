import {effectToken} from "../../utils/effectTargetUtils.js";
import {appliedSpellEffect, grantEffectItems, withEffectLock} from "../../utils/castEffects.js";

const gps = "gambits-premades";
const helperId = "f8767d4c-54c6-4bca-8cb4-b87b5f626b42";
const visual = uuid => `ShroomOfDoom.${uuid}`;
const shroom = e => e?.flags[gps]?.shroomRecipient === true;

export async function initializeShrooms({effectUuid, targetUuid, casterUuid, castLevel}) {
    return withEffectLock(effectUuid, async () => {
        const effect = await fromUuid(effectUuid), target = await fromUuid(targetUuid);
        if(!effect?.active || !shroom(effect) || target?.actor?.uuid !== effect.parent.uuid || effect.getFlag(gps, "shrooms")) return;
        const spell = await DAE.getEffectItem(effect);
        if(!spell) return;
        const roll = await new CONFIG.Dice.DamageRoll("1d8").evaluate();
        if(!target.actor.effects.get(effect.id)?.active) return;
        await effect.setFlag(gps, "shrooms", {remaining: roll.total, targetUuid});
        const helper = {
            name: game.i18n.format("GAMBITSPREMADES.EffectHelpers.RemoveShroom", {target: target.name}), type: "feat", img: spell.img,
            system: {type: {value: "feat"}, activities: {shroomOfDoomRemove: {type: "damage",
                activation: {type: "bonus", override: true}, consumption: {spellSlot: false},
                duration: {units: "inst"}, range: {override: true, units: "touch"}, target: {override: true, affects: {count: "1", type: "ally"}},
                damage: {parts: [{number: Math.max(0, Number(effect.flags.dnd5e?.spellLevel ?? castLevel ?? spell.system.level) - 1), denomination: 4, types: ["poison"]}]}}}},
            flags: {"midi-qol": {onUseMacroName: "[preDamageRoll]function.game.gps.shroomOfDoom"},
                [gps]: {gpsUuid: helperId, targetUuid}}
        };
        await grantEffectItems(effect, target.parent.tokens.filter(t => t.disposition === target.disposition), helper);
        await MidiQOL.displayDSNForRoll(roll, "damageRoll");
        const messageKey = roll.total === 1 ? "MushroomCreatedOnBody" : "MushroomsCreatedOnBody";
        const caster = casterUuid ? await fromUuid(casterUuid) : null;
        await ChatMessage.create({user: MidiQOL.playerForActor(spell.actor)?.id ?? game.user.id,
            speaker: ChatMessage.getSpeaker({actor: spell.actor, token: caster}),
            content: game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ThirdPartySpells.ShroomOfDoom." + messageKey, {mushroomCount: roll.total})});
        if(target.object && target.actor.effects.has(effect.id) && game.gps.getCprConfig({itemUuid: spell.uuid}).animEnabled && globalThis.Sequencer) {
            new Sequence().effect().name(visual(effect.uuid)).file("jb2a.plant_growth.01.round.2x2.loop.bluepurple")
                .attachTo(target.object, {bindVisibility: true}).scaleToObject(1.2).opacity(0.85).zIndex(0)
                .mask(target.object).persist().belowTokens(false).fadeIn(2500).fadeOut(2500).play();
        }
    });
}

export async function removeShroom({itemUuid, targetUuid}) {
    const helper = await fromUuid(itemUuid);
    const owner = helper?.getFlag(gps, "ownerEffectUuid");
    if(!owner || helper.flags[gps]?.gpsUuid !== helperId || helper.getFlag(gps, "targetUuid") !== targetUuid) return false;
    return withEffectLock(owner, async () => {
        const effect = await fromUuid(owner), target = await fromUuid(targetUuid);
        const state = effect?.getFlag(gps, "shrooms");
        if(!effect?.active || !shroom(effect) || effect.parent.uuid !== target?.actor?.uuid
            || !helper.parent.items.has(helper.id) || state?.targetUuid !== targetUuid || !(state.remaining > 0)) return false;
        if(state.remaining === 1) await effect.delete();
        else await effect.setFlag(gps, "shrooms", {...state, remaining: state.remaining - 1});
        return true;
    });
}

export async function shroomOfDoom({actor, token, item, args, workflow}) {
    if(args[0] === "on") {
        const context = args.at(-1), effect = actor.effects.get(context.effectId);
        const target = effectToken(token, context, actor);
        const level = effect?.flags.dnd5e?.spellLevel ?? effect?.flags["midi-qol"]?.castData?.castLevel;
        if(shroom(effect) && target && Number.isFinite(level))
            await game.gps.queryGM("initializeShrooms", {effectUuid: effect.uuid, targetUuid: target.uuid, castLevel: level});
    }
    if(args[0]?.macroPass === "postActiveEffects") {
        for(const target of workflow.failedSaves.documents) {
            const effect = appliedSpellEffect(target.actor, item, {workflow, matches: shroom});
            if(effect) await game.gps.queryGM("initializeShrooms", {effectUuid: effect.uuid, targetUuid: target.uuid,
                casterUuid: workflow.tokenDocument?.uuid, castLevel: workflow.castData?.castLevel});
        }
    }
    if(args[0]?.macroPass === "preDamageRoll") {
        const target = workflow.hitTargets.documents[0] ?? workflow.targets.documents[0];
        if(!target || !await game.gps.queryGM("removeShroom", {itemUuid: item.uuid, targetUuid: target.uuid})) {
            ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Spells.ShroomOfDoom.TargetNotAffected"));
            workflow.aborted = true;
        }
    }
    if(args[0] === "off") await globalThis.Sequencer?.EffectManager?.endEffects({name: visual(args.at(-1).effectUuid)});
}

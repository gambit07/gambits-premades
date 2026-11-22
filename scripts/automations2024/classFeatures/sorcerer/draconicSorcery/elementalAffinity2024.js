import {castConcentration, itemConcentrations} from "../../../../utils/castEffects.js";

const gps = "gambits-premades";
export function elementalAffinityType(item) {
    const configured = game.gps?.getCprConfig?.({item, type: "damageType"})?.dType;
    return typeof configured === "string" && Object.hasOwn(CONFIG.DND5E.damageTypes, configured) ? configured : null;
}

function durationSeconds(activity) {
    const {value, units} = activity?.duration?.getEffectData?.() ?? {};
    const multiplier = {turns: CONFIG.time.roundTime, rounds: CONFIG.time.roundTime, seconds: 1, minutes: 60, hours: 3600, days: 86400};
    return (Number(value) || 0) * (multiplier[units] ?? 0);
}

export async function elementalAffinity2024({actor, args, workflow}) {
    const pass = args?.[0]?.macroPass;
    if(!workflow || workflow.aborted || workflow.item.type !== "spell") return;
    const source = actor.items.get(workflow.item.id);
    if(!source) return;
    const data = workflow.gps ??= {};
    const explicit = workflow.workflowOptions?.gps?.castUuid ?? data.elementalAffinityCast?.castUuid;
    const primary = source.system.activities?.contents?.[0];
    const repeat = !workflow.concentrationId && (explicit || workflow.activity?.identifier?.startsWith("synthetic")
        || (primary && workflow.activity?.id !== primary.id && !workflow.activity?.duration?.concentration && workflow.activity?.consumption?.spellSlot === false));
    let cast = castConcentration(actor, source, {workflow});
    if(workflow.concentrationId && !cast) return;
    if(!cast && (explicit || repeat)) {
        const candidates = itemConcentrations(actor, source);
        if(explicit) {
            cast = candidates.find(e => e.uuid === explicit);
            if(!cast) return;
        } else if(candidates.length === 1) cast = candidates[0];
        else if(candidates.length > 1 || (repeat && workflow.item.system.properties?.has("concentration"))) return;
    }
    const previous = cast ? undefined : source.getFlag(gps, "elementalAffinityCast");
    const state = data.elementalAffinityCast ??= {
        id: cast?.uuid ?? (repeat && previous?.until > game.time.worldTime ? previous.id : workflow.id),
        used: cast ? !!cast.getFlag(gps, "elementalAffinityUsed") : !!(repeat && previous?.until > game.time.worldTime && previous.used),
        until: game.time.worldTime + durationSeconds(workflow.activity)
    };
    if(cast) state.castUuid = cast.uuid;
    if(pass === "postActiveEffects") {
        if(cast && state.used && !cast.getFlag(gps, "elementalAffinityUsed")) await cast.setFlag(gps, "elementalAffinityUsed", true);
        else if(!cast && !repeat && state.until > game.time.worldTime) await source.setFlag(gps, "elementalAffinityCast", state);
        return;
    }
    if(pass !== "preDamageRollComplete" || data.elementalAffinity || state.used || cast?.getFlag(gps, "elementalAffinityUsed")) return;
    const item = actor.items.find(i => i.flags[gps]?.gpsUuid === "1c11dbbe-c4f3-4208-9449-c025d6a34218");
    const type = item && elementalAffinityType(item);
    if(!type) return;
    const index = workflow.damageRolls.findIndex(roll => roll.options.type === type);
    if(index < 0) return;
    const accepted = await game.gps.confirmAutomationDialog({window: {title: item.name},
        content: `<p>${game.i18n.format("GAMBITSPREMADES.RulesReview.ElementalAffinityPrompt", {bonus: actor.system.abilities.cha.mod, type: game.i18n.localize(CONFIG.DND5E.damageTypes[type].label)})}</p>`, rejectClose: false});
    if(!accepted || (cast && (!actor.effects.get(cast.id)?.active || cast.getFlag(gps, "elementalAffinityUsed")))) return;
    const rolls = [...workflow.damageRolls];
    rolls[index] = await game.gps.adjustRollTotal(rolls[index], actor.system.abilities.cha.mod);
    data.elementalAffinity = state.used = true;
    if(cast) await cast.setFlag(gps, "elementalAffinityUsed", true);
    else if(repeat && previous?.id === state.id) await source.setFlag(gps, "elementalAffinityCast", {...previous, used: true});
    await workflow.setDamageRolls(rolls);
}

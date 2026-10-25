import {isAttackForcedMiss} from "./attackOutcomeUtils.js";

/** Identifies definite misses without running Midi's hit checks or triggering another reaction pass. */
function attackDefinitelyMisses(workflow, target) {
    if(isAttackForcedMiss(workflow, target)) return true;
    const actor = target.actor;
    if(!actor || !workflow.attackRoll || workflow.isCritical) return false;
    const attackType = workflow.activity?.actionType;
    const ability = workflow.activity?.ability;
    const success = [
        workflow.actor?.system?.rolls?.attack?.success,
        workflow.actor?.system?.rolls?.attack?.[attackType]?.success,
        workflow.actor?.system?.abilities?.[ability]?.attack?.roll?.success,
        workflow.actor?.flags?.["midi-qol"]?.success?.all,
        workflow.actor?.flags?.["midi-qol"]?.success?.attack?.all,
        workflow.actor?.flags?.["midi-qol"]?.success?.attack?.[attackType],
        actor.flags?.["midi-qol"]?.grants?.attack?.success?.all,
        actor.flags?.["midi-qol"]?.grants?.attack?.success?.[attackType]
    ];
    if(success.some(value => value && value !== "false")) return false;
    if(workflow.isFumble) return true;
    if(actor.type === "vehicle") return false;
    const rules = MidiQOL.configSettings?.()?.optionalRules ?? {};
    if(rules.challengeModeArmor && rules.challengeModeArmor !== "none") return false;
    const flanking = rules.flankingBonus && rules.flankingBonus !== "advantage" ? Number(rules.flankingBonus) : 0;
    if(!Number.isFinite(flanking)) return false;
    const ac = actor.system?.attributes?.ac;
    if(!Number.isFinite(ac?.value) || !Number.isFinite(workflow.attackTotal)) return false;
    const descriptor = workflow.targetDescriptors?.find(entry => entry.actor === actor.uuid);
    const modifier = workflow.targetACModifiers?.get(actor.uuid) ?? 0;
    const descriptorModifier = Number.isFinite(descriptor?.ac) ? descriptor.ac - ac.value : 0;
    const cover = ac.cover ?? 0;
    if(!Number.isFinite(modifier) || !Number.isFinite(cover)) return false;
    const minimumAC = ac.value - Math.max(0, cover) - Math.max(0, flanking) + Math.min(0, modifier, descriptorModifier);
    const bonuses = actor.flags?.["midi-qol"]?.grants?.attack?.bonus;
    let bonus = 0;
    for(const value of [bonuses?.all, bonuses?.[attackType]]) {
        if(value == null || value === "") continue;
        const numeric = Number(value);
        if(!Number.isFinite(numeric)) return false;
        bonus += numeric;
    }
    return workflow.attackTotal + bonus < minimumAC;
}

/** Keeps prompts whose intended result is unresolved, including uncertain outcomes and other affected targets. */
export function reactionCanChangeOutcome(workflow, {type = "attack", desired = "miss", target} = {}) {
    if(!game.gpsSettings?.skipResolvedReactions || !workflow) return true;
    if(workflow.aborted) return false;
    const targets = target ? [target] : [...(workflow.targets ?? [])];
    if(!targets.length) return true;
    if(type === "attack" && desired === "miss") return targets.some(token => !attackDefinitelyMisses(workflow, token));
    if(type !== "save" || !["success", "failure"].includes(desired)) return true;
    const resolved = desired === "success" ? workflow.saves : workflow.failedSaves;
    if(!resolved) return true;
    const uuids = new Set([...resolved].map(token => token.document?.uuid ?? token.uuid));
    return targets.some(token => !uuids.has(token.document?.uuid ?? token.uuid));
}

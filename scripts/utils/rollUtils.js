import {isAttackForcedMiss} from "./attackOutcomeUtils.js";

export function replaceD20Result(roll, result) {
    const copy = Roll.fromJSON(JSON.stringify(roll));
    const die = copy.dice.find(term => term.faces === 20);
    if(!die || !Number.isFinite(result)) return copy;
    die.number = 1;
    die.modifiers = die.modifiers.filter(modifier => !/^(?:kh|kl|dh|dl)/.test(modifier));
    die.results = [{result, active: true}];
    const revised = copy.constructor.fromTerms(copy.terms);
    revised.options = {...copy.options, advantageMode: 0, advantage: false, disadvantage: false};
    revised.resetFormula();
    return revised;
}

export async function adjustRollTotal(roll, amount) {
    return MidiQOL.addRollTo(roll, await new Roll(String(amount)).evaluate());
}

export function withinRange(source, target, feet) {
    if(!source || !target) return false;
    const distance = MidiQOL.computeDistance(source, target, {wallsBlock: true, includeCover: true});
    return distance >= 0 && distance <= game.gps.convertFromFeet({range: feet});
}

export async function setAttackResult(workflow, roll) {
    await workflow.setAttackRoll(roll);
    await workflow.processAttackRoll?.();
}

export function attackHits(workflow, target) {
    if(isAttackForcedMiss(workflow, target)) return false;
    return !workflow.isFumble && (workflow.isCritical || workflow.attackTotal >= target?.actor?.system.attributes.ac.value);
}

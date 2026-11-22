/** Returns the stored token for either representation supplied by Midi. */
export function tokenDocument(token) {
    return token?.documentName === "Token" ? token : token?.document;
}

/** Includes the system's No Reactions effect, which is separate from spent reactions. */
export function reactionUnavailable(actor) {
    return !actor || MidiQOL.hasUsedReaction(actor) || actor.appliedEffects.some(effect =>
        effect._stats?.compendiumSource === "Compendium.dnd5e.effects.ActiveEffect.tZuPpkTWg8lVjxhL"
        || effect.img === "systems/dnd5e/icons/svg/statuses/no-reactions.svg");
}

/** Mundane attacks remain available when a weapon's magical properties are suppressed. */
export function magicUnavailable(item, activity) {
    if(item?.system?.magicAvailable !== false) return false;
    if(item.type === "spell") return true;
    if(activity) return activity.visibility?.requireMagic === true;
    const activities = item.system.activities;
    return !!(activities?.size ?? activities?.length) && activities.every(entry => entry.visibility?.requireMagic === true);
}

/** Spell regions cannot affect a creature in antimagic. */
export function spellRegionSuppressed(item, actor) {
    return item?.type === "spell" && (item.system.magicAvailable === false || actor?.statuses.has("antimagic"));
}

/** DAE also emits "off" when the effect still exists and can resume. */
export function effectSuspended(context) {
    return ["effect-suppressed", "effect-disabled"].includes(context?.["expiry-reason"]);
}

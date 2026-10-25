const MODULE_ID = "gambits-premades";
const EFFECT_ID = "2300dad6-8de1-4fa5-9878-40cec8ee37aa";
const spiritUpdates = new Map();
const animationPrefix = effect => `DrawingTheHearth_${effect.uuid.replaceAll(".", "_")}`;

/** Initialize a separate spirit pool and render one distinct orb per spirit. */
async function initializeSpirits({actor, token, item, effect}) {
    const proficiency = Number(actor.system.attributes.prof);
    const count = Number.isFinite(proficiency) ? Math.max(0, Math.floor(proficiency)) : 0;
    await effect.setFlag(MODULE_ID, "hearthSpirits", {initial: count, remaining: count, activation: foundry.utils.randomID()});
    const prefix = animationPrefix(effect);
    if(typeof Sequencer !== "undefined") await Sequencer.EffectManager.endEffects({name: `${prefix}_*`});
    if(!count) {
        await effect.delete();
        return;
    }
    if(!game.gps.getCprConfig({itemUuid: item.uuid}).animEnabled || !token) return;

    const sequence = new Sequence()
        .effect()
            .attachTo(token)
            .tieToDocuments(effect)
            .file("jb2a.bonfire.02.green")
            .fadeIn(500)
            .fadeOut(500)
            .scaleToObject(2.7)
            .spriteOffset({x: 0, y: 7})
            .persist()
            .belowTokens()
            .name(`${prefix}_background`);
    await effect.setFlag(MODULE_ID, "spellVisual", {kind: "hearth", tokenUuid: token.document.uuid, itemUuid: item.uuid, color: "green", startedAt: Date.now()});
    await sequence.play();
}

/** Serialize spirit resolution on the GM so simultaneous attacks cannot spend the same spirit. */
export async function resolveHearthSpirit({effectUuid, activation, hit}) {
    const previous = spiritUpdates.get(effectUuid) ?? Promise.resolve();
    const pending = previous.catch(() => {}).then(async () => {
        const effect = await fromUuid(effectUuid);
        if(!effect?.active || effect.getFlag(MODULE_ID, "gpsUuid") !== EFFECT_ID) return;
        const state = effect.getFlag(MODULE_ID, "hearthSpirits");
        if(state?.activation !== activation) return;
        const remaining = Number(state?.remaining);
        if(!Number.isInteger(remaining) || remaining < 1) return;
        if(!hit) return {remaining};
        const next = remaining - 1;
        await effect.update({[`flags.${MODULE_ID}.hearthSpirits.remaining`]: next});
        if(!next) await effect.delete();
        return {remaining: next};
    });
    spiritUpdates.set(effectUuid, pending);
    try {
        return await pending;
    } finally {
        if(spiritUpdates.get(effectUuid) === pending) spiritUpdates.delete(effectUuid);
    }
}

/** Activate Drawing the Hearth and resolve attacks redirected toward its remaining spirits. */
export async function drawingTheHearth({actor, token, item, args, workflow, macroItem}) {
    item = macroItem ?? item;
    const pass = args?.[0]?.macroPass;
    const effect = actor.appliedEffects.find(candidate => candidate.getFlag(MODULE_ID, "gpsUuid") === EFFECT_ID
        && DAE.effectMatchesSource(candidate, item.uuid));
    if(!effect) return;
    if(pass === "postActiveEffects" && !workflow.aborted) return initializeSpirits({actor, token, item, effect});
    const state = effect.getFlag(MODULE_ID, "hearthSpirits");
    if(pass !== "isAttacked" || !workflow.token?.actor || !(state?.remaining > 0)) return;
    const activation = state.activation;

    const [save] = await workflow.token.actor.rollSavingThrow({ability: "cha"}) ?? [];
    if(!save || save.total >= actor.system.attributes.spell.dc) return;
    const hit = !workflow.isFumble && (workflow.isCritical || workflow.attackTotal >= 10 + actor.system.attributes.prof);
    const gm = game.gps.getPrimaryGM();
    if(!gm) return;
    const result = await game.gps.queryUser("resolveHearthSpirit", gm, {effectUuid: effect.uuid, activation, hit});
    if(!result) return;
    workflow.aborted = true;
    const message = hit ? "SootSpiritAttackedHit" : "SootSpiritAttackedMiss";
    await ChatMessage.create({
        user: MidiQOL.playerForActor(actor)?.id ?? game.user.id,
        speaker: ChatMessage.getSpeaker({token}),
        content: game.i18n.format(`GAMBITSPREMADES.ChatMessages.Automations.ThirdPartyClassFeatures.Witch.CovenOfTheRoilingHearth.${message}`, {sootSpiritsRemaining: result.remaining})
    });
}

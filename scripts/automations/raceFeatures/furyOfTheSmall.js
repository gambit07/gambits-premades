const MODULE_ID = "gambits-premades";
const FEATURE_ID = "9ec968bf-60fe-4d3b-987c-d3dc16206d89";
const requests = new Map();
const prompted = new WeakMap();
/** Isolates mutable damage options and properties; document references stay intact. */
function copyDamage(value) {
    if(value instanceof Set) return new Set(value);
    if(Array.isArray(value)) return value.map(copyDamage);
    if(value && Object.getPrototypeOf(value) === Object.prototype)
        return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, copyDamage(entry)]));
    return value;
}
const loc = key => game.i18n.localize(`GAMBITSPREMADES.FuryOfTheSmall.${key}`);
const feature = actor => actor?.items.find(item => item.getFlag(MODULE_ID, "gpsUuid") === FEATURE_ID);
const size = actor => CONFIG.DND5E.actorSizes[actor?.system.traits.size]?.numerical;
const larger = (actor, target) => ["character", "npc"].includes(target?.type) && Number.isFinite(size(actor)) && size(target) > size(actor);
const turnKey = () => game.combat?.started ? `${game.combat.id}:${game.combat.round}:${game.combat.turn}` : null;
const available = item => item && Number(item.system.uses.max) > Number(item.system.uses.spent);
const damaging = entry => CONFIG.DND5E.damageTypes[entry.type] && Number(entry.value) > 0;
const total = entries => entries.reduce((sum, entry) => sum + (!["healing", "temphp", "maximum", "vitality", "midi-none"].includes(entry.type) ? Number(entry.value) || 0 : 0), 0);

/** Register the target-specific damage offer before damage is applied. */
export function registerFuryOfTheSmallHooks() {
    Hooks.on("midi-qol.preTargetDamageApplication", furyOfTheSmall);
}

/** Serialize offers and resource consumption on the primary GM. */
export async function requestFuryOfTheSmall(data) {
    const item = await fromUuid(data.itemUuid);
    const actor = item?.actor;
    if(!actor) return;
    const previous = requests.get(actor.uuid) ?? Promise.resolve();
    const pending = previous.catch(() => undefined).then(() => offerFury(item, data));
    requests.set(actor.uuid, pending);
    try {
        return await pending;
    } finally {
        if(requests.get(actor.uuid) === pending) requests.delete(actor.uuid);
    }
}

/** Offer the source owner a damage type and atomically record the accepted use. */
async function offerFury(item, {sourceUuid, targetUuid, turn, workflowId, bonus, choices}) {
    const actor = item.actor;
    const source = await fromUuid(sourceUuid);
    const target = await fromUuid(targetUuid);
    const valid = () => actor.items.get(item.id) === item && item.getFlag(MODULE_ID, "gpsUuid") === FEATURE_ID
        && source?.actor?.uuid === actor.uuid && larger(actor, target?.actor) && available(item)
        && Number(actor.system.attributes.prof) === bonus && turn === turnKey()
        && actor.getFlag(MODULE_ID, "furyOfTheSmallUse")?.workflowId !== workflowId
        && (!turn || actor.getFlag(MODULE_ID, "furyOfTheSmallUse")?.turn !== turn);
    if(!workflowId || !(bonus > 0) || !valid() || !Array.isArray(choices)) return;
    choices = [...new Set(choices)].filter(type => CONFIG.DND5E.damageTypes[type]);
    if(!choices.length) return;
    const browserUser = game.gps.getBrowserUser({actorUuid: actor.uuid});
    if(!browserUser) return;
    const gmUser = game.gps.getPrimaryGM();
    const escape = foundry.utils.escapeHTML;
    const dialogId = `fury-of-the-small-${foundry.utils.randomID()}`;
    const remaining = Number(item.system.uses.max) - Number(item.system.uses.spent);
    const dialogContent = `<div class="gps-dialog-container"><div class="gps-dialog-section"><div class="gps-dialog-content">
        <div class="gps-dialog-flex"><div><p class="gps-dialog-paragraph">${game.i18n.format("GAMBITSPREMADES.FuryOfTheSmall.Prompt", {target: escape(target.name), bonus, remaining})}</p>
        ${choices.length > 1 ? `<fieldset><legend>${loc("DamageType")}</legend>${choices.map((type, index) => `<label class="gps-dialog-paragraph"><input type="radio" name="ability-check" value="${escape(type)}" ${index === 0 ? "checked" : ""}> ${escape(game.i18n.localize(CONFIG.DND5E.damageTypes[type].label))}</label>`).join("<br>")}</fieldset>` : ""}</div>
        <div class="gps-dialog-image-container"><img src="${escape(item.img)}" class="gps-dialog-image"></div></div>
        </div></div></div>`;
    const common = {dialogTitle: `${actor.name} | ${item.name}`, dialogContent, dialogId, initialTimeLeft: 15, validTokenPrimaryUuid: sourceUuid, focusTokenUuid: targetUuid};
    const result = game.settings.get(MODULE_ID, "Mirror 3rd Party Dialog for GMs") && browserUser !== gmUser
        ? await game.gps.handleDialogPromises({userDialogArgs: {...common, source: "user", type: "multiDialog", browserUser},
            gmDialogArgs: {...common, dialogTitle: game.i18n.format("GAMBITSPREMADES.Dialogs.Common.WaitingForSelection", {actorName: actor.name, itemName: item.name}), source: "gm", type: "multiDialog"}})
        : await game.gps.queryDialog("process3rdPartyReactionDialog", browserUser, {...common, source: browserUser === gmUser ? "gm" : "user", type: "singleDialog"});
    const type = choices.length === 1 ? choices[0] : result?.abilityCheck;
    if(!result?.userDecision || !choices.includes(type) || !valid()) return;
    await actor.update({items: [{_id: item.id, "system.uses.spent": Number(item.system.uses.spent) + 1}],
        [`flags.${MODULE_ID}.furyOfTheSmallUse`]: {turn, workflowId}});
    return {type, bonus};
}

/** Compare damage calculations with and without the bonus in its original damage part. */
function damagePlans(actor, damage, bonus, workflow, target) {
    const {damages, options, calculatedDamages} = damage;
    const plans = new Map();
    if(!Array.isArray(damages) || !options || !Array.isArray(calculatedDamages)) return plans;
    const {singleDamageCalculation: together, singleConcentrationRoll} = MidiQOL.configSettings();
    let combined = damages;
    if(together && !singleConcentrationRoll && workflow?.otherDamageRolls && target) {
        const buckets = [["defaultDamage", () => workflow.damageDetail], ["otherDamage", () => workflow.otherDamageFor(target)], ["bonusDamage", () => workflow.bonusDamageDetail]];
        combined = buckets.flatMap(([category, source]) => {
            const onCard = damages.filter(entry => entry.midiCategory === category);
            return onCard.length ? onCard : (source() ?? []).filter(entry => entry.type !== "midi-none")
                .map(entry => ({...entry, midiCategory: category}));
        });
    }
    const baseline = new Map();
    for(const [index, part] of damages.entries()) {
        if(!damaging(part) || plans.has(part.type) || !calculatedDamages.some(entry =>
            entry.type === part.type && damaging(entry) && (together || entry.midiCategory === part.midiCategory))) continue;
        const key = together ? "all" : part.midiCategory;
        const group = together ? combined : damages.filter(entry => entry.midiCategory === part.midiCategory);
        if(!baseline.has(key)) baseline.set(key, actor.calculateDamage(copyDamage(group), copyDamage(options)));
        const before = baseline.get(key);
        if(!Array.isArray(before)) continue;
        const value = Number(part.value) + bonus;
        const updated = {...part, value, damage: value, formula: `${part.formula || part.value} + ${bonus}`};
        const after = actor.calculateDamage(copyDamage(group.map(entry => entry === part ? updated : entry)), copyDamage(options));
        if(!Array.isArray(after)) continue;
        const delta = total(after) - total(before);
        if(!Number.isFinite(delta) || delta <= 0) continue;
        const calculated = after.find(entry => entry.type === part.type && entry.midiCategory === part.midiCategory
            && (part.properties?.size ?? 0) === (entry.properties?.size ?? 0)
            && [...(part.properties ?? [])].every(property => entry.properties?.has(property)));
        plans.set(part.type, {index, updated, delta, active: calculated?.active, potential: calculated?.potential});
    }
    return plans;
}

/** Updates only this target's card. Midi derives HP and temporary HP from the calculated delta. */
function applyBonus(damage, plan, type, bonus, name) {
    damage.damages = damage.damages.map((entry, i) => i === plan.index ? plan.updated : entry);
    const entry = MidiQOL.modifyDamageBy({damageItem: damage, type, value: plan.delta,
        multiplier: plan.delta / bonus, reason: `${name} (+${bonus})`});
    Object.assign(entry, {active: {...plan.active, ...entry.active}, potential: copyDamage(plan.potential ?? {}),
        properties: new Set(plan.updated.properties ?? []), midiCategory: plan.updated.midiCategory, formula: String(bonus)});
}

/** Add Fury only to a larger creature damaged by this attack or spell. */
export async function furyOfTheSmall(target, {workflow, damageItem} = {}) {
    if(!workflow || workflow.aborted || (!workflow.activity?.hasAttack && workflow.item?.type !== "spell")) return;
    target = game.gps.tokenDocument(target);
    if(!target?.actor || !workflow.tokenDocument || !damageItem?.wasHit || !(damageItem.totalDamage > 0)
        || !(damageItem.hpDamage > 0 || damageItem.tempDamage > 0)) return;
    const actor = workflow.actor;
    const item = feature(actor);
    const turn = turnKey();
    if(!available(item) || !larger(actor, target.actor) || !workflow.id) return;
    const used = actor.getFlag(MODULE_ID, "furyOfTheSmallUse");
    if(used?.workflowId === workflow.id || (turn && used?.turn === turn)) return;
    const seen = prompted.get(workflow) ?? new Set();
    if(seen.has(target.uuid)) return;
    const bonus = Number(actor.system.attributes.prof);
    if(!(bonus > 0)) return;
    const plans = damagePlans(target.actor, damageItem, bonus, workflow, target);
    if(!plans.size) return;
    seen.add(target.uuid);
    prompted.set(workflow, seen);
    const result = await game.gps.queryUser("requestFuryOfTheSmall", game.gps.getPrimaryGM(), {
        itemUuid: item.uuid, sourceUuid: workflow.tokenDocument.uuid, targetUuid: target.uuid,
        turn, workflowId: workflow.id, bonus, choices: [...plans.keys()]
    });
    if(!result || workflow.aborted || !plans.has(result.type)) return;
    applyBonus(damageItem, plans.get(result.type), result.type, bonus, item.name);
}

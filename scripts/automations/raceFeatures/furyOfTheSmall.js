const MODULE_ID = "gambits-premades";
const FEATURE_ID = "9ec968bf-60fe-4d3b-987c-d3dc16206d89";
const requests = new Map();
const prompted = new WeakMap();
const clone = value => foundry.utils.deepClone(value);
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
function damagePlans(actor, damage, bonus) {
    const details = damage.damageDetails;
    const config = MidiQOL.configSettings();
    const selector = damage.damageSelector;
    const buckets = ["defaultDamage", "otherDamage", "bonusDamage"];
    const included = selector === "otherDamage" ? ["otherDamage"]
        : config.singleConcentrationRoll ? buckets : ["defaultDamage", "bonusDamage"];
    const plans = new Map();
    const baseline = new Map();
    for(const bucket of included) {
        const raw = details?.[`raw${bucket}`] ?? [];
        for(const [index, part] of raw.entries()) {
            if(!damaging(part) || plans.has(part.type) || !damage.damageDetail.some(entry => entry.type === part.type && damaging(entry))) continue;
            const calculationBuckets = config.singleDamageCalculation ? buckets : [bucket];
            const key = calculationBuckets.join();
            const options = details.calcDamageOptions[bucket] ?? damage.calcDamageOptions;
            if(!options) continue;
            const original = calculationBuckets.flatMap(name => clone(details[`raw${name}`] ?? []));
            if(!baseline.has(key)) baseline.set(key, actor.calculateDamage(original, clone(options)));
            const before = baseline.get(key);
            if(!Array.isArray(before)) continue;
            const updated = clone(raw);
            updated[index].value = Number(part.value) + bonus;
            updated[index].damage = updated[index].value;
            updated[index].formula = `${part.formula || part.value} + ${bonus}`;
            const augmented = calculationBuckets.flatMap(name => clone(name === bucket ? updated : details[`raw${name}`] ?? []));
            const after = actor.calculateDamage(augmented, clone(options));
            if(!Array.isArray(after)) continue;
            const delta = total(after) - total(before);
            if(!Number.isFinite(delta) || delta < 0) continue;
            plans.set(part.type, {bucket, updated, included, delta, properties: new Set(part.properties ?? [])});
        }
    }
    return plans;
}

/** Keep the damage card and HP preview consistent without a second damage application. */
function applyBonus(actor, damage, plan, type, bonus, name) {
    const details = damage.damageDetails;
    details[`raw${plan.bucket}`] = plan.updated;
    damage.rawDamageDetail = plan.included.flatMap(bucket => clone(details[`raw${bucket}`] ?? []));
    details[`raw${damage.damageSelector}`] = damage.rawDamageDetail;
    damage.damageDetail = [...damage.damageDetail, {type, value: plan.delta, properties: plan.properties,
        active: {multiplier: plan.delta / bonus}, formula: String(bonus)}];
    details[damage.damageSelector] = damage.damageDetail;
    damage.details ??= [];
    damage.details.push(`${name} (+${bonus})`);
    const hp = actor.system.attributes.hp;
    const healing = damage.damageDetail.reduce((sum, entry) => sum + (entry.type === "healing" ? entry.value : 0), 0);
    const temporary = damage.damageDetail.reduce((sum, entry) => sum + (entry.type === "temphp" ? entry.value : 0), 0);
    damage.totalDamage = Math.max(0, total(damage.damageDetail));
    const amount = Math.trunc(damage.totalDamage + healing);
    const tempLoss = Math.min(hp.temp ?? 0, Math.max(0, amount));
    damage.healingAdjustedTotalDamage = amount;
    damage.hpDamage = Math.clamp(amount - tempLoss, -(hp.damage ?? 0), hp.value);
    damage.newHP = hp.value - damage.hpDamage;
    damage.newTempHP = Math.floor(Math.max(0, (hp.temp ?? 0) - tempLoss, temporary));
    damage.tempDamage = (hp.temp ?? 0) - damage.newTempHP;
}

/** Add Fury only to a larger creature damaged by this attack or spell. */
export async function furyOfTheSmall(target, {workflow, damageItem} = {}) {
    if(!workflow || workflow.aborted || (!workflow.activity?.hasAttack && workflow.item?.type !== "spell")) return;
    if(!target?.actor || !workflow.token?.document || !damageItem?.wasHit || !(damageItem.totalDamage > 0)
        || !(damageItem.hpDamage > 0 || damageItem.tempDamage > 0)) return;
    const actor = workflow.actor;
    const item = feature(actor);
    const turn = turnKey();
    if(!available(item) || !larger(actor, target.actor) || !workflow.id) return;
    const used = actor.getFlag(MODULE_ID, "furyOfTheSmallUse");
    if(used?.workflowId === workflow.id || (turn && used?.turn === turn)) return;
    const seen = prompted.get(workflow) ?? new Set();
    if(seen.has(target.document.uuid)) return;
    const bonus = Number(actor.system.attributes.prof);
    if(!(bonus > 0)) return;
    const plans = damagePlans(target.actor, damageItem, bonus);
    if(!plans.size) return;
    seen.add(target.document.uuid);
    prompted.set(workflow, seen);
    const result = await game.gps.queryUser("requestFuryOfTheSmall", game.gps.getPrimaryGM(), {
        itemUuid: item.uuid, sourceUuid: workflow.token.document.uuid, targetUuid: target.document.uuid,
        turn, workflowId: workflow.id, bonus, choices: [...plans.keys()]
    });
    if(!result || workflow.aborted || !plans.has(result.type)) return;
    applyBonus(target.actor, damageItem, plans.get(result.type), result.type, bonus, item.name);
}

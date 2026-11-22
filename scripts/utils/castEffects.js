const gps = "gambits-premades";
const concentrating = effect => effect?.statuses?.has(CONFIG.specialStatusEffects.CONCENTRATING);
const lookup = uuid => uuid && fromUuidSync(uuid, {strict: false});

function belongsToCast(effect, actor, item) {
    if(!effect?.active || !concentrating(effect) || effect.parent?.uuid !== actor?.uuid) return false;
    const source = effect.flags.dnd5e?.item;
    return source?.uuid ? source.uuid === item.uuid : source?.id === item.id && item.actor?.uuid === actor.uuid;
}

export function itemConcentrations(actor, item) {
    return actor.effects.filter(effect => belongsToCast(effect, actor, item));
}

/** Follow the recorded cast. A missing or superseded parent must never resolve to a replacement. */
export function castConcentration(actor, item, {workflow, effect, allowUnique = false} = {}) {
    if(!actor || !item) return;
    if(workflow) {
        if(allowUnique && !workflow.concentrationId && !workflow.itemCardUuid && !workflow.chatCard && !workflow.deferredConcentration) {
            const candidates = itemConcentrations(actor, item);
            if(candidates.length === 1) return candidates[0];
        }
        const marker = actor.effects.get(workflow.concentrationId ?? "");
        return belongsToCast(marker, actor, item) ? marker : undefined;
    }
    const visited = new Set();
    let link = effect;
    while(link && !visited.has(link.uuid)) {
        visited.add(link.uuid);
        if(concentrating(link)) return belongsToCast(link, actor, item) ? link : undefined;
        const parent = link.flags?.[gps]?.holyAuraCast ?? link.flags?.dnd5e?.dependentOn
            ?? DAE.getEffectSource(link).controllingEffectUuid;
        if(!parent) break;
        link = lookup(parent);
        if(!link) return;
    }
    const message = effect && DAE.getEffectSource(effect).messageUuid;
    if(message) {
        const marker = actor.effects.get(lookup(message)?.system?.concentration ?? "");
        return belongsToCast(marker, actor, item) ? marker : undefined;
    }
}

/** Find one applied copy, rejecting effects from a different cast or usage card. */
export function appliedSpellEffect(actor, item, {cast, workflow, matches = () => true} = {}) {
    if(!actor || !item) return;
    const message = workflow?.itemCardUuid;
    const found = actor.appliedEffects.filter(e => e.active && !concentrating(e) && DAE.effectMatchesSource(e, item.uuid) && matches(e));
    const exact = found.filter(e => {
        const card = DAE.getEffectSource(e).messageUuid;
        if(card && message && card !== message) return false;
        if(cast) {
            if(castConcentration(item.actor, item, {effect: e})?.uuid === cast.uuid) return true;
            if(e.flags?.dnd5e?.dependentOn || DAE.getEffectSource(e).controllingEffectUuid) return false;
        }
        return message && card === message;
    });
    if(exact.length === 1) return exact[0];
    if(!cast && !message && found.length === 1) return found[0];
}

/** Delete the captured document, including saves rolled by someone who does not own its actor. */
export async function removeAppliedEffect(effect) {
    if(!effect || !effect.parent?.effects.has(effect.id)) return;
    if(effect.isOwner) await effect.delete();
    else await MidiQOL.socket().executeAsGM("removeEffects", {actorUuid: effect.parent.uuid, effects: [effect.id]});
}

/** Create each helper on its recipient and remember the UUIDs for cold, unlinked actors. */
export function grantEffectItems(parent, recipients, data, same = i => i.flags[gps]?.gpsUuid === data.flags[gps]?.gpsUuid) {
    return withEffectLock("items:" + parent.uuid, () => createGrantedItems(parent, recipients, data, same));
}

async function createGrantedItems(parent, recipients, data, same) {
    if(!lookup(parent.uuid)?.active) return;
    const actors = new Map(recipients.filter(t => t.actor).map(t => [t.actor.uuid, t.actor]));
    const previous = parent.getFlag(gps, "grantedItemUuids") ?? [];
    const grants = [];
    for(const actor of actors.values()) {
        if(actor.items.some(i => i.flags[gps]?.ownerEffectUuid === parent.uuid && same(i))) continue;
        const id = foundry.utils.randomID();
        grants.push({actor, id, uuid: actor.uuid + ".Item." + id});
    }
    if(!grants.length) return;
    await parent.setFlag(gps, "grantedItemUuids", [...new Set([...previous, ...grants.map(g => g.uuid)])]);
    for(const {actor, id} of grants) {
        if(!lookup(parent.uuid)?.active) break;
        const [helper] = await actor.createEmbeddedDocuments("Item", [{...data, _id: id,
            flags: {...data.flags, [gps]: {...data.flags[gps], ownerEffectUuid: parent.uuid}}}], {keepId: true});
        if(helper && !lookup(parent.uuid) && actor.items.has(helper.id)) await helper.delete();
    }
}

/** Delete Items separately: dnd5e 6.1 groups native dependents by actor even when their document types differ. */
export async function deleteGrantedEffectItems(effect) {
    const uuids = effect.flags[gps]?.grantedItemUuids;
    if(!uuids?.length || game.user !== game.users.activeGM) return;
    const groups = new Map();
    for(const uuid of uuids) {
        const item = lookup(uuid);
        if(item?.documentName !== "Item" || item.flags[gps]?.ownerEffectUuid !== effect.uuid) continue;
        const actor = item.parent;
        if(!groups.has(actor)) groups.set(actor, []);
        groups.get(actor).push(item.id);
    }
    for(const [actor, ids] of groups) {
        const existing = ids.filter(id => actor.items.get(id)?.flags[gps]?.ownerEffectUuid === effect.uuid);
        if(existing.length) await actor.deleteEmbeddedDocuments("Item", existing);
    }
}

const effectTasks = new Map();

/** Serialize updates to a single application without blocking other casts. */
export async function withEffectLock(uuid, action) {
    const last = effectTasks.get(uuid) ?? Promise.resolve();
    const task = last.catch(() => {}).then(action);
    effectTasks.set(uuid, task);
    try { return await task; }
    finally { if(effectTasks.get(uuid) === task) effectTasks.delete(uuid); }
}

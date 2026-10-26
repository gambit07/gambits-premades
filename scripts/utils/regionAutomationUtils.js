const statusUpdates = new Map();

export function regionStatusEffects(token, regionUuid, status = "restrained") {
    return Array.from(token?.actor?.effects ?? []).filter(effect =>
        effect.flags["gambits-premades"]?.regionUuid === regionUuid && effect.statuses.has(status));
}

export async function setRegionStatus({tokenUuid, regionUuid, status = "restrained", active}) {
    const key = `${tokenUuid}:${regionUuid}:${status}`;
    const previous = statusUpdates.get(key) ?? Promise.resolve();
    const update = previous.catch(() => {}).then(async () => {
        const token = await fromUuid(tokenUuid);
        if(!token?.actor) return;
        const effects = regionStatusEffects(token, regionUuid, status);
        if(!active) {
            if(effects.length) await token.actor.deleteEmbeddedDocuments("ActiveEffect", effects.map(effect => effect.id));
            const items = token.actor.items.filter(item => item.flags["gambits-premades"]?.regionEscape?.regionUuid === regionUuid);
            if(items.length) await token.actor.deleteEmbeddedDocuments("Item", items.map(item => item.id));
            return;
        }
        if(effects.length) return;
        const region = await fromUuid(regionUuid);
        const item = await fromUuid(region?.getFlag("dnd5e", "item"));
        if(!region || !item) return;
        const concentration = MidiQOL.getConcentrationEffect(item.actor, item.uuid);
        const condition = CONFIG.statusEffects.find(effect => effect.id === status);
        const data = {
            name: `${item.name}: ${game.i18n.localize(condition?.name ?? status)}`,
            img: condition?.img ?? item.img, origin: item.uuid, statuses: [status], transfer: false,
            flags: {"gambits-premades": {regionUuid}, dnd5e: concentration ? {dependentOn: concentration.uuid} : {}}
        };
        await token.actor.createEmbeddedDocuments("ActiveEffect", [data]);
        await game.gps.ensureRegionEscape({tokenUuid, regionUuid});
    });
    statusUpdates.set(key, update);
    try { return await update; }
    finally { if(statusUpdates.get(key) === update) statusUpdates.delete(key); }
}

export function regionTurnKey(turnData) {
    const combat = turnData?.combat ?? game.combat;
    return `${combat?.id}:${turnData?.round ?? combat?.round}:${turnData?.turn ?? combat?.turn}`;
}

export function regionEventUser(regionScenario, userId) {
    return regionScenario?.startsWith("tokenTurn") ? game.gps.getPrimaryGM() : userId;
}

export async function cleanupRegionStatuses(region) {
    if(game.user.id !== game.gps.getPrimaryGM()) return;
    const actors = new Map(Array.from(game.actors ?? [], actor => [actor.uuid, actor]));
    const matchesEffect = effect => effect.flags?.["gambits-premades"]?.regionUuid === region.uuid;
    const matchesItem = item => item.flags?.["gambits-premades"]?.regionEscape?.regionUuid === region.uuid;
    const baseActors = new Set([...actors.values()].filter(actor => actor.effects.some(matchesEffect) || actor.items.some(matchesItem)).map(actor => actor.id));
    for(const scene of game.scenes ?? []) for(const token of scene.tokens) {
        if(token.actorLink) continue;
        const source = token._source;
        if(!baseActors.has(source.actorId) && !source.delta?.effects?.some(matchesEffect) && !source.delta?.items?.some(matchesItem)) continue;
        const actor = token.actor;
        if(actor) actors.set(actor.uuid, actor);
    }
    for(const actor of actors.values()) {
        const ids = actor.effects.filter(matchesEffect).map(effect => effect.id);
        if(ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
        const items = actor.items.filter(matchesItem);
        if(items.length) await actor.deleteEmbeddedDocuments("Item", items.map(item => item.id));
    }
}

export async function claimRegionEscape({tokenUuid, regionUuid, turnKey}) {
    const key = `escape:${tokenUuid}:${regionUuid}`;
    const previous = statusUpdates.get(key) ?? Promise.resolve();
    const claim = previous.catch(() => {}).then(async () => {
        const region = await fromUuid(regionUuid);
        const token = await fromUuid(tokenUuid);
        if(!region || !token?.actor || !turnKey || !regionStatusEffects(token, regionUuid).length) return false;
        const flag = `regionTurns.escapePrompt.${token.id}`;
        if(region.getFlag("gambits-premades", flag) === turnKey) return false;
        await region.setFlag("gambits-premades", flag, turnKey);
        return true;
    });
    statusUpdates.set(key, claim);
    try { return await claim; }
    finally { if(statusUpdates.get(key) === claim) statusUpdates.delete(key); }
}

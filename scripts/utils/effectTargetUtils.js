import {tokenDocument} from "./tokenUtils.js";

/** Resolves the scene token even when a DAE macro has no canvas object. */
export function effectToken(token, context, actor) {
    const matches = doc => doc?.parent?.documentName === "Scene" && (!actor || doc.actor?.uuid === actor.uuid);
    if(context?.turn && context.tokenId) {
        const combatant = game.combat?.combatants.find(c => c.tokenId === context.tokenId && c.actor?.uuid === actor?.uuid);
        if(matches(combatant?.token)) return combatant.token;
    }
    const passed = tokenDocument(token);
    if(matches(passed) && (!context?.tokenUuid || passed.uuid === context.tokenUuid)) return passed;
    const saved = context?.tokenUuid && fromUuidSync(context.tokenUuid, {strict: false});
    if(matches(saved)) return saved;
    if(matches(actor?.token)) return actor.token;
    if(matches(passed)) return passed;
}

/** Distance between two token footprints in scene units, independent of the viewed canvas. */
export function spaceTest(source, range, from = source._source) {
    const scene = source.parent;
    const grid = scene.grid;
    const size = source.getSize(from);
    const scale = grid.distance / grid.size;
    let cells;
    return target => {
        const to = target._source;
        if(source === target || scene !== target.parent || from.level !== to.level) return false;
        const other = target.getSize(to);
        const dx = Math.max(from.x - to.x - other.width, to.x - from.x - size.width) * scale;
        const dy = Math.max(from.y - to.y - other.height, to.y - from.y - size.height) * scale;
        const dz = Math.max(from.elevation - to.elevation - target.depth * grid.distance,
            to.elevation - from.elevation - source.depth * grid.distance);
        if(grid.isGridless) return range === 0 ? Math.max(dx, dy, dz) < 0
            : Math.hypot(Math.max(0, dx), Math.max(0, dy), Math.max(0, dz)) <= range;
        if(Math.max(dx, dy, dz) > range + grid.distance) return false;
        cells ??= source.getOccupiedGridSpaceOffsets(from);
        const occupied = target.getOccupiedGridSpaceOffsets(to);
        return cells.some(a => occupied.some(b => range === 0 ? a.i === b.i && a.j === b.j && a.k === b.k
            : grid.measurePath([grid.getCenterPoint(a), grid.getCenterPoint(b)]).distance <= range));
    };
}

export function sharesCreatureSpace(doc) {
    const occupies = spaceTest(doc, 0);
    return doc.parent.tokens.some(other => ["character", "npc"].includes(other.actor?.type) && occupies(other));
}

/** Keep Midi's proximity checks for drawn tokens, and measure undrawn recipients on their own scene. */
export function nearbyChainRecipients(source, feet, visited) {
    const range = game.gps.convertFromFeet({range: feet, scene: source.parent});
    const drawn = source.object && source.parent === canvas.scene
        ? new Set(MidiQOL.findNearby(null, source.object, range, {includeToken: false}).map(t => tokenDocument(t)?.uuid)) : null;
    const nearby = spaceTest(source, range);
    return source.parent.tokens.filter(target => target !== source && target.actor && target.disposition === source.disposition
        && target._source.level === source._source.level && !visited.includes(target.actor.uuid)
        && !target.actor.statuses.has("antimagic") && (drawn && target.object ? drawn.has(target.uuid)
            : !MidiQOL.checkIncapacitated(target.actor) && nearby(target)));
}

export async function setEffectFlag(effect, key, value) {
    if(effect.isOwner) return effect.setFlag("gambits-premades", key, value);
    return game.gps.queryGM("gmSetFlag", {flagDocumentUuid: effect.uuid, key, value});
}

/** Apply the copy before retiring the current recipient's effect. */
export async function moveChainEffect(effect, target, key, state) {
    const data = effect.toObject();
    delete data._id;
    data.flags["gambits-premades"] ??= {};
    data.flags["gambits-premades"][key] = state;
    await MidiQOL.socket().executeAsGM("createEffects", {actorUuid: target.actor.uuid, effects: [data]});
    await MidiQOL.socket().executeAsGM("removeEffects", {actorUuid: effect.parent.uuid, effects: [effect.id]});
}

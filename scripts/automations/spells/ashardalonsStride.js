import {castConcentration} from "../../utils/castEffects.js";
import {spaceTest} from "../../utils/effectTargetUtils.js";

const MODULE = "gambits-premades";
const ID = "ef27f042-ba6d-4ff4-ac2b-4ca6ff611c17";
const pending = new Map();

/** A global encounter has no scene. Once cast, keep its turn even if the GM views another encounter. */
function strideCombat(doc, combatId) {
    const sceneId = doc.parent.id;
    const applies = c => c?.started && (!c.scene || c.scene.id === sceneId);
    if(combatId) {
        const combat = game.combats.get(combatId);
        return applies(combat) ? combat : undefined;
    }
    const viewed = game.combat;
    const includesCaster = c => c.combatants.some(t => t.sceneId === sceneId && t.tokenId === doc.id);
    if(applies(viewed) && includesCaster(viewed)) return viewed;
    return game.combats.find(c => c.active && applies(c) && includesCaster(c)) ?? (applies(viewed) ? viewed : undefined);
}

export async function ashardalonsStride({actor, token, tokenDocument, item, args, workflow}) {
    const doc = tokenDocument ?? game.gps.tokenDocument(token);
    const combat = doc?.parent ? strideCombat(doc) : game.combat;
    if(args[0]?.macroPass === "preItemRoll" && !combat?.started) {
        ui.notifications.warn(game.i18n.format("GAMBITSPREMADES.Notifications.Common.RequiresActiveCombat", {effectName: item.name}));
        return workflow.aborted = true;
    }
    if(args[0]?.macroPass !== "preActiveEffects" || !doc?.parent || !combat?.started) return;
    const concentration = castConcentration(actor, item, {workflow, allowUnique: true});
    if(!concentration?.active) return;
    const level = workflow.castData.castLevel || workflow.castData.baseLevel;
    const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [{
        name: item.name, img: item.img, origin: concentration.uuid, duration: {value: 60, units: "seconds"}, transfer: false,
        system: {magical: true, changes: [
            {key: "system.attributes.movement.speeds.walk", type: "add", value: 20 + Math.max(0, level - 3) * 5, priority: 20},
            {key: "flags.gambits-premades.oaImmunity", type: "override", value: "true", priority: 20}
        ]}, flags: {
            dnd5e: {dependentOn: concentration.uuid},
            dae: {stackable: "noneName"},
            [MODULE]: {gpsUuid: ID, stride: {itemUuid: item.uuid, tokenUuid: doc.uuid, level, combatId: combat.id}}
        }
    }]);
    if(effect && doc.object) await game.gps.animation.ashardalonsStride({type: "use", token: doc.object, itemUuid: item.uuid, effectUuid: effect.uuid});
}

/** Only the distance actually traversed counts; discarded waypoints and teleports do not. */
function* traversed(doc, movement) {
    const grid = doc.parent.grid;
    let prev = movement.origin;
    let sampledPrevious = false;
    for(const end of movement.passed.waypoints) {
        if(prev.level === end.level && !CONFIG.Token.movement.actions[end.action]?.teleport
            && (prev.x !== end.x || prev.y !== end.y || prev.elevation !== end.elevation)) {
            if(!sampledPrevious) yield prev;
            if(grid.isGridless) {
                const steps = Math.max(1, Math.ceil(2 * Math.max(Math.hypot(end.x - prev.x, end.y - prev.y) / grid.size,
                    Math.abs(end.elevation - prev.elevation) / grid.distance)));
                for(let i = 1; i < steps; i++) yield {...end, x: prev.x + (end.x - prev.x) * i / steps,
                    y: prev.y + (end.y - prev.y) * i / steps, elevation: prev.elevation + (end.elevation - prev.elevation) * i / steps};
            }
            // moveToken already supplies the intermediate grid spaces for committed movement.
            yield end;
            sampledPrevious = true;
        } else sampledPrevious = false;
        prev = end;
    }
}

export function strideMoved(doc, movement) {
    if(!game.user.isGM || !game.combats.some(c => c.started && (!c.scene || c.scene.id === doc.parent.id))
        || game.user.id !== game.gps.getPrimaryGM()) return;
    const effect = doc.actor?.effects.find(e => e.active && e.getFlag(MODULE, "gpsUuid") === ID
        && e.getFlag(MODULE, "stride")?.tokenUuid === doc.uuid);
    if(!effect) return;
    const state = effect.getFlag(MODULE, "stride");
    const combat = strideCombat(doc, state.combatId);
    if(!combat) return;
    const turn = [combat.id, combat.round, combat.turn].join(":");
    const feet = game.gps.convertFromFeet({range: 5, scene: doc.parent});
    const candidates = doc.parent.tokens.filter(t => t !== doc && ["character", "npc"].includes(t.actor?.type)
        && !t.actor.statuses.has("antimagic"));
    const hits = new Set();
    for(const step of traversed(doc, movement)) {
        const pos = {...doc._source, ...step};
        const near = spaceTest(doc, feet, pos);
        const level = doc.parent.levels.get(pos.level) ?? doc.parent.initialLevel;
        const origin = doc.getCenterPoint(pos);
        for(const target of candidates) {
            if(hits.has(target) || !near(target)) continue;
            const dest = target.getCenterPoint(target._source);
            if(CONFIG.Canvas.polygonBackends.move.testCollision(origin, dest, {type: "move", mode: "any", level})
                || doc.parent.testSurfaceCollision(origin, dest, {type: "move", mode: "any", level})) continue;
            hits.add(target);
        }
    }
    if(!hits.size) return;
    const previous = pending.get(effect.uuid) ?? Promise.resolve();
    const task = previous.catch(() => {}).then(async () => {
        const live = () => doc.actor?.effects.get(effect.id);
        if(!live()?.active) return;
        const old = live().getFlag(MODULE, "strideHits");
        const used = new Set(old?.turn === turn ? old.targets : []);
        const targets = [...hits].filter(t => !used.has(t.uuid));
        if(!targets.length) return;
        const item = await fromUuid(state.itemUuid);
        const activity = item?.system.activities.find(a => a.identifier === "syntheticDamage");
        if(!activity) return;
        const number = Math.max(1, state.level - 2);
        if(activity.damage.parts[0].number !== number) {
            const parts = activity.toObject().damage.parts;
            parts[0].number = number;
            await game.gps.gpsActivityUpdate({activityUuid: activity.uuid, updates: {"damage.parts": parts}});
        }
        for(const target of targets) {
            if(!live()?.active) return;
            const result = await game.gps.gpsActivityUse({itemUuid: item.uuid, identifier: "syntheticDamage", targetUuid: target.uuid,
                castUuid: effect.flags.dnd5e?.dependentOn, skipTargetConfirmation: true});
            if(!result?.damageTargetUuids?.includes(target.uuid)) continue;
            used.add(target.uuid);
            if(!live()?.active) return;
            await live().setFlag(MODULE, "strideHits", {turn, targets: [...used]});
            if(target.object) void game.gps.animation.ashardalonsStride({type: "damage", token: target.object, itemUuid: item.uuid});
        }
    });
    pending.set(effect.uuid, task);
    return task.finally(() => { if(pending.get(effect.uuid) === task) pending.delete(effect.uuid); });
}

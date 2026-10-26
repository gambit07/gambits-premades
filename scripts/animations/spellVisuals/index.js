import {fragmentShader, fragments, vertexShader} from "./shaders.js";

const MODULE = "gambits-premades";
const durations = {mending: 1280, poisonSpray: 1083, fireSpiral: 1417, fireBeam: 1417, fireExplosion: 1500, cinderBurst: 1000, hearthOrb: 1000, rebukeWings: 2000, strideImpact: 1000, strideRing: 1042, flamesEmbrace: 1292, acidSplash: 1000};
const colors = {orange: 0xff4b08, red: 0xf52216, purple: 0x903de8, blue: 0x168aff, green: 0x70e51e, yellow: 0xffef21, black: 0x000000};
const effectIds = {hearth: "2300dad6-8de1-4fa5-9878-40cec8ee37aa", stride: "ef27f042-ba6d-4ff4-ac2b-4ca6ff611c17", embrace: "c87befde-c36f-4237-b645-e98e1526de42"};
const active = new Map();
const seen = new Map();
let ticker, registered = false, queued = false;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const canSee = token => token && !token.destroyed && token.visible !== false && !token.isFilteredOut && token.isVisible;

export function createSpellVisual({kind, width, height = width, color, opacity = 1}) {
    if(!Object.hasOwn(fragments, kind)) return;
    const hex = typeof color === "number" ? color : colors[color] ?? (kind === "mending" ? colors.yellow : ["poisonSpray", "acidSplash"].includes(kind) ? colors.green : colors.orange);
    const geometry = new PIXI.Geometry()
        .addAttribute("aVertexPosition", [-width / 2, -height / 2, width / 2, -height / 2, width / 2, height / 2, -width / 2, height / 2], 2)
        .addAttribute("aTextureCoord", [0, 0, 1, 0, 1, 1, 0, 1], 2)
        .addIndex([0, 1, 2, 0, 2, 3]);
    const shader = PIXI.Shader.from(vertexShader, fragmentShader(kind), {uTime: 0, uProgress: 0, uOpacity: opacity, uColor: [(hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255]});
    const container = new PIXI.Mesh(geometry, shader);
    container.eventMode = "none";
    container.blendMode = PIXI.BLEND_MODES.NORMAL;
    return {
        container,
        update(elapsed, duration = durations[kind], intensity = 1) {
            shader.uniforms.uTime = elapsed / 1000;
            shader.uniforms.uProgress = clamp(elapsed / duration, 0, 1);
            shader.uniforms.uOpacity = opacity * intensity;
        },
        destroy() {
            if(container.destroyed) return;
            container.destroy();
            shader.destroy();
            geometry.destroy();
        }
    };
}

/** Captures a visible endpoint while retaining token identity for each client's perception checks. */
function location(object) {
    if(!object) return;
    const document = object.document ?? object;
    const point = object.center ?? document.bounds?.center ?? object;
    const x = Number(point.x ?? document.x), y = Number(point.y ?? document.y);
    if(!Number.isFinite(x) || !Number.isFinite(y)) return;
    return {x, y, tokenId: document.documentName === "Token" ? document.id : undefined,
        regionUuid: document.documentName === "Region" ? document.uuid : undefined};
}

/** Sends a transient visual to viewers of the current scene without blocking the item workflow. */
export function spellEffect({kind, at, to, scale = 1, width, height, color, opacity = 1, delay = 0, duration, mode = "point", rotation = 0} = {}) {
    if(!canvas?.ready || !Object.hasOwn(durations, kind)) return 0;
    const start = location(at), end = location(to);
    if(!start || (mode !== "point" && !end)) return 0;
    width ??= (Number(at?.w) || canvas.grid.size) * scale;
    height ??= width;
    duration ??= durations[kind];
    const data = {kind, start, end, width, height, color, opacity, duration, mode, rotation, sceneId: canvas.scene.id,
        animationId: foundry.utils.randomID(), startedAt: Date.now() + Math.max(0, delay)};
    void Promise.allSettled(game.users.filter(user => user.active && user.viewedScene === data.sceneId)
        .map(user => game.gps.queryUser("playSpellVisual", user.id, data)));
    return duration;
}

/** Resolves perception on the receiving client rather than trusting the casting user's visibility. */
function visiblePoint(point) {
    if(point?.tokenId) return canSee(canvas.tokens.get(point.tokenId));
    if(point?.regionUuid && fromUuidSync(point.regionUuid)?.object?.isFilteredOut) return false;
    return point && (game.user.isGM || canvas.visibility?.testVisibility(point, {tolerance: 2}));
}

/** Releases a visual and detaches the shared ticker when the last animation ends. */
function stop(id) {
    const entry = active.get(id);
    active.delete(id);
    entry?.visual.destroy();
    if(!active.size && ticker) {
        ticker.remove(tick);
        ticker = undefined;
    }
}

/** Advances all local spell visuals from wall time so low frame rates cannot prolong playback. */
function tick() {
    const now = Date.now(), intensity = canvas.photosensitiveMode ? 0.45 : 1;
    for(const [id, entry] of active) {
        try {
            if(!canvas.ready || entry.sceneId !== canvas.scene?.id || entry.visual.container.destroyed) {stop(id); continue;}
            if(entry.persistent) {
                if(!entry.effect.active || entry.token.destroyed) {stop(id); continue;}
                const elapsed = now - entry.startedAt;
                entry.visual.container.visible = canSee(entry.token);
                if(!entry.visual.container.visible) continue;
                const p = entry.token.center;
                if(entry.kind === "hearth") {
                    const angle = -Math.PI / 2 + entry.index / entry.count * Math.PI * 2 + Math.max(0, elapsed - 500) / 10000 * Math.PI * 2;
                    const radius = Math.max(entry.token.w, entry.token.h) * 0.95;
                    entry.visual.container.position.set(p.x + Math.cos(angle) * radius, p.y + Math.sin(angle) * radius);
                } else entry.visual.container.position.set(p.x, p.y + (entry.kind === "embrace" ? -entry.token.h / 2 : -30));
                entry.visual.update(elapsed, durations[entry.shaderKind], intensity * Math.min(1, elapsed / 500));
            } else {
                const elapsed = now - entry.startedAt;
                if(elapsed >= entry.duration || !visiblePoint(entry.start) || (entry.end && !visiblePoint(entry.end))) {stop(id); continue;}
                entry.visual.container.visible = elapsed >= 0;
                if(elapsed < 0) continue;
                if(entry.mode === "travel") {
                    const t = clamp(elapsed / entry.duration, 0, 1);
                    entry.visual.container.position.set(entry.start.x + (entry.end.x - entry.start.x) * t, entry.start.y + (entry.end.y - entry.start.y) * t);
                }
                entry.visual.update(elapsed, entry.duration, intensity);
            }
        } catch {stop(id);}
    }
    for(const [id, expires] of seen) if(expires < now) seen.delete(id);
}

/** Adds a visual to the local overlay and starts the single shared ticker. */
function add(id, entry) {
    canvas.interface.addChild(entry.visual.container);
    active.set(id, entry);
    if(!ticker) {
        ticker = canvas.app.ticker;
        ticker.add(tick);
    }
}

/** Validates a remote visual request and starts one copy on the current client. */
export function playSpellVisual(data = {}) {
    if(!canvas?.ready || !canvas.interface || !canvas.app?.ticker || data.sceneId !== canvas.scene?.id
        || !Object.hasOwn(durations, data.kind) || !data.animationId || seen.has(data.animationId)) return false;
    const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
    if(!finitePoint(data.start) || (data.mode !== "point" && !finitePoint(data.end)) || !["point", "beam", "travel"].includes(data.mode)
        || ![data.width, data.height, data.duration, data.startedAt, data.opacity, data.rotation].every(Number.isFinite)
        || data.width <= 0 || data.height <= 0 || data.duration <= 0 || data.duration > 10000
        || data.startedAt > Date.now() + 30000 || data.startedAt + data.duration < Date.now()) return false;
    if(!visiblePoint(data.start) || (data.end && !visiblePoint(data.end))) return false;
    let visual;
    try {
        const distance = data.end ? Math.hypot(data.end.x - data.start.x, data.end.y - data.start.y) : 0;
        const sizeLimit = canvas.grid.size * 100;
        const width = data.mode === "beam" ? Math.max(1, Math.min(sizeLimit, distance)) : Math.min(sizeLimit, data.width);
        visual = createSpellVisual({...data, width, height: Math.min(sizeLimit, data.height), opacity: clamp(data.opacity, 0, 1)});
        const angle = data.end ? Math.atan2(data.end.y - data.start.y, data.end.x - data.start.x) : data.rotation * Math.PI / 180;
        visual.container.rotation = data.mode === "beam" || data.kind === "poisonSpray" ? angle : data.rotation * Math.PI / 180;
        visual.container.position.set(data.mode === "beam" ? (data.start.x + data.end.x) / 2 : data.start.x, data.mode === "beam" ? (data.start.y + data.end.y) / 2 : data.start.y);
        visual.container.visible = false;
        seen.set(data.animationId, Date.now() + 45000);
        add(data.animationId, {...data, visual});
        tick();
        return true;
    } catch {
        visual?.destroy();
        return false;
    }
}

/** Stores persistent visual metadata on the owning effect for reconnection and scene restoration. */
export async function setSpellVisual({effectUuid, tokenUuid, itemUuid, kind, color}) {
    const effect = await fromUuid(effectUuid), token = await fromUuid(tokenUuid), item = await fromUuid(itemUuid);
    if(!effect?.active || effect.getFlag(MODULE, "gpsUuid") !== effectIds[kind] || token?.actor?.uuid !== effect.parent?.uuid || !item) return;
    if(!game.gps.getCprConfig({itemUuid}).animEnabled) return;
    await effect.setFlag(MODULE, "spellVisual", {kind, tokenUuid, itemUuid, color, startedAt: Date.now()});
}

/** Restores effect-owned loops and reconciles the remaining Hearth spirits on this scene. */
export function syncSpellVisuals() {
    if(!canvas?.ready || !canvas.interface || !canvas.app?.ticker) return;
    const wanted = new Set();
    for(const token of canvas.tokens.placeables) for(const effect of token.actor?.appliedEffects ?? []) {
        const data = effect.getFlag(MODULE, "spellVisual");
        if(!effect.active || !data || data.tokenUuid !== token.document.uuid || effect.getFlag(MODULE, "gpsUuid") !== effectIds[data.kind]) continue;
        const spirits = effect.getFlag(MODULE, "hearthSpirits");
        const count = data.kind === "hearth" ? Math.min(64, Math.max(0, Number(spirits?.remaining) || 0)) : 1;
        const shaderKind = {hearth: "hearthOrb", stride: "strideRing", embrace: "flamesEmbrace"}[data.kind];
        for(let index = 0; index < count; index++) {
            const id = `${effect.uuid}:${token.id}:${index}`;
            const width = token.w * (data.kind === "stride" ? 2 : data.kind === "hearth" ? 0.4 : 0.5);
            const signature = JSON.stringify([data, spirits?.activation, spirits?.initial, width]);
            wanted.add(id);
            if(active.get(id)?.signature === signature) {active.get(id).effect = effect; continue;}
            stop(id);
            try {
                const visual = createSpellVisual({kind: shaderKind, width, color: data.color});
                visual.container.visible = false;
                add(id, {visual, persistent: true, effect, token, shaderKind, kind: data.kind, index, count: Math.max(1, Number(spirits?.initial) || count),
                    signature, sceneId: canvas.scene.id, startedAt: Number(data.startedAt) || Date.now()});
            } catch {stop(id);}
        }
    }
    for(const [id, entry] of active) if(entry.persistent && !wanted.has(id)) stop(id);
    tick();
}

/** Registers lifecycle cleanup and coalesces document changes without scanning actors every frame. */
export function registerSpellVisuals() {
    if(registered) return;
    registered = true;
    const schedule = () => {
        if(queued) return;
        queued = true;
        Promise.resolve().then(() => {queued = false; syncSpellVisuals();});
    };
    Hooks.on("canvasReady", schedule);
    Hooks.on("canvasTearDown", () => {for(const id of active.keys()) stop(id); seen.clear();});
    for(const hook of ["createActiveEffect", "updateActiveEffect", "deleteActiveEffect"]) Hooks.on(hook, effect => {
        if(Object.values(effectIds).includes(effect.getFlag(MODULE, "gpsUuid"))) schedule();
    });
    for(const hook of ["drawToken", "destroyToken"]) Hooks.on(hook, schedule);
    Hooks.on("updateToken", (document, changes) => {if("width" in changes || "height" in changes || "actorId" in changes) schedule();});
    Hooks.on("refreshToken", (token, changes) => {if(changes.refreshSize) schedule();});
}
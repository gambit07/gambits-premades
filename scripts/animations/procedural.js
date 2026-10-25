const activeAnimations = new Map();

/** Sends a procedural visual to connected clients without waiting for animation playback. */
export function broadcastTokenAnimation(queryName, {sourceToken, targetToken}) {
    const sceneId = sourceToken?.document?.parent?.id;
    if(!sceneId || targetToken?.document?.parent?.id !== sceneId) return;
    const data = {sceneId, sourceId: sourceToken.id, targetId: targetToken.id, animationId: foundry.utils.randomID()};
    void Promise.allSettled(game.users.filter(user => user.active && user.viewedScene === sceneId)
        .map(user => game.gps.queryUser(queryName, user.id, data)));
}

/** Owns visibility checks, timing, and cleanup for a local visual between two tokens. */
export function playTokenAnimation({sceneId, sourceId, targetId, animationId} = {}, createVisual) {
    if(!canvas?.ready || canvas.scene?.id !== sceneId || !canvas.app?.ticker || !canvas.interface) return false;
    if(!animationId || activeAnimations.has(animationId)) return false;
    const source = canvas.tokens?.get(sourceId), target = canvas.tokens?.get(targetId);
    if(!canDisplayToken(source) || !canDisplayToken(target)) return false;
    const start = source.center, end = target.center;
    if(![start.x, start.y, end.x, end.y].every(Number.isFinite)) return false;
    const gridSize = canvas.grid.size;
    if(!Number.isFinite(gridSize) || gridSize <= 0) return false;
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    const size = Math.max(gridSize * 0.7, Math.min(gridSize * 2, Math.max(target.w, target.h)));
    if(!Number.isFinite(size)) return false;
    const ticker = canvas.app.ticker;
    let visual, teardownHook, timeout, stopped = false;
    const stop = () => {
        if(stopped) return;
        stopped = true;
        ticker.remove(tick);
        if(teardownHook !== undefined) Hooks.off("canvasTearDown", teardownHook);
        clearTimeout(timeout);
        activeAnimations.delete(animationId);
        visual?.destroy();
    };
    const started = performance.now();
    const tick = () => {
        try {
            const elapsed = performance.now() - started;
            if(!canvas.ready || canvas.scene?.id !== sceneId || visual.container.destroyed || elapsed >= visual.duration
                || !canDisplayToken(source) || !canDisplayToken(target)) return stop();
            visual.update(elapsed);
        } catch {
            stop();
        }
    };
    try {
        visual = createVisual({distance, size, intensity: canvas.photosensitiveMode ? 0.45 : 1});
        visual.container.position.set(start.x, start.y);
        visual.container.rotation = Math.atan2(end.y - start.y, end.x - start.x);
        canvas.interface.addChild(visual.container);
        activeAnimations.set(animationId, stop);
        teardownHook = Hooks.once("canvasTearDown", stop);
        timeout = setTimeout(stop, visual.duration + 250);
        visual.update(0);
        ticker.add(tick);
        return true;
    } catch {
        stop();
        return false;
    }
}

/** Includes the placeable's current display state and tab filter when checking perception. */
function canDisplayToken(token) {
    return token && !token.destroyed && token.visible !== false && !token.isFilteredOut && token.isVisible;
}

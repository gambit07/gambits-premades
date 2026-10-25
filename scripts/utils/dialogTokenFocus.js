const tokenReference = value => typeof value === "string" && /^Scene\.[^.]+\.Token\.[^.]+$/.test(value);

/** Resolve a visible token on the current canvas without changing token control or targets. */
function visibleToken(uuid) {
    if (!tokenReference(uuid) || typeof canvas === "undefined" || !canvas?.ready) return null;
    const [, sceneId, , tokenId] = uuid.split(".");
    if (canvas.scene?.id !== sceneId) return null;
    const token = canvas.tokens?.get(tokenId);
    return token && !token.destroyed && token.visible !== false && token.isVisible ? token : null;
}

/** Pulse a visible token until the dialog releases focus, with a single initial pan if needed. */
export async function focusDialogToken(uuid, {signal} = {}) {
    let token = visibleToken(uuid);
    if (!token || signal?.aborted) return false;
    const name = `gps-dialog-focus-${foundry.utils.randomID()}`;
    let stopped = false;
    let visibilityCheck;
    const cancel = () => {
        stopped = true;
        foundry.canvas?.animation?.CanvasAnimation?.terminateAnimation(name);
    };
    signal?.addEventListener("abort", cancel, {once: true});
    try {
        if (canvas.isOffscreen(token.center)) await canvas.animatePan({...token.center, duration: 250});
        if (stopped || !visibleToken(uuid)) return false;
        visibilityCheck = setInterval(() => {
            if (!visibleToken(uuid)) cancel();
        }, 100);
        do {
            token = visibleToken(uuid);
            if (stopped || !token) break;
            const color = game.settings.get("gambits-premades", "contextualFocusPulseColor");
            const completed = await canvas.controls.drawPing(token.center, {
                name, color: (color?.css ?? color) || (game.user.color?.css ?? game.user.color) || "#f26522", duration: 1800,
                size: Math.max(token.w, token.h, canvas.grid.size) * 1.5
            });
            if (completed !== true) break;
        } while (signal && !stopped);
        return true;
    } catch {
        return false;
    } finally {
        clearInterval(visibilityCheck);
        signal?.removeEventListener("abort", cancel);
    }
}

/** Bind token selectors and contextual prompts to canvas cues on the receiving client. */
export function activateDialogTokenFocus(dialog, signal) {
    const root = dialog.element;
    let active;
    let lastUuid;
    let lastTime = -Infinity;
    const request = uuid => {
        if (signal.aborted) return;
        const now = performance.now();
        if (uuid === lastUuid && now - lastTime < 250) return;
        active?.abort();
        lastUuid = uuid;
        lastTime = now;
        if (!tokenReference(uuid)) return;
        active = new AbortController();
        void focusDialogToken(uuid, {signal: active.signal});
    };
    signal.addEventListener("abort", () => active?.abort(), {once: true});
    const selectedUuid = control => control.dataset.gpsTokenUuid
        ?? control.selectedOptions?.[0]?.dataset.gpsTokenUuid ?? control.value;
    const tokenSelect = control => control.matches("select") && Array.from(control.options).some(option =>
        tokenReference(option.dataset.gpsTokenUuid ?? option.value));
    const onInteraction = event => {
        const control = event.target.closest?.("select, input.enemy-tokens, [data-gps-token-uuid]");
        if (!control || !root.contains(control)) return;
        if (!control.dataset.gpsTokenUuid && !control.matches("input.enemy-tokens") && !tokenSelect(control)) return;
        if (event.type === "change" && control.value && control.dataset.gpsTokenGroup) {
            for (const other of root.querySelectorAll("select[data-gps-token-group]")) {
                if (other !== control && other.dataset.gpsTokenGroup === control.dataset.gpsTokenGroup) other.value = "";
            }
        }
        request(selectedUuid(control));
    };
    for (const event of ["change", "focusin", "click"]) root.addEventListener(event, onInteraction, {signal});
    if (dialog.prompt.focusTokenUuid !== undefined) {
        request(dialog.prompt.focusTokenUuid);
        return;
    }
    const selects = Array.from(root.querySelectorAll("select")).filter(tokenSelect);
    if (selects.length) {
        request(selectedUuid(selects.find(select => tokenReference(selectedUuid(select))) ?? selects[0]));
        return;
    }
    const checked = root.querySelector("input.enemy-tokens:checked");
    if (checked) request(selectedUuid(checked));
    else if (!root.querySelector("input.enemy-tokens, [data-gps-token-uuid]")) request(dialog.prompt.token?.uuid);
}

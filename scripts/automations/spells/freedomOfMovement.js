/** Inspect token item sources without constructing another synthetic actor during preparation. */
function tokenOriginItem(origin, actor) {
    const match = /^Scene\.([^.]+)\.Token\.([^.]+)(?:\.Actor\.[^.]+)?\.Item\.([^.]+)/.exec(origin);
    if(!match) return null;
    const [, sceneId, tokenId, itemId] = match;
    const tokenUuid = `Scene.${sceneId}.Token.${tokenId}`;
    if(actor?.uuid === tokenUuid || actor?.uuid?.startsWith(`${tokenUuid}.Actor.`)) return actor.items.get(itemId);
    const token = game.scenes.get(sceneId)?.tokens.get(tokenId);
    if(!token) return null;
    const baseItem = game.actors.get(token._source.actorId)?.items.get(itemId);
    if(token._source.actorLink) return baseItem;
    const deltaItem = token._source.delta?.items?.find(item => item._id === itemId);
    if(deltaItem?._deleted) return null;
    return deltaItem?.type ? deltaItem : baseItem;
}

export function isMagicalEffect(effect, actor) {
    if(effect.system?.magical || (effect.parent?.documentName === "Item" && effect.parent.type === "spell")) return true;
    const origin = effect.system?.origin?.item || effect.flags?.dae?.castData?.itemUuid || effect.origin;
    if(typeof origin !== "string" || !origin) return false;
    if(origin.startsWith("Scene.")) return tokenOriginItem(origin, actor)?.type === "spell";
    const source = fromUuidSync(origin, {strict: false});
    return source?.type === "spell" || source?.parent?.type === "spell";
}

export function freedomMovementActive(actor) {
    return Array.from(actor?.allApplicableEffects?.() ?? actor?.effects ?? []).some(effect =>
        effect.active && effect.flags?.["gambits-premades"]?.freedomOfMovement);
}

export function freedomMovementChanges(wrapped, phase) {
    if(!freedomMovementActive(this)) return wrapped(phase);
    const restored = [];
    try {
        for(const effect of this.allApplicableEffects()) {
            if(!effect.active || !["paralyzed", "restrained"].some(status => effect.statuses.has(status))
                || !isMagicalEffect(effect, this)) continue;
            restored.push([effect, effect.statuses]);
            effect.statuses = new Set([...effect.statuses].filter(status => !["paralyzed", "restrained"].includes(status)));
        }
        return wrapped(phase);
    }
    finally {
        for(const [effect, statuses] of restored) effect.statuses = statuses;
    }
}

export function freedomMovementChange(wrapped, model, change, options) {
    if(model.documentName !== "Actor" || !change.key.startsWith("system.attributes.movement.")
        || !change.effect || !freedomMovementActive(model) || !isMagicalEffect(change.effect, model)) return wrapped(model, change, options);
    const before = foundry.utils.getProperty(model, change.key);
    const result = wrapped(model, change, options);
    const after = result?.[change.key] ?? foundry.utils.getProperty(model, change.key);
    if(typeof before === "number" && typeof after === "number" && after < before) {
        foundry.utils.setProperty(model, change.key, before);
        return {[change.key]: before};
    }
    return result;
}

export async function freedomOfMovement({item, workflow}) {
    if(!workflow || workflow.aborted) return;
    for(const target of workflow.targets) {
        const changes = [{key: "system.attributes.movement.ignoredDifficultTerrain", type: "override", value: "all", priority: 20}];
        if(item.system.source.rules === "2024") changes.push({key: "system.attributes.movement.speeds.swim", type: "upgrade", value: "@attributes.movement.speeds.walk", priority: 99, phase: "final"});
        await MidiQOL.socket().executeAsGM("createEffects", {actorUuid: target.actor.uuid, effects: [{
            name: item.name, img: item.img, origin: item.uuid, type: "base", system: {magical: true, changes},
            disabled: false, duration: {value: 3600, units: "seconds"}, transfer: false,
            flags: {"gambits-premades": {freedomOfMovement: true}}
        }]});
        await game.gps.queryGM("ensureFreedomEscape", {actorUuid: target.actor.uuid, itemUuid: item.uuid});
    }
}

export async function ensureFreedomEscape({actorUuid, itemUuid}) {
    const actor = await fromUuid(actorUuid);
    const spell = await fromUuid(itemUuid);
    const effect = actor?.effects.find(effect => effect.flags?.["gambits-premades"]?.freedomOfMovement && effect.origin === itemUuid);
    if(!effect || !spell) return;
    await actor.createEmbeddedDocuments("Item", [{name: game.i18n.localize("GAMBITSPREMADES.RulesReview.FreedomEscape"), type: "feat", img: spell.img,
        system: {activities: {gpsFreedomEscape: {type: "utility", activation: {type: "special"}, consumption: {spellSlot: false, targets: []}, target: {affects: {type: "self"}}}}},
        flags: {dnd5e: {dependentOn: effect.uuid}, "midi-qol": {onUseMacroName: "[preActiveEffects]function.game.gps.freedomEscape"}}
    }]);
}

export async function freedomEscape({actor, workflow}) {
    if(!freedomMovementActive(actor)) return void (workflow.aborted = true);
    const effects = actor.effects.filter(effect => effect.active && (effect.statuses.has("restrained") || effect.statuses.has("grappled")) && !isMagicalEffect(effect, actor));
    if(!effects.length) return;
    const choices = effects.map(effect => `<option value="${effect.id}">${foundry.utils.escapeHTML(effect.name)}</option>`).join("");
    const selected = await game.gps.showAutomationDialog({window: {title: game.i18n.localize("GAMBITSPREMADES.RulesReview.FreedomEscape")},
        focusTokenUuid: workflow.token?.document.uuid,
        content: `<p>${game.i18n.localize("GAMBITSPREMADES.RulesReview.FreedomCost")}</p><select name="restraint">${choices}</select>`,
        buttons: [{action: "escape", label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Yes"), callback: (event, button) => button.form.elements.restraint.value}, {action: "cancel", label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Cancel")}], rejectClose: false});
    if(effects.some(effect => effect.id === selected)) await MidiQOL.socket().executeAsGM("removeEffects", {actorUuid: actor.uuid, effects: [selected]});
}

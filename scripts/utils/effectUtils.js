const hiddenTokenUpdates = new Map();

export async function expireCombatEffects(combat) {
    const actors = new Map(combat.combatants.filter(c => c.actor).map(c => [c.actor.uuid, c.actor]));
    await Promise.all([...actors.values()].map(async actor => {
        const effects = actor.appliedEffects.filter(effect => effect.flags["gambits-premades"]?.expireOnCombatEnd
            && (!effect._source.start?.combat || effect._source.start.combat === combat.id));
        if (effects.length) await MidiQOL.socket().executeAsGM("removeEffects", {
            actorUuid: actor.uuid, effects: effects.map(effect => effect.id), options: { "expiry-reason": "combat-end" }
        });
    }));
}

export async function effectTokenHidden({ actor, args }) {
    if (!game.user.isGM || !["on", "off"].includes(args?.[0])) return;
    const effectId = args.at(-1)?.effectId;
    if (!actor || !effectId) return;
    for (const token of actor.getDependentTokens({ linked: !actor.isToken, concreteOnly: true })) {
        const previous = hiddenTokenUpdates.get(token.uuid) ?? Promise.resolve();
        const update = previous.catch(() => {}).then(async () => {
            const state = token.getFlag("gambits-premades", "hiddenByEffects");
            const effects = new Set(state?.effects ?? []);
            if (args[0] === "on") {
                effects.add(effectId);
                await token.update({ hidden: true, "flags.gambits-premades.hiddenByEffects": { hidden: state?.hidden ?? token.hidden, effects: [...effects] } });
            } else if (state) {
                effects.delete(effectId);
                if (effects.size) await token.setFlag("gambits-premades", "hiddenByEffects", { ...state, effects: [...effects] });
                else await token.update({ hidden: state.hidden, "flags.gambits-premades.-=hiddenByEffects": null });
            }
        });
        hiddenTokenUpdates.set(token.uuid, update);
        try {
            await update;
        } finally {
            if (hiddenTokenUpdates.get(token.uuid) === update) hiddenTokenUpdates.delete(token.uuid);
        }
    }
}

export function registerDetectionModes() {
    if (CONFIG.Canvas.detectionModes.divineSense) return;
    class DivineSense extends foundry.canvas.perception.DetectionModeAll {
        _canDetect(visionSource, target, level) {
            const creatureType = target?.actor?.system.details.type?.value;
            return ["celestial", "fiend", "undead"].includes(creatureType) && super._canDetect(visionSource, target, level);
        }
    }
    CONFIG.Canvas.detectionModes.divineSense = new DivineSense({
        id: "divineSense",
        label: "GAMBITSPREMADES.Detection.DivineSense",
        walls: true,
        angle: false,
        type: foundry.canvas.perception.DetectionMode.DETECTION_TYPES.OTHER
    });
}

export function movementSpeedChanges(value, priority = 20) {
    if (/^[+-]/.test(String(value).trim())) {
        return [{ key: "system.attributes.movement.bonus", type: "add", value: String(value), priority, phase: "initial" }];
    }
    return Object.keys(CONFIG.DND5E.movementTypes).map(type => ({
        key: `system.attributes.movement.speeds.${type}`, type: "override", value: String(value), priority, phase: "final"
    }));
}

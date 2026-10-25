const controllerId = "9c513478-ffd9-4d5a-9e39-3d72bf0518ab";
const pendingTurns = new Set();
const endingCasts = new Set();
const targetUpdates = new Map();
const stateOf = effect => effect?.flags?.["gambits-premades"]?.enervation;
const beamName = (castUuid, targetUuid) => `Enervation:${castUuid}:${targetUuid}`;

export async function deleteEnervationEffect({effectUuid}) {
    const effect = await fromUuid(effectUuid);
    if(effect?.documentName === "ActiveEffect" && !effect.transfer) await effect.delete();
}

async function removeEffect(effect) {
    if(effect) await game.gps.queryGM("deleteEnervationEffect", {effectUuid: effect.uuid});
}

async function endCast(state) {
    if(!state?.castUuid || endingCasts.has(state.castUuid)) return;
    endingCasts.add(state.castUuid);
    try {
        await removeEffect(await fromUuid(state.castUuid));
    }
    finally {
        endingCasts.delete(state.castUuid);
    }
}

async function endBeam(state, targetUuid) {
    await globalThis.Sequencer?.EffectManager?.endEffects({name: beamName(state.castUuid, targetUuid)});
}

async function removeTarget(effect, targetUuid) {
    const previous = targetUpdates.get(effect.uuid) ?? Promise.resolve();
    const update = previous.then(async () => {
        const state = stateOf(effect);
        if(!await fromUuid(effect.uuid) || !state?.targetUuids.includes(targetUuid)) return;
        const targetUuids = state.targetUuids.filter(uuid => uuid !== targetUuid);
        await effect.update({"flags.gambits-premades.enervation.targetUuids": targetUuids});
        return {state, targetUuids};
    });
    targetUpdates.set(effect.uuid, update);
    let result;
    try { result = await update; }
    finally { if(targetUpdates.get(effect.uuid) === update) targetUpdates.delete(effect.uuid); }
    if(!result) return;
    const {state, targetUuids} = result;
    await endBeam(state, targetUuid);
    const target = await fromUuid(targetUuid);
    for(const marker of target?.actor?.effects ?? []) {
        if(stateOf(marker)?.casterEffectUuid === effect.uuid && stateOf(marker)?.targetTokenUuid === targetUuid) await removeEffect(marker);
    }
    if(!targetUuids.length) await endCast(state);
}

async function validateTargets(effect) {
    const state = stateOf(effect);
    if(!state || !await fromUuid(state.castUuid)) return [];
    if(!state.targetUuids.length) {
        await endCast(state);
        return [];
    }
    const caster = await fromUuid(state.casterTokenUuid);
    if(!caster) {
        await endCast(state);
        return [];
    }
    if(!caster.object) return [];
    const targets = [];
    for(const uuid of [...state.targetUuids]) {
        const target = await fromUuid(uuid);
        if(!target?.object || target.parent?.uuid !== caster.parent?.uuid || !game.gps.withinRange(caster.object, target.object, 60)) await removeTarget(effect, uuid);
        else targets.push(target.object);
    }
    return targets;
}

export async function checkEnervationMovement(document, {deleted = false} = {}) {
    if(game.user.id !== game.gps.getPrimaryGM()) return;
    if(!deleted && document.parent?.uuid !== canvas.scene?.uuid) return;
    const controllers = new Map();
    for(const effect of document.actor?.effects ?? []) {
        const state = stateOf(effect);
        if(state?.role === "caster" && state.casterTokenUuid === document.uuid) controllers.set(effect.uuid, effect);
        else if(state?.role === "target" && state.targetTokenUuid === document.uuid) {
            const controller = await fromUuid(state.casterEffectUuid);
            if(controller) controllers.set(controller.uuid, controller);
        }
    }
    for(const effect of controllers.values()) {
        if(deleted && stateOf(effect).casterTokenUuid === document.uuid) await endCast(stateOf(effect));
        else if(deleted) await removeTarget(effect, document.uuid);
        else await validateTargets(effect);
    }
}

export async function checkEnervationWalls(wall) {
    if(game.user.id !== game.gps.getPrimaryGM() || wall.parent?.uuid !== canvas.scene?.uuid) return;
    const controllers = new Map();
    for(const token of canvas.scene.tokens) {
        for(const effect of token.actor?.effects ?? []) {
            if(stateOf(effect)?.role === "caster") controllers.set(effect.uuid, effect);
        }
    }
    for(const effect of controllers.values()) await validateTargets(effect);
}

async function healFromDamage(workflow, actor, token, item) {
    const seen = new Set();
    for(const entry of workflow.damageList ?? []) {
        if(!entry.targetUuid || seen.has(entry.targetUuid)) continue;
        seen.add(entry.targetUuid);
        const damageTotal = Math.max(0, Math.floor((entry.damageDetail ?? []).reduce((total, part) => total + (part.type === "necrotic" ? Number(part.value ?? 0) : 0), 0)));
        const healAmount = Math.floor(damageTotal / 2);
        if(!healAmount) continue;
        const roll = await new CONFIG.Dice.DamageRoll(String(healAmount), {}, {type: "healing", properties: ["mgc"]}).evaluate();
        const healing = new MidiQOL.DamageOnlyWorkflow(actor, token, roll.total, "healing", [token], roll, {
            itemData: {flags: {autoanimations: {isEnabled: false, version: 5}}, name: "Enervation - Healing", type: "feat", img: item.img}, flavor: "Enervation - Healing"
        });
        healing.activity.updateSource({"activation.type": "special", "activation.override": true});
        await healing.ready;
        await ChatMessage.create({
            user: MidiQOL.playerForActor(actor)?.id ?? game.user.id,
            speaker: ChatMessage.getSpeaker({token}),
            content: game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.Spells.Enervation.DealDamageHeal", {damageTotal, healAmount})
        });
    }
}

async function startBeam(state, caster, target) {
    if(!game.gps.getCprConfig({itemUuid: state.itemUuid}).animEnabled || !globalThis.Sequence || !globalThis.Sequencer?.Database) return;
    const file = ["jb2a.energy_beam.reverse.dark_green", "jb2a.energy_beam.normal.dark_greenpurple.03"].find(path => Sequencer.Database.entryExists(path));
    if(!file) return;
    await new Sequence().effect().file(file).persist().name(beamName(state.castUuid, target.document.uuid))
        .fadeIn(500).fadeOut(500).attachTo(caster).stretchTo(target, {attachTo: true}).play();
}

export async function enervation({actor, token, item, args, workflow}) {
    if(args[0]?.macroPass === "postActiveEffects") {
        const concentration = actor.effects.get(workflow.concentrationId) ?? MidiQOL.getConcentrationEffect(actor, item.uuid);
        const targets = Array.from(workflow.failedSaves ?? []).filter(target => target.actor);
        if(!targets.length) {
            await healFromDamage(workflow, actor, token, item);
            await removeEffect(concentration);
            return;
        }
        if(!concentration) return;
        let effect = actor.effects.find(effect => effect.flags?.["gambits-premades"]?.gpsUuid === controllerId
            && [concentration.uuid, workflow.activity?.uuid, item.uuid].filter(Boolean).includes(effect.origin));
        if(stateOf(effect)?.castUuid === concentration.uuid) return;
        const state = {
            role: "caster", castUuid: concentration.uuid, itemUuid: item.uuid,
            casterTokenUuid: token.document.uuid, targetUuids: targets.map(target => target.document.uuid),
            castLevel: Number(workflow.castData?.castLevel ?? item.system.level)
        };
        if(!effect) {
            const data = item.effects.find(effect => effect.flags?.["gambits-premades"]?.gpsUuid === controllerId)?.toObject();
            if(!data) return;
            delete data._id;
            delete data._key;
            data.origin = concentration.uuid;
            data.system.origin = {effect: concentration.uuid, item: item.uuid};
            data.flags.dnd5e = {dependentOn: concentration.uuid};
            data.flags["gambits-premades"].enervation = state;
            await MidiQOL.socket().executeAsGM("createEffects", {actorUuid: actor.uuid, effects: [data]});
            effect = actor.effects.find(effect => stateOf(effect)?.castUuid === concentration.uuid && stateOf(effect)?.role === "caster");
            if(!effect) return;
        }
        else await effect.update({"flags.gambits-premades.enervation": state, "flags.dnd5e.dependentOn": concentration.uuid});
        for(const target of targets) {
            await MidiQOL.socket().executeAsGM("createEffects", {actorUuid: target.actor.uuid, effects: [{
                name: item.name, img: item.img, type: "base", origin: effect.uuid, transfer: false,
                duration: {value: 60, units: "seconds"},
                system: {origin: {effect: effect.uuid, item: item.uuid}, changes: [{key: "macro.itemMacro", value: "function.game.gps.enervation", type: "custom", priority: 20}]},
                flags: {
                    dnd5e: {dependentOn: effect.uuid}, dae: {stackable: "multi"},
                    "gambits-premades": {enervation: {role: "target", castUuid: concentration.uuid, casterEffectUuid: effect.uuid, targetTokenUuid: target.document.uuid}}
                }
            }]});
        }
        await healFromDamage(workflow, actor, token, item);
        for(const target of targets) await startBeam(state, token, target);
        return;
    }

    const lastArg = args.at(-1);
    const state = stateOf(lastArg?.efData);
    if(!state) return;
    if(args[0] === "off") {
        if(state.role === "target") {
            await endBeam(state, state.targetTokenUuid);
            const effect = await fromUuid(state.casterEffectUuid);
            if(effect && stateOf(effect)?.castUuid === state.castUuid) await removeTarget(effect, state.targetTokenUuid);
        }
        else {
            for(const uuid of state.targetUuids) await endBeam(state, uuid);
            await endCast(state);
        }
        return;
    }
    if(args[0] !== "each" || state.role !== "caster") return;
    const effect = await fromUuid(lastArg.effectUuid ?? `${actor.uuid}.ActiveEffect.${lastArg.effectId}`);
    if(!effect || pendingTurns.has(effect.uuid)) return;
    pendingTurns.add(effect.uuid);
    try {
        const turn = game.combat ? `${game.combat.id}:${game.combat.round}:${game.combat.turn}` : null;
        if(turn && stateOf(effect).lastTurn === turn) return;
        if(turn) await effect.update({"flags.gambits-premades.enervation.lastTurn": turn});
        item = await fromUuid(state.itemUuid);
        token = (await fromUuid(state.casterTokenUuid))?.object;
        if(!item) return await endCast(state);
        if(!token) return;
        const currentTargets = await validateTargets(effect);
        if(!currentTargets.length) return;
        const browserUser = game.gps.getBrowserUser({actorUuid: actor.uuid});
        const result = await game.gps.queryDialog("process3rdPartyReactionDialog", browserUser, {
            dialogTitle: `${actor.name} | ${item.name}`, dialogId: "enervation", initialTimeLeft: 30,
            validTokenPrimaryUuid: token.document.uuid, focusTokenUuid: currentTargets.length === 1 ? currentTargets[0].document.uuid : false, source: game.gps.getPrimaryGM() === browserUser ? "gm" : "user", type: "singleDialog",
            dialogContent: `<div class="gps-dialog-container"><p class="gps-dialog-paragraph">${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.Spells.Enervation.Prompts.UseYourAction.Default", {formula: `${Math.max(4, state.castLevel - 1)}d8`})}</p><div class="gps-dialog-button-container"><button id="pauseButton_enervation" type="button" class="gps-dialog-button"><i class="fas fa-pause" id="pauseIcon_enervation"></i>${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Pause")}</button></div></div>`
        });
        if(!await fromUuid(effect.uuid) || !await fromUuid(state.castUuid)) return;
        if(!result?.userDecision) return await endCast(state);
        const targets = await validateTargets(effect);
        if(!targets.length) return;
        await actor.setFlag("midi-qol", "actions.action", true);
        for(const target of targets) {
            const roll = await new CONFIG.Dice.DamageRoll(`${Math.max(4, state.castLevel - 1)}d8`, {}, {type: "necrotic", properties: ["mgc"]}).evaluate();
            await MidiQOL.displayDSNForRoll(roll, "damageRoll");
            const damage = new MidiQOL.DamageOnlyWorkflow(actor, token, roll.total, "necrotic", [target], roll, {
                itemData: {flags: {autoanimations: {isEnabled: false, version: 5}}, name: "Enervation - Damage (Necrotic)", type: "feat", img: item.img}, flavor: "Enervation - Damage (Necrotic)"
            });
            damage.activity.updateSource({"activation.type": "special", "activation.override": true});
            await damage.ready;
            await healFromDamage(damage, actor, token, item);
        }
    }
    finally {
        pendingTurns.delete(effect.uuid);
    }
}

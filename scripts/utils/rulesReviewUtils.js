import {freedomMovementChanges, freedomMovementChange} from "../automations/spells/freedomOfMovement.js";
import {elementalAffinityType} from "../automations2024/classFeatures/sorcerer/draconicSorcery/elementalAffinity2024.js";

const commandExpiries = new Map();
const loc = key => game.i18n.localize(`GAMBITSPREMADES.RulesReview.${key}`);

export function registerRulesReviewHooks() {
    libWrapper.register("gambits-premades", "CONFIG.ActiveEffect.documentClass.applyChange", freedomMovementChange, "MIXED");
    libWrapper.register("gambits-premades", "CONFIG.Actor.documentClass.prototype.applyActiveEffects", function(wrapped, phase) {
        const result = freedomMovementChanges.call(this, wrapped, phase);
        if(phase === "final") {
            const item = this.items.find(item => item.system.identifier === "elemental-affinity" && item.system.source.rules === "2024");
            const type = item && elementalAffinityType(item);
            if(type && item.effects.some(effect => effect.active && effect.transfer)) this.system.traits.dr.value.add(type);
        }
        return result;
    }, "WRAPPER");
    libWrapper.register("gambits-premades", "CONFIG.ActiveEffect.documentClass.prototype.isExpiryEvent", function(wrapped, event, context) {
        const result = wrapped(event, context);
        if(result && event === "turnStart" && this.flags?.["gambits-premades"]?.commandWord && (context?.combat ?? game.combat)?.combatant?.actor?.uuid === this.actor?.uuid) {
            commandExpiries.set(this.uuid, game.gps.regionTurnKey(context));
        }
        return result;
    }, "WRAPPER");
    libWrapper.register("gambits-premades", "CONFIG.Actor.documentClass.prototype.rollSkill", smolderSkill, "WRAPPER");
    Hooks.on("updateActor", async (actor, changes) => {
        if(game.user.id !== game.gps?.getPrimaryGM() || foundry.utils.getProperty(changes, "system.attributes.hp.value") !== 0) return;
        const ids = actor.effects.filter(effect => effect.flags?.["gambits-premades"]?.nova).map(effect => effect.id);
        if(ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
    });
}

export function commandExpiredAtTurnStart(effectUuid) {
    const key = commandExpiries.get(effectUuid);
    commandExpiries.delete(effectUuid);
    return key !== undefined && key === game.gps.regionTurnKey();
}

export function damagedAttackTarget(workflow) {
    if(!workflow.activity?.hasAttack) return;
    return [...workflow.hitTargets].find(target => workflow.damageList?.some(damage =>
        (damage.tokenUuid === target.document.uuid || damage.actorUuid === target.actor.uuid)
        && Number(damage.totalDamage) > 0));
}

export async function foresight({actor, item, args, workflow}) {
    if(args?.[0]?.macroPass !== "postActiveEffects" || workflow.aborted) return;
    const actors = new Map([...game.actors].map(actor => [actor.uuid, actor]));
    for(const scene of game.scenes) for(const token of scene.tokens) {
        if(!token.actorLink && token.delta?._source.effects?.some(effect => effect.flags?.["gambits-premades"]?.foresight)) actors.set(token.actor.uuid, token.actor);
    }
    const currentTargets = new Set([...workflow.targets].map(token => token.actor.uuid));
    for(const recipient of actors.values()) {
        const effects = recipient.effects.filter(effect => effect.flags?.["gambits-premades"]?.foresight
            && effect.getSourceActor()?.uuid === actor.uuid);
        const current = currentTargets.has(recipient.uuid) ? effects.filter(effect => DAE.effectMatchesSource(effect, item.uuid)).at(-1) : null;
        const ids = effects.filter(effect => effect !== current).map(effect => effect.id);
        if(ids.length) await MidiQOL.socket().executeAsGM("removeEffects", {actorUuid: recipient.uuid, effects: ids, options: {"expiry-reason": "foresight-recast"}});
    }
}

export async function bindFeatureResource({actor, item, workflow}) {
    const key = item.flags?.["gambits-premades"]?.resourceBinding;
    if(!key) return;
    const existing = workflow.activity.consumption.targets.find(target => target.type === "itemUses" && actor.items.has(target.target));
    if(existing) return;
    const identifiers = key === "channel-divinity" ? ["channel-divinity"] : ["superiority-dice", "superiority-die", "combat-superiority"];
    const matches = actor.items.filter(resource => identifiers.includes(resource.system.identifier.replace(/-legacy$/, "")) && Number(resource.system.uses?.max) > 0);
    if(matches.length !== 1) {
        ui.notifications.warn(loc("ResourceRequired"));
        workflow.aborted = true;
        return false;
    }
    const targets = [{type: "itemUses", target: matches[0].id, value: "1", scaling: {}}];
    workflow.activity.consumption.targets = targets;
    const owned = actor.items.get(item.id);
    if(owned) await owned.update({[`system.activities.${workflow.activity.id}.consumption.targets`]: targets});
}

export async function huntersSense({actor, token, workflow, args}) {
    const target = workflow.targets.first();
    if(args?.[0]?.macroPass === "preItemRoll") {
        if(!target || workflow.targets.size !== 1 || !game.gps.withinRange(token, target, 60) || !MidiQOL.canSee(token, target)) {
            workflow.aborted = true;
            return false;
        }

    }
    if(args?.[0]?.macroPass !== "postActiveEffects" || workflow.aborted || !target?.actor) return;
    await game.gps.queryGM("huntersSenseResult", {actorUuid: actor.uuid, targetUuid: target.document.uuid});
}

export async function huntersSenseResult({actorUuid, targetUuid}) {
    const actor = await fromUuid(actorUuid);
    const target = await fromUuid(targetUuid);
    if(!actor || !target?.actor) return;
    const concealed = await game.gps.confirmAutomationDialog({focusTokenUuid: targetUuid, window: {title: game.i18n.localize("GAMBITSPREMADES.RulesReview.HuntersSenseTitle")}, content: `<p>${game.i18n.format("GAMBITSPREMADES.RulesReview.HuntersSenseConcealed", {target: foundry.utils.escapeHTML(target.name)})}</p>`, rejectClose: false});
    if(concealed == null) return;
    const traits = target.actor.system.traits;
    const labels = key => (concealed ? [] : [...traits[key].value]).map(type => game.i18n.localize(CONFIG.DND5E.damageTypes[type]?.label ?? type)).join(", ") || loc("None");
    const whisper = [...new Set([MidiQOL.playerForActor(actor)?.id, ...game.users.filter(user => user.isGM).map(user => user.id)].filter(Boolean))];
    await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor}), whisper,
        content: `<p>${foundry.utils.escapeHTML(target.name)}</p><p>${loc("DamageImmunities")}: ${labels("di")}</p><p>${loc("DamageResistances")}: ${labels("dr")}</p><p>${loc("DamageVulnerabilities")}: ${labels("dv")}</p>`});
}

export async function smolderSkill(wrapped, config = {}, dialog = {}, message = {}) {
    const effect = config.skill === "itm" && this.effects.find(effect => effect.active && effect.flags?.["gambits-premades"]?.smolder);
    if(!effect) return wrapped(config, dialog, message);
    const use = await game.gps.confirmAutomationDialog({window: {title: effect.name}, content: `<p>${loc("SmolderEligible")}</p>`, rejectClose: false});
    const rolls = await wrapped(use ? {...config, advantage: true} : config, dialog, message);
    if(use && rolls?.length) await effect.delete();
    return rolls;
}

import {isAttackForcedMiss} from "../../utils/attackOutcomeUtils.js";

const MODULE_ID = "gambits-premades";
const EFFECT_ID = "e6e24759-a9d3-4993-b0f2-6328010a6520";
const ASSET = "blfx.spell.curse.1.eldritch.hex1.tentacles.tendrils.loop.color1";
const TYRIAN_PURPLE = 0x66023C;
const updates = new Map();
const prefix = uuid => `DrafynsBane_${uuid.replaceAll(".", "_")}`;
const curse = actor => actor?.appliedEffects.find(effect => effect.active && effect.getFlag(MODULE_ID, "gpsUuid") === EFFECT_ID);
const naturalTwenty = roll => roll?.dice?.find(die => die.faces === 20)?.results.some(result => result.active !== false && !result.discarded && result.result === 20);

/** Serialize charge and animation updates for each applied curse. */
async function withCurse(effectUuid, operation) {
    const previous = updates.get(effectUuid) ?? Promise.resolve();
    const pending = previous.catch(() => undefined).then(async () => {
        const effect = await fromUuid(effectUuid);
        if(!effect?.active || effect.getFlag(MODULE_ID, "gpsUuid") !== EFFECT_ID) return;
        return operation(effect);
    });
    updates.set(effectUuid, pending);
    try {
        return await pending;
    } finally {
        if(updates.get(effectUuid) === pending) updates.delete(effectUuid);
    }
}

/** End this curse's motes without touching another effect's animation. */
async function endMotes(effectUuid, index = "*") {
    try {
        if(typeof Sequencer !== "undefined") await Sequencer.EffectManager.endEffects({name: `${prefix(effectUuid)}_mote_${index}`});
    } catch {
        return;
    }
}

/** Display optional motes without making charge tracking depend on asset playback. */
async function showMotes(effect, target, itemUuid, count) {
    if(!game.gps.getCprConfig({itemUuid}).animEnabled || !target.object || typeof Sequencer === "undefined"
        || typeof Sequence === "undefined" || !Sequencer.Database.entryExists(ASSET)) return;
    const token = target.object;
    const width = Number(token.w) || canvas.grid.size;
    const height = Number(token.h) || canvas.grid.size;
    const offsets = [{x: -0.6, y: -0.45}, {x: -0.6, y: 0.45}, {x: 0.6, y: -0.45}, {x: 0.6, y: 0.45}];
    const sequence = new Sequence({moduleName: MODULE_ID, softFail: true});
    for(let index = 0; index < count; index++) {
        const offset = {x: offsets[index].x * width, y: offsets[index].y * height};
        const rotation = Math.atan2(-offset.y, -offset.x) * 180 / Math.PI - 90;
        sequence.effect()
            .file(ASSET)
            .attachTo(token, {bindRotation: false})
            .tieToDocuments(effect)
            .scaleToObject(0.4)
            .spriteOffset(offset)
            .spriteRotation(rotation)
            .filter("ColorMatrix", {tint: TYRIAN_PURPLE, saturate: -1})
            .fadeIn(500)
            .fadeOut(500)
            .persist()
            .name(`${prefix(effect.uuid)}_mote_${index}`);
    }
    await sequence.play();
}

/** Initialize the curse from native cantrip scaling and display one mote per charge. */
export async function initializeDrafynMotes({effectUuid, itemUuid, tokenUuid, activation}) {
    return withCurse(effectUuid, async effect => {
        if(!activation || effect.getFlag(MODULE_ID, "drafynMotes")?.activation === activation) return;
        const item = await fromUuid(itemUuid);
        const target = await fromUuid(tokenUuid);
        if(!item?.actor || target?.actor?.uuid !== effect.parent?.uuid || !DAE.effectMatchesSource(effect, itemUuid)) return;
        const level = Number(item.actor.system.cantripLevel?.(item) ?? item.actor.system.details.level ?? 1);
        const count = level >= 17 ? 4 : level >= 11 ? 3 : level >= 5 ? 2 : 1;
        await effect.setFlag(MODULE_ID, "drafynMotes", {initial: count, remaining: count, activation, consumed: []});
        await endMotes(effectUuid);
        void showMotes(effect, target, itemUuid, count).catch(() => undefined);
        return {remaining: count};
    });
}

/** Consume a unique natural-20 cancellation and remove exactly one corresponding mote. */
export async function consumeDrafynMote({effectUuid, activation, eventId}) {
    return withCurse(effectUuid, async effect => {
        const state = effect.getFlag(MODULE_ID, "drafynMotes");
        if(!eventId || !state || state.activation !== activation || state.consumed.includes(eventId)
            || !Number.isInteger(state.remaining) || state.remaining < 1) return;
        const remaining = state.remaining - 1;
        await effect.update({[`flags.${MODULE_ID}.drafynMotes.remaining`]: remaining,
            [`flags.${MODULE_ID}.drafynMotes.consumed`]: [...state.consumed, eventId]});
        await endMotes(effectUuid, remaining);
        if(!remaining) await effect.delete();
        return {remaining};
    });
}

/** Post the existing cancellation message after a charge is successfully consumed. */
async function announceCancellation(token, kind) {
    const key = `GAMBITSPREMADES.ChatMessages.Automations.ThirdPartySpells.DrafynsBaneOfExcellence.Natural20Cancelled${kind}`;
    const content = `<div class="midi-qol-flex-container"><div class="midi-qol-target-npc midi-qol-target-name" id="${token.id}"><br>${game.i18n.localize(key)}</div><div><img src="${foundry.utils.escapeHTML(token.actor.img)}" width="30" height="30" style="border:0px"></div></div>`;
    await ChatMessage.create({user: game.user.id, speaker: ChatMessage.getSpeaker({token}), content});
}

/** Apply the curse and cancel natural twenties while charges remain. */
export async function drafynsBaneOfExcellence({actor, token, item, args, workflow, macroItem, workflowData, workflowType}) {
    if(args?.[0] === "off") {
        const context = args.at(-1);
        const effectUuid = context.effectUuid ?? (context.effectId ? `${actor.uuid}.ActiveEffect.${context.effectId}` : null);
        if(effectUuid) await endMotes(effectUuid);
        return;
    }
    if(args?.[0]?.macroPass === "postActiveEffects" && !workflow.aborted) {
        item = macroItem ?? item;
        for(const target of workflow.failedSaves) {
            const effect = target.actor.appliedEffects.find(candidate => candidate.active && candidate.getFlag(MODULE_ID, "gpsUuid") === EFFECT_ID
                && DAE.effectMatchesSource(candidate, item.uuid));
            if(effect) await game.gps.queryUser("initializeDrafynMotes", game.gps.getPrimaryGM(), {
                effectUuid: effect.uuid, itemUuid: item.uuid, tokenUuid: target.document.uuid, activation: workflow.id
            });
        }
        return;
    }
    if(args?.[0]?.macroPass === "preAttackRollComplete") {
        if(!naturalTwenty(workflow.attackRoll) || isAttackForcedMiss(workflow)) return;
        const effect = curse(actor);
        const state = effect?.getFlag(MODULE_ID, "drafynMotes");
        if(!state?.remaining) return;
        const result = await game.gps.queryUser("consumeDrafynMote", game.gps.getPrimaryGM(), {
            effectUuid: effect.uuid, activation: state.activation, eventId: `${workflow.id}:attack:${workflow.attackRollCount ?? 0}`
        });
        if(!result) return;
        game.gps.forceAttackMiss(workflow);
        await announceCancellation(token, "Attack");
        return;
    }
    if(workflowType === "save") {
        workflow = MidiQOL.Workflow.getWorkflow(workflowData);
        if(!workflow) return;
        for(const target of [...workflow.saves]) {
            const roll = workflow.tokenSaves?.[target.document.uuid];
            if(!naturalTwenty(roll)) continue;
            const effect = curse(target.actor);
            const state = effect?.getFlag(MODULE_ID, "drafynMotes");
            if(!state?.remaining) continue;
            const result = await game.gps.queryUser("consumeDrafynMote", game.gps.getPrimaryGM(), {
                effectUuid: effect.uuid, activation: state.activation, eventId: `${workflow.id}:save:${target.document.uuid}`
            });
            if(!result) continue;
            await game.gps.updateSaveResult({workflow, token: target, roll, saved: false});
            await announceCancellation(target, "Save");
        }
    }
}

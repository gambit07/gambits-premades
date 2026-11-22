import {spaceTest} from "../../utils/effectTargetUtils.js";
import {appliedSpellEffect, castConcentration, grantEffectItems} from "../../utils/castEffects.js";

const gps = "gambits-premades";
const moving = new Set();
const shieldVisual = (castUuid, doc) => `FizbansPlatinumShield.${castUuid}.${doc.uuid}`;
const shieldChange = effect => effect.system?.changes?.some(c => c.key === "macro.itemMacro" && c.value?.includes("gps.fizbansPlatinumShield"));

function playShield(doc, item, castUuid) {
    if(!doc?.object || !game.gps.getCprConfig({itemUuid: item.uuid}).animEnabled || !globalThis.Sequencer) return;
    new Sequence().effect().name(shieldVisual(castUuid, doc)).file("jb2a.markers.shield_rampart.loop.03.blue")
        .attachTo(doc.object, {bindVisibility: true}).scaleToObject(1.7).opacity(0.85).zIndex(0)
        .persist().belowTokens(true).fadeIn(2500).fadeOut(2500).play();
}

function candidates(token, owner) {
    if(!token?.parent) return [];
    const range = game.gps.convertFromFeet({range: 60, scene: token.parent});
    const nearby = token.object && token.parent === canvas.scene
        ? [token, ...MidiQOL.findNearby(null, token.object, range, {includeToken: false}).map(t => game.gps.tokenDocument(t))]
        : [token, ...token.parent.tokens.filter(spaceTest(token, range))];
    return nearby.filter(t => t?.actor && t.actor.uuid !== owner.parent.uuid && t.disposition === token.disposition);
}

/** Recheck the effect and destination after the dialog; retire only the shield that actually moved. */
export async function moveFizbanShield({helperUuid, casterUuid, targetUuid, effectUuid}) {
    if(moving.has(helperUuid)) return;
    moving.add(helperUuid);
    try {
        const helper = await fromUuid(helperUuid);
        const state = helper?.getFlag(gps, "fizbanShield");
        if(!state || state.effectUuid !== effectUuid || state.casterUuid !== casterUuid) return;
        const spell = await fromUuid(state.itemUuid), current = await fromUuid(effectUuid);
        const caster = await fromUuid(casterUuid), target = await fromUuid(targetUuid), oldTarget = await fromUuid(state.targetUuid);
        if(!spell || helper.parent?.uuid !== spell.actor?.uuid || !current?.active || !shieldChange(current)
            || current.parent.uuid !== oldTarget?.actor?.uuid || caster?.actor?.uuid !== helper.parent.uuid
            || castConcentration(spell.actor, spell, {effect: current})?.uuid !== helper.getFlag(gps, "ownerEffectUuid")
            || !candidates(caster, current).some(t => t.uuid === target?.uuid)) return;
        const castUuid = helper.getFlag(gps, "ownerEffectUuid");
        if(!castUuid) return;
        const copy = current.toObject();
        delete copy._id;
        copy.flags.dnd5e = {...copy.flags.dnd5e, dependentOn: castUuid};
        const [next] = await target.actor.createEmbeddedDocuments("ActiveEffect", [copy]);
        if(!next) return;
        try {
            if(!helper.parent.items.has(helper.id) || !current.parent.effects.has(current.id) || !(await fromUuid(castUuid))?.active) {
                if(target.actor.effects.has(next.id)) await next.delete();
                return;
            }
            await helper.update({name: `${spell.name} - ${game.i18n.localize("GAMBITSPREMADES.EffectHelpers.ChangeTarget")} (${target.name})`,
                ["flags." + gps + ".fizbanShield"]: {...state, targetUuid: target.uuid, effectUuid: next.uuid}});
        } catch(error) {
            if(target.actor.effects.has(next.id)) await next.delete();
            throw error;
        }
        await current.delete();
        playShield(target, spell, castUuid);
    } finally { moving.delete(helperUuid); }
}

export async function fizbansPlatinumShield({actor, token, tokenDocument = game.gps.tokenDocument(token), item, args, workflow}) {
    const pass = args[0]?.macroPass;
    if(pass === "preActiveEffects") {
        const state = item.getFlag(gps, "fizbanShield");
        if(!state || state.casterUuid !== tokenDocument?.uuid) return;
        const effect = await fromUuid(state.effectUuid);
        if(!effect?.active) return;
        const targets = candidates(tokenDocument, effect);
        if(!targets.length) return;
        const browser = game.gps.getBrowserUser({actorUuid: actor.uuid});
        const result = await game.gps.queryDialog("process3rdPartyReactionDialog", browser, {
            dialogTitle: `${actor.name} | ${item.name}`, dialogId: "fizbansplatinumshield", initialTimeLeft: 30,
            validTokenPrimaryUuid: tokenDocument.uuid, focusTokenUuid: targets[0].uuid, source: game.gps.getPrimaryGM() === browser ? "gm" : "user", type: "singleDialog",
            dialogContent: `<div class="gps-dialog-container"><p class="gps-dialog-paragraph">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.Spells.FizbansPlatinumShield.PromptSelectTarget")}</p><label for="ally-token" class="gps-dialog-label">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Target")}</label><select id="ally-token" class="gps-dialog-select">${targets.map(t => `<option value="${t.uuid}">${foundry.utils.escapeHTML(t.name)}</option>`).join("")}</select><div class="gps-dialog-button-container"><button id="pauseButton_fizbansplatinumshield" type="button"><i class="fas fa-pause"></i>${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Pause")}</button></div></div>`
        });
        if(result?.userDecision && targets.some(t => t.uuid === result.allyTokenUuid))
            await game.gps.queryGM("moveFizbanShield", {helperUuid: item.uuid, effectUuid: effect.uuid, casterUuid: tokenDocument.uuid, targetUuid: result.allyTokenUuid});
        return;
    }
    if(pass === "postActiveEffects") {
        const cast = castConcentration(actor, item, {workflow, allowUnique: true});
        if(!cast || !tokenDocument) return;
        for(const target of workflow.targets.documents) {
            const shield = appliedSpellEffect(target.actor, item, {cast, workflow, matches: shieldChange});
            if(!shield || actor.items.some(i => i.flags[gps]?.fizbanShield?.effectUuid === shield.uuid)) continue;
            if(!shield.flags.dnd5e?.dependentOn) {
                await MidiQOL.socket().executeAsGM("updateEffects", {actorUuid: target.actor.uuid,
                    updates: [{_id: shield.id, "flags.dnd5e.dependentOn": cast.uuid}]});
            }
            await grantEffectItems(cast, [tokenDocument], game.gps.disableBlfxAutoRecognition({
                name: `${item.name} - ${game.i18n.localize("GAMBITSPREMADES.EffectHelpers.ChangeTarget")} (${target.name})`, type: "feat", img: "icons/magic/defensive/shield-barrier-deflect-teal.webp",
                system: {type: {value: "feat"}, activities: {fpsChangeTarget: {type: "utility", activation: {type: "bonus"},
                    duration: {units: "inst"}, range: {units: "any"}, consumption: {spellSlot: false}}}},
                flags: {autoanimations: {isEnabled: false, version: 5},
                    "midi-qol": {onUseMacroName: "[preActiveEffects]function.game.gps.fizbansPlatinumShield"},
                    [gps]: {fizbanShield: {itemUuid: item.uuid, casterUuid: tokenDocument.uuid, targetUuid: target.uuid, effectUuid: shield.uuid}}}
            }), i => i.flags[gps]?.fizbanShield?.effectUuid === shield.uuid);
            playShield(target, item, cast.uuid);
        }
    }
    if(args[0] !== "off" || game.gps.effectSuspended(args.at(-1))) return;
    const context = args.at(-1);
    const caster = (args[2] && await fromUuid(args[2])) ?? item?.actor;
    const affected = context.tokenUuid ? await fromUuid(context.tokenUuid) : tokenDocument;
    const castUuid = context.efData?.flags?.dnd5e?.dependentOn ?? context.efData?.system?.origin?.effect;
    if(affected && castUuid) await globalThis.Sequencer?.EffectManager?.endEffects({name: shieldVisual(castUuid, affected)});
    for(const helper of caster?.items ?? []) {
        if(helper.flags[gps]?.fizbanShield?.effectUuid === context.effectUuid && fromUuidSync(helper.getFlag(gps, "ownerEffectUuid"), {strict: false}))
            await game.gps.queryGM("gmDeleteItem", {itemUuid: helper.uuid});
    }
}

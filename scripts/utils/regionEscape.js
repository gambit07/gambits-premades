export function regionEscapeTurn(token) {
    return !game.combat?.started || game.combat.combatant?.token?.uuid === token.uuid;
}

export async function ensureRegionEscape({tokenUuid, regionUuid}) {
    const token = await fromUuid(tokenUuid);
    const region = await fromUuid(regionUuid);
    if(!token?.actor || !region) return;
    const restraint = game.gps.regionStatusEffects(token, regionUuid)[0];
    if(!restraint) return;
    const existing = token.actor.items.find(item => item.flags["gambits-premades"]?.regionEscape?.regionUuid === regionUuid);
    if(existing) return existing.uuid;
    const spell = await fromUuid(region.getFlag("dnd5e", "item"));
    const check = spell?.system.activities.find(activity => activity.type === "check");
    if(!check || !Number.isFinite(check.check.dc.value)) return;
    const abilities = spell.system.identifier === "black-tentacles" && spell.system.source.rules === "2014" ? ["str", "dex"] : ["str"];
    const activities = {};
    for(const ability of abilities) {
        const data = check.toObject();
        data._id = foundry.utils.randomID();
        data.name = game.i18n.localize(CONFIG.DND5E.abilities[ability].label);
        data.activation = {type: "action", value: 1, override: true};
        data.consumption = {spellSlot: false, targets: [], scaling: {allowed: false}};
        data.range = {override: true, units: "self"};
        data.target = {override: true, prompt: false, affects: {type: "self", count: "1"}, template: {type: "", units: "ft"}};
        data.check.ability = ability;
        data.check.dc = {calculation: "", formula: String(check.check.dc.value)};
        data.effects = [];
        data.midiProperties = {...data.midiProperties, automationOnly: false, identifier: `regionEscape-${ability}`, confirmTargets: "none"};
        activities[data._id] = data;
    }
    const [created] = await token.actor.createEmbeddedDocuments("Item", [game.gps.disableBlfxAutoRecognition({
        name: game.i18n.format("GAMBITSPREMADES.RegionEscape.Name", {spell: spell.name}), type: "feat", img: spell.img,
        system: {type: {value: "monster"}, description: {value: game.i18n.localize("GAMBITSPREMADES.RegionEscape.Description")}, activities, source: {rules: spell.system.source.rules}},
        flags: {autoanimations: {isEnabled: false, version: 5}, dnd5e: {dependentOn: restraint.uuid}, "gambits-premades": {regionEscape: {regionUuid, tokenUuid}}, "midi-qol": {onUseMacroName: "[prePreambleComplete]function.game.gps.regionEscapeAction,[postActiveEffects]function.game.gps.regionEscapeAction"}}
    })]);
    return created?.uuid;
}

export async function regionEscapeAction({item, args, workflow}) {
    const state = item.flags["gambits-premades"]?.regionEscape;
    if(!state) return;
    const token = await fromUuid(state.tokenUuid);
    const region = await fromUuid(state.regionUuid);
    if(args?.[0]?.macroPass === "prePreambleComplete") {
        if(!token?.actor || !region || !regionEscapeTurn(token) || !game.gps.regionStatusEffects(token, region.uuid).length) {
            workflow.aborted = true;
            return;
        }
        workflow.targets = new Set([token.object]);
    }
    if(args?.[0]?.macroPass === "postActiveEffects" && !workflow.aborted && workflow.saves?.has(token?.object)) {
        await game.gps.queryGM("setRegionStatus", {tokenUuid: token.uuid, regionUuid: region.uuid, active: false});
    }
}

export async function useRegionEscape({itemUuid, ability = "str", openSheet = false}) {
    const item = await fromUuid(itemUuid);
    if(!item?.flags["gambits-premades"]?.regionEscape) return;
    if(openSheet) return void item.sheet.render(true);
    const activity = item.system.activities.find(activity => activity.identifier === `regionEscape-${ability}`);
    if(!activity) return;
    const result = await MidiQOL.completeActivityUse(activity.uuid, {midiOptions: {
        targetUuids: [item.flags["gambits-premades"].regionEscape.tokenUuid], ignoreUserTargets: true,
        configureDialog: false, workflowData: true
    }}, {}, {});
    return !!result && !result.aborted;
}

export async function promptRegionEscape({tokenUuid, regionUuid, turnKey, regionScenario}) {
    const itemUuid = await game.gps.queryGM("ensureRegionEscape", {tokenUuid, regionUuid});
    if(!itemUuid || !await game.gps.queryGM("claimRegionEscape", {tokenUuid, regionUuid, turnKey})) return;
    const token = await fromUuid(tokenUuid);
    const item = await fromUuid(itemUuid);
    if(!item || !token?.actor) return;
    const canAct = regionScenario !== "tokenTurnEnd" && regionEscapeTurn(token) && !token.actor.getFlag("midi-qol", "actions")?.action;
    const choices = canAct && item.system.activities.size > 1 ? `<label><input type="radio" name="ability-check" value="str" checked> ${game.i18n.localize(CONFIG.DND5E.abilities.str.label)}</label><label><input type="radio" name="ability-check" value="dex"> ${game.i18n.localize(CONFIG.DND5E.abilities.dex.label)}</label>` : "";
    const user = game.gps.getBrowserUser({actorUuid: token.actor.uuid});
    const result = await game.gps.queryDialog("process3rdPartyReactionDialog", user, {
        dialogTitle: `${token.actor.name} | ${item.name}`, dialogId: "regionEscape", initialTimeLeft: 30,
        validTokenPrimaryUuid: tokenUuid, source: user === game.gps.getPrimaryGM() ? "gm" : "user", type: "singleDialog",
        dialogContent: `<div class="gps-dialog-container"><p>${game.i18n.localize(canAct ? "GAMBITSPREMADES.RegionEscape.UseAction" : "GAMBITSPREMADES.RegionEscape.Reminder")}</p>${choices}<div class="gps-dialog-button-container"><button id="pauseButton_regionEscape" type="button" class="gps-dialog-button"><i class="fas fa-pause" id="pauseIcon_regionEscape"></i>${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Pause")}</button></div></div>`
    });
    if(result?.userDecision) await game.gps.queryUser("useRegionEscape", user, {itemUuid, ability: result.abilityCheck ?? "str", openSheet: !canAct});
}

const MODULE_ID = "gambits-premades";
const MAIN_ACTIVITY = "dnd5eactivity000";
const DAMAGE_ACTIVITY = "dnd5eactivity200";
const retaliations = new WeakMap();
const loc = key => game.i18n.localize(`GAMBITSPREMADES.Wickerbone.${key}`);
const activeForm = actor => actor?.effects.find(effect => effect.active && effect.getFlag(MODULE_ID, "wickerbone"));
const isWildShape = item => item?.system.identifier?.replace(/-legacy$/, "") === "wild-shape";

/** Register damage accounting and successful Wild Shape use cleanup. */
export function registerWickerboneHooks() {
    Hooks.on("dnd5e.preApplyDamage", (actor, amount, updates) => {
        const effect = activeForm(actor);
        if(!effect) return;
        const hp = actor.system.attributes.hp;
        const nextHp = foundry.utils.getProperty(updates, "system.attributes.hp.value") ?? updates["system.attributes.hp.value"] ?? hp.value;
        const nextTemp = foundry.utils.getProperty(updates, "system.attributes.hp.temp") ?? updates["system.attributes.hp.temp"] ?? hp.temp ?? 0;
        const loss = Math.max(0, hp.value - nextHp) + Math.max(0, (hp.temp ?? 0) - nextTemp);
        if(!loss) return;
        const state = actor.getFlag(MODULE_ID, "wickerboneState");
        updates[`flags.${MODULE_ID}.wickerboneState`] = {
            ...(state?.effectUuid === effect.uuid ? state : {}),
            effectUuid: effect.uuid,
            damage: (state?.effectUuid === effect.uuid ? Number(state.damage) || 0 : 0) + Math.max(loss, Number(amount) || 0)
        };
    });
    Hooks.on("dnd5e.postUseActivity", async (activity, usage, results) => {
        const actor = activity.actor;
        if(!actor || !activeForm(actor) || activity.item.system.identifier === "wickerbone-behemoth") return;
        const resources = activity.consumption.targets.filter(target => target.type === "itemUses")
            .map(target => actor.items.get(target.target));
        const usedShape = isWildShape(activity.item) || (usage.consume?.resources !== false && resources.some(isWildShape));
        if(usedShape && results) await endWickerbone(actor);
    });
    Hooks.on("dnd5e.transformActorV2", (actor, source, data, settings) => {
        if(settings.preset !== "wildshape" || !activeForm(actor)) return;
        data.effects = data.effects.filter(effect => !effect.flags?.[MODULE_ID]?.wickerbone);
        data.items = data.items.filter(item => !item.flags?.[MODULE_ID]?.wickerboneArm);
        if(data.flags?.[MODULE_ID]) delete data.flags[MODULE_ID].wickerboneState;
        void endWickerbone(actor);
    });
}

/** Remove the transformation without modifying unrelated effects. */
async function endWickerbone(actor) {
    const ids = actor.effects.filter(effect => effect.getFlag(MODULE_ID, "wickerbone")).map(effect => effect.id);
    if(ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
}

/** Validate activation and bind the actor-owned Wild Shape resource. */
async function prepareTransformation(actor, item, workflow) {
    if(actor.armor) {
        ui.notifications.warn(loc("ArmorBlocked"));
        workflow.aborted = true;
        return false;
    }
    const activity = workflow.activity;
    const configured = activity.consumption.targets.find(target => target.type === "itemUses" && isWildShape(actor.items.get(target.target)));
    const matches = actor.items.filter(resource => isWildShape(resource) && Number(resource.system.uses?.max) > 0);
    const resource = configured ? actor.items.get(configured.target) : matches.length === 1 ? matches[0] : null;
    if(!resource) {
        ui.notifications.warn(loc("WildShapeRequired"));
        workflow.aborted = true;
        return false;
    }
    const targets = [{type: "itemUses", target: resource.id, value: "1", scaling: {}}];
    const owned = actor.items.get(item.id);
    const stored = owned?.system.activities.get(MAIN_ACTIVITY)?.toObject().consumption;
    activity.consumption.targets = targets;
    activity.consumption.spellSlot = false;
    if(owned && JSON.stringify(stored?.targets) !== JSON.stringify(targets)) {
        await owned.update({[`system.activities.${MAIN_ACTIVITY}.consumption.targets`]: targets,
            [`system.activities.${MAIN_ACTIVITY}.consumption.spellSlot`]: false});
    }
}

/** Create temporary club attacks representing the transformed arms. */
async function createArms(actor, item, sourceUuid) {
    const attackId = "gpsWickerAttack1";
    const data = ["LeftArm", "RightArm"].filter(side => !actor.items.some(weapon =>
        weapon.getFlag(MODULE_ID, "wickerboneArm") === side && weapon.getFlag(MODULE_ID, "wickerboneSource") === sourceUuid))
        .map(side => (game.gps.disableBlfxAutoRecognition({
            name: loc(side), type: "weapon", img: item.img,
            flags: {autoanimations: {isEnabled: false, version: 5}, dnd5e: {dependentOn: sourceUuid}, [MODULE_ID]: {wickerboneArm: side, wickerboneSource: sourceUuid}},
            system: {
                source: {rules: "2014"}, quantity: 1, equipped: true, proficient: 1,
                type: {value: "simpleM", baseItem: "club"}, properties: ["lgt", "mgc"],
                damage: {base: {number: 1, denomination: 8, bonus: "", types: ["bludgeoning"], custom: {enabled: false, formula: ""}}},
                activities: {[attackId]: {
                    _id: attackId, type: "attack", activation: {type: "action", value: 1},
                    consumption: {spellSlot: false, targets: []},
                    range: {override: true, units: "ft", value: "5"},
                    target: {affects: {type: "creature", count: "1"}, template: {}, prompt: true},
                    attack: {ability: "", type: {value: "melee", classification: "weapon"}},
                    damage: {includeBase: true, parts: []}
                }}
            },
            effects: [{name: item.name, type: "enchantment", transfer: true, origin: item.uuid, img: item.img,
                system: {changes: [{key: `system.activities.${attackId}.attack.abilities`, type: "add", value: "wis", priority: 20}]}}]
        })));
    if(data.length) await actor.createEmbeddedDocuments("Item", data);
}

/** Apply optional appearance changes and initialize the transformation. */
async function beginTransformation(actor, token, item, sourceUuid) {
    const transformed = item.getFlag(MODULE_ID, "wickerboneTexture");
    if(transformed && token?.document) {
        const records = foundry.utils.deepClone(token.document.getFlag(MODULE_ID, "wickerboneTextures") ?? []);
        if(!records.some(record => record.sourceUuid === sourceUuid)) {
            records.push({sourceUuid, previous: foundry.utils.deepClone(token.document._source.texture), applied: {src: transformed, scaleX: 1.5, scaleY: 1.5}});
            await token.document.setFlag(MODULE_ID, "wickerboneTextures", records);
            await token.document.update({"texture.src": transformed, "texture.scaleX": 1.5, "texture.scaleY": 1.5});
        }
    }
    if(actor.getFlag(MODULE_ID, "wickerboneState")?.effectUuid !== sourceUuid) {
        await actor.setFlag(MODULE_ID, "wickerboneState", {effectUuid: sourceUuid, damage: 0});
    }
    await createArms(actor, item, sourceUuid);
}

/** Restore appearance and remove only weapons created by this transformation. */
async function cleanupTransformation(actor, token, sourceUuid) {
    if(token?.document) {
        const records = foundry.utils.deepClone(token.document.getFlag(MODULE_ID, "wickerboneTextures") ?? []);
        const index = records.findIndex(record => record.sourceUuid === sourceUuid);
        if(index >= 0) {
            const record = records[index];
            if(index < records.length - 1) records[index + 1].previous = record.previous;
            else {
                const updates = {};
                for(const key of Object.keys(record.applied)) {
                    if(token.document._source.texture[key] === record.applied[key]) updates[`texture.${key}`] = record.previous[key];
                }
                if(Object.keys(updates).length) await token.document.update(updates);
            }
            records.splice(index, 1);
            if(records.length) await token.document.setFlag(MODULE_ID, "wickerboneTextures", records);
            else await token.document.unsetFlag(MODULE_ID, "wickerboneTextures");
        }
    }
    const ids = actor.items.filter(weapon => weapon.getFlag(MODULE_ID, "wickerboneArm")
        && weapon.getFlag(MODULE_ID, "wickerboneSource") === sourceUuid).map(weapon => weapon.id);
    if(ids.length) await actor.deleteEmbeddedDocuments("Item", ids);
    if(actor.getFlag(MODULE_ID, "wickerboneState")?.effectUuid === sourceUuid) await actor.unsetFlag(MODULE_ID, "wickerboneState");
}

/** Offer eligible recipients after damaging attacks and use the retaliation activity. */
async function retaliate({actor, token, item, workflow}) {
    if(!workflow?.activity?.hasAttack || !token?.document || !workflow.token?.actor) return;
    if(!workflow.hitTargets?.has(token) && !workflow.hitTargetsEC?.has(token)) return;
    const effect = activeForm(actor);
    if(!effect) return;
    const damage = workflow.damageItem;
    const matches = damage && (damage.tokenUuid === token.document.uuid || damage.targetUuid === token.document.uuid || damage.actorUuid === actor.uuid);
    if(!matches || !(Number(damage.totalDamage) > 0) || !(Number(damage.hpDamage) > 0 || Number(damage.tempDamage) > 0)) return;
    const processed = retaliations.get(workflow) ?? new Set();
    const key = `${effect.uuid}:${token.document.uuid}`;
    if(processed.has(key)) return;
    processed.add(key);
    retaliations.set(workflow, processed);
    const nearby = MidiQOL.findNearby(null, token, game.gps.convertFromFeet({range: 5}), {includeToken: true})
        .filter(target => target.actor);
    if(!nearby.length) return;
    const browserUser = game.gps.getBrowserUser({actorUuid: actor.uuid});
    if(!browserUser) return;
    const gmUser = game.gps.getPrimaryGM();
    const dialogId = `wickerbone-${foundry.utils.randomID()}`;
    const escape = foundry.utils.escapeHTML;
    const dialogContent = `<div class="gps-dialog-container"><div class="gps-dialog-section"><div class="gps-dialog-content">
        <p class="gps-dialog-paragraph">${loc("ChooseTargets")}</p>
        <div class="gps-dialog-flex"><div>${nearby.map(target => `<label class="gps-dialog-paragraph"><input class="enemy-tokens" type="checkbox" value="${escape(target.document.uuid)}"> ${escape(target.name)}</label>`).join("<br>")}</div>
        <div class="gps-dialog-image-container"><img src="${escape(item.img)}" class="gps-dialog-image"></div></div>
        </div></div></div>`;
    const common = {dialogTitle: `${actor.name} | ${item.name}`, dialogContent, dialogId, initialTimeLeft: 30,
        validTokenPrimaryUuid: token.document.uuid, numTargets: nearby.length};
    const result = game.settings.get(MODULE_ID, "Mirror 3rd Party Dialog for GMs") && browserUser !== gmUser
        ? await game.gps.handleDialogPromises({userDialogArgs: {...common, source: "user", type: "multiDialog", browserUser},
            gmDialogArgs: {...common, dialogTitle: game.i18n.format("GAMBITSPREMADES.Dialogs.Common.WaitingForSelection", {actorName: actor.name, itemName: item.name}), source: "gm", type: "multiDialog"}})
        : await game.gps.queryDialog("process3rdPartyReactionDialog", browserUser, {...common, source: browserUser === gmUser ? "gm" : "user", type: "singleDialog"});
    if(!result?.userDecision || activeForm(actor)?.uuid !== effect.uuid) return;
    const selected = new Set(result.enemyTokenUuids ?? []);
    const targets = nearby.filter(target => selected.has(target.document.uuid) && game.gps.withinRange(token, target, 5));
    if(!targets.length) return;
    const count = Number(actor.classes?.druid?.system.levels ?? 0) >= 10 ? 2 : 1;
    const activity = item.system.activities.get(DAMAGE_ACTIVITY);
    if(!activity) return;
    if(activity.damage.parts[0].number !== count) await game.gps.queryGM("gpsActivityUpdate", {
        activityUuid: activity.uuid, updates: {"damage.parts": [{number: count, denomination: 4, bonus: "", types: ["piercing"], custom: {enabled: false, formula: ""}, scaling: {mode: "", number: null, formula: ""}}]}
    });
    await game.gps.queryUser("gpsActivityUse", browserUser, {itemUuid: item.uuid, identifier: "wickerboneSplinters", targetUuid: targets.map(target => target.document.uuid)});
}

/** Reset the damage interval and regenerate only while conscious. */
export async function wickerboneTurnStart({actor, token, effect}) {
    if(!effect?.active || !effect.getFlag(MODULE_ID, "wickerbone")) return;
    const state = actor.getFlag(MODULE_ID, "wickerboneState");
    if(state?.effectUuid !== effect.uuid) return;
    const turn = game.combat ? `${game.combat.id}:${game.combat.round}:${game.combat.turn}` : null;
    if(turn && state.lastTurn === turn) return;
    await actor.setFlag(MODULE_ID, "wickerboneState", {effectUuid: effect.uuid, damage: 0, lastTurn: turn});
    if(actor.statuses.has("unconscious") || actor.statuses.has("dead") || actor.system.attributes.hp.value <= 0) return;
    const healing = Math.min(Math.max(0, Math.floor(Number(state.damage) / 2)), Math.max(0, 3 * actor.system.abilities.wis.mod));
    if(healing > 0) await actor.applyDamage([{value: healing, type: "healing"}]);
}

/** Handle Wickerbone activation, effect lifecycle, and attack retaliation. */
export async function wickerboneBehemoth({actor, token, item, args, workflow, macroItem}) {
    item = macroItem ?? item;
    const pass = args?.[0]?.macroPass;
    if(pass === "preItemRoll" && workflow.activity.id === MAIN_ACTIVITY) return prepareTransformation(actor, item, workflow);
    if(pass === "preActiveEffects" && workflow.activity.id === MAIN_ACTIVITY && !workflow.aborted) return endWickerbone(actor);
    if(pass === "isDamaged") return retaliate({actor, token, item, workflow});
    const context = args?.at(-1);
    const sourceUuid = context?.effectUuid ?? (context?.effectId ? `${actor.uuid}.ActiveEffect.${context.effectId}` : undefined);
    if(!sourceUuid) return;
    if(args[0] === "on") return beginTransformation(actor, token, item, sourceUuid);
    if(args[0] === "off") return cleanupTransformation(actor, token, sourceUuid);
}

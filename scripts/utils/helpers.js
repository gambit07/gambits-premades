export { showAutomationDialog, confirmAutomationDialog } from "./dialogUtils.js";
export { disableBlfxAutoRecognition } from "./itemAnimationUtils.js";
export { requestFuryOfTheSmall } from "../automations/raceFeatures/furyOfTheSmall.js";
export { playSpellVisual, setSpellVisual, registerSpellVisuals } from "../animations/spellVisuals/index.js";
export { initializeDrafynMotes, consumeDrafynMote } from "../automations/3rdPartySpells/drafynsBaneOfExcellence.js";
export { resolveHearthSpirit } from "../automations/3rdPartyClassFeatures/witch/covenOfTheRoilingHearth/drawingTheHearth.js";
export { registerRemoteQueries, queryUser, queryGM } from "./queryUtils.js";
export { restrainingRegion } from "./restrainingRegion.js";
export { regionEscapeTurn, ensureRegionEscape, regionEscapeAction, useRegionEscape, promptRegionEscape } from "./regionEscape.js";
export { weaponOil } from "./weaponOil.js";
export { resolveCounterspell, refundCounterspellSlot } from "./counterspellUtils.js";
export { counterspellAnimation, playCounterspellAnimation } from "../animations/counterspell.js";
export { silveryBarbsAnimation, playSilveryBarbsAnimation } from "../animations/silveryBarbs.js";
export { replaceD20Result, adjustRollTotal, withinRange, setAttackResult, attackHits } from "./rollUtils.js";
export { forceAttackMiss } from "./attackOutcomeUtils.js";
export { reactionCanChangeOutcome } from "./reactionOutcomeUtils.js";
export { regionStatusEffects, setRegionStatus, claimRegionEscape, regionTurnKey, regionEventUser, cleanupRegionStatuses } from "./regionAutomationUtils.js";
export { updateSaveResult } from "./saveUtils.js";
export { effectTokenHidden, registerDetectionModes, movementSpeedChanges } from "./effectUtils.js";
export { getRegionActor, getRegionAnimationData, prepareRegion, prepareWorkflowRegions, moveRegion, resizeRegion } from "./regionUtils.js";
export async function deleteChatMessage({ chatId }) {
    if(!chatId) return;
    let chatMessage = await game.messages.get(chatId);
    if(!chatMessage) return;
    await chatMessage.delete();
}

export async function addReaction({ actorUuid }) {
    if(!actorUuid) return;
    let actor = await fromUuid(`${actorUuid}`);
    if(actor) {
        const hasEffectApplied = MidiQOL.hasUsedReaction(actor);
        if (!hasEffectApplied) {
            await MidiQOL.setReactionUsed(actor);
        }
    }
}

export async function gmIdentifyItem({ itemUuid }) {
    if(!itemUuid) return;
    let itemData = await fromUuid(`${itemUuid}`);
    if(itemData) await itemData.update({"system.identified": true});
}

export async function gmUpdateDisposition({ tokenUuid, disposition }) {
    if(!tokenUuid || (disposition !== 0 && disposition !== 1 && disposition !== -1)) return;
    let token = await fromUuid(`${tokenUuid}`);
    if(token) await token.update({"disposition" : disposition});
}

export async function gmToggleStatus({ tokenUuid, status, active }) {
    if(!tokenUuid || !status || (active !== true && active !== false)) return;
    let token = await fromUuid(tokenUuid);
    if(token?.actor) return await token.actor.toggleStatusEffect(status, { active, overlay: false });
}

export async function freeSpellUse({ item, actor, activity }) {
    const targets = activity?.consumption?.targets ?? [];
    const isItemUse = targets.some(t => t.type === "itemUses");
    const isActivityUse = !isItemUse && targets.some(t => t.type === "activityUses");
    const isCounterMode = isItemUse || isActivityUse;

    const genericEffectName = game.i18n.format("GAMBITSPREMADES.Effects.Utils.Helpers.LongRestChargeUsed", { itemName: item.name });

    const uses = isItemUse ? item?.system?.uses : isActivityUse ? activity?.uses : null;
    const spent = Number(uses?.spent ?? 0);
    const max = Number(uses?.max ?? 0);
    const remaining = Math.max(0, max - spent);
    const availableUses = isCounterMode ? (max > 0 && spent < max) : false;

    const restModeKey = isCounterMode ? (uses?.recovery?.[0]?.period ?? "lr") : "lr";
    const isDaily = !(restModeKey === "sr" || restModeKey === "lr");
    const restModeNameLocalized = restModeKey === "sr" ? game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.ShortRest") : restModeKey === "lr" ? game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.LongRest") : game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Daily");
    const specialDuration = restModeKey === "sr" ? ["shortRest"] : restModeKey === "lr" ? ["longRest"] : ["newDay"];

    if (isCounterMode) {
        if (!availableUses) return false;
    } else {
        const alreadyGeneric = actor.appliedEffects.some(e => e.name === genericEffectName);
        if (alreadyGeneric) return false;
    }

    const effectNameCurrent = isCounterMode ? `${item.name}: ${spent}/${max} ${restModeNameLocalized} Charges Used` : genericEffectName;

    const effectNameNext = isCounterMode ? `${item.name}: ${spent + 1}/${max} ${restModeNameLocalized} Charges Used` : genericEffectName;

    const remainingText = isCounterMode ? (remaining > 1 ? game.i18n.format("GAMBITSPREMADES.ChatMessages.Utils.Helpers.UsesRemaining", { remaining: remaining }) : remaining === 1 ? game.i18n.format("GAMBITSPREMADES.ChatMessages.Utils.Helpers.Remaining", { remaining: remaining }) : ``) : game.i18n.format("GAMBITSPREMADES.Dialogs.Utils.Helpers.ThisGrantsOneFreeUse", { restModeText: isDaily ? restModeNameLocalized : game.i18n.format("GAMBITSPREMADES.ChatMessages.Utils.Helpers.Per", { restModeName: restModeNameLocalized }) });

    const result = await game.gps.showAutomationDialog({
        window: { title: game.i18n.format("GAMBITSPREMADES.Dialogs.Common.FreeUse", { itemName: item.name }) },
        content: `
        <div class="gps-dialog-container">
            <div class="gps-dialog-section">
            <div class="gps-dialog-content">
                <div>
                <div class="gps-dialog-flex">
                    <p class="gps-dialog-paragraph">
                    ${game.i18n.format("GAMBITSPREMADES.Dialogs.Utils.Helpers.PromptFreeUse", { itemName: item.name, remainingText: remainingText })}
                    </p>
                    <div id="image-container" class="gps-dialog-image-container">
                    <img src="${item.img}" class="gps-dialog-image">
                    </div>
                </div>
                </div>
            </div>
            </div>
        </div>
        `,
        buttons: [
        {
            action: "Yes",
            label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Yes"),
            callback: async () => {
            if (isCounterMode) {
                const prevCount = actor.appliedEffects.find(e => e.name === effectNameCurrent);
                if (prevCount) await prevCount.delete();
                const nextCount = actor.appliedEffects.find(e => e.name === effectNameNext);
                if (nextCount) await nextCount.delete();
                const prevGeneric = actor.appliedEffects.find(e => e.name === genericEffectName);
                if (prevGeneric) await prevGeneric.delete();
            }

            const effectData = {
                name: effectNameNext,
                img: item.img,
                duration: {},
                origin: item.uuid,
                flags: { dae: { specialDuration } }
            };

            ui.notifications.info(game.i18n.format("GAMBITSPREMADES.Notifications.Helpers.CastOptionNoSlotConsumed", { restModeName: restModeNameLocalized, name: item.name }));

            await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);

            if (isItemUse) await item.update({ "system.uses.spent": spent + 1 });
            else if (isActivityUse) await activity.update({ "uses.spent": spent + 1 });

            return true;
            }
        },
        { action: "No", label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.No"), callback: async () => false }
        ],
        close: async () => false,
        rejectClose: false
    });

    return result;
}

export async function gmUpdateTemplateSize({ templateUuid, templateSize }) {
    if(!templateUuid || !templateSize) return;
    await game.gps.resizeRegion({ regionUuid: templateUuid, radius: Number(templateSize) });
}

const reactionDialogs = new Map();

export function registerDialogQueries() {
    for (const [name, handler] of Object.entries({ process3rdPartyReactionDialog, closeDialogById, pauseDialogById })) {
        CONFIG.queries[`gambits-premades.${name}`] = handler;
    }
}

export async function queryDialog(name, userId, data) {
    if (!["process3rdPartyReactionDialog", "closeDialogById", "pauseDialogById"].includes(name)) throw new Error(`Invalid dialog query: ${name}`);
    const user = game.users.get(userId);
    if (!user?.active) return { userDecision: false, programmaticallyClosed: true };
    data = { ...data, requestId: data.requestId ?? foundry.utils.randomID() };
    const queryName = `gambits-premades.${name}`;
    let disconnected;
    try {
        if (user.isSelf) return await CONFIG.queries[queryName](data, { user: game.user });
        const disconnect = new Promise(resolve => {
            disconnected = Hooks.on("userConnected", (changedUser, connected) => {
                if (changedUser.id === user.id && !connected) resolve({ userDecision: false, programmaticallyClosed: true });
            });
        });
        return await Promise.race([user.query(queryName, data, name === "process3rdPartyReactionDialog" ? {} : { timeout: 5000 }), disconnect]);
    } catch (error) {
        console.warn("Gambit's Premades | Dialog query failed", error);
        return { userDecision: false, programmaticallyClosed: true };
    } finally {
        if (disconnected !== undefined) Hooks.off("userConnected", disconnected);
    }
}

export async function closeDialogById({ requestId }, { user = game.user } = {}) {
    const state = reactionDialogs.get(requestId);
    if (!state || ![state.requesterId, state.peerUserId, game.user.id].includes(user.id)) return;
    if (state.interacted) return;
    state.programmaticallyClosed = true;
    await state.dialog?.close();
}

export function pauseDialogById({ requestId, timeLeft, isPaused }, { user = game.user } = {}) {
    const state = reactionDialogs.get(requestId);
    if (!state || ![state.requesterId, state.peerUserId, game.user.id].includes(user.id)) return;
    const dialog = state.dialog;
    if (!dialog?.setPaused || dialog._closing) {
        state.pendingPause = { timeLeft, isPaused };
        return;
    }
    dialog.setPaused(isPaused);
    dialog.setTimeLeft(timeLeft);
    dialog.updateUI(true);
}

export async function rollAsUser({ rollParams, type }) {
    if(!rollParams) return;
    let reroll;
    
    reroll = await new Roll(`${rollParams}`).evaluate();

    await MidiQOL.displayDSNForRoll(reroll, 'damageRoll');
    return reroll;
}

export function convertFromFeet({ range, scene = canvas.scene }) {
    const units = scene.grid.units;
    const feetPerMeter = CONFIG.DND5E.movementUnits.m.conversion;
    const metersPerFoot = 1 / feetPerMeter;
    let conversionFactor;
    if (units === "meters" || units === "m" || units === "mt" || units === "metri") conversionFactor = metersPerFoot;
    else conversionFactor = 1;
    return range * conversionFactor;
}

export async function handleDialogPromises({userDialogArgs, gmDialogArgs}) {
    if (!userDialogArgs || !gmDialogArgs) return;
    const gmUser = getPrimaryGM();
    const browserUser = userDialogArgs.browserUser;
    const requestId = foundry.utils.randomID();
    if (browserUser === gmUser || !game.users.get(browserUser)?.active) {
        return queryDialog("process3rdPartyReactionDialog", gmUser, { ...gmDialogArgs, requestId, type: "singleDialog" });
    }
    const dialogs = [
        { userId: browserUser, args: { ...userDialogArgs, requestId, peerUserId: gmUser } },
        { userId: gmUser, args: { ...gmDialogArgs, requestId, peerUserId: browserUser } }
    ];
    return new Promise(resolve => {
        let remaining = dialogs.length;
        let settled = false;
        for (const { userId, args } of dialogs) {
            queryDialog("process3rdPartyReactionDialog", userId, args).then(result => {
                remaining--;
                if (settled) return;
                if (result && !result.programmaticallyClosed) {
                    settled = true;
                    for (const other of dialogs) {
                        if (other.userId !== userId) void queryDialog("closeDialogById", other.userId, { requestId });
                    }
                    resolve(result);
                } else if (!remaining) {
                    settled = true;
                    resolve({ userDecision: false, programmaticallyClosed: true });
                }
            });
        }
    });
}

export function findValidTokens({initiatingToken, targetedToken, itemName, itemType, itemChecked, reactionCheck, sightCheck, sightCheckType = "enemy", rangeCheck, rangeTotal, dispositionCheck, dispositionCheckType, workflowType, workflowCombat, gpsUuid, sourceRules = "2014"}) {
    let validTokens = [];

    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    let workflowNonCombat = MidiQOL.safeGetGameSetting('gambits-premades', 'enable3prNoCombat');

    if (!workflowCombat || workflowNonCombat) {
        validTokens = canvas.tokens.placeables.filter(t => filterToken(t));
    } else {
        validTokens = game.combat?.combatants?.map(combatant => canvas.tokens.get(combatant.tokenId)).filter(t => filterToken(t)) ?? [];
    }
    
    function filterToken(t) {
        // Check if invalid token on the canvas
        if (!t?.actor) {
            if(debugEnabled) game.gps.logInfo(`${itemName} for ${t?.actor ? t.actor.name : "Unknown Actor"} failed at invalid token actor on canvas`);
            return;
        }
        let checkItem;
        if(gpsUuid) checkItem = t.actor?.items?.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        else checkItem = t.actor?.items?.find(i => i.name.toLowerCase() === itemName.toLowerCase());
        const effectNamesOrigin = ["Confusion", "Arms of Hadar", "Shocking Grasp", "Slow", "Staggering Smite"];
        let hasEffectOrigin = t.actor?.appliedEffects.some(effect => effectNamesOrigin.includes(effect.name));
        let measuredDistance = !rangeCheck ? 0 : (dispositionCheckType === "ally" || dispositionCheckType === "enemyAlly") ? MidiQOL.computeDistance(targetedToken,t, {wallsBlock: true, includeCover: true}) : MidiQOL.computeDistance(initiatingToken,t, {wallsBlock: true, includeCover: true});
        let range = game.gps.convertFromFeet({range: rangeTotal});

        // Check if the token has the actual item to use (With some checking for 2014/2024)
        if(!checkItem && sourceRules === "2024") {
            if(debugEnabled) game.gps.logInfo(`${itemName} 2024 for ${t.actor.name} failed at check if reaction item exists`);
            return;
        }

        else if(!checkItem) {
            if(debugEnabled) game.gps.logInfo(`${itemName} for ${t.actor.name} failed at check if reaction item exists`);
            return;
        }

        // Check if the tokens reaction already used
        else if(reactionCheck && MidiQOL.hasUsedReaction(t.actor)) {
            if(debugEnabled) game.gps.logInfo(`${itemName} for ${t.actor.name} failed at reaction available`);
            return;
        }

        // Check if the token is incapacitated
        else if(MidiQOL.checkIncapacitated(t)) {
            if(debugEnabled) game.gps.logInfo(`${itemName} for ${t.actor.name} failed at is incapacitated`);
            return;
        }

        // Check if the token is the initiating token or not a qualifying token disposition
        else if(dispositionCheck && (((dispositionCheckType === "enemy" || dispositionCheckType === "enemyAlly") && t.document.disposition === initiatingToken.document.disposition) || (dispositionCheckType === "ally" && t.document.disposition !== initiatingToken.document.disposition))) {
            if(debugEnabled) game.gps.logInfo(`${itemName} for ${t.actor.name} failed at token disposition check`);
            return;
        }

        // Check if token can see initiating token
        else if(sightCheck && ((sightCheckType === "ally" && !MidiQOL.canSee(t, targetedToken)) || (sightCheckType === "enemy" && !MidiQOL.canSee(t, initiatingToken)))) {
            if(debugEnabled) game.gps.logInfo(`${itemName} for ${t.actor.name} failed at sight check`);
            return;
        }

        // Check if token is under an effect preventing reactions
        else if(reactionCheck && hasEffectOrigin) {
            if(debugEnabled) game.gps.logInfo(`${itemName} for ${t.actor.name} failed at spell effect preventing reaction`);
            return;
        }

        // Check if token is within range
        else if(rangeCheck && (measuredDistance === -1 || (measuredDistance > range))) {
            if(debugEnabled) game.gps.logInfo(`${itemName} for ${t.actor.name} failed at range check`);
            return;
        }

        // Check if the token has available spell slots/uses
        if(itemType === "spell") {
            let multiClass;
            if (t.actor.classes?.warlock) {
                const classKeys = Object.keys(t.actor.classes);
                multiClass = classKeys.some(className => className !== 'warlock');
            }
    
    
            const spells = t.actor.system.spells;
            let spellLevel = checkItem?.system?.level;
            let checkType = checkItem?.system?.method;
            let hasSpellSlots = false;
            if(checkType === "spell" && !checkItem?.system?.prepared) {
                if(debugEnabled) game.gps.logInfo(`${itemName} failed at spell not prepared`);
                return false;
            }
            const cachedForValue = checkItem.flags?.dnd5e?.cachedFor;

            if(cachedForValue) {
                const match = cachedForValue.match(/\.Item\.([^.]+)\.Activity\./);
                if (match) {
                    const castItemId = match[1];
                    const castItem = checkItem.parent.items.get(castItemId);
                    if(castItem) {
                        let slotValue = castItem.system.uses.max - castItem.system.uses.spent;
                        let slotEnabled = castItem.system.uses.max;
                        if (slotValue > 0 || !slotEnabled) hasSpellSlots = true;
                    }
                }
            }
            else if(checkType === "spell")
            {
                for (let level = spellLevel; level <= 9; level++) {
                    let spellSlot = t.actor.system.spells[`spell${level}`]?.value;
                    if (spellSlot > 0) {
                        hasSpellSlots = true;
                        break;
                    }
                }
            }
            else if(checkType === "pact" && multiClass)
            {
                let spellSlotValue = spells.pact.value;
                if (spellSlotValue > 0) hasSpellSlots = true;
                else {
                    for (let level = spellLevel; level <= 9; level++) {
                        let spellSlot = t.actor.system?.spells[`spell${level}`]?.value;
                        if (spellSlot > 0) {
                            hasSpellSlots = true;
                            break;
                        }
                    }
                }
            }
            else if(checkType === "pact")
            {
                let spellSlotValue = spells.pact.value;
                if (spellSlotValue > 0) hasSpellSlots = true;
            }
            else if(checkType === "innate" || checkType === "atwill")
            {
                let slotValue = checkItem.system.uses.max - checkItem.system.uses.spent;
                let slotEnabled = checkItem.system.uses.max;
                if (slotValue > 0 || !slotEnabled) hasSpellSlots = true;
            }
    
            if (!hasSpellSlots) {
                if(debugEnabled) game.gps.logInfo(`${itemName} for ${t.actor.name} failed at check valid spell slots/preparation`);
                return false;
            }
        }

        // Check if the token has available resource or item uses
        if(itemType === "feature") {
            let itemNames;
            if(itemChecked) itemNames = itemChecked.map(item => item.toLowerCase());
            else itemNames = [checkItem.name.toLowerCase()];
            let resourceExistsWithValue;
            let itemExistsWithValue;

            if(itemNames.includes("legres")) resourceExistsWithValue = (t.actor.system.resources?.legres?.value ?? 0) > 0;
            else itemExistsWithValue = t.actor.items.some(i => (itemNames.includes(i.name.toLowerCase()) || itemNames.includes(i.identifier?.toLowerCase())) && i.system.uses?.spent < i.system.uses?.max);

            if (!itemExistsWithValue && !resourceExistsWithValue) {
                if(debugEnabled) game.gps.logInfo(`${itemName} for ${t.actor.name} failed at check valid feature item/resource uses`);
                return;
            }
        }

        if(itemType === "item") {
            const itemNames = itemChecked.map(s => s.toLowerCase().trim());

            const itemExists = t.actor.items.some(i => {
                const id   = i.identifier?.toLowerCase() ?? "";
                const name = i.name?.toLowerCase() ?? "";
                const acts = i.system?.activities ?? [];

                return i.system?.equipped === true && itemNames.some(n =>
                    id.includes(n) || name.includes(n) || acts.some(a => a.actionType?.toLowerCase().includes(n))
                );
            });

            if (!itemExists) {
                if(debugEnabled) game.gps.logInfo(`${itemName} for ${t.actor.name} failed at valid item supporting feature`);
                return;
            }
        }

        if(debugEnabled) {
            if(sourceRules === "2024") console.warn(`%c${itemName} 2024 for ${t.actor.name} Reaction Validation Passed`, 'font-weight: bold');
            else console.warn(`%c${itemName} for ${t.actor.name} Reaction Validation Passed`, 'font-weight: bold');
        }

        return t;
    };

    return validTokens;
}

export function findValidToken({initiatingTokenUuid, targetedTokenUuid, itemName, itemType, itemChecked, reactionCheck, sightCheck, sightCheckType = "enemy", rangeCheck, rangeTotal, dispositionCheck, dispositionCheckType, workflowType, workflowCombat, gpsUuid, sourceRules = "2014"}) {
    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    let workflowNonCombat = MidiQOL.safeGetGameSetting('gambits-premades', 'enable3prNoCombat');

    if (workflowCombat && !workflowNonCombat) {
        let combat = game.combat;
        if (!combat) {
            if(debugEnabled) game.gps.logInfo(`${itemName} failed at check if combat active`);
            return false;
        }
    }

    let targetedToken = fromUuidSync(targetedTokenUuid);
    targetedToken = targetedToken?.object;
    if(!targetedToken) {
        if(debugEnabled) game.gps.logInfo(`${itemName} failed no targetedToken found`);
        return false;
    }

    let initiatingToken = fromUuidSync(initiatingTokenUuid);
    initiatingToken = initiatingToken?.object;
    if(!initiatingToken) {
        if(debugEnabled) game.gps.logInfo(`${itemName} failed no initiatingToken found`);
        return false;
    }

    // Check if invalid token on the canvas
    if (!targetedToken?.actor) {
        if(debugEnabled) game.gps.logInfo(`${itemName} for ${targetedToken.actor ? targetedToken.actor.name : "Unknown Actor"} failed at invalid token actor on canvas`);
        return false;
    }
    let checkItem;
    if(gpsUuid) checkItem = targetedToken?.actor?.items?.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
    else checkItem = targetedToken?.actor?.items?.find(i => i.name.toLowerCase() === itemName.toLowerCase());
    const effectNamesOrigin = ["Confusion", "Arms of Hadar", "Shocking Grasp", "Slow", "Staggering Smite"];
    let hasEffectOrigin = targetedToken?.actor?.appliedEffects.some(effect => effectNamesOrigin.includes(effect.name));
    let measuredDistance = !rangeCheck ? 0 : MidiQOL.computeDistance(initiatingToken,targetedToken, {wallsBlock: true, includeCover: true});
    let range = game.gps.convertFromFeet({range: rangeTotal});

    // Check if the token has the actual item to use
    if(!checkItem && sourceRules === "2024") {
        if(debugEnabled) game.gps.logInfo(`${itemName} 2024 for ${targetedToken.actor.name} failed at check if reaction item exists`);
        return;
    }

    else if(!checkItem) {
        if(debugEnabled) game.gps.logInfo(`${itemName} for ${targetedToken.actor.name} failed at check if reaction item exists`);
        return;
    }

    // Check if the tokens reaction already used
    else if(reactionCheck && MidiQOL.hasUsedReaction(targetedToken.actor)) {
        if(debugEnabled) game.gps.logInfo(`${itemName} for ${targetedToken.actor.name} failed at reaction available`);
        return false;
    }

    // Check if the token is incapacitated
    else if(MidiQOL.checkIncapacitated(targetedToken)) {
        if(debugEnabled) game.gps.logInfo(`${itemName} for ${targetedToken.actor.name} failed at is incapacitated`);
        return false;
    }

    // Check if the token is the initiating token or not a qualifying token disposition
    else if(dispositionCheck && ((targetedToken.id === initiatingToken.id && workflowType === "attack") || ((dispositionCheckType === "enemy" || dispositionCheckType === "enemyAlly") && targetedToken.document.disposition === initiatingToken.document.disposition) || (dispositionCheckType === "ally" && targetedToken.document.disposition !== initiatingToken.document.disposition))) {
        if(debugEnabled) game.gps.logInfo(`${itemName} for ${targetedToken.actor.name} failed at token disposition check`);
        return false;
    }

    // Check if token can see initiating token
    else if(sightCheck && ((sightCheckType === "ally" && !MidiQOL.canSee(initiatingToken, targetedToken)) || (sightCheckType === "enemy" && !MidiQOL.canSee(targetedToken, initiatingToken)))) {
        if(debugEnabled) game.gps.logInfo(`${itemName} for ${targetedToken.actor.name} failed at sight check`);
        return false;
    }

    // Check if token is under an effect preventing reactions
    else if(reactionCheck && hasEffectOrigin) {
        if(debugEnabled) game.gps.logInfo(`${itemName} for ${targetedToken.actor.name} failed at spell effect preventing reaction`);
        return false;
    }

    // Check if token is within range
    else if(rangeCheck && (measuredDistance === -1 || (measuredDistance > range))) {
        if(debugEnabled) game.gps.logInfo(`${itemName} for ${targetedToken.actor.name} failed at range check`);
        return false;
    }

    // Check if the token has available spell slots/uses
    if(itemType === "spell") {
        let multiClass;
        if (targetedToken.actor.classes?.warlock) {
            const classKeys = Object.keys(targetedToken.actor.classes);
            multiClass = classKeys.some(className => className !== 'warlock');
        }


        const spells = targetedToken.actor.system.spells;
        let spellLevel = checkItem?.system?.level;
        let checkType = checkItem?.system?.method;
        let hasSpellSlots = false;
        if(checkType === "spell" && !checkItem?.system?.prepared) {
            if(debugEnabled) game.gps.logInfo(`${itemName} failed at spell not prepared`);
            return false;
        }
        if(checkType === "spell")
        {
            for (let level = spellLevel; level <= 9; level++) {
                let spellSlot = targetedToken.actor.system.spells[`spell${level}`]?.value;
                if (spellSlot > 0) {
                    hasSpellSlots = true;
                    break;
                }
            }
        }
        else if(checkType === "pact" && multiClass)
        {
            let spellSlotValue = spells.pact.value;
            if (spellSlotValue > 0) hasSpellSlots = true;
            else {
                for (let level = spellLevel; level <= 9; level++) {
                    let spellSlot = targetedToken.actor.system?.spells[`spell${level}`]?.value;
                    if (spellSlot > 0) {
                        hasSpellSlots = true;
                        break;
                    }
                }
            }
        }
        else if(checkType === "pact")
        {
            let spellSlotValue = spells.pact.value;
            if (spellSlotValue > 0) hasSpellSlots = true;
        }
        else if(checkType === "innate" || checkType === "atwill")
        {
            let slotValue = checkItem.system.uses.max - checkItem.system.uses.spent;
            let slotEnabled = checkItem.system.uses.max;
            if (slotValue > 0 || !slotEnabled) hasSpellSlots = true;
        }

        if (!hasSpellSlots) {
            if(debugEnabled) game.gps.logInfo(`${itemName} for ${targetedToken.actor.name} failed at check valid spell slots/preparation`);
            return false;
        }
    }

    // Check if the token has available resource or item uses
    if(itemType === "feature") {
        let itemNames;
        if(itemChecked) itemNames = itemChecked.map(item => item.toLowerCase());
        else itemNames = [checkItem.name.toLowerCase()];
        let resourceExistsWithValue;
        let itemExistsWithValue;

        if(itemNames.includes("legres")) resourceExistsWithValue = (targetedToken.actor.system.resources?.legres?.value ?? 0) > 0;
        else itemExistsWithValue = targetedToken.actor.items.some(i => (itemNames.includes(i.name.toLowerCase()) || itemNames.includes(i.identifier?.toLowerCase())) && i.system.uses?.spent < i.system.uses?.max);

        if (!itemExistsWithValue && !resourceExistsWithValue) {
            if(debugEnabled) game.gps.logInfo(`${itemName} for ${targetedToken.actor.name} failed at check valid feature item/resource uses`);
            return false;
        }
    }

    if(itemType === "item") {
        const itemNames = itemChecked.map(item => item.toLowerCase());
        let itemExists = targetedToken.actor.items.some(i => i.system?.equipped === true && (itemNames.includes(i.identifier?.toLowerCase()) || itemNames.includes(i.name.toLowerCase()) || i.system.activities?.some(activity => itemNames.includes(activity.actionType?.toLowerCase()))));

        if (!itemExists) {
            if(debugEnabled) game.gps.logInfo(`${itemName} for ${targetedToken.actor.name} failed at valid item supporting feature`);
            return false;
        }
    }

    if(debugEnabled) {
        if(sourceRules === "2024") console.warn(`%c${itemName} 2024 for ${targetedToken.actor.name} Reaction Validation Passed`, 'font-weight: bold');
        else console.warn(`%c${itemName} for ${targetedToken.actor.name} Reaction Validation Passed`, 'font-weight: bold');
    }

    return true;
}

export async function process3rdPartyReactionDialog({
    dialogTitle, dialogContent, dialogId, initialTimeLeft, validTokenPrimaryUuid, focusTokenUuid,
    source, type, notificationId, numTargets, requestId = foundry.utils.randomID(), peerUserId
}, { user = game.user } = {}) {
    const state = {interacted: false, programmaticallyClosed: false, dialogId, requestId, requesterId: user.id, peerUserId};
    reactionDialogs.set(requestId, state);
    const disconnected = user.id === game.user.id ? undefined : Hooks.on("userConnected", (changedUser, connected) => {
        if(changedUser.id === user.id && !connected) void closeDialogById({requestId});
    });
    let result;
    try {
        const token = await fromUuid(validTokenPrimaryUuid);
        if(!token?.actor || state.programmaticallyClosed) return {userDecision: false, programmaticallyClosed: true};
        await game.gps.showAutomationDialog({
            render: (event, dialog) => {
                for(const radio of dialog.element.querySelectorAll('input[name="ability-check"]')) radio.required = true;
            },
            window: {title: dialogTitle}, content: dialogContent, initialTimeLeft, source, type, token, numTargets, focusTokenUuid,
            created: dialog => {
                state.dialog = dialog;
                if(state.pendingPause) pauseDialogById({requestId, ...state.pendingPause});
                if(state.programmaticallyClosed) void dialog.close();
            },
            onPause: pause => {
                if(peerUserId && type === "multiDialog") void queryDialog("pauseDialogById", peerUserId, {requestId, ...pause});
            },
            buttons: [
                {action: "yes", label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Yes"), icon: "fas fa-check",
                    callback: (event, button, dialog) => {
                        state.interacted = true;
                        const root = dialog.element;
                        const fields = button.form.elements;
                        result = {
                            userDecision: true,
                            enemyTokenUuid: fields["enemy-token"]?.value ?? false,
                            allyTokenUuid: fields["ally-token"]?.value ?? false,
                            selectedItemUuid: fields[`item-select_${dialogId}`]?.value ?? false,
                            favoriteCheck: fields["gps-favorite-checkbox"]?.checked ?? false,
                            genericCheck: fields["gps-checkbox"]?.checked ?? false,
                            abilityCheck: root.querySelector('input[name="ability-check"]:checked')?.value ?? false,
                            damageChosen: Array.from(root.querySelectorAll("#damage-list li .damage-type"), item => item.dataset.damageType ?? item.textContent.trim()),
                            enemyTokenUuids: Array.from(root.querySelectorAll("input.enemy-tokens:checked"), checkbox => checkbox.value),
                            programmaticallyClosed: false, source, type
                        };
                    }},
                {action: "no", label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.No"), icon: "fas fa-times", default: true,
                    callback: (event, button) => {
                        state.interacted = true;
                        result = {userDecision: false, enemyTokenUuid: button.form.elements["enemy-token"]?.value ?? false, programmaticallyClosed: false, source, type};
                    }}
            ],
            close: () => {
                if(state.programmaticallyClosed || !state.interacted) result = {userDecision: false, programmaticallyClosed: state.programmaticallyClosed, source, type};
            }
        });
        return result;
    } finally {
        reactionDialogs.delete(requestId);
        if(disconnected !== undefined) Hooks.off("userConnected", disconnected);
        if(notificationId && ((type === "multiDialog" && source === "gm") || type === "singleDialog")) {
            void game.gps.queryUser("deleteChatMessage", getPrimaryGM(), {chatId: notificationId}).catch(error => console.warn("Gambit's Premades | Notification cleanup failed", error));
        }
    }
}

export async function moveTokenByOriginPoint({ originX, originY, targetUuid, distance }) {
    if (!targetUuid) return console.log("No valid target to move");
    if (!distance || isNaN(distance)) return console.log("No valid distance to move");
    if (!Number.isFinite(originX) || !Number.isFinite(originY)) {
        return console.log("No valid origin x/y coordinate given, for a token object this value should be token.center.x/token.center.y");
    }

    const targetDocument = await fromUuid(targetUuid);
    const target = targetDocument.object;

    const gridDistance = canvas.scene.dimensions.distance;
    const pixelsPerFoot = canvas.scene.grid.size / gridDistance;
    const gridDiagonals = game.settings.get("core", "gridDiagonals");
    const isSquare = canvas.scene.grid.type === 1;
    const isGridless = canvas.scene.grid.type === 0;

    const ray = new foundry.canvas.geometry.Ray(
        { x: originX, y: originY },
        { x: target.center.x, y: target.center.y }
    );
    const rayAngle = ray.angle;

    const c = Math.cos(rayAngle), s = Math.sin(rayAngle), eps = 1e-12;
    const ux = Math.abs(c) < eps ? 0 : c;
    const uy = Math.abs(s) < eps ? 0 : s;

    const movingTowardOrigin = distance < 0;
    const minCost = gridDistance;
    const pathToOrigin = [
        { x: target.center.x, y: target.center.y },
        { x: originX, y: originY }
    ];
    const currentCost = canvas.grid.measurePath(pathToOrigin).cost;

    if (movingTowardOrigin && currentCost <= minCost) return 0;

    let totalDistance = Math.abs(distance);
    if (movingTowardOrigin) {
        const available = Math.max(0, currentCost - minCost);
        totalDistance = Math.min(totalDistance, available);
    }

    let allowedDistance = totalDistance;
    let measuredCost;

    const dirSign = movingTowardOrigin ? -1 : 1;
    const toCenterAt = (distUnits) => {
        const px = distUnits * pixelsPerFoot;
        return {
        x: target.center.x + dirSign * ux * px,
        y: target.center.y + dirSign * uy * px
        };
    };
    const snapTopLeftFromCenter = (cx2, cy2) => {
        const halfW = target.w / 2, halfH = target.h / 2;
        const snapped = canvas.scene.grid.getSnappedPoint(
        { x: cx2 - halfW, y: cy2 - halfH },
        { mode: 0xFF0, resolution: 1 }
        );
        return { x: snapped.x, y: snapped.y, cx: snapped.x + halfW, cy: snapped.y + halfH };
    };

    let intendedCenter = toCenterAt(allowedDistance);

    let collisionDetected = CONFIG.Canvas.polygonBackends.move.testCollision(
        target.center, new PIXI.Point(intendedCenter.x, intendedCenter.y),
        { type: "move", mode: "any", level: canvas.scene.levels.get(targetDocument._source.level) ?? canvas.level }
    );

    let finalCenterX = intendedCenter.x;
    let finalCenterY = intendedCenter.y;

    if (!collisionDetected) {
        if (isSquare) {
        const maxIters = 1000; let iter = 0;
        while (true) {
            iter++; if (iter > maxIters) { console.warn("moveTokenByOriginPoint guard break"); break; }

            intendedCenter = toCenterAt(allowedDistance);

            const path = [
            { x: target.center.x, y: target.center.y },
            { x: intendedCenter.x, y: intendedCenter.y }
            ];
            const measuredSegments = canvas.grid.measurePath(path);
            measuredCost = measuredSegments.cost;

            if (measuredCost < totalDistance && gridDiagonals === 0) {
            allowedDistance += gridDistance;
            continue;
            } else if (measuredCost <= totalDistance) {
            finalCenterX = intendedCenter.x;
            finalCenterY = intendedCenter.y;
            break;
            }

            allowedDistance -= gridDistance;
            if (allowedDistance <= 0) {
            finalCenterX = target.center.x;
            finalCenterY = target.center.y;
            break;
            }
        }
        }
    } else {
        const stepDistance = canvas.scene.grid.size / 10;
        const totalSteps = (totalDistance * pixelsPerFoot) / stepDistance;
        let stepCounter = 0;

        for (let step = 1; step <= totalSteps; step++) {
        const nextCenterX = target.center.x + dirSign * ux * (stepDistance * step);
        const nextCenterY = target.center.y + dirSign * uy * (stepDistance * step);

        collisionDetected = CONFIG.Canvas.polygonBackends.move.testCollision(
            target.center, new PIXI.Point(nextCenterX, nextCenterY),
            { type: "move", mode: "any", level: canvas.scene.levels.get(targetDocument._source.level) ?? canvas.level }
        );
        if (collisionDetected) break;
        stepCounter = step;
        }

        finalCenterX = target.center.x + dirSign * ux * (stepDistance * stepCounter);
        finalCenterY = target.center.y + dirSign * uy * (stepDistance * stepCounter);
    }

    let finalX = finalCenterX - target.w / 2;
    let finalY = finalCenterY - target.h / 2;

    if (isSquare) {
        const snapped = snapTopLeftFromCenter(finalCenterX, finalCenterY);
        finalX = snapped.x; finalY = snapped.y;
        finalCenterX = snapped.cx; finalCenterY = snapped.cy;
    }

    const postPath = [
        { x: originX, y: originY },
        { x: finalCenterX, y: finalCenterY }
    ];
    let postCost = canvas.grid.measurePath(postPath).cost;

    if (movingTowardOrigin && postCost < minCost) {
        const pxAtMin = (minCost) * pixelsPerFoot;
        const cxMin = originX + ux * pxAtMin;
        const cyMin = originY + uy * pxAtMin;

        if (isSquare) {
        const snappedMin = snapTopLeftFromCenter(cxMin, cyMin);
        finalX = snappedMin.x; finalY = snappedMin.y;
        finalCenterX = snappedMin.cx; finalCenterY = snappedMin.cy;
        } else {
        finalCenterX = cxMin; finalCenterY = cyMin;
        finalX = finalCenterX - target.w / 2;
        finalY = finalCenterY - target.h / 2;
        }
    }

    const path = [
        { x: target.center.x, y: target.center.y },
        { x: finalCenterX, y: finalCenterY }
    ];
    let finalDistance = canvas.grid.measurePath(path).cost;

    await target.document.update({ x: finalX, y: finalY });
    return finalDistance;
}

export async function moveTokenByCardinal({ targetUuid, distance, direction }) {
    const directions = ["north","south","east","west","northwest","northeast","southwest","southeast"];
    direction = direction.toLowerCase();

    if (!targetUuid) return console.log("No valid target to move");
    if (!distance || isNaN(distance)) return console.log("No valid distance to move");
    if (!directions.includes(direction)) return console.log("No valid direction to move (Valid Options: 'North', 'South', 'East', 'West', 'Northwest', 'Northeast', 'Southwest', 'Southeast')");

    const targetDocument = await fromUuid(targetUuid);
    const target = targetDocument.object;

    const gridDistance = canvas.scene.dimensions.distance;
    const pixelsPerFoot = canvas.scene.grid.size / gridDistance;
    const gridDiagonals = game.settings.get("core", "gridDiagonals");

    const V = {
        north: {x:0,y:-1}, south:{x:0,y:1}, east:{x:1,y:0}, west:{x:-1,y:0},
        northwest:{x:-Math.SQRT1_2,y:-Math.SQRT1_2}, northeast:{x:Math.SQRT1_2,y:-Math.SQRT1_2},
        southwest:{x:-Math.SQRT1_2,y:Math.SQRT1_2}, southeast:{x:Math.SQRT1_2,y:Math.SQRT1_2},
    };
    const ux = V[direction].x;
    const uy = V[direction].y;

    let allowedDistance = distance;
    let totalDistance = distance;
    let measuredCost;

    const deltaPx = allowedDistance * pixelsPerFoot;
    let finalCenterX = target.center.x + ux * deltaPx;
    let finalCenterY = target.center.y + uy * deltaPx;

    let collisionDetected = CONFIG.Canvas.polygonBackends.move.testCollision(
        target.center,
        new PIXI.Point(finalCenterX, finalCenterY),
        { type: "move", mode: "any", level: canvas.scene.levels.get(targetDocument._source.level) ?? canvas.level }
    );

    if (!collisionDetected) {
        if (canvas.scene.grid.type === 1) {
        while (true) {
            const px = allowedDistance * pixelsPerFoot;
            const intendedCenterX = target.center.x + ux * px;
            const intendedCenterY = target.center.y + uy * px;

            const path = [
            { x: target.center.x, y: target.center.y },
            { x: intendedCenterX, y: intendedCenterY }
            ];
            const measuredSegments = canvas.grid.measurePath(path);
            measuredCost = measuredSegments.cost;

            if (measuredCost < totalDistance && gridDiagonals === 0) {
            allowedDistance += gridDistance;
            continue;
            } else if (measuredCost <= totalDistance) {
            finalCenterX = intendedCenterX;
            finalCenterY = intendedCenterY;
            break;
            }

            allowedDistance -= gridDistance;
            if (allowedDistance <= 0) {
            allowedDistance = 0;
            finalCenterX = target.center.x;
            finalCenterY = target.center.y;
            break;
            }
        }
        }
    } else {
        const stepDistance = canvas.scene.grid.size / 10;
        const totalSteps = (distance * pixelsPerFoot) / stepDistance;
        let stepCounter = 0;

        for (let step = 1; step <= totalSteps; step++) {
        const nextCenterX = target.center.x + ux * (stepDistance * step);
        const nextCenterY = target.center.y + uy * (stepDistance * step);

        collisionDetected = CONFIG.Canvas.polygonBackends.move.testCollision(
            target.center,
            new PIXI.Point(nextCenterX, nextCenterY),
            { type: "move", mode: "any", level: canvas.scene.levels.get(targetDocument._source.level) ?? canvas.level }
        );
        if (collisionDetected) break;
        stepCounter = step;
        }

        finalCenterX = target.center.x + ux * (stepDistance * stepCounter);
        finalCenterY = target.center.y + uy * (stepDistance * stepCounter);
    }

    let finalX = finalCenterX - target.w / 2;
    let finalY = finalCenterY - target.h / 2;

    if (canvas.scene.grid.type === 1) {
        const snapped = canvas.scene.grid.getSnappedPoint({ x: finalX, y: finalY }, { mode: 0xFF0, resolution: 1 });
        finalX = snapped.x;
        finalY = snapped.y;

        finalCenterX = finalX + target.w / 2;
        finalCenterY = finalY + target.h / 2;
    }

    const path = [
        { x: target.center.x, y: target.center.y },
        { x: finalCenterX, y: finalCenterY }
    ];
    let finalDistance = canvas.grid.measurePath(path).cost;

    await target.document.update({ x: finalX, y: finalY });
    return finalDistance;
}

export async function replaceChatCard({ actorUuid, itemUuid, itemCardUuid, chatContent, rollData }) {
    if(!actorUuid || !itemUuid || !chatContent) return;
    const actor = await fromUuid(actorUuid);
    const item = await fromUuid(itemUuid);
    if (!actor || !item) return;
    const token = MidiQOL.tokenForActor(actor);
    const roll = rollData ? Roll.fromJSON(JSON.stringify(rollData)) : null;
    const rollContent = roll ? await roll.render() : '';
    let chatMessage = itemCardUuid ? MidiQOL.getCachedChatMessage(itemCardUuid) : null;
    chatMessage ??= game.messages.contents.findLast(message =>
        message.type === "usage" && message.getAssociatedItem()?.uuid === itemUuid
        && message.getAssociatedActor()?.uuid === actorUuid
        && (!token || message.speaker.token === token.id && message.speaker.scene === token.document.parent.id)
    );
    const content = `${rollContent}${chatContent}`;
    if (chatMessage) {
        const results = chatMessage.getFlag("gambits-premades", "chatResults") ?? '';
        return chatMessage.setFlag("gambits-premades", "chatResults", results + content);
    }
    return item.displayCard({ data: { "flags.gambits-premades.chatResults": content } });
}

export function renderChatResults(message, element) {
    const content = message.getFlag("gambits-premades", "chatResults");
    if (!content || !message.isContentVisible || element.querySelector(".gps-chat-results")) return;
    element.querySelector(".message-content")?.insertAdjacentHTML("beforeend", `<div class="gps-chat-results">${content}</div>`);
    message.maskHiddenRolls?.(element);
}

/** Configure ritual casting from a preItemRoll callback's live usage and dialog arguments. */
export async function ritualSpellUse({ workflowUuid, workflow, usage, dialog = {} }) {
    workflow ??= workflowUuid ? MidiQOL.Workflow.getWorkflow(workflowUuid) : null;
    if(!workflow || !usage || workflow.macroPass !== "preItemRoll") return;
    if(!workflow.item.system.properties.has("ritual")) return;
    const activation = workflow.activity.activation;

    await game.gps.showAutomationDialog({
        window: { title: game.i18n.format("GAMBITSPREMADES.Dialogs.Utils.Helpers.RitualUse", { itemName: workflow.item.name }) },
        content: `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">${game.i18n.format("GAMBITSPREMADES.Dialogs.Utils.Helpers.PromptRitualCast", { itemName: workflow.item.name, activationCost: activation.value ?? 1, activationType: game.i18n.localize(CONFIG.DND5E.activityActivationTypes[activation.type]?.label ?? activation.type) })}</p>
                                <div id="image-container" class="gps-dialog-image-container">
                                    <img src="${workflow.item.img}" class="gps-dialog-image">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `,
        buttons: [{
            action: "Yes",
            label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Yes"),
            callback: async () => {
                if(usage.consume !== false) {
                    if(!usage.consume || usage.consume === true) usage.consume = {};
                    usage.consume.spellSlot = false;
                }
                (usage.spell ??= {}).slot = "ritual";
                (usage.midiOptions ??= {}).configureDialog = false;
                dialog.configure = false;

                let content = `<span style='text-wrap: wrap;'><img src="${workflow.actor.img}" style="width: 25px; height: auto;" /> ${game.i18n.format("GAMBITSPREMADES.ChatMessages.Utils.Helpers.CastRitually", { actorName: workflow.actor.name, itemName: workflow.item.name })}</span>`
                let chatData = {
                user: getPrimaryGM(),
                content: content,
                whisper: [getPrimaryGM()]
                };
                await MidiQOL.socket().executeAsUser("createChatMessage", getPrimaryGM(), { chatData });
                return;
            }
        },
        {
            action: "No",
            label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.No"),
            callback: async () => false
        }],
        close: async (event, dialog) => {
            return;
        }, rejectClose:false
    });
}

export function getBrowserUser({ actorUuid }) {
    if(!actorUuid) return;

    let actor = fromUuidSync(actorUuid);
    let player = MidiQOL.playerForActor(actor);
    let playerId;
    
    if(!player?.active) playerId = getPrimaryGM();
    else playerId = player.id;
    return playerId;
}

export function getPrimaryGM() {
    const primaryGMId = MidiQOL.safeGetGameSetting('midi-qol', `PreferredGM`);
    
    if (!game.users.get(primaryGMId)?.active) {
      const activeGM = game.users.activeGM;
      
      if (!activeGM) {
        console.warn("No active GM found.");
        return false;
      }
      
      return activeGM.id;
    }

    return primaryGMId;
}

export async function gmDeleteItem({itemUuid}) {
    if(!itemUuid) return;
    let itemData = await fromUuid(itemUuid);
    await itemData.delete();
}

export function getCprConfig({itemUuid, type = "anim"}) {
    if(type === "anim") {
        const defaults = {animEnabled: true, animColor: null, soundVolume: 0.2};
        if(!game.modules.get("cat")?.active) return defaults;
        let itemData = fromUuidSync(itemUuid);
        if(!itemData) return defaults;
        const config = cat.utils.automationUtils.getConfigValues(itemData, ["playAnimation", "color", "soundVolume"]) ?? {};
        return {
            animEnabled: typeof config.playAnimation === "boolean" ? config.playAnimation : defaults.animEnabled,
            animColor: config.color ?? defaults.animColor,
            soundVolume: config.soundVolume ?? defaults.soundVolume
        };
    }
    else if(type === "homebrewDice") {
        if(!game.modules.get("cat")?.active) return {homebrewDiceEnabled: false};
        let itemData = fromUuidSync(itemUuid);
        if(!itemData) return {homebrewDiceEnabled: false};
        let cprConfig = cat.utils.automationUtils.getConfigValues(itemData, ["enableCustomDice", "customDiceNum", "customDiceFace"]);
        if(!cprConfig) return {homebrewDiceEnabled: false};
        let homebrewDiceEnabled = cprConfig?.enableCustomDice;
        let dieNumber = cprConfig?.customDiceNum;
        let dieFace = cprConfig?.customDiceFace;
        if(homebrewDiceEnabled) return {homebrewDiceEnabled, dieNumber, dieFace};
        else return {homebrewDiceEnabled: false};
    }
    else if(type === "damageType") {
        if(!game.modules.get("cat")?.active) return {damageType: false};
        let itemData = fromUuidSync(itemUuid);
        if(!itemData) return {damageType: false};
        let cprConfig = cat.utils.automationUtils.getConfigValues(itemData, ["damageType"]);
        if(!cprConfig) return {damageType: false};
        let dType = cprConfig?.damageType;
        if(dType) return {dType};
        else return {dType: false};
    }
}

export async function remoteCompleteItemUse({itemUuid, actorUuid, options, isWeapon = false}) {
    if(!itemUuid || !actorUuid || !options) return;

    const itemData = await fromUuid(itemUuid);
    if (!itemData) return {};
    const reactionsUsed = itemData.actor?.getFlag("midi-qol", "actions")?.reactionsUsed ?? 0;
    const midiOptions = isWeapon ? {
        ...options,
        workflowOptions: { ...options.workflowOptions, gps: { ...options.workflowOptions?.gps, opportunityAttack: true } }
    } : options;
    const shieldStrike = isWeapon && itemData.flags?.["gambits-premades"]?.shieldStrike && itemData.actor?.getFlag("gambits-premades", "dragonTurtleShieldOA")
        ? itemData.system.activities.find(activity => activity.identifier === "shieldStrike") : null;
    const remoteCIU = shieldStrike
        ? await MidiQOL.completeActivityUse(shieldStrike.uuid, {actorUuid, midiOptions}, {}, {})
        : await MidiQOL.completeItemUse(itemData, {actorUuid, midiOptions}, {}, {});
    return {
        itemCardUuid: remoteCIU?.itemCardUuid,
        castLevel: remoteCIU?.castData?.castLevel,
        baseLevel: remoteCIU?.castData?.baseLevel,
        itemType: remoteCIU?.item?.system?.method,
        checkHits: (remoteCIU?.hitTargets?.size ?? 0) > 0,
        completed: !!remoteCIU && !remoteCIU.aborted,
        reactionUsed: (itemData.actor?.getFlag("midi-qol", "actions")?.reactionsUsed ?? 0) > reactionsUsed
    };
}

export async function remoteAbilityTest({spellcasting, actorUuid}) {
    if(!spellcasting || !actorUuid) return;

    let actor = await fromUuid(actorUuid)

    const requestId = foundry.utils.randomID();
    let rollId;
    const hookId = Hooks.on("createChatMessage", chatMessage => {
        if (chatMessage.getFlag("gambits-premades", "abilityRequestId") === requestId) rollId = chatMessage.id;
    });
    try {
        await actor.rollAbilityCheck({ ability: spellcasting }, {}, { data: { "flags.gambits-premades.abilityRequestId": requestId } });
        return { skillRoll: rollId };
    } finally {
        Hooks.off("createChatMessage", hookId);
    }
}

export async function gpsActivityUse({itemUuid, identifier, targetUuid}) {
    const item = await fromUuid(itemUuid);
    if(!item) return game.gps.logInfo(`Shame you didn't pass me an itemUuid`);
    const activity = item.system.activities.find(a => a.identifier === identifier);
    if(!activity) return game.gps.logInfo(`You've likely removed the identifier name from a ${item.name} automation activity which will cause failure.`);
    let targetUuids = (Array.isArray(targetUuid)) ? targetUuid : [targetUuid];

    const options = { midiOptions: { targetUuids: targetUuids, noOnUseMacro: true, configureDialog: false, showFullCard: false, ignoreUserTargets: true, checkGMstatus: true, autoRollAttack: true, autoRollDamage: "always", fastForwardAttack: true, fastForwardDamage: true, workflowData: true } };
    let activityUse = await MidiQOL.completeActivityUse(activity.uuid, options, {}, {});
    if (!activityUse || activityUse.aborted) return;
    const failedSaveUuids = activityUse.failedSaveUuids ?? Array.from(activityUse.failedSaves ?? [], target => target.document.uuid);
    const message = activityUse.itemCardUuid ? MidiQOL.getCachedChatMessage(activityUse.itemCardUuid) : null;
    const saveRoll = activityUse.tokenSaves?.[targetUuids[0]] ?? Object.values(activityUse.tokenSaves ?? {})[0]
        ?? message?.rolls.find(roll => roll.options?.["midi-qol"]?.rollType === "save" && roll.options["midi-qol"].targetUuid === targetUuids[0]);
    return { saveRolls: saveRoll, failedSaves: { size: failedSaveUuids.length }, failedSaveUuids, utilityRolls: activityUse.utilityRolls?.[0] };
}

export async function gpsActivityUpdate({activityUuid, updates}) {
    let activity = await fromUuid(activityUuid);
    await activity.update(updates);
}

export function getDialogColors({ type, source, timeLeft, initialTimeLeft }) {
    const hasCarolingianUI = game.modules.get("crlngn-ui")?.active;
    const progressPercentage = (timeLeft / initialTimeLeft) * 100;
    const transitionStart = 75;
    const transitionPercentage = Math.max((transitionStart - progressPercentage) / transitionStart, 0) * 100;
    const rgbColor = getCssVarValue("--color-warm-2");
    const rgbColorSelect = getCssVarValue("--color-warm-3");
    let pauseColor = addAlphaToRgb(rgbColor, 0.60);
    let selectColor = addAlphaToRgb(rgbColorSelect, 0.20);
    let optionColor = addAlphaToRgb(rgbColorSelect, 1.0);
    let borderColorStop;
    let redValue;
    let greenValue;
    let blueValue;

    if (type === "multiDialog" && source === "gm") {
        redValue = Math.floor(0 + (transitionPercentage / 100) * (75 - 0));
        greenValue = Math.floor(51 - (transitionPercentage / 100) * 51);
        blueValue = Math.floor(153 - (transitionPercentage / 100) * (153 - 130));
        borderColorStop = `rgb(${redValue}, ${greenValue}, ${blueValue})`;

        return { pauseColor, borderColorStop, selectColor, optionColor };
    }
  
    if (hasCarolingianUI) {
      const match = rgbColor.match(/(\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const baseR = parseInt(match[1]);
        const baseG = parseInt(match[2]);
        const baseB = parseInt(match[3]);
  
        const targetFactor = 0.5;
        redValue = Math.floor(baseR - (baseR - baseR * targetFactor) * (transitionPercentage / 100));
        greenValue = Math.floor(baseG - (baseG - baseG * targetFactor) * (transitionPercentage / 100));
        blueValue = Math.floor(baseB - (baseB - baseB * targetFactor) * (transitionPercentage / 100));

        borderColorStop = `rgb(${redValue}, ${greenValue}, ${blueValue})`;
      } else {
        redValue = Math.floor(181 + (transitionPercentage / 100) * (255 - 181));
        greenValue = Math.floor(99 - (transitionPercentage / 100) * 99);
        blueValue = Math.floor(69 - (transitionPercentage / 100) * 69);
        borderColorStop = `rgb(${redValue}, ${greenValue}, ${blueValue})`;
      }
    } else {
        redValue = Math.floor(181 + (transitionPercentage / 100) * (255 - 181));
        greenValue = Math.floor(99 - (transitionPercentage / 100) * 99);
        blueValue = Math.floor(69 - (transitionPercentage / 100) * 69);
        borderColorStop = `rgb(${redValue}, ${greenValue}, ${blueValue})`;
    }
    return { pauseColor, borderColorStop, selectColor, optionColor };
}
  
function getCssVarValue(varName) {
    const tempEl = document.createElement("div");
    tempEl.style.color = `var(${varName})`;
    tempEl.style.display = "none";
    document.body.appendChild(tempEl);

    const computedColor = getComputedStyle(tempEl).color;
    document.body.removeChild(tempEl);
    return computedColor;
}

function addAlphaToRgb(rgbString, alpha) {
    const match = rgbString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
    }
    return rgbString;
}

export async function halfWeaponDamage({workflow}) {
    if (workflow.isFumble || workflow.item.type !== 'weapon') return;
    if (workflow.item.system.properties.has('fin')) {
        let {str, dex} = workflow.actor.system.abilities;
        if (str.value < dex.value) return;
    }
    workflow.damageRolls = await Promise.all(workflow.damageRolls.map(async damageRoll => {
        return await new CONFIG.Dice.DamageRoll('floor((' + damageRoll.formula + ') / 2)', workflow.item.getRollData(), damageRoll.options);
    }));
    await workflow.setDamageRolls(workflow.damageRolls);
}

export async function gpsApplyTempHp({ actorUuids, tempHp, motivationalSpeechSource }) {
    for (let actorUuid of actorUuids) {
        let actor = await fromUuid(actorUuid);
        if(!actor) continue;
        if(motivationalSpeechSource) {
            const amount = Number.parseInt(tempHp);
            if(amount > (actor.system.attributes.hp.temp ?? 0)) await actor.update({
                "system.attributes.hp.temp": amount,
                "flags.gambits-premades.motivationalSpeechTempHp": {sourceUuid: motivationalSpeechSource, amount, effectUuid: null}
            }, {gpsMotivationalSpeechGrant: true});
        }
        else await actor.applyTempHP(tempHp);
    }
}

export async function stopMovementExit({token}) {
    await token.stopMovement();

    let waypoints = token.movementHistory;
    if (!waypoints || waypoints.length === 0) return;

    if(canvas.scene.grid.type >= 1) {
        const last = waypoints.length === 1 ? waypoints[0] : waypoints[waypoints.length - 2];
        const snapped = canvas.scene.grid.getSnappedPoint({ x: last.x, y: last.y }, { mode: 0xFF0, resolution: 1 });
        await token.update({ x: snapped.x, y: snapped.y }, { animate: false });
    }
    else {
        const last = waypoints.at(-1);
        const prev = waypoints.at(-2);
        const dx = last.x - prev.x;
        const dy = last.y - prev.y;

        const gridSize = canvas.grid.size;
        let moveBackX = 0;
        let moveBackY = 0;

        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        const diagonalTolerance = 0.25;
        const ratio = absDx / absDy;

        const isDiagonal = ratio > 1 - diagonalTolerance && ratio < 1 + diagonalTolerance;

        if (isDiagonal) {
            moveBackX = -Math.sign(dx) * gridSize;
            moveBackY = -Math.sign(dy) * gridSize;
        } 
        else if (absDx > absDy) {
            moveBackX = -Math.sign(dx) * gridSize;
        } 
        else {
            moveBackY = -Math.sign(dy) * gridSize;
        }

        const newX = token.x + moveBackX;
        const newY = token.y + moveBackY;

        await token.update({ x: newX, y: newY }, { animate: false });
    }
}

export async function stopMovementEnter({ token }) {
  if (!token) return;

  await token.stopMovement();

  const waypoints = token.movementHistory;
  if (!waypoints || waypoints.length === 0) return;

  const last = waypoints[waypoints.length - 1];

  const snapped = canvas.scene.grid.getSnappedPoint({ x: last.x, y: last.y }, { mode: 0xFF0, resolution: 1 });

  await token.update({ x: snapped.x, y: snapped.y }, { animate: false });
}

export async function gmSetFlag({flagDocumentUuid, key, value}) {
    let flagDocument = await fromUuid(flagDocumentUuid);
    await flagDocument.setFlag("gambits-premades", key, value);
}

const LOG_PREFIX = "GPS | ";
const PREFIX_STYLE = "color: #4ea1ff; font-weight: 700;";
const MSG_STYLE = "color: #ffd24a; font-weight: 700;";

export function logInfo(msg) {
  console.info(
    `%c${LOG_PREFIX}%c${msg}`,
    PREFIX_STYLE,
    MSG_STYLE
  );
}

export {ensureFreedomEscape, freedomEscape} from "../automations/spells/freedomOfMovement.js";
export {registerRulesReviewHooks, foresight, huntersSense, damagedAttackTarget, bindFeatureResource, huntersSenseResult} from "./rulesReviewUtils.js";

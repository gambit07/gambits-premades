export async function deleteChatMessage({ chatId }) {
    if(!chatId) return;
    let chatMessage = game.messages.get(chatId);
    await chatMessage.delete();
}

export async function gmIdentifyItem({ itemUuid }) {
    if(!itemUuid) return;
    let itemData = await fromUuid(`${itemUuid}`);
    if(itemData) await itemData.update({"system.identified": true});
}

export async function chooseUseItemUser({ itemUuid }) {
    if(!itemUuid) return;
    let itemData = await fromUuid(`${itemUuid}`);
    if(itemData) await itemData.use();
}

export async function gmUpdateTemplateSize({ templateUuid, templateSize }) {
    if(!templateUuid || !templateSize) return;
    let template = await fromUuid(`${templateUuid}`);
    if(template) await template.update({"distance": templateSize});
}

export async function closeDialogById({ dialogId }) {
    let activeDialog = ui.activeWindow?.data?.id;

    if (activeDialog === dialogId) {
        ui.activeWindow.dialogState.programmaticallyClosed = true;
        ui.activeWindow.close();
    }
    else {
        let dialog = Object.values(ui.windows).find(d => d.data?.id === dialogId);
        if (dialog) {
            dialog.dialogState.programmaticallyClosed = true;
            dialog.close();
        }
    }
}

export function pauseDialogById({ dialogId, timeLeft, isPaused }) {
    let activeDialog = ui.activeWindow?.data?.id;

    if (activeDialog.split('_')[0] === dialogId.split('_')[0]) {
        ui.activeWindow.updateTimer(timeLeft, isPaused);
    } else {
        let dialog = Object.values(ui.windows).find(d => d.data?.id.split('_')[0] === dialogId.split('_')[0]);
        if (dialog) {
            dialog.updateTimer(timeLeft, isPaused);
        }
    }
}

export async function rollAsUser({ rollParams, type }) {
    if(!rollParams) return;
    let reroll;
    //const DamageRoll = CONFIG.Dice.DamageRoll;
    
    reroll = await new Roll(`${rollParams}`).evaluate({async: true});

    await MidiQOL.displayDSNForRoll(reroll, 'damageRoll');
    return reroll;
}

export function convertFromFeet({ range }) {
    const units = canvas.scene.grid.units;
    let conversionFactor;
    if (units === "meters" || units === "m" || units === "mt") conversionFactor = 0.3;
    else conversionFactor = 1;
    return range * conversionFactor;
}

export async function handleDialogPromises(userDialogPromise, gmDialogPromise) {
    return new Promise((resolve, reject) => {
        let userResolved = false;
        let gmResolved = false;
        let anyDialogInteracted = false;

        const checkAndResolve = () => {
            if (anyDialogInteracted) {
                resolve(anyDialogInteracted);
            }

            else if (userResolved && gmResolved) {
                resolve({programmaticallyClosed: true});
            }
        };

        userDialogPromise.then(result => {
            userResolved = true;
            if (result && !result.programmaticallyClosed) {
                anyDialogInteracted = result;
            }
            checkAndResolve();
        });

        gmDialogPromise.then(result => {
            gmResolved = true;
            if (result && !result.programmaticallyClosed) {
                anyDialogInteracted = result;
            }
            checkAndResolve();
        });
    });
}

export function findValidTokens({initiatingToken, targetedToken, itemName, itemType, itemChecked, reactionCheck, sightCheck, rangeCheck, rangeTotal, dispositionCheck, dispositionCheckType, workflowType, workflowCombat}) {
    let validTokens;

    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');

    if (workflowCombat === false) {
        validTokens = canvas.tokens.placeables.filter(t => filterToken(t));
    } else {
        validTokens = game.combat.combatants.map(combatant => canvas.tokens.get(combatant.tokenId)).filter(t => filterToken(t));
    }
    
    function filterToken(t) {
        // Check if invalid token on the canvas
        if (!t.actor) return;
        if(debugEnabled) console.log(`${t.actor.name} made it past actor`)

        // Check if the token has the actual item to use
        let checkItem = t.actor.items.find(i => i.name.toLowerCase() === itemName);
        if(!checkItem) return;
        if(debugEnabled) console.log(`${t.actor.name} made it past check item initial`)

        // Check if the tokens reaction already used
        if (reactionCheck && t.actor.effects.find(i => i.name.toLowerCase() === "reaction")) return;
        if(debugEnabled) console.log(`${t.actor.name} made it past reaction`)

        // Check if the token is the initiating token or not a qualifying token disposition
        if (dispositionCheck && (t.id === initiatingToken.id || ((dispositionCheckType === "enemy" || dispositionCheckType === "enemyAlly") && t.document.disposition === initiatingToken.document.disposition) || (dispositionCheckType === "ally" && t.document.disposition !== initiatingToken.document.disposition))) {
            return;
        }
        if(debugEnabled) console.log(`${t.actor.name} made it past disposition check`)

        // Check if token can see initiating token
        if(sightCheck && !MidiQOL.canSee(t, initiatingToken)) return;
        if(debugEnabled) console.log(`${t.actor.name} made it past sight check`)

        // Check if token is within range
        if(rangeCheck) {
            let measuredDistance = (dispositionCheckType === "ally" || dispositionCheckType === "enemyAlly") ? MidiQOL.computeDistance(targetedToken,t,true) : MidiQOL.computeDistance(initiatingToken,t,true);
            let range = game.gps.convertFromFeet({range: rangeTotal});
            if (measuredDistance === -1 || (measuredDistance > range)) return;
        }
        if(debugEnabled) console.log(`${t.actor.name} made it past range check`)

        // Check if the token has available spell slots/uses
        if(itemType === "spell") {
            const spells = t.actor.system.spells;
            
            let checkType = checkItem?.system?.preparation?.mode;
            let hasSpellSlots = false;
            if(checkType === "prepared" && checkItem?.system?.preparation?.prepared === false) return;
            if(checkType === "prepared" || checkType === "always")
            {
                for (let level = 3; level <= 9; level++) {
                    let spellSlot = t.actor.system.spells[`spell${level}`].value;
                    if (spellSlot > 0) {
                        hasSpellSlots = true;
                        break;
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
                let slotValue = checkItem.system.uses.value;
                let slotEnabled = checkItem.system.uses.per;
                if (slotValue > 0 || slotEnabled === null) hasSpellSlots = true;
            }

            if (!hasSpellSlots) {
                return;
            }
        }
        if(debugEnabled) console.log(`${t.actor.name} made it past check spell`)

        // Check if the token has available resource or item uses
        if(itemType === "feature") {
            const itemNames = itemChecked.map(item => item.toLowerCase());

            let resourceExistsWithValue = [t.actor.system.resources.primary, t.actor.system.resources.secondary, t.actor.system.resources.tertiary].some(resource =>
                itemNames.includes(resource?.label.toLowerCase()) && resource.value !== 0);
            let itemExistsWithValue;

            if (!resourceExistsWithValue) {
                itemExistsWithValue = t.actor.items.some(i => itemNames.includes(i.name.toLowerCase()) && i.system.uses?.value !== 0);
            }

            if (!resourceExistsWithValue && !itemExistsWithValue) return;
        }
        if(debugEnabled) console.log(`${t.actor.name} made it past check feature`)

        if(itemType === "item") {
            const itemNames = itemChecked.map(item => item.toLowerCase());
            let itemExists = t.actor.items.some(i => itemNames.includes(i.name.toLowerCase()) || itemNames.includes(i.system.actionType?.toLowerCase()));

            if (!itemExists) return;
        }
        if(debugEnabled) console.log(`${t.actor.name} Reaction validation passed`)

        return t;
    };

    return validTokens;
}
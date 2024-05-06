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

export function findValidTokens({token, target, itemName, itemType, itemChecked, reactionCheck, sightCheck, rangeCheck, rangeTotal, dispositionCheck, dispositionCheckType, workflowType, workflowCombat}) {
    let validTokens;

    if (workflowCombat === false) {
        validTokens = canvas.tokens.placeables.filter(t => filterToken(t));
    } else {
        validTokens = game.combat.combatants.map(combatant => canvas.tokens.get(combatant.tokenId)).filter(t => filterToken(t));
    }
    
    function filterToken(t) {
        // Check if invalid token on the canvas
        if (!t.actor) return;

        // Check if the token has the actual item to use
        let checkItem = t.actor.items.find(i => i.name.toLowerCase() === itemName);
        if(!checkItem) return;

        // Check if the tokens reaction already used
        if (reactionCheck && t.actor.effects.find(i => i.name.toLowerCase() === "reaction")) return;
        
        // Check if the token is the initiating token or not a qualifying token disposition
        if (dispositionCheck && (t.id === token.id || (dispositionCheckType === "enemy" && t.document.disposition === token.document.disposition) || (dispositionCheckType === "ally" && t.document.disposition !== target.document.disposition))) {
            return;
        }

        // Check if token can see initiating token
        if(sightCheck && !MidiQOL.canSee(t, token)) return;

        // Check if token is within 60 feet
        if(rangeCheck) {
            let measuredDistance = (dispositionCheckType === "ally") ? MidiQOL.computeDistance(target,t,true) : MidiQOL.computeDistance(token,t,true);
            let range = game.gps.convertFromFeet({range: rangeTotal});
            if (measuredDistance === -1 || (measuredDistance > range)) return;
        }

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

        if(itemType === "item") {
            const itemNames = itemChecked.map(item => item.toLowerCase());
            let itemExists = t.actor.items.some(i => itemNames.includes(i.name.toLowerCase()) || itemNames.includes(i.system.actionType?.toLowerCase()));

            if (!itemExists) return;
        }

        return t;
    };

    return validTokens;
}
export async function deleteChatMessage({ chatId }) {
    if(!chatId) return;
    let chatMessage = game.messages.get(chatId);
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
    let token = await fromUuid(`${tokenUuid}`);
    if(token) await token.actor.toggleStatusEffect(status, { active: active, overlay: false });
}

export async function freeSpellUse({ workflowUuid }) {
    if(!workflowUuid) return;

    const workflow = await MidiQOL.Workflow.getWorkflow(`${workflowUuid}`);
    if(workflow.macroPass !== "preItemRoll") return;

    const effectName = `${workflow.item.name}: Long Rest Charge Used`;

    if (!workflow.actor.appliedEffects.some(e => e.name === effectName)) {
        await foundry.applications.api.DialogV2.wait({
            window: { title: `Free ${workflow.item.name} Use` },
            content: `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <div>
                                <div class="gps-dialog-flex">
                                    <p class="gps-dialog-paragraph">Would you like to activate your free use of ${workflow.item.name}? It will be cast at its base level.</p>
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
                label: "Yes",
                callback: async (event, button, dialog) => {
                    //workflow.config.spell = workflow.config.spell || {};
                    workflow.config.consume = workflow.config.consume || {};
                    //workflow.config.spell.slot = false;
                    workflow.config.consume.spellSlot = false;
                    workflow.config.midiOptions.configureDialog = false;
                    const effectData = {
                        name: effectName,
                        icon: workflow.item.img,
                        duration: {},
                        origin: workflow.actor.uuid,
                        flags: {dae:{specialDuration:['longRest']}}
                    }
                    ui.notifications.info(`You used your once per long rest option to initiate ${workflow.item.name} and did not use a spell slot`)
                    return await workflow.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
                }
            },
            {
                action: "No",
                label: "No",
                callback: async () => false
            }],
            close: async (event, dialog) => {
                return;
            }, rejectClose:false
        });
    }
}

export async function gmUpdateTemplateSize({ templateUuid, templateSize }) {
    if(!templateUuid || !templateSize) return;
    let template = await fromUuid(`${templateUuid}`);
    if(template) await template.update({"distance": templateSize});
}

export async function closeDialogById({ dialogId }) {
  if (ui.activeWindow && ui.activeWindow.dialogState && ui.activeWindow.dialogState.dialogId === dialogId) {
      ui.activeWindow.dialogState.programmaticallyClosed = true;
      ui.activeWindow.close();
  } else {
      let dialog = Object.values(ui.windows).find(d => d.dialogState && d.dialogState.dialogId === dialogId);
      if (dialog) {
          dialog.dialogState.programmaticallyClosed = true;
          dialog.close();
      }
  }
}

export function pauseDialogById({ dialogId, timeLeft, isPaused }) {
    const updateDialogState = (dialog) => {
        dialog.timeLeft = timeLeft;
        dialog.isPaused = isPaused;
        dialog.pausedTime = isPaused ? Date.now() : dialog.pausedTime;

        if (!isPaused) {
            dialog.endTime += (Date.now() - dialog.pausedTime);
            requestAnimationFrame(dialog.animate);
        }

        dialog.updateTimer(dialog.timeLeft, isPaused);
    };

    if (ui.activeWindow && ui.activeWindow.dialogState && ui.activeWindow.dialogState.dialogId === dialogId) {
        updateDialogState(ui.activeWindow);
    } else {
        let dialog = Object.values(ui.windows).find(d => d.dialogState && d.dialogState.dialogId === dialogId);
        if (dialog) {
            updateDialogState(dialog);
        }
    }
}

export async function rollAsUser({ rollParams, type }) {
    if(!rollParams) return;
    let reroll;
    
    reroll = await new Roll(`${rollParams}`).evaluate();

    await MidiQOL.displayDSNForRoll(reroll, 'damageRoll');
    return reroll;
}

export function convertFromFeet({ range }) {
    const units = canvas.scene.grid.units;
    let conversionFactor;
    if (units === "meters" || units === "m" || units === "mt" || units === "metri") conversionFactor = 0.3;
    else conversionFactor = 1;
    return range * conversionFactor;
}

export async function handleDialogPromises({userDialogArgs, gmDialogArgs}) {
    if(!userDialogArgs || !gmDialogArgs) return;
    let userDialogPromise = game.gps.socket.executeAsUser("process3rdPartyReactionDialog", userDialogArgs.browserUser, userDialogArgs);
    let gmDialogPromise = game.gps.socket.executeAsUser("process3rdPartyReactionDialog", getPrimaryGM(), gmDialogArgs);

    return new Promise((resolve, reject) => {
        let userResolved = false;
        let gmResolved = false;
        let anyDialogInteracted = false;

        const checkAndResolve = () => {
            if (anyDialogInteracted) {
                resolve(anyDialogInteracted);
            } else if (userResolved && gmResolved) {
                resolve({ programmaticallyClosed: true });
            }
        };

        userDialogPromise.then(result => {
            userResolved = true;
            if (result && !result.programmaticallyClosed) {
                anyDialogInteracted = result;
            }
            checkAndResolve();
        }).catch(reject);

        gmDialogPromise.then(result => {
            gmResolved = true;
            if (result && !result.programmaticallyClosed) {
                anyDialogInteracted = result;
            }
            checkAndResolve();
        }).catch(reject);
    });
}

export function findValidTokens({initiatingToken, targetedToken, itemName, itemType, itemChecked, reactionCheck, sightCheck, sightCheckType = "enemy", rangeCheck, rangeTotal, dispositionCheck, dispositionCheckType, workflowType, workflowCombat, gpsUuid}) {
    let validTokens;

    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    let workflowNonCombat = MidiQOL.safeGetGameSetting('gambits-premades', 'enable3prNoCombat');

    if (!workflowCombat || workflowNonCombat) {
        validTokens = canvas.tokens.placeables.filter(t => filterToken(t));
    } else {
        validTokens = game.combat?.combatants?.map(combatant => canvas.tokens.get(combatant.tokenId)).filter(t => filterToken(t));
    }
    
    function filterToken(t) {
        // Check if invalid token on the canvas
        if (!t.actor) {
            if(debugEnabled) console.error(`${itemName} for ${t.actor ? t.actor.name : "Unknown Actor"} failed at invalid token actor on canvas`);
            return;
        }
        let checkItem;
        if(gpsUuid) checkItem = t?.actor?.items?.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        else checkItem = t?.actor?.items?.find(i => i.name.toLowerCase() === itemName.toLowerCase());
        const effectNamesOrigin = ["Confusion", "Arms of Hadar", "Shocking Grasp", "Slow", "Staggering Smite"];
        let hasEffectOrigin = t?.actor?.appliedEffects.some(effect => effectNamesOrigin.includes(effect.name));
        let measuredDistance = (dispositionCheckType === "ally" || dispositionCheckType === "enemyAlly") ? MidiQOL.computeDistance(targetedToken,t, {wallsBlock: true, includeCover: true}) : MidiQOL.computeDistance(initiatingToken,t, {wallsBlock: true, includeCover: true});
        let range = game.gps.convertFromFeet({range: rangeTotal});

        // Check if the token has the actual item to use
        if(!checkItem) {
            if(debugEnabled) console.error(`${itemName} for ${t.actor.name} failed at check if reaction item exists`);
            return;
        }

        // Check if the tokens reaction already used
        else if(reactionCheck && MidiQOL.hasUsedReaction(t.actor)) {
            if(debugEnabled) console.error(`${itemName} for ${t.actor.name} failed at reaction available`);
            return;
        }

        // Check if the token is incapacitated
        else if(MidiQOL.checkIncapacitated(t)) {
            if(debugEnabled) console.error(`${itemName} for ${t.actor.name} failed at is incapacitated`);
            return;
        }

        // Check if the token is the initiating token or not a qualifying token disposition
        else if(dispositionCheck && (((dispositionCheckType === "enemy" || dispositionCheckType === "enemyAlly") && t.document.disposition === initiatingToken.document.disposition) || (dispositionCheckType === "ally" && t.document.disposition !== initiatingToken.document.disposition))) {
            if(debugEnabled) console.error(`${itemName} for ${t.actor.name} failed at token disposition check`);
            return;
        }

        // Check if token can see initiating token
        else if(sightCheck && ((sightCheckType === "ally" && !MidiQOL.canSee(t, targetedToken)) || (sightCheckType === "enemy" && !MidiQOL.canSee(t, initiatingToken)))) {
            if(debugEnabled) console.error(`${itemName} for ${t.actor.name} failed at sight check`);
            return;
        }

        // Check if token is under an effect preventing reactions
        else if(reactionCheck && hasEffectOrigin) {
            if(debugEnabled) console.error(`${itemName} for ${t.actor.name} failed at spell effect preventing reaction`);
            return;
        }

        // Check if token is within range
        else if(rangeCheck && (measuredDistance === -1 || (measuredDistance > range))) {
            if(debugEnabled) console.error(`${itemName} for ${t.actor.name} failed at range check`);
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
            let checkType = checkItem?.system?.preparation?.mode;
            let hasSpellSlots = false;
            if(checkType === "prepared" && checkItem?.system?.preparation?.prepared === false) return false;
            if(checkType === "prepared" || checkType === "always")
            {
                for (let level = spellLevel; level <= 9; level++) {
                    let spellSlot = t.actor.system.spells[`spell${level}`].value;
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
                if (slotValue > 0 || slotEnabled === "") hasSpellSlots = true;
            }
    
            if (!hasSpellSlots) {
                if(debugEnabled) console.error(`${itemName} for ${t.actor.name} failed at check valid spell slots/preparation`);
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

            if(itemNames.includes("legres")) resourceExistsWithValue = t.actor.system.resources.legres.value !== 0 ? true : false;

            else {
                resourceExistsWithValue = [t.actor.system.resources.primary, t.actor.system.resources.secondary, t.actor.system.resources.tertiary].some(resource => itemNames.includes(resource?.label.toLowerCase()) && resource.value !== 0);

                if (!resourceExistsWithValue) {
                    itemExistsWithValue = t.actor.items.some(i => itemNames.includes(i.name.toLowerCase()) && i.system.uses?.value !== 0);
                }
            }

            if (!resourceExistsWithValue && !itemExistsWithValue) {
                if(debugEnabled) console.error(`${itemName} for ${t.actor.name} failed at check valid feature item/resource uses`);
                return;
            }
        }

        if(itemType === "item") {
            const itemNames = itemChecked.map(item => item.toLowerCase());
            let itemExists = t.actor.items.some(i => itemNames.includes(i.name.toLowerCase()) || itemNames.includes(i.system.actionType?.toLowerCase()));

            if (!itemExists) {
                if(debugEnabled) console.error(`${itemName} for ${t.actor.name} failed at valid item supporting feature`);
                return;
            }
        }

        if(debugEnabled) {
            console.warn(`%c${itemName} for ${t.actor.name} Reaction Validation Passed`, 'font-weight: bold');
        }

        return t;
    };

    return validTokens;
}

export function findValidToken({initiatingTokenUuid, targetedTokenUuid, itemName, itemType, itemChecked, reactionCheck, sightCheck, sightCheckType = "enemy", rangeCheck, rangeTotal, dispositionCheck, dispositionCheckType, workflowType, workflowCombat, gpsUuid}) {
    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    let workflowNonCombat = MidiQOL.safeGetGameSetting('gambits-premades', 'enable3prNoCombat');

    if (workflowCombat && !workflowNonCombat) {
        let combat = game.combat;
        if (!combat) {
            if(debugEnabled) console.error(`${itemName} failed at check if combat active`);
            return false;
        }
    }

    let targetedToken = fromUuidSync(targetedTokenUuid);
    targetedToken = targetedToken?.object;
    if(!targetedToken) {
        if(debugEnabled) console.error(`${itemName} failed no targetedToken found`);
        return false;
    }

    let initiatingToken = fromUuidSync(initiatingTokenUuid);
    initiatingToken = initiatingToken?.object;
    if(!initiatingToken) {
        if(debugEnabled) console.error(`${itemName} failed no initiatingToken found`);
        return false;
    }

    // Check if invalid token on the canvas
    if (!targetedToken.actor) {
        if(debugEnabled) console.error(`${itemName} for ${targetedToken.actor ? targetedToken.actor.name : "Unknown Actor"} failed at invalid token actor on canvas`);
        return false;
    }
    let checkItem;
    if(gpsUuid) checkItem = targetedToken?.actor?.items?.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
    else checkItem = targetedToken?.actor?.items?.find(i => i.name.toLowerCase() === itemName.toLowerCase());
    const effectNamesOrigin = ["Confusion", "Arms of Hadar", "Shocking Grasp", "Slow", "Staggering Smite"];
    let hasEffectOrigin = targetedToken?.actor?.appliedEffects.some(effect => effectNamesOrigin.includes(effect.name));
    let measuredDistance = MidiQOL.computeDistance(initiatingToken,targetedToken, {wallsBlock: true, includeCover: true});
    let range = game.gps.convertFromFeet({range: rangeTotal});

    // Check if the token has the actual item to use
    if(!checkItem) {
        if(debugEnabled) console.error(`${itemName} for ${targetedToken.actor.name} failed at check if reaction item exists`);
        return false;
    }

    // Check if the tokens reaction already used
    else if(reactionCheck && MidiQOL.hasUsedReaction(targetedToken.actor)) {
        if(debugEnabled) console.error(`${itemName} for ${targetedToken.actor.name} failed at reaction available`);
        return false;
    }

    // Check if the token is incapacitated
    else if(MidiQOL.checkIncapacitatedtargetedToken) {
        if(debugEnabled) console.error(`${itemName} for ${targetedToken.actor.name} failed at is incapacitated`);
        return false;
    }

    // Check if the token is the initiating token or not a qualifying token disposition
    else if(dispositionCheck && ((targetedToken.id === initiatingToken.id && workflowType === "attack") || ((dispositionCheckType === "enemy" || dispositionCheckType === "enemyAlly") && targetedToken.document.disposition === initiatingToken.document.disposition) || (dispositionCheckType === "ally" && targetedToken.document.disposition !== initiatingToken.document.disposition))) {
        if(debugEnabled) console.error(`${itemName} for ${targetedToken.actor.name} failed at token disposition check`);
        return false;
    }

    // Check if token can see initiating token
    else if(sightCheck && ((sightCheckType === "ally" && !MidiQOL.canSee(initiatingToken, targetedToken)) || (sightCheckType === "enemy" && !MidiQOL.canSee(targetedToken, initiatingToken)))) {
        if(debugEnabled) console.error(`${itemName} for ${targetedToken.actor.name} failed at sight check`);
        return false;
    }

    // Check if token is under an effect preventing reactions
    else if(reactionCheck && hasEffectOrigin) {
        if(debugEnabled) console.error(`${itemName} for ${targetedToken.actor.name} failed at spell effect preventing reaction`);
        return false;
    }

    // Check if token is within range
    else if(rangeCheck && (measuredDistance === -1 || (measuredDistance > range))) {
        if(debugEnabled) console.error(`${itemName} for ${targetedToken.actor.name} failed at range check`);
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
        let checkType = checkItem?.system?.preparation?.mode;
        let hasSpellSlots = false;
        if(checkType === "prepared" && checkItem?.system?.preparation?.prepared === false) return false;
        if(checkType === "prepared" || checkType === "always")
        {
            for (let level = spellLevel; level <= 9; level++) {
                let spellSlot = targetedToken.actor.system.spells[`spell${level}`].value;
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
            if (slotValue > 0 || slotEnabled === null) hasSpellSlots = true;
        }

        if (!hasSpellSlots) {
            if(debugEnabled) console.error(`${itemName} for ${targetedToken.actor.name} failed at check valid spell slots/preparation`);
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

        if(itemNames.includes("legres")) resourceExistsWithValue = targetedToken.actor.system.resources.legres.value !== 0 ? true : false;

        else {
            resourceExistsWithValue = [targetedToken.actor.system.resources.primary, targetedToken.actor.system.resources.secondary, targetedToken.actor.system.resources.tertiary].some(resource => itemNames.includes(resource?.label.toLowerCase()) && resource.value !== 0);

            if (!resourceExistsWithValue) {
                itemExistsWithValue = targetedToken.actor.items.some(i => itemNames.includes(i.name.toLowerCase()) && i.system.uses?.value !== 0);
            }
        }

        if (!resourceExistsWithValue && !itemExistsWithValue) {
            if(debugEnabled) console.error(`${itemName} for ${targetedToken.actor.name} failed at check valid feature item/resource uses`);
            return false;
        }
    }

    if(itemType === "item") {
        const itemNames = itemChecked.map(item => item.toLowerCase());
        let itemExists = targetedToken.actor.items.some(i => itemNames.includes(i.name.toLowerCase()) || itemNames.includes(i.system.actionType?.toLowerCase()));

        if (!itemExists) {
            if(debugEnabled) console.error(`${itemName} for ${targetedToken.actor.name} failed at valid item supporting feature`);
            return false;
        }
    }

    if(debugEnabled) {
        console.warn(`%c${itemName} for ${targetedToken.actor.name} Reaction Validation Passed`, 'font-weight: bold');
    }

    return true;
}

export async function process3rdPartyReactionDialog({ dialogTitle, dialogContent, dialogId, initialTimeLeft, validTokenPrimaryUuid, source, type, notificationId, numTargets }) {
    let validTokenPrimary = await fromUuid(validTokenPrimaryUuid);
    let browserUser = getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

    let dialogState = { interacted: false, decision: null, programmaticallyClosed: false, dialogId: dialogId };
    let result = null;

    function attachEventListeners(dialog, animate) {
        const dialogElement = dialog?.element;
        const windowTitle = dialogElement?.querySelector('.window-title');
        const pauseButton = dialogElement?.querySelector(`#pauseButton_${dialogId}`);
        const itemSelect = dialogElement?.querySelector(`#item-select_${dialogId}`);
        const weaponImg = dialogElement?.querySelector(`#weapon-img_${dialogId}`);
        const damageList = dialogElement?.querySelector(`#damage-list`);
        const enemyTokens = dialogElement?.querySelectorAll('input.enemy-tokens');
        let draggedItem = null;
    
        function handleFocusIn(event) {
            validTokenPrimary.object.control({ releaseOthers: true });
        }
    
        function handleFocusOut(event) {
            validTokenPrimary.object.release();
        }
    
        function handleMouseDown(event) {
            setTimeout(() => dialogElement.focus(), 0);
            validTokenPrimary.object.control({ releaseOthers: true });
        }
    
        function handlePauseButtonClick() {
            dialog.isPaused = !dialog.isPaused;
            if (dialog.isPaused) {
                dialog.pausedTime = Date.now();
            } else {
                dialog.endTime += Date.now() - dialog.pausedTime;
                requestAnimationFrame(animate);
            }
            dialog.updateTimer(dialog.timeLeft, dialog.isPaused);
    
            const pauseState = { dialogId: dialogId, timeLeft: dialog.timeLeft, isPaused: dialog.isPaused };
            if (source === "user" && type === "multiDialog") {
                game.gps.socket.executeAsUser("pauseDialogById", getPrimaryGM(), pauseState);
            } else if (source === "gm" && type === "multiDialog") {
                game.gps.socket.executeAsUser("pauseDialogById", browserUser, pauseState);
            }
        }
    
        function handleItemSelectChange(event) {
            const selectedOption = event.target.options[event.target.selectedIndex];
            weaponImg.src = selectedOption.getAttribute('name');
        }
    
        function handleDragStart(event) {
            event.dataTransfer.setData('text/plain', event.target.innerText);
            event.dataTransfer.effectAllowed = 'move';
            draggedItem = event.target;
        }
    
        function handleDragOver(event) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            const target = event.target;
            if (target && target.nodeName === 'LI') {
                const rect = target.getBoundingClientRect();
                const next = (event.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
                damageList.insertBefore(draggedItem, next && target.nextSibling || target);
            }
        }
    
        function handleDragEnd() {
            draggedItem = null;
        }
    
        function handleCheckboxChange(event) {
            const checkedBoxes = dialogElement.querySelectorAll('input.enemy-tokens:checked');
    
            if (checkedBoxes.length > numTargets) {
                event.target.checked = false;
                ui.notifications.warn(`You can only select up to ${numTargets} targets.`);
            }
        }
    
        if (windowTitle) {
            windowTitle.addEventListener('focusin', handleFocusIn);
            windowTitle.addEventListener('focusout', handleFocusOut);
            windowTitle.addEventListener('mousedown', handleMouseDown);
        }
    
        if (pauseButton) {
            pauseButton.addEventListener('click', handlePauseButtonClick);
    
            if (source === "gm" && type === "multiDialog") {
                pauseButton.setAttribute("autofocus", "true");
                pauseButton.focus();
            }
        }
    
        if (itemSelect && itemSelect.options.length > 0 && weaponImg) {
            weaponImg.src = itemSelect.options[0].getAttribute('name');
            itemSelect.addEventListener('change', handleItemSelectChange);
        }
    
        if (damageList) {
            const damageListItems = damageList.querySelectorAll('li');
            damageListItems.forEach(item => {
                item.addEventListener('dragstart', handleDragStart);
            });
            damageList.addEventListener('dragover', handleDragOver);
            damageList.addEventListener('dragend', handleDragEnd);
        }
    
        if (enemyTokens && enemyTokens.length > 0) {
            enemyTokens.forEach(checkbox => {
                checkbox.addEventListener('change', handleCheckboxChange);
            });
        }
    
        return {
            windowTitle,
            pauseButton,
            itemSelect,
            damageList,
            handleFocusIn,
            handleFocusOut,
            handleMouseDown,
            handlePauseButtonClick,
            handleItemSelectChange,
            handleDragStart,
            handleDragOver,
            handleDragEnd,
            handleCheckboxChange
        };
    }

    function cleanupEventListeners(listeners) {
        const { windowTitle, pauseButton, itemSelect, damageList, enemyTokens, handleFocusIn, handleFocusOut, handleMouseDown, handlePauseButtonClick, handleItemSelectChange, handleDragStart, handleDragOver, handleDragEnd, handleCheckboxChange } = listeners;
        
        if (windowTitle) {
            windowTitle.removeEventListener('focusin', handleFocusIn);
            windowTitle.removeEventListener('focusout', handleFocusOut);
            windowTitle.removeEventListener('mousedown', handleMouseDown);
        }

        if (pauseButton) {
            pauseButton.removeEventListener('click', handlePauseButtonClick);
        }

        if (itemSelect) {
            itemSelect.removeEventListener('change', handleItemSelectChange);
        }

        if (damageList) {
            const damageListItems = damageList.querySelectorAll('li');
            damageListItems.forEach(item => {
                item.removeEventListener('dragstart', handleDragStart);
            });
            damageList.removeEventListener('dragover', handleDragOver);
            damageList.removeEventListener('dragend', handleDragEnd);
        }

        if (enemyTokens && enemyTokens.length > 0) {
            enemyTokens.forEach(checkbox => {
                checkbox.removeEventListener('change', handleCheckboxChange);
            });
        }
    }

    await foundry.applications.api.DialogV2.wait({
        window: { title: dialogTitle },
        content: dialogContent,
        buttons: [
            {
                action: "yes",
                label: "<i class='fas fa-check' style='margin-right: 5px;'></i>Yes",
                callback: async (event, button, dialog) => {
                    if(notificationId) await game.gps.socket.executeAsUser("deleteChatMessage", getPrimaryGM(), {chatId: notificationId});
                    dialogState.interacted = true;
                    dialogState.decision = "yes";
                    if (source && source === "user" && type === "multiDialog") await game.gps.socket.executeAsUser("closeDialogById", getPrimaryGM(), { dialogId: dialogId });
                    else if (source && source === "gm" && type === "multiDialog") await game.gps.socket.executeAsUser("closeDialogById", browserUser, { dialogId: dialogId });

                    let enemyTokenUuid = button.form?.elements["enemy-token"]?.value ?? false;
                    let allyTokenUuid = button.form?.elements["ally-token"]?.value ?? false;
                    let abilityCheck = button.form?.elements["ability-check"] ?? false;
                    if(abilityCheck) {
                        for (let i = 0; i < abilityCheck.length; i++) {
                            if (abilityCheck[i].checked) {
                                abilityCheck = abilityCheck[i].value;
                                break;
                            }
                        }
                    }
                    
                    let damageChosen = [];
                    let damageListItems = document?.querySelectorAll(`#damage-list li .damage-type`);
                    if (damageListItems?.length > 0) {
                        damageListItems.forEach(item => damageChosen.push(item.textContent.trim()));
                    }

                    let selectedItemUuid = button.form?.elements[`item-select_${dialogId}`]?.value ?? false;
                    let favoriteCheck = button.form?.elements["gps-favorite-checkbox"]?.checked ?? false;

                    let enemyTokenUuids = document?.querySelectorAll('input.enemy-tokens:checked') ?? false;
                    if(enemyTokenUuids) enemyTokenUuids = Array.from(enemyTokenUuids).map(checkbox => checkbox.value);

                    result = ({ userDecision: true, enemyTokenUuid, allyTokenUuid, damageChosen, selectedItemUuid, favoriteCheck, abilityCheck, enemyTokenUuids, programmaticallyClosed: false, source, type });
                }
            },
            {
                action: "no",
                label: `<i class='fas fa-times' style='margin-right: 5px;'></i>No`,
                default: true,
                callback: async (event, button, dialog) => {
                    if(notificationId) await game.gps.socket.executeAsUser("deleteChatMessage", getPrimaryGM(), {chatId: notificationId});
                    dialogState.interacted = true;
                    dialogState.decision = "no";
                    if(source && source === "user" && type === "multiDialog") await game.gps.socket.executeAsUser("closeDialogById", getPrimaryGM(), { dialogId: dialogId });
                    else if(source && source === "gm" && type === "multiDialog") await game.gps.socket.executeAsUser("closeDialogById", browserUser, { dialogId: dialogId });

                    let enemyTokenUuid = button.form?.elements["enemy-token"]?.value ?? false;

                    result = ({ userDecision: false, enemyTokenUuid, programmaticallyClosed: false, source, type });
                }
            },
        ],
        render: (event) => {
            let dialog = event.target;
            dialog.dialogState = dialogState;          
            dialog.timeLeft = initialTimeLeft;
            dialog.isPaused = false;
            dialog.pausedTime = 0;
            const startTime = Date.now();
            dialog.endTime = startTime + initialTimeLeft * 1000;
            const enemySelect = dialog?.element.querySelector(`#enemy-token`);
            const allySelect = dialog?.element.querySelector(`#ally-token`);

            function resetEnemySelect() {
                if (enemySelect) {
                    enemySelect.selectedIndex = 0;
                }
            }
            
            function resetAllySelect() {
                if (allySelect) {
                    allySelect.selectedIndex = 0;
                }
            }

            dialog.timer = setInterval(() => {
                if (!dialog.isPaused) {
                    const now = Date.now();
                    dialog.timeLeft = Math.max((dialog.endTime - now) / 1000, 0);
                    dialog.updateTimer(dialog.timeLeft, dialog.isPaused);
                    if (dialog.timeLeft <= 0) {
                        clearInterval(dialog.timer);
                        dialog.close();
                    }
                }
            }, 1000);

            dialog.animate = () => {
                if (!dialog.isPaused) {
                    const now = Date.now();
                    dialog.timeLeft = Math.max((dialog.endTime - now) / 1000, 0);
                    dialog.updateTimer(dialog.timeLeft, dialog.isPaused);
                    if (dialog.timeLeft > 0) {
                        requestAnimationFrame(dialog.animate);
                    }
                }
            };
            requestAnimationFrame(dialog.animate);

            dialog.listeners = attachEventListeners(dialog, dialog.animate);

            dialog.updateTimer = function updateTimer(newTimeLeft, paused) {
                let useFullTitleBar = false;
                if(game.settings.get("gambits-premades", "enableTimerFullAnim")) useFullTitleBar = true;
                this.timeLeft = newTimeLeft;
                this.isPaused = paused;
                const dialogElement = dialog?.element;
                const pauseIcon = dialogElement?.querySelector(`#pauseIcon_${dialogId}`);
                const pauseButton = dialogElement?.querySelector(`#pauseButton_${dialogId}`);
                const titleElement = dialogElement?.querySelector(`.window-title`);
                const titleBackground = dialogElement?.querySelector(`.window-header`);
    
                if (titleElement) {
                    titleElement.textContent = `${dialogTitle} - ${Math.ceil(this.timeLeft)}s`;
                }
    
                const progressPercentage = (this.timeLeft / initialTimeLeft) * 100;
                const transitionStart = 75;
                const transitionPercentage = Math.max((transitionStart - progressPercentage) / transitionStart, 0) * 100;

                let redValue;
                let greenValue;
                let blueValue;
                let borderColorStop;
                let colorStop1;
                let borderColor;

                if(type === "multiDialog" && source === "gm") {
                    redValue = Math.floor(0 + (transitionPercentage / 100) * (75 - 0));
                    greenValue = Math.floor(51 - (transitionPercentage / 100) * 51);
                    blueValue = Math.floor(153 - (transitionPercentage / 100) * (153 - 130));
                    borderColorStop = `rgb(${redValue}, ${greenValue}, ${blueValue})`;

                    colorStop1 = Math.max(progressPercentage - 5, 0);
                    borderColor = `linear-gradient(to right, ${borderColorStop}, ${borderColorStop} ${colorStop1}%, rgba(0, 0, 0, 0.5) ${progressPercentage}%, rgba(0, 0, 0, 0.5))`;
                }
                else {
                    redValue = Math.floor(181 + (transitionPercentage / 100) * (255 - 181));
                    greenValue = Math.floor(99 - (transitionPercentage / 100) * 99);
                    blueValue = Math.floor(69 - (transitionPercentage / 100) * 69);
                    borderColorStop = `rgb(${redValue}, ${greenValue}, ${blueValue})`;
        
                    colorStop1 = Math.max(progressPercentage - 5, 0);
                    borderColor = `linear-gradient(to right, ${borderColorStop}, ${borderColorStop} ${colorStop1}%, rgba(0, 0, 0, 0.5) ${progressPercentage}%, rgba(0, 0, 0, 0.5))`;
                }
    
                if (useFullTitleBar && titleBackground) {
                    titleBackground.style.background = borderColor;
                } else if (titleBackground) {
                    titleBackground.style.border = `2px solid`;
                    titleBackground.style.borderImage = borderColor;
                    titleBackground.style.borderImageSlice = 1;
                }
    
                if (pauseIcon && pauseButton) {
                    pauseIcon.classList.toggle("fa-play", this.isPaused);
                    pauseIcon.classList.toggle("fa-pause", !this.isPaused);
                    pauseButton.style.backgroundColor = this.isPaused ? "rgba(181, 99, 69, 0.80)" : "";
                }
            };
            requestAnimationFrame(dialog.animate);
            dialog.updateTimer(dialog.timeLeft, dialog.isPaused);
        },
        close: async (event, dialog) => {
            clearInterval(dialog.timer);
            cleanupEventListeners(dialog.listeners);
            
            if (dialog.dialogState.programmaticallyClosed) result = ({ userDecision: false, programmaticallyClosed: true, source, type });
            else if (!dialog.dialogState.interacted) result = ({ userDecision: false, programmaticallyClosed: false, source, type });

            if(source && source === "user" && type === "multiDialog" && !dialog.dialogState.programmaticallyClosed) await game.gps.socket.executeAsUser("closeDialogById", getPrimaryGM(), { dialogId: dialogId });
            else if(source && source === "gm" && type === "multiDialog" && !dialog.dialogState.programmaticallyClosed) await game.gps.socket.executeAsUser("closeDialogById", browserUser, { dialogId: dialogId });
        }, rejectClose:false
    });
    return result;
}

export async function moveTokenByOriginPoint({ originX, originY, targetUuid, distance }) {
    if (!targetUuid) return console.log("No valid target to move");
    if (!distance || isNaN(distance)) return console.log("No valid distance to move");
    if (!originX || !originY) return console.log("No valid origin x/y coordinate given, for a token object this value should be token.center.x/token.center.y");

    const targetDocument = await fromUuid(targetUuid);
    const target = targetDocument.object;

    const gridDistance = canvas.scene.dimensions.distance;
    const pixelsPerFoot = canvas.scene.grid.size / gridDistance;
    const gridDiagonals = game.settings.get("core", "gridDiagonals");

    const ray = new Ray({ x: originX, y: originY }, { x: target.center.x, y: target.center.y });
    const rayAngle = ray.angle;

    let allowedDistance = distance;
    let totalDistance = distance;
    let measuredCost;
    let finalX = target.center.x + Math.cos(rayAngle) * (allowedDistance * pixelsPerFoot);
    let finalY = target.center.y + Math.sin(rayAngle) * (allowedDistance * pixelsPerFoot);

    let collisionDetected = CONFIG.Canvas.polygonBackends.move.testCollision(target.center, new PIXI.Point(finalX, finalY), { type: "move", mode: "any" });

    if (!collisionDetected) {
        if (canvas.scene.grid.type === 1) {
            while (true) {
                let intendedX = target.center.x + Math.cos(rayAngle) * (allowedDistance * pixelsPerFoot);
                let intendedY = target.center.y + Math.sin(rayAngle) * (allowedDistance * pixelsPerFoot);
        
                if (canvas.scene.grid.type === 1) {
                    const snapped = canvas.scene.grid.getSnappedPoint({ x: intendedX, y: intendedY }, { mode: 0xFF0, resolution: 1 });
                    intendedX = snapped.x;
                    intendedY = snapped.y;
                }
        
                const path = [
                    { x: target.center.x, y: target.center.y },
                    { x: intendedX, y: intendedY }
                ];
        
                const measuredSegments = canvas.grid.measurePath(path);
                measuredCost = measuredSegments.cost;
        
                if (measuredCost < totalDistance && gridDiagonals === 0) {
                    allowedDistance += gridDistance;
                    continue;
                }
        
                else if (measuredCost <= totalDistance) {
                    break;
                }
        
                allowedDistance -= gridDistance;
                if (allowedDistance <= 0) {
                    allowedDistance = 0;
                    break;
                }
            }
        
            finalX = target.center.x + Math.cos(rayAngle) * (allowedDistance * pixelsPerFoot);
            finalY = target.center.y + Math.sin(rayAngle) * (allowedDistance * pixelsPerFoot);

            const snapped = canvas.scene.grid.getSnappedPoint({ x: finalX, y: finalY }, { mode: 0xFF0, resolution: 1 });
            finalX = snapped.x;
            finalY = snapped.y;
        }
    }
    else {
        let stepDistance = canvas.scene.grid.size / 10;
        let totalSteps = (distance * pixelsPerFoot) / stepDistance;
        let stepCounter = 0;

        for (let step = 1; step <= totalSteps; step++) {
            let nextX = target.x + Math.cos(rayAngle) * (stepDistance * step);
            let nextY = target.y + Math.sin(rayAngle) * (stepDistance * step);
            if (canvas.scene.grid.type === 1) {
                const snapped = canvas.scene.grid.getSnappedPoint({ x: nextX, y: nextY }, { mode: 0xFF0, resolution: 1 });
                nextX = snapped.x;
                nextY = snapped.y;
            }
            let nextPoint = new PIXI.Point(nextX, nextY);

            collisionDetected = CONFIG.Canvas.polygonBackends.move.testCollision(target.center, nextPoint, { type: "move", mode: "any" });

            if (collisionDetected) {
                break;
            }
            stepCounter = step;
        }

        finalX = target.x + Math.cos(rayAngle) * (stepDistance * stepCounter);
        finalY = target.y + Math.sin(rayAngle) * (stepDistance * stepCounter);

        if (stepCounter > 0) {
            if (canvas.scene.grid.type === 1) {
                const snapped = canvas.scene.grid.getSnappedPoint({ x: finalX, y: finalY }, { mode: 0xFF0, resolution: 1 });
                finalX = snapped.x;
                finalY = snapped.y;
            }
        }
    }

    const path = [
        { x: target.center.x, y: target.center.y },
        { x: finalX, y: finalY }
    ];
    let finalDistance = canvas.grid.measurePath(path).cost;
    await target.document.update({ x: finalX, y: finalY });
    return finalDistance;
}

export async function moveTokenByCardinal({ targetUuid, distance, direction }) {
    const directions = ["north", "south", "east", "west", "northwest", "northeast", "southwest", "southeast"];
    direction = direction.toLowerCase();

    if (!targetUuid) return console.log("No valid target to move");
    if (!distance || isNaN(distance)) return console.log("No valid distance to move");
    if (!directions.includes(direction)) return console.log("No valid direction to move (Valid Options: 'North', 'South', 'East', 'West', 'Northwest', 'Northeast', 'Southwest', 'Southeast')");

    const targetDocument = await fromUuid(targetUuid);
    const target = targetDocument.object;

    const gridDistance = canvas.scene.dimensions.distance;
    const pixelsPerFoot = canvas.scene.grid.size / gridDistance;
    const gridDiagonals = game.settings.get("core", "gridDiagonals");

    let angle = 0;
    switch (direction) {
        case "north":
            angle = -Math.PI / 2;
            break;
        case "south":
            angle = Math.PI / 2;
            break;
        case "east":
            angle = 0;
            break;
        case "west":
            angle = Math.PI;
            break;
        case "northwest":
            angle = -3 * Math.PI / 4;
            break;
        case "northeast":
            angle = -Math.PI / 4;
            break;
        case "southwest":
            angle = 3 * Math.PI / 4;
            break;
        case "southeast":
            angle = Math.PI / 4;
            break;
    }

    let allowedDistance = distance;
    let totalDistance = distance;
    let measuredCost;
    let finalX = target.center.x + Math.cos(angle) * (allowedDistance * pixelsPerFoot);
    let finalY = target.center.y + Math.sin(angle) * (allowedDistance * pixelsPerFoot);

    let collisionDetected = CONFIG.Canvas.polygonBackends.move.testCollision(target.center, new PIXI.Point(finalX, finalY), { type: "move", mode: "any" });

    if (!collisionDetected) {
        if (canvas.scene.grid.type === 1) {
            while (true) {
                let intendedX = target.center.x + Math.cos(angle) * (allowedDistance * pixelsPerFoot);
                let intendedY = target.center.y + Math.sin(angle) * (allowedDistance * pixelsPerFoot);
        
                if (canvas.scene.grid.type === 1) {
                    const snapped = canvas.scene.grid.getSnappedPoint({ x: intendedX, y: intendedY }, { mode: 0xFF0, resolution: 1 });
                    intendedX = snapped.x;
                    intendedY = snapped.y;
                }
        
                const path = [
                    { x: target.center.x, y: target.center.y },
                    { x: intendedX, y: intendedY }
                ];
        
                const measuredSegments = canvas.grid.measurePath(path);
                measuredCost = measuredSegments.cost;
        
                if (measuredCost < totalDistance && gridDiagonals === 0) {
                    allowedDistance += gridDistance;
                    continue;
                }
        
                else if (measuredCost <= totalDistance) {
                    break;
                }
        
                allowedDistance -= gridDistance;
                if (allowedDistance <= 0) {
                    allowedDistance = 0;
                    break;
                }
            }
        
            finalX = target.center.x + Math.cos(angle) * (allowedDistance * pixelsPerFoot);
            finalY = target.center.y + Math.sin(angle) * (allowedDistance * pixelsPerFoot);

            const snapped = canvas.scene.grid.getSnappedPoint({ x: finalX, y: finalY }, { mode: 0xFF0, resolution: 1 });
            finalX = snapped.x;
            finalY = snapped.y;
        }
    } else {
        let stepDistance = canvas.scene.grid.size / 10;
        let totalSteps = (distance * pixelsPerFoot) / stepDistance;
        let stepCounter = 0;

        for (let step = 1; step <= totalSteps; step++) {
            let nextX = target.x + Math.cos(angle) * (stepDistance * step);
            let nextY = target.y + Math.sin(angle) * (stepDistance * step);
            if (canvas.scene.grid.type === 1) {
                const snapped = canvas.scene.grid.getSnappedPoint({ x: nextX, y: nextY }, { mode: 0xFF0, resolution: 1 });
                nextX = snapped.x;
                nextY = snapped.y;
            }
            let nextPoint = new PIXI.Point(nextX, nextY);

            collisionDetected = CONFIG.Canvas.polygonBackends.move.testCollision(target.center, nextPoint, { type: "move", mode: "any" });

            if (collisionDetected) {
                break;
            }
            stepCounter = step;
        }

        finalX = target.x + Math.cos(angle) * (stepDistance * stepCounter);
        finalY = target.y + Math.sin(angle) * (stepDistance * stepCounter);

        if (stepCounter > 0) {
            if (canvas.scene.grid.type === 1) {
                const snapped = canvas.scene.grid.getSnappedPoint({ x: finalX, y: finalY }, { mode: 0xFF0, resolution: 1 });
                finalX = snapped.x;
                finalY = snapped.y;
            }
        }
    }

    const path = [
        { x: target.center.x, y: target.center.y },
        { x: finalX, y: finalY }
    ];
    let finalDistance = canvas.grid.measurePath(path).cost;
    await target.document.update({ x: finalX, y: finalY });
    return finalDistance;
}

export async function replaceChatCard({ actorUuid, itemUuid, chatContent, rollData }) {
    if(!actorUuid || !itemUuid || !chatContent) return;
    let actor = await fromUuid(actorUuid);
    let token = await MidiQOL.tokenForActor(actor);
    let item = await fromUuid(itemUuid);
    if(rollData) rollData = Roll.fromJSON(JSON.stringify(rollData));
    else rollData = null;
    let rollContent = rollData ? await rollData.render() : '';

    let msgHistory = [];
    game.messages.reduce((list, message) => {
        if (message.flags["midi-qol"]?.itemId === item._id && message.speaker.token === token.document.id) msgHistory.push(message.id);
    }, msgHistory);
    let itemCard = msgHistory[msgHistory?.length - 1];
    let chatMessage = false;
    if(itemCard) chatMessage = await game.messages.get(itemCard);
    if(chatMessage) {
        let content = await foundry.utils.duplicate(chatMessage.content);
        let insertPosition = content.indexOf('<div class="end-midi-qol-attack-roll"></div>');
        if (insertPosition !== -1) {
            content = content.slice(0, insertPosition) + rollContent + chatContent + content.slice(insertPosition);
        }
        await chatMessage.update({ content: content });
    }
    else {
        let actorPlayer = MidiQOL.playerForActor(actor);
        let chatData = await item.getChatData();

        chatData.hasProperties = true;
        chatData.subtitle = chatData.properties[0];

        let itemCardData = {
            actor: item.actor,
            item: item,
            data: chatData
        };

        let itemContent = await renderTemplate("modules/midi-qol/templates/item-card.hbs", itemCardData);

        let combinedContent = `
            <div class="custom-message">
                ${itemContent}
                ${rollContent}
                <div style="margin-top: 10px; margin-bottom: 5px;">
                    ${chatContent}
                </div>
            </div>
        `;

        ChatMessage.create({
            user: actorPlayer.id,
            content: combinedContent,
            speaker: ChatMessage.getSpeaker({ token: token })
        });
    }
}

let regionTokenStates = new Map();
export function validateRegionMovement({regionScenario, regionStatus, regionUuid, tokenUuid, isTeleport = false, validExit = true}) {
    let region = fromUuidSync(regionUuid);
    if(!region) return;
    let token = fromUuidSync(tokenUuid);
    if(!token) return;
    let regionId = region.id;
    let tokenId = token.id;
    let validatedRegionMovement;

    if(regionScenario === "tokenStatusChanged" && regionStatus) {
        regionTokenStates.set(`${regionId}-${tokenId}-statuschanged`, true);
        return validatedRegionMovement = ({ validRegionMovement: false, validReroute: false });
    }
    else if(regionScenario === "tokenStatusChanged" && !regionStatus) return validatedRegionMovement = ({ validRegionMovement: false, validReroute: false });

    if(regionScenario === "tokenExit") {
        regionTokenStates.set(`${regionId}-${tokenId}-exited`, true);
        return validatedRegionMovement = ({ validRegionMovement: false, validReroute: false });
    }
    else if(regionScenario === "tokenEnter") {
        regionTokenStates.set(`${regionId}-${tokenId}-entered`, true);
        return validatedRegionMovement = ({ validRegionMovement: false, validReroute: false });
    }
    else if(regionScenario === "tokenForcedMovement") {
        regionTokenStates.set(`${regionId}-${tokenId}-forcedMovement`, true);
        return validatedRegionMovement = ({ validRegionMovement: false, validReroute: false });
    }
    else if(regionScenario === "tokenPostMove") {
        const entered = regionTokenStates.get(`${regionId}-${tokenId}-entered`);
        const exited = regionTokenStates.get(`${regionId}-${tokenId}-exited`);
        const forcedMovement = regionTokenStates.get(`${regionId}-${tokenId}-forcedMovement`);
        const statusChanged = regionTokenStates.get(`${regionId}-statuschanged`);

        if(exited) regionTokenStates.delete(`${regionId}-${tokenId}-exited`);
        if(entered) regionTokenStates.delete(`${regionId}-${tokenId}-entered`);
        if(forcedMovement) regionTokenStates.delete(`${regionId}-${tokenId}-forcedMovement`);
        if(statusChanged) regionTokenStates.delete(`${regionId}-${tokenId}-statuschanged`);

        if(forcedMovement || statusChanged) return validatedRegionMovement = ({ validRegionMovement: false, validReroute: false });

        if (!exited && !entered && !isTeleport) {
            if (token.regions.has(region)) return validatedRegionMovement = ({ validRegionMovement: false, validReroute: false });
            else return validatedRegionMovement = ({ validRegionMovement: true, validReroute: true });
        }
        else if(exited && validExit && !isTeleport) {
            return validatedRegionMovement = ({ validRegionMovement: true, validReroute: true });
        }
        else if (entered && !isTeleport) {
            return validatedRegionMovement = ({ validRegionMovement: true, validReroute: false });
        }
        else {
            return validatedRegionMovement = ({ validRegionMovement: false, validReroute: false });
        }
    }
    else if(regionScenario === "tokenTurnStart") {
        return validatedRegionMovement = ({ validRegionMovement: true, validReroute: false });
    }
    else {
        return validatedRegionMovement = ({ validRegionMovement: false, validReroute: false });
    }
}

export async function ritualSpellUse({ workflowUuid }) {
    if(!workflowUuid) return;

    const workflow = await MidiQOL.Workflow.getWorkflow(`${workflowUuid}`);
    if(workflow.macroPass !== "preItemRoll") return;
    if(!workflow.item.system.properties.has("ritual")) return;

    await foundry.applications.api.DialogV2.wait({
        window: { title: `Ritual ${workflow.item.name} Use` },
        content: `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">Would you like to cast ${workflow.item.name} ritually? This will increase its cast time (${workflow.item.system.activation.cost} ${workflow.item.system.activation.type}) by 10 minutes.</p>
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
            label: "Yes",
            callback: async (event, button, dialog) => {
                //workflow.config.spell = workflow.config.spell || {};
                workflow.config.consume = workflow.config.consume || {};
                //workflow.config.spell.slot = false;
                workflow.config.consume.spellSlot = false;
                workflow.config.midiOptions.configureDialog = false;

                let content = `<span style='text-wrap: wrap;'><img src="${workflow.actor.img}" style="width: 25px; height: auto;" /> ${workflow.actor.name} cast ${workflow.item.name} ritually.</span>`
                let chatData = {
                user: getPrimaryGM(),
                content: content,
                whisper: getPrimaryGM()
                };
                await MidiQOL.socket().executeAsUser("createChatMessage", getPrimaryGM(), { chatData });
                return;
            }
        },
        {
            action: "No",
            label: "No",
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
    
    if(!player.active) playerId = getPrimaryGM();
    else playerId = player.id;
    return playerId;
}

export function getPrimaryGM() {
    const primaryGMId = MidiQOL.safeGetGameSetting('gambits-premades', `primaryGM`);
    const primaryGM = game.users.find(user => user.id === primaryGMId && user.active && user.isGM);
    
    if (!primaryGM) {
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

export function getCprConfig({itemUuid}) {
    if(!game.modules.get("chris-premades")?.active) return {animEnabled: true, animColor: null};
    let itemData = fromUuidSync(itemUuid);
    if(!itemData) return {animEnabled: true, animColor: null};
    let cprConfig = itemData.getFlag("chris-premades", "config");
    if(!cprConfig) return {animEnabled: true, animColor: null};
    let animEnabled = cprConfig?.playAnimation;
    let animColor = cprConfig?.color ?? null;
    if(animEnabled === true || animEnabled === false) return {animEnabled: animEnabled, animColor: animColor};
    else return {animEnabled: true, animColor: animColor};
}

export async function remoteCompleteItemUse({itemUuid, actorUuid, options}) {
    if(!itemUuid || !actorUuid || !options) return;

    let itemData = await fromUuid(itemUuid);
    
    let remoteCIU = await MidiQOL.completeItemUse(itemData, {actorUuid}, options);
    let checkHits = remoteCIU?.hitTargets?.first() ? true : false;

    return {castLevel: remoteCIU?.castData?.castLevel, baseLevel: remoteCIU?.castData?.baseLevel, itemType: remoteCIU?.item?.system?.preparation?.mode, checkHits: checkHits};
}

export async function remoteAbilityTest({spellcasting, actorUuid}) {
    if(!spellcasting || !actorUuid) return;

    let actor = await fromUuid(actorUuid)

    let rollId;
    Hooks.once("createChatMessage", async (chatMessage, options, userId) => {
        rollId = chatMessage.id;
    });

    await actor.rollAbilityTest(spellcasting);

    return {skillRoll: rollId};
}

export async function gpsActivityUse({itemUuid, identifier, targetUuid}) {
    const item = await fromUuid(itemUuid);
    if(!item) return console.error(`Shame you didn't pass me an itemUuid`)
    const activity = item.system.activities.find(a => a.identifier === identifier);
    if(!activity) return console.error(`Naughty Naughty: You've likely removed the identifier name from a ${item.name} automation activity and now it's nowhere to be found ¯\_(ツ)_/¯`)
    const options = { midiOptions: { targetUuids: [targetUuid], noOnUseMacro: true, configureDialog: false, showFullCard: false, ignoreUserTargets: true, checkGMStatus: true } };
    return await MidiQOL.completeActivityUse(activity.uuid, options, {}, {});
}

export async function gpsActivityUpdate({activityUuid, updates}) {
    let activity = await fromUuid(activityUuid);
    await activity.update(updates);
}
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

export async function freeSpellUse({ workflowUuid }) {
    if(!workflowUuid) return;

    const workflow = await MidiQOL.Workflow.getWorkflow(`${workflowUuid}`);
    if(workflow.macroPass !== "preItemRoll") return;

    const effectName = `${workflow.item.name}: Long Rest Charge Used`;

    if (!workflow.actor.appliedEffects.some(e => e.name === effectName)) {
        let title = `Free ${workflow.item.name} Use`;
        let content = `<p>Would you like to activate your free use of ${workflow.item.name}? It will be cast at its base level.</p>`;

        let buttons = {
            yes: {
                label: "Yes",
                callback: async (html) => {
                    workflow.config.consumeSpellSlot = false;
                    workflow.config.consumeSpellLevel = false;
                    workflow.config.needsConfiguration = false;
                    workflow.options.configureDialog = false;
                    const effectData = {
                        name: effectName,
                        icon: workflow.item.img,
                        duration: {},
                        origin: workflow.actor.uuid,
                        flags: {dae:{specialDuration:['longRest']}}
                    }
                    ui.notifications.info(`You used your once per long rest use of ${workflow.item.name} and did not use a spell slot`)
                    return await workflow.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
                }
            },
            no: {
                label: "No",
                callback: async () => false
            }
        };

        await Dialog.wait({ title, content, buttons, default: "No" });
    }
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

    if (activeDialog === dialogId) {
        ui.activeWindow.updateTimer(timeLeft, isPaused);
    } else {
        let dialog = Object.values(ui.windows).find(d => d.data?.id === dialogId);
        if (dialog) {
            dialog.updateTimer(timeLeft, isPaused);
        }
    }
}

export async function rollAsUser({ rollParams, type }) {
    if(!rollParams) return;
    let reroll;
    
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
        if (!t.actor) {
            if (debugEnabled) console.error(`${itemName} for ${t.actor ? t.actor.name : "Unknown Actor"} failed at invalid token actor on canvas`);
            return;
        }

        // Check if the token has the actual item to use
        let checkItem = t.actor.items.find(i => i.name.toLowerCase() === itemName);
        if(!checkItem) {
            if (debugEnabled) console.error(`${itemName} for ${t.actor.name} failed at check if reaction item exists`);
            return;
        }

        // Check if the tokens reaction already used
        if (reactionCheck && t.actor.effects.find(i => i.name.toLowerCase() === "reaction")) {
            if(debugEnabled) console.error(`${itemName} for ${t.actor.name} failed at reaction available`);
            return;
        }

        // Check if the token is incapacitated
        if(MidiQOL.checkIncapacitated(t)) {
            if(debugEnabled) console.error(`${itemName} for ${t.actor.name} failed at is incapacitated`);
            return;
        }

        // Check if the token is the initiating token or not a qualifying token disposition
        if (dispositionCheck && ((t.id === initiatingToken.id && workflowType === "attack") || ((dispositionCheckType === "enemy" || dispositionCheckType === "enemyAlly") && t.document.disposition === initiatingToken.document.disposition) || (dispositionCheckType === "ally" && t.document.disposition !== initiatingToken.document.disposition))) {
            if(debugEnabled) console.error(`${itemName} for ${t.actor.name} failed at token disposition check`);
            return;
        }

        // Check if token can see initiating token
        if(sightCheck && !MidiQOL.canSee(t, initiatingToken)) {
            if(debugEnabled) console.error(`${itemName} for ${t.actor.name} failed at sight check`);
            return;
        }

        // Check if token is within range
        if(rangeCheck) {
            let measuredDistance = (dispositionCheckType === "ally" || dispositionCheckType === "enemyAlly") ? MidiQOL.computeDistance(targetedToken,t,true) : MidiQOL.computeDistance(initiatingToken,t,true);
            let range = game.gps.convertFromFeet({range: rangeTotal});
            if (measuredDistance === -1 || (measuredDistance > range)) {
                if(debugEnabled) console.error(`${itemName} for ${t.actor.name} failed at range check`);
                return;
            }
        }

        // Check if the token has available spell slots/uses
        if(itemType === "spell") {
            const spells = t.actor.system.spells;
            let spellLevel = checkItem?.system?.level;
            let checkType = checkItem?.system?.preparation?.mode;
            let hasSpellSlots = false;
            if(checkType === "prepared" && checkItem?.system?.preparation?.prepared === false) return;
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
                if(debugEnabled) console.error(`${itemName} for ${t.actor.name} failed at check valid spell slots/preparation`);
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

        if(debugEnabled) console.warn(`%c${itemName} for ${t.actor.name} Reaction Validation Passed`, 'font-weight: bold');

        return t;
    };

    return validTokens;
}

export async function process3rdPartyReactionDialog({dialogTitle,dialogContent,dialogId,initialTimeLeft,actorUuid,itemUuid,source,type}) {
    const module = await import('./module.js');
    const socket = module.socket;

    return await new Promise(resolve => {
        let timer;

        let dialog = new Dialog({
            title: dialogTitle,
            content: dialogContent,
            id: dialogId,
            buttons: {
                yes: {
                    label: "Yes",
                    callback: async (html) => {
                        dialog.dialogState.interacted = true;
                        dialog.dialogState.decision = "yes";
                        if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: dialogId });
                        if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: dialogId });
                        
                        let userDecision = true;

                        let macroItem = await fromUuid(itemUuid);
                        let actor = await fromUuid(actorUuid);
                        if(macroItem) await macroItem.use();

                        let hasEffectApplied = actor.appliedEffects.some(e => e.name === "Reaction");

                        if (!hasEffectApplied) {
                            await game.dfreds.effectInterface.addEffect({ effectName: 'Reaction', uuid: actorUuid });
                        }

                        return resolve({userDecision, programmaticallyClosed: false, source, type});
                    }
                },
                no: {
                    label: "No",
                    callback: async () => {
                        // Reaction Declined
                        dialog.dialogState.interacted = true;
                        dialog.dialogState.decision = "no";
                        return resolve({ userDecision: false, programmaticallyClosed: false, source, type});
                    }
                },
            }, default: "no",
            render: (html) => {
                $(html).attr('id', dialog.options.id);
                let timeLeft = initialTimeLeft;
                let isPaused = false;
                const countdownElement = html.find("#countdown");
                const pauseButton = html.find("#pauseButton");

                dialog.updateTimer = (newTimeLeft, paused) => {
                    timeLeft = newTimeLeft;
                    isPaused = paused;
                    countdownElement.text(`${timeLeft}`);
                    pauseButton.text(isPaused ? 'Paused' : 'Pause');
                };

                timer = setInterval(() => {
                    if (!isPaused) {
                        timeLeft--;
                        countdownElement.text(`${timeLeft}`);
                        if (timeLeft <= 0) {
                            dialog.data.buttons.no.callback();
                            dialog.close();
                        }
                    }
                }, 1000);

                pauseButton.click(() => {
                    isPaused = !isPaused;
                    pauseButton.text(isPaused ? 'Paused' : 'Pause');
                    if (source && source === "user" && type === "multiDialog") {
                        socket.executeAsGM("pauseDialogById", { dialogId, timeLeft, isPaused });
                    } else if (source && source === "gm" && type === "multiDialog") {
                        socket.executeAsUser("pauseDialogById", browserUser.id, { dialogId, timeLeft, isPaused });
                    }
                });
            },
            close: () => {
                clearInterval(timer);
                if (dialog.dialogState.programmaticallyClosed) {
                    return resolve({ userDecision: false, programmaticallyClosed: true, source, type });
                }
                else if (!dialog.dialogState.interacted) {
                    return resolve({ userDecision: false, programmaticallyClosed: false, source, type });
                }
            }
        });
        dialog.dialogState = { interacted: false, decision: null, programmaticallyClosed: false };
        dialog.render(true);
    });
}

export async function moveTokenByOriginPoint({ originX, originY, target, distance }) {

    if (!target) return console.log("No valid target to move");
    if (!distance || isNaN(distance)) return console.log("No valid distance to move");
    if (!originX || !originY) return console.log("No valid origin x/y coordinate given, for a token object this value should be token.center.x/token.center.y");

    const gridDistance = canvas.dimensions.distance;
    const pixelsPerFoot = canvas.scene.grid.size / gridDistance;
    const moveDistancePixels = distance * pixelsPerFoot;

    let vectorX = target.center.x - originX;
    let vectorY = target.center.y - originY;
    let magnitude;

    const diagonalMovement = game.settings.get("dnd5e", "diagonalMovement");

    switch (diagonalMovement) {
        case "555":
            magnitude = Math.max(Math.abs(vectorX), Math.abs(vectorY));
            break;
        case "5105":
            let steps = 0;
            let dx = Math.abs(vectorX);
            let dy = Math.abs(vectorY);
        
            while (dx > 0 || dy > 0) {
                if (dx > 0 && dy > 0) {
                    steps += (steps % 2 === 0) ? 1 : 2;
                    dx -= 1;
                    dy -= 1;
                } else if (dx > 0) {
                    steps += 1;
                    dx -= 1;
                } else if (dy > 0) {
                    steps += 1;
                    dy -= 1;
                }
            }
            magnitude = steps;
            break;
        case "EUCL":
        default:
            magnitude = Math.hypot(vectorX, vectorY);
            break;
    }

    vectorX /= magnitude;
    vectorY /= magnitude;

    let moveX = vectorX * moveDistancePixels;
    let moveY = vectorY * moveDistancePixels;
    let newX = target.x + moveX;
    let newY = target.y + moveY;

    if (canvas.scene.grid.type === 1) {
        const snapped = canvas.grid.getSnappedPosition(newX, newY, canvas.scene.grid.type);
        newX = snapped.x;
        newY = snapped.y;
    }

    let endPoint = new PIXI.Point(newX, newY);
    let collisionDetected = CONFIG.Canvas.polygonBackends.move.testCollision(target.center, endPoint, { type: "move", mode: "any" });

    if (!collisionDetected) {
        await target.document.update({ x: newX, y: newY });
    } else {
        let stepDistance = canvas.scene.grid.size / 10;
        let totalSteps = moveDistancePixels / stepDistance;
        let stepCounter = 0;

        for (let step = 1; step <= totalSteps; step++) {
            let nextX = target.x + vectorX * stepDistance * step;
            let nextY = target.y + vectorY * stepDistance * step;
            if (canvas.scene.grid.type === 1) {
                const snapped = canvas.grid.getSnappedPosition(nextX, nextY, canvas.scene.grid.type);
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

        let finalX = target.x + vectorX * stepDistance * stepCounter;
        let finalY = target.y + vectorY * stepDistance * stepCounter;

        if (stepCounter > 0) {
            if (canvas.scene.grid.type === 1) {
                const snapped = canvas.grid.getSnappedPosition(finalX, finalY, canvas.scene.grid.type);
                finalX = snapped.x;
                finalY = snapped.y;
            }
            await target.document.update({ x: finalX, y: finalY });
        }
    }
}

export async function moveTokenByCardinal({ target, distance, direction }) {
    const directions = ["North", "South", "East", "West", "Northwest", "Northeast", "Southwest", "Southeast"];

    if (!target) return console.log("No valid target to move");
    if (!distance || isNaN(distance)) return console.log("No valid distance to move");
    if (!directions.includes(direction)) return console.log("No valid direction to move (Valid Options: 'North', 'South', 'East', 'West', 'Northwest', 'Northeast', 'Southwest', 'Southeast')");

    const gridDistance = canvas.dimensions.distance;
    const pixelsPerFoot = canvas.scene.grid.size / gridDistance;
    const moveDistancePixels = distance * pixelsPerFoot;

    const diagonalMovement = game.settings.get("dnd5e", "diagonalMovement");

    let moveX = 0;
    let moveY = 0;

    switch (direction) {
        case "North":
            moveY = -moveDistancePixels;
            break;
        case "South":
            moveY = moveDistancePixels;
            break;
        case "East":
            moveX = moveDistancePixels;
            break;
        case "West":
            moveX = -moveDistancePixels;
            break;
        case "Northwest":
        case "Northeast":
        case "Southwest":
        case "Southeast":
            let dx = 1;
            let dy = 1;

            if (direction.includes("North")) dy = -1;
            if (direction.includes("South")) dy = 1;
            if (direction.includes("East")) dx = 1;
            if (direction.includes("West")) dx = -1;

            switch (diagonalMovement) {
                case "555":
                    moveX = moveDistancePixels * dx;
                    moveY = moveDistancePixels * dy;
                    break;
                case "5105":
                    const diagonalSteps = Math.min(Math.abs(dx), Math.abs(dy));
                    const straightSteps = Math.abs(dx - dy);
                    const magnitude = diagonalSteps * 1.5 + straightSteps;
                    moveX = (moveDistancePixels / magnitude) * dx;
                    moveY = (moveDistancePixels / magnitude) * dy;
                    break;
                case "EUCL":
                default:
                    moveX = (moveDistancePixels / Math.SQRT2) * dx;
                    moveY = (moveDistancePixels / Math.SQRT2) * dy;
                    break;
            }
            break;
    }

    let newX = target.x + moveX;
    let newY = target.y + moveY;

    if (canvas.scene.grid.type === 1) {
        const snapped = canvas.grid.getSnappedPosition(newX, newY, canvas.scene.grid.type);
        newX = snapped.x;
        newY = snapped.y;
    }

    let endPoint = new PIXI.Point(newX, newY);
    let collisionDetected = CONFIG.Canvas.polygonBackends.move.testCollision(target.center, endPoint, { type: "move", mode: "any" });

    if (!collisionDetected) {
        await target.document.update({ x: newX, y: newY });
    } else {
        let directionVector = { x: moveX, y: moveY };
        let magnitude = Math.hypot(directionVector.x, directionVector.y);
        directionVector.x /= magnitude;
        directionVector.y /= magnitude;

        let totalSteps = moveDistancePixels / (canvas.scene.grid.size / 10);
        let stepCounter = 0;

        for (let step = 1; step <= totalSteps; step++) {
            let nextX = target.x + directionVector.x * (canvas.scene.grid.size / 10) * step;
            let nextY = target.y + directionVector.y * (canvas.scene.grid.size / 10) * step;
            if (canvas.scene.grid.type === 1) {
                const snapped = canvas.grid.getSnappedPosition(nextX, nextY, canvas.scene.grid.type);
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

        let finalX = target.x + directionVector.x * (canvas.scene.grid.size / 10) * stepCounter;
        let finalY = target.y + directionVector.y * (canvas.scene.grid.size / 10) * stepCounter;

        if (stepCounter > 0) {
            if (canvas.scene.grid.type === 1) {
                const snapped = canvas.grid.getSnappedPosition(finalX, finalY, canvas.scene.grid.type);
                finalX = snapped.x;
                finalY = snapped.y;
            }
            await target.document.update({ x: finalX, y: finalY });
        }
    }
}

export async function updateTokenElevation({ target, elevation }) {
    if(!target || !elevation) return;
    await target.document.update({ elevation: elevation });
}
//done
export async function witchesHex({workflowData,workflowType,workflowCombat}) {
    const module = await import('../module.js');
    const socket = module.socket;
    const helpers = await import('../helpers.js');
    const workflowUuid = workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowUuid);
    let itemName = "witches hex";
    let itemProperName = "Witches Hex";
    let dialogId = "witcheshex";
    if(!workflow) return;
    if(workflow.item.name === itemProperName) return;
    
    if(workflowType === "save" && workflow.saveResults.length === 0) return;
    if(workflowType === "attack" && (workflow.isCritical === true || workflow.isFumble === true)) return;

    let findValidTokens;

    if(workflowType === "attack") {
        findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "feature", itemChecked: [itemName], reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat});
    }
    else if(workflowType === "save") {
        findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "feature", itemChecked: [itemName], reactionCheck: true, sightCheck: false, rangeCheck: false, rangeTotal: null, dispositionCheck: true, dispositionCheckType: "ally", workflowType: workflowType, workflowCombat: workflowCombat});
    }
    
    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemProperName} Timeout`));
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        let hexDie = validTokenPrimary.actor.system.scale["kp-witch"]["hex-die"]?.die;
        if(!hexDie) {
            ui.notifications.error("You must have a Witch scale for this actor named 'kp-witch'")
            continue;
        }
        let chosenItem = validTokenPrimary.actor.items.find(i => i.name === itemProperName);
        browserUser = MidiQOL.playerForActor(validTokenPrimary.actor);
        if (!browserUser.active) {
            browserUser = game.users?.activeGM;
        }
        let content;
        let dialogContent;
        const optionBackground = (document.body.classList.contains("theme-dark")) ? 'black' : 'var(--color-bg)';

        if(workflowType === "save") {
            let targets = Array.from(workflow.saves).filter(t => t.document.disposition !== validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary, t) && MidiQOL.computeDistance(validTokenPrimary, t, true) <= 60);

            const targetUuids = targets.map(t => t.document.uuid);
            const targetNames = targets.map(t => t.document.name);
            if(targetUuids.length === 0) continue;

            targetUuids.map((uuid, index) => 
                `<option value="${uuid}">${targetNames[index]}</option>`
            ).join('');
            
            dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <p class="gps-dialog-paragraph">Would you like to use your reaction to cast ${itemProperName} to try and reduce an enemies saving throw? Choose an enemy to target below.</p>
                            <div>
                                <div class="gps-dialog-flex">
                                    <label for="enemy-token" class="gps-dialog-label">Target:</label>
                                    <select id="enemy-token" class="gps-dialog-select">
                                        ${targetNames.map((name, index) => `<option class="gps-dialog-option" style="background-color: ${optionBackground};" value="${targetUuids[index]}">${name}</option>`).join('')}
                                    </select>
                                    <div id="image-container" class="gps-dialog-image-container">
                                        <img id="img_${dialogId}" src="${chosenItem.img}" class="gps-dialog-image">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="gps-dialog-button-container">
                        <button id="pauseButton_${dialogId}" type="button" class="gps-dialog-button">
                            <i class="fas fa-pause" id="pauseIcon_${dialogId}" style="margin-right: 5px;"></i>Pause
                        </button>
                    </div>
                </div>
            `;

            content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for a save triggering ${itemProperName}.</span>`
        }

        if(workflowType === "attack") {
            dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">Would you like to use your reaction to initiate ${itemProperName} to try and reduce the enemies attack roll?</p>
                                <div id="image-container" class="gps-dialog-image-container">
                                    <img id="img_${dialogId}" src="${chosenItem.img}" class="gps-dialog-image">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="gps-dialog-button-container">
                    <button id="pauseButton_${dialogId}" type="button" class="gps-dialog-button">
                        <i class="fas fa-pause" id="pauseIcon_${dialogId}" style="margin-right: 5px;"></i>Pause
                    </button>
                </div>
            </div>
            `;

            content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for an attack triggering ${itemProperName}.</span>`
        }
            
        let chatData = {
        user: game.users.find(u => u.isGM).id,
        content: content,
        whisper: game.users.find(u => u.isGM).id
        };
        let notificationMessage = await MidiQOL.socket().executeAsGM("createChatMessage", { chatData });

        let result;
        
        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
            let userDialogPromise = socket.executeAsUser("process3rdPartyReactionDialog", browserUser.id, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "user",type: "multiDialog"});
            
            let gmDialogPromise = socket.executeAsGM("process3rdPartyReactionDialog", {dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "gm",type: "multiDialog"});
        
            result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
        } else {
            result = await socket.executeAsUser("process3rdPartyReactionDialog", browserUser.id, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source:browserUser.isGM ? "gm" : "user",type:"singleDialog"});
        }
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, selectedItemUuid, favoriteCheck, source, type } = result;

        if (!userDecision) {
            if(source === "gm" || type === "singleDialog") await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
            continue;
        }
        else if (userDecision) {
            await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });

            let target;
            let targetDocument;
            if(workflowType === "attack") {
                target = workflow.token;
            }
            if(workflowType === "save") {
                targetDocument = await fromUuid(enemyTokenUuid);
                target = targetDocument.object;
            }

            chosenItem.prepareData();
            chosenItem.prepareFinalAttributes();
            chosenItem.applyActiveEffects();

            const options = {
                showFullCard: false,
                createWorkflow: true,
                versatile: false,
                configureDialog: true,
                targetUuids: [`${target.document.uuid}`],
            };

            let itemRoll;
            if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser?.id, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });
            else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsGM("completeItemUse", { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });
            if(itemRoll.aborted === true) continue;

            await helpers.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

            let actorLevel = validTokenPrimary.actor.system.details.level;
            let flamesEmbrace = validTokenPrimary.actor.items.getName("Flame's Embrace");
            
            if(actorLevel >= 6 && flamesEmbrace) {
                let spellDC = validTokenPrimary.actor.system.attributes.spelldc;
                let saveData = {
                    name: "Flame's Embrace Save",
                    type: "feat",
                    img: `${flamesEmbrace.img}`,
                    effects: [],
                    flags: {
                        "midi-qol": {
                            noProvokeReaction: true,
                            onUseMacroName: null,
                            forceCEOff: true
                        },
                        "midiProperties": {
                            saveDamage: "nodam",
                            magiceffect: true
                        },
                        "autoanimations": {
                            killAnim: true
                        }
                    },
                    system: {
                        equipped: true,
                        actionType: "save",
                        save: { "dc": `${spellDC}`, "ability": 'con', "scaling": "flat" },
                        components: { concentration: false, material: false, ritual: false, somatic: false, value: "", vocal: false },
                        duration: { units: "inst", value: undefined },
                        properties: {mgc: true}
                    }
                };
                const itemUpdate = new CONFIG.Item.documentClass(saveData, {parent: validTokenPrimary.actor});
                const options = { showFullCard: false, createWorkflow: true, versatile: false, configureDialog: false, targetUuids: [`${target.document.uuid}`] };
                let saveResult = await MidiQOL.completeItemUse(itemUpdate, {}, options);
                if(saveResult.aborted === true) continue;

                if(saveResult.failedSaves.size !== 0) {
                    let itemData = {
                        "name": "Flame's Embrace",
                        "type": "feat",
                        "img": `${flamesEmbrace.img}`,
                        "system": {
                        "description": {
                            "value": "<p>You have been hexed and are under the effect of Flame's Embrace.</p>"
                        },
                        },
                        "effects": [
                        {
                            "icon": `${flamesEmbrace.img}`,
                            "duration": {
                            "seconds": 60
                            },
                            "disabled": false,
                            "name": "Flame's Embrace",
                            "changes": [
                            {
                                "key": "system.traits.dv.value",
                                "mode": 0,
                                "value": "fire",
                                "priority": 20
                            },
                            {
                                "key": "flags.midi-qol.onUseMacroName",
                                "mode": 0,
                                "value": "ItemMacro, isDamaged",
                                "priority": 20
                            }
                            ],
                            "transfer": true,
                            "tint": null
                        }
                        ],
                        "flags": {
                            "dae": {
                                "macro": {
                                "name": "Hexed",
                                "img": "systems/dnd5e/icons/svg/items/feature.svg",
                                "type": "script",
                                "scope": "global",
                                "command": `if(args[0].macroPass === \"isDamaged\") {\n    let damageTypes = [\"fire\"];\n    let rollFound = workflow.damageDetail.some(roll => damageTypes.includes(roll.type));\n\n    if(rollFound) {\n        let originActor = await fromUuid(\`${validTokenPrimary.actor.uuid}\`);\n        let spellDC = originActor.system.attributes.spelldc;\n        const itemData = {\n        name: \"Flame's Embrace Save\",\n        type: \"feat\",\n        img: \`${flamesEmbrace.img}\`,\n        effects: [],\n        flags: {\n            \"midi-qol\": {\n                noProvokeReaction: true,\n                onUseMacroName: null,\n                forceCEOff: true\n            },\n            \"midiProperties\": {\n                saveDamage: "nodam", magiceffect: true\n            }, "autoanimations": {\n                killAnim: true\n }},\n        system: {\n            equipped: true,\n            actionType: \"save\",\n            save: { \"dc\": spellDC, \"ability\": 'con', \"scaling\": \"flat\" },\n            components: { concentration: false, material: false, ritual: false, somatic: false, value: \"\", vocal: false },\n            duration: { units: \"inst\", value: undefined },\n            properties: {mgc: true}\n        },\n        };\n        const itemUpdate = new CONFIG.Item.documentClass(itemData, {parent: originActor});\n        const options = { showFullCard: false, createWorkflow: true, versatile: false, configureDialog: false, targetUuids: [token.document.uuid] };\n        let saveResult = await MidiQOL.completeItemUse(itemUpdate, {}, options);\n\n        if(saveResult.failedSaves.size === 0) {\n            await macroItem.delete();\n        }\n    }\n}`
                                }
                            }
                        }
                    }

                    await target.actor.createEmbeddedDocuments("Item", [itemData]);
                }
            }

            if(workflowType === "save") {
                let chatContent;
                const saveSetting = workflow.options.noOnUseMacro;
                workflow.options.noOnUseMacro = true;
                let saveDC = workflow.saveItem.system.save.dc;

                if(source && source === "user") reroll = await socket.executeAsUser("rollAsUser", browserUser.id, { rollParams: `1${hexDie}`, type: workflowType });
                if(source && source === "gm") reroll = await socket.executeAsGM("rollAsUser", { rollParams: `1${hexDie}`, type: workflowType });
                let rollFound = workflow.saveRolls.find(roll => roll.data.tokenUuid === returnedTokenUuid);
                let rollTotal = rollFound.total;
                let modifiedRoll = await new Roll(`${rollTotal} - ${reroll.total}`).evaluate();

                workflow.options.noOnUseMacro = saveSetting;

                if(modifiedRoll < saveDC) {
                    workflow.saves.delete(target);
                    workflow.failedSaves.add(target);

                    chatContent = `<span style='text-wrap: wrap;'>The creature was hexed and failed their save. <img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await helpers.replaceChatCard({actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: modifiedRoll});
                    return;
                }
                else {
                    chatContent = `<span style='text-wrap: wrap;'>The creature was hexed but still succeeded their save. <img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await helpers.replaceChatCard({actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: modifiedRoll});
                    continue;
                }
            }
            else if(workflowType === "attack") {
                let targetAC = workflow.hitTargets.first().actor.system.attributes.ac.value;
                const saveSetting = workflow.options.noOnUseMacro;
                workflow.options.noOnUseMacro = true;
                let reroll;
                if(source && source === "user") reroll = await socket.executeAsUser("rollAsUser", browserUser.id, { rollParams: `1${hexDie}`, type: workflowType });
                if(source && source === "gm") reroll = await socket.executeAsGM("rollAsUser", { rollParams: `1${hexDie}`, type: workflowType });
                let rerollNew = await new Roll(`${workflow.attackRoll.result} - ${reroll.total}`).roll();

                await workflow.setAttackRoll(rerollNew);
                workflow.options.noOnUseMacro = saveSetting;

                if(rerollNew.total < targetAC) {
                    chatContent = `<span style='text-wrap: wrap;'>The creature was hexed reducing their attack by ${reroll.total}, and were unable to hit their target. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await helpers.replaceChatCard({actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: rerollNew});
                    return;
                }
                else {
                    chatContent = `<span style='text-wrap: wrap;'>The creature was hexed reducing their attack by ${reroll.total}, but were still able to hit their target. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await helpers.replaceChatCard({actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: rerollNew});
                    continue;
                }
            }
        }
    }
}
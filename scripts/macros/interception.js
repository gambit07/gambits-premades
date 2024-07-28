export async function interception({workflowData,workflowType,workflowCombat}) {
    const module = await import('../module.js');
    const helpers = await import('../helpers.js');
    const socket = module.socket;
    const workflowUuid = workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowUuid);
    let itemName = "fighting style: interception";
    let itemProperName = "Interception";
    let dialogId = "interception";
    let target = workflow.hitTargets.first();
    if(!workflow) return;
    if(workflow.item.name.toLowerCase() === itemName) return;
    const actionTypes = ["mwak", "rwak", "msak", "rsak"];
    if (!actionTypes.some(type => workflow.item.system.actionType?.includes(type))) return;

    let findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: target, itemName: itemName, itemType: "item", itemChecked: ["mwak", "shield"], reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 5, dispositionCheck: true, dispositionCheckType: "enemyAlly", workflowType: workflowType, workflowCombat: workflowCombat});

    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        if (target.document.uuid === validTokenPrimary.document.uuid) continue;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        let chosenItem = validTokenPrimary.actor.items.find(i => i.name.toLowerCase() === itemName);
        browserUser = MidiQOL.playerForActor(validTokenPrimary.actor);
        if (!browserUser.active) {
            browserUser = game.users?.activeGM;
        }

        let damageTypes = workflow.damageRolls.map(roll => roll.options.type);
        let hasHealing = damageTypes.some(type => type === "healing");
        if (hasHealing) return;
        let damageTotals = workflow.damageRolls.map(roll => roll.total);
        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemProperName} Timeout`));

        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for a roll triggering ${itemProperName}.</span>`
        let chatData = {
        user: game.users.find(u => u.isGM).id,
        content: content,
        whisper: game.users.find(u => u.isGM).id
        };
        let notificationMessage = await MidiQOL.socket().executeAsGM("createChatMessage", { chatData });

        const rollDetailSetting = MidiQOL.safeGetGameSetting('midi-qol', 'ConfigSettings').hideRollDetails;
    
        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <p class="gps-dialog-paragraph">Would you like to use your reaction to initiate ${itemProperName} for this ${workflowType} roll?</p>
                        <div>
                            <div class="gps-dialog-flex">
                                <label for="damage-list" class="gps-dialog-label">Damage:</label>
                                <ul id="damage-list" class="sortable" style="padding: 0; margin: 0; list-style-type: none;">
                                    ${damageTypes.map((name, index) => `
                                    <li draggable="true" style="padding: 6px; margin-bottom: 4px; cursor: grab; border: 1px solid #ccc;">
                                        <span class="damage-type">${name}</span>${["none", "detailsDSN", "details", "d20Only", "hitDamage", "hitCriticalDamage"].includes(rollDetailSetting) ? ` - ${damageTotals[index]} pts` : ""}
                                    </li>`).join('')}
                                </ul>
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

        let result;

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
            let userDialogPromise = socket.executeAsUser("process3rdPartyReactionDialog", browserUser.id, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "user",type: "multiDialog"});
            
            let gmDialogPromise = socket.executeAsGM("process3rdPartyReactionDialog", {dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "gm",type: "multiDialog"});
        
            result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
        } else {
            result = await socket.executeAsUser("process3rdPartyReactionDialog", browserUser.id, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source:browserUser.isGM ? "gm" : "user",type:"singleDialog"});
        }
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, source, type } = result;

        if (!userDecision) {
            if(source === "gm" || type === "singleDialog") await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
            continue;
        }
        else if (userDecision) {
            await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });

            await helpers.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

            let primaryFile = "jb2a.spiritual_weapon.sword.spectral.orange";
            let alternateFile = "jb2a.icon.shield.yellow";

            let fileToPlay = Sequencer.Database.getEntry(primaryFile) ? primaryFile : Sequencer.Database.getEntry(alternateFile) ? alternateFile : "";

            new Sequence()
                .effect()
                .file(fileToPlay)
                .atLocation(validTokenPrimary)
                .moveTowards(target)
                .scaleToObject(2.0)
                .zIndex(0)
                .belowTokens(false)
                .fadeIn(250)
                .fadeOut(250)
                .play();

            const saveSetting = workflow.options.noOnUseMacro;
            workflow.options.noOnUseMacro = true;
            let actorProf = validTokenPrimary.actor.system.attributes.prof;
            let reroll;
            let numDice = '1d10';
            if(MidiQOL.safeGetGameSetting('gambits-premades', 'enableInterceptionCustomDice')) {
                let dieNumber = MidiQOL.safeGetGameSetting('gambits-premades', 'enableInterceptionCustomDiceNumber');
                let dieFace = MidiQOL.safeGetGameSetting('gambits-premades', 'enableInterceptionCustomDiceFace');
                numDice = `${dieNumber}d${dieFace}`;
            }

            if(source && source === "user") reroll = await socket.executeAsUser("rollAsUser", browserUser.id, { rollParams: `${numDice} + ${actorProf}`, type: workflowType });
            if(source && source === "gm") reroll = await socket.executeAsGM("rollAsUser", { rollParams: `${numDice} + ${actorProf}`, type: workflowType });

            let remainingReduction = reroll.total;
            let updatedRolls = [];
            let processedRolls = new Set();
            
            for (const priority of damageChosen) {
                let rollFound = workflow.damageRolls.find(roll => roll.options.type === priority);
            
                if (rollFound) {
                    processedRolls.add(rollFound);
                    let rollTotal = rollFound.total;
                    if (rollTotal >= remainingReduction) {
                        let modifiedRoll = await new Roll(`${rollTotal} - ${remainingReduction}`).evaluate({async: true});
                        modifiedRoll.options = rollFound.options;
                        updatedRolls.push(modifiedRoll);
                        remainingReduction = 0;
                        break;
                    } else {
                        remainingReduction -= rollTotal;
                        let zeroRoll = await new Roll(`${rollTotal} - ${rollTotal}`).evaluate({async: true});
                        zeroRoll.options = rollFound.options;
                        updatedRolls.push(zeroRoll);
                    }
                }
            }
            
            workflow.damageRolls.forEach(roll => {
                if (!processedRolls.has(roll)) {
                    updatedRolls.push(roll);
                }
            });

            await workflow.setDamageRolls(updatedRolls);
    
            workflow.options.noOnUseMacro = saveSetting;

            let content = `<span style='text-wrap: wrap;'>You use ${itemProperName} and reduce damage taken for ${target.actor.name} by ${reroll.total}. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
            let actorPlayer = MidiQOL.playerForActor(validTokenPrimary.actor);
            let chatData = {
            user: actorPlayer.id,
            speaker: ChatMessage.getSpeaker({ token: validTokenPrimary }),
            content: content
            };
            ChatMessage.create(chatData);
            continue;
        }
    }
}
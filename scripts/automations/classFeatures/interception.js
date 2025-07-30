export async function interception({workflowData,workflowType,workflowCombat}) {
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    const gpsUuid = "411b0d88-a483-4d85-97d9-2bd8dbd4ef70";
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Fighting Style: Interception";
    let dialogId = gpsUuid;
    let target = workflow.hitTargets.first();
    const actionTypes = ["mwak", "rwak", "msak", "rsak"];
    if (!actionTypes.some(type => workflow.activity?.actionType?.includes(type))) return;
    if (!target) return;
    let gmUser = game.gps.getPrimaryGM();
    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `Interception Timeout`));

    let findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: target, itemName: itemName, itemType: "item", itemChecked: ["mwak", "shield"], reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 5, dispositionCheck: true, dispositionCheckType: "enemyAlly", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});

    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        if (target.document.uuid === validTokenPrimary.document.uuid) continue;
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

        let damageTypes = workflow.damageRolls.map(roll => roll.options.type);
        let hasHealing = damageTypes.some(type => type === "healing");
        if (hasHealing) return;
        let damageTotals = workflow.damageRolls.map(roll => roll.total);

        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for a roll triggering ${itemProperName}.</span>`
        let chatData = { user: gmUser, content: content, roll: false, whisper: gmUser };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

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
                                        ${["none", "detailsDSN", "details", "d20Only", "hitDamage", "hitCriticalDamage"].includes(rollDetailSetting) ? `${damageTotals[index]} pts of ` : ""}<span class="damage-type">${name}</span>
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

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "user",type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
            
            let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "gm",type: "multiDialog", notificationId: notificationMessage._id };
        
            result = await game.gps.socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
        } else {
            result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
        }
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, source, type } = result || {};

        if (!userDecision) {
            continue;
        }
        else if (userDecision) {
            await game.gps.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

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

            const saveSetting = workflow.workflowOptions.noOnUseMacro;
            workflow.workflowOptions.noOnUseMacro = true;
            let actorProf = validTokenPrimary.actor.system.attributes.prof;
            let reroll;
            let numDice = '1d10';
            let cprConfig = game.gps.getCprConfig({itemUuid: chosenItem.uuid, type: "homebrewDice"});
            if(cprConfig.homebrewDiceEnabled) {
                let dieNumber = cprConfig.dieNumber;
                let dieFace = cprConfig.dieFace;
                numDice = `${dieNumber}${dieFace}`;
            }

            if(source && source === "user") reroll = await game.gps.socket.executeAsUser("rollAsUser", browserUser, { rollParams: `${numDice} + ${actorProf}`, type: workflowType });
            if(source && source === "gm") reroll = await game.gps.socket.executeAsUser("rollAsUser", gmUser, { rollParams: `${numDice} + ${actorProf}`, type: workflowType });

            let remainingReduction = reroll.total;
            let updatedRolls = [];
            let processedRolls = new Set();
            
            for (const priority of damageChosen) {
                let rollFound = workflow.damageRolls.find(roll => roll.options.type === priority);
            
                if (rollFound) {
                    processedRolls.add(rollFound);
                    let rollTotal = rollFound.total;
                    if (rollTotal >= remainingReduction) {
                        let modifiedRoll = await new Roll(`${rollTotal} - ${remainingReduction}`).evaluate();
                        modifiedRoll.options = rollFound.options;
                        updatedRolls.push(modifiedRoll);
                        remainingReduction = 0;
                        break;
                    } else {
                        remainingReduction -= rollTotal;
                        let zeroRoll = await new Roll(`${rollTotal} - ${rollTotal}`).evaluate();
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
    
            workflow.workflowOptions.noOnUseMacro = saveSetting;

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
export async function instinctiveCharm({workflowData,workflowType,workflowCombat}) {
    const module = await import('../module.js');
    const socket = module.socket;
    const helpers = await import('../helpers.js');
    const workflowUuid = workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowUuid);
    let itemName = "instinctive charm";
    let itemProperName = "Instinctive Charm";
    let dialogId = "instinctivecharm";
    if(!workflow) return;
    if(workflow.item.name === itemProperName) return;
    let target = workflow.token;
    if(target.actor.system.traits.ci.value.has("charmed")) return;
    if(target.actor.appliedEffects.some(e => e.name === `${itemProperName} - Immunity`)) return;

    let findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: null, itemChecked: null, reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 30, dispositionCheck: false, dispositionCheckType: null, workflowType: workflowType, workflowCombat: workflowCombat});
    
    let browserUser;
    
    for (const validTokenPrimary of findValidTokens) {
        let targets = canvas.tokens.placeables.filter(t => t.document.uuid !== validTokenPrimary.document.uuid && t.document.uuid !== target.document.uuid && MidiQOL.canSee(target, t) && MidiQOL.computeDistance(target, t, true) <= workflow.item.system.range.value);

        if(targets.length === 0) {
            if(debugEnabled) console.error(`${itemName} for ${t.actor.name} failed at alternate target within range`);
            return;
        }
    
        const targetUuids = targets.map(t => t.document.uuid);
        const targetNames = targets.map(t => t.document.name);

        targetUuids.map((uuid, index) => 
            `<option value="${uuid}">${targetNames[index]}</option>`
        ).join('');
        
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        let chosenItem = validTokenPrimary.actor.items.find(i => i.name === itemProperName);
        browserUser = MidiQOL.playerForActor(validTokenPrimary.actor);
        if (!browserUser.active) browserUser = game.users?.activeGM;

        const optionBackground = (document.body.classList.contains("theme-dark")) ? 'black' : 'var(--color-bg)';
        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemProperName} Timeout`));

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">Would you like to use ${itemProperName} to try and force the attacker to choose a different target?</p>
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
        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has an option available for an attack triggering ${itemProperName}.</span>`
        let chatData = {
        user: game.users.find(u => u.isGM).id,
        content: content,
        whisper: game.users.find(u => u.isGM).id
        };
        let notificationMessage = await MidiQOL.socket().executeAsGM("createChatMessage", { chatData });

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
            chosenItem.prepareData();

            const options = {
                showFullCard: false,
                createWorkflow: true,
                versatile: false,
                configureDialog: true,
                targetUuids: [target.document.uuid],
            };

            let itemRoll;
            if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser?.id, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });
            else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsGM("completeItemUse", { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });

            if(itemRoll.aborted === true) continue;

            let dialogIdTarget = "instinctivecharmtarget";
            let browserUserTarget = MidiQOL.playerForActor(target.actor);
            if (!browserUserTarget.active) browserUserTarget = game.users?.activeGM;

            const spellDC = validTokenPrimary.actor.system.attributes.spelldc;
            let saveAbility = "wis";

            const itemData = {
                name: `${itemProperName} Save`,
                type: "feat",
                img: chosenItem.img,
                effects: [],
                flags: {
                    "midi-qol": {
                        noProvokeReaction: true,
                        onUseMacroName: null,
                        forceCEOff: true
                    },
                    "midiProperties": {
                        magiceffect: true
                    },
                    "autoanimations": {
                        killAnim: true
                    }

                },
                system: {
                    equipped: true,
                    actionType: "save",
                    save: { dc: spellDC, ability: saveAbility, scaling: "flat" },
                    components: { concentration: false, material: false, ritual: false, somatic: false, value: "", vocal: false },
                    duration: { units: "inst", value: undefined }
                },
            };
            const itemUpdateTarget = new CONFIG.Item.documentClass(itemData, {parent: validTokenPrimary.actor});
            const optionsTarget = { showFullCard: false, createWorkflow: true, versatile: false, configureDialog: false, targetUuids: [target.document.uuid], workflowOptions: {autoRollDamage: 'always', autoFastDamage: true} };
            const saveResult = await MidiQOL.completeItemUse(itemUpdateTarget, {}, optionsTarget);
            if (saveResult.failedSaves.size !== 0) {
                let dialogContentTarget = `
                    <div class="gps-dialog-container">
                        <div class="gps-dialog-section">
                            <div class="gps-dialog-content">
                                <p class="gps-dialog-paragraph">${itemProperName} has forced you to select a new target for your attack. Choose from the list below.</p>
                                <div>
                                    <div class="gps-dialog-flex">
                                        <label for="enemy-token" class="gps-dialog-label">Target:</label>
                                        <select id="enemy-token" class="gps-dialog-select">
                                            ${targetNames.map((name, index) => `<option class="gps-dialog-option" style="background-color: ${optionBackground};" value="${targetUuids[index]}">${name}</option>`).join('')}
                                        </select>
                                        <div id="image-container" class="gps-dialog-image-container">
                                            <img id="img_${dialogIdTarget}" src="${chosenItem.img}" class="gps-dialog-image">
                                        </div>
                                    </div>
                                    <div class="gps-dialog-flex">
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="gps-dialog-button-container">
                            <button id="pauseButton_${dialogIdTarget}" type="button" class="gps-dialog-button">
                                <i class="fas fa-pause" id="pauseIcon_${dialogIdTarget}" style="margin-right: 5px;"></i>Pause
                            </button>
                        </div>
                    </div>
                `;

                let resultTarget;
        
                if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUserTarget.id !== game.users?.activeGM.id) {
                    let userDialogPromise = socket.executeAsUser("process3rdPartyReactionDialog", browserUserTarget.id, {dialogTitle:dialogTitlePrimary,dialogContent: dialogContentTarget,dialogId: dialogIdTarget,initialTimeLeft,validTokenPrimaryUuid: target.document.uuid,source: "user",type: "multiDialog"});
                    
                    let gmDialogPromise = socket.executeAsGM("process3rdPartyReactionDialog", {dialogTitle:dialogTitleGM,dialogContent: dialogContentTarget,dialogId: dialogIdTarget,initialTimeLeft,validTokenPrimaryUuid: target.document.uuid,source: "gm",type: "multiDialog"});
                
                    resultTarget = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
                } else {
                    resultTarget = await socket.executeAsUser("process3rdPartyReactionDialog", browserUserTarget.id, {dialogTitle:dialogTitlePrimary,dialogContent: dialogContentTarget,dialogId: dialogIdTarget,initialTimeLeft,validTokenPrimaryUuid: target.document.uuid,source:browserUserTarget.isGM ? "gm" : "user",type:"singleDialog"});
                }
        
                const { enemyTokenUuid } = resultTarget;

                let newTarget = await fromUuid(enemyTokenUuid);
                workflow.targets.delete(validTokenPrimary);
                workflow.targets.add(newTarget.object);
                return;
            }
            else {
                let effectData = [
                    {
                        "icon": `${chosenItem.img}`,
                        "origin": `${validTokenPrimary.actor.uuid}`,
                        "disabled": false,
                        "name": `${chosenItem.name} - Immunity`,
                        "transfer": false,
                        "flags": {
                            "dae": {
                                "specialDuration": [
                                    "longRest"
                                ]
                            }
                        }
                    }
                ];
                await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: target.actor.uuid, effects: effectData });

                continue;
            }
        }
    }
}
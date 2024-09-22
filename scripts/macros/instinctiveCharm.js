export async function instinctiveCharm({workflowData,workflowType,workflowCombat}) {
    const module = await import('../module.js');
    const socket = module.socket;
    const helpers = await import('../helpers.js');
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    const gpsUuid = "b9a797f2-3262-4a89-9b32-d8482a0c5f29";
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Instinctive Charm";
    let dialogId = gpsUuid;
    let target = workflow.token;
    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    let gmUser = helpers.getPrimaryGM();

    let findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: null, itemChecked: null, reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 30, dispositionCheck: false, dispositionCheckType: null, workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});
    
    let browserUser;
    
    for (const validTokenPrimary of findValidTokens) {
        let targets = canvas.tokens.placeables.filter(t => t.document.uuid !== validTokenPrimary.document.uuid && t.document.uuid !== target.document.uuid && MidiQOL.canSee(target, t) && MidiQOL.computeDistance(target, t, true) <= workflow.item.system.range.value);

        if(targets.length === 0) {
            if(debugEnabled) console.error(`${itemName} for ${validTokenPrimary.actor.name} failed at alternate target within range`);
            return;
        }
    
        const targetUuids = targets.map(t => t.document.uuid);
        const targetNames = targets.map(t => t.document.name);

        targetUuids.map((uuid, index) => 
            `<option value="${uuid}">${targetNames[index]}</option>`
        ).join('');
        
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        if(target.actor.appliedEffects.some(e => e.name === `${itemProperName} - Immunity`)) return;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        browserUser = helpers.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

        const optionBackground = (document.body.classList.contains("theme-dark")) ? 'black' : 'var(--color-bg)';
        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));

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

        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has an option available for an attack triggering ${itemProperName}.</span>`
        let chatData = { user: gmUser, content: content, roll: false, whisper: gmUser };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

        let result;

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "user",type: "multiDialog", browserUser: browserUser.id, notificationId: notificationMessage._id };
            
            let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "gm",type: "multiDialog", notificationId: notificationMessage._id };
        
            result = await socket.executeAsGM("handleDialogPromises", userDialogArgs, gmDialogArgs);
        } else {
            result = await socket.executeAsUser("process3rdPartyReactionDialog", browserUser.id, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
        }

        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, source, type } = result;

        if (!userDecision) {
            continue;
        }
        else if (userDecision) {
            chosenItem.prepareData();
            chosenItem.prepareFinalAttributes();
            chosenItem.applyActiveEffects();

            const options = {
                showFullCard: false,
                createWorkflow: true,
                versatile: false,
                configureDialog: true,
                targetUuids: [target.document.uuid],
            };

            let itemRoll;
            if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });
            else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", gmUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });

            if(itemRoll.aborted === true) continue;

            await helpers.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

            let dialogIdTarget = "instinctivecharmtarget";
            let browserUserTarget = helpers.getBrowserUser({ actorUuid: target.actor.uuid });

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
            const hasCharmImmunity = target.actor.system.traits.ci.value.has("charmed");
            if (saveResult.failedSaves.size !== 0 && !hasCharmImmunity) {
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
        
                if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUserTarget !== gmUser) {
                    let userDialogArgsTarget = { dialogTitle:dialogTitlePrimary,dialogContent: dialogContentTarget,dialogId: dialogIdTarget,initialTimeLeft,validTokenPrimaryUuid: target.document.uuid,source: "user",type: "multiDialog", browserUser: browserUserTarget, notificationId: notificationMessage._id };
                    
                    let gmDialogArgsTarget = { dialogTitle:dialogTitleGM,dialogContent: dialogContentTarget,dialogId: dialogIdTarget,initialTimeLeft,validTokenPrimaryUuid: target.document.uuid,source: "gm",type: "multiDialog", notificationId: notificationMessage._id };
                
                    resultTarget = await socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgsTarget, gmDialogArgsTarget});
                } else {
                    resultTarget = await socket.executeAsUser("process3rdPartyReactionDialog", browserUserTarget.id, {dialogTitle:dialogTitlePrimary,dialogContent: dialogContentTarget,dialogId: dialogIdTarget,initialTimeLeft,validTokenPrimaryUuid: target.document.uuid,source: gmUser === browserUserTarget ? "gm" : "user",type:"singleDialog"});
                }
        
                const { enemyTokenUuid } = resultTarget;

                let newTarget = await fromUuid(enemyTokenUuid);
                workflow.targets.delete(validTokenPrimary);
                workflow.targets.add(newTarget.object);
                return;
            }
            else {
                if(hasCharmImmunity) ui.notifications.warn("The creature is unaffected because they have Charm Immunity");
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
                await MidiQOL.socket().executeAsUser("createEffects", gmUser, { actorUuid: target.actor.uuid, effects: effectData });

                continue;
            }
        }
    }
}
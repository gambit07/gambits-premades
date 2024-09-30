export async function rainOfCinders({workflowData,workflowType,workflowCombat}) {
    const module = await import('../module.js');
    const helpers = await import('../helpers.js');
    const socket = module.socket;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    const gpsUuid = "a95f3926-ba77-45ab-90d9-c0cf3cca10aa";
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Rain of Cinders";
    let dialogId = gspUuid;
    let target = workflow.targets.first();
    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    let gmUser = helpers.getPrimaryGM();

    if(workflow.targets.size > 1) return;

    let findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: target, itemName: itemName, itemType: "feature", itemChecked: ["drawing the hearth"], reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});

    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        if(!validTokenPrimary.actor.appliedEffects.some(e => e.name === "Drawing the Hearth")) {
            if(debugEnabled) console.error(`${itemName} for ${validTokenPrimary.actor.name} failed at parent effect active`);
            continue;
        }
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        let baseItem = validTokenPrimary.actor.items.find(i => i.name === "Drawing the Hearth");
        browserUser = helpers.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">${target.actor.name} has been attacked, would you like to initiate ${itemProperName} to use a Hearth Spirit to try and disrupt it?</p>
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

        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for an attack triggering ${itemProperName}.</span>`
        let chatData = { user: gmUser, content: content, roll: false, whisper: gmUser };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "user",type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
            
            let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "gm",type: "multiDialog", notificationId: notificationMessage._id };
        
            result = await socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
        } else {
            result = await socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
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
                targetUuids: [workflow.token.document.uuid]
            };

            let itemRoll;
            if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });
            else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", gmUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });
            if(itemRoll.aborted === true) continue;

            await helpers.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

            const spellDC = validTokenPrimary.actor.system.attributes.spelldc;
            let saveAbility = "cha";

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
            const optionsTarget = { showFullCard: false, createWorkflow: true, versatile: false, configureDialog: false, targetUuids: [workflow.token.document.uuid], workflowOptions: {autoRollDamage: 'always', autoFastDamage: true} };
            const saveResult = await MidiQOL.completeItemUse(itemUpdateTarget, {}, optionsTarget);

            if (saveResult.failedSaves.size !== 0) {
                let itemUses = baseItem.system.uses.value;
                let attackTotal = workflow.attackTotal;
                let spiritAC = 10 + validTokenPrimary.actor.system.attributes.prof;
                if(attackTotal >= spiritAC) {
                    let highestIndex = -1;

                    for (let i = 0; i < itemUses; i++) {
                        const effects = Sequencer.EffectManager.getEffects({name: `DrawingTheHearth_${validTokenPrimary.actor.id}_${i}`, source: validTokenPrimary});
                        if (effects.length > 0) {
                            highestIndex = i;
                        }
                    }

                    if (highestIndex !== -1) {
                        Sequencer.EffectManager.endEffects({name: `DrawingTheHearth_${validTokenPrimary.actor.id}_${highestIndex}`, source: validTokenPrimary});

                        new Sequence()
                        .effect()
                            .atLocation(validTokenPrimary)
                            .file("animated-spell-effects-cartoon.fire.ball.05")
                            .fadeIn(100)
                            .fadeOut(100)
                            .moveTowards(target)
                            .scaleToObject(0.4)
                            .filter("ColorMatrix", { hue: 60 })
                            .waitUntilFinished()
                        .effect()
                            .atLocation(target)
                            .file("animated-spell-effects-cartoon.fire.10")
                            .fadeIn(100)
                            .fadeOut(100)
                            .scaleToObject(1.5)
                            .filter("ColorMatrix", { hue: 60 })
                        .play();
                    }

                    await baseItem.update({"system.uses.value" : itemUses - 1})
                    let content = `The creature attacks one of your soot spirits and hits! You have ${itemUses - 1} soot spirits remaining.`
                    let actorPlayer = MidiQOL.playerForActor(validTokenPrimary.actor);
                    let chatData = {
                        user: actorPlayer.id,
                        speaker: ChatMessage.getSpeaker({ token: validTokenPrimary }),
                        content: content
                    };
                    ChatMessage.create(chatData);
                    workflow.aborted = true;

                    if((itemUses - 1) === 0) {
                        let effectData = actor.appliedEffects.find(e => e.name === "Drawing the Hearth");
                        if(effectData) {
                            await effectData.delete();
                        }
                    }
                }
                else {
                    new Sequence()
                    .effect()
                        .atLocation(validTokenPrimary)
                        .file("animated-spell-effects-cartoon.fire.ball.05")
                        .fadeIn(100)
                        .fadeOut(100)
                        .moveTowards(target)
                        .scaleToObject(0.4)
                        .filter("ColorMatrix", { hue: 60 })
                        .waitUntilFinished()
                    .effect()
                        .atLocation(target)
                        .file("animated-spell-effects-cartoon.fire.ball.05")
                        .fadeIn(100)
                        .fadeOut(100)
                        .moveTowards(validTokenPrimary)
                        .scaleToObject(0.4)
                        .filter("ColorMatrix", { hue: 60 })
                        .waitUntilFinished()
                    .play();


                    let content = `The creature attacks one of your soot spirits and misses! You have ${itemUses} soot spirits remaining.`
                    let actorPlayer = MidiQOL.playerForActor(validTokenPrimary.actor);
                    let chatData = {
                        user: actorPlayer.id,
                        speaker: ChatMessage.getSpeaker({ token: validTokenPrimary }),
                        content: content
                    };
                    ChatMessage.create(chatData);
                    workflow.aborted = true;            
                }
            }
        }
    }
}
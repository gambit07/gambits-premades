export async function poetryInMisery({workflowData,workflowType,workflowCombat}) {
    const module = await import('../module.js');
    const helpers = await import('../helpers.js');
    const socket = module.socket;
    const workflowUuid = workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowUuid) ?? null;
    let itemName = "poetry in misery";
    let itemProperName = "Poetry in Misery";
    let dialogId = "poetryinmisery";
    if(!workflow && workflowCombat === true) return;
    if(workflow?.item?.name.toLowerCase() === itemName) return;
    let initiatingToken;
    (workflow) ? initiatingToken = workflow.token : initiatingToken = await MidiQOL.tokenForActor(workflowData.actor.uuid);

    let findValidTokens = helpers.findValidTokens({initiatingToken: initiatingToken, targetedToken: initiatingToken, itemName: itemName, itemType: null, itemChecked: null, reactionCheck: true, sightCheck: false, rangeCheck: true, rangeTotal: 30, dispositionCheck: true, dispositionCheckType: "ally", workflowType: workflowType, workflowCombat: workflowCombat});

    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        const itemData = validTokenPrimary.actor.items.find(i => i.name.toLowerCase() === "bardic inspiration");
        const resources = ['primary', 'secondary', 'tertiary'];
        let resourceKey = resources.find(key => {
            let resource = validTokenPrimary.actor.system.resources[key];
            return resource?.label?.toLowerCase() === "bardic inspiration";
        });

        if(resourceKey) {
            if(validTokenPrimary.actor.system.resources[resourceKey].value === validTokenPrimary.actor.system.resources[resourceKey].max) continue;
        }
        else if(itemData) {
            if(itemData.system.uses.value === itemData.system.uses.max) continue;
        }
        else continue;

        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        let chosenItem = validTokenPrimary.actor.items.find(i => i.name === itemProperName);
        browserUser = MidiQOL.playerForActor(validTokenPrimary.actor);
        let chatActor;
        if (!browserUser.active) {
            browserUser = game.users?.activeGM;
        }
        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemProperName} Timeout`));

        if (workflowType === "attack") {
            if(initiatingToken.document.disposition !== validTokenPrimary.document.disposition) continue;
            if(!workflow.attackRoll.isFumble) return;
        }
        if (workflowType === "save") {
            if(workflow) {
                if(initiatingToken.document.disposition === validTokenPrimary.document.disposition) continue;
                const fumbleRoll = workflow.saveRolls.find(roll => roll.isFumble && roll.data.token.document.disposition === validTokenPrimary.document.disposition);
                if(!fumbleRoll) return;
                chatActor = fumbleRoll.data.token.actor;
            }
            else {
                if(initiatingToken.document.disposition !== validTokenPrimary.document.disposition) continue;
                if(!workflowData.roll.isFumble) return;
                chatActor = initiatingToken.actor;
            }
        }
        if(workflowType === "ability" || workflowType === "skill") {
            if(initiatingToken.document.disposition !== validTokenPrimary.document.disposition) continue;
            if(!workflowData.roll.isFumble) return;
        }

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">Would you like to use your reaction to initiate ${itemProperName} for this nat 1 ${workflowType} roll?</p>
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
        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for a roll triggering ${itemProperName}.</span>`
        let chatData = {
        user: game.users.find(u => u.isGM).id,
        content: content,
        whisper: game.users.find(u => u.isGM).id
        };
        let notificationMessage = await MidiQOL.socket().executeAsGM("createChatMessage", { chatData });

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
            let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "user",type: "multiDialog", browserUser: browserUser.id };
            
            let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "gm",type: "multiDialog" };
        
            result = await socket.executeAsGM("handleDialogPromises", userDialogArgs, gmDialogArgs);
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

            if (resourceKey) {
                let updatePath = `system.resources.${resourceKey}.value`;
                await validTokenPrimary.actor.update({ [updatePath]: validTokenPrimary.actor.system.resources[resourceKey].value + 1 });
            }

            else if(itemData) {
                await itemData.update({ 'system.uses.value' : itemData.system.uses.value + 1 })
            }

            let typeText = (workflowType === "attack") ? `${initiatingToken.actor.name}'s nat 1 attack roll` : (workflowType === "ability") ? `${initiatingToken.actor.name}'s nat 1 ability check` : (workflowType === "skill") ? `${initiatingToken.actor.name}'s nat 1 skill check` : `${chatActor.name}'s nat 1 saving throw`;

            let contentOutcome = `<span style='text-wrap: wrap;'>You use ${itemProperName} to soliloquize over ${typeText} and regain a use of Bardic Inspiration.<br/><img src="${initiatingToken.actor.img}" width="30" height="30" style="border:0px"></span>`;
            let actorPlayer = MidiQOL.playerForActor(validTokenPrimary.actor);
            let chatDataOutcome = {
            user: actorPlayer.id,
            speaker: ChatMessage.getSpeaker({ token: validTokenPrimary }),
            content: contentOutcome
            };
            ChatMessage.create(chatDataOutcome);
            continue;
        }
    }
}
export async function giftOfTheGemDragon({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "isDamaged") {
        if(MidiQOL.hasUsedReaction(actor)) return;
        if(MidiQOL.checkIncapacitated(token)) return;

        let rangeTotal = 10;         
        let measuredDistance = MidiQOL.computeDistance(token, workflow.token, {wallsBlock: true, includeCover: true});
        let range = game.gps.convertFromFeet({range: rangeTotal});
        if (measuredDistance === -1 || (measuredDistance > range)) return;
        item = actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "74c49d3c-dfcd-49d3-9070-0c663167cb51");
        let activity = item.system.activities.find(a => a.identifier === "syntheticSave");

        if(!activity.save?.dc?.calculation && !activity.save?.dc?.formula) {
            await foundry.applications.api.DialogV2.wait({
                window: { title: 'Gift of the Gem Dragon Ability' },
                content: `
                    <div class="gps-dialog-container">
                        <div class="gps-dialog-section">
                            <div class="gps-dialog-content">
                                <div>
                                    <div class="gps-dialog-flex">
                                        <p class="gps-dialog-paragraph">Which ability score did you increase with Gift of the Gem Dragon?</p>
                                        <div id="image-container" class="gps-dialog-image-container">
                                            <img src="${item.img}" class="gps-dialog-image">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `,
                buttons: [{
                    action: "Intelligence",
                    label: "Intelligence",
                    callback: async (event, button, dialog) => {
                        await activity.update({"save.dc.calculation": "int"});
                    }
                },
                {
                    action: "Wisdom",
                    label: "Wisdom",
                    callback: async (event, button, dialog) => {
                        await activity.update({"save.dc.calculation": "wis"});
                    }
                },
                {
                    action: "Charisma",
                    label: "Charisma",
                    callback: async (event, button, dialog) => {
                        await activity.update({"save.dc.calculation": "cha"});
                    }
                }],
                close: async (event, dialog) => {
                    return;
                }, rejectClose:false
            });
        }

        let initialTimeLeft = 15;
        let dialogId = "giftofthegemdragon";
        const dialogTitlePrimary = `${actor.name} | ${item.name}`;
        const dialogTitleGM = `Waiting for ${actor.name}'s selection | ${item.name}`;

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">You have been damaged, would you like use your reaction to initiate <b>Telekinetic Reprisal</b> to damage and potentially push the attacker?</p>
                                <div id="image-container" class="gps-dialog-image-container">
                                    <img id="img_${dialogId}" src="${item.img}" class="gps-dialog-image">
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
        let browserUser = game.gps.getBrowserUser({ actorUuid: actor.uuid });
        let gmUser = game.gps.getPrimaryGM();

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft, validTokenPrimaryUuid: token.document.uuid, source: "user", type: "multiDialog", browserUser: browserUser };
            
            let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid, source: "gm", type: "multiDialog" };

            result = await game.gps.socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
        } else {
            result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid, source: gmUser === browserUser ? "gm" : "user", type: "singleDialog"});
        }
                
        const { userDecision, source, type } = result;

        if (!userDecision) {
            return;
        }
        else if (userDecision) {
            const saveResult = await game.gps.gpsActivityUse({itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: workflow.token.document.uuid});

            await game.gps.addReaction({actorUuid: `${actor.uuid}`});

            if(saveResult.failedSaves.size !== 0) {
                await game.gps.socket.executeAsGM("moveTokenByOriginPoint", {originX: token.center.x, originY: token.center.y, targetUuid: workflow.token.document.uuid, distance: 10 });
            }
        }
    }
}
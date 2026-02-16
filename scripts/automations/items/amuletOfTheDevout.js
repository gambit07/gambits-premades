export async function amuletOfTheDevout({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(item.system.uses.spent >= item.system.uses.max) {
        workflow.aborted = true;
        return ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Items.AmuletOfTheDevout.NoAmuletCharges"));
    }

    let itemExistsWithValue = actor.items.find(i => i.identifier === "channel-divinity" && i.system.uses.spent !== 0);


    if (!itemExistsWithValue) {
        workflow.aborted = true;
        return ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Items.AmuletOfTheDevout.NoChannelDivinityCharges"));
    }

    let dialogId = "amuletofthedevout";
    let dialogTitlePrimary = `${token.actor.name} | ${item.name}`;
    let browserUser = game.gps.getBrowserUser({ actorUuid: actor.uuid });
    let gmUser = game.gps.getPrimaryGM();

    let dialogContent = `
        <div class="gps-dialog-container">
            <div class="gps-dialog-section">
                <div class="gps-dialog-content">
                    <div>
                        <div class="gps-dialog-flex">
                            <p class="gps-dialog-paragraph">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.Items.AmuletOfTheDevout.Prompt")}</p>
                            <div id="image-container" class="gps-dialog-image-container">
                                <img id="img_${dialogId}" src="${item.img}" class="gps-dialog-image">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="gps-dialog-button-container">
                <button id="pauseButton_${dialogId}" type="button" class="gps-dialog-button">
                    <i class="fas fa-pause" id="pauseIcon_${dialogId}" style="margin-right: 5px;"></i>${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Pause")}
                </button>
            </div>
        </div>
    `;

    let result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft: 30,validTokenPrimaryUuid: token.document.uuid,source:gmUser === browserUser ? "gm" : "user",type:"singleDialog"});
        
    const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result || {};

    if (!userDecision) {
        return;
    }
    else if (userDecision) {
        if(itemExistsWithValue) {
            let currentValue = itemExistsWithValue.system.uses.spent;
            await itemExistsWithValue.update({ "system.uses.spent": currentValue - 1 });
            await item.update({ "system.uses.spent": item.system.uses.spent + 1 });
        }
        ui.notifications.info(game.i18n.localize("GAMBITSPREMADES.Notifications.Items.AmuletOfTheDevout.Recovered"));
    }
}
export async function amuletOfTheDevout({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(item.system.uses.spent >= item.system.uses.max) {
        workflow.aborted = true;
        return ui.notifications.warn("You have no Amulet of the Devout charges to use.");
    }
    const itemNames = ["channel divinity"];

    let itemExistsWithValue = actor.items.find(i => itemNames.includes(i.name.toLowerCase()) && i.system.uses.spent !== 0);


    if (!itemExistsWithValue) {
        workflow.aborted = true;
        return ui.notifications.warn("You have no Channel Divinity charges to recover.");
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
                            <p class="gps-dialog-paragraph">Would you like to recover a Channel Divinity charge?</p>
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

    let result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft: 30,validTokenPrimaryUuid: token.document.uuid,source:gmUser === browserUser ? "gm" : "user",type:"singleDialog"});
        
    const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result;

    if (!userDecision) {
        return;
    }
    else if (userDecision) {
        if(itemExistsWithValue) {
            let currentValue = itemExistsWithValue.system.uses.spent;
            await itemExistsWithValue.update({ "system.uses.spent": currentValue - 1 });
            await item.update({ "system.uses.spent": item.system.uses.spent + 1 });
        }
        ui.notifications.info("Channel Divinity charge recovered!");
    }
}
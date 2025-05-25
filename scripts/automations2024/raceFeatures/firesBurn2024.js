export async function firesBurn2024({ speaker, actor, token, character, item, args, scope, workflow, options, rolledItem, rolledActivity, macroItem }) {
    if(args[0].macroPass === "postDamageRollComplete") {
        if(!workflow.activity.hasAttack) return;
        macroItem = actor.items.find(i => i.system.identifier === macroItem.system.identifier);
        let itemName = macroItem.name;
        let target = workflow.hitTargets.first();
        if(!target) return;
        let itemUses = macroItem.system.uses.spent;
        let itemUsesRemaining = macroItem.system.uses.max - itemUses;
        if(itemUsesRemaining === 0) return;

        let dialogId = "e4bed97c-3e72-4f3a-b3f6-916d5e87d0de";
        let dialogTitleGM = `Waiting for ${token.actor.name}'s selection | ${itemName}`;
        let dialogTitlePrimary = `${token.actor.name} | ${itemName}`;
        let browserUser = game.gps.getBrowserUser({ actorUuid: actor.uuid });
        let result;
        let initialTimeLeft = 15;
        let gmUser = game.gps.getPrimaryGM();

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">Would you like to deal additional damage using ${itemName}?</p>
                                <div id="image-container" class="gps-dialog-image-container">
                                    <img id="img_${dialogId}" src="${macroItem.img}" class="gps-dialog-image">
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
        
        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid,source: "user",type: "multiDialog", browserUser: browserUser };
            
            let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid,source: "gm",type: "multiDialog" };
        
            result = await game.gps.socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
        } else {
            result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid,source:gmUser === browserUser ? "gm" : "user",type:"singleDialog"});
        }
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result;

        if (!userDecision) {
            return;
        }
        else if (userDecision) {
            if(source && source === "user") await game.gps.socket.executeAsUser("gpsActivityUse", browserUser, {itemUuid: macroItem.uuid, identifier: "syntheticDamage", targetUuid: target.document.uuid});
            else if(source && source === "gm") await game.gps.socket.executeAsUser("gpsActivityUse", gmUser, {itemUuid: macroItem.uuid, identifier: "syntheticDamage", targetUuid: target.document.uuid});
        }
    }
}
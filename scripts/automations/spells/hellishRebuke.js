export async function hellishRebuke({ speaker, actor, token, character, item, args, scope, workflow, options, rolledItem, rolledActivity, macroItem }) {
    if(args[0].macroPass === "isDamaged") {
        let gpsUuid = "999b21b1-cd4a-45b3-b9e9-c9406a74b3fd";
        item = await actor?.items?.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemName = item.name;
        let target = workflow.token;
        let itemType = item.system.uses.max;
        (itemType !== "") ? itemType = "feature" : itemType = "spell";
        
        let findValidToken = game.gps.findValidToken({initiatingTokenUuid: target.document.uuid, targetedTokenUuid: token.document.uuid, itemName: itemName, itemType: itemType, itemChecked: null, reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: "attack", workflowCombat: "true", gpsUuid: gpsUuid});

        if(!findValidToken) return;

        let dialogId = gpsUuid;
        let dialogTitleGM = `Waiting for ${token.actor.name}'s selection | ${item.name}`;
        let dialogTitlePrimary = `${token.actor.name} | ${item.name}`;
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
                                <p class="gps-dialog-paragraph">Would you like to use your reaction to initiate Hellish Rebuke on the creature who damaged you?</p>
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
            await game.gps.gpsActivityUse({itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: target.document.uuid});

            let cprConfig = game.gps.getCprConfig({itemUuid: item.uuid});
            const { animEnabled } = cprConfig;
            if(animEnabled) {
                new Sequence()
                .effect()
                    .file("jaamod.misc.hell_portal")
                    .fadeIn(500)
                    .fadeOut(500)
                    .atLocation(target, {offset:{x: 0, y: 50}})
                    .scaleToObject(2)
                    .belowTokens()
                .play()
                
                new Sequence()
                .effect()
                    .file("jb2a.energy_strands.overlay.dark_red.01")
                    .fadeIn(500)
                    .fadeOut(500)
                    .atLocation(target)
                    .scaleToObject(1.5)
                    .filter("ColorMatrix", { brightness: .8, saturate:5})
                .play()
            }
        }
    }
}
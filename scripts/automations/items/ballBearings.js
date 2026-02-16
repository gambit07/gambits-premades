export async function ballBearings({tokenUuid, regionUuid, regionScenario, originX, originY, regionStatus, speaker, actor, character, item, args, scope, workflow, options}) {
    let gmUser = game.gps.getPrimaryGM();

    if(args?.[0]?.macroPass === "templatePlaced") {
        await actor.setFlag("gambits-premades", "ballBearingTemplateUuid", workflow.templateUuid);
        let cprConfig = game.gps.getCprConfig({itemUuid: workflow.item.uuid});
        const { animEnabled } = cprConfig;
        if(animEnabled) {
            const template = await fromUuid(workflow.templateUuid);
            game.gps.animation.ballBearings({template, itemUuid: workflow.item.uuid});
        }
    }

    if(!tokenUuid || !regionUuid || !regionScenario) return;

    if(game.user.id !== userId) return;

    let tokenDocument = await fromUuid(tokenUuid);
    let token = tokenDocument?.object;
    
    if (!MidiQOL.isTargetable(token)) return;

    if ((token.actor.type !== 'npc' && token.actor.type !== 'character')) return;

    let resumeMovement = await tokenDocument?.pauseMovement();

    let region = await fromUuid(regionUuid);
    let chosenItem = await fromUuid(region.flags["region-attacher"].itemUuid);
    let itemProperName = chosenItem.name;
    let dialogId = "ballbearings";
    let dialogTitlePrimary = `${token.actor.name} | ${itemProperName}`;

    let dialogContent = `
        <div class="gps-dialog-container">
            <div class="gps-dialog-section">
                <div class="gps-dialog-content">
                    <div>
                        <div class="gps-dialog-flex">
                            <p class="gps-dialog-paragraph">${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.Items.BallBearings.ConfirmHalfSpeed", { actorName: token.actor.name })}</p>
                            <div id="image-container" class="gps-dialog-image-container">
                                <img id="img_${dialogId}" src="${chosenItem.img}" class="gps-dialog-image">
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
    
    let result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", gmUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft: 30,validTokenPrimaryUuid: token.document.uuid,source: "gm",type: "singleDialog"});
            
    const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result || {};

    if (!userDecision) {
        let saveResult;
        if(source && source === "user") saveResult = await game.gps.socket.executeAsUser("gpsActivityUse", browserUser, {itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: token.document.uuid});
        else if(source && source === "gm") saveResult = await game.gps.socket.executeAsUser("gpsActivityUse", gmUser, {itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: token.document.uuid});
        if(!saveResult) return await game.gps.stopMovementEnter({token: tokenDocument});

        if (saveResult.failedSaves.size !== 0) {
            await game.gps.stopMovementEnter({token: tokenDocument});

            const hasEffectApplied = tokenDocument.hasStatusEffect("prone");

            if (!hasEffectApplied) {
                await game.gps.socket.executeAsUser("gmToggleStatus", gmUser, {tokenUuid: `${token.document.uuid}`, status: "prone", active: true });
            }
        }
        else await resumeMovement();
    }
    else if (userDecision) {
        await resumeMovement();
        return;
    }
}
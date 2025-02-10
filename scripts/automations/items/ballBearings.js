export async function ballBearings({tokenUuid, regionUuid, regionScenario, originX, originY, regionStatus, speaker, actor, character, item, args, scope, workflow, options}) {
    let gmUser = game.gps.getPrimaryGM();

    if(args?.[0]?.macroPass === "templatePlaced") {
        await actor.setFlag("gambits-premades", "ballBearingTemplateUuid", workflow.templateUuid);
        let cprConfig = game.gps.getCprConfig({itemUuid: workflow.item.uuid});
        const { animEnabled } = cprConfig;
        if(animEnabled) {
            const template = await fromUuid(workflow.templateUuid);
            let alignmentDecision;
            (MidiQOL.safeGetGameSetting('dnd5e', 'gridAlignedSquareTemplates') === true) ? alignmentDecision = "center" : alignmentDecision = "right";
        
            new Sequence()
                .effect()
                .file("modules/gambits-premades/assets/images/ballBearings.webp")
                .scaleToObject(0.5, {uniform:true})
                .attachTo(template, { align: alignmentDecision, edge: "inner" })
                .tieToDocuments(template)
                .mask()
                .belowTokens()
                .persist()
                .play()
        }
    }

    if(!tokenUuid || !regionUuid || !regionScenario) return;

    let region = await fromUuid(regionUuid);
    let tokenDocument = await fromUuid(tokenUuid);
    let token = tokenDocument?.object;
    
    if (!MidiQOL.isTargetable(token)) return;

    if ((token.actor.type !== 'npc' && token.actor.type !== 'character')) return;

    let validatedRegionMovement = game.gps.validateRegionMovement({ regionScenario: regionScenario, regionStatus: regionStatus, regionUuid: regionUuid, tokenUuid: tokenUuid });
    const { validRegionMovement, validReroute } = validatedRegionMovement;
    if(!validRegionMovement) return;

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
                            <p class="gps-dialog-paragraph">${token.actor.name} moved through ball bearings, are they moving at half speed?</p>
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
    
    let result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", gmUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft: 30,validTokenPrimaryUuid: token.document.uuid,source: "gm",type: "singleDialog"});
            
    const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result;

    if (!userDecision) {
        const saveResult = await game.gps.gpsActivityUse({itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: token.document.uuid});

        if (saveResult.failedSaves.size !== 0) {
            if(validReroute) {
                game.gps.validateRegionMovement({ regionScenario: "tokenForcedMovement", regionStatus: regionStatus, regionUuid: regionUuid, tokenUuid: tokenUuid });

                await token.document.update({ x: originX, y: originY }, { teleport: true });
            }

            const hasEffectApplied = tokenDocument.hasStatusEffect("prone");

            if (!hasEffectApplied) {
                await game.gps.socket.executeAsUser("gmToggleStatus", gmUser, {tokenUuid: `${token.document.uuid}`, status: "prone", active: true });
            }
        }
    }
    else if (userDecision) {
        return;
    }
}
export async function caltrops({tokenUuid, regionUuid, regionScenario, originX, originY, regionStatus, speaker, actor, character, item, args, scope, workflow, options}) {
    let gmUser = game.gps.getPrimaryGM();

    if(args?.[0]?.macroPass === "templatePlaced") {
        await actor.setFlag("gambits-premades", "caltropsTemplateUuid", workflow.templateUuid);
        const template = await fromUuid(workflow.templateUuid);
        let alignmentDecision;
        (MidiQOL.safeGetGameSetting('dnd5e', 'gridAlignedSquareTemplates') === true) ? alignmentDecision = "center" : alignmentDecision = "right";
    
        new Sequence()
            .effect()
            .file("jb2a.caltrops.endframe.01.grey")
            .scaleToObject(0.5, {uniform:true})
            .attachTo(template, { align: alignmentDecision, edge: "inner" })
            .tieToDocuments(template)
            .mask()
            .belowTokens()
            .persist()
            .play()
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
    let dialogId = "caltrops";
    let dialogTitlePrimary = `${token.actor.name} | ${itemProperName}`;

    const effectOriginActor = await fromUuid(region.flags["region-attacher"].actorUuid);

    let dialogContent = `
        <div class="gps-dialog-container">
            <div class="gps-dialog-section">
                <div class="gps-dialog-content">
                    <div>
                        <div class="gps-dialog-flex">
                            <p class="gps-dialog-paragraph">${token.actor.name} moved through caltrops, are they moving at half speed?</p>
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
            let saveResult;
            if(source && source === "user") saveResult = await game.gps.socket.executeAsUser("gpsActivityUse", browserUser, {itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: token.document.uuid});
            else if(source && source === "gm") saveResult = await game.gps.socket.executeAsUser("gpsActivityUse", gmUser, {itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: token.document.uuid});
            if(!saveResult) return;

            if (saveResult.failedSaves.size !== 0) {
                if(validReroute) {
                    game.gps.validateRegionMovement({ regionScenario: "tokenForcedMovement", regionStatus: regionStatus, regionUuid: regionUuid, tokenUuid: tokenUuid });
    
                    if(originX && originY) await token.document.update({ x: originX, y: originY }, { teleport: true });
                }
                
                let effectData = [
                    {
                    "name": "Caltrops Restriction",
                    "img": chosenItem.img,
                    "origin": effectOriginActor.uuid,
                    "disabled": false,
                    "changes": [
                        {
                            "key": "system.attributes.movement.all",
                            "mode": 0,
                            "value": "-10",
                            "priority": 20
                        }
                    ],
                    "transfer": false,
                    "flags": {
                        "dae": {
                            "stackable": "multi",
                            "specialDuration": [
                                "isHealed"
                            ]
                        }
                    }
                    }
                ];

                await MidiQOL.socket().executeAsUser("createEffects", gmUser, { actorUuid: token.actor.uuid, effects: effectData });

                let actorPlayer = MidiQOL.playerForActor(token.actor);
                let chatData = {
                    user: actorPlayer.id,
                    speaker: ChatMessage.getSpeaker({ token: token }),
                    content: `${token.actor.name} takes 1 point of piercing damage. <div><img src="${token.actor.img}" width="30" height="30" style="border:0px"></div></div>`
                };
                ChatMessage.create(chatData);
            }
    }
    else if (userDecision) {
        return;
    }
}
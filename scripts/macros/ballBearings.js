export async function ballBearings({tokenUuid, regionUuid, regionScenario, originX, originY, regionStatus}) {
    //async function wait(ms) { return new Promise(resolve => { setTimeout(resolve, ms); }); }
    const module = await import('../module.js');
    const socket = module.socket;
    const helpers = await import('../helpers.js');
    let gmUser = helpers.getPrimaryGM();

    if(!tokenUuid || !regionUuid || !regionScenario) return;

    let region = await fromUuid(regionUuid);
    let tokenDocument = await fromUuid(tokenUuid);
    let token = tokenDocument?.object;
    
    if (!MidiQOL.isTargetable(token)) return;

    if ((token.actor.type !== 'npc' && token.actor.type !== 'character')) return;

    let validatedRegionMovement = helpers.validateRegionMovement({ regionScenario: regionScenario, regionStatus: regionStatus, regionUuid: regionUuid, tokenUuid: tokenUuid });
    const { validRegionMovement, validReroute } = validatedRegionMovement;
    if(!validRegionMovement) return;

    let chosenItem = await fromUuid(region.flags["region-attacher"].itemUuid);
    let itemProperName = chosenItem.name;
    let dialogId = "ballbearings";
    let dialogTitlePrimary = `${token.actor.name} | ${itemProperName}`;

    const effectOriginActor = await fromUuid(region.flags["region-attacher"].actorUuid);

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
    
    let result = await socket.executeAsUser("process3rdPartyReactionDialog", gmUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft: 30,validTokenPrimaryUuid: token.document.uuid,source: "gm",type: "singleDialog"});
            
    const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result;

    if (!userDecision) {
        const itemData = {
            name: chosenItem.name,
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
                    saveDamage: "nodam"
                },
                "autoanimations": {
                    killAnim: true
                }
            },
            system: {
                equipped: true,
                actionType: "save",
                save: { dc: 10, ability: 'dex', scaling: "flat" },
                components: { concentration: false, material: false, ritual: false, somatic: false, value: "", vocal: false },
                duration: { units: "inst", value: undefined }
            }
        };

        const itemUpdate = new CONFIG.Item.documentClass(itemData, {parent: effectOriginActor});
        const options = { showFullCard: false, createWorkflow: true, versatile: false, configureDialog: false, targetUuids: [token.document.uuid], workflowOptions: {autoRollDamage: 'always', autoFastDamage: true} };
        const saveResult = await MidiQOL.completeItemUse(itemUpdate, {}, options);

        if (saveResult.failedSaves.size !== 0) {
            if(validReroute) {
                helpers.validateRegionMovement({ regionScenario: "tokenForcedMovement", regionStatus: regionStatus, regionUuid: regionUuid, tokenUuid: tokenUuid });

                await token.document.update({ x: originX, y: originY }, { animate: false });
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
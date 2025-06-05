export async function entropicWard({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "isPreAttacked") {
        if(MidiQOL.hasUsedReaction(actor)) return;
        if(item.system.uses.spent >= item.system.uses.max) return;
        let dialogId = "entropicward";
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
                                <p class="gps-dialog-paragraph">Would you like to use your reaction to disadvantage the attack against you and potentially gain advantage against the attacker?</p>
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
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result || {};

        if (!userDecision) {
            return;
        }
        else if (userDecision) {
            workflow.disadvantage = true;
            await actor.setFlag("gambits-premades", "entropicWardUsed", true);
            MidiQOL.setReactionUsed(actor);
            await item.update({"system.uses.spent" : item.system.uses.spent + 1})
        }
    }

    if(args[0].macroPass === "isAttacked") {
        let entropicFlag = actor.getFlag("gambits-premades", "entropicWardUsed");
        
        if(entropicFlag && workflow.attackTotal < actor.system.attributes.ac.value) {
            let initialEffectData = [{
                "origin": item.uuid,
                "disabled": false,
                "name": `${item.name} - Advantage`,
                "img": item.img,
                "type": "base",
                "changes": [
                    {
                        "key": "flags.midi-qol.advantage.attack.all",
                        "mode": 0,
                        "value": "false",
                        "priority": 20
                    },
                    {
                        "key": "flags.midi-qol.onUseMacroName",
                        "mode": 0,
                        "value": "ItemMacro, postAttackRoll",
                        "priority": 20
                    }
                ],
                "transfer": true,
                "flags": {
                    "dae": {
                        "specialDuration": [
                            "turnEndSource"
                        ]
                    },
                    "gambits-premades": {
                        "entropicWardTarget": workflow.token.document.uuid,
                        "gpsUuid": "403b07d9-0c55-4949-bfe8-797f22ba4b79"
                    }
                }
            }];

            actor.createEmbeddedDocuments("ActiveEffect", initialEffectData)
                .then(created => {
                    let effectId = created[0].id;
                    let updatedChanges = [
                        {
                            "key": "flags.midi-qol.advantage.attack.all",
                            "mode": 0,
                            "value": "\"@targetUuid\" === \"" + workflow.token.document.uuid + "\"",
                            "priority": 20
                        },
                        {
                            "key": "flags.midi-qol.onUseMacroName",
                            "mode": 0,
                            "value": "ItemMacro, postAttackRoll",
                            "priority": 20
                        }
                    ];

                    actor.updateEmbeddedDocuments("ActiveEffect", [{
                        _id: effectId,
                        changes: updatedChanges
                    }]);
                });

            await actor.unsetFlag("gambits-premades", "entropicWardUsed");
        }
        else actor.unsetFlag("gambits-premades", "entropicWardUsed");
    }

    if(args[0].macroPass === "postAttackRoll") {
        let effectData = actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "403b07d9-0c55-4949-bfe8-797f22ba4b79");
        if(!effectData) return;
        let effectDataTarget = effectData.getFlag("gambits-premades", "entropicWardTarget");
        if(!effectDataTarget) return;
        if(effectData && effectDataTarget === workflow.targets.first().document.uuid) await effectData.delete();
    }
}
export async function recklessAttack2024({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "preAttackRoll") {
        if(!game.combat) return;
        let recklessCheck = await actor.getFlag("midi-qol", "checkRecklessAttack2024");
        if(recklessCheck === false || recklessCheck === true) return;

        let currentCombatant = canvas.tokens.get(game.combat.current.tokenId);
        if (currentCombatant.id !== token.id) return;

        let dialogId = "recklessattack2024";
        let dialogTitlePrimary = `${token.actor.name} | ${item.name}`;
        let dialogTitleGM = `Waiting for ${token.actor.name}'s selection | ${item.name}`;
        let browserUser = game.gps.getBrowserUser({ actorUuid: actor.uuid });
        let initialTimeLeft = 30;
        let gmUser = game.gps.getPrimaryGM();
        let result;

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">Would you like to use your Reckless Attack this turn?</p>
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
            await actor.setFlag("midi-qol", "checkRecklessAttack2024", false);
            return;
        }
        else if (userDecision) {
            workflow.advantage = true;
            await actor.setFlag("midi-qol", "checkRecklessAttack2024", true);

            let effectData = [{
                "changes": [
                    {
                        "key": "flags.midi-qol.grants.advantage.attack.all",
                        "value": "1",
                        "mode": 0,
                        "priority": 20
                    },
                    {
                        "key": "flags.midi-qol.advantage.attack.all",
                        "value": "activity?.ability === 'str'",
                        "mode": 0,
                        "priority": 20
                    },
                    {
                        "key": "macro.itemMacro",
                        "mode": 0,
                        "value": "function.game.gps.recklessAttack2024",
                        "priority": 20
                    },
                ],
                "transfer": false,
                "disabled": false,
                "flags": {
                    "dae": {
                        "transfer": false,
                        "stackable": "noneName",
                        "specialDuration": [
                            "turnStartSource",
                            "combatEnd"
                        ]
                    },
                    "midi-qol": {
                        "forceCEOff": true
                    },
                    "gambits-premades": {
                        "gpsUuid": "872c2cfd-5f58-4e64-a804-2b0db2c65900"
                    }
                },
                "name": "Reckless Attack - Effects",
                "icon": item.img,
                "origin": item.uuid
            }];

            await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: actor.uuid, effects: effectData });

        }
    }

    if(args?.[0] === "each" && args?.[2].turn === "startTurn") {
        await actor.unsetFlag("midi-qol", "checkRecklessAttack2024");
    }

    if(args?.[0] === "off") {
        await actor.unsetFlag("midi-qol", "checkRecklessAttack2024");
    }
}
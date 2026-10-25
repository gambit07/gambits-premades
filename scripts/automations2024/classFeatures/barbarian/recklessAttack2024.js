export async function recklessAttack2024({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "preAttackRollConfig") {
        if(!game.combat) return;
        let meleeAttack = (workflow.activity?.ability === 'str') ? true : false;
        if (!meleeAttack) return;
        let recklessCheck = await actor.getFlag("midi-qol", "checkRecklessAttack2024");
        if(recklessCheck === false || recklessCheck === true) return;

        let currentCombatant = canvas.tokens.get(game.combat.current?.tokenId);
        if (currentCombatant?.id !== token.id) return;

        let dialogId = "recklessattack2024";
        let dialogTitlePrimary = `${token.actor.name} | ${item.name}`;
        let dialogTitleGM = game.i18n.format("GAMBITSPREMADES.Dialogs.Common.WaitingForSelection", { actorName: token.actor.name, itemName: item.name });
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
                                <p class="gps-dialog-paragraph">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Barbarian.RecklessAttack.Prompts.UseRecklessAttack")}</p>
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

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid,source: "user",type: "multiDialog", browserUser: browserUser };
            
            let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid,source: "gm",type: "multiDialog" };

            result = await game.gps.handleDialogPromises({userDialogArgs, gmDialogArgs});
        } else {
        result = await game.gps.queryDialog("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid,source:gmUser === browserUser ? "gm" : "user",type:"singleDialog"});
        }
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result || {};

        if (!userDecision) {
            await actor.setFlag("midi-qol", "checkRecklessAttack2024", false);
            return;
        }
        else if (userDecision) {
            workflow.tracker.advantage.add(userDecision, "Reckless Attack");
            await actor.setFlag("midi-qol", "checkRecklessAttack2024", true);

            let effectData = [{ duration: { expiry: "sourceStart" },
                system: { changes: [
                    {
                        "key": "flags.midi-qol.grants.advantage.attack.all",
                        "value": 1,
                        type: "custom",
                        "priority": 20
                    },
                    {
                        "key": "system.abilities.str.attack.roll.mode",
                        "value": 1,
                        type: "add",
                        "priority": 20
                    },
                    {
                        "key": "macro.itemMacro",
                        type: "custom",
                        "value": "function.game.gps.recklessAttack2024",
                        "priority": 20
                    },
                ] },
                "transfer": false,
                "disabled": false,
                "flags": {
                    "dae": {
                        "transfer": false,
                        "stackable": "noneName",
                        "specialDuration": []
                    },
                    "midi-qol": {
                        "forceCEOff": true
                    },
                    "gambits-premades": { expireOnCombatEnd: true,
                        "gpsUuid": "872c2cfd-5f58-4e64-a804-2b0db2c65900"
                    },
                    "cat": {
                        "identifier": "recklessAttackEffect"
                    }
                },
                "name": "Reckless Attack - Effects",
                img: item.img,
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

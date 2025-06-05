export async function staffOfWithering({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "preDamageRollComplete") {
        let remainingCharges = item.system.uses.max - item.system.uses.spent;
        if(!remainingCharges) return ui.notifications.warn("You have no uses remaining for the Staff of Withering");
        let chargesText;
        if(remainingCharges > 1) chargesText = "charges";
        else chargesText = "charge";

        let dialogId = "staffofwithering";
        let dialogTitlePrimary = `${token.actor.name} | ${item.name}`;
        let browserUser = game.gps.getBrowserUser({ actorUuid: actor.uuid });
        let gmUser = game.gps.getPrimaryGM();

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">Would you like to use a charge to deal additional damage and possibly disadvantage the target? You have <b>${remainingCharges}</b> ${chargesText} remaining.</p>
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
            
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result || {};

        if (!userDecision) {
            return;
        }
        else if (userDecision) {
            await item.update({ "system.uses.spent": item.system.uses.spent + 1 });
            let target = workflow.hitTargets.first();

            let saveResult;
            if(source && source === "user") saveResult = await game.gps.socket.executeAsUser("gpsActivityUse", browserUser, {itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: target.document.uuid});
            else if(source && source === "gm") saveResult = await game.gps.socket.executeAsUser("gpsActivityUse", gmUser, {itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: target.document.uuid});
            if(!saveResult) return;

            if (saveResult.failedSaves.size !== 0) {
                let effectData = [
                {
                    "icon": item.img,
                    "origin": item.uuid,
                    "duration": {
                        "seconds": 3600
                    },
                    "disabled": false,
                    "name": "Staff of Withering",
                    "changes": [
                        {
                        "key": "flags.midi-qol.disadvantage.ability.check.str",
                        "mode": 0,
                        "value": "1",
                        "priority": 20
                        },
                        {
                        "key": "flags.midi-qol.disadvantage.ability.check.con",
                        "mode": 0,
                        "value": "1",
                        "priority": 20
                        },
                        {
                        "key": "flags.midi-qol.disadvantage.ability.save.str",
                        "mode": 0,
                        "value": "1",
                        "priority": 20
                        },
                        {
                        "key": "flags.midi-qol.disadvantage.ability.save.con",
                        "mode": 0,
                        "value": "1",
                        "priority": 20
                        }
                    ]
                }
                ];
                await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: target.actor.uuid, effects: effectData });
            }
        }
    }
}
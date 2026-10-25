export async function staffOfWithering({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "preDamageRollComplete") {
        if(!workflow.hitTargets.size || workflow.gps?.staffOfWithering) return;
        let remainingCharges = item.system.uses.max - item.system.uses.spent;
        if(!remainingCharges) return ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Items.StaffOfWithering.NotAvailable"));
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
                                <p class="gps-dialog-paragraph">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.Items.StaffOfWithering.Prompt")} <b>${remainingCharges}</b> ${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.Items.StaffOfWithering.Remaining", { chargesText: chargesText })}</p>
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

        let result = await game.gps.queryDialog("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft: 30,validTokenPrimaryUuid: token.document.uuid, focusTokenUuid: workflow.hitTargets.first().document.uuid,source:gmUser === browserUser ? "gm" : "user",type:"singleDialog"});
            
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result || {};

        if (!userDecision) {
            return;
        }
        else if (userDecision) {
            let target = workflow.hitTargets.first();

            let saveResult;
            if(source && source === "user") saveResult = await game.gps.queryUser("gpsActivityUse", browserUser, {itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: target.document.uuid});
            else if(source && source === "gm") saveResult = await game.gps.queryUser("gpsActivityUse", gmUser, {itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: target.document.uuid});
            if(!saveResult) return;
            if(item.system.uses.spent >= item.system.uses.max) return;
            await item.update({"system.uses.spent": item.system.uses.spent + 1});
            workflow.gps ??= {};
            workflow.gps.staffOfWithering = true;

            if (saveResult.failedSaves.size !== 0) {
                let effectData = [
                {
                    img: item.img,
                    "origin": item.uuid,
                    "duration": { value: 3600, units: "seconds" },
                    "disabled": false,
                    "name": "Staff of Withering",
                    system: { changes: [
                        {
                        "key": "system.abilities.str.check.roll.mode",
                        type: "add",
                        "value": -1,
                        "priority": 20
                        },
                        {
                        "key": "system.abilities.con.check.roll.mode",
                        type: "add",
                        "value": -1,
                        "priority": 20
                        },
                        {
                        "key": "system.abilities.str.save.roll.mode",
                        type: "add",
                        "value": -1,
                        "priority": 20
                        },
                        {
                        "key": "system.abilities.con.save.roll.mode",
                        type: "add",
                        "value": -1,
                        "priority": 20
                        }
                    ] }
                }
                ];
                await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: target.actor.uuid, effects: effectData });
            }
        }
    }
}

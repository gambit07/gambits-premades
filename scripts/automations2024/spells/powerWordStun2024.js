export async function powerWordStun2024({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "postPreambleComplete") {
        const targets = workflow.targets;
        for(let target of targets) {
            if(target.actor.system.attributes.hp.value > 150) {
                ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Automations2024.Spells.PowerWordStun2024.TargetMoreThan150"));
                workflow.targets.delete(target);
                await game.gps.gpsActivityUse({itemUuid: item.uuid, identifier: "syntheticSaveSuccess", targetUuid: target.document.uuid});
                continue;
            }
        }
    }
}
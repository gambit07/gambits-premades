export async function powerWordStun2024({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "postPreambleComplete") {
        const targets = workflow.targets;
        for(let target of targets) {
            if(target.actor.system.attributes.hp.value > 150) {
                ui.notifications.warn("The target has more than 150 hit points and is not stunned, but its speed is reduced to 0 until the start of the casters next turn.");
                workflow.targets.delete(target);
                await game.gps.gpsActivityUse({itemUuid: item.uuid, identifier: "syntheticSaveSuccess", targetUuid: target.document.uuid});
                continue;
            }
        }
    }
}
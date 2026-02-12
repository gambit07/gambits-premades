export async function sleep2024({ speaker, actor, token, character, item, args, scope, workflow, options, rolledItem, rolledActivity, macroItem }) {
    if(args?.[0].macroPass === "preSavesComplete") {
        for (let target of workflow.failedSaves) {
            if(target.actor.system.traits.ci.custom.includes("Magical Sleep") || target.actor.system.traits.ci.value.has("exhaustion")) {
                workflow.failedSaves.delete(target);
                workflow.saves.add(target);
                ui.notifications.warn("Creature is immune to Magical Sleep and/or being Exhausted")
            }
        }
    }
    
    else if (args?.[0] === "off") {
        let gmUser = game.gps.getPrimaryGM();
        item = await fromUuid(args[2]);
        await game.gps.socket.executeAsUser("gpsActivityUse", gmUser, {itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: token.document.uuid});
    }
}
export async function sleep2024({ speaker, actor, token, character, item, args, scope, workflow, options, rolledItem, rolledActivity, macroItem }) {
    if(args?.[0].macroPass === "preSavesComplete") {
        for (let target of workflow.failedSaves) {
            if(target.actor.system.traits.ci.custom.includes("Magical Sleep") || target.actor.system.traits.ci.value.has("exhaustion")) {
                workflow.failedSaves.delete(target);
                workflow.saves.add(target);
                ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Automations2024.Spells.Sleep2024.TargetImmuneToSleepOrExhaustion"))
            }
        }
    }
    
    else if(args?.[0] === "each") {
        console.log(args, "args")
        let gmUser = game.gps.getPrimaryGM();
        item = await fromUuid(args[2]);
        let saveCheck = await game.gps.socket.executeAsUser("gpsActivityUse", gmUser, {itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: token.document.uuid});
        const effectData = await token.actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "12518587-9f13-41c9-aff9-a5bf885aed32");
        if (saveCheck.failedSaves.size !== 0) {
            await effectData.update({"flags.dae.macroRepeat": ""});
        }
        else {
            await effectData.delete();
        }
    }
}
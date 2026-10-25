export async function sleep2024({ speaker, actor, token, character, item, args, scope, workflow, options, rolledItem, rolledActivity, macroItem }) {
    if(args?.[0].macroPass === "preSavesComplete") {
        for (let target of workflow.failedSaves) {
            if(/magical sleep/i.test(target.actor.system.traits.ci.custom ?? "") || target.actor.system.traits.ci.value.has("exhaustion")) {
                workflow.failedSaves.delete(target);
                workflow.saves.add(target);
                ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Automations2024.Spells.Sleep2024.TargetImmuneToSleepOrExhaustion"))
            }
        }
    }
    
    else if(args?.[0] === "each") {
        let gmUser = game.gps.getPrimaryGM();
        item = await fromUuid(args[2]);
        if(!item || !token?.actor) return;
        let saveCheck = await game.gps.queryUser("gpsActivityUse", gmUser, {itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: token.document.uuid});
        const effectData = await token.actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "12518587-9f13-41c9-aff9-a5bf885aed32" && DAE.effectMatchesSource(e, item.uuid));
        if(!saveCheck || !effectData) return;
        if (saveCheck.failedSaves.size !== 0) {
            await effectData.update({name: `${item.name}: ${game.i18n.localize("DND5E.ConUnconscious")}`, statuses: ["unconscious"], "flags.dae.macroRepeat": "", "flags.dae.specialDuration": ["isDamaged"]});
        }
        else {
            await effectData.delete();
        }
    }
}
import {effectToken} from "../../utils/effectTargetUtils.js";

export async function sleep2024({ speaker, actor, token, character, item, args, scope, workflow, options, rolledItem, rolledActivity, macroItem }) {
    if(args?.[0].macroPass === "preSavesComplete") {
        for (let target of workflow.failedSaves.documents) {
            if(/magical sleep/i.test(target.actor.system.traits.ci.custom ?? "") || target.actor.system.traits.ci.value.has("exhaustion")) {
                workflow.failedSaves.delete(target);
                workflow.saves.add(target);
                ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Automations2024.Spells.Sleep2024.TargetImmuneToSleepOrExhaustion"))
            }
        }
    }
    
    else if(args?.[0] === "each") {
        const context = args.at(-1);
        if(context.turn !== "endTurn") return;
        const target = effectToken(token, context, actor);
        const effectData = actor.effects.get(context.effectId);
        if(!target || !effectData?.active || !item) return;
        const saveCheck = await game.gps.gpsActivityUse({itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: target.uuid});
        if(!saveCheck || saveCheck.aborted) return;
        if (saveCheck.failedSaves.size !== 0) {
            await effectData.update({name: `${item.name}: ${game.i18n.localize("DND5E.ConUnconscious")}`, statuses: ["unconscious"], "flags.dae.macroRepeat": "", "flags.dae.specialDuration": ["isDamaged"]});
        }
        else {
            await effectData.delete();
        }
    }
}

import {castConcentration} from "../../utils/castEffects.js";
import {effectToken} from "../../utils/effectTargetUtils.js";

export async function mentalPrison({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "postActiveEffects") {
        const targets = workflow.failedSaves;
        const hasConcApplied = castConcentration(actor, item, {workflow});
        const checkFails = targets.count === (workflow.activationFails?.count ?? 0);
        const checkElements = targets.documents.every(token => workflow.activationFails?.has(token));

        const checkEqual = checkFails && checkElements;

        if((!targets.count || checkEqual) && hasConcApplied) {
            await hasConcApplied.delete();
            ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Spells.MentalPrison.TargetsImmune"));
            return;
        }
    }
    if(args[0] === "off") {
        const context = args.at(-1);
        const reason = context?.["expiry-reason"] ?? "";
        if(!reason.startsWith("midi-qol:") || !reason.slice(9).split(",").some(event => event === "isMoved" || event === "1Attack")) return;
        const target = effectToken(token, context, actor);
        if(!target) return;
        let damageRoll = await new CONFIG.Dice.DamageRoll(`10d10`, {}, {type: "psychic", properties: ["mgc"]}).evaluate();
        await MidiQOL.displayDSNForRoll(damageRoll, 'damageRoll')

        const itemData = {
            flags: {},
            name: "Mental Prison - Effect End",
            type: "feat",
            img: item.img
        }

        await new MidiQOL.DamageOnlyWorkflow(actor, target, damageRoll.total, "psychic", [target], damageRoll, {itemData: itemData, flavor: "Mental Prison - Effect End"}).ready;
    }
}

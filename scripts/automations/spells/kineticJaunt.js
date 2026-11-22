import {effectToken, sharesCreatureSpace} from "../../utils/effectTargetUtils.js";

export async function kineticJaunt({actor, token, args}) {
    const context = args?.at(-1);
    if(args?.[0] !== "each" || context?.turn !== "endTurn") return;
    const target = effectToken(token, context, actor);
    if(!target || !sharesCreatureSpace(target)) return;

    const roll = await new CONFIG.Dice.DamageRoll("1d8", {}, {type: "force", properties: ["mgc"]}).evaluate();
    await MidiQOL.applyTokenDamage([{damage: roll.total, type: "force"}], roll.total, new Set([target]), null, null);
    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({actor, token: target}),
        content: game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.Spells.KineticJaunt.EndTurnAnotherCreaturesSpace", {damageTotal: roll.total})
    });
}

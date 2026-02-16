export async function mentalPrison({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "postActiveEffects") {
        const targets = workflow.failedSaves;
        const hasConcApplied = MidiQOL.getConcentrationEffect(actor, item.uuid)
        const checkFails = workflow.failedSaves.size === workflow.activationFails.size;
        const checkElements = [...workflow.failedSaves].every(token =>
        workflow.activationFails.has(token)
        );

        const checkEqual = checkFails && checkElements;

        if((!targets || checkEqual) && hasConcApplied) {
            await hasConcApplied.delete();
            ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Spells.MentalPrison.TargetsImmune"));
            return;
        }
    }
    if(args[0] === "off" && (args[2]["expiry-reason"] === "midi-qol:isMoved" || args[2]["expiry-reason"] === "midi-qol:1Attack,1Action,1Spell,1Action")) {
        let damageRoll = await new CONFIG.Dice.DamageRoll(`10d10`, {}, {type: "psychic", properties: ["mgc"]}).evaluate();
        await MidiQOL.displayDSNForRoll(damageRoll, 'damageRoll')

        const itemData = {
            name: "Mental Prison - Effect End",
            type: "feat",
            img: item.img
        }

        new MidiQOL.DamageOnlyWorkflow(actor, token, damageRoll.total, "psychic", [token], damageRoll, {itemData: itemData, flavor: "Mental Prison - Effect End"});
    }
}
export async function scornfulRebuke({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "isHit") {
        let reactingDamage = actor.system.abilities.cha.mod;
        if(reactingDamage < 1) reactionDamage = 1;
        const target = workflow.token;
        const isIncapacitated = MidiQOL.checkIncapacitated(token);

        if(isIncapacitated) return ui.notifications.error(game.i18n.format("GAMBITSPREMADES.Notifications.ClassFeatures.Paladin.OathOfConquest.ScornfulRebuke.Incapacitated", { name: actor.name }));
        const damageRoll = await new CONFIG.Dice.DamageRoll(`${reactingDamage}`, {}, {type: "psychic", properties: ["mgc"]}).evaluate();
        await MidiQOL.displayDSNForRoll(damageRoll, 'damageRoll');

        const itemData = {
            name: "Scornful Rebuke - Damage (Psychic)",
            type: "feat",
            img: item.img
        }

        new MidiQOL.DamageOnlyWorkflow(actor, token, damageRoll.total, "psychic", [target], damageRoll, {itemData: itemData, flavor: "Scornful Rebuke - Damage (Psychic)"});
    }
}
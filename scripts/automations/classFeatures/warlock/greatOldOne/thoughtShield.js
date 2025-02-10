export async function thoughtShield({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "isDamaged") {
        let rollFound = workflow.damageList.find(roll => roll.damageDetail.some(detail => detail.type === "psychic"));
        if (rollFound) {
            let damageDetail = rollFound.damageDetail.find(detail => detail.type === "psychic");
            let rollTotal = damageDetail ? Math.floor(damageDetail.value) : null;
            if (!rollTotal) return;
            let damageRoll = await new CONFIG.Dice.DamageRoll(`${rollTotal}`, {}, {type: "psychic", properties: ["mgc"]}).evaluate();

            const itemData = {
                name: "Thought Shield - Damage (Psychic)",
                type: "feat",
                img: item.img
            }

            new MidiQOL.DamageOnlyWorkflow(actor, token, damageRoll.total, "psychic", workflow.token ? [workflow.token] : [], damageRoll, {itemData: itemData, flavor: "Thought Shield - Damage (Psychic)"});
        }
    }
}
export async function thoughtShield({ speaker, actor, token, tokenDocument = game.gps.tokenDocument(token), character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "isDamaged") {
        if(workflow.item?.flags["gambits-premades"]?.thoughtShieldReflection) return;
        if(!tokenDocument || !workflow.tokenDocument) return;
        let rollFound = workflow.damageList?.find(roll => roll.targetUuid === tokenDocument.uuid || (!roll.targetUuid && roll.actorUuid === actor.uuid));
        if (rollFound) {
            const rollTotal = Math.floor((rollFound.calculatedDamages ?? []).filter(detail => detail.type === "psychic").reduce((sum, detail) => sum + Math.max(0, detail.value), 0));
            if (!rollTotal) return;
            let damageRoll = await new CONFIG.Dice.DamageRoll(`${rollTotal}`, {}, {type: "psychic", properties: ["mgc"]}).evaluate();

            const itemData = {
                name: "Thought Shield - Damage (Psychic)",
                type: "feat",
                img: item.img,
                flags: {"gambits-premades": {thoughtShieldReflection: true}}
            }

            await new MidiQOL.DamageOnlyWorkflow(actor, tokenDocument, damageRoll.total, "psychic", [workflow.tokenDocument], damageRoll, {itemData: itemData, flavor: "Thought Shield - Damage (Psychic)"});
        }
    }
}
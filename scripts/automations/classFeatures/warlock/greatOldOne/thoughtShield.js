export async function thoughtShield({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "isDamaged") {
        if(workflow.item?.flags["gambits-premades"]?.thoughtShieldReflection) return;
        let rollFound = workflow.damageList?.find(roll => roll.targetUuid === token.document.uuid || (!roll.targetUuid && roll.actorUuid === actor.uuid));
        if (rollFound) {
            const rollTotal = Math.floor((rollFound.damageDetail ?? []).filter(detail => detail.type === "psychic").reduce((sum, detail) => sum + Math.max(0, detail.value), 0));
            if (!rollTotal) return;
            let damageRoll = await new CONFIG.Dice.DamageRoll(`${rollTotal}`, {}, {type: "psychic", properties: ["mgc"]}).evaluate();

            const itemData = {
                name: "Thought Shield - Damage (Psychic)",
                type: "feat",
                img: item.img,
                flags: {autoanimations: {isEnabled: false, version: 5}, "gambits-premades": {thoughtShieldReflection: true}}
            }

            await new MidiQOL.DamageOnlyWorkflow(actor, token, damageRoll.total, "psychic", workflow.token ? [workflow.token] : [], damageRoll, {itemData: itemData, flavor: "Thought Shield - Damage (Psychic)"});
        }
    }
}
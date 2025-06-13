export async function wound({ speaker, actor, token, character, item, args, scope, workflow, options, macroItem, rollData }) {
    if(args?.[0].macroPass === "postDamageRollComplete") {
        if(!workflow.activity?.description?.chatFlavor?.includes("gpsWoundingItem")) return;
        if(workflow?.damageTotal <= 0) return;
        item = token.actor.items.find(i => i.system.identifier === "wound");
        let targets = Array.from(workflow?.hitTargets);
        const targetUuids = targets.map(t => t.document.uuid);
        
        await game.gps.gpsActivityUse({itemUuid: item.uuid, identifier: "syntheticWound", targetUuid: targetUuids});
    }
    else if(args?.[0] === "each") {
        item = await fromUuid(args[2]);
        let effectData = token.actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "7186eac1-010a-4fb4-bd22-699d06839162");
        if (!effectData) return;

        let count = effectData.flags.dae.stacks;

        let damageRoll = await new CONFIG.Dice.DamageRoll(`${count}`, {}, {type: "none"}).evaluate();

        const itemData = {
            name: "Wound Damage",
            type: "feat",
            img: item.img
        }

        new MidiQOL.DamageOnlyWorkflow(actor, token, damageRoll.total, "none", token ? [token] : [], damageRoll, {itemData: itemData, flavor: "Wound Damage"});
    }
    else if(args === "woundRemovalFullHeal") {
        if (!options.system?.attributes?.hp) return;
        if (!token.actor.appliedEffects.some(e => e.flags["gambits-premades"]?.gpsUuid === "7186eac1-010a-4fb4-bd22-699d06839162")) return;
    
        const hpCurr = token.actor.system.attributes.hp.value;
        const hpMax = token.actor.system.attributes.hp.max;

        if(hpCurr >= hpMax) {
            let effectData = token.actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "7186eac1-010a-4fb4-bd22-699d06839162");
            let count = effectData.flags.dae.stacks;
            await effectData.delete({removeStacks: count});

            let effectRemover = token.actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "a6e73d28-8fac-4aad-a30a-4d992217a710");
            if(effectRemover) await effectRemover.delete();
        }
    }
}
export async function wound({ speaker, actor, token, character, item, args, scope, workflow, options, macroItem, rollData }) {
    if(args?.[0]?.macroPass === "postDamageRollComplete") {
        if(!workflow.activity?.description?.chatFlavor?.includes("gpsWoundingItem")) return;
        if(workflow?.damageTotal <= 0) return;
        item = token.actor.items.find(i => i.system.identifier === "wound");
        if(!item) return;
        let targets = Array.from(workflow?.hitTargets ?? []);
        const targetUuids = targets.map(t => t.document.uuid);
        if(!targetUuids.length) return;
        
        await game.gps.gpsActivityUse({itemUuid: item.uuid, identifier: "syntheticWound", targetUuid: targetUuids});
    }
    else if(args?.[0] === "each") {
        item = await fromUuid(args[2]);
        if(!item || !token?.actor) return;
        let effectData = token.actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "7186eac1-010a-4fb4-bd22-699d06839162");
        if (!effectData) return;

        let count = effectData.flags.dae.stacks;

        let damageRoll = await new CONFIG.Dice.DamageRoll(`${count}`, {}, {type: "none"}).evaluate();

        const itemData = {
            flags: {},
            name: "Wound Damage",
            type: "feat",
            img: item.img
        }

        new MidiQOL.DamageOnlyWorkflow(actor, token, damageRoll.total, "none", token ? [token] : [], damageRoll, {itemData: itemData, flavor: "Wound Damage"});
    }
    else if(args === "woundRemovalFullHeal") {
        actor ??= token?.actor;
        if(!actor || foundry.utils.getProperty(options, "system.attributes.hp.value") === undefined) return;
        if(actor.system.attributes.hp.value < actor.system.attributes.hp.max) return;
        const wounds = actor.appliedEffects.filter(effect => effect.flags["gambits-premades"]?.gpsUuid === "7186eac1-010a-4fb4-bd22-699d06839162");
        for(const effect of wounds) await effect.delete({removeStacks: effect.flags.dae?.stacks ?? 1});
        const checkers = actor.appliedEffects.filter(effect => effect.flags["gambits-premades"]?.gpsUuid === "a6e73d28-8fac-4aad-a30a-4d992217a710");
        for(const effect of checkers) await effect.delete();
    }
}

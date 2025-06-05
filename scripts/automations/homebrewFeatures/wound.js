export async function wound({ speaker, actor, token, character, item, args, scope, workflow, options, macroItem, rollData }) {
    if(args?.[0].macroPass === "postDamageRollComplete") {
        if(!workflow.activity?.description?.chatFlavor?.includes("gpsWoundingItem")) return;
        if(workflow?.damageTotal <= 0) return;
        let targets = Array.from(workflow?.hitTargets);
        const targetUuids = targets.map(t => t.document.uuid);
        await game.gps.gpsActivityUse({itemUuid: macroItem.uuid, identifier: "syntheticWound", targetUuid: targetUuids});
    }
    else if(args?.[0] === "each") {
        item = await fromUuid(args[2]);
        let allEffects = token.actor.appliedEffects.filter(e => e.name === item.name);
        if (allEffects.length === 0) return;

        let gmUser = game.gps.getPrimaryGM();
        let count = allEffects.length;

        let activityToUpdate = item.system.activities.find(a => a.identifier === "syntheticDamage");

        let damageParts = foundry.utils.duplicate(activityToUpdate.damage.parts);
        damageParts[0].custom.formula = count;

        await game.gps.socket.executeAsUser("gpsActivityUpdate", gmUser, { activityUuid: activityToUpdate.uuid, updates: { "damage.parts": damageParts } });
        await game.gps.socket.executeAsUser("gpsActivityUse", gmUser, {itemUuid: item.uuid, identifier: "syntheticDamage", targetUuid: token.document.uuid});
    }
}
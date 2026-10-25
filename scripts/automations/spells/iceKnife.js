export async function iceKnife({ speaker, actor, token, character, item, args, scope, workflow, options, macroItem }) {

    if((args[0].macroPass === "postAttackRollComplete" && !workflow.hitTargets.first()) || (args[0].macroPass === "postDamageRollComplete" && workflow.hitTargets.first())) {
        item = await fromUuid(workflow.itemUuid);
        let gmUser = game.gps.getPrimaryGM();
        let target = workflow.targets.first();
        if(!target) return;
        const castLevel = workflow.castData?.castLevel || workflow.castData?.baseLevel || item.system.level;
        
        let cprConfig = game.gps.getCprConfig({itemUuid: item.uuid});
        const { animEnabled } = cprConfig;
        if(animEnabled) {
            new Sequence()
            .effect()
                .file("jb2a.spell_projectile.ice_shard.blue")
                .atLocation(token)
                .stretchTo(target)
                .waitUntilFinished(-600)
            .effect()
                .file("jb2a.impact_themed.ice_shard.02.blue")
                .atLocation(target)
                .scale(1.25)
            .play()
        }
        
        const targets = MidiQOL.findNearby(null, target, game.gps.convertFromFeet({range:5}), { includeToken: true });
        const targetUuids = targets.map(t => t.document.uuid);
        let numDie = castLevel + 1;
        let activityToUpdate = await item.system.activities.find(a => a.identifier === "syntheticSave");

        if(activityToUpdate.damage.parts[0]?.number !== numDie) {
            let damageParts = foundry.utils.duplicate(activityToUpdate.damage.parts);
            damageParts[0].number = numDie;
            await game.gps.queryUser("gpsActivityUpdate", gmUser, { activityUuid: activityToUpdate.uuid, updates: {"damage.parts": damageParts} });
        }
        await game.gps.queryUser("gpsActivityUse", gmUser, {itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: targetUuids});
    }
}
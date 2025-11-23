export async function iceKnife({ speaker, actor, token, character, item, args, scope, workflow, options, macroItem }) {
    if(args[0].macroPass === "postPreambleComplete") {
        item = await fromUuid(workflow.itemUuid);
        let castLevel = workflow.castData.castLevel;
        let castMode = workflow.item?.system?.method;
        if ((castMode === "innate" || castMode === "atwill") && castLevel === 0) castLevel = workflow.castData.baseLevel;
        await item.setFlag("gambits-premades", "ikCastLevel", castLevel);
    }

    if((args[0].macroPass === "postAttackRollComplete" && !workflow.hitTargets.first()) || (args[0].macroPass === "postDamageRollComplete" && workflow.hitTargets.first())) {
        item = await fromUuid(workflow.itemUuid);
        let gmUser = game.gps.getPrimaryGM();
        let target = workflow.targets.first();
        if(!target) return;
        let castLevel = await item.getFlag('gambits-premades', 'ikCastLevel');
        
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
        
        const targets = MidiQOL.findNearby(null, target, game.gps.convertFromFeet({range:6}), { includeToken: true });
        const targetUuids = targets.map(t => t.document.uuid);
        let numDie = castLevel + 1;
        let activityToUpdate = await item.system.activities.find(a => a.identifier === "syntheticSave");
        let damageParts = foundry.utils.duplicate(workflow.damageDetail);
        damageParts[0].number = numDie;
        await game.gps.socket.executeAsUser("gpsActivityUpdate", gmUser, { activityUuid: activityToUpdate.uuid, updates: {"damage.parts": damageParts} });
        await game.gps.socket.executeAsUser("gpsActivityUse", gmUser, {itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: targetUuids});
        await actor.unsetFlag('gambits-premades', 'ikCastLevel');
    }
}
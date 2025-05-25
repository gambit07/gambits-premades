export async function ashardalonsStride({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "preItemRoll" && !game.combat) {
        ui.notifications.warn("Ashardalon's Stride requires an active combat.");
        return workflow.aborted = true;
    }
    if(args[0].macroPass === "preActiveEffects") {
        game.gps.animation.ashardalonsStride({type: "use", token, itemUuid: item.uuid});
    
        let castLevel = workflow.castData.castLevel;
        let castMode = workflow.item?.system?.preparation?.mode;
        if ((castMode === "innate" || castMode === "atwill") && castLevel === 0) castLevel = workflow.castData.baseLevel;
        let movementSpeed = castLevel > 3 ? (((castLevel - 3) * 5) + 20) : 20;
        const hasConcApplied = MidiQOL.getConcentrationEffect(actor, item.uuid);
    
        let effectData = [
        {
            "icon": "icons/magic/fire/projectile-bolt-zigzag-orange.webp",
            "origin": hasConcApplied.uuid,
            "duration": {
                "seconds": 60
            },
            "disabled": false,
            "name": "Ashardalon's Stride",
            "changes": [
            {
                "key": "system.attributes.movement.walk",
                "mode": 2,
                "value": movementSpeed,
                "priority": 20
            },
            {
                "key": "macro.itemMacro",
                "mode": 0,
                "value": `function.game.gps.ashardalonsStride ${item.uuid} ${actor.uuid}`,
                "priority": 20
            }
            ],
            "transfer": false,
            "flags": {
                "dae": {
                    "disableIncapacitated": false,
                    "selfTarget": true,
                    "selfTargetAlways": true,
                    "dontApply": false,
                    "stackable": "noneName",
                    "showIcon": false,
                    "macroRepeat": "startEveryTurn"
                },
                "gambits-premades": {"gpsUuid": "ef27f042-ba6d-4ff4-ac2b-4ca6ff611c17", "asCastLevel": castLevel}
            }
        }
        ];
    
        let effectName = await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: actor.uuid, effects: effectData });
        await hasConcApplied.addDependent(effectName[0]);
    }

    if(args[0] === "on") {
        let gmUser = game.gps.getPrimaryGM();
        let item = await fromUuid(args[2]);
        let originActor = await fromUuid(args[3]);
        let targetActor = actor;
        let targetToken = token;
        if(originActor.uuid === targetActor.uuid) return;
        let effectData = originActor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "ef27f042-ba6d-4ff4-ac2b-4ca6ff611c17");

        let turn = game.combat.round + '-' + game.combat.turn;
        let lastTurn = await effectData?.getFlag('gambits-premades', 'ashardalonsStrideTurn.' + targetToken.id + '.turn');
        if (turn === lastTurn) return;
        await effectData.setFlag('gambits-premades', 'ashardalonsStrideTurn.' + targetToken.id + '.turn', turn);
    
        let castLevel = await effectData?.getFlag('gambits-premades', 'asCastLevel');
        let numDie = (castLevel - 2) * 1;
        let activityToUpdate = item.system.activities.find(a => a.identifier === "syntheticDamage");
        if(activityToUpdate.damage.parts[0]?.number !== numDie) {
            let damageParts = foundry.utils.duplicate(activityToUpdate.damage.parts);
            damageParts[0].number = numDie;
            await game.gps.socket.executeAsUser("gpsActivityUpdate", gmUser, { activityUuid: activityToUpdate.uuid, updates: {"damage.parts": damageParts} });
        }
        await game.gps.socket.executeAsUser("gpsActivityUse", gmUser, {itemUuid: item.uuid, identifier: "syntheticDamage", targetUuid: targetToken.document.uuid});
    
        game.gps.animation.ashardalonsStride({type: "damage", token: targetToken, itemUuid: item.uuid});
    }

    if(args[0] === "each") {
        let item = await fromUuid(args[2]);
        let effectData = actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "ef27f042-ba6d-4ff4-ac2b-4ca6ff611c17");
        let castLevel = await effectData?.getFlag('gambits-premades', 'asCastLevel');
    
        const rangeCheck = MidiQOL.findNearby(null, token, 5, { includeToken: false });
        if (rangeCheck.length > 0) {
            for(let target of rangeCheck) {
                let turn = game.combat.round + '-' + game.combat.turn;
                let lastTurn = await effectData?.getFlag('gambits-premades', 'ashardalonsStrideTurn.' + target.id + '.turn');
                if (turn === lastTurn) continue;
                await effectData.setFlag('gambits-premades', 'ashardalonsStrideTurn.' + target.id + '.turn', turn);

                let numDie = (castLevel - 2) * 1;
                let activityToUpdate = item.system.activities.find(a => a.identifier === "syntheticDamage");
                if(activityToUpdate.damage.parts[0]?.number !== numDie) {
                    let damageParts = foundry.utils.duplicate(activityToUpdate.damage.parts);
                    damageParts[0].number = numDie;
                    await game.gps.socket.executeAsUser("gpsActivityUpdate", gmUser, { activityUuid: activityToUpdate.uuid, updates: {"damage.parts": damageParts} });
                }
                await game.gps.socket.executeAsUser("gpsActivityUse", gmUser, {itemUuid: item.uuid, identifier: "syntheticDamage", targetUuid: target.document.uuid});
            
                game.gps.animation.ashardalonsStride({type: "damage", token: target, itemUuid: item.uuid});
            }
        }
    }
    
    if(args[0] === "off") {
        Sequencer.EffectManager.endEffects({name: `${token.id}_ashardalonsStride`});
    }
}
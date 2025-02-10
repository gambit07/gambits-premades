export async function ashardalonsStride({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "preItemRoll" && !game.combat) {
        ui.notifications.warn("Ashardalon's Stride requires an active combat.");
        return workflow.aborted = true;
    }
    if(args[0].macroPass === "preActiveEffects") {
        let cprConfig = game.gps.getCprConfig({itemUuid: item.uuid});
        const { animEnabled } = cprConfig;
    
        if(animEnabled) {
            new Sequence()
                .effect()
                .attachTo(token, {offset:{x: 0, y: -30}, local: true})
                .file("animated-spell-effects-cartoon.fire.30")
                .scaleToObject(2)
                .name(`${token.id}_ashardalonsStride`)
                .belowTokens()
                .persist()
                .play()
        }
    
        let castLevel = workflow.castData.castLevel;
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
                "gambits-premades": {"gpsUuid": "ef27f042-ba6d-4ff4-ac2b-4ca6ff611c17", "castLevel": castLevel}
            }
        }
        ];
    
        let effectName = await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: actor.uuid, effects: effectData });
        await hasConcApplied.addDependent(effectName[0]);
    }

    if(args[0] === "on") {
        let item = await fromUuid(args[2]);
        let cprConfig = game.gps.getCprConfig({itemUuid: item.uuid});
        const { animEnabled } = cprConfig;
        let originActor = await fromUuid(args[3]);
        let originToken = await MidiQOL.tokenForActor(originActor);
        let targetActor = actor;
        let targetToken = token;
        if(originActor.uuid === targetActor.uuid) return;
        let effectData = originActor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "ef27f042-ba6d-4ff4-ac2b-4ca6ff611c17");

        let turn = game.combat.round + '-' + game.combat.turn;
        let lastTurn = await effectData?.getFlag('gambits-premades', 'ashardalonsStrideTurn.' + targetToken.id + '.turn');
        if (turn === lastTurn) return;
        await effectData.setFlag('gambits-premades', 'ashardalonsStrideTurn.' + targetToken.id + '.turn', turn);
    
        const itemData = {
            name: "Ashardalon's Stride - Damage (Fire)",
            type: "feat",
            img: item.img
        }
    
        let castLevel = await effectData?.getFlag('gambits-premades', 'castLevel');
        let numDie = (castLevel - 2) * 1;
        let damageRoll = await new CONFIG.Dice.DamageRoll(`${numDie}d6`, {}, {type: "fire", properties: ["mgc"]}).evaluate();
        await MidiQOL.displayDSNForRoll(damageRoll, 'damageRoll');
        new MidiQOL.DamageOnlyWorkflow(originActor, originToken, damageRoll.total, "fire", [targetToken], damageRoll, {itemData: itemData, flavor: "Ashardalon's Stride - Damage (Fire)"});
    
        if(animEnabled) {
        new Sequence()
            .effect()
            .atLocation(targetToken)
            .file("animated-spell-effects-cartoon.fire.16")
            .scaleToObject(1.3)
            .play()
        }
    }

    if(args[0] === "each") {
        let item = await fromUuid(args[2]);
        let cprConfig = game.gps.getCprConfig({itemUuid: item.uuid});
        const { animEnabled } = cprConfig;
        let effectData = actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "ef27f042-ba6d-4ff4-ac2b-4ca6ff611c17");
        let castLevel = await effectData?.getFlag('gambits-premades', 'castLevel');
    
        const rangeCheck = MidiQOL.findNearby(null, token, 5, { includeToken: false });
        if (rangeCheck.length > 0) {
            for(let target of rangeCheck) {
                let turn = game.combat.round + '-' + game.combat.turn;
                let lastTurn = await effectData?.getFlag('gambits-premades', 'ashardalonsStrideTurn.' + target.id + '.turn');
                if (turn === lastTurn) continue;
                await effectData.setFlag('gambits-premades', 'ashardalonsStrideTurn.' + target.id + '.turn', turn);
            
                const itemData = {
                    name: "Ashardalon's Stride - Damage (Fire)",
                    type: "feat",
                    img: item.img
                }

                let numDie = (castLevel - 2) * 1;
                let damageRoll = await new CONFIG.Dice.DamageRoll(`${numDie}d6`, {}, {type: "fire", properties: ["mgc"]}).evaluate();
                await MidiQOL.displayDSNForRoll(damageRoll, 'damageRoll');
                new MidiQOL.DamageOnlyWorkflow(actor, token, damageRoll.total, "fire", [target], damageRoll, {itemData: itemData, flavor: "Ashardalon's Stride - Damage (Fire)"});
            
                if(animEnabled) {
                new Sequence()
                    .effect()
                    .atLocation(target)
                    .file("animated-spell-effects-cartoon.fire.16")
                    .scaleToObject(1.3)
                    .play()
                }
            }
        }
    }
    
    if(args[0] === "off") {
        Sequencer.EffectManager.endEffects({name: `${token.id}_ashardalonsStride`});
    }
}
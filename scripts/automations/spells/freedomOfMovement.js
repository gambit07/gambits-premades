export async function freedomOfMovement({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    let gmUser = game.gps.getPrimaryGM();
    let targets = workflow.targets;
    let effectData = 
    [
        {
            "name": item.name,
            "img": item.img,
            "origin": item.uuid,
            "type": "base",
            "system": {},
            "changes": [
                {
                "key": "system.attributes.movement.ignoredDifficultTerrain",
                "mode": 5,
                "value": "all",
                "priority": 99
                },
                {
                "key": "system.attributes.movement.burrow",
                "mode": 5,
                "value": actor._source.system.attributes.movement.burrow ? actor._source.system.attributes.movement.burrow : 0,
                "priority": 99
                },
                {
                "key": "system.attributes.movement.climb",
                "mode": 5,
                "value": actor._source.system.attributes.movement.climb ? actor._source.system.attributes.movement.climb : 0,
                "priority": 99
                },
                {
                "key": "system.attributes.movement.fly",
                "mode": 5,
                "value": actor._source.system.attributes.movement.fly ? actor._source.system.attributes.movement.fly : 0,
                "priority": 99
                },
                {
                "key": "system.attributes.movement.swim",
                "mode": 5,
                "value": actor._source.system.attributes.movement.swim ? actor._source.system.attributes.movement.swim : actor._source.system.attributes.movement.walk ? actor._source.system.attributes.movement.walk : 30,
                "priority": 99
                },
                {
                "key": "system.attributes.movement.walk",
                "mode": 5,
                "value": actor._source.system.attributes.movement.walk ? actor._source.system.attributes.movement.walk : 30,
                "priority": 99
                },
                {
                "key": "system.traits.ci.value",
                "mode": 0,
                "value": "paralyzed",
                "priority": 99
                },
                {
                "key": "system.traits.ci.value",
                "mode": 0,
                "value": "restrained",
                "priority": 99
                }
            ],
            "disabled": false,
            "duration": {
                "seconds": 3600
            },
            "transfer": false,
        }
    ];

    for (let target of targets) {
        await MidiQOL.socket().executeAsUser("createEffects", gmUser, { actorUuid: target.actor.uuid, effects: effectData });
    }
}
export async function biohazard({tokenUuid, regionUuid, regionScenario, regionStatus}) {
    const helpers = await import('../helpers.js');
    let region = await fromUuid(regionUuid);

    let template;
    if(region?.flags["region-attacher"]?.attachedTemplate) {
        template = await fromUuid(region.flags["region-attacher"].attachedTemplate);
    }
    else return;
    
    let tokenDocument = await fromUuid(tokenUuid);
    let token = tokenDocument?.object;
    if(!token || !region || !regionScenario) return;
    if (!MidiQOL.isTargetable(token)) return;

    if ((token.actor.type !== 'npc' && token.actor.type !== 'character')) return;

    let validatedRegionMovement = helpers.validateRegionMovement({ regionScenario: regionScenario, regionStatus: regionStatus, regionUuid: regionUuid, tokenUuid: tokenUuid });
    const { validRegionMovement, validReroute } = validatedRegionMovement;
    if(!validRegionMovement) return;

    let chosenItem = await fromUuid(region.flags["region-attacher"].itemUuid);
    let itemProperName = chosenItem?.name;
    
    let browserUser = MidiQOL.playerForActor(token.actor);
    if (!browserUser.active) {
        browserUser = game.users?.activeGM;
    }

    const effectOriginActor = await fromUuid(region.flags["region-attacher"].actorUuid);

    const damageType = "poison";
    const spellDC = effectOriginActor.system.attributes.spelldc;
    let saveAbility = "con";
    let castLevel = template.getFlag("gambits-premades", "biohazardCastLevel");
    const damagedThisTurn = await region.getFlag("gambits-premades", "checkBiohazardRound");
    if(damagedThisTurn && damagedThisTurn === `${token.id}_${game.combat.round}`) return;

    const itemData = {
        name: itemProperName,
        type: "feat",
        img: "icons/magic/death/skull-poison-green.webp",
        flags: {
            "midi-qol": {
                noProvokeReaction: true,
                onUseMacroName: null,
                        forceCEOff: true
            },
            "midiProperties": {
                saveDamage: "nodam",
                magicdam: true,
                magiceffect: true
            },
        },
        system: {
            equipped: true,
            actionType: "save",
            save: { dc: spellDC, ability: saveAbility, scaling: "flat" },
            damage: { parts: [[`${castLevel}d8`, damageType]] },
            components: { concentration: false, material: false, ritual: false, somatic: false, value: "", vocal: false },
            duration: { units: "inst", value: undefined }
        },
    };
    const itemUpdate = new CONFIG.Item.documentClass(itemData, {parent: effectOriginActor});
    const options = { showFullCard: false, createWorkflow: true, versatile: false, configureDialog: false, targetUuids: [token.document.uuid], workflowOptions: {autoRollDamage: 'always', autoFastDamage: true} };
    const saveResult = await MidiQOL.completeItemUse(itemUpdate, {}, options);
    
    if (saveResult.failedSaves.size !== 0) {
        let effectData = [{
            "origin": effectOriginActor.uuid,
            "disabled": false,
            "name": "Biohazard - Poisoned",
            "img": "icons/magic/death/skull-poison-green.webp",
            "changes": [
            {
                "key": "macro.StatusEffect",
                "mode": 0,
                "value": "poisoned",
                "priority": 20
            }
            ],
            "transfer": false,
            "flags": {
                "dae": {
                    "specialDuration": [
                        "turnStart"
                    ]
                }
            }
        }];

        await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: token.actor.uuid, effects: effectData });
    }
    
    if(saveResult) {
        await region.setFlag("gambits-premades", "checkBiohazardRound", `${token.id}_${game.combat.round}`);
    }
}
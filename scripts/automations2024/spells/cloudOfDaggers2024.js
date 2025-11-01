export async function cloudOfDaggers2024({tokenUuid, regionUuid, regionScenario, movementScenario, regionStatus, speaker, actor, token, character, item, args, scope, workflow, options, userId}) {
    if(!game.combat) return ui.notifications.warn("Cloud of Daggers requires an active combat.")

    if(args?.[0]?.macroPass === "templatePlaced") {
        const template = await fromUuid(workflow.templateUuid);
        await template.setFlag("gambits-premades", "codCastLevel", workflow.castData.castLevel);
        game.gps.animation.cloudOfDaggers({template, itemUuid: workflow.item.uuid});
        return;
    }

    if(args?.[0].macroPass === "postActiveEffects") {
        if(workflow.targets.size > 0) {
            let damageDice =  (2*(workflow.castData.castLevel - 2)) + 4;
            let damageRoll = await new CONFIG.Dice.DamageRoll(`${damageDice}d4`, {}, {type: "slashing", properties: ["mgc"]}).evaluate();
            await MidiQOL.displayDSNForRoll(damageRoll, 'damageRoll');

            const itemDataDamage = {
                name: "Cloud of Daggers - Damage (Slashing)",
                type: "feat",
                img: item.img
            }

            await new MidiQOL.DamageOnlyWorkflow(actor, token, damageRoll.total, "slashing", workflow.targets ? workflow.targets : [], damageRoll, {itemData: itemDataDamage, flavor: "Cloud of Daggers - Damage (Slashing)"});
        }

        const template = await fromUuidSync(workflow.templateUuid);
        const templateId = template.id;
        let turn = game.combat.round + '-' + game.combat.turn;
        const region = await fromUuid(template.flags["region-attacher"]?.attachedRegion);
        for(let target of workflow.targets) {
            await region.setFlag('gambits-premades', 'spell.cloudOfDaggers.' + target.id + '.turn', turn);
        }

        let itemData = [{
            "name": `${item.name} - Move`,
            "type": "feat",
            "img": item.img,
            "system": {
                "description": {
                    "value": "<p>You can move your cloud of daggers up to 30 feet as a Magic action.</p>",
                    "chat": "",
                    "unidentified": ""
                },
                "activation": {
                    "type": "bonus",
                    "cost": 1
                },
                "actionType": "util",
                "type": {
                    "value": "class"
                },
                "activities": {
                    "cloudOfDaggersMove": {
                        "type": "utility",
                        "activation": {
                            "type": "action"
                        },
                        "consumption": {
                            "spellSlot": false
                        },
                        "duration": {
                            "units": "inst",
                            "concentration": false,
                        },
                        "range": {
                            "units": "self",
                        },
                        "target": {
                        "affects": {
                            "choice": false,
                            "type": "self"
                        }
                        },
                        "midiProperties": {
                            "forceDialog": false,
                            "automationOnly": false,
                            "otherActivityCompatible": true,
                        },
                        "name": "Cloud of Daggers - Move"
                    }
                }
            },
            "flags": {
                "midi-qol": {
                    "effectActivation": false,
                    "onUseMacroName": "[preActiveEffects]ItemMacro"
                },
                "gambits-premades": {
                    "gpsUuid": "920bfa86-2a3a-4e6a-ae7d-3d420c2c5992"
                },
                "dae": {
                "macro": {
                    "name": `${item.name} - Move`,
                    "img": item.img,
                    "type": "script",
                    "scope": "global",
                    "command": `
                        if(args[0].macroPass === \"preActiveEffects\") {
                            let template = canvas.templates.placeables.find(t => t.id === '${templateId}');

                            let config = {
                                gridHighlight: true,
                                icon: {texture: 'icons/svg/dice-target.svg', borderVisible: true},
                                location: {obj: template, limitMaxRange: 30, showRange: true},
                                snap: { position: CONST.GRID_SNAPPING_MODES.CENTER | CONST.GRID_SNAPPING_MODES.LEFT_SIDE_MIDPOINT }
                            }

                            actor.sheet.minimize();

                            let position = await Sequencer.Crosshair.show(config);

                            if(!position) return actor.sheet.maximize();

                            template.document.update({ x: position.x, y: position.y });

                            actor.sheet.maximize();
                        }
                    `
                }
                }
            }
        }];

        let itemCheck = actor.items.some(i => i.flags["gambits-premades"]?.gpsUuid === "920bfa86-2a3a-4e6a-ae7d-3d420c2c5992");
        if (!itemCheck) await actor.createEmbeddedDocuments("Item", itemData);
        ui.notifications.info(`Feature item "${item.name} - Move" created. Use this item to move your ${item.name} when needed.`)
        return;
    }

    if (args?.[0] === "off") {
        async function wait(ms) { return new Promise(resolve => { setTimeout(resolve, ms); }); }
        await wait(250);
        const originActor = await fromUuid(args[2]);
        let itemCheck = originActor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "920bfa86-2a3a-4e6a-ae7d-3d420c2c5992");
        item = originActor.items.find(i => i.identifier === "cloud-of-daggers");
        
        let effectCheck = originActor.appliedEffects.some(e => e.name === `${item.name}`);
        if(!effectCheck)
        {
            await originActor.deleteEmbeddedDocuments("Item", [itemCheck.id]);
        }
        return;
    }

    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    let itemName = "Cloud of Daggers";
    let gmUser = game.gps.getPrimaryGM();

    if(!regionUuid || !regionScenario || !tokenUuid) {
        if(debugEnabled) console.error(`No Region or Token found for ${itemName}`);
        return;
    }

    if(game.user.id !== userId) return;

    let tokenDocument = await fromUuid(tokenUuid);
    token = tokenDocument?.object;

    if (!MidiQOL.isTargetable(token)) {
        if(debugEnabled) console.error(`Token is not targetable for ${itemName}`);
        return;
    }
    if ((token.actor.type !== 'npc' && token.actor.type !== 'character')) {
        if(debugEnabled) console.error(`Token is not a character or creature for ${itemName}`);
        return;
    }

    let region = await fromUuid(regionUuid);
    let turn = game.combat.round + '-' + game.combat.turn;
    let lastTurn = region.flags['gambits-premades']?.spell?.cloudOfDaggers?.[token.id]?.turn;
    if (turn === lastTurn) {
        if(debugEnabled) console.error(`Token already damaged this round for ${itemName}`);
        return;
    }

    let template = await fromUuid(region.flags["region-attacher"]?.attachedTemplate)
    const effectOriginActor = await fromUuid(region.flags["region-attacher"]?.actorUuid);
    const effectOriginToken = await MidiQOL.tokenForActor(region.flags["region-attacher"]?.actorUuid);
    let chosenItem = await fromUuid(region.flags["region-attacher"]?.itemUuid);
    let castLevel = template.getFlag("gambits-premades", "codCastLevel");
    let damageDice = (2*(castLevel - 2)) + 4;

    let resumeMovement;
    if(regionScenario === "tokenEnter" && movementScenario) resumeMovement = await tokenDocument?.pauseMovement();

    await game.gps.socket.executeAsUser("gmSetFlag", gmUser, { flagDocumentUuid: region.uuid, key: 'spell.cloudOfDaggers.' + token.id + '.turn', value: turn });

    let damageRoll = await new CONFIG.Dice.DamageRoll(`${damageDice}d4`, {}, {type: "slashing", properties: ["mgc"]}).evaluate();
    await MidiQOL.displayDSNForRoll(damageRoll, 'damageRoll');

    const itemData = {
        name: "Cloud of Daggers - Damage (Slashing)",
        type: "feat",
        img: chosenItem.img
    }

    await new MidiQOL.DamageOnlyWorkflow(effectOriginActor, effectOriginToken, damageRoll.total, "slashing", token ? [token] : [], damageRoll, {itemData: itemData, flavor: "Cloud of Daggers - Damage (Slashing)"});
    if(regionScenario === "tokenEnter" && movementScenario) await resumeMovement();

    return;
}
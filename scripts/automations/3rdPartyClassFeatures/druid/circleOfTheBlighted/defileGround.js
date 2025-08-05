export async function defileGround({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "postActiveEffects") {
        const template = await fromUuidSync(args[0].templateUuid);
        const distanceTotal = actor.classes.druid?.system.levels < 10 ? 10 : 20;
        await template.update({distance:distanceTotal});
        const templateId = template.id;
        let itemData = [{
            "name": `${item.name} - Move`,
            "type": "feat",
            "img": item.img,
            "system": {
                "description": {
                    "value": "<p>You can move your defiled ground up to 30 feet as a bonus action.</p>",
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
                    "defileGroundMove": {
                        "type": "utility",
                        "activation": {
                            "type": "bonus"
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
                        "name": "Defile Ground - Move"
                    }
                }
            },
            "flags": {
                "midi-qol": {
                    "effectActivation": false,
                    "onUseMacroName": "[preActiveEffects]ItemMacro"
                },
                "gambits-premades": {
                    "gpsUuid": "f3bca81e-885d-4f45-aac4-c817eba4efc2"
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
                            location: {obj: template, limitMaxRange: 30, showRange: true}
                        }

                        let position = await Sequencer.Crosshair.show(config);

                        if(!position) return;

                        template.document.update({ x: position.x, y: position.y });
                        await MidiQOL.setBonusActionUsed(actor);
                    }`
                }
                }
            }
        }];

        let itemCheck = actor.items.some(i => i.flags["gambits-premades"]?.gpsUuid === "f3bca81e-885d-4f45-aac4-c817eba4efc2");
        if (!itemCheck) await actor.createEmbeddedDocuments("Item", itemData);
        
        new Sequence()
        .effect()
            .attachTo(template)
            .persist()
            .scale(2)
            .belowTokens()
            .file("jb2a.ground_cracks.green.03")
        .play()
    }

    if (args[0].macroPass === "isDamaged") {
        if(workflow.flavor === 'Blighted Ground Damage') return;
        const currentRound = game.combat.round;
        const currentTurn = game.combat.turn;
        let defileGroundTurnDamage = await token.actor.getFlag("midi-qol", "defileGroundTurnDamage");
        if(defileGroundTurnDamage && defileGroundTurnDamage === `${currentRound}${currentTurn}`) return;
        const dieAmount = item.parent.classes.druid?.system.levels >= 14 ? "1d8" : (item.parent.classes.druid?.system.levels >= 10 ? "1d6" : "1d4")
        let damageRoll = await new CONFIG.Dice.DamageRoll(`${dieAmount}`, {}, {type: "necrotic", properties: ["mgc"]}).evaluate();
        await MidiQOL.displayDSNForRoll(damageRoll, 'damageRoll')

        const itemData = {
            name: "Defile Ground - Damage (Necrotic)",
            type: "feat",
            img: item.img
        }

        new MidiQOL.DamageOnlyWorkflow(workflow.actor, workflow.token, damageRoll.total, "necrotic", token ? [token] : [], damageRoll, {itemData: itemData, flavor: "Defile Ground - Damage (Necrotic)"});
        await MidiQOL.socket().executeAsGM('_gmSetFlag', { actorUuid : token.actor.uuid, base : 'midi-qol', key : 'defileGroundTurnDamage', value : `${currentRound}${currentTurn}` });
        return;
    }

    if (args[0] === "off") {
        const originActor = await fromUuid(args[2]);
        let itemCheck = originActor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "f3bca81e-885d-4f45-aac4-c817eba4efc2");
        item = originActor.items.find(i => i.identifier === "defile-ground");
        
        let effectCheck = originActor.appliedEffects.find(e => e.name === `${item.name} Template`);
        if(!effectCheck)
        {
            await originActor.deleteEmbeddedDocuments("Item", [itemCheck.id]);

            async function removeEffectFromAll() {
                for (const token of canvas.tokens.placeables) {
                    const actor = token.actor;
                    if (!actor) continue;

                    let getFlag = await token.actor.getFlag("midi-qol", "defileGroundTurnDamage");
                    if(getFlag) MidiQOL.socket().executeAsGM('_gmUnsetFlag', { actorUuid : token.actor.uuid, base : 'midi-qol', key : 'defileGroundTurnDamage' })
                }
            }

            removeEffectFromAll();
        }
    }
}
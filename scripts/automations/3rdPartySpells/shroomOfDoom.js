export async function shroomOfDoom({ speaker, actor, token, character, item, args, scope, workflow, options, macroItem }) {
    if(args[0].macroPass === "postSave") {
        let target = workflow.failedSaves.first();
        if (!target) return;
        let shroomRoll = await new CONFIG.Dice.DamageRoll(`1d8`).evaluate();
        await MidiQOL.displayDSNForRoll(shroomRoll, 'damageRoll');
        let shroomTotal = shroomRoll.total;
        let content = `The creature has ${shroomTotal} mushroom${shroomTotal > 1 ? "s" : ""} created on their body with Shroom of Doom.`
        let actorPlayer = MidiQOL.playerForActor(actor);

        let chatData = {
            user: actorPlayer.id,
            speaker: ChatMessage.getSpeaker({ token: token }),
            content: content
        };
        ChatMessage.create(chatData);

        await MidiQOL.socket().executeAsGM('_gmSetFlag', { actorUuid : target.actor.uuid, base : 'midi-qol', key : 'shroomTotal', value : shroomTotal });
        let castLevel = workflow.castData.castLevel - 1;

        new Sequence()
            .effect()
                .name(`${target.id}.ShroomOfDoom`)
                .file("jb2a.plant_growth.01.round.2x2.loop.bluepurple")
                .attachTo(target,{bindVisibility: true})
                .scaleToObject(1.2)
                .opacity(0.85)
                .zIndex(0)
                .mask(target)
                .persist()
                .belowTokens(false)
                .fadeIn(2500)
                .fadeOut(2500)
        .play()

        let itemData = [{
            "name": `${macroItem.name} - Remove Shroom`,
            "type": "feat",
            "img": macroItem.img,
            "system": {
                "activation": {
                    "type": "bonus",
                    "cost": 1
                },
                "target": {
                    "value": 1,
                    "type": "ally"
                },
                "range": {
                    "units": "touch"
                },
                "type": {
                    "value": "feat",
                    "subtype": ""
                },
                "activities": {
                    "shroomOfDoomRemove": {
                        "type": "damage",
                        "activation": {
                            "type": "bonus",
                            "override": true,
                        },
                        "consumption": {
                            "spellSlot": false
                        },
                        "duration": {
                            "units": "inst",
                            "concentration": false,
                            "override": false
                        },
                        "range": {
                            "override": true,
                            "units": "touch"
                        },
                        "target": {
                            "affects": {
                                "choice": false,
                                "count": "1",
                                "type": "ally"
                            },
                            "override": true,
                        },
                        "damage": {
                            "parts": [{
                                "number": castLevel,
                                "denomination": 4,
                                "types": [
                                    "poison"
                                ]
                            }]
                        },
                        "midiProperties": {
                            "triggeredActivityId": "none",
                            "otherActivityCompatible": false
                        }
                    }
                }
            },
            "flags": {
                "midi-qol": {
                    "onUseMacroName": "[preDamageRoll]ItemMacro"
                },
                "gambits-premades": {
                    "gpsUuid": "f8767d4c-54c6-4bca-8cb4-b87b5f626b42"
                },
                "dae": {
                    "macro": {
                        "name": `${macroItem.name} - Remove Shroom`,
                        "img": macroItem.img,
                        "type": "script",
                        "scope": "global",
                        "command": "if(args[0].macroPass === \"preDamageRoll\") {\n    let target = workflow.hitTargets.first();\n    let effectData = target.actor.appliedEffects.find(e => e.flags[\"gambits-premades\"]?.gpsUuid === \"df28df0d-f063-4690-be42-9edf2b938255\");\n    if(!effectData) {\n        ui.notifications.warn(\"This actor is not effected by Shroom of Doom\")\n        return workflow.aborted = true;\n    }\n    let shroomTotal = await target.actor.getFlag(\"midi-qol\", \"shroomTotal\") - 1;\n    if(shroomTotal === 0) {\n        await MidiQOL.socket().executeAsGM(\"removeEffects\", { actorUuid: target.actor.uuid, effects: [effectData.id] });\n        await MidiQOL.socket().executeAsGM('_gmUnsetFlag', { actorUuid : target.actor.uuid, base : 'midi-qol', key : 'shroomTotal' });\n    }\n    else {\n        await MidiQOL.socket().executeAsGM('_gmSetFlag', { actorUuid : target.actor.uuid, base : 'midi-qol', key : 'shroomTotal', value : shroomTotal });\n    }\n}"
                    }
                }
            }
            }];

        let validTargets = canvas.tokens.placeables.filter(t => {
            if (t.document.disposition !== target.document.disposition) return;
            return t;
        });

        if (validTargets.length === 0) return;
        
        for(let target of validTargets) {
            let hasItem = target.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "f8767d4c-54c6-4bca-8cb4-b87b5f626b42");
            if(hasItem) await hasItem.delete();
            await target.actor.createEmbeddedDocuments("Item", itemData);
        }
    }

    if(args[0] === "off") {
        await MidiQOL.socket().executeAsGM('_gmUnsetFlag', { actorUuid : token.actor.uuid, base : 'midi-qol', key : 'shroomTotal' });
        Sequencer.EffectManager.endEffects({ name: `${token.id}.ShroomOfDoom` });

        let targets = canvas.tokens.placeables.filter(t => {
            if (t.document.disposition !== token.document.disposition) return;
            if (!t.actor.items.some(i => i.flags["gambits-premades"]?.gpsUuid === "f8767d4c-54c6-4bca-8cb4-b87b5f626b42")) return;
            return t;
        });

        if (targets.length === 0) return;

        for(let target of targets) {
            let hasItem = target.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "f8767d4c-54c6-4bca-8cb4-b87b5f626b42");
            if(hasItem) await hasItem.delete();
        }
    }
}
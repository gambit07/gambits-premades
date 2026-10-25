export async function graspingArrow({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args?.[0].macroPass === "postPreambleComplete") {
        let target = workflow.targets.first();
        if(!target) return;
        if(game.gps.getCprConfig({itemUuid: item.uuid}).animEnabled && game.modules.get("jaamod")?.active) {

        let seq0 = new Sequence()
            .effect()
            .name(`${target.id}.GraspingArrow`)
            .file("jaamod.spells_effects.vines4")
            .attachTo(target,{bindVisibility: true})
            .scaleToObject(1.2)
            .opacity(0.85)
            .zIndex(0)
            .mask(target)
            .persist()
            .belowTokens(false)
            .fadeIn(2500)
            .fadeOut(2500)
            
        await seq0.play();
        }

        let intMod = actor.system.abilities.int.mod;
        let profMod = actor.system.attributes.prof;
        let itemData = [game.gps.disableBlfxAutoRecognition({
            "name": "Grasping Arrow - Remove Vines",
            "type": "feat",
            "img": item.img,
            "system": {
            "activation": {
                "type": "action",
                "cost": 1,
                "condition": ""
            },
            "target": {
                "value": 1,
                "width": null,
                "units": "",
                "type": "ally",
                "prompt": true
            },
            "range": {
                "value": null,
                "long": null,
                "units": "touch"
            },
            "actionType": "other",
            "type": {
                "value": "feat",
                "subtype": ""
            },
            "activities": {
                "gpsGraspRemove01": {
                    "type": "utility",
                    "_id": "gpsGraspRemove01",
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
                        "value": "5",
                        "units": "ft",
                    },
                    "target": {
                        "affects": {
                            "choice": false,
                            "type": "any"
                        }
                    },
                    "midiProperties": {
                        "forceDialog": false,
                        "automationOnly": false,
                        "otherActivityCompatible": true,
                    },
                    "name": "Grasping Arrow - Remove Vines"
                }
            }
            },
            "flags": {
                autoanimations: {isEnabled: false, version: 5},
                "midi-qol": {
                    "onUseMacroName": "[preActiveEffects]ItemMacro"
                },
                "gambits-premades": {
                    "gpsUuid": "72bc5660-235c-4190-8aa2-4d23a3a592e3",
                    "sourceItemUuid": item.uuid,
                    "targetUuid": target.document.uuid
                },
                "dae": {
                    "macro": {
                        "name": "Grasping Arrow - Remove Vines",
                        "img": "icons/magic/nature/root-vine-entangled-humanoid.webp",
                        "type": "script",
                        "scope": "global",
                        "command": `if(args[0].macroPass === "preActiveEffects") {
                            const target = await fromUuid(macroItem.getFlag("gambits-premades", "targetUuid"));
                            if(!target?.object || !game.gps.withinRange(token, target.object, 5)) return;
                            const effects = target.actor.appliedEffects.filter(effect => DAE.effectMatchesSource(effect, macroItem.getFlag("gambits-premades", "sourceItemUuid")) && effect.name.startsWith("Grasping Arrow"));
                            if(!effects.length) return;
                            const [roll] = await actor.rollAbilityCheck({ability: "str"}) ?? [];
                            if(roll?.total >= ${8 + intMod + profMod}) await MidiQOL.socket().executeAsGM("removeEffects", {actorUuid: target.actor.uuid, effects: effects.map(effect => effect.id)});
                        }`
                    }
                }
            }
            })];

        let targets = [...new Map(canvas.tokens.placeables.filter(t => t.actor).map(t => [t.actor.uuid, t])).values()];

        if (targets.length === 0) return;
            
        for(let target of targets) {
            let hasItem = target.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "72bc5660-235c-4190-8aa2-4d23a3a592e3" && i.flags["gambits-premades"].sourceItemUuid === item.uuid && i.flags["gambits-premades"].targetUuid === (workflow?.targets?.first()?.document.uuid ?? token.document.uuid));
            if(hasItem) await target.actor.deleteEmbeddedDocuments("Item", [hasItem.id]);
            await target.actor.createEmbeddedDocuments("Item", itemData);
        }
    }

    if(args[0] === "off" && args?.[3]?.["expiry-reason"] !== "midi-qol:isMoved") {
        Sequencer.EffectManager.endEffects({ name: `${token.id}.GraspingArrow` });

        let targets = canvas.tokens.placeables.filter(t => {
            if (!t.actor.items.some(i => i.flags["gambits-premades"]?.gpsUuid === "72bc5660-235c-4190-8aa2-4d23a3a592e3" && i.flags["gambits-premades"].sourceItemUuid === item.uuid && i.flags["gambits-premades"].targetUuid === (workflow?.targets?.first()?.document.uuid ?? token.document.uuid))) return;
            return t;
        });

        let turnFlag = await actor.getFlag('gambits-premades', `graspingArrowTurnDamage.${item.id}`);
        if(turnFlag) await actor.unsetFlag('gambits-premades', `graspingArrowTurnDamage.${item.id}`);

        if (targets.length === 0) return;

        for(let target of targets) {
            let hasItem = target.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "72bc5660-235c-4190-8aa2-4d23a3a592e3" && i.flags["gambits-premades"].sourceItemUuid === item.uuid && i.flags["gambits-premades"].targetUuid === (workflow?.targets?.first()?.document.uuid ?? token.document.uuid));
            if(hasItem) await target.actor.deleteEmbeddedDocuments("Item", [hasItem.id]);
        }
    }

    if(args[0]=== "off" && args?.[3]?.["expiry-reason"] === "midi-qol:isMoved") {
        const effectOriginActor = await fromUuid(args[2]);
        let effectOriginToken = await MidiQOL.tokenForActor(effectOriginActor.uuid);
        let currentRound = game.combat?.round;
        let currentTurn = game.combat?.turn;
        let damageTurn = await actor.getFlag('gambits-premades', `graspingArrowTurnDamage.${item.id}`);
        if(damageTurn === `${game.combat?.id}:${currentRound}:${currentTurn}`) {
            let effectData = [{
            "origin": `${item.uuid}`,
            "duration": { value: 60, units: "seconds" },
            "disabled": false,
            "name": "Grasping Arrow - Movement",
            "img": item.img,
            system: { changes: [
                {
                "key": "macro.itemMacro",
                type: "custom",
                "value": `function.game.gps.graspingArrow ${effectOriginActor.uuid}`,
                "priority": 20
                }
            ] },
            "transfer": false,
            "flags": {
                "dae": {
                "specialDuration": [
                    "isMoved"
                ]
                }
            }
            }];

            await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: actor.uuid, effects: effectData });
            return;
        }

        let damageRoll = await new CONFIG.Dice.DamageRoll(`${effectOriginActor.system.scale["arcane-archer"]["arcane-shot-options"].formula}`, {}, {type: "slashing", properties: ["mgc"]}).evaluate();
        await MidiQOL.displayDSNForRoll(damageRoll, 'damageRoll');

        const itemData = {
            flags: {autoanimations: {isEnabled: false, version: 5}},
            name: "Grasping Arrow - Damage (Slashing)",
            type: "feat",
            img: item.img
        }

        await new MidiQOL.DamageOnlyWorkflow(effectOriginActor, effectOriginToken, damageRoll.total, 'slashing', token ? [token] : [], damageRoll, { itemData: itemData, flavor: "Grasping Arrow - Damage (Slashing)" });
        await actor.setFlag("gambits-premades", 'graspingArrowTurnDamage', `${game.combat?.id}:${currentRound}:${currentTurn}`);

        let effectData = [{
            "origin": `${item.uuid}`,
            "duration": { value: 60, units: "seconds" },
            "disabled": false,
            "name": "Grasping Arrow - Movement",
            "img": item.img,
            system: { changes: [
                {
                "key": "macro.itemMacro",
                type: "custom",
                "value": `function.game.gps.graspingArrow ${effectOriginActor.uuid}`,
                "priority": 20
                }
            ] },
            "transfer": false,
            "flags": {
                "dae": {
                "specialDuration": [
                    "isMoved"
                ]
                }
            }
        }];

        await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: actor.uuid, effects: effectData });
    }
}
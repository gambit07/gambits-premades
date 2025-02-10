export async function graspingArrow({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(!game.modules.get("jaamod")?.active) return ui.notifications.error("You must install the Jinkers Animated Art Pack module to use this automation.");
    if(args[0].macroPass === "preActiveEffects") {
        let target = workflow.targets.first();

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
            
        await seq0.play()

        let intMod = actor.system.abilities.int.mod;
        let profMod = actor.system.attributes.prof;
        let itemData = [{
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
                "graspingArrowRemove": {
                    "type": "utility",
                    "_id": "graspingArrowRemove",
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
                "midi-qol": {
                    "onUseMacroName": "[preActiveEffects]ItemMacro"
                },
                "gambits-premades": {
                    "gpsUuid": "72bc5660-235c-4190-8aa2-4d23a3a592e3"
                },
                "dae": {
                    "macro": {
                        "name": "Grasping Arrow - Remove Vines",
                        "img": "icons/magic/nature/root-vine-entangled-humanoid.webp",
                        "type": "script",
                        "scope": "global",
                        "command": `if(args[0].macroPass === \"preActiveEffects\") {\n  let target = workflow.targets.first();\n let effectNameMovement = target.actor.appliedEffects.find(effect => effect.name === 'Grasping Arrow - Movement'); let effectName = target.actor.appliedEffects.find(effect => effect.name === 'Grasping Arrow');\n    if(!effectName && !effectNameMovement) {\n        ui.notifications.warn(\"This actor is not effected by Grasping Arrow\")\n        return workflow.aborted = true;\n    } let saveRoll = await actor.rollAbilityTest('str'); if(saveRoll.total >= (8 + ${intMod} + ${profMod})) {await MidiQOL.socket().executeAsGM(\"removeEffects\", { actorUuid: target.actor.uuid, effects: [effectNameMovement.id] }); await MidiQOL.socket().executeAsGM(\"removeEffects\", { actorUuid: target.actor.uuid, effects: [effectName.id] }); let content = 'You successfully remove the vines from the target using your action.'; let actorPlayer = MidiQOL.playerForActor(actor); let chatData = {user: actorPlayer.id,speaker: ChatMessage.getSpeaker({ token: token }),content: content}; ChatMessage.create(chatData);} else{let content = 'You were unable to remove the vines from the target using your action.'; let actorPlayer = MidiQOL.playerForActor(actor); let chatData = {user: actorPlayer.id,speaker: ChatMessage.getSpeaker({ token: token }),content: content}; ChatMessage.create(chatData);} }`
                    }
                }
            }
            }];

        let targets = canvas.tokens.placeables.filter(t => {
            if (t.document.disposition === token.document.disposition) return;
            return t;
        });

        if (targets.length === 0) return;
            
        for(let target of targets) {
            let hasItem = target.actor.items.find(i => i.flags["gambits-premades"].gpsUuid === "72bc5660-235c-4190-8aa2-4d23a3a592e3");
            if(hasItem) await target.actor.deleteEmbeddedDocuments("Item", [hasItem.id]);
            await target.actor.createEmbeddedDocuments("Item", itemData);
        }
    }

    if(args[0].macroPass === "prePreambleComplete") {
        let itemUses = actor.items.find(i => i.flags["gambits-premades"].gpsUuid === "62e57050-5c6e-4fb1-82d2-ea9a289e7cf9");
        if(itemUses.system.uses?.spent >= itemUses.system.uses?.max) {
            ui.notifications.warn("You have no Arcane Shot uses remaining");
            workflow.aborted = true;
            return;
        }
        let itemValid = await actor.getFlag('gambits-premades', `arcaneShotValid`);
        if(!itemValid) {
            ui.notifications.warn("You must have hit with a bow prior to using this feature.");
            workflow.aborted = true;
            return;
        }
    }

    if(args[0] === "off" && args[3]["expiry-reason"] !== "midi-qol:isMoved") {
        Sequencer.EffectManager.endEffects({ name: `${token.id}.GraspingArrow` });

        let targets = canvas.tokens.placeables.filter(t => {
            if (t.document.disposition !== token.document.disposition) return;
            if (!t.actor.items.some(i => i.flags["gambits-premades"].gpsUuid === "72bc5660-235c-4190-8aa2-4d23a3a592e3")) return;
            return t;
        });

        let turnFlag = await actor.getFlag('gambits-premades', `graspingArrowTurnDamage`);
        if(turnFlag) await actor.unsetFlag('gambits-premades', `graspingArrowTurnDamage`);

        if (targets.length === 0) return;

        for(let target of targets) {
            let hasItem = target.actor.items.find(i => i.flags["gambits-premades"].gpsUuid === "72bc5660-235c-4190-8aa2-4d23a3a592e3");
            if(hasItem) await target.actor.deleteEmbeddedDocuments("Item", [hasItem.id]);
        }
    }

    if(args[0]=== "off" && args[3]["expiry-reason"] === "midi-qol:isMoved") {
        const effectOriginActor = await fromUuid(args[2]);
        let effectOriginToken = await MidiQOL.tokenForActor(effectOriginActor.uuid);
        let currentRound = game.combat.round;
        let currentTurn = game.combat.turn;
        let damageTurn = await actor.getFlag('gambits-premades', `graspingArrowTurnDamage`);
        if(damageTurn === `${currentRound}${currentTurn}`) {
            let effectData = [{
            "origin": `${item.uuid}`,
            "duration": {
                "seconds": 60
            },
            "disabled": false,
            "name": "Grasping Arrow - Movement",
            "img": item.img,
            "changes": [
                {
                "key": "macro.itemMacro",
                "mode": 0,
                "value": `${effectOriginActor.uuid}`,
                "priority": 20
                }
            ],
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

        let damageRoll = await new CONFIG.Dice.DamageRoll(`${actor.system.scale["arcane-archer"]["arcane-shot-options"].formula}`, {}, {type: "slashing", properties: ["mgc"]}).evaluate();
        await MidiQOL.displayDSNForRoll(damageRoll, 'damageRoll');

        const itemData = {
            name: "Grasping Arrow - Damage (Slashing)",
            type: "feat",
            img: item.img
        }

        await new MidiQOL.DamageOnlyWorkflow(effectOriginActor, effectOriginToken, damageRoll.total, 'slashing', token ? [token] : [], damageRoll, { itemData: itemData, flavor: "Grasping Arrow - Damage (Slashing)" });
        await actor.setFlag("gambits-premades", 'graspingArrowTurnDamage', `${currentRound}${currentTurn}`);

        let effectData = [{
            "origin": `${item.uuid}`,
            "duration": {
                "seconds": 60
            },
            "disabled": false,
            "name": "Grasping Arrow - Movement",
            "img": item.img,
            "changes": [
                {
                "key": "macro.itemMacro",
                "mode": 0,
                "value": `${effectOriginActor.uuid}`,
                "priority": 20
                }
            ],
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
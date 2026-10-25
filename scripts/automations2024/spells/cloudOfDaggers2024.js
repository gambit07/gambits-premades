export async function cloudOfDaggers2024({tokenUuid, regionUuid, regionScenario, movementScenario, regionStatus, speaker, actor, token, character, item, args, scope, workflow, options, userId}) {
    if(args?.[0] === "off") {
        const originActor = await fromUuid(args[2]);
        if(!originActor) return;
        const legacyItems = originActor.items.filter(candidate => candidate.flags["gambits-premades"]?.gpsUuid === "920bfa86-2a3a-4e6a-ae7d-3d420c2c5992"
            && !candidate.flags["gambits-premades"]?.cloudOfDaggersRegion);
        if(legacyItems.length) await originActor.deleteEmbeddedDocuments("Item", legacyItems.map(candidate => candidate.id));
        return;
    }
    if(args?.[0] === "on") return;
    if(!game.combat) return ui.notifications.warn(game.i18n.format("GAMBITSPREMADES.Notifications.Common.RequiresActiveCombat", { effectName: workflow?.item?.name ?? item?.name ?? game.i18n.localize("GAMBITSPREMADES.Notifications.Common.ThisEffect") }))

    if(args?.[0]?.macroPass === "templatePlaced") {
        const template = await fromUuid(workflow.templateUuid);
        game.gps.animation.cloudOfDaggers({template, itemUuid: workflow.item.uuid});
        return;
    }

    if(args?.[0]?.macroPass === "postActiveEffects") {
        if(!workflow || workflow.aborted) return;
        const region = await fromUuid(workflow.templateUuid);
        if(region?.documentName !== "Region") return;
        const regionUuid = region.uuid;
        const turn = game.gps.regionTurnKey();
        const targets = Array.from(region.tokens, document => document.object).filter(target =>
            target?.actor && (target.actor.type === "npc" || target.actor.type === "character") && MidiQOL.isTargetable(target)
            && region.getFlag("gambits-premades", `spell.cloudOfDaggers.${target.id}.turn`) !== turn);
        if(targets.length > 0) {
            let damageDice =  (2*(workflow.castData.castLevel - 2)) + 4;
            let damageRoll = await new CONFIG.Dice.DamageRoll(`${damageDice}d4`, {}, {type: "slashing", properties: ["mgc"]}).evaluate();
            await MidiQOL.displayDSNForRoll(damageRoll, 'damageRoll');

            const itemDataDamage = {
                flags: {autoanimations: {isEnabled: false, version: 5}},
                name: "Cloud of Daggers - Damage (Slashing)",
                type: "feat",
                img: item.img
            }

            for(const target of targets) {
                await game.gps.queryUser("gmSetFlag", game.gps.getPrimaryGM(), {flagDocumentUuid: regionUuid, key: `spell.cloudOfDaggers.${target.id}.turn`, value: turn});
            }
            const damage = new MidiQOL.DamageOnlyWorkflow(actor, token, damageRoll.total, "slashing", targets, damageRoll, {itemData: itemDataDamage, flavor: "Cloud of Daggers - Damage (Slashing)"});
            damage.activity.updateSource({"activation.type": "special", "activation.override": true});
            await damage.ready;
        }

        let itemData = [game.gps.disableBlfxAutoRecognition({
            "name": `${item.name} - Move`,
            "type": "feat",
            "img": item.img,
            "system": {
                "description": {
                    "value": "<p>You can move your cloud of daggers up to 30 feet as a Magic action.</p>",
                    "chat": "",
                    "unidentified": ""
                },
                "type": {
                    "value": "class"
                },
                "activities": {
                    "gpsDaggersMove01": {
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
                autoanimations: {isEnabled: false, version: 5},
                "midi-qol": {
                    "effectActivation": false,
                    "onUseMacroName": "[preActiveEffects]ItemMacro"
                },
                "gambits-premades": {
                    "gpsUuid": "920bfa86-2a3a-4e6a-ae7d-3d420c2c5992",
                    "cloudOfDaggersRegion": regionUuid
                },
                "dnd5e": { "dependentOn": regionUuid },
                "dae": {
                "macro": {
                    "name": `${item.name} - Move`,
                    "img": item.img,
                    "type": "script",
                    "scope": "global",
                    "command": `
                        if(args[0].macroPass === \"preActiveEffects\") {
                            let region = await fromUuid('${regionUuid}');
                            if (!region) return;

                            let config = {
                                gridHighlight: true,
                                icon: {texture: 'icons/svg/dice-target.svg', borderVisible: true},
                                location: {obj: region.object, limitMaxRange: game.gps.convertFromFeet({range: 30}), showRange: true}
                            }

                            await actor.sheet.minimize();
                            try {
                                const position = await Sequencer.Crosshair.show(config);
                                if(position) await game.gps.moveRegion({ regionUuid: region.uuid, x: position.x, y: position.y });
                            } finally {
                                await actor.sheet.maximize();
                            }
                        }
                    `
                }
                }
            }
        })];

        const staleItems = actor.items.filter(candidate => candidate.flags["gambits-premades"]?.gpsUuid === "920bfa86-2a3a-4e6a-ae7d-3d420c2c5992"
            && !candidate.flags["gambits-premades"]?.cloudOfDaggersRegion);
        if(staleItems.length) await actor.deleteEmbeddedDocuments("Item", staleItems.map(candidate => candidate.id));
        let itemCheck = actor.items.some(candidate => candidate.flags["gambits-premades"]?.cloudOfDaggersRegion === regionUuid);
        if (!itemCheck) await actor.createEmbeddedDocuments("Item", itemData);
        ui.notifications.info(game.i18n.format("GAMBITSPREMADES.Notifications.Automations2024.Spells.CloudOfDaggers2024.MoveFeatureItemCreated", { name: item.name, name2: item.name }))
        return;
    }

    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    let itemName = "Cloud of Daggers";
    let gmUser = game.gps.getPrimaryGM();

    if(!regionUuid || !regionScenario || !tokenUuid) {
        if(debugEnabled) game.gps.logInfo(`No Region or Token found for ${itemName}`);
        return;
    }

    if(game.user.id !== game.gps.regionEventUser(regionScenario, userId)) return;

    let tokenDocument = await fromUuid(tokenUuid);
    token = tokenDocument?.object;
    if(!token?.actor) return;

    if (!MidiQOL.isTargetable(token)) {
        if(debugEnabled) game.gps.logInfo(`Token is not targetable for ${itemName}`);
        return;
    }
    if ((token.actor.type !== 'npc' && token.actor.type !== 'character')) {
        if(debugEnabled) game.gps.logInfo(`Token is not a character or creature for ${itemName}`);
        return;
    }

    let region = await fromUuid(regionUuid);
    if(!region) return;
    let turn = game.gps.regionTurnKey();
    let lastTurn = region.flags['gambits-premades']?.spell?.cloudOfDaggers?.[token.id]?.turn;
    if (turn === lastTurn) {
        if(debugEnabled) game.gps.logInfo(`Token already damaged this round for ${itemName}`);
        return;
    }

    let template = region
    const effectOriginActor = game.gps.getRegionActor(region);
    const effectOriginToken = fromUuidSync(region.getFlag("dnd5e", "origin"))?.object;
    let chosenItem = await fromUuid(region.getFlag("dnd5e", "item"));
    if(!chosenItem || !effectOriginActor) return;
    let castLevel = template.getFlag("dnd5e", "spellLevel");
    let damageDice = (2*(castLevel - 2)) + 4;

    let resumeMovement;
    try {
    if(regionScenario === "tokenEnter" && movementScenario) resumeMovement = await tokenDocument?.pauseMovement();

    await game.gps.queryUser("gmSetFlag", gmUser, { flagDocumentUuid: region.uuid, key: 'spell.cloudOfDaggers.' + token.id + '.turn', value: turn });

    let damageRoll = await new CONFIG.Dice.DamageRoll(`${damageDice}d4`, {}, {type: "slashing", properties: ["mgc"]}).evaluate();
    await MidiQOL.displayDSNForRoll(damageRoll, 'damageRoll');

    const itemData = {
        flags: {autoanimations: {isEnabled: false, version: 5}},
        name: "Cloud of Daggers - Damage (Slashing)",
        type: "feat",
        img: chosenItem.img
    }

    const damage = new MidiQOL.DamageOnlyWorkflow(effectOriginActor, effectOriginToken, damageRoll.total, "slashing", [token], damageRoll, {itemData: itemData, flavor: "Cloud of Daggers - Damage (Slashing)"});
    damage.activity.updateSource({"activation.type": "special", "activation.override": true});
    await damage.ready;
    if(regionScenario === "tokenEnter" && movementScenario) await resume();

    return;
    } finally { await resume(); }
    async function resume() {
        const callback = resumeMovement;
        resumeMovement = undefined;
        await callback?.();
    }
}

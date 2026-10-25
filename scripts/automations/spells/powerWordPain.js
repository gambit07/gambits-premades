export async function powerWordPain({ speaker, actor, token, character, item, args, scope, workflow, options, macroItem }) {
    if(args[0].macroPass === "postPreambleComplete") {
        const targets = workflow.targets;
        for(let target of targets) {
            if(target.actor.system.attributes.hp.value > 100 || target.actor.system.traits.ci.value.has("charmed")) {
                ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Spells.PowerWordPain.TargetMoreThan100"));
                continue;
            }
            else {
                let gmUser = game.gps.getPrimaryGM();
                let effectData = [
                {
                    "name": item.name,
                    "origin": item.uuid,
                    "duration": { value: 99999, units: "seconds" },
                    "disabled": false,
                    "img": item.img,
                    system: { changes: [
                        {
                            "key": "macro.itemMacro",
                            type: "custom",
                            "value": "function.game.gps.powerWordPain @itemUuid",
                            "priority": 20
                        },
                        ...game.gps.movementSpeedChanges("10", 90),
                        {
                            "key": "attack",
                            type: "dnd5e.advantage",
                            "value": "-1",
                            "priority": 100
                        },
                        {
                            "key": "check",
                            type: "dnd5e.advantage",
                            "value": "-1",
                            "priority": 100
                        },
                        {
                            "key": "system.abilities.cha.save.roll.mode",
                            type: "add",
                            "value": -1,
                            "priority": 20
                        },
                        {
                            "key": "system.abilities.dex.save.roll.mode",
                            type: "add",
                            "value": -1,
                            "priority": 20
                        },
                        {
                            "key": "system.abilities.int.save.roll.mode",
                            type: "add",
                            "value": -1,
                            "priority": 20
                        },
                        {
                            "key": "system.abilities.str.save.roll.mode",
                            type: "add",
                            "value": -1,
                            "priority": 20
                        },
                        {
                            "key": "system.abilities.wis.save.roll.mode",
                            type: "add",
                            "value": -1,
                            "priority": 20
                        },
                        {
                            "key": "flags.midi-qol.onUseMacroName",
                            type: "custom",
                            "value": "function.game.gps.powerWordPain, prePreambleComplete",
                            "priority": 20
                        }
                    ] },
                    "transfer": false,
                    "flags": {
                        "dae": {
                            "macroRepeat": "endEveryTurn",
                            "selfTarget": false,
                            "selfTargetAlways": false,
                            "dontApply": false
                        },
                        "gambits-premades": {
                            "gpsUuid": "8f94b11e-3c8b-49c3-ae73-07c3e03670de"
                        }
                    }
                }];

                await MidiQOL.socket().executeAsUser("createEffects", gmUser, { actorUuid: target.actor.uuid, effects: effectData });
            }
        }
    }
    else if(args[0].macroPass === "prePreambleComplete") {
        if(workflow.item.type !== "spell") return;
        let gmUser = game.gps.getPrimaryGM();
        let saveRoll = await game.gps.queryUser("gpsActivityUse", gmUser, {itemUuid: macroItem.uuid, identifier: "syntheticSave", targetUuid: token.document.uuid});
        if(saveRoll?.failedSaves?.size !== 0) {
            workflow.aborted = true;
            ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Spells.PowerWordPain.UnableSave"));
        }
    }
    else if (args[0] === "each" && args[3].turn === "endTurn") {
        item = await fromUuid(args[2]);
        let gmUser = game.gps.getPrimaryGM();
        let saveRoll = await game.gps.queryUser("gpsActivityUse", gmUser, {itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: token.document.uuid});
        if(saveRoll?.failedSaves?.size === 0) {
            let effectData = await token.actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "8f94b11e-3c8b-49c3-ae73-07c3e03670de");
            await effectData.delete();
        }
    }
}
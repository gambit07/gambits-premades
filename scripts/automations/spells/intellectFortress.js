export async function intellectFortress({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "prePreambleComplete") {
        let targets = Array.from(workflow.targets.values());
        if(targets.length <= 1) return;
        
        let castTargets = workflow.castData.castLevel - 2;
        const castLevel = workflow.castData.castLevel;
        const spellSlotKey = `spell${castLevel}`;
        const spellSlotPath = `system.spells.${spellSlotKey}.value`
        const currentValue = actor.system.spells[spellSlotKey]?.value;
        const currentMax = actor.system.spells[spellSlotKey]?.max;

        if(targets.length > castTargets) {
            ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Spells.IntellectFortress.SelectedMoreTokensThan"));
            if(currentValue < currentMax) await actor.update({[spellSlotPath]: currentValue + 1})

            let targets = Array.from(workflow.targets.values());
            if(targets.length <= 1) return;

            if(targets.length > castTargets) {
                ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Spells.IntellectFortress.SelectedMoreTokensThan"));
                if(currentValue < currentMax) await actor.update({[spellSlotPath]: currentValue + 1})
                const hasConcApplied = MidiQOL.getConcentrationEffect(actor, item.uuid)
                if (hasConcApplied)	await hasConcApplied.delete();
                return workflow.aborted = true;
            }

            let isNearby = false;

            for (const target of targets) {
                if(actor.uuid === target.actor.uuid) continue;
                let canSee = MidiQOL.canSee(target,token);
                if(!canSee) {
                    ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Spells.IntellectFortress.UnableSee"));
                    if(currentValue < currentMax) await actor.update({[spellSlotPath]: currentValue + 1})
                    return workflow.aborted = true;
                }
                const nearbyTargets = MidiQOL.findNearby(null, target, 30, { includeToken: false });

                for (const nearbyTarget of nearbyTargets) {
                    if (targets.some(t => t.id === nearbyTarget.id)) {
                        isNearby = true;
                        break;
                    }
                }

                if (isNearby) {
                    break;
                }

                if (!isNearby) {
                    ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Spells.IntellectFortress.TargetsNotWithinRange"));
                    if(currentValue < currentMax) await actor.update({[spellSlotPath]: currentValue + 1})
                    return workflow.aborted = true;
                }
            }
            return workflow.aborted = true;
        }

        else {
            let isNearby = false;

            for (const target of targets) {
                if(actor.uuid === target.actor.uuid) continue;
                let canSee = MidiQOL.canSee(target,token);
                if(!canSee) {
                    ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Spells.IntellectFortress.UnableSee"));
                    if(currentValue < currentMax) await actor.update({[spellSlotPath]: currentValue + 1})
                    return workflow.aborted = true;
                }
                const nearbyTargets = MidiQOL.findNearby(null, target, 30, { includeToken: false });

                for (const nearbyTarget of nearbyTargets) {
                    if (targets.some(t => t.id === nearbyTarget.id)) {
                        isNearby = true;
                        break;
                    }
                }

                if (isNearby) {
                    break;
                }
            }

            if (!isNearby) {
                ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Spells.IntellectFortress.TargetsNotWithinRange"));
                if(currentValue < currentMax) await actor.update({[spellSlotPath]: currentValue + 1})
                return workflow.aborted = true;
            }
        }
    }
}
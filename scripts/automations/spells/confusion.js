import {effectToken} from "../../utils/effectTargetUtils.js";

export async function confusion({actor, token, item, args, workflow}, directions = ["North", "South", "East", "West", "Northwest", "Northeast", "Southwest", "Southeast"]) {
    const context = args.at(-1);
    const targetDocument = args[0] === "each" ? effectToken(token, context, actor) : null;
    const applied = args[0] === "each" ? actor.effects.get(context.effectId) : null;
    if(args[0] === "each" && (!targetDocument || !applied?.active)) return;
    async function updateConfusionEffect(changeType) {
        const findEffect = applied;
        if(changeType === true) {
            const newChange = {
                key: "system.attributes.movement.speeds.walk",
                type: "override",
                value: 0,
                priority: 20
            };

            const updatedChanges = [...findEffect.system.changes, newChange];
            await findEffect.update({ system: { changes: updatedChanges } });
        }

        if(changeType === false) {
            const removeChanges = findEffect.system.changes.filter(change =>
                !(change.key === "system.attributes.movement.speeds.walk" && change.type === "override" && Number(change.value) === 0)
            );

            if (findEffect.system.changes.length !== removeChanges.length) {
                await findEffect.update({ system: { changes: removeChanges } });
            }
        }
    }

    async function handleConfusionEffect() {
        await updateConfusionEffect(false)

        await game.gps.addReaction({actorUuid: `${actor.uuid}`});

        const confusionRoll = await new CONFIG.Dice.DamageRoll(`1d10`).evaluate();
        await MidiQOL.displayDSNForRoll(confusionRoll, 'damageRoll');
        const result = confusionRoll.total;

        let content;
        let content1;
        let directionContent;

        if (result === 1) {
            const directionRoll = await new CONFIG.Dice.DamageRoll(`1d${directions.length}`).evaluate();
            await MidiQOL.displayDSNForRoll(directionRoll, 'damageRoll');
            const directionResult = directionRoll.total;
            directionContent = directions[directionResult - 1];
            const directionLabel = game.i18n.localize(`GAMBITSPREMADES.Directions.${directionContent}`);
            const walkSpeedFeet = actor.system.attributes.movement.speeds.walk;
            const moved = await game.gps.queryGM("moveTokenByCardinal", {targetUuid: targetDocument.uuid, distance: walkSpeedFeet, direction: directionContent });

            content1 = game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.Spells.Confusion.MovementRoll", { rollResult: directionResult, direction: directionLabel });

            if(moved === false) content1 += " " + game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.Spells.Confusion.ResolveMovement");
            let actorPlayer = MidiQOL.playerForActor(actor);
            let chatData = {
                user: actorPlayer.id,
                speaker: ChatMessage.getSpeaker({actor, token: targetDocument}),
                content: content1,
                roll: directionRoll
            };
            ChatMessage.create(chatData);
        } else if (result < 7) {
            content = game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.Spells.Confusion.NoMoveOrActions");
            await updateConfusionEffect(true)
        } else if (result < 9) {
            const rangeCheck = targetDocument.object ? canvas.tokens.placeables.filter(target => target.id !== targetDocument.id && target.actor && actor.items.some(weapon => weapon.system.equipped && weapon.system.activities?.some(activity => activity.actionType === "mwak" && MidiQOL.checkActivityRange(activity, targetDocument, new Set([target]), false).result !== "fail"))) : [];
            if(rangeCheck.length > 0) {
                const randomSelection = rangeCheck[Math.floor(Math.random() * rangeCheck.length)];
                content = game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.Spells.Confusion.MustMoveAndMeleeAttack", { targetName: randomSelection.actor.name });
                let target = randomSelection;
                if(game.gps.getCprConfig({itemUuid: typeof args?.[2] === "string" ? args[2] : item.uuid}).animEnabled) {
                    new Sequence()
                    .effect()
                    .copySprite(target)
                    .belowTokens()
                    .attachTo(target, {locale: true})
                    .scaleToObject(1, {considerTokenScale:true})
                    .spriteRotation(target.rotation*-1)
                    .filter("Glow", { color: 0x911a1a, distance: 15 })
                    .duration(30000)
                    .fadeIn(2000, {delay:1000})
                    .fadeOut(3500, {ease: "easeInSine"})
                    .opacity(0.8)
                    .zIndex(0.1)
                    .loopProperty("alphaFilter", "alpha", { values: [0.5, 0], duration: 1000, pingPong: true ,delay:500})

                    .effect()
                    .file("jb2a.extras.tmfx.outflow.circle.01")
                    .attachTo(target, {locale: true})
                    .scaleToObject(3, {considerTokenScale:false})
                    .randomRotation()
                    .duration(30000)
                    .fadeIn(5000, {delay:1000})
                    .fadeOut(3500, {ease: "easeInSine"})
                    .scaleIn(0, 3500, {ease: "easeInOutCubic"})
                    .tint(0x870101)
                    .opacity(0.5)
                    .belowTokens()
                    .play()
                }
            }
            else {
                content = game.i18n.localize(`GAMBITSPREMADES.ChatMessages.Automations.Spells.Confusion.${targetDocument.object ? "NoAction" : "ResolveMelee"}`);
            }
        } else {
            content = game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.Spells.Confusion.ActNormally");
        }

        if(content) {
            let actorPlayer = MidiQOL.playerForActor(actor);
            let chatData = {
                user: actorPlayer.id,
                speaker: ChatMessage.getSpeaker({actor, token: targetDocument}),
                content: `${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.Spells.Confusion.RollForIs", { actorName: actor.name, result: result })}<br>${content}`
            };
            ChatMessage.create(chatData);
        }
    }
    if (args[0] === "each" && context.turn === "startTurn") {
        await handleConfusionEffect();
    }
    else if (args[0] === "each" && context.turn === "endTurn") {
        const effectData = applied;

        if(!item || !effectData) return;
        const saveResult = await game.gps.gpsActivityUse({itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: targetDocument.uuid});

        if (!saveResult || saveResult.aborted) return;
        if (saveResult.failedSaves.size === 0) {
            await effectData.delete();
        }
        else {
            let cprConfig = game.gps.getCprConfig({itemUuid: item.uuid});
            const { animEnabled } = cprConfig;
            if(animEnabled && targetDocument.object) {
                new Sequence()

                .effect()
                .atLocation(targetDocument.object)
                .file("jaamod.misc.qm")
                .filter("ColorMatrix", { hue:60, saturate:1, contrast: 1 })
                .scaleToObject(1.5)

                .play();
            }
        }
    }
    else if(args[0].macroPass === "postAllRollsComplete") {
        const template = workflow.templateUuid ? await fromUuid(workflow.templateUuid) : null;
        if(!workflow.failedSaves.count) {
            const hasConcApplied = MidiQOL.getConcentrationEffect(actor, item.uuid)
            if (hasConcApplied)	await hasConcApplied.delete();
        }
        else {
            let cprConfig = game.gps.getCprConfig({itemUuid: item.uuid});
            const { animEnabled } = cprConfig;
            if(animEnabled && template?.object) {
                new Sequence()
                .effect()
                .atLocation(template.object)
                .file("jaamod.misc.qm")
                .filter("ColorMatrix", { hue:60, saturate:1, contrast: 1 })
                .scaleToObject(1.5)

                .play();
            }
        }

        await template?.delete();
    }
}

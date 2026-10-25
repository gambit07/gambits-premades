export async function confusion2024({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    async function updateConfusionEffect(actor, changeType) {
        const findEffect = actor.appliedEffects.find(e => e.name === "Confusion" && DAE.effectMatchesSource(e, typeof args?.[2] === "string" ? args[2] : item.uuid));
        if (!findEffect) {
            console.log(game.i18n.localize("GAMBITSPREMADES.Debug.Automations.Spells.Confusion.EffectNotFound"));
            return;
        }
    
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
                !(change.key === "system.attributes.movement.speeds.walk" && change.type === "override" && change.value === 0)
            );
    
            if (findEffect.system.changes.length !== removeChanges.length) {
                await findEffect.update({ system: { changes: removeChanges } });
            }
        }
    }
    
    async function handleConfusionEffect(token) {
        await updateConfusionEffect(token.actor, false)
    
        await game.gps.addReaction({actorUuid: `${token.actor.uuid}`});
    
        const confusionRoll = await new CONFIG.Dice.DamageRoll(`1d10`).evaluate();
        await MidiQOL.displayDSNForRoll(confusionRoll, 'damageRoll');
        const result = confusionRoll.total;
    
        let content;
        let content1;
        let directionContent;
    
        if (result === 1) {
            const directionRoll = await new CONFIG.Dice.DamageRoll(`1d4`).evaluate();
            await MidiQOL.displayDSNForRoll(directionRoll, 'damageRoll');
            const directionResult = directionRoll.total;
            const directions = ["North", "South", "East", "West"];
            directionContent = directions[directionResult - 1];
            const directionLabel = game.i18n.localize(`GAMBITSPREMADES.Directions.${directionContent}`);
            const walkSpeedFeet = token.actor.system.attributes.movement.speeds.walk;
            await game.gps.queryGM("moveTokenByCardinal", {targetUuid: token.document.uuid, distance: walkSpeedFeet, direction: directionContent });
    
            content1 = game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.Spells.Confusion.MovementRoll", { rollResult: directionResult, direction: directionLabel });
    
            let actorPlayer = MidiQOL.playerForActor(token.actor);
            let chatData = {
                user: actorPlayer.id,
                speaker: ChatMessage.getSpeaker({ token: token }),
                content: content1,
                roll: directionRoll
            };
            ChatMessage.create(chatData);
        } else if (result < 7) {
            content = game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.Spells.Confusion.NoMoveOrActions");
            await updateConfusionEffect(token.actor, true)
        } else if (result < 9) {
            const rangeCheck = canvas.tokens.placeables.filter(target => target.id !== token.id && target.actor && token.actor.items.some(weapon => weapon.system.equipped && weapon.system.activities?.some(activity => activity.actionType === "mwak" && MidiQOL.checkRange(activity, token, new Set([target]), false).result !== "fail")));
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
            content = game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.Spells.Confusion.NoAction");
            }
        } else {
            content = game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.Spells.Confusion.ActNormally");
        }
    
        if(content) {
            let actorPlayer = MidiQOL.playerForActor(token.actor);
            let chatData = {
                user: actorPlayer.id,
                speaker: ChatMessage.getSpeaker({ token: token }),
                content: `${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.Spells.Confusion.RollForIs", { actorName: token.actor.name, result: result })}<br>${content}`
            };
            ChatMessage.create(chatData);
        }
    }
    if (args[0] === "each" && args[4].turn === "startTurn") {
        await handleConfusionEffect(token);
    }
    else if (args[0] === "each" && args[4].turn === "endTurn") {
        const effectData = actor.appliedEffects.find(e => e.name === "Confusion" && DAE.effectMatchesSource(e, typeof args?.[2] === "string" ? args[2] : item.uuid));
        item = await fromUuid(args[2]);

        if(!item || !effectData) return;
        const saveResult = await game.gps.gpsActivityUse({itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: token.document.uuid});
    
        if (!saveResult) return;
        if (saveResult.failedSaves.size === 0) {
            await effectData.delete();
        }
        else {
            let cprConfig = game.gps.getCprConfig({itemUuid: item.uuid});
            const { animEnabled } = cprConfig;
            if(animEnabled) {
                new Sequence()
    
                .effect()
                .atLocation(token)
                .file("jaamod.misc.qm")
                .filter("ColorMatrix", { hue:60, saturate:1, contrast: 1 })
                .scaleToObject(1.5)
    
                .play();
            }
        }
    }
    else if(args[0].macroPass === "postAllRollsComplete") {
        let template = await fromUuid(workflow.templateUuid);
        if(!workflow.failedSaves.size) {
            const hasConcApplied = MidiQOL.getConcentrationEffect(actor, item.uuid)
            if (hasConcApplied)	await hasConcApplied.delete();
        }
        else {
            let cprConfig = game.gps.getCprConfig({itemUuid: item.uuid});
            const { animEnabled } = cprConfig;
            if(animEnabled) {
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

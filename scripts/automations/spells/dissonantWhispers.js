export async function dissonantWhispers({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if (args[0].macroPass === "postActiveEffects") {
        const targets = workflow.hitTargets;
        const gmUser = game.gps.getPrimaryGM();
        for(let target of targets) {
            const targetMovementSpeed = target.actor.system.attributes.movement.walk;
            const damageType = "psychic";
            const attackNum = Math.floor(workflow.castData.castLevel + 2);
            const hasDeafened = target.document.hasStatusEffect("deafened");
            const hasReactionUsed = MidiQOL.hasUsedReaction(target.actor);
            let actorPlayer = MidiQOL.playerForActor(token.actor);
            let content = `<span style='text-wrap: wrap;'>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.Spells.DissonantWhispers.TargetAutoSaveSuccess")}<br><img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`;

            if (hasDeafened) {
                let chatData = {
                    user: actorPlayer.id,
                    speaker: ChatMessage.getSpeaker({ token: token }),
                    content: game.i18n.localize(content)
                };
                ChatMessage.create(chatData);
                let damageRoll = await new CONFIG.Dice.DamageRoll(`${attackNum}d6 / 2`, {}, {type: "psychic", properties: ["mgc"]}).evaluate();
                await MidiQOL.displayDSNForRoll(damageRoll,'damageRoll');
                damageRoll.total = Math.floor(damageRoll.total);
                damageRoll._total = Math.floor(damageRoll.total);

                const itemData = {
                    name: "Dissonant Whispers - Damage (Psychic)",
                    type: "feat",
                    img: item.img,
                }

                await new MidiQOL.DamageOnlyWorkflow(actor, token, damageRoll.total, damageType, target ? [target] : [], damageRoll, {itemData: itemData, flavor: "Dissonant Whispers - Damage (Psychic)"});
            }
            else
            {
                let cprConfig = game.gps.getCprConfig({itemUuid: item.uuid});
                const { animEnabled } = cprConfig;
                if(animEnabled) {
                    new Sequence()
                    .effect()
                        .file("jb2a.spell_projectile.music_note.greenyellow")
                        .atLocation(token)
                        .stretchTo(target)
                        .filter("Glow", { color: 0x006400 })

                    .effect()
                        .file("jb2a.soundwave.01.green")
                        .attachTo(target, {locale: true})
                        .scaleToObject(1.2, {considerTokenScale:true})
                        .randomRotation()
                        .duration(5000)
                        .fadeIn(1000)
                        .fadeOut(1000, {ease: "easeInSine"})
                        .filter("Glow", { color: 0x006400 })
                    .play()
                }

                let activityToUpdate = item.system.activities.find(a => a.identifier === "syntheticSave");
                let damageParts = foundry.utils.duplicate(activityToUpdate.damage.parts);
                let castDamage = (workflow.castData.castLevel - 1) + 3;
                damageParts[0].number = castDamage;

                await game.gps.socket.executeAsUser("gpsActivityUpdate", gmUser, { activityUuid: activityToUpdate.uuid, updates: {"damage.parts": damageParts} });
                const saveResult = await game.gps.gpsActivityUse({itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: target.document.uuid});

                if (saveResult.failedSaves.size === 1) {
                    if(!hasReactionUsed) await game.gps.socket.executeAsGM("addReaction", {actorUuid: `${target.actor.uuid}`});

                    await game.gps.socket.executeAsGM("moveTokenByOriginPoint", {originX: token.center.x, originY: token.center.y, targetUuid: target.document.uuid, distance: targetMovementSpeed });

                    let chatData = {
                        user: gmUser,
                        speaker: ChatMessage.getSpeaker({ token: token }),
                        content: game.i18n.localize(`The target moved ${targetMovementSpeed} feet away from ${token.actor.name}. The target doesn't move into obviously dangerous ground, adjust the movement if this occurs.`)
                    };
                    ChatMessage.create(chatData);
                }
            }
        }
    }
}
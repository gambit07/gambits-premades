export async function dissonantWhispers2024({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if (args[0].macroPass === "postActiveEffects") {
        const targets = workflow.hitTargets;
        const gmUser = game.gps.getPrimaryGM();
        for(let target of targets) {
            const targetMovementSpeed = target.actor.system.attributes.movement.walk;
            const hasReactionUsed = MidiQOL.hasUsedReaction(target.actor);

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
                if(!hasReactionUsed) await game.gps.addReaction({actorUuid: `${target.actor.uuid}`});

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
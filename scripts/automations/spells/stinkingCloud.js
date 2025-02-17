export async function stinkingCloud({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if (args[0].macroPass === "preActiveEffects") {
        return await AAHelpers.applyTemplate(args);
    }
    else if(args[0].macroPass === "templatePlaced")
    {
        const template = await fromUuid(workflow.templateUuid);

        new Sequence()
            .effect()
            .atLocation(template)
            .file("jb2a.fog_cloud.02.green") //Change animation you'd like to use here
            .scaleToObject()
            .tieToDocuments(template)
            .belowTokens()
            .mask()
            .persist()
            .play()
    }
    else if(args[0] === "each") {
        const uuid = actor.uuid;
        const ci = actor.system.traits.ci.value.has("poisoned");

        if(!ci) {
            const saveResult = await game.gps.gpsActivityUse({itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: token.document.uuid});

            if (saveResult.failedSaves.size === 1) {
                const effectData = [
                {
                    "name": "Asphyxiated",
                    "icon": "icons/svg/stoned.svg",
                    "duration": {
                        "seconds": 6
                    },
                    "description": "An asphyxiated creature must spend their action retching and reeling"
                }
                ];
                await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: uuid, effects: effectData });
                let browserUser = MidiQOL.playerForActor(actor);
                let chatData = {
                    user: browserUser.id,
                    speaker: ChatMessage.getSpeaker({ token: token }),
                    content: "You are asphyxiated by the noxious gas and lose your action this turn retching and reeling.",
                };
                ChatMessage.create(chatData);
            }
        }
        else {
            let browserUser = MidiQOL.playerForActor(actor);
            let chatData = {
                user: browserUser.id,
                speaker: ChatMessage.getSpeaker({ token: token }),
                content: "The noxious gas does not seem to bother you at all."
            };
            ChatMessage.create(chatData);
        }
    }
}
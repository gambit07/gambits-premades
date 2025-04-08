export async function stinkingCloud({tokenUuid, regionUuid, regionScenario, regionStatus, speaker, actor, character, item, args, scope, workflow, options}) {
    if(!game.combat) return ui.notifications.warn("Stinking Cloud requires an active combat.")

    if(args?.[0]?.macroPass === "templatePlaced") {
        const template = await fromUuid(workflow.templateUuid);
        let cprConfig = game.gps.getCprConfig({itemUuid: workflow.item.uuid});
        const { animEnabled } = cprConfig;
        if(animEnabled) {
            new Sequence()
                .effect()
                    .atLocation(template)
                    .file("jb2a.fog_cloud.02.green")
                    .scaleToObject()
                    .tieToDocuments(template)
                    .belowTokens()
                    .mask()
                    .persist()
            .play()
        }
    }

    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    let itemName = "Stinking Cloud";

    if(!tokenUuid || !regionUuid || !regionScenario) {
        if(debugEnabled) console.error(`No Region or Token found for ${itemName}`);
        return;
    }

    let region = await fromUuid(regionUuid);
    let template = await fromUuid(region.flags["region-attacher"].attachedTemplate)
    let tokenDocument = await fromUuid(tokenUuid);
    let token = tokenDocument?.object;

    if (!MidiQOL.isTargetable(token)) {
        if(debugEnabled) console.error(`Token is not targetable for ${itemName}`);
        return;
    }
    if ((token.actor.type !== 'npc' && token.actor.type !== 'character')) {
        if(debugEnabled) console.error(`Token is not a character or creature for ${itemName}`);
        return;
    }

    let validatedRegionMovement = game.gps.validateRegionMovement({ regionScenario: regionScenario, regionStatus: regionStatus, regionUuid: regionUuid, tokenUuid: tokenUuid, validExit: false });
    const { validRegionMovement, validReroute } = validatedRegionMovement;
    if(!validRegionMovement) {
        if(debugEnabled) console.error(`No valid region movement for ${itemName}`);
        return;
    }

    let chosenItem = await fromUuid(region.flags["region-attacher"].itemUuid);

    let turn = game.combat.round + '-' + game.combat.turn;
    let lastTurn = region.flags['gambits-premades']?.spell?.stinkingCloud?.[token.id]?.turn;
    if (turn === lastTurn) {
        if(debugEnabled) console.error(`Token already made a saving throw this round for ${itemName}`);
        return;
    }

    await region.setFlag('gambits-premades', 'spell.stinkingCloud.' + token.id + '.turn', turn);

    const saveResult = await game.gps.gpsActivityUse({itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: token.document.uuid});
    if(!saveResult) return;
    
    if (saveResult.failedSaves.size !== 0) {
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
        await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: token.actor.uuid, effects: effectData });
        let browserUser = MidiQOL.playerForActor(token.actor);
        let chatData = {
            user: browserUser.id,
            speaker: ChatMessage.getSpeaker({ token: token }),
            content: "You are asphyxiated by the noxious gas and lose your action this turn retching and reeling.",
        };
        ChatMessage.create(chatData);
    }
    return;
}
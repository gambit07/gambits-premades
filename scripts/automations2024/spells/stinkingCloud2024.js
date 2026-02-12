export async function stinkingCloud2024({tokenUuid, regionUuid, regionScenario, regionStatus, speaker, actor, character, item, args, scope, workflow, options}) {
    if(!game.combat) return ui.notifications.warn("Stinking Cloud requires an active combat.")

    if(args?.[0]?.macroPass === "templatePlaced") {
        const template = await fromUuid(workflow.templateUuid);
        game.gps.animation.stinkingCloud({template, itemUuid: workflow.item.uuid});
    }

    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    let itemName = "Stinking Cloud";

    if(!tokenUuid || !regionUuid || !regionScenario) {
        if(debugEnabled) game.gps.logInfo(`No Region or Token found for ${itemName}`);
        return;
    }

    let region = await fromUuid(regionUuid);
    let tokenDocument = await fromUuid(tokenUuid);
    let token = tokenDocument?.object;

    if (!MidiQOL.isTargetable(token)) {
        if(debugEnabled) game.gps.logInfo(`Token is not targetable for ${itemName}`);
        return;
    }
    if ((token.actor.type !== 'npc' && token.actor.type !== 'character')) {
        if(debugEnabled) game.gps.logInfo(`Token is not a character or creature for ${itemName}`);
        return;
    }

    let chosenItem = await fromUuid(region.flags["region-attacher"].itemUuid);

    let turn = game.combat.round + '-' + game.combat.turn;
    let lastTurn = region.flags['gambits-premades']?.spell?.stinkingCloud?.[token.id]?.turn;
    if (turn === lastTurn) {
        if(debugEnabled) game.gps.logInfo(`Token already made a saving throw this round for ${itemName}`);
        return;
    }

    await region.setFlag('gambits-premades', 'spell.stinkingCloud.' + token.id + '.turn', turn);

    const saveResult = await game.gps.gpsActivityUse({itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: token.document.uuid});
    if(!saveResult) return;
    
    if (saveResult.failedSaves.size !== 0) {
        let browserUser = MidiQOL.playerForActor(token.actor);
        let chatData = {
            user: browserUser.id,
            speaker: ChatMessage.getSpeaker({ token: token }),
            content: "You are asphyxiated by the noxious gas and lose your action and bonus action this turn retching and reeling.",
        };
        ChatMessage.create(chatData);
    }
    return;
}
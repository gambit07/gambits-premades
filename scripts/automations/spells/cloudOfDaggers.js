export async function cloudOfDaggers({tokenUuid, regionUuid, regionScenario, regionStatus, speaker, actor, character, item, args, scope, workflow, options, userId}) {
    if(!game.combat) return ui.notifications.warn(game.i18n.format("GAMBITSPREMADES.Notifications.Common.RequiresActiveCombat", { effectName: workflow?.item?.name ?? item?.name ?? game.i18n.localize("GAMBITSPREMADES.Notifications.Common.ThisEffect") }))

    if(args?.[0]?.macroPass === "templatePlaced") {
        const template = await fromUuid(workflow.templateUuid);
        await template.setFlag("gambits-premades", "codCastLevel", workflow.castData.castLevel);
        game.gps.animation.cloudOfDaggers({template, itemUuid: workflow.item.uuid});
        return;
    }

    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    let itemName = "Cloud of Daggers";
    let gmUser = game.gps.getPrimaryGM();

    if(!tokenUuid || !regionUuid || !regionScenario) {
        if(debugEnabled) game.gps.logInfo(`No Region or Token found for ${itemName}`);
        return;
    }

    if(game.user.id !== userId) return;

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

    let region = await fromUuid(regionUuid);
    let template = await fromUuid(region.flags["region-attacher"].attachedTemplate)

    const effectOriginActor = await fromUuid(region.flags["region-attacher"].actorUuid);
    const effectOriginToken = await MidiQOL.tokenForActor(region.flags["region-attacher"].actorUuid);
    let chosenItem = await fromUuid(region.flags["region-attacher"].itemUuid);

    let turn = game.combat.round + '-' + game.combat.turn;
    let lastTurn = region.flags['gambits-premades']?.spell?.cloudOfDaggers?.[token.id]?.turn;
    if (turn === lastTurn) {
        if(debugEnabled) game.gps.logInfo(`Token already damaged this round for ${itemName}`);
        return;
    }

    let resumeMovement;
    if(regionScenario === "tokenEnter") resumeMovement = await tokenDocument.pauseMovement();

    await game.gps.socket.executeAsUser("gmSetFlag", gmUser, { flagDocumentUuid: region.uuid, key: 'spell.cloudOfDaggers.' + token.id + '.turn', value: turn });

    let castLevel = template.getFlag("gambits-premades", "codCastLevel");

    let damageDice =  (2*(castLevel - 2)) + 4;
    let damageRoll = await new CONFIG.Dice.DamageRoll(`${damageDice}d4`, {}, {type: "slashing", properties: ["mgc"]}).evaluate();
    await MidiQOL.displayDSNForRoll(damageRoll, 'damageRoll');

    const itemData = {
        name: "Cloud of Daggers - Damage (Slashing)",
        type: "feat",
        img: chosenItem.img
    }

    await new MidiQOL.DamageOnlyWorkflow(effectOriginActor, effectOriginToken, damageRoll.total, "slashing", token ? [token] : [], damageRoll, {itemData: itemData, flavor: "Cloud of Daggers - Damage (Slashing)"});
    if(regionScenario === "tokenEnter") await resumeMovement();
    return;
}

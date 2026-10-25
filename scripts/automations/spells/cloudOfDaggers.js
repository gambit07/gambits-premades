export async function cloudOfDaggers({tokenUuid, regionUuid, regionScenario, regionStatus, speaker, actor, character, item, args, scope, workflow, options, userId}) {
    if(!game.combat) return ui.notifications.warn(game.i18n.format("GAMBITSPREMADES.Notifications.Common.RequiresActiveCombat", { effectName: workflow?.item?.name ?? item?.name ?? game.i18n.localize("GAMBITSPREMADES.Notifications.Common.ThisEffect") }))

    if(args?.[0]?.macroPass === "templatePlaced") {
        const template = await fromUuid(workflow.templateUuid);
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

    if(game.user.id !== game.gps.regionEventUser(regionScenario, userId)) return;

    let tokenDocument = fromUuidSync(tokenUuid);
    let token = tokenDocument?.object;
    if(!token?.actor) return;

    if (!MidiQOL.isTargetable(token)) {
        if(debugEnabled) game.gps.logInfo(`Token is not targetable for ${itemName}`);
        return;
    }
    if ((token.actor.type !== 'npc' && token.actor.type !== 'character')) {
        if(debugEnabled) game.gps.logInfo(`Token is not a character or creature for ${itemName}`);
        return;
    }

    let region = fromUuidSync(regionUuid);
    let template = region

    if(!region) return;

    let turn = game.gps.regionTurnKey();
    let lastTurn = region.flags['gambits-premades']?.spell?.cloudOfDaggers?.[token.id]?.turn;
    if (turn === lastTurn) {
        if(debugEnabled) game.gps.logInfo(`Token already damaged this round for ${itemName}`);
        return;
    }

    const effectOriginActor = game.gps.getRegionActor(region);
    const effectOriginToken = fromUuidSync(region.getFlag("dnd5e", "origin"))?.object;
    let chosenItem = await fromUuid(region.getFlag("dnd5e", "item"));
    if(!chosenItem || !effectOriginActor) return;

    let resumeMovement;
    try {
    if(regionScenario === "tokenEnter") resumeMovement = tokenDocument.pauseMovement();

    await game.gps.queryUser("gmSetFlag", gmUser, { flagDocumentUuid: region.uuid, key: 'spell.cloudOfDaggers.' + token.id + '.turn', value: turn });

    let castLevel = template.getFlag("dnd5e", "spellLevel");

    let damageDice =  (2*(castLevel - 2)) + 4;
    let damageRoll = await new CONFIG.Dice.DamageRoll(`${damageDice}d4`, {}, {type: "slashing", properties: ["mgc"]}).evaluate();
    await MidiQOL.displayDSNForRoll(damageRoll, 'damageRoll');

    const itemData = {
        flags: {autoanimations: {isEnabled: false, version: 5}},
        name: "Cloud of Daggers - Damage (Slashing)",
        type: "feat",
        img: chosenItem.img
    }

    const damage = new MidiQOL.DamageOnlyWorkflow(effectOriginActor, effectOriginToken, damageRoll.total, "slashing", [token], damageRoll, {itemData: itemData, flavor: "Cloud of Daggers - Damage (Slashing)"});
    damage.activity.updateSource({"activation.type": "special", "activation.override": true});
    await damage.ready;
    if(regionScenario === "tokenEnter") await resume();
    return;
    } finally { await resume(); }
    async function resume() {
        const callback = resumeMovement;
        resumeMovement = undefined;
        await callback?.();
    }
}

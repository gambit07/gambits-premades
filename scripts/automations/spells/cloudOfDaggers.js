export async function cloudOfDaggers({tokenUuid, regionUuid, regionScenario, regionStatus, speaker, actor, character, item, args, scope, workflow, options}) {
    if(!game.combat) return ui.notifications.warn("Cloud of Daggers requires an active combat.")

    if(args[0].macroPass === "templatePlaced") {
        const template = await fromUuid(workflow.templateUuid);
        await template.setFlag("gambits-premades", "codCastLevel", workflow.castData.castLevel);
        let cprConfig = game.gps.getCprConfig({itemUuid: workflow.item.uuid});
        const { animEnabled } = cprConfig;
        if(animEnabled) {
            let alignmentDecision;
            (MidiQOL.safeGetGameSetting('dnd5e', 'gridAlignedSquareTemplates') === true) ? alignmentDecision = "center" : alignmentDecision = "right";
        
            new Sequence()
                .effect()
                    .attachTo(template, { align: alignmentDecision, edge: "on" })
                    .file("jb2a.cloud_of_daggers.kunai.orange")
                .scaleToObject(1.5)
                .tieToDocuments(template)
                .scaleIn(0, 500, {ease: "easeOutCubic"})
                .fadeIn(500)
                .fadeOut(500)
                .mask()
                .persist()
                .belowTokens()
                .play()
        }
    }

    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    let itemName = "Cloud of Daggers";

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

    const effectOriginActor = await fromUuid(region.flags["region-attacher"].actorUuid);
    const effectOriginToken = await MidiQOL.tokenForActor(region.flags["region-attacher"].actorUuid);
    let chosenItem = await fromUuid(region.flags["region-attacher"].itemUuid);

    let turn = game.combat.round + '-' + game.combat.turn;
    let lastTurn = region.flags['gambits-premades']?.spell?.cloudOfDaggers?.[token.id]?.turn;
    if (turn === lastTurn) {
        if(debugEnabled) console.error(`Token already damaged this round for ${itemName}`);
        return;
    }

    await region.setFlag('gambits-premades', 'spell.cloudOfDaggers.' + token.id + '.turn', turn);

    let castLevel = template.getFlag("gambits-premades", "codCastLevel");

    let damageDice =  (2*(castLevel - 2)) + 4;
    let damageRoll = await new CONFIG.Dice.DamageRoll(`${damageDice}d4`).evaluate();
    await MidiQOL.displayDSNForRoll(damageRoll, 'damageRoll');

    const itemData = {
        name: "Cloud of Daggers - Damage (Slashing)",
        type: "feat",
        img: chosenItem.img
    }

    await new MidiQOL.DamageOnlyWorkflow(effectOriginActor, effectOriginToken, damageRoll.total, "slashing", token ? [token] : [], damageRoll, {itemData: itemData, flavor: "Cloud of Daggers - Damage (Slashing)"});
    return;
}

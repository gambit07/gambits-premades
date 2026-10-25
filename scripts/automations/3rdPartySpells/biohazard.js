export async function biohazard({speaker, actor, character, item, args, scope, workflow, options, tokenUuid, regionUuid, regionScenario, regionStatus, userId}) {
    let gmUser = game.gps.getPrimaryGM();

    if (args?.[0]?.macroPass === "templatePlaced") {
        const template = await fromUuid(workflow.templateUuid);
        game.gps.animation.biohazard({template, itemUuid: workflow.item.uuid});
        return;
    }

    if(!tokenUuid || !regionUuid || !regionScenario) return;

    if(game.user.id !== game.gps.regionEventUser(regionScenario, userId)) return;
    if (!game.combat) return ui.notifications.warn(game.i18n.format("GAMBITSPREMADES.Notifications.Common.RequiresActiveCombat", { effectName: item?.name ?? game.i18n.localize("GAMBITSPREMADES.Notifications.Common.ThisEffect") }));

    let region = fromUuidSync(regionUuid);
    if (!region) return;
    let template = region;
    
    let tokenDocument = fromUuidSync(tokenUuid);
    let token = tokenDocument?.object;
    if(!token?.actor) return;

    if (!MidiQOL.isTargetable(token)) return;

    if ((token.actor.type !== 'npc' && token.actor.type !== 'character')) return;

    const damagedThisTurn = region.getFlag("gambits-premades", `regionTurns.checkBiohazardRound.${token.id}`);
    if(damagedThisTurn && damagedThisTurn === game.gps.regionTurnKey()) return;
    let chosenItem = await fromUuid(region.getFlag("dnd5e", "item"));
    let castLevel = template.getFlag("dnd5e", "spellLevel") - 1;

    let resumeMovement;
    try {
    if(regionScenario === "tokenEnter") resumeMovement = tokenDocument.pauseMovement();

    let activityToUpdate = chosenItem.system.activities.find(a => a.identifier === "syntheticSave");
    let damageParts = foundry.utils.duplicate(activityToUpdate.damage.parts);
    damageParts[0].number = castLevel;

    await game.gps.queryUser("gpsActivityUpdate", gmUser, { activityUuid: activityToUpdate.uuid, updates: {"damage.parts": damageParts} });
    await game.gps.gpsActivityUse({itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: token.document.uuid});
    
    await game.gps.queryUser("gmSetFlag", gmUser, { flagDocumentUuid: region.uuid, key: `regionTurns.checkBiohazardRound.${token.id}`, value: game.gps.regionTurnKey() });
    if(regionScenario === "tokenEnter") await resume();
    } finally { await resume(); }
    async function resume() {
        const callback = resumeMovement;
        resumeMovement = undefined;
        await callback?.();
    }
}

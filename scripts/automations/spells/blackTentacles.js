export async function blackTentacles({speaker, actor, character, item, args, scope, workflow, options, tokenUuid, regionUuid, regionScenario, regionStatus, userId, turnKey}) {
    if(!game.combat) return ui.notifications.warn(game.i18n.format("GAMBITSPREMADES.Notifications.Common.RequiresActiveCombat", { effectName: workflow?.item?.name ?? item?.name ?? game.i18n.localize("GAMBITSPREMADES.Notifications.Common.ThisEffect") }));

    if (args?.[0]?.macroPass === "templatePlaced") {
        const template = await fromUuid(workflow.templateUuid);
        game.gps.animation.blackTentacles({template, itemUuid: workflow.item.uuid});
        return;
    }

    return game.gps.restrainingRegion({tokenUuid, regionUuid, regionScenario, userId, turnKey, kind: "blackTentacles", revised: false});
}

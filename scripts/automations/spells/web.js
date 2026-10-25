export async function web({tokenUuid, regionUuid, regionScenario, originX, originY, regionStatus, speaker, actor, token, character, item, args, scope, workflow, options, userId, turnKey}) {
    if(args?.[0]?.macroPass === "templatePlaced") {
        const template = await fromUuid(workflow.templateUuid);
        game.gps.animation.web({template, token, itemUuid: workflow.item.uuid});
        return;
    }

    if(!game.combat) return ui.notifications.warn(game.i18n.format("GAMBITSPREMADES.Notifications.Common.RequiresActiveCombat", {effectName: item?.name ?? game.i18n.localize("GAMBITSPREMADES.Notifications.Common.ThisEffect")}));
    return game.gps.restrainingRegion({tokenUuid, regionUuid, regionScenario, userId, turnKey, kind: "web", revised: false});
}

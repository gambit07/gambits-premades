export async function blackTentacles2024({speaker, actor, character, item, args, scope, workflow, options, tokenUuid, regionUuid, regionScenario, regionStatus, userId, turnKey}) {
    if(!game.combat) return ui.notifications.warn(game.i18n.format("GAMBITSPREMADES.Notifications.Common.RequiresActiveCombat", { effectName: workflow?.item?.name ?? item?.name ?? game.i18n.localize("GAMBITSPREMADES.Notifications.Common.ThisEffect") }));

    if (args?.[0]?.macroPass === "templatePlaced") {
        const template = await fromUuid(workflow.templateUuid);
        game.gps.animation.blackTentacles({template, itemUuid: workflow.item.uuid});
        return;
    }

    if (args?.[0]?.macroPass === "postActiveEffects") {
        if(!workflow || workflow.aborted) return;
        const eventTurnKey = game.gps.regionTurnKey();
        const regionUuids = new Set(workflow.templateUuids?.length ? workflow.templateUuids : [workflow.templateUuid]);
        for(const regionUuid of regionUuids) {
            if(!regionUuid) continue;
            const region = await fromUuid(regionUuid);
            if(region?.documentName !== "Region") continue;
            for(const target of Array.from(region.tokens)) {
                await blackTentacles2024({tokenUuid: target.uuid, regionUuid, regionScenario: "regionCreated", userId: game.user.id, turnKey: eventTurnKey});
            }
        }
        return;
    }

    return game.gps.restrainingRegion({tokenUuid, regionUuid, regionScenario, userId, turnKey, kind: "blackTentacles", revised: true});
}

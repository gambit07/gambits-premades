export async function biohazard({speaker, actor, character, item, args, scope, workflow, options, tokenUuid, regionUuid, regionScenario, regionStatus}) {
    let gmUser = game.gps.getPrimaryGM();

    if (args?.[0]?.macroPass === "templatePlaced") {
        let cprConfig = game.gps.getCprConfig({itemUuid: workflow.item.uuid});
        const { animEnabled } = cprConfig;
        if(animEnabled) {
            const template = await fromUuid(workflow.templateUuid);
            await template.setFlag("gambits-premades", "biohazardCastLevel", workflow.castData.castLevel - 1)

            new Sequence()
                .effect()
                    .file("jb2a.plant_growth.01.square.4x4.loop.bluepurple")
                    .stretchTo(template)
                    .attachTo(template)
                    .filter("ColorMatrix", { hue: 240 })
                    .delay(500)
                    .scaleIn(0, 500, {ease: "easeOutCubic"})
                    .fadeIn(500)
                    .fadeOut(500)
                    .mask()
                    .belowTokens()
                    .persist()
                    .zIndex(2)
                .effect()
                    .file("jb2a.template_square.symbol.normal.poison.dark_green")
                    .stretchTo(template)
                    .attachTo(template)
                    .delay(500)
                    .scaleIn(0, 500, {ease: "easeOutCubic"})
                    .fadeIn(500)
                    .fadeOut(500)
                    .mask()
                    .belowTokens()
                    .persist()
                    .zIndex(2)
            .play()
        }

        return;
    }

    if(!tokenUuid || !regionUuid || !regionScenario) return;

    let region = await fromUuid(regionUuid);
    let template;
    if(region?.flags["region-attacher"]?.attachedTemplate) {
        template = await fromUuid(region.flags["region-attacher"].attachedTemplate);
    }
    else return;
    
    let tokenDocument = await fromUuid(tokenUuid);
    let token = tokenDocument?.object;

    if (!MidiQOL.isTargetable(token)) return;

    if ((token.actor.type !== 'npc' && token.actor.type !== 'character')) return;

    let validatedRegionMovement = game.gps.validateRegionMovement({ regionScenario: regionScenario, regionStatus: regionStatus, regionUuid: regionUuid, tokenUuid: tokenUuid });
    const { validRegionMovement, validReroute } = validatedRegionMovement;
    if(!validRegionMovement) return;

    let chosenItem = await fromUuid(region.flags["region-attacher"].itemUuid);
    let castLevel = template.getFlag("gambits-premades", "biohazardCastLevel");
    const damagedThisTurn = await region.getFlag("gambits-premades", "checkBiohazardRound");
    if(damagedThisTurn && damagedThisTurn === `${token.id}_${game.combat.round}`) return;

    let activityToUpdate = chosenItem.system.activities.find(a => a.identifier === "syntheticSave");
    let damageParts = foundry.utils.duplicate(activityToUpdate.damage.parts);
    damageParts[0].number = castLevel;

    await game.gps.socket.executeAsUser("gpsActivityUpdate", gmUser, { activityUuid: activityToUpdate.uuid, updates: {"damage.parts": damageParts} });
    await game.gps.gpsActivityUse({itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: token.document.uuid});
    
    await region.setFlag("gambits-premades", "checkBiohazardRound", `${token.id}_${game.combat.round}`);
}
export async function rabbitHop({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    async function HaltAndRefund(workflow) {
        if (workflow.dnd5eConsumptionConfig?.consumeUsage) {
            await item.update({'system.uses.spent': item.system.uses.spent - 1});
            console.log('Resource refunded because user cancelled input.');
        }
        return;
    }
    let rabbitHop = 0 + (5 * (actor.system.attributes.prof));

    // Check if the 'Boots of Striding and Springing' are equipped and attuned
    let bootsEquipped = actor.items.find(i => i.identifier === "boots-of-striding-and-springing" && i.system.equipped && i.system.attuned);

    // Check if actor has the 'Jump' spell active
    let jumpActive = actor.effects.some(eff => eff.name === "Jump");  

    if (bootsEquipped && jumpActive) {
        rabbitHop *= 6;  // Both boots and Jump spell active grants a x6 jump distance
    } else if (bootsEquipped || jumpActive) {
        rabbitHop *= 3;  // Either boots or Jump spell active grants a x3 jump distance
    }

    actor.sheet.minimize();

    let config = {
        gridHighlight: true,
        icon: {texture: token.document.texture.src, borderVisible: true},
        location: {obj: token, limitMaxRange: rabbitHop, showRange: true, wallBehavior: Sequencer.Crosshair.PLACEMENT_RESTRICTIONS.NO_COLLIDABLES}
    }

    let position = await Sequencer.Crosshair.show(config);

    if (!position) {
        await actor.sheet.maximize();
        await HaltAndRefund(workflow);
        return;
    }

    let cprConfig = game.gps.getCprConfig({itemUuid: item.uuid});
    const { animEnabled } = cprConfig;

    if(animEnabled) {
        new Sequence()

        .animation()
        .on(token)
        .opacity(0)
        .waitUntilFinished(-100)

        .effect()
        .file("animated-spell-effects-cartoon.air.portal")
        .atLocation(token)
        .scaleToObject(1.75)
        .belowTokens()

        .effect()
        .copySprite(token)
        .atLocation(token)
        .opacity(1)
        .duration(1000)
        .anchor({ x: 0.5, y: 1 })
        .loopProperty("sprite", "position.y", { values: [50, 0, 50], duration: 500})
        .moveTowards(position, {rotate:false})
        .zIndex(2)

        .effect()
        .copySprite(token)
        .atLocation(token)
        .opacity(0.5)
        .scale(0.9)
        .belowTokens()
        .duration(1000)
        .anchor({ x: 0.5, y: 0.5 })
        .filter("ColorMatrix", { brightness: -1 })
        .filter("Blur", { blurX: 5, blurY: 10 })
        .moveTowards(position, {rotate:false})
        .zIndex(2)
        .waitUntilFinished(-100)

        .animation()
        .on(token)
        .teleportTo(position)
        .snapToGrid()
        .opacity(1)

        .effect()
        .file("animated-spell-effects-cartoon.level 02.misty step")
        .atLocation(position)
        .scaleToObject(1.75 * token.document.width)
        .belowTokens()

        .play();
    }

    await actor.sheet.maximize();
}
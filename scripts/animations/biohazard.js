export function biohazard({template, itemUuid}) {
    if (!template?.object) return;
    template = template.object;
    let cprConfig = game.gps.getCprConfig({itemUuid});
    if(!cprConfig.animEnabled) return;
    const regionAnimation = game.gps.getRegionAnimationData(template);
    
    let alignmentDecision;
    let scaleDecision;
    alignmentDecision = {};
    scaleDecision = 1.1;

    new Sequence()
        .effect()
            .file("jb2a.plant_growth.01.square.4x4.loop.bluepurple")
            .attachTo(template, alignmentDecision)
            .scaleToObject(scaleDecision)
            .filter("ColorMatrix", { hue: 240 })
            .delay(500)
            .scaleIn(0, 500, {ease: "easeOutCubic"})
            .fadeIn(500)
            .fadeOut(500)
            .belowTokens()
            .elevation(regionAnimation.elevation, { absolute: true })
            .onLevels(regionAnimation.levels)
            .persist()
            .zIndex(2)
        .effect()
            .file("jb2a.template_square.symbol.normal.poison.dark_green")
            .attachTo(template, alignmentDecision)
            .scaleToObject(scaleDecision)
            .delay(500)
            .scaleIn(0, 500, {ease: "easeOutCubic"})
            .fadeIn(500)
            .fadeOut(500)
            .belowTokens()
            .elevation(regionAnimation.elevation, { absolute: true })
            .onLevels(regionAnimation.levels)
            .persist()
            .zIndex(2)
    .play()
}
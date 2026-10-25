export function blackTentacles({template, itemUuid}) {
    if (!template?.object) return;
    template = template.object;
    let cprConfig = game.gps.getCprConfig({itemUuid});
    if(!cprConfig.animEnabled) return;
    const regionAnimation = game.gps.getRegionAnimationData(template);
    
    let alignmentDecision;
    let scaleDecision;
    alignmentDecision = {};
    scaleDecision = 1.25;

    new Sequence()
        .effect()
            .file("jb2a.darkness.black") //assets/animations/animated_spells/black_tentacles_border.webm
            .attachTo(template, alignmentDecision)
            .scaleToObject(scaleDecision)
            .delay(500)
            .scaleIn(0, 500, {ease: "easeOutCubic"})
            .fadeIn(500)
            .mask()
            .fadeOut(500)
            .filter("ColorMatrix", { brightness:0 })
            .belowTokens()
            .elevation(regionAnimation.elevation, { absolute: true })
            .onLevels(regionAnimation.levels)
            .zIndex(0)
            .persist()

        .effect()
            .file("jaamod.spells_effects.tentacles_black") //assets/animations/animated_spells/black_tentacles_border.webm
            .attachTo(template, alignmentDecision)
            .scaleToObject(scaleDecision)
            .delay(500)
            .scaleIn(0, 500, {ease: "easeOutCubic"})
            .fadeIn(500)
            .fadeOut(500)
            .opacity(0.8)
            .belowTokens()
            .elevation(regionAnimation.elevation, { absolute: true })
            .onLevels(regionAnimation.levels)
            .zIndex(1)
            .persist()
    .play()
}
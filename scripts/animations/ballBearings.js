export function ballBearings({template, itemUuid}) {
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
            .file("modules/gambits-premades/assets/images/ballBearings.webp")
            .attachTo(template, alignmentDecision)
            .tieToDocuments(template)
            .scaleToObject(scaleDecision)
            .mask()
            .belowTokens()
            .elevation(regionAnimation.elevation, { absolute: true })
            .onLevels(regionAnimation.levels)
            .persist()
    .play()
}
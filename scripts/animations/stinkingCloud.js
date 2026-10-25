export function stinkingCloud({template, itemUuid}) {
    if (!template?.object) return;
    template = template.object;
    let cprConfig = game.gps.getCprConfig({itemUuid});
    if(!cprConfig.animEnabled) return;
    const regionAnimation = game.gps.getRegionAnimationData(template);

    new Sequence()
        .effect()
            .atLocation(template)
            .file("jb2a.fog_cloud.02.green")
            .scaleToObject()
            .tieToDocuments(template)
            .belowTokens()
            .elevation(regionAnimation.elevation, { absolute: true })
            .onLevels(regionAnimation.levels)
            .mask()
            .persist()
    .play()
}
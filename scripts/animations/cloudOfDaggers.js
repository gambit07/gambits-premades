export function cloudOfDaggers({template, itemUuid}) {
    if (!template?.object) return;
    template = template.object;
    let cprConfig = game.gps.getCprConfig({itemUuid});
    if(!cprConfig.animEnabled) return;
    const regionAnimation = game.gps.getRegionAnimationData(template);
    let animColor = cprConfig.animColor ?? "orange";
    
    let alignmentDecision;
    let scaleDecision;
    alignmentDecision = {};
    scaleDecision = 1.25;

    const animFileType = game.modules.get("jb2a_patreon")?.active ? "kunai" : "daggers";

    new Sequence()
        .effect()
            .attachTo(template, alignmentDecision)
            .file(`jb2a.cloud_of_daggers.${animFileType}.${animColor}`)
            .tieToDocuments(template)
            .scaleToObject(scaleDecision)
            .scaleIn(0, 500, {ease: "easeOutCubic"})
            .fadeIn(500)
            .fadeOut(500)
            .persist()
            .belowTokens()
            .elevation(regionAnimation.elevation, { absolute: true })
            .onLevels(regionAnimation.levels)
    .play()
}
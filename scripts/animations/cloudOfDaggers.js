export function cloudOfDaggers({template, itemUuid}) {
    let cprConfig = game.gps.getCprConfig({itemUuid});
    if(!cprConfig.animEnabled) return;
    let animColor = cprConfig.animColor ?? "orange";
    
    let alignmentDecision;
    let scaleDecision;
    if(MidiQOL.safeGetGameSetting('dnd5e', 'gridAlignedSquareTemplates')) {
        alignmentDecision = {};
        scaleDecision = 1.25;
    }
    else {
        alignmentDecision = { edge: "on", offset: ( {x: 70, y: 0} ) };
        scaleDecision = 0.65;
    }

    new Sequence()
        .effect()
            .attachTo(template, alignmentDecision)
            .file(`jb2a.cloud_of_daggers.kunai.${animColor}`)
            .tieToDocuments(template)
            .scaleToObject(scaleDecision)
            .scaleIn(0, 500, {ease: "easeOutCubic"})
            .fadeIn(500)
            .fadeOut(500)
            .persist()
            .belowTokens()
    .play()
}
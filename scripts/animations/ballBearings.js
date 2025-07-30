export function ballBearings({template, itemUuid}) {
    let cprConfig = game.gps.getCprConfig({itemUuid});
    if(!cprConfig.animEnabled) return;
    
    let alignmentDecision;
    let scaleDecision;
    if(MidiQOL.safeGetGameSetting('dnd5e', 'gridAlignedSquareTemplates')) {
        alignmentDecision = {};
        scaleDecision = 1.25;
    }
    else {
        alignmentDecision = { edge: "on", offset: ( {x: 50, y: 0} ) };
        scaleDecision = 0.5;
    }

    new Sequence()
        .effect()
            .file("modules/gambits-premades/assets/images/ballBearings.webp")
            .attachTo(template, alignmentDecision)
            .tieToDocuments(template)
            .scaleToObject(scaleDecision)
            .mask()
            .belowTokens()
            .persist()
    .play()
}
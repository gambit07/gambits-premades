export function biohazard({template, itemUuid}) {
    let cprConfig = game.gps.getCprConfig({itemUuid});
    if(!cprConfig.animEnabled) return;
    
    let alignmentDecision;
    let scaleDecision;
    if(MidiQOL.safeGetGameSetting('dnd5e', 'gridAlignedSquareTemplates')) {
        alignmentDecision = {};
        scaleDecision = 1.1;
    }
    else {
        alignmentDecision = { edge: "on", offset: ( {x: 145, y: 0} ) };
        scaleDecision = 0.6;
    }

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
            .persist()
            .zIndex(2)
    .play()
}
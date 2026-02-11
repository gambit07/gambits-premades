export function blackTentacles({template, itemUuid}) {
    let cprConfig = game.gps.getCprConfig({itemUuid});
    if(!cprConfig.animEnabled) return;
    
    let alignmentDecision;
    let scaleDecision;
    if(MidiQOL.safeGetGameSetting('dnd5e', 'gridAlignedSquareTemplates')) {
        alignmentDecision = {};
        scaleDecision = 1.25;
    }
    else {
        alignmentDecision = { edge: "on", offset: ( {x: 280, y: 0} ) };
        scaleDecision = 0.65;
    }

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
            .persist()
    .play()
}
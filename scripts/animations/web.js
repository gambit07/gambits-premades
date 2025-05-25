export function web({template, token, itemUuid}) {
    let cprConfig = game.gps.getCprConfig({itemUuid});
    if(!cprConfig.animEnabled) return;
    
    let alignmentDecision;
    let scaleDecision;
    let scaleOrb;
    let scaleWeb;
    let scaleImpact;
    let scaleMagicSign1;
    let scaleMagicSign2;
    if(MidiQOL.safeGetGameSetting('dnd5e', 'gridAlignedSquareTemplates')) {
        alignmentDecision = {};
        scaleDecision = 1.1;
        scaleOrb = 0.4;
        scaleWeb = 0.3;
        scaleImpact = 1;
        scaleMagicSign1 = 1;
        scaleMagicSign2 = 1;
    }
    else {
        alignmentDecision = { edge: "on", offset: ( {x: 275, y: 0} ) };
        scaleDecision = 0.55;
        scaleOrb = 0.2;
        scaleWeb = 0.15;
        scaleImpact = 0.5;
        scaleMagicSign1 = 1.25;
        scaleMagicSign2 = 0.5;
    }
    
    new Sequence()
        .effect()
            .atLocation(token)
            .file(`jb2a.magic_signs.circle.02.conjuration.loop.yellow`)
            .scaleToObject(1.25)
            .rotateIn(180, 600, {ease: "easeOutCubic"})
            .scaleIn(0, 600, {ease: "easeOutCubic"})
            .loopProperty("sprite", "rotation", { from: 0, to: -360, duration: 10000})
            .belowTokens()
            .fadeOut(2000)
            .zIndex(0)

        .effect()
            .atLocation(token)
            .file(`jb2a.magic_signs.circle.02.conjuration.complete.dark_yellow`)
            .scaleToObject(scaleMagicSign1)
            .rotateIn(180, 600, {ease: "easeOutCubic"})
            .scaleIn(0, 600, {ease: "easeOutCubic"})
            .loopProperty("sprite", "rotation", { from: 0, to: -360, duration: 10000})
            .belowTokens(true)
            .filter("ColorMatrix", {saturate:-1, brightness:2})
            .filter("Blur", { blurX: 5, blurY: 10 })
            .zIndex(1)
            .duration(1200)
            .fadeIn(200, {ease: "easeOutCirc", delay: 500})
            .fadeOut(300, {ease: "linear"})

        .effect()
            .attachTo(template, alignmentDecision)
            .scaleToObject(scaleMagicSign2, {uniform:true})
            .file(`jb2a.magic_signs.circle.02.conjuration.complete.dark_yellow`)
            .fadeIn(600)
            .opacity(1)
            .rotateIn(180, 600, {ease: "easeOutCubic"})
            .scaleIn(0, 600, {ease: "easeOutCubic"})
            .belowTokens()

        .effect()
            .file("jb2a.particles.outward.white.01.02")
            .scaleIn(0, 500, {ease: "easeOutQuint"})
            .scaleToObject(scaleDecision)
            .delay(500)
            .fadeOut(1000)
            .atLocation(token)
            .duration(1000)
            .size(1.75, {gridUnits: true})
            .animateProperty("spriteContainer", "position.y", {  from:0 , to: -0.5, gridUnits:true, duration: 1000})
            .zIndex(1)
            .waitUntilFinished(-500)

        .effect()
            .file("jb2a.markers.light_orb.loop.white")
            .attachTo(template, alignmentDecision)
            .scaleToObject(scaleOrb)
            .fadeIn(500)
            .duration(2500)
            .belowTokens()
            .zIndex(2)

        .effect()
            .file("jb2a.shield_themed.above.eldritch_web.01.dark_green")
            .attachTo(template, alignmentDecision)
            .scaleIn(0, 1500, {ease: "easeOutCubic"})
            .scaleToObject(scaleWeb)
            .fadeIn(500)
            .duration(2500)
            .belowTokens()
            .zIndex(2.1)
            .opacity(0.5)
            .filter("ColorMatrix", { brightness:0 })

        .effect()
            .file("jb2a.shield_themed.below.eldritch_web.01.dark_green")
            .attachTo(template, alignmentDecision)
            .scaleIn(0, 1500, {ease: "easeOutCubic"})
            .scaleOut(0, 1500, {ease: "linear"})
            .scaleToObject(scaleWeb)
            .fadeIn(500)
            .duration(2500)
            .belowTokens()
            .zIndex(1.9)
            .filter("ColorMatrix", { brightness:0 })
            .opacity(0.5)
            .waitUntilFinished(-200)

        .effect()
            .file("jb2a.impact.004.yellow")
            .attachTo(template, alignmentDecision)
            .scaleToObject(scaleImpact, {uniform:true})
            .size(6, {gridUnits: true})
            .filter("ColorMatrix", { saturate: -1 })

        .effect()
            .file('jb2a.web.01')
            .attachTo(template, alignmentDecision)
            .scaleToObject(scaleDecision)
            .tieToDocuments(template)
            .belowTokens()
            .fadeIn(1500)
            .zIndex(1)
            .fadeOut(1500)
            .scaleIn(0, 500, {ease: "easeOutCubic"})
            .persist()

        .effect()
            .file('jb2a.web.01')
            .attachTo(template, alignmentDecision)
            .scaleToObject(scaleDecision)
            .tieToDocuments(template)
            .opacity(0.3)
            .fadeIn(1500)
            .zIndex(1)
            .fadeOut(1500)
            .scaleIn(0, 500, {ease: "easeOutCubic"})
            .persist()

    .play();
}
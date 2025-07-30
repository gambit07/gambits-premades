export async function entangle({template, itemUuid, targets, token}) {
    let cprConfig = game.gps.getCprConfig({itemUuid});
    if(!cprConfig.animEnabled) return;
    
    let alignmentDecision;
    let scaleDecision;
    if(MidiQOL.safeGetGameSetting('dnd5e', 'gridAlignedSquareTemplates')) {
        alignmentDecision = {};
        scaleDecision = 1.25;
    }
    else {
        alignmentDecision = { edge: "on", offset: ( {x: 198, y: 0} ) };
        scaleDecision = 0.65;
    }

    new Sequence()

        .effect()
            .atLocation(token)
            .file(`jb2a.magic_signs.circle.02.conjuration.loop.green`)
            .scaleToObject(1.25)
            .rotateIn(180, 600, {ease: "easeOutCubic"})
            .scaleIn(0, 600, {ease: "easeOutCubic"})
            .loopProperty("sprite", "rotation", { from: 0, to: -360, duration: 10000})
            .belowTokens()
            .fadeOut(2000)
            .zIndex(0)

        .effect()
            .atLocation(token)
            .file(`jb2a.magic_signs.circle.02.conjuration.complete.dark_green`)
            .scaleToObject(1.25)
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
            .file("jb2a.entangle.green")
            .attachTo(template, alignmentDecision)
            .delay(1000)
            .fadeIn(2000)
            .opacity(0.95)
            .fadeOut(500)
            .belowTokens()
            .persist()
            .zIndex(1.5)
            .name(`Entangle`)

        .effect()
            .file("jb2a.entangle.green")
            .attachTo(template, alignmentDecision)
            .delay(1000)
            .fadeIn(2000)
            .opacity(0.85)
            .fadeOut(500)
            .belowTokens()
            .persist()
            .zIndex(1.3)
            .name(`Entangle`)

        .effect()
            .file("jb2a.entangle.green")
            .attachTo(template, alignmentDecision)
            .delay(1000)
            .fadeIn(2000)
            .opacity(0.75)
            .fadeOut(500)
            .belowTokens()
            .persist()
            .zIndex(1.2)
            .name(`Entangle`)

        .effect()
            .file("jb2a.plant_growth.02.ring.4x4.pulse.greenred")
            .attachTo(template, alignmentDecision)
            .scale(0.8)
            .delay(500)
            .scaleIn(0, 500, {ease: "easeOutCubic"})
            .fadeIn(500)
            .fadeOut(500)
            .belowTokens()
            .randomRotation()
            .zIndex(2)
            .name(`Entangle`)

        .effect()
            .attachTo(template, alignmentDecision)
            .file(`jb2a.fireflies.many.01.green`)
            .delay(1000)
            .size(4, {gridUnits: true})
            .fadeIn(2500)
            .opacity(1)
            .persist()
            .zIndex(2)
            .name(`Entangle`)

        .effect()
            .file("jb2a.plant_growth.02.ring.4x4.pulse.greenred")
            .attachTo(template, alignmentDecision)
            .scale(0.8)
            .delay(500)
            .scaleIn(0, 500, {ease: "easeOutCubic"})
            .fadeIn(500)
            .fadeOut(500)
            .belowTokens()
            .randomRotation()
            .zIndex(2)

        .effect()
            .file("jb2a.swirling_leaves.outburst.01.greenorange")
            .scaleIn(0, 500, {ease: "easeOutQuint"})
            .delay(500)
            .fadeOut(1000)
            .atLocation(token)
            .duration(1000)
            .size(1.75, {gridUnits: true})
            .animateProperty("spriteContainer", "position.y", {  from:0 , to: -0.15, gridUnits: true, duration: 1000})
            .zIndex(1)

        .effect()
            .attachTo(template, alignmentDecision)
            .file(`jb2a.magic_signs.circle.02.conjuration.complete.dark_green`)
            .scale(0.5)
            .fadeIn(600)
            .rotateIn(180, 600, {ease: "easeOutCubic"})
            .scaleIn(0, 600, {ease: "easeOutCubic"})
            .opacity(1)
            .persist()
            .belowTokens()
            .zIndex(1)
            .name(`Entangle`)
            .waitUntilFinished()

    .play()

    targets.forEach(target => {

        new Sequence()

            .effect()
                .delay(100)
                .file('jb2a.entangle.green')
                .scaleToObject(1, {considerTokenScale:true})
                .attachTo(target)
                .fadeIn(5000)
                .zIndex(1)
                .fadeOut(1000)
                .scaleIn(0, 5000, {ease: "easeOutCubic"})
                .mask(target)
                .persist() 
                .name(`${target.document.id}Entangle`)


        .play()
        
    })
}
export function fireball({type, token, templateData, color = "orange"}) {
    const castSound = "modules/gambits-premades/assets/sounds/fire-blast-binaural-1.ogg";
    const blastSound = "modules/gambits-premades/assets/sounds/explosion-echo-5.ogg";
    const lingeringSound = "modules/gambits-premades/assets/sounds/fire-flamethrower-2.ogg";

    function _getPath(path, color, dfault = "orange") {
        let pathColor = Sequencer.Database.getPathsUnder(path).find(i=>i.includes(color)) ?? dfault;
        return `${path}.${pathColor}`;
    }

    if(type === "cast") {
        const magicCircle = _getPath("jb2a.magic_signs.circle.02.evocation.loop", color, "yellow");
        const particles02 = _getPath("jb2a.particles.outward", color) + ".01.02";
        const particles03 = _getPath("jb2a.particles.outward", color) + ".01.03";
        const particles04 = _getPath("jb2a.particles.outward", color) + ".01.04";

        return new Sequence()
            .effect()
                .attachTo(token)
                .file(magicCircle)
                .scaleToObject(1.25)
                .rotateIn(180, 600, {ease: "easeOutCubic"})
                .scaleIn(0, 600, {ease: "easeOutCubic"})
                .loopProperty("sprite", "rotation", { from: 0, to: -360, duration: 10000})
                .belowTokens()
                .fadeOut(2000)
                .zIndex(0)

            .effect()
                .attachTo(token)
                .file(magicCircle)
                .scaleToObject(1.25)
                .rotateIn(180, 600, {ease: "easeOutCubic"})
                .scaleIn(0, 600, {ease: "easeOutCubic"})
                .loopProperty("sprite", "rotation", { from: 0, to: -360, duration: 10000})
                .belowTokens(true)
                .filter("ColorMatrix", {saturate:-1, brightness:2})
                .filter("Blur", { blurX: 5, blurY: 10 })
                .zIndex(1)
                .duration(1200)
                .fadeIn(200, {ease: "easeOutCirc", delay: 0})
                .fadeOut(300, {ease: "linear"})

            .effect()
                .file(particles02)
                .scaleIn(0, 500, {ease: "easeOutQuint"})
                .fadeOut(1000)
                .atLocation(token)
                .duration(1000)
                .size(1.75, {gridUnits: true})
                .animateProperty("spriteContainer", "position.y", {  from:0 , to: -0.5, gridUnits:true, duration: 1000})
                .zIndex(1)

            .effect()
                .file(particles03)
                .atLocation(token)
                .anchor({x:0.4})
                .scaleToObject(.5)
                .animateProperty("sprite", "position.x", { from: 0, to: -1000, duration: 15000})
                .rotateTowards(templateData, {cacheLocation: true})
                .scaleIn(0, 500, {ease: "easeOutQuint"})
                .duration(6000)
                .playbackRate(2)
                .fadeOut(2000)
                .zIndex(2)

            .effect()
                .file(particles04)
                .atLocation(token)
                .fadeIn(500)
                .fadeOut(500)
                .anchor({x:0.5})
                .scaleToObject(2)
                .duration(5000)
                .rotateTowards(templateData, {cacheLocation: true})
                .loopProperty("sprite", "rotation", { from: 0, to: 360, duration: 3000})
                .scaleOut(0, 5000, {ease: "easeOutQuint", delay: 0})
                .zIndex(1)

            .sound()
                .file(castSound)
                .fadeInAudio(500)
                .fadeOutAudio(500);
    }

    if(type === "explosion") {
        const preBeam = "animated-spell-effects-cartoon.fire.03";
        const beam = _getPath("jb2a.fireball.beam", color);
        const beamSupplement = "animated-spell-effects-cartoon.fire.38";
        const explosion = _getPath("jb2a.fireball.explosion", color);
        const explosionBlast = "animated-spell-effects-cartoon.fire.explosion.01";
        const cracks = _getPath("jb2a.ground_cracks", color) + ".01";

        let hue = 0;
        switch (color) {
            case "red"      : hue += 120;
            case "purple"   : hue += 40;
            case "blue"     : hue += 110;
            case "green"    : hue += 70;
            default: break;
        }

        return new Sequence()
            .effect()
                .file(preBeam)
                .filter("ColorMatrix", { hue: hue })
                .attachTo(token)
                .scaleToObject(1.5)

            .effect()
                .file(beamSupplement)
                .filter("ColorMatrix", { hue: hue })
                .attachTo(token)
                .stretchTo(templateData)
                .delay(2100)

            .effect()
                .file(beam)
                .attachTo(token)
                .stretchTo(templateData)
                .waitUntilFinished(-1200)

            .effect()
                .file(explosionBlast)
                .filter("ColorMatrix", { hue: hue })
                .atLocation(templateData)
                .size(10.5, {gridUnits:true})
                .scaleIn(0, 500, {ease: "easeOutQuint"})
                .zIndex(1)

            .sound()
                .file(blastSound)
                .fadeInAudio(500)
                .fadeOutAudio(500)
                .volume(0.5)

            .effect()
                .file(explosion)
                .atLocation(templateData)
                .size(10.5, {gridUnits:true})
                .scaleIn(0, 500, {ease: "easeOutQuint"})
                .zIndex(2)

            .sound()
                .file(lingeringSound)
                .fadeInAudio(500)
                .fadeOutAudio(500)
                .delay(300)

            .effect()
                .file(cracks)
                .attachTo(templateData)
                .size(6.5, {gridUnits:true})
                .randomRotation()
                .fadeOut(2000)
                .duration(5000)
                .belowTokens()
                .persist()
                .zIndex(0.1);
    }
}
export async function fireball({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "postDamageRoll") {
        let cprConfig = game.gps.getCprConfig({itemUuid: item.uuid});
        const { animEnabled, animColor } = cprConfig;
    
        if(!animEnabled) return;
        
        let scorchedEarth = true
        let persistEffect = true
    
        let fireballBeam;
        let fireballCircle;
        let fireballParticles02;
        let fireballParticles03;
        let fireballParticles04;
        let fireballExplosion;
        let fireballExplosionBlast;
        let fireballCracks;
        let fireballPreBeam;
        let fireballBeamSupplement;
        let fireballExplosionBlastHue = 0;
        let fireballPreBeamHue = 0;
        let fireballBeamSupplementHue = 0;
        let fireballCastSound = "modules/gambits-premades/assets/sounds/fire-blast-binaural-1.ogg";
        let fireballBlastSound = "modules/gambits-premades/assets/sounds/explosion-echo-5.ogg";
        let fireballLingerSound = "modules/gambits-premades/assets/sounds/fire-flamethrower-2.ogg";
    
        if(!animColor) {
        fireballBeam = "jb2a.fireball.beam.orange";
        fireballCircle = "jb2a.magic_signs.circle.02.evocation.loop.yellow";
        fireballParticles02 = "jb2a.particles.outward.orange.01.02";
        fireballParticles03 = "jb2a.particles.outward.orange.01.03";
        fireballParticles04 = "jb2a.particles.outward.orange.01.04";
        fireballExplosion = "jb2a.fireball.explosion.orange";
        fireballExplosionBlast = "animated-spell-effects-cartoon.fire.explosion.01";
        fireballCracks = "jb2a.ground_cracks.orange.01";
        fireballPreBeam = "animated-spell-effects-cartoon.fire.03";
        fireballBeamSupplement = "animated-spell-effects-cartoon.fire.38";
        }
        else if (animColor === "orange") {
        fireballBeam = "jb2a.fireball.beam.orange";
        fireballCircle = "jb2a.magic_signs.circle.02.evocation.loop.yellow";
        fireballParticles02 = "jb2a.particles.outward.orange.01.02";
        fireballParticles03 = "jb2a.particles.outward.orange.01.03";
        fireballParticles04 = "jb2a.particles.outward.orange.01.04";
        fireballExplosion = "jb2a.fireball.explosion.orange";
        fireballExplosionBlast = "animated-spell-effects-cartoon.fire.explosion.01";
        fireballCracks = "jb2a.ground_cracks.orange.01";
        fireballPreBeam = "animated-spell-effects-cartoon.fire.03";
        fireballBeamSupplement = "animated-spell-effects-cartoon.fire.38";
        }
        else if (animColor === "blue") {
        fireballBeam = "jb2a.fireball.beam.blue";
        fireballCircle = "jb2a.magic_signs.circle.02.evocation.loop.blue";
        fireballParticles02 = "jb2a.particles.outward.blue.01.02";
        fireballParticles03 = "jb2a.particles.outward.blue.01.03";
        fireballParticles04 = "jb2a.particles.outward.blue.01.04";
        fireballExplosion = "jb2a.fireball.explosion.blue";
        fireballExplosionBlast = "animated-spell-effects-cartoon.fire.explosion.01";
        fireballExplosionBlastHue = 183;
        fireballCracks = "jb2a.ground_cracks.blue.01";
        fireballPreBeam = "animated-spell-effects-cartoon.fire.03";
        fireballPreBeamHue = 180;
        fireballBeamSupplement = "animated-spell-effects-cartoon.fire.38";
        fireballBeamSupplementHue = 185;
        }
        else if (animColor === "green") {
        fireballBeam = "jb2a.fireball.beam.dark_green";
        fireballCircle = "jb2a.magic_signs.circle.02.evocation.loop.green";
        fireballParticles02 = "jb2a.particles.outward.greenyellow.01.02";
        fireballParticles03 = "jb2a.particles.outward.greenyellow.01.03";
        fireballParticles04 = "jb2a.particles.outward.greenyellow.01.04";
        fireballExplosion = "jb2a.fireball.explosion.dark_green";
        fireballExplosionBlast = "animated-spell-effects-cartoon.fire.explosion.01";
        fireballExplosionBlastHue = 70;
        fireballCracks = "jb2a.ground_cracks.green.01";
        fireballPreBeam = "animated-spell-effects-cartoon.fire.03";
        fireballPreBeamHue = 70;
        fireballBeamSupplement = "animated-spell-effects-cartoon.fire.38";
        fireballBeamSupplementHue = 70;
        }
        else if (animColor === "red") {
        fireballBeam = "jb2a.fireball.beam.dark_red";
        fireballCircle = "jb2a.magic_signs.circle.02.evocation.loop.dark_red";
        fireballParticles02 = "jb2a.particles.outward.red.01.02";
        fireballParticles03 = "jb2a.particles.outward.red.01.03";
        fireballParticles04 = "jb2a.particles.outward.red.01.04";
        fireballExplosion = "jb2a.fireball.explosion.dark_red";
        fireballExplosionBlast = "animated-spell-effects-cartoon.fire.explosion.01";
        fireballExplosionBlastHue = 340;
        fireballCracks = "jb2a.ground_cracks.dark_red.01";
        fireballPreBeam = "animated-spell-effects-cartoon.fire.03";
        fireballPreBeamHue = 340;
        fireballBeamSupplement = "animated-spell-effects-cartoon.fire.38";
        fireballBeamSupplementHue = 340;
        }
        else if (animColor === "purple") {
        fireballBeam = "jb2a.fireball.beam.dark_purple";
        fireballCircle = "jb2a.magic_signs.circle.02.evocation.loop.dark_purple";
        fireballParticles02 = "jb2a.particles.outward.purple.01.02";
        fireballParticles03 = "jb2a.particles.outward.purple.01.03";
        fireballParticles04 = "jb2a.particles.outward.purple.01.04";
        fireballExplosion = "jb2a.fireball.explosion.dark_purple";
        fireballExplosionBlast = "animated-spell-effects-cartoon.fire.explosion.01";
        fireballExplosionBlastHue = 220;
        fireballCracks = "jb2a.ground_cracks.purple.01";
        fireballPreBeam = "animated-spell-effects-cartoon.fire.03";
        fireballPreBeamHue = 220;
        fireballBeamSupplement = "animated-spell-effects-cartoon.fire.38";
        fireballBeamSupplementHue = 220;
        }
    
        const templateData = fromUuidSync(workflow.templateUuid);
    
        new Sequence()
    
        .effect()
        .attachTo(token)
        .file(fireballCircle)
        .scaleToObject(1.25)
        .rotateIn(180, 600, {ease: "easeOutCubic"})
        .scaleIn(0, 600, {ease: "easeOutCubic"})
        .loopProperty("sprite", "rotation", { from: 0, to: -360, duration: 10000})
        .belowTokens()
        .fadeOut(2000)
        .zIndex(0)
    
        .effect()
        .attachTo(token)
        .file(fireballCircle)
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
        .file(fireballParticles02)
        .scaleIn(0, 500, {ease: "easeOutQuint"})
        .fadeOut(1000)
        .atLocation(token)
        .duration(1000)
        .size(1.75, {gridUnits: true})
        .animateProperty("spriteContainer", "position.y", {  from:0 , to: -0.5, gridUnits:true, duration: 1000})
        .zIndex(1)
    
        .effect()
        .file(fireballParticles04)
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
    
        .effect()
        .file(fireballParticles03)
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
    
        .sound()
        .file(fireballCastSound)
        .fadeInAudio(500)
        .fadeOutAudio(500)
    
        .effect()
        .file(fireballPreBeam)
        .filter("ColorMatrix", { hue: fireballPreBeamHue })
        .attachTo(token)
        .scaleToObject(1.5)
    
        .effect()
        .file(fireballBeamSupplement)
        .filter("ColorMatrix", { hue: fireballBeamSupplementHue })
        .attachTo(token)
        .stretchTo(templateData)
        .delay(2100)
    
        .effect()
        .file(fireballBeam)
        .attachTo(token)
        .stretchTo(templateData)
        .waitUntilFinished(-1200)
    
        .sound()
        .file(fireballBlastSound)
        .fadeInAudio(500)
        .fadeOutAudio(500)
    
        .effect()
        .file(fireballExplosionBlast)
        .filter("ColorMatrix", { hue: fireballExplosionBlastHue })
        .atLocation(templateData)
        .size(10.5, {gridUnits:true})
        .scaleIn(0, 500, {ease: "easeOutQuint"})
        .zIndex(1)
    
        .effect()
        .file(fireballExplosion)
        .atLocation(templateData)
        .size(10.5, {gridUnits:true})
        .scaleIn(0, 500, {ease: "easeOutQuint"})
        .zIndex(2)
    
        .sound()
        .file(fireballLingerSound)
        .fadeInAudio(500)
        .fadeOutAudio(500)
        .delay(300)
    
        .effect()
        .file(fireballCracks)
        .attachTo(templateData)
        .size(6.5, {gridUnits:true})
        .randomRotation()
        .fadeOut(2000)
        .duration(5000)
        .belowTokens()
        .persist(persistEffect)
        .playIf(() => {
            return scorchedEarth == true;
        })
        .zIndex(0.1)
    
        .play();
    }
}
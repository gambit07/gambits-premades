export async function matalotok({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "preDamageRollComplete" && workflow.hitTargets.first() && workflow.activity.identifier !== "matalotok-cold-damage") {
        let source = token;
        let targets = workflow.hitTargets;
        
        if (!targets || targets?.size === 0) {
            return ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Items.Matalotok.TargetAtLeastOneToken"))
        }
                
        const weapon = 'jb2a.melee_attack.03.maul.01';
        const trail = 'jb2a.melee_attack.04.trail.04.blue';
        const impact = 'jb2a.impact.004.blue';
        const impactScale = 1.5;
        const soundFileMelee = "";
        const soundFileRange = "";
        const delaySound = 300;
        const switchDistanceFt = 5;
        const range = "";
        const returnFile = "";
        const delayBetweenAttacks = 1000;

        await game.gps.weaponAnimations({weapon, trail, impact, impactScale, soundFileMelee, soundFileRange, delaySound, switchDistanceFt, range, returnFile, delayBetweenAttacks, source, targets});
    
        let initialTarget = workflow.hitTargets.first();

        await new Sequence()
    
        .effect()
        .atLocation(initialTarget)
        .file(`jb2a.explosion.07.bluewhite`)
        .belowTokens()
        .fadeOut(2000)
        .scale(2)
        .zIndex(0)
        .waitUntilFinished(-1700)
    
    
        .effect()
        .atLocation(initialTarget)
        .file(`jb2a.sleet_storm.02.blue`)
        .belowTokens(true)
        .zIndex(1)
        .scale(2)
        .duration(10000)
        .fadeIn(500, {ease: "easeOutCirc", delay: 500})
        .fadeOut(500, {ease: "linear"})
    
        .play();
    }
}
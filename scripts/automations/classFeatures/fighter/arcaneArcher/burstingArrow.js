export async function burstingArrow({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "preActiveEffects") {
        let initialTarget = workflow.hitTargets.first();
        const rangeCheck = MidiQOL.findNearby(null, initialTarget, 10, { includeToken: true });
        if (rangeCheck.length === 0) return;

        await new Sequence()

        .effect()
        .atLocation(initialTarget)
        .file(`jb2a.explosion.08.dark_blue`)
        .scale(1.6)
        .belowTokens()
        .fadeOut(2000)
        .zIndex(0)

        .play();
        
        let damageRoll = await new CONFIG.Dice.DamageRoll(`${actor.system.scale["arcane-archer"]["arcane-shot-options"].formula}`, {}, {type: "force", properties: ["mgc"]}).evaluate();
        await MidiQOL.displayDSNForRoll(damageRoll, 'damageRoll');

        const itemData = {
            name: "Bursting Arrow - Damage (Force)",
            type: "feat",
            img: item.img
        }

        for(let target of rangeCheck) {
            if(target.actor.uuid === token.actor.uuid) continue;
            new MidiQOL.DamageOnlyWorkflow(actor, token, damageRoll.total, "force", target ? [target] : [], damageRoll, {itemData: itemData, flavor: "Bursting Arrow - Damage (Force)"});
        }
    }
}
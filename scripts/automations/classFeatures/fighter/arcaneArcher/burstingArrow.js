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

    if(args[0].macroPass === "prePreambleComplete") {
        let itemUses = actor.items.find(i => i.flags["gambits-premades"].gpsUuid === "62e57050-5c6e-4fb1-82d2-ea9a289e7cf9");
        if(itemUses.system.uses?.spent >= itemUses.system.uses?.max) {
            ui.notifications.warn("You have no Arcane Shot uses remaining");
            return workflow.aborted = true;
        }
        let itemValid = await actor.getFlag('gambits-premades', `arcaneShotValid`);
        if(!itemValid) {
            ui.notifications.warn("You must have hit with a bow prior to using this feature.");
            return workflow.aborted = true;
        }
    }
}
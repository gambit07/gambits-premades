export function elementalAffinityType(item) {
    const configured = game.gps?.getCprConfig?.({item, type: "damageType"})?.dType;
    return typeof configured === "string" && Object.hasOwn(CONFIG.DND5E.damageTypes, configured) ? configured : null;
}

export async function elementalAffinity2024({actor, args, workflow}) {
    const pass = args?.[0]?.macroPass;
    if(!workflow || workflow.aborted || workflow.item.type !== "spell") return;
    const source = actor.items.get(workflow.item.id);
    const concentration = MidiQOL.getConcentrationEffect(actor, workflow.item.uuid);
    const explicitCast = workflow.workflowOptions?.gps?.castUuid;
    const repeat = workflow.activity?.identifier?.startsWith("synthetic") || workflow.activity?.consumption?.spellSlot === false;
    const existing = source?.getFlag("gambits-premades", "elementalAffinityCast");
    if(pass === "preItemRoll") {
        const duration = workflow.activity?.duration?.getEffectData?.().value ?? 0;
        (workflow.gps ??= {}).elementalAffinityCast = repeat && existing && (!explicitCast || existing.id === explicitCast) && (concentration || existing.until > game.time.worldTime)
            ? {...existing} : {id: explicitCast ?? foundry.utils.randomID(), used: false, until: game.time.worldTime + duration};
        return;
    }
    const state = workflow.gps?.elementalAffinityCast;
    if(pass === "postActiveEffects") {
        if(state && source) await source.setFlag("gambits-premades", "elementalAffinityCast", state);
        if(state?.used && concentration) await concentration.setFlag("gambits-premades", "elementalAffinityUsed", true);
        return;
    }
    if(pass !== "preDamageRollComplete" || workflow.gps?.elementalAffinity || state?.used) return;
    const item = actor.items.find(item => item.flags["gambits-premades"]?.gpsUuid === "1c11dbbe-c4f3-4208-9449-c025d6a34218");
    if(!item) return;
    const type = elementalAffinityType(item);
    if(!type) return;
    const index = workflow.damageRolls.findIndex(roll => roll.options.type === type);
    if(index < 0) return;
    if((repeat || !state) && concentration?.getFlag("gambits-premades", "elementalAffinityUsed")) return;
    const accepted = await game.gps.confirmAutomationDialog({window: {title: item.name},
        content: `<p>${game.i18n.format("GAMBITSPREMADES.RulesReview.ElementalAffinityPrompt", {bonus: actor.system.abilities.cha.mod, type: game.i18n.localize(CONFIG.DND5E.damageTypes[type].label)})}</p>`, rejectClose: false});
    if(!accepted) return;
    const rolls = [...workflow.damageRolls];
    rolls[index] = await game.gps.adjustRollTotal(rolls[index], actor.system.abilities.cha.mod);
    (workflow.gps ??= {}).elementalAffinity = true;
    if(state) {
        state.used = true;
        if(source) await source.setFlag("gambits-premades", "elementalAffinityCast", state);
    }
    if(concentration) await concentration.setFlag("gambits-premades", "elementalAffinityUsed", true);
    await workflow.setDamageRolls(rolls);
}

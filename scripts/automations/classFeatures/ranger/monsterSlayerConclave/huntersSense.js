export async function huntersSense({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if (args[0].macroPass == 'preActiveEffects' && workflow.targets.count !== 1) return ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.ClassFeatures.Ranger.MonsterSlayerConclave.HuntersSense.TargetSingleCreature"));

    const targetActor = workflow.targets.documents[0].actor;
    const actorPlayer = MidiQOL.playerForActor(actor);

    // Effect names to check if target is immune to Divination Magic, add additional effects below
    let effectNames = ["mind blank", "nondetection", "private sanctum"];
    let isImmuneEffect = targetActor.appliedEffects.some(effect => effectNames.includes(effect.name.toLowerCase()));
    // Item names to check if target is immune to Divination Magic, add additional items below
    let itemNames = ["amulet of proof against detection and location"];
    let isImmuneItem = targetActor.items.some(item => itemNames.includes(item.name.toLowerCase()) && item.system.equipped === true);

    const labels = trait => Array.from(targetActor.system.traits[trait].value, key => dnd5e.documents.Trait.keyLabel(key, {trait}) ?? key).join(", ");

    const chatMessage = await fromUuid(args[0].itemCardUuid);

    const noneLabel = game.i18n.localize("GAMBITSPREMADES.UI.None");

    const damageImmunities = isImmuneEffect || isImmuneItem ? noneLabel : labels("di") || noneLabel;
    const damageResistances = isImmuneEffect || isImmuneItem ? noneLabel : labels("dr") || noneLabel;
    const damageVulnerabilities = isImmuneEffect || isImmuneItem ? noneLabel : labels("dv") || noneLabel;

    const contentUpdate = `${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Ranger.MonsterSlayerConclave.HuntersSense.FollowingDamageTraits", { targetName: targetActor.name })}<br/><br/>
    ${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Ranger.MonsterSlayerConclave.HuntersSense.Immunities")} <b>${damageImmunities}</b><br/><br/>
    ${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Ranger.MonsterSlayerConclave.HuntersSense.Resistances")} <b>${damageResistances}</b><br/><br/>
    ${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Ranger.MonsterSlayerConclave.HuntersSense.Vulnerabilities")} <b>${damageVulnerabilities}</b>`;

    await chatMessage.update({content: contentUpdate, whisper: actorPlayer.id});
}
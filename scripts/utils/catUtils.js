/** Format asset-provider notes for CAT's native Info/Automation tab. */
export function animationModuleNotes(entry) {
    const data = entry.flags?.["gambits-premades"] ?? {};
    const modules = [...new Set(data.animationModules ?? [])]
        .map(name => game.i18n.localize(`GAMBITSPREMADES.AnimationModules.Providers.${name}`));
    const existing = entry.flags?.cat?.automation?.notes;
    return [existing ? game.i18n.localize(existing) : "",
        modules.length ? game.i18n.format("GAMBITSPREMADES.AnimationModules.Note", {modules: modules.join("; ")}) : "",
        data.animationModuleNote ? game.i18n.localize(`GAMBITSPREMADES.AnimationModules.${data.animationModuleNote}`) : ""]
        .filter(Boolean).join("\n");
}

export async function registerCatConfig() {
    if (!game.modules.get("cat")?.active) return;
    if (game.settings.get("cat", "automationSources")["gambits-premades"]?.enabled === false) return;
    cat.api.registerSourceName("gambits-premades", game.modules.get("gambits-premades").title);
    const packs = game.packs.filter(pack => pack.metadata.packageName === "gambits-premades" && pack.metadata.type === "Item");
    const indexes = await Promise.all(packs.map(pack => pack.getIndex({ fields: ["system.identifier", "system.source", "flags.cat.automation", "flags.gambits-premades.itemConfig", "flags.gambits-premades.animationModules", "flags.gambits-premades.animationModuleNote", "flags.gambits-premades.monsterIdentifier"] })));
    const automations = indexes.flatMap(index => index.map(entry => {
        const config = foundry.utils.deepClone(entry.flags?.["gambits-premades"]?.itemConfig ?? {});
        for (const descriptor of Object.values(config)) {
            if (!descriptor.options) continue;
            descriptor.options = descriptor.options.filter(option => option.value === descriptor.default || !option.requiredModules?.some(id => !game.modules.get(id)?.active));
            if (!descriptor.options.some(option => option.value === descriptor.default)) descriptor.options.push({ value: descriptor.default, label: String(descriptor.default) });
            for (const option of descriptor.options) option.label = game.i18n.localize(option.label);
        }
        return {
            source: "gambits-premades",
            rules: entry.system.source.rules,
            identifier: entry.system.identifier,
            uuid: entry.uuid,
            version: entry.flags.cat.automation.version,
            type: entry.type,
            ...(entry.flags["gambits-premades"]?.monsterIdentifier ? {monsterIdentifier: entry.flags["gambits-premades"].monsterIdentifier} : {}),
            notes: animationModuleNotes(entry),
            config
        };
    }));
    if (automations.length) cat.api.registerAutomations(automations);
}

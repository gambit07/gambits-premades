function registerSettings() {
    game.settings.register('gambits-premades', 'Enable Opportunity Attack', {
        name: "Enable Opportunity Attack",
        hint: "If enabled, automatically adds 'Opportunity Attack' item to appropriate combatants on combat start and removes 'Opportunity Attack' item on combat end.",
        scope: 'world',
        config: true,
        type: Boolean,
        default: false
    });
    game.settings.register('gambits-premades', 'Enable Counterspell', {
        name: "Enable Counterspell",
        hint: "If enabled, automatically adds 'Counterspell Initializer' item to appropriate combatants on combat start and removes 'Counterspell Initializer' item on combat end.",
        scope: 'world',
        config: true,
        type: Boolean,
        default: false
    });
}
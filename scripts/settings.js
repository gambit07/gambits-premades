function registerSettings() {
    game.settings.register('gambits-premades', 'Enable Opportunity Attack', {
        name: "Enable Opportunity Attack",
        hint: "If enabled, automatically adds 'Opportunity Attack' item to combatants on combat start and removes 'Opportunity Attack' item on combat end.",
        scope: 'world',
        config: true,
        type: Boolean,
        default: false
    });
}
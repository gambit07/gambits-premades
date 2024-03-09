function registerSettings() {
    game.settings.register('gambits-premades', 'Enable Opportunity Attack', {
        name: "Enable Opportunity Attack",
        hint: "If enabled, automatically adds 'Opportunity Attack' item to appropriate combatants on combat start and removes 'Opportunity Attack' item on combat end.",
        scope: 'world',
        config: true,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Opportunity Attack Timeout', {
        name: "Opportunity Attack Timeout",
        hint: "Enter custom number (in seconds). Default timeout value is 15 seconds.",
        scope: 'world',
        config: true,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
                // Used numericValue as a number
            } else {
                // Handle invalid input
                console.error("Invalid input for Numeric Setting Example: Not a number.");
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Counterspell', {
        name: "Enable Counterspell",
        hint: "If enabled, this will present an appropriate dialog to users with counterspell, and automate counterspell application when used.",
        scope: 'world',
        config: true,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Counterspell Timeout', {
        name: "Counterspell Timeout",
        hint: "Enter custom number (in seconds). Default timeout value is 15 seconds.",
        scope: 'world',
        config: true,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
                // Used numericValue as a number
            } else {
                // Handle invalid input
                console.error("Invalid input for Numeric Setting Example: Not a number.");
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Silvery Barbs', {
        name: "Enable Silvery Barbs",
        hint: "If enabled, this will present an appropriate dialog to users with silvery barbs, and automate silvery barbs application when used.",
        scope: 'world',
        config: true,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Silvery Barbs Timeout', {
        name: "Silvery Barbs Timeout",
        hint: "Enter custom number (in seconds). Default timeout value is 30 seconds.",
        scope: 'world',
        config: true,
        type: String,
        default: "30",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
                // Used numericValue as a number
            } else {
                // Handle invalid input
                console.error("Invalid input for Numeric Setting Example: Not a number.");
            }
        }
    });

    game.settings.registerMenu('gambits-premades', 'customConfig', {
        name: game.i18n.localize("Configure Homebrew Options"),
        label: game.i18n.localize("Configure"),
        hint: game.i18n.localize("Homebrew options for the spells below"),
        icon: 'fas fa-wrench',
        scope: 'world',
        config: true,
        type: homebrewSettingsMenu,
        restricted: true
    });

    game.settings.register("gambits-premades", "disableSilveryBarbsOnNat20", {
        name: "disableSilveryBarbsOnNat20",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        type: Boolean
    });
}

class homebrewSettingsMenu extends FormApplication {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "homebrewSettingsMenu",
            title: "Homebrew Options",
            template: "modules/gambits-premades/templates/homebrewSettingsMenu.html",
            classes: ["gambits-premades", "settings-window"],
            width: 500,
            closeOnSubmit: true
        });
    }

    getData() {
        return {
            disableSilveryBarbsOnNat20: game.settings.get("gambits-premades", "disableSilveryBarbsOnNat20")
        };
    }

    async _updateObject(event, formData) {
        await game.settings.set("gambits-premades", "disableSilveryBarbsOnNat20", formData.disableSilveryBarbsOnNat20);
    }
}
function registerSettings() {
    game.settings.register('gambits-premades', 'Mirror 3rd Party Dialog for GMs', {
        name: "Mirror 3rd Party Dialog for GMs",
        hint: "If enabled, 3rd party dialog's with the exception of Opportunity Attack will be sent to the GM as well as the player. Either party can interact with the dialog to use or dismiss it.",
        scope: 'world',
        config: true,
        type: Boolean,
        default: false
    });

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

    game.settings.register('gambits-premades', 'Enable Cutting Words', {
        name: "Enable Cutting Words",
        hint: "If enabled, this will present an appropriate dialog to users with cutting words, and automate cutting words application when used.",
        scope: 'world',
        config: true,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Cutting Words Timeout', {
        name: "Cutting Words Timeout",
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

    game.settings.register('gambits-premades', 'Enable Interception', {
        name: "Enable Interception",
        hint: "If enabled, this will present an appropriate dialog to users with fighting style: interception, and automate interception application when used.",
        scope: 'world',
        config: true,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Interception Timeout', {
        name: "Interception Timeout",
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

    /*game.settings.register('gambits-premades', 'Enable Poetry In Misery', {
        name: "Enable Poetry In Misery",
        hint: "If enabled, this will present an appropriate dialog to users with bards Poetry in Misery feature, and automate application when used.",
        scope: 'world',
        config: true,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Poetry In Misery Timeout', {
        name: "Poetry In Misery Timeout",
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
    });*/

    game.settings.register('gambits-premades', 'Enable Identify Restrictions', {
        name: "Enable Identify Restrictions",
        hint: "If enabled, this will prevent player characters from Identifying unidentified items through usual methods.",
        scope: 'world',
        config: true,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Identify Restriction Message', {
        name: "Identify Restriction Message",
        hint: "This is the message that will display to users if they are restricted.",
        scope: 'world',
        config: true,
        type: String,
        default: "Nice try, DENIED ;)"
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
    
    game.settings.register("gambits-premades", "enableSilveryBarbsOnNat20", {
        name: "enableSilveryBarbsOnNat20",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        type: Boolean
    });

    game.settings.register("gambits-premades", "enableAutoSucceedIndomitable", {
        name: "enableAutoSucceedIndomitable",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        type: Boolean
    });

    game.settings.register("gambits-premades", "enableProtectionOnSuccess", {
        name: "enableProtectionOnSuccess",
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
            disableSilveryBarbsOnNat20: game.settings.get("gambits-premades", "disableSilveryBarbsOnNat20"),
            enableSilveryBarbsOnNat20: game.settings.get("gambits-premades", "enableSilveryBarbsOnNat20"),
            enableAutoSucceedIndomitable: game.settings.get("gambits-premades", "enableAutoSucceedIndomitable"),
            enableProtectionOnSuccess: game.settings.get("gambits-premades", "enableProtectionOnSuccess")
        };
    }

    async _updateObject(event, formData) {
        await game.settings.set("gambits-premades", "disableSilveryBarbsOnNat20", formData.disableSilveryBarbsOnNat20);
        await game.settings.set("gambits-premades", "enableSilveryBarbsOnNat20", formData.enableSilveryBarbsOnNat20);
        await game.settings.set("gambits-premades", "enableAutoSucceedIndomitable", formData.enableAutoSucceedIndomitable);
        await game.settings.set("gambits-premades", "enableProtectionOnSuccess", formData.enableProtectionOnSuccess);
    }
}
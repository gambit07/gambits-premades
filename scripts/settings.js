function registerSettings() {
    game.settings.register('gambits-premades', 'Mirror 3rd Party Dialog for GMs', {
        name: "Mirror 3rd Party Dialog for GMs",
        hint: "If enabled, 3rd party dialog's will be sent to the GM as well as the player. Either party can interact with the dialog to use/dismiss/pause it.",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Enable Opportunity Attack', {
        name: "Enable Opportunity Attack",
        hint: "If enabled, automatically adds 'Opportunity Attack' item to appropriate combatants on combat start and removes 'Opportunity Attack' item on combat end.",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Opportunity Attack Timeout', {
        name: "Opportunity Attack Timeout",
        hint: "Enter custom number (in seconds). Default timeout value is 15 seconds.",
        scope: 'world',
        config: false,
        type: String,
        default: "15"
    });

    game.settings.register('gambits-premades', 'Enable Counterspell', {
        name: "Enable Counterspell",
        hint: "If enabled, this will present an appropriate dialog to users with counterspell, and automate counterspell application when used.",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Counterspell Timeout', {
        name: "Counterspell Timeout",
        hint: "Enter custom number (in seconds). Default timeout value is 15 seconds.",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                console.error("Invalid input for Numeric Setting Example: Not a number.");
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Silvery Barbs', {
        name: "Enable Silvery Barbs",
        hint: "If enabled, this will present an appropriate dialog to users with silvery barbs, and automate silvery barbs application when used.",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Silvery Barbs Timeout', {
        name: "Silvery Barbs Timeout",
        hint: "Enter custom number (in seconds). Default timeout value is 30 seconds.",
        scope: 'world',
        config: false,
        type: String,
        default: "30",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                console.error("Invalid input for Numeric Setting Example: Not a number.");
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Cutting Words', {
        name: "Enable Cutting Words",
        hint: "If enabled, this will present an appropriate dialog to users with cutting words, and automate cutting words application when used.",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Cutting Words Timeout', {
        name: "Cutting Words Timeout",
        hint: "Enter custom number (in seconds). Default timeout value is 30 seconds.",
        scope: 'world',
        config: false,
        type: String,
        default: "30",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                console.error("Invalid input for Numeric Setting Example: Not a number.");
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Interception', {
        name: "Enable Interception",
        hint: "If enabled, this will present an appropriate dialog to users with fighting style: interception, and automate interception application when used.",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Interception Timeout', {
        name: "Interception Timeout",
        hint: "Enter custom number (in seconds). Default timeout value is 30 seconds.",
        scope: 'world',
        config: false,
        type: String,
        default: "30",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                console.error("Invalid input for Numeric Setting Example: Not a number.");
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Indomitable', {
        name: "Enable Indomitable",
        hint: "",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Indomitable Timeout', {
        name: "Indomitable Timeout",
        hint: "",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                console.error("Invalid input for Numeric Setting Example: Not a number.");
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Protection', {
        name: "Enable Protection",
        hint: "",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Protection Timeout', {
        name: "Protection Timeout",
        hint: "",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                console.error("Invalid input for Numeric Setting Example: Not a number.");
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Sentinel', {
        name: "Enable Sentinel",
        hint: "",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Sentinel Timeout', {
        name: "Sentinel Timeout",
        hint: "",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                console.error("Invalid input for Numeric Setting Example: Not a number.");
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Riposte', {
        name: "Enable Riposte",
        hint: "",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Riposte Timeout', {
        name: "Riposte Timeout",
        hint: "",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                console.error("Invalid input for Numeric Setting Example: Not a number.");
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Poetry in Misery', {
        name: "Enable Poetry in Misery",
        hint: "If enabled, this will present an appropriate dialog to users with bards Poetry in Misery feature, and automate application when used.",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Poetry in Misery Timeout', {
        name: "Poetry in Misery Timeout",
        hint: "Enter custom number (in seconds). Default timeout value is 15 seconds.",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                console.error("Invalid input for Numeric Setting Example: Not a number.");
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Witches Hex', {
        name: "Enable Witches Hex",
        hint: "If enabled, this will present an appropriate dialog to users with the witches Hex feature, and automate application when used.",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Witches Hex Timeout', {
        name: "Witches Hex Timeout",
        hint: "Enter custom number (in seconds). Default timeout value is 30 seconds.",
        scope: 'world',
        config: false,
        type: String,
        default: "30",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                console.error("Invalid input for Numeric Setting Example: Not a number.");
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Power Word Rebound', {
        name: "Enable Power Word Rebound",
        hint: "If enabled, this will present an appropriate dialog to users with the power word rebound spell, and automate application when used.",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Power Word Rebound Timeout', {
        name: "Power Word Rebound Timeout",
        hint: "Enter custom number (in seconds). Default timeout value is 30 seconds.",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                console.error("Invalid input for Numeric Setting Example: Not a number.");
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Cloud Rune', {
        name: "Enable Cloud Rune",
        hint: "If enabled, this will present an appropriate dialog to users with the cloud rune feature, and automate application when used.",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Cloud Rune Timeout', {
        name: "Cloud Rune Timeout",
        hint: "Enter custom number (in seconds). Default timeout value is 30 seconds.",
        scope: 'world',
        config: false,
        type: String,
        default: "30",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                console.error("Invalid input for Numeric Setting Example: Not a number.");
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Identify Restrictions', {
        name: "Enable Identify Restrictions",
        hint: "If enabled, this will prevent player characters from Identifying unidentified items except through the use of my Identify spell automation.",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Identify Restriction Message', {
        name: "Identify Restriction Message",
        hint: "This is the message that will display to users if they are restricted.",
        scope: 'world',
        config: false,
        type: String,
        default: "Nice try, DENIED ;)"
    });

    game.settings.register('gambits-premades', 'enableTimerFullAnim', {
        name: "Enable Timer Full Bar Animation",
        hint: "If enabled, this will cause the countdown timer animation for dialogs to cover the full title bar instead of the title bar border.",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'enable3prNoCombat', {
        name: "Enable 3rd Party Reactions Outside Combat",
        hint: "If enabled, this will allow 3rd party reactions to function while combat is not active.",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'hideTemplates', {
        name: "Hide Templates",
        hint: "This option is always enabled for Opportunity Attacks. If this setting is enabled, it will fully hide templates for other automations that use templates in my module. It will NOT hide templates for automations or templates created outside of my module.",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'debugEnabled', {
        name: "Enable Debug",
        hint: "If enabled, this will output console logs for the reaction validation process for troubleshooting.",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
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

    game.settings.register("gambits-premades", "enableInterceptionCustomDice", {
        name: "enableInterceptionCustomDice",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        type: Boolean
    });

    game.settings.register('gambits-premades', 'enableInterceptionCustomDiceNumber', {
        name: "enableInterceptionCustomDiceNumber",
        hint: "Enter custom number. Default timeout value is 1.",
        scope: 'world',
        config: false,
        type: String,
        default: "1",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                console.error("Invalid input for enableInterceptionCustomDiceNumber: Not a number.");
            }
        }
    });

    game.settings.register('gambits-premades', 'enableInterceptionCustomDiceFace', {
        name: "enableInterceptionCustomDiceFace",
        hint: "Enter custom number. Default timeout value is 10.",
        scope: 'world',
        config: false,
        type: String,
        default: "10",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                console.error("Invalid input for enableInterceptionCustomDiceFace: Not a number.");
            }
        }
    });

    game.settings.register("gambits-premades", "enableCounterspellSpellPenetration", {
        name: "enableCounterspellSpellPenetration",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        type: Boolean
    });

    game.settings.register("gambits-premades", "enableRunicShield", {
        name: "enableRunicShield",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        type: Boolean
    });

    game.settings.register('gambits-premades', 'Runic Shield Timeout', {
        name: "Runic Shield Timeout",
        hint: "Enter custom number (in seconds). Default timeout value is 15 seconds.",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                console.error("Invalid input for Numeric Setting Example: Not a number.");
            }
        }
    });

    game.settings.register("gambits-premades", "enableMageSlayer", {
        name: "enableMageSlayer",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        type: Boolean
    });

    game.settings.register('gambits-premades', 'Mage Slayer Timeout', {
        name: "Mage Slayer Timeout",
        hint: "Enter custom number (in seconds). Default timeout value is 15 seconds.",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                console.error("Invalid input for Numeric Setting Example: Not a number.");
            }
        }
    });

    game.settings.register("gambits-premades", "enableInstinctiveCharm", {
        name: "enableInstinctiveCharm",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        type: Boolean
    });

    game.settings.register('gambits-premades', 'Instinctive Charm Timeout', {
        name: "Instinctive Charm Timeout",
        hint: "Enter custom number (in seconds). Default timeout value is 15 seconds.",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                console.error("Invalid input for Numeric Setting Example: Not a number.");
            }
        }
    });

    game.settings.register("gambits-premades", "enableRainOfCinders", {
        name: "enableRainOfCinders",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        type: Boolean
    });

    game.settings.register('gambits-premades', 'Rain of Cinders Timeout', {
        name: "Rain of Cinders Timeout",
        hint: "Enter custom number (in seconds). Default timeout value is 15 seconds.",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                console.error("Invalid input for Numeric Setting Example: Not a number.");
            }
        }
    });

    game.settings.register("gambits-premades", "enableRegionWrapping", {
        name: "enableRegionWrapping",
        scope: "world",
        config: false,
        type: Boolean,
        default: true,
        type: Boolean
    });

    game.settings.register('gambits-premades', 'primaryGM', {
        name: "primaryGM",
        hint: "",
        scope: 'world',
        config: false,
        type: String,
        default: ""
    });

    game.settings.registerMenu('gambits-premades', 'generalSettings', {
        name: game.i18n.localize("General Settings"),
        label: game.i18n.localize("General Settings"),
        hint: game.i18n.localize("Mirror Dialog, Identify Restriction, etc"),
        icon: 'fas fa-cogs',
        scope: 'world',
        config: true,
        type: generalSettingsMenu,
        restricted: true
    });

    game.settings.registerMenu('gambits-premades', 'spells', {
        name: game.i18n.localize("Spells"),
        label: game.i18n.localize("Enable Spells"),
        hint: game.i18n.localize("Counterspell, Silvery Barbs, etc"),
        icon: 'fas fa-magic',
        scope: 'world',
        config: true,
        type: spellSettingsMenu,
        restricted: true
    });

    game.settings.registerMenu('gambits-premades', 'classFeatures', {
        name: game.i18n.localize("Class Features"),
        label: game.i18n.localize("Enable Class Features"),
        hint: game.i18n.localize("Cutting Words, Interception, Poetry in Misery, etc"),
        icon: 'fas fa-book',
        scope: 'world',
        config: true,
        type: classFeaturesSettingsMenu,
        restricted: true
    });

    game.settings.registerMenu('gambits-premades', 'genericFeatures', {
        name: game.i18n.localize("Generic Features"),
        label: game.i18n.localize("Enable Generic Features"),
        hint: game.i18n.localize("Opportunity Attack, Sentinel, etc"),
        icon: 'fas fa-globe',
        scope: 'world',
        config: true,
        type: genericFeatureSettingsMenu,
        restricted: true
    });
}

class BaseSettingsMenu extends FormApplication {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["gambits-premades", "settings-window"],
            width: 700,
            closeOnSubmit: true
        });
    }

    activateListeners(html) {
        super.activateListeners(html);
        this.expandCheckedCollapsibleSections(html);
        this.populateSelectElements(html);

        function validateNumericInput(inputElement) {
            const numericValue = Number(inputElement.value);
            if (isNaN(numericValue)) {
                console.error("Invalid input: Not a number.");
                inputElement.value = inputElement.defaultValue;
            }
        }

        html.find('.column-enable-td input[type="checkbox"]').on('click', (event) => {
            event.stopPropagation();
        });

        html.find('.clickable').on('click', (event) => {
            const contentId = $(event.currentTarget).data('content-id');
            this.toggleCollapsibleContent(event, contentId);
        });

        html.find('.column-timeout input[data-dtype="String"]').on('input', function() {
            validateNumericInput(this);
        });
    }

    expandCheckedCollapsibleSections(html) {
        const data = this.getData();

        if (data.enableProtection && data.enableProtectionOnSuccess) {
            const protectionContent = html.find('#collapsible-content-protection');
            if (protectionContent.length) {
                protectionContent.addClass('show');
            }
        }

        if (data.enableIndomitable && data.enableAutoSucceedIndomitable) {
            const indomitableContent = html.find('#collapsible-content-indomitable');
            if (indomitableContent.length) {
                indomitableContent.addClass('show');
            }
        }

        if (data.enableSilveryBarbs && (data.disableSilveryBarbsOnNat20 || data.enableSilveryBarbsOnNat20)) {
            const silveryBarbsContent = html.find('#collapsible-content-silverybarbs');
            if (silveryBarbsContent.length) {
                silveryBarbsContent.addClass('show');
            }
        }

        if (data.enableInterception && data.enableInterceptionCustomDice) {
            const interceptionContent = html.find('#collapsible-content-interception');
            if (interceptionContent.length) {
                interceptionContent.addClass('show');
            }
        }

        if (data.enableCounterspell && data.enableCounterspellSpellPenetration) {
            const counterspellContent = html.find('#collapsible-content-counterspell');
            if (counterspellContent.length) {
                counterspellContent.addClass('show');
            }
        }
    }

    toggleCollapsibleContent(event, contentId) {
        if (event.target.tagName.toLowerCase() === 'input' || event.target.tagName.toLowerCase() === 'label') {
            return;
        }

        const content = document.getElementById(contentId);
        if (!content) return;
        const wasVisible = content.classList.contains('show');
        content.classList.toggle('show');

        const form = event.currentTarget.closest('form.categories');
        let newHeight = form.scrollHeight;
        const parent = form.closest('.window-app');

        if (parent) {
            parent.style.height = newHeight + 'px';
            if (wasVisible) {
                newHeight -= content.scrollHeight;
            } else {
                newHeight += content.scrollHeight;
            }
            parent.style.height = newHeight + 'px';
        }
    }

    populateSelectElements(html) {

        const settings = {
            enableInterceptionCustomDiceNumber: Number(game.settings.get("gambits-premades", "enableInterceptionCustomDiceNumber")),
            enableInterceptionCustomDiceFace: Number(game.settings.get("gambits-premades", "enableInterceptionCustomDiceFace")),
            primaryGM: game.settings.get("gambits-premades", "primaryGM")
        };

        const numberSelect = html.find('#enableInterceptionCustomDiceNumber');
        for (let i = 1; i <= 10; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            if (i === settings.enableInterceptionCustomDiceNumber) {
                option.selected = true;
            }
            numberSelect.append(option);
        };

        const faceSelect = html.find('#enableInterceptionCustomDiceFace');
        const faces = [4, 6, 8, 10, 12, 20];
        faces.forEach(face => {
            const option = document.createElement('option');
            option.value = face;
            option.textContent = `d${face}`;
            if (face === settings.enableInterceptionCustomDiceFace) {
                option.selected = true;
            }
            faceSelect.append(option);
        });

        const primaryGM = html.find('#primaryGM');
        for (const user of game.users.contents) {
            if(!user.isGM) continue;
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            if (user.id === settings.primaryGM) {
                option.selected = true;
            }
            primaryGM.append(option);
        };
    }
}

class classFeaturesSettingsMenu extends BaseSettingsMenu {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "classFeaturesSettingsMenu",
            title: "Enable Class Features",
            template: "modules/gambits-premades/templates/classFeaturesSettingsMenu.html",
        });
    }

    getData() {
        const data = {
            enableCuttingWords: game.settings.get("gambits-premades", "Enable Cutting Words"),
            cuttingWordsTimeout: game.settings.get("gambits-premades", "Cutting Words Timeout"),
            enableInterception: game.settings.get("gambits-premades", "Enable Interception"),
            interceptionTimeout: game.settings.get("gambits-premades", "Interception Timeout"),
            enableInterceptionCustomDice: game.settings.get("gambits-premades", "enableInterceptionCustomDice"),
            enableInterceptionCustomDiceNumber: game.settings.get("gambits-premades", "enableInterceptionCustomDiceNumber"),
            enableInterceptionCustomDiceFace: game.settings.get("gambits-premades", "enableInterceptionCustomDiceFace"),
            enablePoetryInMisery: game.settings.get("gambits-premades", "Enable Poetry in Misery"),
            poetryInMiseryTimeout: game.settings.get("gambits-premades", "Poetry in Misery Timeout"),
            enableIndomitable: game.settings.get("gambits-premades", "Enable Indomitable"),
            indomitableTimeout: game.settings.get("gambits-premades", "Indomitable Timeout"),
            enableAutoSucceedIndomitable: game.settings.get("gambits-premades", "enableAutoSucceedIndomitable"),
            enableProtection: game.settings.get("gambits-premades", "Enable Protection"),
            protectionTimeout: game.settings.get("gambits-premades", "Protection Timeout"),
            enableProtectionOnSuccess: game.settings.get("gambits-premades", "enableProtectionOnSuccess"),
            enableRiposte: game.settings.get("gambits-premades", "Enable Riposte"),
            riposteTimeout: game.settings.get("gambits-premades", "Riposte Timeout"),
            enableWitchesHex: game.settings.get("gambits-premades", "Enable Witches Hex"),
            witchesHexTimeout: game.settings.get("gambits-premades", "Witches Hex Timeout"),
            enableCloudRune: game.settings.get("gambits-premades", "Enable Cloud Rune"),
            cloudRuneTimeout: game.settings.get("gambits-premades", "Cloud Rune Timeout"),
            enableRunicShield: game.settings.get("gambits-premades", "enableRunicShield"),
            runicShieldTimeout: game.settings.get("gambits-premades", "Runic Shield Timeout"),
            enableInstinctiveCharm: game.settings.get("gambits-premades", "enableInstinctiveCharm"),
            instinctiveCharmTimeout: game.settings.get("gambits-premades", "Instinctive Charm Timeout"),
            enableRainOfCinders: game.settings.get("gambits-premades", "enableRainOfCinders"),
            rainOfCindersTimeout: game.settings.get("gambits-premades", "Rain of Cinders Timeout")
        };

        return data;
    }

    async _updateObject(event, formData) {
        await game.settings.set("gambits-premades", "Enable Cutting Words", formData.enableCuttingWords);
        await game.settings.set("gambits-premades", "Cutting Words Timeout", formData.cuttingWordsTimeout);
        await game.settings.set("gambits-premades", "Enable Interception", formData.enableInterception);
        await game.settings.set("gambits-premades", "Interception Timeout", formData.interceptionTimeout);
        await game.settings.set("gambits-premades", "enableInterceptionCustomDice", formData.enableInterceptionCustomDice);
        await game.settings.set("gambits-premades", "enableInterceptionCustomDiceNumber", formData.enableInterceptionCustomDiceNumber);
        await game.settings.set("gambits-premades", "enableInterceptionCustomDiceFace", formData.enableInterceptionCustomDiceFace);
        await game.settings.set("gambits-premades", "Enable Poetry in Misery", formData.enablePoetryInMisery);
        await game.settings.set("gambits-premades", "Poetry in Misery Timeout", formData.poetryInMiseryTimeout);
        await game.settings.set("gambits-premades", "Enable Indomitable", formData.enableIndomitable);
        await game.settings.set("gambits-premades", "Indomitable Timeout", formData.indomitableTimeout);
        await game.settings.set("gambits-premades", "enableAutoSucceedIndomitable", formData.enableAutoSucceedIndomitable);
        await game.settings.set("gambits-premades", "Enable Protection", formData.enableProtection);
        await game.settings.set("gambits-premades", "Protection Timeout", formData.protectionTimeout);
        await game.settings.set("gambits-premades", "enableProtectionOnSuccess", formData.enableProtectionOnSuccess);
        await game.settings.set("gambits-premades", "Enable Riposte", formData.enableRiposte);
        await game.settings.set("gambits-premades", "Riposte Timeout", formData.riposteTimeout);
        await game.settings.set("gambits-premades", "Enable Witches Hex", formData.enableWitchesHex);
        await game.settings.set("gambits-premades", "Witches Hex Timeout", formData.witchesHexTimeout);
        await game.settings.set("gambits-premades", "Enable Cloud Rune", formData.enableCloudRune);
        await game.settings.set("gambits-premades", "Cloud Rune Timeout", formData.cloudRuneTimeout);
        await game.settings.set("gambits-premades", "enableRunicShield", formData.enableRunicShield);
        await game.settings.set("gambits-premades", "Runic Shield Timeout", formData.runicShieldTimeout);
        await game.settings.set("gambits-premades", "enableInstinctiveCharm", formData.enableInstinctiveCharm);
        await game.settings.set("gambits-premades", "Instinctive Charm Timeout", formData.instinctiveCharmTimeout);
        await game.settings.set("gambits-premades", "enableRainOfCinders", formData.enableRainOfCinders);
        await game.settings.set("gambits-premades", "Rain of Cinders Timeout", formData.rainOfCindersTimeout);
    }
}

class genericFeatureSettingsMenu extends BaseSettingsMenu {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "genericFeatureSettingsMenu",
            title: "Enable Generic Features",
            template: "modules/gambits-premades/templates/genericFeatureSettingsMenu.html",
        });
    }

    getData() {
        return {
            enableOpportunityAttack: game.settings.get("gambits-premades", "Enable Opportunity Attack"),
            opportunityAttackTimeout: game.settings.get("gambits-premades", "Opportunity Attack Timeout"),
            enableSentinel: game.settings.get("gambits-premades", "Enable Sentinel"),
            sentinelTimeout: game.settings.get("gambits-premades", "Sentinel Timeout"),
            enableMageSlayer: game.settings.get("gambits-premades", "enableMageSlayer"),
            mageSlayerTimeout: game.settings.get("gambits-premades", "Mage Slayer Timeout")
        };
    }

    async _updateObject(event, formData) {
        const prevEnableOpportunityAttack = game.settings.get("gambits-premades", "Enable Opportunity Attack");
        if (!game.combat) {
            await game.settings.set("gambits-premades", "Enable Opportunity Attack", formData.enableOpportunityAttack);
        }
        else if (game.combat && prevEnableOpportunityAttack !== formData.enableOpportunityAttack) {
            ui.notifications.warn("You may only enable/disable Opportunity Attack outside of combat, otherwise it will create a number of issues.")
        }
        await game.settings.set("gambits-premades", "Opportunity Attack Timeout", formData.opportunityAttackTimeout);
        await game.settings.set("gambits-premades", "Enable Sentinel", formData.enableSentinel);
        await game.settings.set("gambits-premades", "Sentinel Timeout", formData.sentinelTimeout);
        await game.settings.set("gambits-premades", "enableMageSlayer", formData.enableMageSlayer);
        await game.settings.set("gambits-premades", "Mage Slayer Timeout", formData.mageSlayerTimeout);
    }
}

class spellSettingsMenu extends BaseSettingsMenu {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "spellSettingsMenu",
            title: "Enable Spells",
            template: "modules/gambits-premades/templates/spellSettingsMenu.html",
        });
    }

    getData() {
        return {
            enableCounterspell: game.settings.get("gambits-premades", "Enable Counterspell"),
            counterspellTimeout: game.settings.get("gambits-premades", "Counterspell Timeout"),
            enableCounterspellSpellPenetration: game.settings.get("gambits-premades", "enableCounterspellSpellPenetration"),
            enableSilveryBarbs: game.settings.get("gambits-premades", "Enable Silvery Barbs"),
            silveryBarbsTimeout: game.settings.get("gambits-premades", "Silvery Barbs Timeout"),
            disableSilveryBarbsOnNat20: game.settings.get("gambits-premades", "disableSilveryBarbsOnNat20"),
            enableSilveryBarbsOnNat20: game.settings.get("gambits-premades", "enableSilveryBarbsOnNat20"),
            enablePowerWordRebound: game.settings.get("gambits-premades", "Enable Power Word Rebound"),
            powerWordReboundTimeout: game.settings.get("gambits-premades", "Power Word Rebound Timeout")
        };
    }

    async _updateObject(event, formData) {
        await game.settings.set("gambits-premades", "Enable Counterspell", formData.enableCounterspell);
        await game.settings.set("gambits-premades", "Counterspell Timeout", formData.counterspellTimeout);
        await game.settings.set("gambits-premades", "enableCounterspellSpellPenetration", formData.enableCounterspellSpellPenetration);
        await game.settings.set("gambits-premades", "Enable Silvery Barbs", formData.enableSilveryBarbs);
        await game.settings.set("gambits-premades", "Silvery Barbs Timeout", formData.silveryBarbsTimeout);
        await game.settings.set("gambits-premades", "disableSilveryBarbsOnNat20", formData.disableSilveryBarbsOnNat20);
        await game.settings.set("gambits-premades", "enableSilveryBarbsOnNat20", formData.enableSilveryBarbsOnNat20);
        await game.settings.set("gambits-premades", "Enable Power Word Rebound", formData.enablePowerWordRebound);
        await game.settings.set("gambits-premades", "Power Word Rebound Timeout", formData.powerWordReboundTimeout);
    }
}

class generalSettingsMenu extends BaseSettingsMenu {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "generalSettingsMenu",
            title: "General Settings",
            template: "modules/gambits-premades/templates/generalSettingsMenu.html",
        });
    }

    getData() {
        return {
            enableMirrorDialog: game.settings.get("gambits-premades", "Mirror 3rd Party Dialog for GMs"),
            enable3prNoCombat: game.settings.get("gambits-premades", "enable3prNoCombat"),
            enableTimerFullAnim: game.settings.get("gambits-premades", "enableTimerFullAnim"),
            hideTemplates: game.settings.get("gambits-premades", "hideTemplates"),
            debugEnabled: game.settings.get("gambits-premades", "debugEnabled"),
            enableIdentifyRestrictions: game.settings.get("gambits-premades", "Enable Identify Restrictions"),
            identifyRestrictionMessage: game.settings.get("gambits-premades", "Identify Restriction Message"),
            enableRegionWrapping: game.settings.get("gambits-premades", "enableRegionWrapping"),
            primaryGM: game.settings.get("gambits-premades", "primaryGM")
        };
    }

    async _updateObject(event, formData) {
        await game.settings.set("gambits-premades", "Mirror 3rd Party Dialog for GMs", formData.enableMirrorDialog);
        await game.settings.set("gambits-premades", "enable3prNoCombat", formData.enable3prNoCombat);
        await game.settings.set("gambits-premades", "enableTimerFullAnim", formData.enableTimerFullAnim);
        await game.settings.set("gambits-premades", "hideTemplates", formData.hideTemplates);
        await game.settings.set("gambits-premades", "debugEnabled", formData.debugEnabled);
        await game.settings.set("gambits-premades", "Enable Identify Restrictions", formData.enableIdentifyRestrictions);
        await game.settings.set("gambits-premades", "Identify Restriction Message", formData.identifyRestrictionMessage);
        await game.settings.set("gambits-premades", "enableRegionWrapping", formData.enableRegionWrapping);
        await game.settings.set("gambits-premades", "primaryGM", formData.primaryGM);
    }
}
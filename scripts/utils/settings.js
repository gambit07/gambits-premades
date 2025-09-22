// Create a Base class mixing in Handlebars support onto V2 Application
const Base = foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2);

export function registerSettings() {
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

    game.settings.register("gambits-premades", "enableCounterspellSpellPenetration", {
        name: "enableCounterspellSpellPenetration",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        type: Boolean
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

    game.settings.register("gambits-premades", "enableRestoreBalance", {
        name: "enableRestoreBalance",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        type: Boolean
    });

    game.settings.register('gambits-premades', 'Restore Balance Timeout', {
        name: "Restore Balance Timeout",
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

    game.settings.register("gambits-premades", "enableLegendaryResistance", {
        name: "enableLegendaryResistance",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        type: Boolean
    });

    game.settings.register('gambits-premades', 'Legendary Resistance Timeout', {
        name: "Legendary Resistance Timeout",
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

    game.settings.register("gambits-premades", "enableBurstOfIngenuity", {
        name: "enableBurstOfIngenuity",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        type: Boolean
    });

    game.settings.register('gambits-premades', 'Burst of Ingenuity Timeout', {
        name: "Burst of Ingenuity Timeout",
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

    game.settings.register("gambits-premades", "enableTemporalShunt", {
        name: "enableTemporalShunt",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        type: Boolean
    });

    game.settings.register('gambits-premades', 'Temporal Shunt Timeout', {
        name: "Temporal Shunt Timeout",
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

    game.settings.register("gambits-premades", "enableChronalShift", {
        name: "enableChronalShift",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        type: Boolean
    });

    game.settings.register('gambits-premades', 'Chronal Shift Timeout', {
        name: "Chronal Shift Timeout",
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

    game.settings.register("gambits-premades", "enableMagicUsersNemesis", {
        name: "enableMagicUsersNemesis",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        type: Boolean
    });

    game.settings.register('gambits-premades', "Magic-User's Nemesis Timeout", {
        name: "Magic-User's Nemesis Timeout",
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

    game.settings.register("gambits-premades", "enableDreadCounterspell", {
        name: "enableDreadCounterspell",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        type: Boolean
    });

    game.settings.register('gambits-premades', "Dread Counterspell Timeout", {
        name: "Dread Counterspell Timeout",
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

    game.settings.register("gambits-premades", "enableTaleOfHubris", {
        name: "enableTaleOfHubris",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        type: Boolean
    });

    game.settings.register('gambits-premades', 'Tale of Hubris Timeout', {
        name: "Tale of Hubris Timeout",
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

    game.settings.register("gambits-premades", "enableFlashOfGenius", {
        name: "enableFlashOfGenius",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        type: Boolean
    });

    game.settings.register('gambits-premades', 'Flash of Genius Timeout', {
        name: "Flash of Genius Timeout",
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

    game.settings.register("gambits-premades", "disableCuttingWordsMaxMiss", {
        name: "disableCuttingWordsMaxMiss",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        type: Boolean
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
        type: GeneralSettingsMenu,
        restricted: true
    });

    game.settings.registerMenu('gambits-premades', 'spells', {
        name: game.i18n.localize("Spells"),
        label: game.i18n.localize("Enable Spells"),
        hint: game.i18n.localize("Counterspell, Silvery Barbs, etc"),
        icon: 'fas fa-magic',
        scope: 'world',
        config: true,
        type: SpellSettingsMenu,
        restricted: true
    });

    game.settings.registerMenu('gambits-premades', 'classFeatures', {
        name: game.i18n.localize("Class Features"),
        label: game.i18n.localize("Enable Class Features"),
        hint: game.i18n.localize("Cutting Words, Interception, Poetry in Misery, etc"),
        icon: 'fas fa-book',
        scope: 'world',
        config: true,
        type: ClassFeaturesSettingsMenu,
        restricted: true
    });

    game.settings.registerMenu('gambits-premades', 'genericFeatures', {
        name: game.i18n.localize("Generic Features"),
        label: game.i18n.localize("Enable Generic Features"),
        hint: game.i18n.localize("Opportunity Attack, Sentinel, etc"),
        icon: 'fas fa-globe',
        scope: 'world',
        config: true,
        type: GenericFeatureSettingsMenu,
        restricted: true
    });

    
    game.settings.registerMenu('gambits-premades', 'monsterFeatures', {
        name: game.i18n.localize("Monster Features"),
        label: game.i18n.localize("Enable Monster Features"),
        hint: game.i18n.localize("Monster Features"),
        icon: 'fas fa-dragon',
        scope: 'world',
        config: true,
        type: MonsterFeaturesSettingsMenu,
        restricted: true
    });
}

export class BaseSettingsMenu extends Base {
  static DEFAULT_OPTIONS = {
    id: "classFeaturesSettingsMenu",
    tag: "form",
    classes: [ "gambits-premades", "gps-settings" ],
    actions: {
      stopPropagation: (event, element) => event.stopPropagation(),
      toggleCollapse: BaseSettingsMenu.toggleCollapse,
      validateNumericInput: BaseSettingsMenu.validateNumericInput
    },
    form: {
      closeOnSubmit: true,
      handler: this.#handleSubmit
    },
    position: {
      width: 800,
      height: "auto",
    }
  };

  static PARTS =
    {
      form: { template: "modules/gambits-premades/templates/settingsMenu.hbs" },
      footer: {
        template: "templates/generic/form-footer.hbs",
      },
    };

  setDefault(object) {
    this.default = object;
  }

  static toggleCollapse(event, element) {
    if ( event.target.tagName.toLowerCase() === "input" ) return;

    event.preventDefault();

    const rowText = element;
    const contentId = rowText.dataset.contentId;
    const form = rowText.closest("form.gps-settings");
    const panel = form?.querySelector(`#${contentId}`);
    if (!panel) return;

    panel.classList.toggle("show");
    rowText.classList.toggle("open");
    const app = form.closest(".window-app");
    if (app) app.style.height = `${form.scrollHeight}px`;
  }

  static validateNumericInput(event, element) {
    const inputField = element;
    const numericValue = Number(inputField.value);

    if (isNaN(numericValue)) {
      console.error("Invalid input: Not a number.");
      inputField.value = inputField.defaultValue;
    }
  }

  _onRender(options) {
    super._onRender?.(options);
    this.expandCheckedCollapsibleSections();
  }

  expandCheckedCollapsibleSections() {
    const form = this.element;
    for ( const row of form.querySelectorAll(".gps-settings-row") ) {
      const contentId = row.dataset.contentId;
      if ( !contentId ) continue;
      const container = form.querySelector(`#${CSS.escape(contentId)}`);
      if ( !container ) continue;

      const childChecked = container.querySelector("input[type=checkbox]:checked");
      if ( childChecked ) {
        container.classList.add("show");
        const rowText = row.querySelector(".gps-settings-row-text");
        rowText?.classList.add("open");
      }
    }

    // Resize window to fit expanded content
    const app = form.closest(".window-app");
    if ( app ) app.style.height = `${form.scrollHeight}px`;
  }

  static async #handleSubmit(event, form, formData) {
    for (let [key, value] of Object.entries(formData.object)) {
        if (game.settings.get('gambits-premades', key) === value) continue;
        await game.settings.set('gambits-premades', key, value);
    }
  }
}

export class ClassFeaturesSettingsMenu extends BaseSettingsMenu {
  static DEFAULT_OPTIONS = {
    id: "classFeaturesSettingsMenu",
    window: {
      title: "Enable Class Features"
    }
  };

  async _prepareContext(options) {
    let context = await super._prepareContext(options);
    let hasTimeoutColumn = true;

    const definitions = [
      {
        id: "chronalShift",
        name: "Chronal Shift",
        description: "Dialog for Chronurgy Wizards' Chronal Shift.",
        boolKey: "enableChronalShift",
        timeoutKey: "Chronal Shift Timeout"
      },
      {
        id: "cuttingWords",
        name: "Cutting Words",
        description: "Dialog for College of Lore Bards' Cutting Words.",
        boolKey: "Enable Cutting Words",
        timeoutKey: "Cutting Words Timeout",
        children: [
          {
            id: "disableCuttingWordsMaxMiss",
            name: "Disable Cutting Words Max Miss",
            description: "Skip prompt if max bardic die wouldn't effect hit.",
            boolKey: "disableCuttingWordsMaxMiss"
          }
        ]
      },
      {
        id: "interception",
        name: "Interception",
        description: "Dialog for Paladins/Fighters' Interception.",
        boolKey: "Enable Interception",
        timeoutKey: "Interception Timeout"
      },
      {
        id: "protection",
        name: "Protection",
        description: "Dialog for Paladins/Fighters' Protection.",
        boolKey: "Enable Protection",
        timeoutKey: "Protection Timeout",
        children: [
          {
            id: "enableProtectionOnSuccess",
            name: "Enable Protection On Success",
            description: "Only trigger on a successful attack.",
            boolKey: "enableProtectionOnSuccess"
          }
        ]
      },
      {
        id: "flashOfGenius",
        name: "Flash of Genius",
        description: "Dialog for Artificers Flash of Genius.",
        boolKey: "enableFlashOfGenius",
        timeoutKey: "Flash of Genius Timeout"
      },
      {
        id: "indomitable",
        name: "Indomitable",
        description: "Dialog for Fighters' Indomitable.",
        boolKey: "Enable Indomitable",
        timeoutKey: "Indomitable Timeout",
        children: [
          {
            id: "enableAutoSucceedIndomitable",
            name: "Enable Auto Succeed Indomitable",
            description: "Auto-succeed on use.",
            boolKey: "enableAutoSucceedIndomitable"
          }
        ]
      },
      {
        id: "instinctiveCharm",
        name: "Instinctive Charm",
        description: "Dialog for Enchantment Wizards' Instinctive Charm.",
        boolKey: "enableInstinctiveCharm",
        timeoutKey: "Instinctive Charm Timeout"
      },
      {
        id: "magicUsersNemesis",
        name: "Magic-User's Nemesis",
        description: "Dialog for Monster Slayer Rangers'.",
        boolKey: "enableMagicUsersNemesis",
        timeoutKey: "Magic-User's Nemesis Timeout"
      },
      {
        id: "poetryInMisery",
        name: "Poetry in Misery",
        description: "Dialog for College of Tragedy Bards'.",
        boolKey: "Enable Poetry in Misery",
        timeoutKey: "Poetry in Misery Timeout"
      },
      {
        id: "rainOfCinders",
        name: "Rain of Cinders",
        description: "Dialog for Roiling Hearth Witches'.",
        boolKey: "enableRainOfCinders",
        timeoutKey: "Rain of Cinders Timeout"
      },
      {
        id: "restoreBalance",
        name: "Restore Balance",
        description: "Dialog for Clockwork Soul Sorcerers'.",
        boolKey: "enableRestoreBalance",
        timeoutKey: "Restore Balance Timeout"
      },
      {
        id: "riposte",
        name: "Riposte",
        description: "Dialog for Battle Master Fighters' Riposte.",
        boolKey: "Enable Riposte",
        timeoutKey: "Riposte Timeout"
      },
      {
        id: "taleOfHubris",
        name: "Tale of Hubris",
        description: "Dialog for College of Tragedy Bards'.",
        boolKey: "enableTaleOfHubris",
        timeoutKey: "Tale of Hubris Timeout"
      },
      {
        id: "witchesHex",
        name: "Witches Hex",
        description: "Dialog for Roiling Hearth Witches' Hex.",
        boolKey: "Enable Witches Hex",
        timeoutKey: "Witches Hex Timeout"
      }
    ];

    const features = definitions.map(def => {
      const feature = {
        id:          def.id,
        name:        def.name,
        description: def.description,
        boolKey:     def.boolKey,
        timeoutKey:  def.timeoutKey,
        enabled:     game.settings.get("gambits-premades", def.boolKey),
        timeout:     game.settings.get("gambits-premades", def.timeoutKey)
      };
      if (Array.isArray(def.children)) {
        feature.children = def.children.map(child => ({
          id:          child.id,
          name:        child.name,
          description: child.description,
          boolKey:     child.boolKey,
          enabled:     game.settings.get("gambits-premades", child.boolKey)
        }));
      }
      return feature;
    });

    return foundry.utils.mergeObject(context, {
      features,
      hasTimeoutColumn,
      buttons: [
        { type: "submit", icon: "fa-solid fa-save", label: "Save Settings" }
      ]
    });
  }
}

// -------------------------
// Generic Features Menu
// -------------------------
export class GenericFeatureSettingsMenu extends BaseSettingsMenu {
  static DEFAULT_OPTIONS = {
    id: "genericFeatureSettingsMenu",
    window: {
      title: "Enable Generic Features"
    },
  };

  async _prepareContext(options) {
    let context = await super._prepareContext(options);
    let hasTimeoutColumn = true;

    const definitions = [
      { id: "opportunityAttack", name: "Opportunity Attack", description: "Automatically enables Opportunity Attacks for combatants in combat.", boolKey: "Enable Opportunity Attack", timeoutKey: "Opportunity Attack Timeout" },
      { id: "sentinel", name: "Sentinel", description: "Presents a dialog to players with the Sentinel feat when an enemy attacks an ally within range.", boolKey: "Enable Sentinel", timeoutKey: "Sentinel Timeout" },
      { id: "mageSlayer", name: "Mage Slayer", description: "Presents a dialog to players with the Mage Slayer feat.", boolKey: "enableMageSlayer", timeoutKey: "Mage Slayer Timeout" },
      { id: "legendaryResistance", name: "Legendary Resistance", description: "Presents a dialog for monsters Legendary Resistance feature.", boolKey: "enableLegendaryResistance", timeoutKey: "Legendary Resistance Timeout" }
    ];

    const features = definitions.map(def => ({
      id:          def.id,
      name:        def.name,
      description: def.description,
      boolKey:     def.boolKey,
      timeoutKey:  def.timeoutKey,
      enabled:     game.settings.get("gambits-premades", def.boolKey),
      timeout:     game.settings.get("gambits-premades", def.timeoutKey)
    }));

    return foundry.utils.mergeObject(context, {
      features: features,
      hasTimeoutColumn,
      buttons:  [
        { type: "submit", icon: "fa-solid fa-save", label: "Save Settings" }
      ]
    });
  }
}

// ----------------
// Spell Settings
// ----------------
export class SpellSettingsMenu extends BaseSettingsMenu {
  static DEFAULT_OPTIONS = {
    id: "spellSettingsMenu",
    window: {
      title: "Enable Spells"
    }
  };

  async _prepareContext(options) {
    let context = await super._prepareContext(options);
    let hasTimeoutColumn = true;

    const definitions = [
      {
        id: "counterspell",
        name: "Counterspell",
        description: "Presents a dialog to players with Counterspell.",
        boolKey: "Enable Counterspell",
        timeoutKey: "Counterspell Timeout",
        children: [ { id: "counterspellSpellPenetration", name: "Spell Penetration", description: "Enable optional Bloodied & Bruised feature Spell Penetration.", boolKey: "enableCounterspellSpellPenetration" } ]
      },
      {
        id: "silveryBarbs",
        name: "Silvery Barbs",
        description: "Presents a dialog to players with Silvery Barbs.",
        boolKey: "Enable Silvery Barbs",
        timeoutKey: "Silvery Barbs Timeout",
        children: [
          { id: "disableSilveryBarbsOnNat20", name: "Disable on Critical", description: "Disable on a Critical Attack Roll.", boolKey: "disableSilveryBarbsOnNat20" },
          { id: "enableSilveryBarbsOnNat20", name: "Enable on Critical", description: "Enable only on a Critical Attack Roll.", boolKey: "enableSilveryBarbsOnNat20" }
        ]
      },
      { id: "powerWordRebound", name: "Power Word Rebound", description: "Presents a dialog to players with Power Word Rebound.", boolKey: "Enable Power Word Rebound", timeoutKey: "Power Word Rebound Timeout" },
      { id: "temporalShunt", name: "Temporal Shunt", description: "Presents a dialog to players with Temporal Shunt.", boolKey: "enableTemporalShunt", timeoutKey: "Temporal Shunt Timeout" }
    ];

    const features = definitions.map(def => {
      const feature = {
        id:          def.id,
        name:        def.name,
        description: def.description,
        boolKey:     def.boolKey,
        timeoutKey:  def.timeoutKey,
        enabled:     game.settings.get("gambits-premades", def.boolKey),
        timeout:     game.settings.get("gambits-premades", def.timeoutKey)
      };
      if (Array.isArray(def.children)) {
        feature.children = def.children.map(child => ({
          id:          child.id,
          name:        child.name,
          description: child.description,
          boolKey:     child.boolKey,
          enabled:     game.settings.get("gambits-premades", child.boolKey)
        }));
      }
      return feature;
    });

    return foundry.utils.mergeObject(context, {
      features,
      hasTimeoutColumn,
      buttons: [
        { type: "submit", icon: "fa-solid fa-save", label: "Save Settings" }
      ]
    });
  }
}

// -------------------
// General Settings
// -------------------
export class GeneralSettingsMenu extends BaseSettingsMenu {
  static DEFAULT_OPTIONS = {
    id: "generalSettingsMenu",
    window: {
      title: "General Settings"
    }
  };

  async _prepareContext(options) {
    let context = await super._prepareContext(options);
    let hasTimeoutColumn = false;

    const definitions = [
      { id: "enable3prNoCombat", name: "Enable 3rd Party Reactions Outside Combat", description: "Allows 3rd party reactions to function while combat is not active.", boolKey: "enable3prNoCombat" },
      { id: "enableIdentifyRestrictions", name: "Enable Identify Restrictions", description: "Prevents players from Identifying items except through the use of my Identify spell.", boolKey: "Enable Identify Restrictions", children: [{ id: "identifyRestrictionMessage", name: "Identify Restriction Message", description: "Custom message that will display to users if they are restricted.", type: "String", boolKey: "Identify Restriction Message" }] },
      { id: "enableRegionWrapping", name: "Enable Region Wrapping", description: "Replaces Foundry default region behavior testing token center points only with multi-point tests to better match the 5e ruleset (Requires Reload).", boolKey: "enableRegionWrapping" },
      { id: "enableTimerFullAnim", name: "Enable Timer Full Bar Animation", description: "Modify the countdown timer animation for dialogs to cover the full title bar instead of the title bar border.", boolKey: "enableTimerFullAnim" },
      { id: "hideTemplates", name: "Hide Templates", description: "Hide templates after placement.", boolKey: "hideTemplates" },
      { id: "mirror3rdPartyDialogForGMs", name: "Mirror 3rd Party Dialog for GMs", description: "3rd party dialog's will be sent to the GM and the player so that either party can interact with the dialog to use/dismiss/pause it.", boolKey: "Mirror 3rd Party Dialog for GMs" },
      { id: "debugEnabled", name: "Enable Debugging", description: "Enable console logs for the reaction validation process for troubleshooting.", boolKey: "debugEnabled" }
    ];

    const features = definitions.map(def => {
      const feature = {
        id:          def.id,
        name:        def.name,
        description: def.description,
        boolKey:     def.boolKey,
        enabled:     game.settings.get("gambits-premades", def.boolKey),
      };
      if (Array.isArray(def.children)) {
        feature.children = def.children.map(child => ({
          id:          child.id,
          name:        child.name,
          description: child.description,
          boolKey:     child.boolKey,
          value:       game.settings.get("gambits-premades", child.boolKey),
          type:        child.type || "Boolean"
        }));
      }
      return feature;
    });

    return foundry.utils.mergeObject(context, {
      features,
      hasTimeoutColumn,
      buttons: [
        { type: "submit", icon: "fa-solid fa-save", label: "Save Settings" }
      ]
    });
  }
}

// -----------------------
// Monster Features Menu
// -----------------------
export class MonsterFeaturesSettingsMenu extends BaseSettingsMenu {
  static DEFAULT_OPTIONS = {
    id: "monsterFeaturesSettingsMenu",
    window: {
      title: "Enable Monster Features"
    }
  };

  async _prepareContext(options) {
    let context = await super._prepareContext(options);
    let hasTimeoutColumn = true;

    const definitions = [
      { id: "burstOfIngenuity", name: "Burst of Ingenuity", description: "Presents a dialog for monsters with Burst of Ingenuity.", boolKey: "enableBurstOfIngenuity", timeoutKey: "Burst of Ingenuity Timeout" },
      { id: "dreadCounterspell", name: "Dread Counterspell", description: "Presents a dialog for Vecna's Dread Counterspell.", boolKey: "enableDreadCounterspell", timeoutKey: "Dread Counterspell Timeout" }
    ];

    const features = definitions.map(def => {
      const feature = {
        id:          def.id,
        name:        def.name,
        description: def.description,
        boolKey:     def.boolKey,
        timeoutKey:  def.timeoutKey,
        enabled:     game.settings.get("gambits-premades", def.boolKey),
        timeout:     game.settings.get("gambits-premades", def.timeoutKey)
      };
      if (Array.isArray(def.children)) {
        feature.children = def.children.map(child => ({
          id:          child.id,
          name:        child.name,
          description: child.description,
          boolKey:     child.boolKey,
          enabled:     game.settings.get("gambits-premades", child.boolKey)
        }));
      }
      return feature;
    });

    return foundry.utils.mergeObject(context, {
      features,
      hasTimeoutColumn,
      buttons: [
        { type: "submit", icon: "fa-solid fa-save", label: "Save Settings" }
      ]
    });
  }
}
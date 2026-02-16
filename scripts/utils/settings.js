const Base = foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2);

export function registerSettings() {
    game.settings.register('gambits-premades', 'Mirror 3rd Party Dialog for GMs', {
        name: "GAMBITSPREMADES.Settings.MirrorThirdPartyDialogForGMs.Name",
        hint: "GAMBITSPREMADES.Settings.MirrorThirdPartyDialogForGMs.Hint",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Enable Opportunity Attack', {
        name: "GAMBITSPREMADES.Settings.EnableOpportunityAttack.Name",
        hint: "GAMBITSPREMADES.Settings.EnableOpportunityAttack.Hint",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Opportunity Attack Timeout', {
        name: "GAMBITSPREMADES.Settings.OpportunityAttackTimeout.Name",
        hint: "GAMBITSPREMADES.Settings.OpportunityAttackTimeout.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "15"
    });

    game.settings.register('gambits-premades', 'Enable Counterspell', {
        name: "GAMBITSPREMADES.Settings.EnableCounterspell.Name",
        hint: "GAMBITSPREMADES.Settings.EnableCounterspell.Hint",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Counterspell Timeout', {
        name: "GAMBITSPREMADES.Settings.CounterspellTimeout.Name",
        hint: "GAMBITSPREMADES.Settings.CounterspellTimeout.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Silvery Barbs', {
        name: "GAMBITSPREMADES.Settings.EnableSilveryBarbs.Name",
        hint: "GAMBITSPREMADES.Settings.EnableSilveryBarbs.Hint",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Silvery Barbs Timeout', {
        name: "GAMBITSPREMADES.Settings.SilveryBarbsTimeout.Name",
        hint: "GAMBITSPREMADES.Settings.SilveryBarbsTimeout.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "30",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Cutting Words', {
        name: "GAMBITSPREMADES.Settings.EnableCuttingWords.Name",
        hint: "GAMBITSPREMADES.Settings.EnableCuttingWords.Hint",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Cutting Words Timeout', {
        name: "GAMBITSPREMADES.Settings.CuttingWordsTimeout.Name",
        hint: "GAMBITSPREMADES.Settings.CuttingWordsTimeout.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "30",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Interception', {
        name: "GAMBITSPREMADES.Settings.EnableInterception.Name",
        hint: "GAMBITSPREMADES.Settings.EnableInterception.Hint",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Interception Timeout', {
        name: "GAMBITSPREMADES.Settings.InterceptionTimeout.Name",
        hint: "GAMBITSPREMADES.Settings.InterceptionTimeout.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "30",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Indomitable', {
        name: "GAMBITSPREMADES.Settings.EnableIndomitable.Name",
        hint: "GAMBITSPREMADES.Settings.EnableIndomitable.Hint",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Indomitable Timeout', {
        name: "GAMBITSPREMADES.Settings.IndomitableTimeout.Name",
        hint: "GAMBITSPREMADES.Settings.IndomitableTimeout.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Protection', {
        name: "GAMBITSPREMADES.Settings.EnableProtection.Name",
        hint: "GAMBITSPREMADES.Settings.EnableProtection.Hint",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Protection Timeout', {
        name: "GAMBITSPREMADES.Settings.ProtectionTimeout.Name",
        hint: "GAMBITSPREMADES.Settings.ProtectionTimeout.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Sentinel', {
        name: "GAMBITSPREMADES.Settings.EnableSentinel.Name",
        hint: "GAMBITSPREMADES.Settings.EnableSentinel.Hint",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Sentinel Timeout', {
        name: "GAMBITSPREMADES.Settings.SentinelTimeout.Name",
        hint: "GAMBITSPREMADES.Settings.SentinelTimeout.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Riposte', {
        name: "GAMBITSPREMADES.Settings.EnableRiposte.Name",
        hint: "GAMBITSPREMADES.Settings.EnableRiposte.Hint",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Riposte Timeout', {
        name: "GAMBITSPREMADES.Settings.RiposteTimeout.Name",
        hint: "GAMBITSPREMADES.Settings.RiposteTimeout.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Poetry in Misery', {
        name: "GAMBITSPREMADES.Settings.EnablePoetryInMisery.Name",
        hint: "GAMBITSPREMADES.Settings.EnablePoetryInMisery.Hint",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Poetry in Misery Timeout', {
        name: "GAMBITSPREMADES.Settings.PoetryInMiseryTimeout.Name",
        hint: "GAMBITSPREMADES.Settings.PoetryInMiseryTimeout.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Witches Hex', {
        name: "GAMBITSPREMADES.Settings.EnableWitchesHex.Name",
        hint: "GAMBITSPREMADES.Settings.EnableWitchesHex.Hint",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Witches Hex Timeout', {
        name: "GAMBITSPREMADES.Settings.WitchesHexTimeout.Name",
        hint: "GAMBITSPREMADES.Settings.WitchesHexTimeout.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "30",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Power Word Rebound', {
        name: "GAMBITSPREMADES.Settings.EnablePowerWordRebound.Name",
        hint: "GAMBITSPREMADES.Settings.EnablePowerWordRebound.Hint",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Power Word Rebound Timeout', {
        name: "GAMBITSPREMADES.Settings.PowerWordReboundTimeout.Name",
        hint: "GAMBITSPREMADES.Settings.PowerWordReboundTimeout.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
            }
        }
    });

    game.settings.register('gambits-premades', 'Enable Identify Restrictions', {
        name: "GAMBITSPREMADES.Settings.EnableIdentifyRestrictions.Name",
        hint: "GAMBITSPREMADES.Settings.EnableIdentifyRestrictions.Hint",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'Identify Restriction Message', {
        name: "GAMBITSPREMADES.Settings.IdentifyRestrictionMessage.Name",
        hint: "GAMBITSPREMADES.Settings.IdentifyRestrictionMessage.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "Nice try, DENIED ;)"
    });

    game.settings.register('gambits-premades', 'enableTimerFullAnim', {
        name: "GAMBITSPREMADES.Settings.EnableTimerFullAnim.Name",
        hint: "GAMBITSPREMADES.Settings.EnableTimerFullAnim.Hint",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'enable3prNoCombat', {
        name: "GAMBITSPREMADES.Settings.Enable3prNoCombat.Name",
        hint: "GAMBITSPREMADES.Settings.Enable3prNoCombat.Hint",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'hideTemplates', {
        name: "GAMBITSPREMADES.Settings.HideTemplates.Name",
        hint: "GAMBITSPREMADES.Settings.HideTemplates.Hint",
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register('gambits-premades', 'debugEnabled', {
        name: "GAMBITSPREMADES.Settings.DebugEnabled.Name",
        hint: "GAMBITSPREMADES.Settings.DebugEnabled.Hint",
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
        name: "GAMBITSPREMADES.Settings.MageSlayerTimeout.Name",
        hint: "GAMBITSPREMADES.Settings.MageSlayerTimeout.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
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
        name: "GAMBITSPREMADES.Settings.InstinctiveCharmTimeout.Name",
        hint: "GAMBITSPREMADES.Settings.InstinctiveCharmTimeout.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
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
        name: "GAMBITSPREMADES.Settings.RainOfCindersTimeout.Name",
        hint: "GAMBITSPREMADES.Settings.RainOfCindersTimeout.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
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
        name: "GAMBITSPREMADES.Settings.RestoreBalanceTimeout.Name",
        hint: "GAMBITSPREMADES.Settings.RestoreBalanceTimeout.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
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
        name: "GAMBITSPREMADES.Settings.LegendaryResistanceTimeout.Name",
        hint: "GAMBITSPREMADES.Settings.LegendaryResistanceTimeout.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
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
        name: "GAMBITSPREMADES.Settings.BurstOfIngenuityTimeout.Name",
        hint: "GAMBITSPREMADES.Settings.BurstOfIngenuityTimeout.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
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
        name: "GAMBITSPREMADES.Settings.TemporalShuntTimeout.Name",
        hint: "GAMBITSPREMADES.Settings.TemporalShuntTimeout.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
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
        name: "GAMBITSPREMADES.Settings.ChronalShiftTimeout.Name",
        hint: "GAMBITSPREMADES.Settings.ChronalShiftTimeout.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
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
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
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
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
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
        name: "GAMBITSPREMADES.Settings.TaleOfHubrisTimeout.Name",
        hint: "GAMBITSPREMADES.Settings.TaleOfHubrisTimeout.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
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
        name: "GAMBITSPREMADES.Settings.FlashOfGeniusTimeout.Name",
        hint: "GAMBITSPREMADES.Settings.FlashOfGeniusTimeout.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: "15",
        onChange: value => {
            const numericValue = Number(value);
            if (!isNaN(numericValue)) {
            } else {
                game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumberExample"));
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
        name: "GAMBITSPREMADES.Settings.PrimaryGM.Name",
        hint: "GAMBITSPREMADES.Settings.PrimaryGM.Hint",
        scope: 'world',
        config: false,
        type: String,
        default: ""
    });

    game.settings.register("gambits-premades", "enableTokenMovementSpeed", {
        name: "enableTokenMovementSpeed",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        onChange: value => {
          if(!value) CONFIG.Token.movement.defaultSpeed = 6;
          else if(!isNaN(game.settings.get('gambits-premades', 'tokenMovementSpeed'))) CONFIG.Token.movement.defaultSpeed = game.settings.get('gambits-premades', 'tokenMovementSpeed');
        }
    });

    game.settings.register('gambits-premades', 'tokenMovementSpeed', {
        name: "GAMBITSPREMADES.Settings.TokenMovementSpeed.Name",
        hint: "GAMBITSPREMADES.Settings.TokenMovementSpeed.Hint",
        scope: 'world',
        config: false,
        type: Number,
        default: 6,
        onChange: value => {
            if (!isNaN(value) && game.settings.get('gambits-premades', 'enableTokenMovementSpeed')) CONFIG.Token.movement.defaultSpeed = value;
            else game.gps.logInfo("Invalid input for Numeric Setting: Not a number.");
        }
    });

    game.settings.registerMenu('gambits-premades', 'patreonSupport', {
        name: "GAMBITSPREMADES.Menus.PatreonSupport.Name",
        label: "GAMBITSPREMADES.Menus.PatreonSupport.Label",
        hint: "GAMBITSPREMADES.Menus.PatreonSupport.Hint",
        icon: "fas fa-card-spade",
        scope: 'world',
        config: true,
        type: PatreonSupportMenu,
        restricted: true
    });

    game.settings.registerMenu('gambits-premades', 'generalSettings', {
        name: "GAMBITSPREMADES.Menus.GeneralSettings.Name",
        label: "GAMBITSPREMADES.Menus.GeneralSettings.Label",
        hint: "GAMBITSPREMADES.Menus.GeneralSettings.Hint",
        icon: 'fas fa-cogs',
        scope: 'world',
        config: true,
        type: GeneralSettingsMenu,
        restricted: true
    });

    game.settings.registerMenu('gambits-premades', 'spells', {
        name: "GAMBITSPREMADES.Menus.Spells.Name",
        label: "GAMBITSPREMADES.Menus.Spells.Label",
        hint: "GAMBITSPREMADES.Menus.Spells.Hint",
        icon: 'fas fa-magic',
        scope: 'world',
        config: true,
        type: SpellSettingsMenu,
        restricted: true
    });

    game.settings.registerMenu('gambits-premades', 'classFeatures', {
        name: "GAMBITSPREMADES.Menus.ClassFeatures.Name",
        label: "GAMBITSPREMADES.Menus.ClassFeatures.Label",
        hint: "GAMBITSPREMADES.Menus.ClassFeatures.Hint",
        icon: 'fas fa-book',
        scope: 'world',
        config: true,
        type: ClassFeaturesSettingsMenu,
        restricted: true
    });

    game.settings.registerMenu('gambits-premades', 'genericFeatures', {
        name: "GAMBITSPREMADES.Menus.GenericFeatures.Name",
        label: "GAMBITSPREMADES.Menus.GenericFeatures.Label",
        hint: "GAMBITSPREMADES.Menus.GenericFeatures.Hint",
        icon: 'fas fa-globe',
        scope: 'world',
        config: true,
        type: GenericFeatureSettingsMenu,
        restricted: true
    });

    
    game.settings.registerMenu('gambits-premades', 'monsterFeatures', {
        name: "GAMBITSPREMADES.Menus.MonsterFeatures.Name",
        label: "GAMBITSPREMADES.Menus.MonsterFeatures.Label",
        hint: "GAMBITSPREMADES.Menus.MonsterFeatures.Hint",
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

  constructor(options = {}) {
    super(options);

    try {
      const titleKey = this.options?.window?.title;
      if (typeof titleKey === "string" && titleKey.startsWith("GAMBITSPREMADES.")) {
        const localized = game?.i18n?.localize ? game.i18n.localize(titleKey) : titleKey;
        if (this.options?.window) this.options.window.title = localized;
      }
    } catch (_err) {
    }
  }

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
      game.gps.logInfo(game.i18n.localize("GAMBITSPREMADES.UI.InvalidInputNotNumber"));
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
      title: "GAMBITSPREMADES.Windows.EnableClassFeatures"
    }
  };

  async _prepareContext(options) {
    let context = await super._prepareContext(options);
    let hasTimeoutColumn = true;

    const definitions = [
      {
        id: "chronalShift",
        name: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.ChronalShift.Name",
        description: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.ChronalShift.Description",
        boolKey: "enableChronalShift",
        timeoutKey: "Chronal Shift Timeout"
      },
      {
        id: "cuttingWords",
        name: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.CuttingWords.Name",
        description: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.CuttingWords.Description",
        boolKey: "Enable Cutting Words",
        timeoutKey: "Cutting Words Timeout",
        children: [
          {
            id: "disableCuttingWordsMaxMiss",
        name: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.DisableCuttingWordsMaxMiss.Name",
        description: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.DisableCuttingWordsMaxMiss.Description",
            boolKey: "disableCuttingWordsMaxMiss"
          }
        ]
      },
      {
        id: "interception",
        name: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.Interception.Name",
        description: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.Interception.Description",
        boolKey: "Enable Interception",
        timeoutKey: "Interception Timeout"
      },
      {
        id: "protection",
        name: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.Protection.Name",
        description: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.Protection.Description",
        boolKey: "Enable Protection",
        timeoutKey: "Protection Timeout",
        children: [
          {
            id: "enableProtectionOnSuccess",
        name: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.EnableProtectionOnSuccess.Name",
        description: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.EnableProtectionOnSuccess.Description",
            boolKey: "enableProtectionOnSuccess"
          }
        ]
      },
      {
        id: "flashOfGenius",
        name: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.FlashOfGenius.Name",
        description: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.FlashOfGenius.Description",
        boolKey: "enableFlashOfGenius",
        timeoutKey: "Flash of Genius Timeout"
      },
      {
        id: "indomitable",
        name: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.Indomitable.Name",
        description: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.Indomitable.Description",
        boolKey: "Enable Indomitable",
        timeoutKey: "Indomitable Timeout",
        children: [
          {
            id: "enableAutoSucceedIndomitable",
        name: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.EnableAutoSucceedIndomitable.Name",
        description: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.EnableAutoSucceedIndomitable.Description",
            boolKey: "enableAutoSucceedIndomitable"
          }
        ]
      },
      {
        id: "instinctiveCharm",
        name: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.InstinctiveCharm.Name",
        description: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.InstinctiveCharm.Description",
        boolKey: "enableInstinctiveCharm",
        timeoutKey: "Instinctive Charm Timeout"
      },
      {
        id: "magicUsersNemesis",
        name: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.MagicUsersNemesis.Name",
        description: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.MagicUsersNemesis.Description",
        boolKey: "enableMagicUsersNemesis",
        timeoutKey: "Magic-User's Nemesis Timeout"
      },
      {
        id: "poetryInMisery",
        name: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.PoetryInMisery.Name",
        description: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.PoetryInMisery.Description",
        boolKey: "Enable Poetry in Misery",
        timeoutKey: "Poetry in Misery Timeout"
      },
      {
        id: "rainOfCinders",
        name: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.RainOfCinders.Name",
        description: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.RainOfCinders.Description",
        boolKey: "enableRainOfCinders",
        timeoutKey: "Rain of Cinders Timeout"
      },
      {
        id: "restoreBalance",
        name: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.RestoreBalance.Name",
        description: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.RestoreBalance.Description",
        boolKey: "enableRestoreBalance",
        timeoutKey: "Restore Balance Timeout"
      },
      {
        id: "riposte",
        name: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.Riposte.Name",
        description: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.Riposte.Description",
        boolKey: "Enable Riposte",
        timeoutKey: "Riposte Timeout"
      },
      {
        id: "taleOfHubris",
        name: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.TaleOfHubris.Name",
        description: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.TaleOfHubris.Description",
        boolKey: "enableTaleOfHubris",
        timeoutKey: "Tale of Hubris Timeout"
      },
      {
        id: "witchesHex",
        name: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.WitchesHex.Name",
        description: "GAMBITSPREMADES.SettingsMenu.ClassFeatures.WitchesHex.Description",
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
        { type: "submit", icon: "fa-solid fa-save", label: game.i18n.localize("GAMBITSPREMADES.UI.SaveSettings") }
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
      title: "GAMBITSPREMADES.Windows.EnableGenericFeatures"
    },
  };

  async _prepareContext(options) {
    let context = await super._prepareContext(options);
    let hasTimeoutColumn = true;

    const definitions = [
      { id: "opportunityAttack", name: "GAMBITSPREMADES.SettingsMenu.GenericFeatures.OpportunityAttack.Name", description: "GAMBITSPREMADES.SettingsMenu.GenericFeatures.OpportunityAttack.Description", boolKey: "Enable Opportunity Attack", timeoutKey: "Opportunity Attack Timeout" },
      { id: "sentinel", name: "GAMBITSPREMADES.SettingsMenu.GenericFeatures.Sentinel.Name", description: "GAMBITSPREMADES.SettingsMenu.GenericFeatures.Sentinel.Description", boolKey: "Enable Sentinel", timeoutKey: "Sentinel Timeout" },
      { id: "mageSlayer", name: "GAMBITSPREMADES.SettingsMenu.GenericFeatures.MageSlayer.Name", description: "GAMBITSPREMADES.SettingsMenu.GenericFeatures.MageSlayer.Description", boolKey: "enableMageSlayer", timeoutKey: "Mage Slayer Timeout" },
      { id: "legendaryResistance", name: "GAMBITSPREMADES.SettingsMenu.GenericFeatures.LegendaryResistance.Name", description: "GAMBITSPREMADES.SettingsMenu.GenericFeatures.LegendaryResistance.Description", boolKey: "enableLegendaryResistance", timeoutKey: "Legendary Resistance Timeout" }
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
        { type: "submit", icon: "fa-solid fa-save", label: game.i18n.localize("GAMBITSPREMADES.UI.SaveSettings") }
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
      title: "GAMBITSPREMADES.Windows.EnableSpells"
    }
  };

  async _prepareContext(options) {
    let context = await super._prepareContext(options);
    let hasTimeoutColumn = true;

    const definitions = [
      {
        id: "counterspell",
        name: "GAMBITSPREMADES.SettingsMenu.Spells.Counterspell.Name",
        description: "GAMBITSPREMADES.SettingsMenu.Spells.Counterspell.Description",
        boolKey: "Enable Counterspell",
        timeoutKey: "Counterspell Timeout",
        children: [ { id: "counterspellSpellPenetration", name: "GAMBITSPREMADES.SettingsMenu.Spells.CounterspellSpellPenetration.Name", description: "GAMBITSPREMADES.SettingsMenu.Spells.CounterspellSpellPenetration.Description", boolKey: "enableCounterspellSpellPenetration" } ]
      },
      {
        id: "silveryBarbs",
        name: "GAMBITSPREMADES.SettingsMenu.Spells.SilveryBarbs.Name",
        description: "GAMBITSPREMADES.SettingsMenu.Spells.SilveryBarbs.Description",
        boolKey: "Enable Silvery Barbs",
        timeoutKey: "Silvery Barbs Timeout",
        children: [
          { id: "disableSilveryBarbsOnNat20", name: "GAMBITSPREMADES.SettingsMenu.Spells.DisableSilveryBarbsOnNat20.Name", description: "GAMBITSPREMADES.SettingsMenu.Spells.DisableSilveryBarbsOnNat20.Description", boolKey: "disableSilveryBarbsOnNat20" },
          { id: "enableSilveryBarbsOnNat20", name: "GAMBITSPREMADES.SettingsMenu.Spells.EnableSilveryBarbsOnNat20.Name", description: "GAMBITSPREMADES.SettingsMenu.Spells.EnableSilveryBarbsOnNat20.Description", boolKey: "enableSilveryBarbsOnNat20" }
        ]
      },
      { id: "powerWordRebound", name: "GAMBITSPREMADES.SettingsMenu.Spells.PowerWordRebound.Name", description: "GAMBITSPREMADES.SettingsMenu.Spells.PowerWordRebound.Description", boolKey: "Enable Power Word Rebound", timeoutKey: "Power Word Rebound Timeout" },
      { id: "temporalShunt", name: "GAMBITSPREMADES.SettingsMenu.Spells.TemporalShunt.Name", description: "GAMBITSPREMADES.SettingsMenu.Spells.TemporalShunt.Description", boolKey: "enableTemporalShunt", timeoutKey: "Temporal Shunt Timeout" }
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
        { type: "submit", icon: "fa-solid fa-save", label: game.i18n.localize("GAMBITSPREMADES.UI.SaveSettings") }
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
      title: "GAMBITSPREMADES.Windows.GeneralSettings"
    }
  };

  async _prepareContext(options) {
    let context = await super._prepareContext(options);

    const definitions = [
      { id: "enable3prNoCombat", name: "GAMBITSPREMADES.SettingsMenu.General.Enable3prNoCombat.Name", description: "GAMBITSPREMADES.SettingsMenu.General.Enable3prNoCombat.Description", boolKey: "enable3prNoCombat" },
      { id: "enableIdentifyRestrictions", name: "GAMBITSPREMADES.SettingsMenu.General.EnableIdentifyRestrictions.Name", description: "GAMBITSPREMADES.SettingsMenu.General.EnableIdentifyRestrictions.Description", boolKey: "Enable Identify Restrictions", children: [{ id: "message", name: "GAMBITSPREMADES.SettingsMenu.General.IdentifyRestrictionMessage.Name", description: "GAMBITSPREMADES.SettingsMenu.General.IdentifyRestrictionMessage.Description", type: "String", boolKey: "Identify Restriction Message" }] },
      { id: "enableRegionWrapping", name: "GAMBITSPREMADES.SettingsMenu.General.EnableRegionWrapping.Name", description: "GAMBITSPREMADES.SettingsMenu.General.EnableRegionWrapping.Description", boolKey: "enableRegionWrapping" },
      { id: "enableTimerFullAnim", name: "GAMBITSPREMADES.SettingsMenu.General.EnableTimerFullAnim.Name", description: "GAMBITSPREMADES.SettingsMenu.General.EnableTimerFullAnim.Description", boolKey: "enableTimerFullAnim" },
      { id: "hideTemplates", name: "GAMBITSPREMADES.SettingsMenu.General.HideTemplates.Name", description: "GAMBITSPREMADES.SettingsMenu.General.HideTemplates.Description", boolKey: "hideTemplates" },
      { id: "mirror3rdPartyDialogForGMs", name: "GAMBITSPREMADES.SettingsMenu.General.MirrorThirdPartyDialogForGMs.Name", description: "GAMBITSPREMADES.SettingsMenu.General.MirrorThirdPartyDialogForGMs.Description", boolKey: "Mirror 3rd Party Dialog for GMs" },
      { id: "tokenMovementSpeed", name: "GAMBITSPREMADES.SettingsMenu.General.TokenMovementSpeed.Name", description: "GAMBITSPREMADES.SettingsMenu.General.TokenMovementSpeed.Description", boolKey: "enableTokenMovementSpeed", timeoutKey: "tokenMovementSpeed" },
      { id: "debugEnabled", name: "GAMBITSPREMADES.SettingsMenu.General.DebugEnabled.Name", description: "GAMBITSPREMADES.SettingsMenu.General.DebugEnabled.Description", boolKey: "debugEnabled" }
    ];

    const hasTimeoutColumn = definitions.some(d => !!d.timeoutKey);

    const features = definitions.map(def => {
      const feature = {
        id:          def.id,
        name:        def.name,
        description: def.description,
        boolKey:     def.boolKey,
        enabled:     game.settings.get("gambits-premades", def.boolKey),
        timeoutKey:  def.timeoutKey
      };

      if (def.timeoutKey) {
        feature.timeout = game.settings.get("gambits-premades", def.timeoutKey);
      }

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
        { type: "submit", icon: "fa-solid fa-save", label: game.i18n.localize("GAMBITSPREMADES.UI.SaveSettings") }
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
      title: "GAMBITSPREMADES.Windows.EnableMonsterFeatures"
    }
  };

  async _prepareContext(options) {
    let context = await super._prepareContext(options);
    let hasTimeoutColumn = true;

    const definitions = [
      { id: "burstOfIngenuity", name: "GAMBITSPREMADES.SettingsMenu.MonsterFeatures.BurstOfIngenuity.Name", description: "GAMBITSPREMADES.SettingsMenu.MonsterFeatures.BurstOfIngenuity.Description", boolKey: "enableBurstOfIngenuity", timeoutKey: "Burst of Ingenuity Timeout" },
      { id: "dreadCounterspell", name: "GAMBITSPREMADES.SettingsMenu.MonsterFeatures.DreadCounterspell.Name", description: "GAMBITSPREMADES.SettingsMenu.MonsterFeatures.DreadCounterspell.Description", boolKey: "enableDreadCounterspell", timeoutKey: "Dread Counterspell Timeout" }
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
        { type: "submit", icon: "fa-solid fa-save", label: game.i18n.localize("GAMBITSPREMADES.UI.SaveSettings") }
      ]
    });
  }
}

class PatreonSupportMenu extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "gambits-patreon-support",
      title: game?.i18n?.localize ? game.i18n.localize("GAMBITSPREMADES.Windows.PatreonSupport") : "GAMBITSPREMADES.Windows.PatreonSupport",
      template: "templates/blank.hbs",
      width: 1,
      height: 1,
      popOut: false
    });
  }

  render(force = false, options = {}) {
    window.open("https://www.patreon.com/GambitsLounge/membership", "_blank", "noopener,noreferrer");
    return this;
  }
}
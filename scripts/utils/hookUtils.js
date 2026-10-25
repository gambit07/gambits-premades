export async function executeWorkflow({ workflowItem, workflowData, workflowType, workflowCombat }) {
    if(!game.gpsSettings.enable3prNoCombat && !game.combat && workflowCombat) return;

    await game.gps[workflowItem]({ workflowData, workflowType, workflowCombat });
}

export function registerWrapping() {
    libWrapper.register("gambits-premades", "CONFIG.Dice.D20Roll.buildPost", async function(wrapped, rolls, config, message) {
        const names = (config.hookNames ?? []).map(name => name.toLowerCase());
        const workflowType = names.includes("skill") ? "skill" : names.includes("savingthrow") ? "save" : names.includes("abilitycheck") ? "ability" : null;
        const midi = config.midiOptions ?? {};
        if(game.gpsSettings.flashOfGeniusEnabled && workflowType && config.subject?.documentName === "Actor"
            && !midi.saveItemUuid && !midi.itemCardUuid && !midi.workflow && config.evaluate !== false) {
            for(let index = 0; index < rolls.length; index++) {
                const revised = await game.gps.flashOfGenius({workflowData: {actor: config.subject, roll: rolls[index], abilityId: config.skill ?? config.ability}, workflowType, workflowCombat: false});
                if(revised) rolls[index] = revised;
            }
        }
        return wrapped(rolls, config, message);
    }, "WRAPPER");

    let wrappingEnabled = game.settings.get("gambits-premades", "enableRegionWrapping");
    if (!wrappingEnabled) return;

    libWrapper.register('gambits-premades', 'CONFIG.Token.documentClass.prototype.testInsideRegion', function (wrapped, region, data = {}) {
        if (game.gps.disableRegionTeleport) return false;
        if (region?.flags["gambits-premades"]?.excludeRegionHandling) return wrapped.call(this, region, data);
        for (const behavior of region.behaviors.values()) {
            if (behavior.type !== "executeScript") return wrapped.call(this, region, data);
        }

        const source = this._source;
        data = { x: source.x, y: source.y, elevation: source.elevation, width: source.width, height: source.height, depth: source.depth, shape: source.shape, level: source.level, ...data };
        if (!region.includedInLevel(data.level)) return false;
        const size = this.parent.grid.size;
        const wPx = data.width  * size;
        const hPx = data.height * size;
        const reduction = Math.min(wPx, hPx) * 0.1;

        const points = [
            { x: data.x + reduction, y: data.y + reduction, elevation: data.elevation },
            { x: data.x + wPx - reduction, y: data.y + reduction, elevation: data.elevation },
            { x: data.x + reduction, y: data.y + hPx - reduction, elevation: data.elevation },
            { x: data.x + wPx - reduction, y: data.y + hPx - reduction, elevation: data.elevation },
            { x: data.x + wPx / 2, y: data.y + reduction, elevation: data.elevation },
            { x: data.x + wPx / 2, y: data.y + hPx - reduction, elevation: data.elevation },
            { x: data.x + reduction, y: data.y + hPx / 2, elevation: data.elevation },
            { x: data.x + wPx - reduction, y: data.y + hPx / 2, elevation: data.elevation },
            { x: data.x + wPx / 2, y: data.y + hPx / 2, elevation: data.elevation }
        ];

        const isInside = points.some(p => region.testPoint(p, p.elevation));
        return isInside || wrapped.call(this, region, data);
    }, 'MIXED');

    libWrapper.register('gambits-premades', 'CONFIG.Token.documentClass.prototype.segmentizeRegionMovementPath', function (wrapped, region, waypoints) {
        if (game.gps.disableRegionTeleport) return [];
        if (region?.flags["gambits-premades"]?.excludeRegionHandling) return wrapped.call(this, region, waypoints);
        for (const behavior of region.behaviors.values()) {
            if (behavior.type !== "executeScript") return wrapped.call(this, region, waypoints);
        }

        if (waypoints.some(point => ["level", "width", "height", "depth", "shape"].some(key => point[key] !== undefined && point[key] !== this._source[key]))) return wrapped.call(this, region, waypoints);
        if (!region.includedInLevel(this._source.level)) return [];
        const size = this.parent.grid.size;
        const wPx = this._source.width  * size;
        const hPx = this._source.height * size;
        const reduction = Math.min(wPx, hPx) * 0.1;

        const points = [
            { x: reduction, y: reduction, elevation: this.elevation },
            { x: wPx - reduction, y: reduction, elevation: this.elevation },
            { x: reduction, y: hPx - reduction, elevation: this.elevation },
            { x: wPx - reduction, y: hPx - reduction, elevation: this.elevation },
            { x: wPx / 2, y: reduction, elevation: this.elevation },
            { x: wPx / 2, y: hPx - reduction, elevation: this.elevation },
            { x: reduction, y: hPx / 2, elevation: this.elevation },
            { x: wPx - reduction, y: hPx / 2,       elevation: this.elevation }
        ];

        const segments = region.segmentizeMovementPath(waypoints, points);
        return (segments.length > 0) ? segments : wrapped.call(this, region, waypoints);
    }, 'MIXED');
}

export function updateSettings(settingKey = null) {
    const settingsMap = {
        'Enable Counterspell': 'counterspellEnabled',
        'Enable Silvery Barbs': 'silveryBarbsEnabled',
        'Enable Cutting Words': 'cuttingWordsEnabled',
        'Enable Poetry in Misery': 'poetryInMiseryEnabled',
        'Enable Interception': 'interceptionEnabled',
        'Enable Indomitable': 'indomitableEnabled',
        'Enable Protection': 'protectionEnabled',
        'enableProtectionOnSuccess': 'enableProtectionOnSuccess',
        'Enable Sentinel': 'sentinelEnabled',
        'Enable Riposte': 'riposteEnabled',
        'Enable Witches Hex': 'witchesHexEnabled',
        'Enable Power Word Rebound': 'powerWordReboundEnabled',
        'Mirror 3rd Party Dialog for GMs': 'enableMirrorDialog',
        'enable3prNoCombat': 'enable3prNoCombat',
        'skipResolvedReactions': 'skipResolvedReactions',
        'enableTimerFullAnim': 'enableTimerFullAnim',
        'debugEnabled': 'debugEnabled',
        'enableMageSlayer': 'mageSlayerEnabled',
        'enableInstinctiveCharm': 'instinctiveCharmEnabled',
        'enableRainOfCinders': 'rainOfCindersEnabled',
        'Enable Opportunity Attack': 'opportunityAttackEnabled',
        'enableRestoreBalance': 'restoreBalanceEnabled',
        'enableLegendaryResistance': 'legendaryResistanceEnabled',
        'enableBurstOfIngenuity': 'burstOfIngenuityEnabled',
        'enableTemporalShunt': 'temporalShuntEnabled',
        'disableCuttingWordsMaxMiss': 'disableCuttingWordsMaxMiss',
        'enableTaleOfHubris': 'taleOfHubrisEnabled',
        'enableChronalShift': 'chronalShiftEnabled',
        'enableMagicUsersNemesis': 'magicUsersNemesisEnabled',
        'enableDreadCounterspell': 'dreadCounterspellEnabled',
        'enableFlashOfGenius': 'flashOfGeniusEnabled',
        'enableTokenMovementSpeed': 'enableTokenMovementSpeed'
    };

    if (settingKey === null) {
        for (const [key, gpsSetting] of Object.entries(settingsMap)) {
            game.gpsSettings[gpsSetting] = game.settings.get('gambits-premades', key);
        }
    } else {
        const gpsSetting = settingsMap[settingKey];
        if (gpsSetting) {
            game.gpsSettings[gpsSetting] = game.settings.get('gambits-premades', settingKey);
        }
    }
}

const daeFieldBrowserFields = [];

export function daeInitFlags() {
    let browserFields = [
        'flags.gambits-premades.oaImmunity',
        'flags.gambits-premades.oaSuppression',
        'flags.gambits-premades.oaDisadvantage',
        'flags.gambits-premades.oaDisadvantageSource'
    ];

    daeFieldBrowserFields.push(...Array.from(new Set(browserFields)).sort());
}

export function daeAddFlags(fieldData) {
    fieldData['GPS'] = daeFieldBrowserFields;
}

export function daeInjectFlags() {
    foundry.utils.setProperty(game.i18n.translations, 'dae.fieldData.fieldCategories.GPS', game.i18n.localize("GAMBITSPREMADES.DAE.Category"));
    foundry.utils.setProperty(game.i18n.translations, 'dae.GPS.fieldData.flags.gambits-premades.oaImmunity', {
        name: game.i18n.localize("GAMBITSPREMADES.DAE.Flags.OAImmunity.Name"),
        description: game.i18n.localize("GAMBITSPREMADES.DAE.Flags.OAImmunity.Description")
    });
    foundry.utils.setProperty(game.i18n.translations, 'dae.GPS.fieldData.flags.gambits-premades.oaSuppression', {
        name: game.i18n.localize("GAMBITSPREMADES.DAE.Flags.OASuppression.Name"),
        description: game.i18n.localize("GAMBITSPREMADES.DAE.Flags.OASuppression.Description")
    });
    foundry.utils.setProperty(game.i18n.translations, 'dae.GPS.fieldData.flags.gambits-premades.oaDisadvantage', {
        name: game.i18n.localize("GAMBITSPREMADES.DAE.Flags.OADisadvantage.Name"),
        description: game.i18n.localize("GAMBITSPREMADES.DAE.Flags.OADisadvantage.Description")
    });
    foundry.utils.setProperty(game.i18n.translations, 'dae.GPS.fieldData.flags.gambits-premades.oaDisadvantageSource', {
        name: game.i18n.localize("GAMBITSPREMADES.DAE.Flags.OADisadvantageSource.Name"),
        description: game.i18n.localize("GAMBITSPREMADES.DAE.Flags.OADisadvantageSource.Description")
    });
    
    DAE.addAutoFields(daeFieldBrowserFields);
}

export async function arcaneShotValidActivities({item, actor}) {
    if(!actor) return;
    let arcaneShotItem = actor.items.some(i => i.name === "Arcane Shot" || i.flags["gambits-premades"]?.gpsUuid === "f9a050c1-e755-4428-b523-90969df6c799");
    if(!arcaneShotItem) return;

    const arcaneArcherLevel = actor.classes?.fighter?.system?.levels;
    
    const arcaneShotTypes = [
        { identifier: `banishingArrow`, itemName: "Banishing Arrow", gpsUuid: "227991d1-e640-4f94-9a8b-9873ad694f15" },
        { identifier: `banishingArrow18`, itemName: "Banishing Arrow", gpsUuid: "227991d1-e640-4f94-9a8b-9873ad694f15" },
        { identifier: "beguilingArrow", itemName: "Beguiling Arrow", gpsUuid: "90456c7c-d138-41bd-9e69-a642720e4edd" },
        { identifier: "burstingArrow", itemName: "Bursting Arrow", gpsUuid: "7303fad3-f581-4645-be73-dd54025ebf3d" },
        { identifier: "enfeeblingArrow", itemName: "Enfeebling Arrow", gpsUuid: "cde79d00-3828-4cef-821e-8936f605d8cb" },
        { identifier: "graspingArrow", itemName: "Grasping Arrow", gpsUuid: "cf259a10-6f48-4145-a185-bad35f8cd3df" },
        { identifier: `piercingArrow`, itemName: "Piercing Arrow", gpsUuid: "7478d1f7-24dc-44c5-aa5e-035128bf94e9" },
        { identifier: `piercingArrow18`, itemName: "Piercing Arrow", gpsUuid: "7478d1f7-24dc-44c5-aa5e-035128bf94e9" },
        { identifier: `seekingArrow`, itemName: "Seeking Arrow", gpsUuid: "21216197-2c8f-492e-ac5a-1ea44281fd79" },
        { identifier: `seekingArrow18`, itemName: "Seeking Arrow", gpsUuid: "21216197-2c8f-492e-ac5a-1ea44281fd79" },
        { identifier: "shadowArrow", itemName: "Shadow Arrow", gpsUuid: "ff16436c-47eb-450a-8d55-84b81e45a9a2" }
    ];
    
    for (const shot of arcaneShotTypes) {
        const activity = item.system.activities.find(a => a.identifier === shot.identifier);
        if (!activity) continue;
        
        const hasArrowItem = actor.items.some(i => 
            i.name === shot.itemName || i.flags["gambits-premades"]?.gpsUuid === shot.gpsUuid
        );
        
        const baseId = shot.identifier.replace(/18$/, '');
        
        const pairVariants = arcaneShotTypes.filter(s => s.identifier.replace(/18$/, '') === baseId);
        
        if (pairVariants.length > 1) {
            if (shot.identifier.endsWith("18")) {
                const automationOnly = !(arcaneArcherLevel >= 18 && hasArrowItem);
                await activity.update({ "midiProperties.automationOnly": automationOnly });
            } else {
                const automationOnly = !(arcaneArcherLevel < 18 && hasArrowItem);
                await activity.update({ "midiProperties.automationOnly": automationOnly });
            }
        } else {
            await activity.update({ "midiProperties.automationOnly": !hasArrowItem });
        }
    }
}


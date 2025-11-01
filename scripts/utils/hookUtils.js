export async function executeWorkflow({ workflowItem, workflowData, workflowType, workflowCombat }) {
    if(!game.gpsSettings.enable3prNoCombat && !game.combat && workflowCombat) return;

    await game.gps[workflowItem]({ workflowData, workflowType, workflowCombat });
}

const _timers = new Map();
const _lastApplied = new Map();
const DEBOUNCE_MS = 2000;

function _calcCenterPx(tokenDocument, updateData) {
  const gridSize = (canvas.dimensions?.size ?? canvas.grid?.size) || 100;
  const xTL = Number.isFinite(updateData?.x) ? updateData.x : tokenDocument.x;
  const yTL = Number.isFinite(updateData?.y) ? updateData.y : tokenDocument.y;
  const wG  = Number.isFinite(updateData?.width)  ? updateData.width  : tokenDocument.width  || 1;
  const hG  = Number.isFinite(updateData?.height) ? updateData.height : tokenDocument.height || 1;
  return { cx: xTL + (wG * gridSize) / 2, cy: yTL + (hG * gridSize) / 2 };
}

export function updateRegionPosition(region, tokenDocument, updatedElevation = null, updatedX = null, updatedY = null) {
  if (game.user.id !== game.gps.getPrimaryGM()) return;
  if (!region || !tokenDocument) return;

  const wantsXY = Number.isFinite(updatedX) || Number.isFinite(updatedY);
  const wantsZ  = Number.isFinite(updatedElevation);
  if (!wantsXY && !wantsZ) return;

  const key = `${region.id}:${tokenDocument.id}`;
  const pending = _timers.get(key);
  if (pending) clearTimeout(pending);

  _timers.set(key, setTimeout(async () => {
    _timers.delete(key);

    const { cx, cy } = _calcCenterPx(tokenDocument, { x: updatedX, y: updatedY });

    let bottom, top;
    if (wantsZ) {
      const range = region.getFlag("gambits-premades", "opportunityAttackRegionMaxRange") ?? 0;
      bottom = updatedElevation - range;
      top    = updatedElevation + range;
    } else {
      bottom = region.elevation?.bottom;
      top    = region.elevation?.top;
    }

    const last = _lastApplied.get(key);
    if (last && last.cx === cx && last.cy === cy && last.bottom === bottom && last.top === top) return;

    const src = region.shapes;
    const shapes = new Array(src.length);
    for (let i = 0; i < src.length; i++) {
      const s = src[i];
      if (s.type === "ellipse") {
        shapes[i] = { ...s, x: cx, y: cy };

      } else if (s.type === "rectangle") {
        const w = s.width  ?? ((s.radiusX ?? 0) * 2);
        const h = s.height ?? ((s.radiusY ?? 0) * 2);
        shapes[i] = { ...s, x: cx - w / 2, y: cy - h / 2 };

      } else if (s.type === "polygon" && Array.isArray(s.points)) {
        let sx = 0, sy = 0, n = 0;
        for (let j = 0; j < s.points.length; j += 2) { sx += s.points[j]; sy += s.points[j+1]; n++; }
        const dx = cx - (sx / n);
        const dy = cy - (sy / n);
        const pts = new Array(s.points.length);
        for (let j = 0; j < s.points.length; j += 2) { pts[j] = s.points[j] + dx; pts[j+1] = s.points[j+1] + dy; }
        shapes[i] = { ...s, points: pts };

      } else {
        shapes[i] = { ...s, x: cx, y: cy };
      }
    }

    const wasDisabled = region.getFlag("gambits-premades", "regionDisabled");
    if (!wasDisabled) await region.setFlag("gambits-premades", "regionDisabled", true);

    try {
      const patch = { shapes };
      if (Number.isFinite(bottom) && Number.isFinite(top)) patch.elevation = { bottom, top };
      await region.update(patch);
      _lastApplied.set(key, { cx, cy, bottom, top });
    } finally {
      if (!wasDisabled) await region.unsetFlag("gambits-premades", "regionDisabled");
    }
  }, DEBOUNCE_MS));
}

export function refreshTemplateVisibility() {
    canvas.templates.placeables.forEach(template => {
        if (game.gpsSettings.hideTemplates || template.document.getFlag('gambits-premades', 'templateHiddenOA')) {
            hideTemplateElements(template);
        }
    });
}

export function hideTemplateElements(template) {
    if (!template) return;

    // Check if we're on the template layer, in which case I still want template visibility
    if(canvas?.activeLayer?.constructor?.name === "TemplateLayer") return;

    // Hide primary template
    template.alpha = 0;

    // Hide highlight
    const hl = canvas.interface.grid.getHighlightLayer(template.highlightId);
    if (hl) {
        hl.alpha = 0;
    }

    // Hide border
    if (template.ruler) {
        template.ruler.visible = false;
    }

    //Reduce unneeded (I think?) refresh activity
    template.hitArea = null;
}

export function registerWrapping() {
    let wrappingEnabled = game.settings.get("gambits-premades", "enableRegionWrapping");
    if (!wrappingEnabled) return;

    libWrapper.register('gambits-premades', 'TokenDocument.prototype.testInsideRegion', function (wrapped, region, data = {}) {
        if (game.gps.disableRegionTeleport) return false;
        if (region?.flags["gambits-premades"]?.excludeRegionHandling) return wrapped.call(this, region, data);
        for (const behavior of region.behaviors.values()) {
            if (behavior.type !== "executeScript") return wrapped.call(this, region, data);
        }

        const size = canvas.dimensions.size;
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

    libWrapper.register('gambits-premades', 'TokenDocument.prototype.segmentizeRegionMovementPath', function (wrapped, region, waypoints) {
        if (game.gps.disableRegionTeleport) return [];
        if (region?.flags["gambits-premades"]?.excludeRegionHandling) return wrapped.call(this, region, waypoints);
        for (const behavior of region.behaviors.values()) {
            if (behavior.type !== "executeScript") return wrapped.call(this, region, waypoints);
        }

        const size = canvas.dimensions.size;
        const wPx = this.width  * size;
        const hPx = this.height * size;
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
        'enableTimerFullAnim': 'enableTimerFullAnim',
        'hideTemplates': 'hideTemplates',
        'debugEnabled': 'debugEnabled',
        'Enable Identify Restrictions': 'identifyRestrictionEnabled',
        'Identify Restriction Message': 'identifyRestrictionMessage',
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
        'flags.gambits-premades.oaDisadvantage'
    ];

    daeFieldBrowserFields.push(...Array.from(new Set(browserFields)).sort());
}

export function daeAddFlags(fieldData) {
    fieldData['GPS'] = daeFieldBrowserFields;
}

export function daeInjectFlags() {
    foundry.utils.setProperty(game.i18n.translations, 'dae.GPS.fieldData.flags.gambits-premades.oaImmunity', {
        name: "Opportunity Attack Immunity",
        description: "Prevents token from receiving any Opportunity Attacks"
    });
    foundry.utils.setProperty(game.i18n.translations, 'dae.GPS.fieldData.flags.gambits-premades.oaSuppression', {
        name: "Opportunity Attack Suppression",
        description: "Prevents token from making any Opportunity Attacks"
    });
    foundry.utils.setProperty(game.i18n.translations, 'dae.GPS.fieldData.flags.gambits-premades.oaDisadvantage', {
        name: "Opportunity Attack Disadvantage",
        description: "Grants disadvantage on Opportunity Attacks against a token"
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

  Hooks.on('updateActor', async (actor, diff, options, userID) => {
    const token = actor.getActiveTokens()?.[0];
    if(!token) return;

    await game.gps.wound({args: "woundRemovalFullHeal", token, options: diff})
  });
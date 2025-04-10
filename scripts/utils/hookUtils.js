export async function executeWorkflow({ workflowItem, workflowData, workflowType, workflowCombat }) {
    if(!game.gpsSettings.enable3prNoCombat && !game.combat && workflowCombat) return;

    await game.gps[workflowItem]({ workflowData, workflowType, workflowCombat });
}

export function updateRegionPosition(region, tokenDocument) {
    if (game.user.id !== game.gps.getPrimaryGM()) return;
    if (!region || !tokenDocument) return;

    let regionDisabled = region.getFlag("gambits-premades", "regionDisabled");
    if (!regionDisabled) region.setFlag("gambits-premades", "regionDisabled", true);

    let previousX1 = tokenDocument.object.center.x;
    let previousY1 = tokenDocument.object.center.y;
    let previousX2, previousY2;

    const checkPosition = () => {
        const currentX = tokenDocument.object.center.x;
        const currentY = tokenDocument.object.center.y;

        if (currentX !== previousX1 || currentY !== previousY1) {
            previousX2 = previousX1;
            previousY2 = previousY1;
            previousX1 = currentX;
            previousY1 = currentY;

            setTimeout(checkPosition, 25);
        } else if (previousX1 === previousX2 && previousY1 === previousY2) {
            const updatedShapes = region.shapes.map(shape => {
                if (shape.type === "ellipse") {
                    return {
                        ...shape,
                        x: currentX,
                        y: currentY
                    };
                } else if (shape.type === "rectangle") {
                    const sideLength = shape.width || (shape.radiusX * 2);
                    const topLeftX = currentX - (sideLength / 2);
                    const topLeftY = currentY - (sideLength / 2);
                    return {
                        ...shape,
                        x: topLeftX,
                        y: topLeftY
                    };
                } else if (shape.type === "polygon") {
                    const pts = [];
                    for (let j = 0; j < shape.points.length; j += 2) {
                        pts.push({ x: shape.points[j], y: shape.points[j+1] });
                    }
                    const centroid = pts.reduce((sum, pt) => ({
                        x: sum.x + pt.x,
                        y: sum.y + pt.y
                    }), { x: 0, y: 0 });
                    centroid.x /= pts.length;
                    centroid.y /= pts.length;
            
                    const dx = currentX - centroid.x;
                    const dy = currentY - centroid.y;
            
                    const updatedPoints = shape.points.map((coord, idx) => {
                        return (idx % 2 === 0) ? coord + dx : coord + dy;
                    });
                    return {
                        ...shape,
                        points: updatedPoints
                    };
                } else {
                    return {
                        ...shape,
                        x: currentX,
                        y: currentY
                    };
                }
            });

            region.update({
                shapes: updatedShapes
            });

            if (!regionDisabled) region.unsetFlag("gambits-premades", "regionDisabled");
            return;
        } else {
            previousX2 = previousX1;
            previousY2 = previousY1;
            setTimeout(checkPosition, 100);
        }
    };

    checkPosition();
}

export function refreshTemplateVisibility() {
    if(game.user.id !== game.gps.getPrimaryGM()) return;

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
    if(wrappingEnabled) {
        libWrapper.register('gambits-premades', 'Token.prototype.testInsideRegion', function (wrapped, ...args) {
            const [region, position] = args;

            if(region?.document.flags["gambits-premades"]?.excludeRegionHandling) return wrapped(...args); //GPS boolean flag to exclude region wrapping
            if (!this || !this.document) return wrapped(...args);
            for (const behavior of region.document.behaviors.values()) {
                if (behavior.type !== "executeScript") {
                    return wrapped(...args);
                }
            };
            
            const pointsToTest = [];
            const size = canvas.dimensions.size;
            const width = this.document.width;
            const height = this.document.height;
            const reduction = 70;
            
            const points = [
                { x: this.document.x + reduction, y: this.document.y + reduction, elevation: this.document.elevation },
                { x: this.document.x + (width * size) - reduction, y: this.document.y + reduction, elevation: this.document.elevation },
                { x: this.document.x + reduction, y: this.document.y + (height * size) - reduction, elevation: this.document.elevation },
                { x: this.document.x + (width * size) - reduction, y: this.document.y + (height * size) - reduction, elevation: this.document.elevation },
                { x: this.document.x + (width * size / 2), y: this.document.y + reduction, elevation: this.document.elevation },
                { x: this.document.x + (width * size / 2), y: this.document.y + (height * size) - reduction, elevation: this.document.elevation },
                { x: this.document.x + reduction, y: this.document.y + (height * size / 2), elevation: this.document.elevation },
                { x: this.document.x + (width * size) - reduction, y: this.document.y + (height * size / 2), elevation: this.document.elevation },
                { x: this.document.x + (width * size / 2), y: this.document.y + (height * size / 2), elevation: this.document.elevation }
            ];
        
            points.forEach(point => {
                pointsToTest.push(point);
            });
        
            const testResults = pointsToTest.map(point => {
                const result = region.testPoint(point, position?.elevation ?? this.document.elevation);
                return result;
            });
        
            const isInside = testResults.some(x => x);
        
            return isInside || wrapped(...args);
        }, 'MIXED');
        
        libWrapper.register('gambits-premades', 'Token.prototype.segmentizeRegionMovement', function (wrapped, ...args) {
            const [region, waypoints, options] = args;

            if(region?.document.flags["gambits-premades"]?.excludeRegionHandling) return wrapped(...args); //GPS boolean flag to exclude region wrapping
            if(!this || !this.document) return wrapped(...args);
            for (const behavior of region.document.behaviors.values()) {
                if (behavior.type !== "executeScript") {
                    return wrapped(...args);
                }
            };
            
            const pointsToTest = [];
            const size = canvas.dimensions.size;
            const width = this.document.width;
            const height = this.document.height;
            const reduction = 70;
            const { teleport = false } = options || {};
        
            const points = [
                { x: reduction, y: reduction, elevation: this.document.elevation },
                { x: width * size - reduction, y: reduction, elevation: this.document.elevation },
                { x: reduction, y: height * size - reduction, elevation: this.document.elevation },
                { x: width * size - reduction, y: height * size - reduction, elevation: this.document.elevation },
                { x: width * size / 2, y: reduction, elevation: this.document.elevation },
                { x: width * size / 2, y: height * size - reduction, elevation: this.document.elevation },
                { x: reduction, y: height * size / 2, elevation: this.document.elevation },
                { x: width * size - reduction, y: height * size / 2, elevation: this.document.elevation }
            ];
        
            points.forEach(point => {
                pointsToTest.push(point);
            });
            
            const segments = region.segmentizeMovement(waypoints, pointsToTest, { teleport });
            
            return segments || wrapped(...args);
        }, 'MIXED');
    }
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
        'enableChronalShift': 'chronalShiftEnabled'
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
        'flags.gambits-premades.oaSuppression'
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
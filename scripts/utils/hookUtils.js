export async function executeWorkflow({ workflowItem, workflowData, workflowType, workflowCombat }) {
    if(!game.gpsSettings.enable3prNoCombat && !game.combat && workflowCombat) return;

    await game.gps.socket.executeAsUser( workflowItem, game.user.id, { workflowData: workflowData, workflowType: workflowType, workflowCombat: workflowCombat });
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
                const sideLength = shape.width || (shape.radiusX * 2);
                const topLeftX = currentX - (sideLength / 2);
                const topLeftY = currentY - (sideLength / 2);

                if (shape.type === "ellipse") {
                    return {
                        ...shape,
                        x: currentX,
                        y: currentY
                    };
                } else if(shape.type === "rectangle") {
                    return {
                        ...shape,
                        x: topLeftX,
                        y: topLeftY
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
            if(canvas.scene.grid.type >= 2) return wrapped(...args); //Don't wrap hex grid types for now
            if (!this || !this.document) return wrapped(...args);
            
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
            if(canvas.scene.grid.type >= 2) return wrapped(...args); //Don't wrap hex grid types for now
            if(!this || !this.document) return wrapped(...args);
            
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
        'disableCuttingWordsMaxMiss': 'disableCuttingWordsMaxMiss'
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
export async function opportunityAttackScenarios({tokenUuid, regionUuid, regionScenario, isTeleport, waypoints}) {
    let gmUser = game.gps.getPrimaryGM();
    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    if(game.user.id !== gmUser) return;
    let region = await fromUuid(regionUuid);
    let token = await fromUuid(tokenUuid);
    if(!token || !region || !regionScenario) return;

    if ((token.actor.type !== 'npc' && token.actor.type !== 'character')) return;

    let oaDisabled = await region.getFlag("gambits-premades", "regionDisabled");
    if(oaDisabled) return;

    const effectOriginActor = await fromUuid(region.flags["gambits-premades"].actorUuid);
    const effectOriginToken = await fromUuid(region.flags["gambits-premades"].tokenUuid);

    if(regionScenario === "onTurnEnd") {
        let recalculate = false;
        let tokenSize = Math.max(effectOriginToken.width, effectOriginToken.height);

        let validWeapons = effectOriginActor.items.filter(item => {
            const acts = item.system?.activities ?? [];
        
            const qualifiesWeaponOrFeat = (acts.some(a => a.actionType === "mwak") && item.system?.equipped === true) || (item.system?.type?.value === "monster" && item.type === "feat" && acts.some(a => a.actionType === "mwak" || a.actionType === "msak"));
        
            return qualifiesWeaponOrFeat;
        });

        recalculate = await checkAndSetFlag("opportunityAttackRegionValidWeapons", validWeapons, region) || recalculate;
        recalculate = await checkAndSetFlag("opportunityAttackRegionTokenSize", tokenSize, region) || recalculate;
        recalculate = await handleMwakRange(effectOriginActor, region) || recalculate;

        if (!recalculate) return;

        let processedValidRange = await processValidRange({actor: effectOriginActor, token: effectOriginToken});
        const {maxRange} = processedValidRange;

        await region.setFlag("gambits-premades", "opportunityAttackRegionMaxRange", maxRange);

        let processedOaSize = processOaSize({token: effectOriginToken, maxRange});
        const {regionShape, elevationTop, elevationBottom} = processedOaSize;

        region.update({
            elevation: { bottom: elevationBottom, top: elevationTop },
            shapes: region.shapes.map(shape => ({
                ...shape,
                ...regionShape,
            }))
        });

        return;
    }

    let currentCombatant = canvas.tokens.get(game.combat?.current.tokenId);
    if(currentCombatant?.id !== token.object.id) {
        if(debugEnabled) console.error(`Opportunity Attack for ${effectOriginActor.name} failed due to not tokens turn in combat`);
        return; // Avoid initiating opportunity attack when it's not a token's turn
    }
    
    let hasSentinel = effectOriginActor?.items?.find(i => i.flags["gambits-premades"]?.gpsUuid === "f7c0b8c6-a36a-4f29-8adc-38ada0ac186c");
    let hasPolearmReaction = effectOriginActor.items.some(i => i.flags["gambits-premades"]?.gpsUuid === "1c6b264d-ea96-42c4-8237-e42d3e41bb96");
    let hasDeadlyReachReaction = effectOriginActor.items.some(i => i.flags["gambits-premades"]?.gpsUuid === "e38813a6-9707-4ff3-bf2e-59c3c91b86ac");

    let browserUser = game.gps.getBrowserUser({ actorUuid: effectOriginActor.uuid });

    let result;
    let dialogTitle;
    let dialogId;
    let braceItemUuid;

    // Check if origin token can see token moving
    if(!MidiQOL.canSee(effectOriginToken, token)) {
        if(debugEnabled) console.error(`Opportunity Attack for ${effectOriginActor.name} failed - not tokens turn`);
        return;
    }

    if(regionScenario === "onExit") {
        if(isTeleport) return;
        if(token.regions.has(region)) return;
        let dragonTurtleShield = effectOriginActor.items.getName("Dragon Turtle Dueling Shield");
        if(dragonTurtleShield) await effectOriginActor.setFlag("gambits-premades", "dragonTurtleShieldOA", true);
        
        dialogTitle = "Opportunity Attack";
        dialogId = "opportunityattack";
    }
    else if(regionScenario === "onEnter") {
        if(isTeleport) return;
        if (hasPolearmReaction) {
            let weaponNames = ["glaive","halberd","pike","quarterstaff","spear"];
            let hasPolearmWeapon = effectOriginActor.items.some(item => item.system?.type?.baseItem && weaponNames.includes(item.system?.type?.baseItem.toLowerCase()) && item.system.equipped === true);
            if(!hasPolearmWeapon) return;
            dialogTitle = "Polearm Opportunity Attack";
            dialogId = "polearmopportunityattack";
        }
        else if(effectOriginActor.classes?.fighter && effectOriginActor.classes?.fighter?.subclass?.name === "Battle Master") {
            let braceItem = effectOriginActor.items.getName("Maneuvers: Brace");
            if(!braceItem) return;
            braceItemUuid = braceItem.uuid;
            dialogTitle = "Maneuvers: Brace Opportunity Attack";
            dialogId = "maneuversbraceopportunityattack";
        }
        else if (hasDeadlyReachReaction) {
            dialogTitle = "Deadly Reach Opportunity Attack";
            dialogId = "deadlyreachopportunityattack";
        }
        else {
            return;
        }
    }

    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `Opportunity Attack Timeout`));

    // Check if origin token has already used reaction
    if (MidiQOL.hasUsedReaction(effectOriginActor)) {
        if(debugEnabled) console.error(`Opportunity Attack for ${effectOriginActor.name} failed at reaction available`);
        return;
    }

    if(!MidiQOL.isTargetable(token)) {
        if(debugEnabled) console.error(`Opportunity Attack for ${effectOriginActor.name} failed at token is targetable`);
        return;
    }

    // Check if same disposition token
    if(token.disposition === effectOriginToken.disposition) {
        if(debugEnabled) console.error(`Opportunity Attack for ${effectOriginActor.name} failed at token disposition check`);
        return;
    }

    // Check if an Opportunity Attack Suppression flag is present
    let oaSuppression = effectOriginActor.flags["gambits-premades"]?.oaSuppression;
    if(oaSuppression) {
        if(debugEnabled) console.error(`Opportunity Attack for ${effectOriginActor.name} failed at oaSuppression effect preventing reactions`);
        return;
    }

    // Check if an Opportunity Attack Immunity flag is present
    let oaImmunity = token.actor.flags["gambits-premades"]?.oaImmunity;
    if(oaImmunity) {
        if(debugEnabled) console.error(`Opportunity Attack for ${effectOriginActor.name} failed at oaImmunity effect preventing reactions against the target`);
        return;
    }

    // Check if origin token is incapacitated
    if(MidiQOL.checkIncapacitated(effectOriginToken)) {
        if(debugEnabled) console.error(`Opportunity Attack for ${effectOriginActor.name} failed because origin token is incapacitated`);
        return;
    }

    //Check if token is disengaged and origin token does not have Sentinel
    let isDisengaged = token.actor.effects.some(e => e.name.toLowerCase() === "disengage");
    if(isDisengaged && !hasSentinel) {
        if(debugEnabled) console.error(`Opportunity Attack for ${effectOriginActor.name} failed because token is using disengage`);
        return;
    }

    //Check if token activated mobile feat attack feature
    let isMobileFeat = token.actor.getFlag("midi-qol", "oaMobileFeatAttack");
    if (isMobileFeat && isMobileFeat.includes(effectOriginToken.id)) {
        if(debugEnabled) console.error(`Opportunity Attack for ${effectOriginActor.name} failed because token is using mobile feat`);
        return;
    }

    //Check if token activated fancy footwork attack feature
    let isFancyFootwork = token.actor.getFlag("midi-qol", "oaFancyFootworkAttack");
    if (isFancyFootwork && isFancyFootwork.includes(effectOriginToken.id)) {
        if(debugEnabled) console.error(`Opportunity Attack for ${effectOriginActor.name} failed because token is using fancy footwork`);
        return;
    }

    //Check if origin token is Charmed by initiating token
    let isCharmed = effectOriginActor.appliedEffects.find(e => e.name.toLowerCase() === "charmed");
    if(isCharmed) {
        let charmerItem = fromUuidSync(isCharmed.origin);
        let charmer;
        if(charmerItem) charmer = charmerItem.parent.id;
        if(charmer === token.actor.id) {
            if(debugEnabled) console.error(`Opportunity Attack for ${effectOriginActor.name} failed because origin token is charmed by token`);
            return;
        }
    }

    // Check if Levels believes tokens are on different levels
    if(CONFIG?.Levels?.API?.testCollision?.({x: effectOriginToken.object.center.x, y: effectOriginToken.object.center.y, z: effectOriginToken.object.losHeight},{x: token.object.center.x, y: token.object.center.y, z: token.object.losHeight})) {
        if(debugEnabled) console.error(`Opportunity Attack for ${effectOriginActor.name} failed because Levels indicates the tokens cannot see each other`);
        return;
    }

    //Initial Checks Passed, Pause Movement
    const resumeMovement = await token.pauseMovement();

    let oaDisadvantage = token.actor.flags["gambits-premades"]?.oaDisadvantage;
    const originDisadvantage = oaDisadvantage;
    
    let processedValidOptions = await processValidOptions({actor: effectOriginActor});
    const {hasWarCaster, favoriteWeaponUuid, validWeapons} = processedValidOptions;
    if (!validWeapons.length) return await resumeMovement();
    
    let dialogContent = `
        <div class="gps-dialog-container">
            <div class="gps-dialog-section">
                <div class="gps-dialog-content">
                    <p class="gps-dialog-paragraph">Would you like to use your reaction to attack?${hasWarCaster ? " If using War Caster to cast a spell, it must effect only the creature who triggered this Opportunity Attack." : ""}${braceItemUuid ? " This will initiate a use of your Superiority Die for the Brace maneuver." : ""}</p>
                    <div>
                        <div class="gps-dialog-flex">
                            <label for="item-select_${dialogId}" class="gps-dialog-label">Weapon:</label>
                            <select id="item-select_${dialogId}" class="gps-dialog-select">
                                ${validWeapons.map(item => `<option data-img="${item.img}" value="${item.uuid}" class="gps-dialog-option">${item.name} ${favoriteWeaponUuid === item.uuid ? "&#9733;" : ""} ${((act) => act ? (act.actionType==="msak" ? "(Melee)" : act.actionType==="rsak" ? "(Ranged)" : act.actionType==="save" ? "(Save)" : "") : "")(item.system.activities?.find(a => ["msak","rsak","save"].includes(a.actionType)))}</option>`).join('')}
                            </select>
                            <div id="image-container" class="gps-dialog-image-container">
                                <img id="weapon-img_${dialogId}" class="gps-dialog-image">
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; margin-top: 12px;">
                            <input type="checkbox" id="gps-favorite-checkbox" style="vertical-align: middle;"/>
                            <label for="gps-favorite-checkbox">Favorite this Option?</label>
                        </div>
                    </div>
                </div>
            </div>
            <div class="gps-dialog-button-container">
                <button id="pauseButton_${dialogId}" type="button" class="gps-dialog-button">
                    <i class="fas fa-pause" id="pauseIcon_${dialogId}" style="margin-right: 5px;"></i>Pause
                </button>
            </div>
        </div>
    `;

    let dialogTitlePrimary = `${effectOriginActor.name} | ${dialogTitle}`;
    let dialogTitleGM = `Waiting for ${effectOriginActor.name}'s selection | ${dialogTitle}`;

    let content = `<span style='text-wrap: wrap;'><img src="${effectOriginToken.actor.img}" style="width: 25px; height: auto;" /> ${effectOriginToken.actor.name} has a reaction available for an Opportunity Attack.</span>`
    let chatData = { user: gmUser, content: content, roll: false, whisper: gmUser };
    let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

    if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
        let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: effectOriginToken.uuid,source: "user",type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
        
        let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: effectOriginToken.uuid,source: "gm",type: "multiDialog", notificationId: notificationMessage._id };
    
        result = await game.gps.socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
    } else {
        result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: effectOriginToken.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
    }
            
    const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, selectedItemUuid, favoriteCheck, source, type } = result || {};

    if (!userDecision) {
        await effectOriginActor.unsetFlag("gambits-premades", "dragonTurtleShieldOA");
        return await resumeMovement();
    }
    else if (userDecision) {
        if (braceItemUuid) {
            let braceRoll;
            const options = {
                showFullCard: false,
                createWorkflow: true,
                versatile: false,
                configureDialog: false,
                targetUuids: [token.uuid],
                workflowOptions: {
                    autoRollDamage: 'always',
                    autoRollAttack: true,
                    autoFastDamage: true
                }
            };

            if(source && source === "user") braceRoll = await game.gps.socket.executeAsUser("remoteCompleteItemUse", browserUser, { itemUuid: braceItemUuid, actorUuid: effectOriginActor.uuid, options: options });
            else if(source && source === "gm") braceRoll = await game.gps.socket.executeAsUser("remoteCompleteItemUse", gmUser, { itemUuid: braceItemUuid, actorUuid: effectOriginActor.uuid, options: options });
            if(!braceRoll.baseLevel && !braceRoll.castLevel && !braceRoll.checkHits && !braceRoll.itemType) return await resumeMovement();
        }

        if (!selectedItemUuid) {
            console.log("No weapon selected");
            return await resumeMovement();
        }

        let chosenWeapon = await fromUuid(selectedItemUuid);
        let rsakCheck = chosenWeapon.system.activities?.some(a => a.actionType === "rsak")
        let favoriteWeaponCheck = favoriteWeaponUuid;
        let favoriteWeapon;
        if(favoriteWeaponCheck !== "null") favoriteWeapon = await fromUuid(favoriteWeaponCheck);
        if(favoriteCheck && favoriteWeaponCheck) {
           await chosenWeapon.setFlag("midi-qol", "oaFavoriteAttack", true);
           if (favoriteWeapon.uuid !== chosenWeapon.uuid) {
           await favoriteWeapon.unsetFlag("midi-qol", "oaFavoriteAttack");
           }
        }
        else if(favoriteCheck) {
           await chosenWeapon.setFlag("midi-qol", "oaFavoriteAttack", true);
        }

        let userSelect = undefined;
        if(source && source === "user") userSelect = browserUser;
        else if(source && source === "gm") userSelect = gmUser;

        const options = {
            showFullCard: false,
            createWorkflow: true,
            versatile: false,
            configureDialog: hasWarCaster,
            targetUuids: [token.uuid],
            workflowOptions: {
                autoRollDamage: 'always',
                autoRollAttack: true,
                autoFastDamage: true
            }
        };
        if (rsakCheck || originDisadvantage) {
            options.workflowOptions.disadvantage = true;
        }

        let itemRoll;
        if(source && source === "user") itemRoll = await game.gps.socket.executeAsUser("remoteCompleteItemUse", browserUser, { itemUuid: chosenWeapon.uuid, actorUuid: effectOriginActor.uuid, options: options, isWeapon: true });
        else if(source && source === "gm") itemRoll = await game.gps.socket.executeAsUser("remoteCompleteItemUse", gmUser, { itemUuid: chosenWeapon.uuid, actorUuid: effectOriginActor.uuid, options: options, isWeapon: true });

        let checkHits = itemRoll.checkHits;

        await effectOriginActor.unsetFlag("gambits-premades", "dragonTurtleShieldOA");

        if(!itemRoll.baseLevel && !itemRoll.castLevel && !itemRoll.checkHits && !itemRoll.itemType) return await resumeMovement();

        await game.gps.addReaction({actorUuid: `${effectOriginActor.uuid}`});

        if(hasSentinel && checkHits) {
            await game.gps.stopMovementExit({token});

            let effectData = [
                {
                    "icon": `${hasSentinel.img}`,
                    "origin": `${effectOriginActor.uuid}`,
                    "duration": {
                    "seconds": 1
                    },
                    "disabled": false,
                    "name": "Sentinel - Movement",
                    "changes": [
                    {
                        "key": "system.attributes.movement.all",
                        "mode": 0,
                        "value": "0",
                        "priority": 20
                    }
                    ],
                    "transfer": false
                }
            ];

            await MidiQOL.socket().executeAsUser("createEffects", gmUser, { actorUuid: token.actor.uuid, effects: effectData });
        }
        else await resumeMovement();
    }
}

export async function enableOpportunityAttack(combat, combatEvent) {

    async function processCombatant(combatant) {
        const { actor } = combatant;
        const { token } = combatant;
        let browserUser = MidiQOL.playerForActor(actor);
    
        if (actor.type === 'npc' || actor.type === 'character') {
            let processedValidRange = await processValidRange({actor, token});
            const {maxRange, validWeapons, mwakRange, oaDisabled} = processedValidRange;
            
            let processedOaSize = processOaSize({token, maxRange});
            const {regionShape, elevationTop, elevationBottom} = processedOaSize;
    
            const regionData = {
                name: `${actor.name} OA Region`,
                color: browserUser.color,
                elevation: { bottom: elevationBottom, top: elevationTop },
                shapes: [regionShape],
                behaviors: [
                    {
                        type: "executeScript",
                        name: "onExit",
                        disabled: false,
                        system: {
                            source: `let oaDisabled = await region.getFlag("gambits-premades", "regionDisabled"); if(oaDisabled) return; if(region.flags["gambits-premades"].actorUuid === event.data.token.actor.uuid) return; await game.gps.opportunityAttackScenarios({tokenUuid: event.data.token.uuid, regionUuid: region.uuid, regionScenario: "onExit", isTeleport: event.data.teleport, waypoints: event.data.movement.passed.waypoints});`,
                            events: ['tokenMoveOut']
                        }
                    },
                    {
                        type: "executeScript",
                        name: "onEnter",
                        disabled: false,
                        system: {
                            source: `let oaDisabled = await region.getFlag("gambits-premades", "regionDisabled"); if(oaDisabled) return; if(region.flags["gambits-premades"].actorUuid === event.data.token.actor.uuid) return; await game.gps.opportunityAttackScenarios({tokenUuid: event.data.token.uuid, regionUuid: region.uuid, regionScenario: "onEnter", isTeleport: event.data.teleport, waypoints: event.data.movement.passed.waypoints});`,
                            events: ['tokenMoveIn']
                        }
                    },
                    {
                        type: "executeScript",
                        name: "onTurnEnd",
                        disabled: false,
                        system: {
                            source: `let oaDisabled = await region.getFlag("gambits-premades", "regionDisabled"); if(oaDisabled) return; if(region.flags["gambits-premades"].actorUuid !== event.data.token.actor.uuid) return; await game.gps.opportunityAttackScenarios({tokenUuid: event.data.token.uuid, regionUuid: region.uuid, regionScenario: "onTurnEnd"});`,
                            events: ['tokenTurnEnd']
                        }
                    }
                ],
                flags: {
                    "gambits-premades": {
                        'actorUuid': actor.uuid,
                        'tokenUuid': token.uuid,
                        'opportunityAttackRegionValidWeapons': validWeapons,
                        'opportunityAttackRegionMwakRange': mwakRange,
                        'opportunityAttackRegionTokenSize': Math.max(token.width, token.height),
                        'opportunityAttackRegionMaxRange': maxRange
                    }
                }
            };
    
            const createdRegions = await canvas.scene.createEmbeddedDocuments('Region', [regionData]);
            const firstRegion = createdRegions[0];
    
            try {
                let attachedRegions = actor.getFlag('gambits-premades', 'attachedRegions') || [];
                attachedRegions.push(firstRegion.uuid);
                await actor.setFlag('gambits-premades', 'attachedRegions', attachedRegions);
                await combatant.setFlag("gambits-premades", "opportunityAttackRegion", firstRegion.uuid);
                if (firstRegion.object && firstRegion.object.tooltip) firstRegion.object.tooltip.visible = false;
                if (oaDisabled) await firstRegion.setFlag("gambits-premades", "regionDisabled", true);
            } catch (error) {
                console.error('Error during region attachment:', error);
            }
        }
    }

    if(combatEvent === "startCombat") {
        let levelsUI = CONFIG.Levels?.UI?.stairEnabled;
        if(levelsUI) CONFIG.Levels.UI.stairEnabled = false;

        for (let combatant of combat.combatants.values()) {
            await processCombatant(combatant);
        }

        if(levelsUI) CONFIG.Levels.UI.stairEnabled = true;
    }

    if(combatEvent === "enterCombat") {
        let levelsUI = CONFIG.Levels?.UI?.stairEnabled;
        if(levelsUI) CONFIG.Levels.UI.stairEnabled = false;

        let combatant = combat;
        await processCombatant(combatant);

        if(levelsUI) CONFIG.Levels.UI.stairEnabled = true;
    }
};

export async function disableOpportunityAttack(combat, combatEvent) {
    if (game.settings.get('gambits-premades', 'Enable Opportunity Attack') === false) return;

    async function processCombatant(combatant) {
        const { actor } = combatant;

        let regionFlag = await combatant.getFlag("gambits-premades", "opportunityAttackRegion");
        let attachedRegions = actor.getFlag('gambits-premades', 'attachedRegions') || [];
        if (attachedRegions.length !== 0) {
            attachedRegions = attachedRegions.filter(uuid => uuid !== regionFlag);
            await actor.setFlag('gambits-premades', 'attachedRegions', attachedRegions);
        }
        else {
            await actor.unsetFlag('gambits-premades', 'attachedRegions');
        }

        let regionData = null;

        try {
            regionData = regionFlag ? await fromUuid(regionFlag) : null;

            if (regionData) {
                await regionData.delete();
            }
        } catch (error) {
            console.warn(`Error deleting region data: ${error.message}`);
        }
        let dragonTurtleFlag = await actor.getFlag("gambits-premades", "dragonTurtleShieldOA");
        if (dragonTurtleFlag) await actor.unsetFlag("gambits-premades", "dragonTurtleShieldOA");
    }

    if (combatEvent === "endCombat") {
        for (let combatant of combat.combatants.values()) {
            await processCombatant(combatant);
        }
    }

    if (combatEvent === "exitCombat") {
        let combatant = combat;
        await processCombatant(combatant);
    }
};

function processOaSize({token, maxRange}) {
    const tokenCenterX = token.x + token.object.w / 2;
    const tokenCenterY = token.y + token.object.h / 2;
    const gridSize = canvas.scene.grid.size;
    const gridDistance = canvas.scene.grid.distance;
    const gridType = canvas.scene.grid.type;
    const sideLength = canvas.scene.grid.type === 0 ? (maxRange / gridDistance) * 2 * gridSize : ((maxRange / gridDistance) * 2 * gridSize);
    const topLeftX = tokenCenterX - (sideLength / 2);
    const topLeftY = tokenCenterY - (sideLength / 2);
    const radius = maxRange * gridSize / gridDistance;
    const points = [];
    let elevationTop = token.elevation + maxRange;
    let elevationBottom = token.elevation - maxRange;
    let regionShape;

    if (gridType === 0) { // Gridless
        const exponent = 4;
        const numVertices = 40; // Adjust curve smoothness

        for (let i = 0; i < numVertices; i++) {
            const theta = (i / numVertices) * 2 * Math.PI;
            const cosTheta = Math.cos(theta);
            const sinTheta = Math.sin(theta);
            
            const x = tokenCenterX + radius * Math.sign(cosTheta) * Math.pow(Math.abs(cosTheta), 2/exponent);
            const y = tokenCenterY + radius * Math.sign(sinTheta) * Math.pow(Math.abs(sinTheta), 2/exponent);
            points.push(x, y);
        }

        regionShape = {
            type: "polygon",
            points: points,
            hole: false
        };
    } else if(gridType === 1) { // Square
        regionShape = {
            type: "rectangle",
            x: topLeftX,
            y: topLeftY,
            width: sideLength,
            height: sideLength,
            rotation: 0,
            hole: false
        };
    } else if(gridType > 1) { // Hex
        const R_max = (gridType === 4 || gridType === 5) ? radius * 0.75 : radius * 1.0;
        const R_min = (gridType === 4 || gridType === 5) ? radius * 1.0 : radius * 0.75;

        const numVertices = 60; // Adjust curve smoothness

        for (let i = 0; i < numVertices; i++) {
            const theta = (i / numVertices) * 2 * Math.PI;
            const r_current = (R_max + R_min) / 2 + ((R_max - R_min) / 2) * Math.cos(6 * theta);
            const x = tokenCenterX + r_current * Math.cos(theta);
            const y = tokenCenterY + r_current * Math.sin(theta);
            points.push(x, y);
        }

        regionShape = {
            type: "polygon",
            points: points,
            hole: false
        };
    }

    return {regionShape, elevationTop, elevationBottom}
}

async function processValidOptions({actor}) {
    // Check valid weapons
    let hasWarCaster = actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "4cb8e0f5-63fd-49b7-b167-511db23d9dbf");
    let warCasterMelee = true;
    let warCasterRange = true;
    if (hasWarCaster) {
        if (game.modules.get("chris-premades")?.active) {
            let cprConfig = hasWarCaster?.getFlag("chris-premades", "config");
            if (cprConfig && 'warCasterRange' in cprConfig) {
                warCasterRange = cprConfig.warCasterRange;
            }
            if (cprConfig && 'warCasterMelee' in cprConfig) {
                warCasterMelee = cprConfig.warCasterMelee;
            }
        }
    }
    if(!warCasterMelee && !warCasterRange) hasWarCaster = false;
    
    let overrideItems = ["Booming Blade"];

    let validWeapons = actor.items.filter(item => {
        const acts = item.system?.activities ?? [];
      
        const qualifiesWeaponOrFeat = (acts.some(a => a.actionType === "mwak") && item.system?.equipped === true) || (item.system?.type?.value === "monster" && item.type === "feat" && acts.some(a => a.actionType === "mwak" || a.actionType === "msak"));

        let warCasterSpell;
        if(hasWarCaster) {
            let allowedActionTypes = [];
            if (warCasterMelee) allowedActionTypes.push("msak");
            if (warCasterRange) allowedActionTypes.push("rsak", "save");
        
            warCasterSpell = (item.type === "spell" && item.system?.activation?.type === "action" && acts.some(a => allowedActionTypes.includes(a.actionType)) && ( item.system?.prepared || (item.system?.method !== "spell" && item.system?.method !== "ritual") ) && acts.some(a => ["creature", "enemy"].includes(a.target?.affects?.type))) || (warCasterMelee && overrideItems.includes(item.name));
        }
      
        return qualifiesWeaponOrFeat || warCasterSpell;
    });
    
    // Sort the weapons alphabetically
    validWeapons.sort((a, b) => a.name.localeCompare(b.name));
    
    // Check for favorite weapon and put it on top
    let favoriteWeaponUuid = null;
    const favoriteWeaponIndex = validWeapons.findIndex(item => item.flags?.['midi-qol']?.oaFavoriteAttack);
    if (favoriteWeaponIndex > -1) {
        const favoriteWeapon = validWeapons.splice(favoriteWeaponIndex, 1)[0];
        favoriteWeaponUuid = favoriteWeapon.uuid;
        validWeapons.unshift(favoriteWeapon);
    }

    // Find 'Unarmed Strike' from the validWeapons array and add to end of list
    const unarmedIndex = validWeapons.findIndex(item => item.name.toLowerCase() === "unarmed strike");
    if (unarmedIndex > -1) {
        if(validWeapons[unarmedIndex]?.uuid !== favoriteWeaponUuid) {
            let unarmedStrike = validWeapons.splice(unarmedIndex, 1)[0];
            validWeapons.push(unarmedStrike);
        }
    }

    return {hasWarCaster, favoriteWeaponUuid, validWeapons};
}

async function processValidRange({actor, token}) {
    let hasWarCaster = actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "4cb8e0f5-63fd-49b7-b167-511db23d9dbf");
    let warCasterMelee = true;
    let warCasterRange = true;
    if (hasWarCaster) {
        if (game.modules.get("chris-premades")?.active) {
            let cprConfig = hasWarCaster?.getFlag("chris-premades", "config");
            if (cprConfig && 'warCasterRange' in cprConfig) {
                warCasterRange = cprConfig.warCasterRange;
            }
            
            if (cprConfig && 'warCasterMelee' in cprConfig) {
                warCasterMelee = cprConfig.warCasterMelee;
            }
        }
    }
    if(!warCasterMelee && !warCasterRange) hasWarCaster = false;
    let overrideItems = ["Booming Blade"];

    let validWeapons = actor.items.filter(item =>
        (item.type === "weapon" && item.system.equipped === true && item.system.activities?.some(a => a.actionType === "msak" || a.actionType === "mwak")) || ((item.system?.type?.value === "monster" && item.type === "feat") && item.system.activities?.some(a => a.actionType === "mwak" || a.actionType === "msak"))
    );

    let validSpells = actor.items.filter(item =>
        (hasWarCaster && item.type === "spell" && item.system.activities?.some(a => a.activation?.type === "action" && (a.actionType === "msak" || a.actionType === "rsak" || a.actionType === "save")) && (item.system?.prepared || (item.system?.method !== "spell" && item.system?.method !== "ritual")) && item.system.activities?.some(a => ["creature", "enemy"].includes(a.target?.affects.type))) || overrideItems.includes(item.name)
    );

    let oaDisabled;
    if (!validWeapons.length && !validSpells.length) {
        ui.notifications.warn(`No Valid Melee options found, cancelling Opportunity Attack options for ${actor.name}`);
        oaDisabled = true;
    }

    let onlyThrownWeapons = validWeapons.length > 0 && validWeapons.every(item => item.system.properties.has('thr'));

    let maxRange;
    let mwakRange = actor.flags["midi-qol"]?.range?.mwak;
    if (onlyThrownWeapons || (validSpells && !validWeapons)) {
        maxRange = 5;
    } else {
        maxRange = validWeapons.reduce((max, item) => {
            let activityMaxRange = item.system.activities?.reduce((actMax, activity) => {
            let rangeVal = activity.range?.value;
            return (typeof rangeVal === "number" && !isNaN(rangeVal)) ? Math.max(actMax, rangeVal) : actMax;
            }, 0);

            if (!activityMaxRange || activityMaxRange === 0) {
                const reach = item.system.range?.reach;
                if (typeof reach === "number" && !isNaN(reach)) {
                    activityMaxRange = reach;
                }
            }

            if (!item.system.properties?.has("thr")) {
                return Math.max(max, activityMaxRange);
            }

            return max;
        }, 0);
    }

    if(maxRange === 0 || oaDisabled) {
        const tokenSize = Math.max(token.width, token.height);
        maxRange = 4 * tokenSize;
    }
    else {      
        const tokenSizeOffset = Math.max(token.width, token.height) * 0.5 * canvas.scene.dimensions.distance;
        maxRange = (game.gps.convertFromFeet({ range: maxRange })) + tokenSizeOffset;
    
        if (mwakRange) maxRange += (game.gps.convertFromFeet({ range: mwakRange }));
    }

    return {maxRange, validWeapons, mwakRange, oaDisabled};
}

async function checkAndSetFlag(property, newValue, region) {
    const oldValue = JSON.stringify(region.flags["gambits-premades"][property]);
    if (oldValue !== JSON.stringify(newValue)) {
        await region.setFlag("gambits-premades", property, newValue);
        return true;
    }
    return false;
}

async function handleMwakRange(effectOriginActor, region) {
    if (!effectOriginActor.flags["midi-qol"]?.range?.mwak) return false;

    let mwakExpire = effectOriginActor.appliedEffects
        .filter(effect => effect.duration.turns == 1)
        .reduce((acc, effect) => {
            const change = effect.changes.find(change => change.key == "flags.midi-qol.range.mwak");
            return change ? acc + Number(change.value) : acc;
        }, 0);

    let mwakRange = effectOriginActor.flags["midi-qol"].range.mwak - mwakExpire;
    return await checkAndSetFlag("opportunityAttackRegionMwakRange", mwakRange, region);
}
export async function opportunityAttackScenarios({tokenUuid, regionUuid, regionScenario, isTeleport, waypoints, userId, tokenDocument, regionDocument}) {
    if(game.user.id !== userId || !game.gpsSettings.opportunityAttackEnabled) return;
    const debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    if(!["onEnter", "onExit", "onTurnStart", "onTurnEnd"].includes(regionScenario)) return;
    if((isTeleport || CONFIG.Token.movement.actions[waypoints?.[0]?.action]?.teleport)
        && (regionScenario === "onEnter" || regionScenario === "onExit")) return;

    const region = regionDocument ?? fromUuidSync(regionUuid);
    const token = tokenDocument ?? fromUuidSync(tokenUuid);
    if(!region || !token?.actor || !["npc", "character"].includes(token.actor.type)) return;

    const originFlags = region.flags["gambits-premades"];
    if(!originFlags?.actorUuid || !originFlags.tokenUuid) return;
    const isTurnEvent = regionScenario === "onTurnStart" || regionScenario === "onTurnEnd";
    if(isTurnEvent ? originFlags.actorUuid !== token.actor.uuid : originFlags.actorUuid === token.actor.uuid) return;

    if(regionScenario === "onTurnStart") return;
    if(region.getFlag("gambits-premades", "regionDisabled")) return;
    if(!isTurnEvent && game.combat?.current?.tokenId !== token.id) {
        if(debugEnabled) {
            const effectOriginActor = fromUuidSync(originFlags.actorUuid);
            if(effectOriginActor) game.gps.logInfo(`Opportunity Attack for ${effectOriginActor.name} failed due to not tokens turn in combat`);
        }
        return;
    }
    if(!isTurnEvent && !token.object) return;
    if(regionScenario === "onExit" && token.regions.has(region)) return;

    const effectOriginToken = fromUuidSync(originFlags.tokenUuid);
    const effectOriginActor = fromUuidSync(originFlags.actorUuid);
    if(!effectOriginActor || !effectOriginToken) return;

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

        await region.update({
            elevation: { bottom: elevationBottom, top: elevationTop, topInclusive: true },
            levels: effectOriginToken.level ? [effectOriginToken.level] : [],
            shapes: [regionShape]
        });

        return;
    }

    if(!effectOriginToken.object) return;
    const entryReaction = regionScenario === "onEnter" ? getOpportunityAttackEntry(effectOriginActor) : null;
    if(regionScenario === "onEnter" && !entryReaction) return;

    // Check if origin token has already used reaction
    if (MidiQOL.hasUsedReaction(effectOriginActor)) {
        if(debugEnabled) game.gps.logInfo(`Opportunity Attack for ${effectOriginActor.name} failed at reaction available`);
        return;
    }

    if(!MidiQOL.isTargetable(token)) {
        if(debugEnabled) game.gps.logInfo(`Opportunity Attack for ${effectOriginActor.name} failed at token is targetable`);
        return;
    }

    // Check if same disposition token
    if(token.disposition === effectOriginToken.disposition) {
        if(debugEnabled) game.gps.logInfo(`Opportunity Attack for ${effectOriginActor.name} failed at token disposition check`);
        return;
    }

    // Check if an Opportunity Attack Suppression flag is present
    let oaSuppression = effectOriginActor.flags["gambits-premades"]?.oaSuppression;
    if(oaSuppression) {
        if(debugEnabled) game.gps.logInfo(`Opportunity Attack for ${effectOriginActor.name} failed at oaSuppression effect preventing reactions`);
        return;
    }

    // Check if an Opportunity Attack Immunity flag is present
    let oaImmunity = token.actor.flags["gambits-premades"]?.oaImmunity;
    if(oaImmunity) {
        if(debugEnabled) game.gps.logInfo(`Opportunity Attack for ${effectOriginActor.name} failed at oaImmunity effect preventing reactions against the target`);
        return;
    }

    // Check if origin token is incapacitated
    if(MidiQOL.checkIncapacitated(effectOriginToken)) {
        if(debugEnabled) game.gps.logInfo(`Opportunity Attack for ${effectOriginActor.name} failed because origin token is incapacitated`);
        return;
    }

    // Check if origin token can see token moving
    if(!MidiQOL.canSee(effectOriginToken, token)) {
        if(debugEnabled) game.gps.logInfo(`Opportunity Attack for ${effectOriginActor.name} failed - ${effectOriginToken.actor.name} cannot see ${token.actor.name}`);
        return;
    }

    let hasSentinel = effectOriginActor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "f7c0b8c6-a36a-4f29-8adc-38ada0ac186c");

    //Check if token is disengaged and origin token does not have Sentinel
    let isDisengaged = token.actor.effects.some(e => e.name.toLowerCase() === "disengage");
    if(isDisengaged && !hasSentinel) {
        if(debugEnabled) game.gps.logInfo(`Opportunity Attack for ${effectOriginActor.name} failed because token is using disengage`);
        return;
    }

    //Check if token activated mobile feat attack feature
    let isMobileFeat = token.actor.getFlag("midi-qol", "oaMobileFeatAttack");
    if (isMobileFeat && isMobileFeat.includes(effectOriginToken.id)) {
        if(debugEnabled) game.gps.logInfo(`Opportunity Attack for ${effectOriginActor.name} failed because token is using mobile feat`);
        return;
    }

    //Check if token activated fancy footwork attack feature
    let isFancyFootwork = token.actor.getFlag("midi-qol", "oaFancyFootworkAttack");
    if (isFancyFootwork && isFancyFootwork.includes(effectOriginToken.id)) {
        if(debugEnabled) game.gps.logInfo(`Opportunity Attack for ${effectOriginActor.name} failed because token is using fancy footwork`);
        return;
    }

    //Check if origin token is Charmed by initiating token
    let isCharmed = effectOriginActor.appliedEffects.find(e => e.name.toLowerCase() === "charmed");
    if(isCharmed) {
        const charmer = isCharmed.getFlag("gambits-premades", "charmerUuid") ?? isCharmed.getSourceActor()?.uuid;
        if(charmer === token.actor.uuid) {
            if(debugEnabled) game.gps.logInfo(`Opportunity Attack for ${effectOriginActor.name} failed because origin token is charmed by token`);
            return;
        }
    }

    const {hasWarCaster, favoriteWeaponUuid, validWeapons} = processValidOptions({actor: effectOriginActor});
    if (!validWeapons.length) return;

    //Initial Checks Passed, Pause Movement
    let continuation = token.pauseMovement();
    let movementStopped = false;
    const resumeMovement = async () => {
        const resume = continuation;
        continuation = undefined;
        await resume?.();
    };
    try {

    if(regionScenario === "onExit" && effectOriginActor.items.getName("Dragon Turtle Dueling Shield")) {
        await effectOriginActor.setFlag("gambits-premades", "dragonTurtleShieldOA", true);
    }

    let gmUser = game.gps.getPrimaryGM();
    let browserUser = game.gps.getBrowserUser({ actorUuid: effectOriginActor.uuid });
    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', 'Opportunity Attack Timeout'));
    const dialogId = entryReaction?.dialogId ?? "opportunityattack";
    const dialogTitle = game.i18n.localize(`GAMBITSPREMADES.Dialogs.Automations.GenericFeatures.OpportunityAttack.${entryReaction?.titleKey ?? "Title"}`);
    const braceItemUuid = entryReaction?.braceItemUuid;
    let result;
    let oaDisadvantage = token.actor.flags["gambits-premades"]?.oaDisadvantage;
    let oaDisadvantageSource = effectOriginActor.flags["gambits-premades"]?.oaDisadvantageSource;
    const originDisadvantage = oaDisadvantage || oaDisadvantageSource;

    let dialogContent = `
        <div class="gps-dialog-container">
            <div class="gps-dialog-section">
                <div class="gps-dialog-content">
                    <p class="gps-dialog-paragraph">${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.GenericFeatures.OpportunityAttack.Prompts.UseYourReaction.Default", { warCasterHint: hasWarCaster ? game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.GenericFeatures.OpportunityAttack.WarCasterHint") : "", braceHint: braceItemUuid ? game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.GenericFeatures.OpportunityAttack.BraceHint") : "" })}</p>
                    <div>
                        <div class="gps-dialog-flex">
                            <label for="item-select_${dialogId}" class="gps-dialog-label">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Weapon")}</label>
                            <select id="item-select_${dialogId}" class="gps-dialog-select">
                                ${validWeapons.map(item => `<option data-img="${item.img}" value="${item.uuid}" class="gps-dialog-option">${item.name} ${favoriteWeaponUuid === item.uuid ? "&#9733;" : ""} ${((act) => act ? (act.actionType==="msak" ? "(Melee)" : act.actionType==="rsak" ? "(Ranged)" : act.actionType==="save" ? "(Save)" : "") : "")(item.system.activities?.find(a => ["msak","rsak","save"].includes(a.actionType)))}</option>`).join('')}
                            </select>
                            <div id="image-container" class="gps-dialog-image-container">
                                <img id="weapon-img_${dialogId}" class="gps-dialog-image">
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; margin-top: 12px;">
                            <input type="checkbox" id="gps-favorite-checkbox" style="vertical-align: middle;"/>
                            <label for="gps-favorite-checkbox">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.FavoriteThisOption")}</label>
                        </div>
                    </div>
                </div>
            </div>
            <div class="gps-dialog-button-container">
                <button id="pauseButton_${dialogId}" type="button" class="gps-dialog-button">
                    <i class="fas fa-pause" id="pauseIcon_${dialogId}" style="margin-right: 5px;"></i>${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Pause")}
                </button>
            </div>
        </div>
    `;

    let dialogTitlePrimary = `${effectOriginActor.name} | ${dialogTitle}`;
    let dialogTitleGM = game.i18n.format("GAMBITSPREMADES.Dialogs.Common.WaitingForSelection", { actorName: effectOriginActor.name, itemName: dialogTitle });

    let content = `<span style='text-wrap: wrap;'><img src="${effectOriginToken.actor.img}" style="width: 25px; height: auto;" /> ${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.GenericFeatures.OpportunityAttack.ReactionAvailableOpportunityAttack", { actorName: effectOriginToken.actor.name })}</span>`
    let chatData = { user: gmUser, content: content, roll: false };
    let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

    if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
        let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: effectOriginToken.uuid, focusTokenUuid: token.uuid,source: "user",type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
        
        let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: effectOriginToken.uuid, focusTokenUuid: token.uuid,source: "gm",type: "multiDialog", notificationId: notificationMessage._id };
    
        result = await game.gps.handleDialogPromises({userDialogArgs, gmDialogArgs});
    } else {
        result = await game.gps.queryDialog("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: effectOriginToken.uuid, focusTokenUuid: token.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
    }
            
    const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, selectedItemUuid, favoriteCheck, source, type } = result || {};

    if (!userDecision) {
        await effectOriginActor.unsetFlag("gambits-premades", "dragonTurtleShieldOA");
        return await resumeMovement?.();
    }
    else if (userDecision) {
        const chosenWeapon = validWeapons.find(weapon => weapon.uuid === selectedItemUuid);
        if(!chosenWeapon) return;
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

            if(source && source === "user") braceRoll = await game.gps.queryUser("remoteCompleteItemUse", browserUser, { itemUuid: braceItemUuid, actorUuid: effectOriginActor.uuid, options: options });
            else if(source && source === "gm") braceRoll = await game.gps.queryUser("remoteCompleteItemUse", gmUser, { itemUuid: braceItemUuid, actorUuid: effectOriginActor.uuid, options: options });
            if(!braceRoll?.completed) return await resumeMovement?.();
        }

        if (!selectedItemUuid) {
            console.log("No weapon selected");
            return await resumeMovement?.();
        }


        let rsakCheck = chosenWeapon.system.activities?.some(a => a.actionType === "rsak")
        let favoriteWeaponCheck = favoriteWeaponUuid;
        let favoriteWeapon;
        if(favoriteWeaponCheck !== "null") favoriteWeapon = await fromUuid(favoriteWeaponCheck);
        if(favoriteCheck && favoriteWeaponCheck) {
           await chosenWeapon.setFlag("midi-qol", "oaFavoriteAttack", true);
           if (favoriteWeapon && favoriteWeapon.uuid !== chosenWeapon.uuid) {
           await favoriteWeapon.unsetFlag("midi-qol", "oaFavoriteAttack");
           }
        }
        else if(favoriteCheck) {
           await chosenWeapon.setFlag("midi-qol", "oaFavoriteAttack", true);
        }

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
        if(source && source === "user") itemRoll = await game.gps.queryUser("remoteCompleteItemUse", browserUser, { itemUuid: chosenWeapon.uuid, actorUuid: effectOriginActor.uuid, options: options, isWeapon: true });
        else if(source && source === "gm") itemRoll = await game.gps.queryUser("remoteCompleteItemUse", gmUser, { itemUuid: chosenWeapon.uuid, actorUuid: effectOriginActor.uuid, options: options, isWeapon: true });

        let checkHits = itemRoll?.checkHits;

        await effectOriginActor.unsetFlag("gambits-premades", "dragonTurtleShieldOA");

        if(!itemRoll?.completed) return await resumeMovement?.();

        if (!itemRoll.reactionUsed) await game.gps.addReaction({actorUuid: `${effectOriginActor.uuid}`});

        if(hasSentinel && checkHits) {
            await game.gps.stopMovementExit({token});
            movementStopped = true;

            let effectData = [
                {
                    img: `${hasSentinel.img}`,
                    "origin": `${effectOriginActor.uuid}`,
                    "duration": { expiry: "turnEnd" },
                    "disabled": false,
                    "name": "Sentinel - Movement",
                    system: { changes: [
                    ...game.gps.movementSpeedChanges("0", 20)
                    ] },
                    "transfer": false
                }
            ];

            await MidiQOL.socket().executeAsUser("createEffects", gmUser, { actorUuid: token.actor.uuid, effects: effectData });
        }
        else await resumeMovement?.();
    }
    } finally {
        await effectOriginActor.unsetFlag("gambits-premades", "dragonTurtleShieldOA");
        if(!movementStopped) await resumeMovement();
    }
}

function getOpportunityAttackEntry(actor) {
    if(actor.items.some(i => i.flags["gambits-premades"]?.gpsUuid === "1c6b264d-ea96-42c4-8237-e42d3e41bb96")) {
        const weaponNames = ["glaive", "halberd", "pike", "quarterstaff", "spear"];
        if(!actor.items.some(i => i.system?.equipped === true && weaponNames.includes(i.system?.type?.baseItem?.toLowerCase()))) return null;
        return {dialogId: "polearmopportunityattack", titleKey: "TitlePolearm"};
    }
    if(actor.classes?.fighter?.subclass?.name === "Battle Master") {
        const braceItem = actor.items.getName("Maneuvers: Brace");
        return braceItem ? {dialogId: "maneuversbraceopportunityattack", titleKey: "TitleBrace", braceItemUuid: braceItem.uuid} : null;
    }
    if(actor.items.some(i => i.flags["gambits-premades"]?.gpsUuid === "e38813a6-9707-4ff3-bf2e-59c3c91b86ac")) {
        return {dialogId: "deadlyreachopportunityattack", titleKey: "TitleDeadlyReach"};
    }
    return null;
}

let opportunityAttackRegionRefresh = Promise.resolve();

export function syncOpportunityAttackRegions(combat = game.combat) {
    if(game.user.id !== game.gps.getPrimaryGM() || !game.gpsSettings.opportunityAttackEnabled || !combat?.started) return;
    const refresh = async () => {
        if(!combat.started) return;
        for(const combatant of combat.combatants) {
            const regionUuid = combatant.getFlag("gambits-premades", "opportunityAttackRegion");
            if(!regionUuid) continue;
            const region = fromUuidSync(regionUuid);
            const token = combatant.token;
            if(!region || !token || region.parent !== token.parent || region.getFlag("gambits-premades", "tokenUuid") !== token.uuid) continue;
            const actor = combatant.actor;
            if(!actor) continue;
            const updates = {};
            if(region.attachment?.token?.id !== token.id) {
                updates.attachment = {token: token.id};
                updates.levels = token.level ? [token.level] : [];
                const maxRange = region.getFlag("gambits-premades", "opportunityAttackRegionMaxRange");
                if(Number.isFinite(maxRange)) {
                    const {regionShape, elevationTop, elevationBottom} = processOaSize({token, maxRange});
                    updates.shapes = [regionShape];
                    updates.elevation = {bottom: elevationBottom, top: elevationTop, topInclusive: true};
                }
            }
            if(!region.restriction?.enabled || region.restriction.type !== "move") {
                updates.restriction = {enabled: true, type: "move"};
            }
            if(Object.keys(updates).length) await region.update(updates);
            const turnDisabled = combat.current?.tokenId === token.id;
            await setOpportunityAttackBehaviors(region, turnDisabled);
        }
    };
    opportunityAttackRegionRefresh = opportunityAttackRegionRefresh.then(refresh, refresh);
    return opportunityAttackRegionRefresh;
}

async function setOpportunityAttackBehaviors(region, turnDisabled) {
    const updates = [];
    for(const behavior of region.behaviors) {
        if(behavior.type !== "executeScript" || !["onExit", "onEnter"].includes(behavior.name)) continue;
        if(behavior.disabled !== turnDisabled) updates.push({_id: behavior.id, disabled: turnDisabled});
    }
    if(updates.length) await region.updateEmbeddedDocuments("RegionBehavior", updates);
}

export async function enableOpportunityAttack(combat, combatEvent) {

    async function processCombatant(combatant) {
        const { actor } = combatant;
        const { token } = combatant;
        if(!actor || !token) return;
        let browserUser = MidiQOL.playerForActor(actor);
    
        if (actor.type === 'npc' || actor.type === 'character') {
            let processedValidRange = await processValidRange({actor, token});
            const {maxRange, validWeapons, mwakRange, oaDisabled} = processedValidRange;
            
            let processedOaSize = processOaSize({token, maxRange});
            const {regionShape, elevationTop, elevationBottom} = processedOaSize;
    
            const turnDisabled = Boolean(oaDisabled || (combatant.parent?.started && combatant.parent.current?.tokenId === token.id));
            const regionData = {
                name: `${actor.name} OA Region`,
                color: browserUser?.color ?? game.user.color,
                elevation: { bottom: elevationBottom, top: elevationTop, topInclusive: true },
                levels: token.level ? [token.level] : [],
                attachment: {token: token.id},
                restriction: {enabled: true, type: "move"},
                visibility: CONST.REGION_VISIBILITY.LAYER,
                shapes: [regionShape],
                behaviors: [
                    {
                        type: "executeScript",
                        name: "onExit",
                        disabled: turnDisabled,
                        system: {
                            source: `if(!event.user.isSelf) return; await game.gps.opportunityAttackScenarios({tokenDocument: event.data.token, regionDocument: region, regionScenario: "onExit", userId: event.user.id, isTeleport: CONFIG.Token.movement.actions[event.data.movement.passed.waypoints?.[0]?.action]?.teleport, waypoints: event.data.movement.passed.waypoints});`,
                            events: ['tokenMoveOut']
                        }
                    },
                    {
                        type: "executeScript",
                        name: "onEnter",
                        disabled: turnDisabled,
                        system: {
                            source: `if(!event.user.isSelf) return; await game.gps.opportunityAttackScenarios({tokenDocument: event.data.token, regionDocument: region, regionScenario: "onEnter", userId: event.user.id, isTeleport: CONFIG.Token.movement.actions[event.data.movement.passed.waypoints?.[0]?.action]?.teleport, waypoints: event.data.movement.passed.waypoints});`,
                            events: ['tokenMoveIn']
                        }
                    },
                    {
                        type: "executeScript",
                        name: "onTurnEnd",
                        disabled: false,
                        system: {
                            source: `if(!event.user.isSelf) return; await game.gps.opportunityAttackScenarios({tokenDocument: event.data.token, regionDocument: region, regionScenario: "onTurnEnd", userId: event.user.id});`,
                            events: ['tokenTurnEnd']
                        }
                    },
                    {
                        type: "executeScript",
                        name: "onTurnStart",
                        disabled: false,
                        system: {
                            source: `if(!event.user.isSelf) return; await game.gps.opportunityAttackScenarios({tokenDocument: event.data.token, regionDocument: region, regionScenario: "onTurnStart", userId: event.user.id});`,
                            events: ['tokenTurnStart']
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
    
            const createdRegions = await token.parent.createEmbeddedDocuments('Region', [regionData]);
            const firstRegion = createdRegions[0];
    
            try {
                await combatant.setFlag("gambits-premades", "opportunityAttackRegion", firstRegion.uuid);
                if (firstRegion.object && firstRegion.object.tooltip) firstRegion.object.tooltip.visible = false;
                if (oaDisabled) await firstRegion.setFlag("gambits-premades", "regionDisabled", true);
            } catch (error) {
                game.gps.logInfo('Error during region attachment:', error);
            }
        }
    }

    if(combatEvent === "startCombat") {
        for (let combatant of combat.combatants.values()) {
            await processCombatant(combatant);
        }
    }

    if(combatEvent === "enterCombat") {
        let combatant = combat;
        await processCombatant(combatant);
    }
    await syncOpportunityAttackRegions(combatEvent === "startCombat" ? combat : combat.parent);
};

export async function disableOpportunityAttack(combat, combatEvent) {
    async function processCombatant(combatant) {
        const { actor } = combatant;
        let dragonTurtleFlag = actor?.getFlag("gambits-premades", "dragonTurtleShieldOA");
        if (dragonTurtleFlag) await actor.unsetFlag("gambits-premades", "dragonTurtleShieldOA");

        let regionFlag = await combatant.getFlag("gambits-premades", "opportunityAttackRegion");
        let regionData = null;

        try {
            regionData = regionFlag ? await fromUuid(regionFlag) : null;

            if (regionData) {
                await regionData.delete();
            }
        } catch (error) {
            console.warn(`Error deleting region data: ${error.message}`);
        }
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
    const {width, height} = token.getSize();
    const tokenCenterX = token.x + width / 2;
    const tokenCenterY = token.y + height / 2;
    const gridSize = token.parent.grid.size;
    const gridDistance = token.parent.grid.distance;
    const gridType = token.parent.grid.type;
    const radius = maxRange * gridSize / gridDistance;
    const points = [];
    let elevationTop = token.elevation + maxRange;
    let elevationBottom = token.elevation - maxRange;
    let regionShape;
    const sizeMap = {
        tiny: 1,
        sm: 2,
        med: 3,
        lg: 4,
        huge: 5,
        grg: 6
    };

    let tokenSize = sizeMap[token.actor.system.traits.size]

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
        const exponent = tokenSize >= 5 ? 6 : tokenSize === 4 ? 4 : 2;
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

    regionShape.origin = {x: tokenCenterX, y: tokenCenterY};
    return {regionShape, elevationTop, elevationBottom}
}

function processValidOptions({actor}) {
    // Check valid weapons
    let hasWarCaster = actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "4cb8e0f5-63fd-49b7-b167-511db23d9dbf");
    let warCasterMelee = true;
    let warCasterRange = true;
    if (hasWarCaster) {
        if (game.modules.get("cat")?.active) {
            let cprConfig = cat.utils.automationUtils.getConfigValues(hasWarCaster, ["warCasterRange", "warCasterMelee"]);
            if (typeof cprConfig.warCasterRange === 'boolean') {
                warCasterRange = cprConfig.warCasterRange;
            }
            if (typeof cprConfig.warCasterMelee === 'boolean') {
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
        
            warCasterSpell = (item.type === "spell" && acts.some(a => a.activation?.type === "action" && (allowedActionTypes.includes(a.actionType) || (warCasterRange && a.type === "save")) && ["creature", "enemy", "creatureOrObject"].includes(a.target?.affects?.type)) && ( item.system?.prepared || (item.system?.method !== "spell" && item.system?.method !== "ritual") )) || (warCasterMelee && overrideItems.includes(item.name));
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
    let isMetric = false;
    if (hasWarCaster) {
        if (game.modules.get("cat")?.active) {
            let cprConfig = cat.utils.automationUtils.getConfigValues(hasWarCaster, ["warCasterRange", "warCasterMelee"]);
            if (typeof cprConfig.warCasterRange === 'boolean') {
                warCasterRange = cprConfig.warCasterRange;
            }
            
            if (typeof cprConfig.warCasterMelee === 'boolean') {
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
        (hasWarCaster && item.type === "spell" && item.system.activities?.some(a => a.activation?.type === "action" && (a.actionType === "msak" || a.actionType === "rsak" || a.type === "save")) && (item.system?.prepared || (item.system?.method !== "spell" && item.system?.method !== "ritual")) && item.system.activities?.some(a => ["creature", "enemy", "creatureOrObject"].includes(a.target?.affects.type))) || overrideItems.includes(item.name)
    );

    isMetric ||= validSpells.some(item => ((item.system?.range?.units ?? "").toLowerCase() === "m") || (item.system?.activities ?? []).some(a => ((a.range?.units ?? "").toLowerCase() === "m")));

    let oaDisabled;
    if (!validWeapons.length && !validSpells.length) {
        ui.notifications.warn(game.i18n.format("GAMBITSPREMADES.Notifications.GenericFeatures.OpportunityAttack.NoValidOptions", { name: actor.name }));
        oaDisabled = true;
    }

    let onlyThrownWeapons = validWeapons.length > 0 && validWeapons.every(item => item.system.properties.has('thr'));

    let maxRange;
    let mwakRange = actor.flags["midi-qol"]?.range?.mwak;
    if (onlyThrownWeapons || !validWeapons.length) {
        maxRange = isMetric ? game.gps.convertFromFeet({ range: 5, scene: token.parent }) : 5;
    } else {
        const result = validWeapons.reduce((acc, item) => {
            let activityMaxRange = item.system.activities
                ?.filter(a => a?.actionType === "msak" || a?.actionType === "mwak")
                .reduce((actMax, activity) => {
                    let rangeVal = Number(activity.range?.reach ?? activity.range?.value);
                    return (typeof rangeVal === "number" && !isNaN(rangeVal)) ? Math.max(actMax, rangeVal) : actMax;
                }, 0);

            if (!activityMaxRange || activityMaxRange === 0) {
                const reach = item.system.range?.reach;
                if (typeof reach === "number" && !isNaN(reach)) {
                    activityMaxRange = reach;
                }
            }

            if (!item.system.properties?.has("thr")) {
                if (activityMaxRange > acc.max) {
                    acc.max = activityMaxRange;
                    acc.isMetric = (item.system.range?.units === 'm');
                }
            }

            return acc;
        }, { max: 0, isMetric: false });

        maxRange = result.max;
        isMetric = result.isMetric;
    }

    if(maxRange === 0 || oaDisabled) {
        const tokenSize = Math.max(token.width, token.height);
        maxRange = 4 * tokenSize;
    }
    else {      
        const tokenSizeOffset = Math.max(token.width, token.height) * 0.5 * token.parent.grid.distance;
        
        if(isMetric) maxRange = maxRange + tokenSizeOffset;
        else maxRange = (game.gps.convertFromFeet({ range: maxRange, scene: token.parent })) + tokenSizeOffset; // Never gunna remember why unless noted, I'm doing this as a backup to check IF scene is set to metric, but weapon is not
    
        if (mwakRange) maxRange += (game.gps.convertFromFeet({ range: mwakRange, scene: token.parent }));
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
        .filter(effect => effect.duration.units === "turns" && effect.duration.value === 1)
        .reduce((acc, effect) => {
            const change = effect.system.changes.find(change => change.key == "flags.midi-qol.range.mwak");
            return change ? acc + Number(change.value) : acc;
        }, 0);

    let mwakRange = effectOriginActor.flags["midi-qol"].range.mwak - mwakExpire;
    return await checkAndSetFlag("opportunityAttackRegionMwakRange", mwakRange, region);
}

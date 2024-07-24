const regionTokenStates = new Map();

export async function opportunityAttackScenarios({tokenUuid, regionUuid, regionScenario, originX, originY}) {
    const module = await import('../module.js');
    const helpers = await import('../helpers.js');
    const socket = module.socket;
    async function wait(ms) { return new Promise(resolve => { setTimeout(resolve, ms); }); }
    let region = await fromUuid(regionUuid);
    let token = await fromUuid(tokenUuid);
    if(!token || !region || !regionScenario) return;

    if ((token.actor.type !== 'npc' && token.actor.type !== 'character')) return;

    let oaDisabled = await region.getFlag("gambits-premades", "opportunityAttackDisabled");
    if(oaDisabled) return;
    
    let currentCombatant = canvas.tokens.get(game.combat?.current.tokenId);
    if (currentCombatant.id !== token.object.id) return; // Avoid initiating opportunity attack when it's not a token's turn

    const effectOriginActor = await fromUuid(region.flags["gambits-premades"].actorUuid);
    const effectOriginToken = await fromUuid(region.flags["gambits-premades"].tokenUuid);
    
    let hasSentinel = effectOriginActor.items.find(i => i.name.toLowerCase() === "sentinel");

    if(hasSentinel) {
        let sentinelUsed = effectOriginActor.getFlag("gambits-premades", "sentinelUsed");
        if(sentinelUsed) return effectOriginActor.unsetFlag("gambits-premades", "sentinelUsed");
        let sentinelDeclined = effectOriginActor.getFlag("gambits-premades", "sentinelDeclined");
        if(sentinelDeclined) return effectOriginActor.unsetFlag("gambits-premades", "sentinelDeclined");
    }

    let hasPolearmReaction = effectOriginActor.items.find(i => i.name.toLowerCase() === "polearm master");
    let hasDeadlyReachReaction = effectOriginActor.items.find(i => i.name.toLowerCase() === "deadly reach");

    let browserUser = MidiQOL.playerForActor(effectOriginActor);
    if (!browserUser.active) {
        browserUser = game.users?.activeGM;
    }

    let result;
    let dialogTitle;
    let dialogId;
    let braceItemUuid;

    if(regionScenario === "tokenExit") {
        const tokenState = regionTokenStates.get(region.id);

        if (tokenState) {
            tokenState.delete(token.id);
            regionTokenStates.set(region.id, tokenState);
        }
        regionTokenStates.set(`${region.id}-${token.id}-exited`, true);

        const effectNamesToken = ["Dissonant Whispers"];
        let hasEffectToken = token.actor.appliedEffects.some(effect => effectNamesToken.includes(effect.name));
        if (currentCombatant.id !== token.id && !hasEffectToken) return;
        
        let dragonTurtleShield = effectOriginActor.items.getName("Dragon Turtle Dueling Shield");
        if(dragonTurtleShield) await effectOriginActor.setFlag("gambits-premades", "dragonTurtleShieldOA", true);
        
        dialogTitle = "Opportunity Attack";
        dialogId = "opportunityattack";
    }
    else if(regionScenario === "tokenEnter") {
        const tokenState = regionTokenStates.get(region.id) || new Set();
        tokenState.add(token.id);
        regionTokenStates.set(region.id, tokenState);
        regionTokenStates.set(`${region.id}-${token.id}-entered`, true);

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
            const superiorityNames = ["superiority dice", "superiority die"];
            let resourceExistsWithValue = [effectOriginActor.system.resources.primary, effectOriginActor.system.resources.secondary, effectOriginActor.system.resources.tertiary].some(resource => superiorityNames.includes(resource?.label.toLowerCase()) && resource.value !== 0);
            let itemExistsWithValue;
            if (!resourceExistsWithValue) itemExistsWithValue = !!effectOriginActor.items.find(i => superiorityNames.includes(i.name.toLowerCase()) && i.system.uses.value !== 0);
            if (!resourceExistsWithValue && !itemExistsWithValue) return;
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
    else if(regionScenario === "tokenPostMove") {
        const entered = regionTokenStates.get(`${region.id}-${token.id}-entered`);
        const exited = regionTokenStates.get(`${region.id}-${token.id}-exited`);

        let sentinelUsed = effectOriginActor.getFlag("gambits-premades", "sentinelUsed");
        let sentinelDeclined = effectOriginActor.getFlag("gambits-premades", "sentinelDeclined");
        
        if(hasSentinel && !sentinelUsed && !sentinelDeclined && ((entered && (hasPolearmReaction || hasDeadlyReachReaction)) || exited)) {
            //await wait(450); //Prevent Active Auras from freaking out
            await token.update({ x: originX, y: originY }, { animate: false });
        }

        if (entered || exited) {
            regionTokenStates.delete(`${region.id}-${token.id}-entered`);
            regionTokenStates.delete(`${region.id}-${token.id}-exited`);
            return;
        }

        if (token.regions.has(region)) return;

        if(hasSentinel && (sentinelUsed || sentinelDeclined)) return;

        const effectNamesToken = ["Dissonant Whispers"];
        let hasEffectToken = token.actor.appliedEffects.some(effect => effectNamesToken.includes(effect.name));
        if (currentCombatant.id !== token.id && !hasEffectToken) return;
        
        let dragonTurtleShield = effectOriginActor.items.getName("Dragon Turtle Dueling Shield");
        if(dragonTurtleShield) await effectOriginActor.setFlag("gambits-premades", "dragonTurtleShieldOA", true);
        
        dialogTitle = "Opportunity Attack";
        dialogId = "opportunityattack";
    }

    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `Opportunity Attack Timeout`));

    if(MidiQOL.hasUsedReaction(effectOriginActor)) return;

    // Check if origin token can see token moving
    if(!MidiQOL.canSee(effectOriginToken, token)) return;

    // Check if same disposition token
    if(token.disposition === effectOriginToken.disposition) return;

    // Check if origin tokens reaction is already used or a spell effect is preventing reactions
    const effectNamesOrigin = ["Reaction", "Confusion", "Arms of Hadar", "Shocking Grasp", "Slow", "Staggering Smite"];
    let hasEffectOrigin = effectOriginActor.appliedEffects.some(effect => effectNamesOrigin.includes(effect.name));
    if(hasEffectOrigin) return;

    // Check if origin token is incapacitated
    let isIncapacitated = MidiQOL.checkIncapacitated(effectOriginToken);
    if(isIncapacitated) return;

    //Check if token is disengaged and origin token does not have Sentinel
    let isDisengaged = token.actor.effects.some(e => e.name.toLowerCase() === "disengage");
    if(isDisengaged && !hasSentinel) return;

    //Check if token activated mobile feat attack feature
    let isMobileFeat = token.actor.getFlag("midi-qol", "oaMobileFeatAttack");
    if (isMobileFeat && isMobileFeat.includes(effectOriginToken.id)) return;

    //Check if token activated fancy footwork attack feature
    let isFancyFootwork = token.actor.getFlag("midi-qol", "oaFancyFootworkAttack");
    if (isFancyFootwork && isFancyFootwork.includes(effectOriginToken.id)) return;

    //Check if origin token is Charmed by initiating token
    let isCharmed = effectOriginActor.appliedEffects.find(e => e.name.toLowerCase() === "charmed");
    if(isCharmed) {
        let charmerItem = fromUuidSync(isCharmed.origin);
        let charmer;
        if(charmerItem) charmer = charmerItem.parent.id;
        if(charmer === token.actor.id) return;
    }

    // Check if the token has cast Kinetic Jaunt, Zephyr Strike, or the generic immunity effect has been applied
    const effectNamesToken = ["Kinetic Jaunt", "Zephyr Strike", "Opportunity Attack Immunity", "Rabbit Hop", "Ashardalon's Stride"];
    let hasEffectToken = token.actor.appliedEffects.some(effect => effectNamesToken.includes(effect.name));
    if(hasEffectToken) return;

    let hasFlyby = token.actor.items.find(i => i.name.toLowerCase().includes("flyby"));
    if(hasFlyby) return;

    let originDisadvantage = token.actor.items.some(i => i.name.toLowerCase().includes("escape the hoard"));
    // Check valid weapons
    let hasWarCaster = effectOriginActor.items.find(i => i.name.toLowerCase() === "war caster");
    let hasWarCasterConfigDialog = effectOriginActor.items.some(i => i.name.toLowerCase() === "war caster");
    let overrideItems = ["Booming Blade"];

    let validWeapons = effectOriginActor.items.filter(item => {
        return (((item.system?.actionType === "mwak" && item.system?.equipped === true) || (item.system?.type?.value === "monster" && item?.type === "feat" && (item.system?.actionType === "mwak" || item.system?.actionType === "msak")) || (item?.type === "weapon" && item.system?.actionType === "msak")) || 
                (hasWarCaster && ((item.type === "spell" && item.system?.activation?.type === "action" && 
                (item.system?.actionType === "msak" || item.system?.actionType === "rsak" || 
                item.system?.actionType === "save") && (item.system?.preparation?.prepared === true || item.system?.preparation?.mode !== 'prepared' || !item.system?.preparation) &&
                (item.system?.target?.type === "creature" || item.system?.target?.type === "enemy")) || overrideItems.includes(item.name))));
    });
    if (!validWeapons.length) return;
    
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
    
    const optionBackground = (document.body.classList.contains("theme-dark")) ? 'black' : 'var(--color-bg)';
    
    let dialogContent = `
        <style>
        #gps-favorite-checkbox {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
        }

        #gps-favorite-checkbox + label {
        display: flex;
        align-items: center;
        cursor: pointer;
        }

        #gps-favorite-checkbox + label::before {
        content: "\\2606"; /* Unicode empty star (☆) for my remembrance*/
        font-size: 30px;
        margin-right: 5px;
        line-height: 1;
        vertical-align: middle;
        }

        #gps-favorite-checkbox:checked + label::before {
            content: "\\2605"; /* Unicode filled star (★) also for my remembrance */
        }
        </style>
        <div class="gps-dialog-container">
            <div class="gps-dialog-section">
                <div class="gps-dialog-content">
                    <p class="gps-dialog-paragraph">Would you like to use your reaction to attack?${braceItemUuid ? " This will initiate a use of your Superiority Die for the Brace maneuver." : ""}</p>
                    <div>
                        <div class="gps-dialog-flex">
                            <label for="item-select_${dialogId}" class="gps-dialog-label">Weapon:</label>
                            <select id="item-select_${dialogId}" class="gps-dialog-select">
                                ${validWeapons.map(item => `<option name="${item.img}" value="${item.uuid}" class="gps-dialog-option" style="background-color: ${optionBackground};">${item.name} ${favoriteWeaponUuid === item.uuid ? "&#9733;" : ""} ${item.system.actionType === "msak" ? "(Melee)" : item.system.actionType === "rsak" ? "(Ranged)" : item.system.actionType === "save" ? "(Save)" : ""}</option>`).join('')}
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
    let chatData = {
    user: game.users.find(u => u.isGM).id,
    content: content,
    whisper: game.users.find(u => u.isGM).id
    };
    let notificationMessage = await MidiQOL.socket().executeAsGM("createChatMessage", { chatData });

    if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
        let userDialogPromise = socket.executeAsUser("process3rdPartyReactionDialog", browserUser.id, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: effectOriginToken.uuid,source: "user",type: "multiDialog"});
        
        let gmDialogPromise = socket.executeAsGM("process3rdPartyReactionDialog", {dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: effectOriginToken.uuid,source: "gm",type: "multiDialog"});
    
        result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
    } else {
        result = await socket.executeAsUser("process3rdPartyReactionDialog", browserUser.id, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: effectOriginToken.uuid,source:browserUser.isGM ? "gm" : "user",type:"singleDialog"});
    }
            
    const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, selectedItemUuid, favoriteCheck, source, type } = result;

    if (!userDecision) {
        if(source === "gm" || type === "singleDialog") await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
        await effectOriginActor.unsetFlag("gambits-premades", "dragonTurtleShieldOA");
        if(hasSentinel) await effectOriginActor.setFlag("gambits-premades", "sentinelDeclined", true);
        return;
    }
    else if (userDecision) {
        if(source === "gm" || type === "singleDialog") await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });

        if (braceItemUuid) {
            let braceItem = await fromUuid(braceItemUuid);
            const braceRoll = await braceItem.use();
            if (braceRoll.aborted === true) return;
        }

        if (!selectedItemUuid) {
            console.log("No weapon selected");
            return;
        }

        let chosenWeapon = await fromUuid(selectedItemUuid);
        let rsakCheck = chosenWeapon.system.actionType === "rsak";
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

        chosenWeapon = chosenWeapon.clone({
            system: {
                "range": {
                    "value": null,
                    "long": null,
                    "units": ""
                }
            }
        }, { keepId: true });

        chosenWeapon.prepareData();
        chosenWeapon.prepareFinalAttributes();

        const options = {
            showFullCard: false,
            createWorkflow: true,
            versatile: false,
            configureDialog: hasWarCasterConfigDialog,
            targetUuids: [token.uuid],
            workflowOptions: {
                autoRollDamage: 'onHit',
                autoFastDamage: true,
            }
        };
        if (rsakCheck || originDisadvantage) {
            options.workflowOptions.disadvantage = true;
        }

        let checkHits;
        Hooks.once("midi-qol.postActiveEffects", async (workflow) => {
            checkHits = workflow.hitTargets.first();
        });

        let itemRoll;
        if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser?.id, { itemData: chosenWeapon, actorUuid: effectOriginActor.uuid, options: options });
        else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsGM("completeItemUse", { itemData: chosenWeapon, actorUuid: effectOriginActor.uuid, options: options });

        await effectOriginActor.unsetFlag("gambits-premades", "dragonTurtleShieldOA");

        if(itemRoll.aborted === true) return;

        await helpers.addReaction({actorUuid: `${effectOriginActor.uuid}`});

        if(hasSentinel && checkHits) {
            await effectOriginActor.setFlag("gambits-premades", "sentinelUsed", true);

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

            await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: token.actor.uuid, effects: effectData });
        }
        else if(hasSentinel && !checkHits) await effectOriginActor.setFlag("gambits-premades", "sentinelDeclined", true);
    }
}

export async function enableOpportunityAttack(combat, combatEvent) {

    async function processCombatant(combatant) {
        const { actor } = combatant;
        const { token } = combatant;
        let browserUser = MidiQOL.playerForActor(actor);
    
        // Perform cleanup
        const existingOA = actor.items.find(item => item.name === 'Opportunity Attack');
        if(existingOA) await existingOA.delete();
    
        if (actor.type === 'npc' || actor.type === 'character') {
            let hasWarCaster = actor.items.find(i => i.name.toLowerCase() === "war caster");
            let overrideItems = ["Booming Blade"];
            let validWeapons = actor.items.filter(item => 
                ((item.system?.actionType === "mwak" && item.system?.equipped === true) || 
                 (item.system?.type?.value === "monster" && item?.type === "feat" && 
                  (item.system?.actionType === "mwak" || item.system?.actionType === "msak")) || 
                 (item?.type === "weapon" && item.system?.actionType === "msak")));
        
            let validSpells = actor.items.filter(item => 
                (hasWarCaster && (item.type === "spell" && item.system?.activation?.type === "action" && 
                 (item.system?.actionType === "msak" || item.system?.actionType === "rsak" || item.system?.actionType === "save") && 
                 (item.system?.preparation?.prepared === true || item.system?.preparation?.mode !== 'prepared' || !item.system?.preparation) && 
                 (item.system?.target?.type === "creature" || item.system?.target?.type === "enemy")) || 
                 overrideItems.includes(item.name)));
            
            let oaDisabled;
            if (!validWeapons.length && !validSpells.length) {
                ui.notifications.warn(`No Valid Melee options found, cancelling Opportunity Attack options for ${actor.name}`);
                oaDisabled = true;
            }
        
            let onlyThrownWeapons = validWeapons.length > 0 && validWeapons.every(item => item.system.properties.has('thr'));
            
            const units = canvas.scene.grid.units;
            let conversionFactor;
            if (units === "meters" || units === "m" || units === "mt") {
                conversionFactor = 0.3;
            }
            else conversionFactor = 1;
        
            let maxRange;
            if (onlyThrownWeapons || (validSpells && !validWeapons)) {
                maxRange = 5;
            } else {
                maxRange = validWeapons.reduce((max, item) => {
                    let rangeValue = item.system.range?.value;
                    let noThr = !item.system.properties?.has('thr');
                    if (rangeValue && !isNaN(rangeValue) && noThr) {
                        return Math.max(max, rangeValue);
                    }
                    return max;
                }, 0);
            }
        
            if (token.width === 1 && maxRange === 10) maxRange += 1.7;
            else if (token.width === 2 && maxRange === 5) maxRange += 0.7;
            else if (token.width === 3 && maxRange === 5) maxRange += 1.7;
            else if (token.width === 3 && maxRange === 10) maxRange += 0.7;
            else if (token.width === 4 && maxRange === 10) maxRange += 1.6;
            
            const tokenSizeOffset = Math.max(token.width, token.height) * 0.5 * canvas.scene.dimensions.distance;
            maxRange = (maxRange * conversionFactor) + tokenSizeOffset;
        
            let mwakRange = actor.flags["midi-qol"]?.range?.mwak;
            if (mwakRange) maxRange += (mwakRange * conversionFactor);
    
            if(oaDisabled) maxRange = 1;
        
            const tokenCenterX = token.x + token.object.w / 2;
            const tokenCenterY = token.y + token.object.h / 2;
    
            const regionData = {
                name: `${actor.name} OA Region`,
                color: browserUser.color,
                elevation: { bottom: -maxRange, top: maxRange },
                shapes: [
                    {
                        type: "ellipse",
                        x: tokenCenterX,
                        y: tokenCenterY,
                        radiusX: maxRange * canvas.scene.grid.size / canvas.scene.dimensions.distance,
                        radiusY: maxRange * canvas.scene.grid.size / canvas.scene.dimensions.distance,
                        rotation: 0,
                        hole: false
                    }
                ],
                behaviors: [
                    {
                        type: "executeScript",
                        name: "onExit",
                        disabled: false,
                        system: {
                            source: `let oaDisabled = await region.getFlag("gambits-premades", "opportunityAttackDisabled"); if(oaDisabled) return; if(region.flags["gambits-premades"].actorUuid === event.data.token.actor.uuid) return; if(event.data.teleport === true) return; await game.gps.opportunityAttackScenarios({tokenUuid: event.data.token.uuid, regionUuid: region.uuid, regionScenario: "tokenExit"});`,
                            events: ['tokenExit']
                        }
                    },
                    {
                        type: "executeScript",
                        name: "onEnter",
                        disabled: false,
                        system: {
                            source: `let oaDisabled = await region.getFlag("gambits-premades", "opportunityAttackDisabled"); if(oaDisabled) return; if(region.flags["gambits-premades"].actorUuid === event.data.token.actor.uuid) return; if(event.data.teleport === true) return; await game.gps.opportunityAttackScenarios({tokenUuid: event.data.token.uuid, regionUuid: region.uuid, regionScenario: "tokenEnter"});`,
                            events: ['tokenEnter']
                        }
                    },
                    {
                        type: "executeScript",
                        name: "onPostMove",
                        disabled: false,
                        system: {
                            source: `let oaDisabled = await region.getFlag("gambits-premades", "opportunityAttackDisabled"); if(oaDisabled) return; if(region.flags["gambits-premades"].actorUuid === event.data.token.actor.uuid) return; if(event.data.teleport === true) return; await game.gps.opportunityAttackScenarios({tokenUuid: event.data.token.uuid, regionUuid: region.uuid, regionScenario: "tokenPostMove", originX: event.data.segments[0].to.x, originY: event.data.segments[0].to.y});`,
                            events: ['tokenMove']
                        }
                    }
                ],
                flags: {
                    "gambits-premades": {
                        "templateHiddenOA": true,
                        'actorUuid': actor.uuid,
                        'tokenUuid': token.uuid,
                        'opportunityAttackSet': true,
                        'opportunityAttackTemplateValidWeapons': validWeapons,
                        'opportunityAttackTemplateValidSpells': validSpells,
                        'opportunityAttackTemplateMwakRange': mwakRange,
                        'opportunityAttackTemplateTokenSize': Math.max(token.width, token.height),
                        'opportunityAttackTemplateConFac': conversionFactor
                    }
                }
            };
    
            const createdRegions = await canvas.scene.createEmbeddedDocuments('Region', [regionData]);
            const firstRegion = createdRegions[0];
    
            try {
                await actor.setFlag("gambits-premades", "templateAttachedToken", firstRegion.uuid);
                await actor.setFlag("gambits-premades", "tokenAttachedTemplate", token.id);
                await actor.setFlag("gambits-premades", "opportunityAttackTemplate", firstRegion.uuid);
                if (firstRegion.object && firstRegion.object.tooltip) firstRegion.object.tooltip.visible = false;
                if (oaDisabled) await firstRegion.setFlag("gambits-premades", "opportunityAttackDisabled", true);
            } catch (error) {
                console.error('Error during region attachment:', error);
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
};

export async function disableOpportunityAttack(combat, combatEvent) {
    if (game.settings.get('gambits-premades', 'Enable Opportunity Attack') === false) return;

    async function processCombatant(combatant) {
        const { actor } = combatant;

        let templateFlag = await actor.getFlag("gambits-premades", "opportunityAttackTemplate");
        let templateAttachmentFlag = await actor.getFlag("gambits-premades", "templateAttachedToken");
        let dragonTurtleFlag = await actor.getFlag("gambits-premades", "dragonTurtleShieldOA");
        let templateData = templateFlag ? await fromUuid(templateFlag) : null;

        /*let effectNames = ["Opportunity Attack Reaction", "Maneuvers: Brace Opportunity Attack"];
        let effectIdsToDelete = actor.effects
            .filter(effect => effectNames.includes(effect.name))
            .map(effect => effect.id);

        if (effectIdsToDelete.length > 0) {
            await actor.deleteEmbeddedDocuments("ActiveEffect", effectIdsToDelete);
        }*/

        if (templateData) await templateData.delete();
        if (templateFlag) await actor.unsetFlag("gambits-premades", "opportunityAttackTemplate");
        if (templateAttachmentFlag) await actor.unsetFlag("gambits-premades", "templateAttachedToken");
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
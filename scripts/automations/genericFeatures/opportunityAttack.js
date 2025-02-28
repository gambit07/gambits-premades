const regionTokenStates = new Map();

export async function opportunityAttackScenarios({tokenUuid, regionUuid, regionScenario, originX, originY, isTeleport}) {
    let gmUser = game.gps.getPrimaryGM();
    if(game.user.id !== gmUser) return;
    //async function wait(ms) { return new Promise(resolve => { setTimeout(resolve, ms); }); }
    let region = await fromUuid(regionUuid);
    let token = await fromUuid(tokenUuid);
    if(!token || !region || !regionScenario) return;

    if ((token.actor.type !== 'npc' && token.actor.type !== 'character')) return;

    let oaDisabled = await region.getFlag("gambits-premades", "regionDisabled");
    if(oaDisabled) return;
    
    let currentCombatant = canvas.tokens.get(game.combat?.current.tokenId);
    if (currentCombatant?.id !== token.object.id) return; // Avoid initiating opportunity attack when it's not a token's turn

    const effectOriginActor = await fromUuid(region.flags["gambits-premades"].actorUuid);
    const effectOriginToken = await fromUuid(region.flags["gambits-premades"].tokenUuid);
    
    let hasSentinel = effectOriginActor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "f7c0b8c6-a36a-4f29-8adc-38ada0ac186c");

    /*if(hasSentinel) {
        let sentinelUsed = effectOriginActor.getFlag("gambits-premades", "sentinelUsed");
        if(sentinelUsed) return effectOriginActor.unsetFlag("gambits-premades", "sentinelUsed");
        let sentinelDeclined = effectOriginActor.getFlag("gambits-premades", "sentinelDeclined");
        if(sentinelDeclined) return effectOriginActor.unsetFlag("gambits-premades", "sentinelDeclined");
    }*/

    let hasPolearmReaction = effectOriginActor.items.some(i => i.flags["gambits-premades"]?.gpsUuid === "1c6b264d-ea96-42c4-8237-e42d3e41bb96");
    let hasDeadlyReachReaction = effectOriginActor.items.some(i => i.flags["gambits-premades"]?.gpsUuid === "e38813a6-9707-4ff3-bf2e-59c3c91b86ac");

    let browserUser = game.gps.getBrowserUser({ actorUuid: effectOriginActor.uuid });

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

        return;
    }
    else if(regionScenario === "tokenEnter") {
        const tokenState = regionTokenStates.get(region.id) || new Set();
        tokenState.add(token.id);
        regionTokenStates.set(region.id, tokenState);
        regionTokenStates.set(`${region.id}-${token.id}-entered`, true);

        return;
    }
    else if(regionScenario === "tokenPostMove") {
        const entered = regionTokenStates.get(`${region.id}-${token.id}-entered`);
        const exited = regionTokenStates.get(`${region.id}-${token.id}-exited`);

        /*let sentinelUsed = effectOriginActor.getFlag("gambits-premades", "sentinelUsed");
        let sentinelDeclined = effectOriginActor.getFlag("gambits-premades", "sentinelDeclined");
        
        if(hasSentinel && !sentinelUsed && !sentinelDeclined && ((entered && (hasPolearmReaction || hasDeadlyReachReaction)) || exited)) {
            //await wait(450); //Prevent Active Auras from freaking out
            await token.update({ x: originX, y: originY }, { animate: false });
        }*/

        /*if (entered || exited) {
            regionTokenStates.delete(`${region.id}-${token.id}-entered`);
            regionTokenStates.delete(`${region.id}-${token.id}-exited`);
            return;
        }*/

        regionTokenStates.delete(`${region.id}-${token.id}-exited`);
        regionTokenStates.delete(`${region.id}-${token.id}-entered`);

        //if(hasSentinel && (sentinelUsed || sentinelDeclined)) return;

        if((exited || (!exited && !entered)) && !isTeleport) {
            if (token.regions.has(region)) return;
            let dragonTurtleShield = effectOriginActor.items.getName("Dragon Turtle Dueling Shield");
            if(dragonTurtleShield) await effectOriginActor.setFlag("gambits-premades", "dragonTurtleShieldOA", true);
            
            dialogTitle = "Opportunity Attack";
            dialogId = "opportunityattack";
        }
        else if(entered && !isTeleport) {
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
        else {
            return;
        }
    }

    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `Opportunity Attack Timeout`));
    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');

    // Check if origin token has already used reaction
    if (MidiQOL.hasUsedReaction(effectOriginActor)) {
        if(debugEnabled) console.error(`Opportunity Attack for ${effectOriginActor.name} failed at reaction available`);
        return;
    }

    // Check if origin token can see token moving
    if(!MidiQOL.canSee(effectOriginToken, token)) {
        if(debugEnabled) console.error(`Opportunity Attack for ${effectOriginActor.name} failed at sight check`);
        return;
    }

    if(!MidiQOL.isTargetable(token)) {
        if(debugEnabled) console.error(`Opportunity Attack for ${effectOriginActor.name} failed at token is targetable`);
        return;
    }

    if(MidiQOL.checkIncapacitated(effectOriginActor) !== false) {
        if(debugEnabled) console.error(`Opportunity Attack for ${effectOriginActor.name} failed at origin token is incapacitated`);
        return;
    }

    // Check if same disposition token
    if(token.disposition === effectOriginToken.disposition) {
        if(debugEnabled) console.error(`Opportunity Attack for ${effectOriginActor.name} failed at token disposition check`);
        return;
    }

    // Check if origin tokens reaction is already used or a spell effect is preventing reactions
    const effectNamesOrigin = ["Confusion", "Arms of Hadar", "Shocking Grasp", "Slow", "Staggering Smite"];
    let hasEffectOrigin = effectOriginActor.appliedEffects.some(effect => effectNamesOrigin.includes(effect.name));
    if(hasEffectOrigin) {
        if(debugEnabled) console.error(`Opportunity Attack for ${effectOriginActor.name} failed at spell effect preventing reaction`);
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

    // Check if the token has cast Kinetic Jaunt, Zephyr Strike, or the generic immunity effect has been applied
    const effectNamesToken = ["Kinetic Jaunt", "Zephyr Strike", "Opportunity Attack Immunity", "Rabbit Hop", "Ashardalon's Stride", "Hurried Response", "Sudden Rush"];
    let hasEffectToken = token.actor.appliedEffects.some(effect => effectNamesToken.includes(effect.name));
    if(hasEffectToken) {
        if(debugEnabled) console.error(`Opportunity Attack for ${effectOriginActor.name} failed because token is using an immunity effect`);
        return;
    }

    // Check if the token has used Flyby
    let hasFlyby = token.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "54bf1c5f-09d2-4ca9-8465-c9d5b3a72798");
    if(hasFlyby) {
        if(debugEnabled) console.error(`Opportunity Attack for ${effectOriginActor.name} failed because token has flyby`);
        return;
    }

    let itemNamesDis = ["escape the hoard", "speedy"];
    let hasItemDis = token.actor.items.some(i => itemNamesDis.some(name => i.name.toLowerCase().includes(name)));
    let effectNameDis = ["boots of speed"];
    let hasEffectDis = token.actor.appliedEffects.some(e => effectNameDis.some(name => e.name.toLowerCase().includes(name)));
    const originDisadvantage = hasItemDis || hasEffectDis;
    
    // Check valid weapons
    let hasWarCaster = effectOriginActor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "4cb8e0f5-63fd-49b7-b167-511db23d9dbf");
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

    let validWeapons = effectOriginActor.items.filter(item => {
        const acts = item.system?.activities ?? [];
      
        const qualifiesWeaponOrFeat = (acts.some(a => a.actionType === "mwak") && item.system?.equipped === true) || (item.system?.type?.value === "monster" && item.type === "feat" && acts.some(a => a.actionType === "mwak" || a.actionType === "msak"));

        let warCasterSpell;
        if(hasWarCaster) {
            let allowedActionTypes = [];
            if (warCasterMelee) allowedActionTypes.push("msak");
            if (warCasterRange) allowedActionTypes.push("rsak", "save");
        
            warCasterSpell = (item.type === "spell" && item.system?.activation?.type === "action" && acts.some(a => allowedActionTypes.includes(a.actionType)) && ( item.system?.preparation?.prepared || item.system?.preparation?.mode !== "prepared" || !item.system?.preparation ) && acts.some(a => ["creature", "enemy"].includes(a.target?.affects?.type))) || (warCasterMelee && overrideItems.includes(item.name))
            console.log(warCasterSpell, "warCasterSpell")
        }
      
        return qualifiesWeaponOrFeat || warCasterSpell;
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
                    <p class="gps-dialog-paragraph">Would you like to use your reaction to attack?${hasWarCaster ? " If using War Caster to cast a spell, it must effect only the creature who triggered this Opportunity Attack." : ""}${braceItemUuid ? " This will initiate a use of your Superiority Die for the Brace maneuver." : ""}</p>
                    <div>
                        <div class="gps-dialog-flex">
                            <label for="item-select_${dialogId}" class="gps-dialog-label">Weapon:</label>
                            <select id="item-select_${dialogId}" class="gps-dialog-select">
                                ${validWeapons.map(item => `<option name="${item.img}" value="${item.uuid}" class="gps-dialog-option" style="background-color: ${optionBackground};">${item.name} ${favoriteWeaponUuid === item.uuid ? "&#9733;" : ""} ${((act) => act ? (act.actionType==="msak" ? "(Melee)" : act.actionType==="rsak" ? "(Ranged)" : act.actionType==="save" ? "(Save)" : "") : "")(item.system.activities?.find(a => ["msak","rsak","save"].includes(a.actionType)))}</option>`).join('')}
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
            
    const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, selectedItemUuid, favoriteCheck, source, type } = result;

    if (!userDecision) {
        await effectOriginActor.unsetFlag("gambits-premades", "dragonTurtleShieldOA");
        //if(hasSentinel) await effectOriginActor.setFlag("gambits-premades", "sentinelDeclined", true);
        return;
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

            if(source && source === "user") braceRoll = await socket.executeAsUser("remoteCompleteItemUse", browserUser, { itemUuid: braceItemUuid, actorUuid: effectOriginActor.uuid, options: options });
            else if(source && source === "gm") braceRoll = await socket.executeAsUser("remoteCompleteItemUse", gmUser, { itemUuid: braceItemUuid, actorUuid: effectOriginActor.uuid, options: options });
            if (!braceRoll) return;
        }

        if (!selectedItemUuid) {
            console.log("No weapon selected");
            return;
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

        if(!itemRoll) return;

        await game.gps.addReaction({actorUuid: `${effectOriginActor.uuid}`});

        if(hasSentinel && checkHits) {
            //await effectOriginActor.setFlag("gambits-premades", "sentinelUsed", true);

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
        //else if(hasSentinel && !checkHits) await effectOriginActor.setFlag("gambits-premades", "sentinelDeclined", true);
    }
}

export async function enableOpportunityAttack(combat, combatEvent) {

    async function processCombatant(combatant) {
        const { actor } = combatant;
        const { token } = combatant;
        let browserUser = MidiQOL.playerForActor(actor);
    
        if (actor.type === 'npc' || actor.type === 'character') {
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
                (hasWarCaster && item.type === "spell" && item.system.activities?.some(a => a.activation?.type === "action" && (a.actionType === "msak" || a.actionType === "rsak" || a.actionType === "save")) && (item.system.preparation?.prepared === true || item.system.preparation?.mode !== "prepared" || !item.system.preparation) && item.system.activities?.some(a => ["creature", "enemy"].includes(a.target?.affects.type))) || overrideItems.includes(item.name)
            );

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
            let mwakRange = actor.flags["midi-qol"]?.range?.mwak;
            if (onlyThrownWeapons || (validSpells && !validWeapons)) {
                maxRange = 5;
            } else {
                maxRange = validWeapons.reduce((max, item) => {
                    let itemMaxRange = item.system.range?.reach;

                    if(!itemMaxRange || isNaN(itemMaxRange)) {
                        itemMaxRange = item.system.activities.reduce((actMax, activity) => {
                            let rangeVal = activity.range?.value;
                            return (typeof rangeVal === "number" && !isNaN(rangeVal)) ? Math.max(actMax, rangeVal) : actMax;
                        }, 0);
                    }
                    
                    if (!item.system.properties?.has('thr')) {
                        return Math.max(max, itemMaxRange);
                    }
                    return max;
                }, 0);
            }

            if(maxRange === 0 || oaDisabled) {
                const tokenSize = Math.max(token.width, token.height);
                maxRange = 4 * tokenSize;
            }
            else {
                if (token.width === 1 && maxRange === 10) maxRange;
                else if (token.width === 2 && maxRange === 5) maxRange;
                else if (token.width === 3 && maxRange === 5) maxRange;
                else if (token.width === 3 && maxRange === 10) maxRange;
                else if (token.width === 4 && maxRange === 10) maxRange;
                
                const tokenSizeOffset = Math.max(token.width, token.height) * 0.5 * canvas.scene.dimensions.distance;
                maxRange = (maxRange * conversionFactor) + tokenSizeOffset;
            
                if (mwakRange) maxRange += (mwakRange * conversionFactor);
            }
    
            //if(oaDisabled) maxRange = 1;
        
            const tokenCenterX = token.x + token.object.w / 2;
            const tokenCenterY = token.y + token.object.h / 2;
            const gridSize = canvas.scene.grid.size;
            const gridDistance = canvas.scene.grid.distance;
            const sideLength = canvas.scene.grid.type === 0 ? (maxRange / gridDistance) * 2 * gridSize : ((maxRange / gridDistance) * 2 * gridSize);
            const topLeftX = tokenCenterX - (sideLength / 2);
            const topLeftY = tokenCenterY - (sideLength / 2);
            let regionShape;

            if (canvas.scene.grid.type !== 1) {  // Gridless or Hex
                regionShape = {
                    type: "ellipse",
                    x: tokenCenterX,
                    y: tokenCenterY,
                    radiusX: maxRange * canvas.scene.grid.size / canvas.scene.dimensions.distance,
                    radiusY: maxRange * canvas.scene.grid.size / canvas.scene.dimensions.distance,
                    rotation: 0,
                    hole: false
                };
            } else {
                regionShape = {
                    type: "rectangle",
                    x: topLeftX,
                    y: topLeftY,
                    width: sideLength,
                    height: sideLength,
                    rotation: 0,
                    hole: false
                };
            }
    
            const regionData = {
                name: `${actor.name} OA Region`,
                color: browserUser.color,
                elevation: { bottom: -maxRange, top: maxRange },
                shapes: [regionShape],
                behaviors: [
                    {
                        type: "executeScript",
                        name: "onExit",
                        disabled: false,
                        system: {
                            source: `let oaDisabled = await region.getFlag("gambits-premades", "regionDisabled"); if(oaDisabled) return; if(region.flags["gambits-premades"].actorUuid === event.data.token.actor.uuid) return; await game.gps.opportunityAttackScenarios({tokenUuid: event.data.token.uuid, regionUuid: region.uuid, regionScenario: "tokenExit", isTeleport: event.data.teleport});`,
                            events: ['tokenExit']
                        }
                    },
                    {
                        type: "executeScript",
                        name: "onEnter",
                        disabled: false,
                        system: {
                            source: `let oaDisabled = await region.getFlag("gambits-premades", "regionDisabled"); if(oaDisabled) return; if(region.flags["gambits-premades"].actorUuid === event.data.token.actor.uuid) return; await game.gps.opportunityAttackScenarios({tokenUuid: event.data.token.uuid, regionUuid: region.uuid, regionScenario: "tokenEnter", isTeleport: event.data.teleport});`,
                            events: ['tokenEnter']
                        }
                    },
                    {
                        type: "executeScript",
                        name: "onPostMove",
                        disabled: false,
                        system: {
                            source: `let oaDisabled = await region.getFlag("gambits-premades", "regionDisabled"); if(oaDisabled) return; if(region.flags["gambits-premades"].actorUuid === event.data.token.actor.uuid) return; await game.gps.opportunityAttackScenarios({tokenUuid: event.data.token.uuid, regionUuid: region.uuid, regionScenario: "tokenPostMove", originX: event.data.segments[0].to.x, originY: event.data.segments[0].to.y, isTeleport: event.data.teleport});`,
                            events: ['tokenMove']
                        }
                    },
                    {
                        type: "executeScript",
                        name: "onTurnEnd",
                        disabled: false,
                        system: {
                            source: `
                                if(game.user.id !== game.gps.getPrimaryGM()) return;
                                if(event.data.token.uuid !== region.flags["gambits-premades"].tokenUuid) return;
                                let token = await fromUuid(region.flags["gambits-premades"].tokenUuid);
                                let actor = await fromUuid(region.flags["gambits-premades"].actorUuid);

                                let recalculate = false;
                                let tokenSize = Math.max(token.width, token.height);

                                let validWeapons = actor.items.filter(item => {
                                    const acts = item.system?.activities ?? [];
                                
                                    const qualifiesWeaponOrFeat = (acts.some(a => a.actionType === "mwak") && item.system?.equipped === true) || (item.system?.type?.value === "monster" && item.type === "feat" && acts.some(a => a.actionType === "mwak" || a.actionType === "msak"));
                                
                                    return qualifiesWeaponOrFeat;
                                });

                                recalculate = await checkAndSetFlag("opportunityAttackRegionValidWeapons", validWeapons) || recalculate;
                                recalculate = await checkAndSetFlag("opportunityAttackRegionTokenSize", tokenSize) || recalculate;
                                recalculate = await handleMWAKRange() || recalculate;

                                if (!recalculate) return;

                                const validSpells = region.flags["gambits-premades"].opportunityAttackRegionValidSpells;
                                let maxRange = calculateMaxRange(validWeapons, validSpells, tokenSize);
                                if(maxRange === false) return;

                                await region.setFlag("gambits-premades", "opportunityAttackRegionValidOptions", validWeapons?.length > 0 || validSpells?.length > 0);

                                const tokenCenterX = token.x + token.object.w / 2;
                                const tokenCenterY = token.y + token.object.h / 2;
                                const gridSize = canvas.scene.grid.size;
                                const gridDistance = canvas.scene.grid.distance;
                                const sideLength = canvas.scene.grid.type === 0 ? (maxRange / gridDistance) * 2 * gridSize : ((maxRange / gridDistance) * 2 * gridSize);
                                const topLeftX = tokenCenterX - (sideLength / 2);
                                const topLeftY = tokenCenterY - (sideLength / 2);
                                let regionShape;

                                if (canvas.scene.grid.type === 0) {  // Gridless
                                    regionShape = {
                                        type: "ellipse",
                                        x: tokenCenterX,
                                        y: tokenCenterY,
                                        radiusX: maxRange * canvas.scene.grid.size / canvas.scene.dimensions.distance,
                                        radiusY: maxRange * canvas.scene.grid.size / canvas.scene.dimensions.distance,
                                        rotation: 0,
                                        hole: false
                                    };
                                } else {
                                    regionShape = {
                                        type: "rectangle",
                                        x: topLeftX,
                                        y: topLeftY,
                                        width: sideLength,
                                        height: sideLength,
                                        rotation: 0,
                                        hole: false
                                    };
                                }

                                region.update({
                                    elevation: { bottom: -maxRange, top: maxRange },
                                    shapes: region.shapes.map(shape => ({
                                        ...shape,
                                        ...regionShape,
                                    }))
                                });
                                
                                async function checkAndSetFlag(property, newValue) {
                                    const oldValue = JSON.stringify(region.flags["gambits-premades"][property]);
                                    if (oldValue !== JSON.stringify(newValue)) {
                                        await region.setFlag("gambits-premades", property, newValue);
                                        return true;
                                    }
                                    return false;
                                }

                                async function handleMWAKRange() {
                                    if (!actor.flags["midi-qol"]?.range?.mwak) return false;

                                    let mwakExpire = actor.appliedEffects
                                        .filter(effect => effect.duration.turns == 1)
                                        .reduce((acc, effect) => {
                                            const change = effect.changes.find(change => change.key == "flags.midi-qol.range.mwak");
                                            return change ? acc + Number(change.value) : acc;
                                        }, 0);

                                    let mwakRange = actor.flags["midi-qol"].range.mwak - mwakExpire;
                                    return await checkAndSetFlag("opportunityAttackRegionMwakRange", mwakRange);
                                }

                                function calculateMaxRange(validWeapons, validSpells, tokenSize) {
                                    const units = canvas.scene.grid.units;
                                    let conversionFactor;
                                    if (units === "meters" || units === "m" || units === "mt") {
                                        conversionFactor = 0.3;
                                    }
                                    else conversionFactor = 1;

                                    const tokenSizeOffset = tokenSize * 0.5 * canvas.scene.dimensions.distance;

                                    if (!validWeapons?.length && !validSpells?.length) {
                                        region.update({
                                            elevation: { bottom: -1, top: 1 },
                                            shapes: region.shapes.map(shape => ({
                                                ...shape,
                                                radiusX: 100 * tokenSize,
                                                radiusY: 100 * tokenSize
                                            }))
                                        });
                                        return false;
                                    }

                                    let onlyThrownWeapons = validWeapons?.length > 0 && validWeapons?.every(item => {
                                        return item.system.properties.has('thr');
                                    });

                                    let maxRange;

                                    if (onlyThrownWeapons || (validSpells?.length && !validWeapons?.length)) {
                                        maxRange = 5;
                                    } else {
                                        maxRange = validWeapons.reduce((max, item) => {
                                            let itemMaxRange = item.system.range?.reach;

                                            if(!itemMaxRange || isNaN(itemMaxRange)) {
                                                itemMaxRange = item.system.activities.reduce((actMax, activity) => {
                                                    let rangeVal = activity.range?.value;
                                                    return (typeof rangeVal === "number" && !isNaN(rangeVal)) ? Math.max(actMax, rangeVal) : actMax;
                                                }, 0);
                                            }
                                            
                                            if (!item.system.properties?.has('thr')) {
                                                return Math.max(max, itemMaxRange);
                                            }
                                            return max;
                                        }, 0);
                                    }

                                    if (token.width === 1 && maxRange === 10) maxRange;
                                    else if (token.width === 2 && maxRange === 5) maxRange;
                                    else if (token.width === 3 && maxRange === 5) maxRange;
                                    else if (token.width === 3 && maxRange === 10) maxRange;
                                    else if (token.width === 4 && maxRange === 10) maxRange;

                                    maxRange = (maxRange * conversionFactor) + tokenSizeOffset;

                                    if (actor.flags["midi-qol"]?.range?.mwak) {
                                        maxRange += (region.flags["gambits-premades"].opportunityAttackRegionMwakRange * conversionFactor);
                                    }
                                    return maxRange;
                                }`,
                            events: ['tokenTurnEnd']
                        }
                    }
                ],
                flags: {
                    "gambits-premades": {
                        'actorUuid': actor.uuid,
                        'tokenUuid': token.uuid,
                        'opportunityAttackSet': true,
                        'opportunityAttackRegionValidWeapons': validWeapons,
                        'opportunityAttackRegionValidSpells': validSpells,
                        'opportunityAttackRegionMwakRange': mwakRange,
                        'opportunityAttackRegionTokenSize': Math.max(token.width, token.height),
                        'opportunityAttackRegionConFac': conversionFactor
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
    regionTokenStates.clear();

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

        //let sentinelUsed = actor.getFlag("gambits-premades", "sentinelUsed");
        //let sentinelDeclined = actor.getFlag("gambits-premades", "sentinelDeclined");

        /*let effectNames = ["Opportunity Attack Reaction", "Maneuvers: Brace Opportunity Attack"];
        let effectIdsToDelete = actor.effects
            .filter(effect => effectNames.includes(effect.name))
            .map(effect => effect.id);

        if (effectIdsToDelete.length > 0) {
            await actor.deleteEmbeddedDocuments("ActiveEffect", effectIdsToDelete);
        }*/

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
        //if(sentinelUsed) await actor.unsetFlag("gambits-premades", "sentinelUsed");
        //if(sentinelDeclined) await actor.unsetFlag("gambits-premades", "sentinelDeclined");
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
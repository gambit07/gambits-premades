export async function enableOpportunityAttack(combat, combatEvent) {
    async function processCombatant(combatant) {

        const { actor } = combatant;
        const { token } = combatant;
        let browserUser = MidiQOL.playerForActor(actor);

        //Keep some cleanup in place for a bit while I get people switched to the non-item version
        const existingOA = actor.items.find(item => item.name === 'Opportunity Attack');
        if(existingOA) await existingOA.delete();

        if (actor.type === 'npc' || actor.type === 'character') {

            let gameVersion = parseInt(game.system.version.split('.')[0], 10);
            
            let hasWarCaster = actor.items.find(i => i.name.toLowerCase() === "war caster");
            let overrideItems = ["Booming Blade"];
            let validWeapons = actor.items.filter(item => 
                ((item.system?.actionType === "mwak" && item.system?.equipped === true) || (item.system?.type?.value === "monster" && item?.type === "feat" && (item.system?.actionType === "mwak" || item.system?.actionType === "msak")) || (item?.type === "weapon" && item.system?.actionType === "msak")));
        
            let validSpells = actor.items.filter(item => 
                (hasWarCaster && (item.type === "spell" && item.system?.activation?.type === "action" && (item.system?.actionType === "msak" || item.system?.actionType === "rsak" || item.system?.actionType === "save") && (item.system?.preparation?.prepared === true || item.system?.preparation?.mode !== 'prepared' || !item.system?.preparation) && (item.system?.target?.type === "creature" || item.system?.target?.type === "enemy")) || overrideItems.includes(item.name)));
            
            let oaDisabled;
            if (!validWeapons.length && !validSpells.length) {
                ui.notifications.warn(`No Valid Melee options found, cancelling Opportunity Attack options for ${actor.name}`);
                oaDisabled = true;
            }
        
            // Check 5e system version, item.system.properties is a Set in v3 but an array in v2
            let onlyThrownWeapons;
            if(gameVersion >= 3) {
                onlyThrownWeapons = validWeapons.length > 0 && validWeapons.every(item => item.system.properties.has('thr'));
            }
            else {
                onlyThrownWeapons = validWeapons.length > 0 && validWeapons.every(item => 'thr' in item.system.properties && item.system.properties.thr);
            }
            
            const units = canvas.scene.grid.units;
            let conversionFactor;
            if (units === "feet" || units === "f" || units === "ft") {
                conversionFactor = 1;
            } else if (units === "meters" || units === "m" || units === "mt") {
                conversionFactor = 0.3;
            }
        
            let maxRange;
            
            if (onlyThrownWeapons || (validSpells && !validWeapons)) {
                // Set maxRange to 5 if only thrown weapons are available or the user only has War Caster with no valid melee weapons
                maxRange = 5;
            } else {
                maxRange = validWeapons.reduce((max, item) => {
                let rangeValue = item.system.range?.value;
                let noThr = gameVersion >= 3 ? !item.system.properties?.has('thr') : !item.system.properties?.thr;
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
            
            //Hacky workaround to get correct distance
            const tokenSizeOffset = Math.max(token.width, token.height) * 0.5 * canvas.scene.dimensions.distance;
            maxRange = (maxRange * conversionFactor) + tokenSizeOffset;
        
            let mwakRange = actor.flags["midi-qol"]?.range?.mwak;
            if (mwakRange) maxRange += (mwakRange * conversionFactor);

            if(oaDisabled) maxRange = 1;
        
            const tokenCenterX = token.x + token.object.w / 2;
            const tokenCenterY = token.y + token.object.h / 2;
            let templateData = {
            't': "circle",
            'user': browserUser.id,
            'x': tokenCenterX,
            'y': tokenCenterY,
            'texture': "modules/gambits-premades/assets/images/transparentImage.webp",
            'distance': maxRange,
            'direction': 0,
            'fillColor': browserUser.color,
            'flags': {
                'dnd5e': {
                    'origin': actor.uuid
                },
                'midi-qol': {
                    'originUuid': actor.uuid,
                    'actorUuid': actor.uuid,
                    'tokenUuid': token.uuid,
                    'opportunityAttackSet': true,
                    'opportunityAttackTemplateValidWeapons': validWeapons,
                    'opportunityAttackTemplateValidSpells': validSpells,
                    'opportunityAttackTemplateMwakRange': mwakRange,
                    'opportunityAttackTemplateTokenSize': Math.max(token.width, token.height),
                    'opportunityAttackTemplateConFac': conversionFactor
                },
                "gambits-premades": {
                    "templateHiddenOA": true
                },
                "templatemacro": {
                    "never": {
                      "asGM": false,
                      "command": "let { dialogTitle,effectOriginTokenUuid,effectOriginActorUuid,tokenUuid,braceItemUuid } = this;\n\nlet result;\nlet effectOriginActor = await fromUuid(effectOriginActorUuid);\nlet browserUser = MidiQOL.playerForActor(effectOriginActor);\nif (!browserUser.active) {\n    browserUser = game.users?.activeGM;\n}\nlet dialogId = \"opportunityattack\";\n\nif (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {\n    let userDialogPromise = game.gps.socket.executeAsUser(\"showOpportunityAttackDialog\", browserUser.id, {dialogTitle,effectOriginTokenUuid,effectOriginActorUuid,tokenUuid,braceItemUuid, dialogId: dialogId, source: \"user\", type: \"multiDialog\"});\n    \n    let gmDialogPromise = game.gps.socket.executeAsGM(\"showOpportunityAttackDialog\", {dialogTitle,effectOriginTokenUuid,effectOriginActorUuid,tokenUuid,braceItemUuid, dialogId: dialogId, source: \"gm\", type: \"multiDialog\"});\n\n    result = await game.gps.socket.executeAsGM(\"handleDialogPromises\", userDialogPromise, gmDialogPromise);\n} else {\n    result = await game.gps.socket.executeAsUser(\"showOpportunityAttackDialog\", browserUser.id, {dialogTitle,effectOriginTokenUuid,effectOriginActorUuid,tokenUuid,braceItemUuid, source: browserUser.isGM ? \"gm\" : \"user\", type: \"singleDialog\"});\n}\n        \nconst { userDecision, source, type } = result;\n\nif(source && source === \"user\" && type === \"multiDialog\") await game.gps.socket.executeAsGM(\"closeDialogById\", { dialogId: dialogId });\nif(source && source === \"gm\" && type === \"multiDialog\") await game.gps.socket.executeAsUser(\"closeDialogById\", browserUser.id, { dialogId: dialogId });\nreturn;"
                    },
                    "whenThrough": {
                      "asGM": false,
                      "command": "let oaDisabled = await template.getFlag(\"midi-qol\", \"opportunityAttackDisabled\");\nif(oaDisabled) return;\nif (this.hook.animate === false || (token.actor.type !== 'npc' && token.actor.type !== 'character')) return;\nlet gameVersion = parseInt(game.system.version.split('.')[0], 10);\n\nlet currentCombatant = canvas.tokens.get(game.combat.current.tokenId);\nif (currentCombatant.id !== token.id && currentCombatant.document.disposition === token.document.disposition) return; // Avoid initiating opportunity attack when it's not a token's turn if they are doing something like riding another allied token. This should allow for dialog to fire if forced movement via an enemy spell moves the token outside range outside of their turn but not when being moved as part of an allied unit\nconst effectNamesToken = [\"Dissonant Whispers\"];\nlet hasEffectToken = (gameVersion >= 3 ? token.actor.appliedEffects : token.actor.effects)\n    .some(effect => effectNamesToken.includes(effect.name));\nif (currentCombatant.id !== token.id && !hasEffectToken) return;\n\nconst effectOriginActor = await fromUuid(template.flags[\"midi-qol\"].actorUuid);\nconst effectOriginToken = await MidiQOL.tokenForActor(effectOriginActor.uuid);\n\n//Simple elevation check in lieu of a more robust option for actually triggering OA on elevation change\nif((token.document.elevation > (effectOriginToken.document.elevation + template.distance)) || (token.document.elevation < (effectOriginToken.document.elevation - template.distance))) return;\n\nawait template.callMacro(\"never\", { dialogTitle: `${effectOriginActor.name} | Opportunity Attack`, effectOriginTokenUuid: effectOriginToken.document.uuid, effectOriginActorUuid: effectOriginActor.uuid, tokenUuid: token.document.uuid });"
                    },
                    "whenLeft": {
                      "asGM": false,
                      "command": "let oaDisabled = await template.getFlag(\"midi-qol\", \"opportunityAttackDisabled\");\nif(oaDisabled) return;\nif (this.hook.animate === false || (token.actor.type !== 'npc' && token.actor.type !== 'character')) return;\nlet gameVersion = parseInt(game.system.version.split('.')[0], 10);\n\nlet currentCombatant = canvas.tokens.get(game.combat.current.tokenId);\nif (currentCombatant.id !== token.id && currentCombatant.document.disposition === token.document.disposition) return; // Avoid initiating opportunity attack when it's not a token's turn if they are doing something like riding another allied token. This should allow for dialog to fire if forced movement via an enemy spell moves the token outside range outside of their turn but not when being moved as part of an allied unit\nconst effectNamesToken = [\"Dissonant Whispers\"];\nlet hasEffectToken = (gameVersion >= 3 ? token.actor.appliedEffects : token.actor.effects)\n    .some(effect => effectNamesToken.includes(effect.name));\nif (currentCombatant.id !== token.id && !hasEffectToken) return;\n\nconst effectOriginActor = await fromUuid(template.flags[\"midi-qol\"].actorUuid);\nconst effectOriginToken = await MidiQOL.tokenForActor(effectOriginActor.uuid);\n\n//Simple elevation check in lieu of a more robust option for actually triggering OA on elevation change\nif((token.document.elevation > (effectOriginToken.document.elevation + template.distance)) || (token.document.elevation < (effectOriginToken.document.elevation - template.distance))) return;\n\nlet dragonTurtleShield = effectOriginActor.items.getName(\"Dragon Turtle Dueling Shield\");\nif(dragonTurtleShield) await effectOriginActor.setFlag(\"midi-qol\", \"dragonTurtleShieldOA\", true)\n\nawait template.callMacro(\"never\", { dialogTitle: `${effectOriginActor.name} | Opportunity Attack`, effectOriginTokenUuid: effectOriginToken.document.uuid, effectOriginActorUuid: effectOriginActor.uuid, tokenUuid: token.document.uuid });"
                    },
                    "whenEntered": {
                      "asGM": false,
                      "command": "let oaDisabled = await template.getFlag(\"midi-qol\", \"opportunityAttackDisabled\");\nif(oaDisabled) return;\nif (this.hook.animate === false || (token.actor.type !== 'npc' && token.actor.type !== 'character')) return;\nlet gameVersion = parseInt(game.system.version.split('.')[0], 10);\n\nlet currentCombatant = canvas.tokens.get(game.combat.current.tokenId);\nif (currentCombatant.id !== token.id && currentCombatant.document.disposition === token.document.disposition) return; //Avoid initiating opportunity attack when it's not a tokens turn if they are doing something like riding another allied token. This should allow for dialog to fire if forced movement via an enemy spell moves the token outside range outside of their turn but not when being moved as part of an allied unit\n\nconst effectOriginActor = await fromUuid(template.flags[\"midi-qol\"].actorUuid);\nconst effectOriginToken = await MidiQOL.tokenForActor(effectOriginActor.uuid);\n\n//Simple elevation check in lieu of a more robust option for actually triggering OA on elevation change\nif((token.document.elevation > (effectOriginToken.document.elevation + template.distance)) || (token.document.elevation < (effectOriginToken.document.elevation - template.distance))) return;\n\nlet hasPolearmReaction = effectOriginActor.items.find(i => i.name.toLowerCase() === \"polearm master\");\nif (hasPolearmReaction) {\nlet weaponNames = [\"glaive\",\"halberd\",\"pike\",\"quarterstaff\",\"spear\"];\nlet hasPolearmWeapon;\nif(gameVersion >= 3) {\n    hasPolearmWeapon = effectOriginActor.items.some(item => item.system?.type?.baseItem && weaponNames.includes(item.system?.type?.baseItem.toLowerCase()) && item.system.equipped === true);\n}\nelse {\n    hasPolearmWeapon = effectOriginActor.items.some(item => item.system?.baseItem && weaponNames.includes(item.system?.baseItem.toLowerCase()) && item.system.equipped === true);\n}\nif(!hasPolearmWeapon) return;\n\nawait template.callMacro(\"never\", { dialogTitle: `${effectOriginActor.name} | Polearm Opportunity Attack`, effectOriginToken, effectOriginActor, token });\n}\n\nif(effectOriginActor.classes?.fighter && effectOriginActor.classes?.fighter?.subclass?.name === \"Battle Master\") {\nlet hasBraceReactionCpr = false;\nif(game.modules.get(\"chris-premades\")?.active) {\n    hasBraceReactionCpr = chrisPremades.helpers.getItem(effectOriginActor, 'Maneuvers: Brace');\n}\nlet hasBraceReaction = effectOriginActor.items.getName(\"Maneuvers: Brace\");\nlet braceItem;\n\nif(hasBraceReactionCpr) {\n    braceItem = hasBraceReactionCpr;\n}\nelse if(hasBraceReaction) {\n    braceItem = hasBraceReaction;\n}\nelse return;\n\nconst superiorityNames = [\"superiority dice\", \"superiority die\"];\n\nlet resourceExistsWithValue = [effectOriginActor.system.resources.primary, effectOriginActor.system.resources.secondary, effectOriginActor.system.resources.tertiary].some(resource =>\n    superiorityNames.includes(resource?.label.toLowerCase()) && resource.value !== 0);\nlet itemExistsWithValue;\n\nif (!resourceExistsWithValue) {\n    itemExistsWithValue = !!effectOriginActor.items.find(i => superiorityNames.includes(i.name.toLowerCase()) && i.system.uses.value !== 0);\n}\n\nif (!resourceExistsWithValue && !itemExistsWithValue) return;\n\nawait template.callMacro(\"never\", { dialogTitle: `${effectOriginActor.name} | Maneuvers: Brace Opportunity Attack`, effectOriginTokenUuid: effectOriginToken.document.uuid, effectOriginActorUuid: effectOriginActor.uuid, tokenUuid: token.document.uuid, braceItemUuid: braceItem.uuid });\n}\n\nlet hasDeadlyReachReaction = effectOriginActor.items.find(i => i.name.toLowerCase() === \"deadly reach\");\nif (hasDeadlyReachReaction) {\n    await template.callMacro(\"never\", { dialogTitle: `${effectOriginActor.name} | Deadly Reach Opportunity Attack`, effectOriginTokenUuid: effectOriginToken.document.uuid, effectOriginActorUuid: effectOriginActor.uuid, tokenUuid: token.document.uuid });\n}"
                    },
                    "whenDeleted": {
                      "asGM": false,
                      "command": "const effectOriginActor = await fromUuid(template.flags[\"midi-qol\"].actorUuid);\nlet effectOriginToken = await MidiQOL.tokenForActor(effectOriginActor.uuid);\nawait effectOriginActor.unsetFlag('midi-qol', 'opportunityAttackTemplate');\nawait effectOriginActor.unsetFlag(\"midi-qol\", \"dragonTurtleShieldOA\");"
                    },
                    "whenTurnEnd": {
                      "asGM": true,
                      "command": "let gameVersion = parseInt(game.system.version.split('.')[0], 10);\nlet oaEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'Enable Opportunity Attack');\nif(!oaEnabled) return;\nlet legacy = MidiQOL.safeGetGameSetting('gambits-premades', 'Enable Opportunity Attack Legacy System');\n\nconst effectOriginActor = await fromUuid(template.flags[\"midi-qol\"].actorUuid);\nconst effectOriginToken = await MidiQOL.tokenForActor(effectOriginActor.uuid);\n\nlet recalculate = false;\nlet tokenSize = Math.max(effectOriginToken.document.width, effectOriginToken.document.height);\nlet validWeapons = effectOriginActor.items.filter(item => (item.system.actionType === \"mwak\" && item.system.equipped) || (item.system?.type?.value === \"monster\" && item?.type === \"feat\" && (item.system?.actionType === \"mwak\" || item.system?.actionType === \"msak\")) || (item?.type === \"weapon\" && item.system?.actionType === \"msak\"));\n\nrecalculate = await checkAndSetFlag(\"opportunityAttackTemplateValidWeapons\", validWeapons) || recalculate;\nrecalculate = await checkAndSetFlag(\"opportunityAttackTemplateTokenSize\", tokenSize) || recalculate;\nrecalculate = await handleMWAKRange() || recalculate;\n\nif (!recalculate) return;\n\nconst validSpells = template.flags[\"midi-qol\"].opportunityAttackTemplateValidSpells;\nlet maxRange = calculateMaxRange(validWeapons, validSpells, gameVersion, tokenSize);\n\nawait effectOriginActor.setFlag(\"midi-qol\", \"opportunityAttackTemplateValidOptions\", validWeapons.length > 0 || validSpells.length > 0);\n\n// Update the template with the new range\nawait template.update({\"distance\": maxRange});\nawait template.setFlag(\"midi-qol\", \"opportunityAttackDisabled\", false);\nawait tokenAttacher.attachElementsToToken([template], effectOriginToken, false);\n \nasync function checkAndSetFlag(property, newValue) {\n    const oldValue = JSON.stringify(template.flags[\"midi-qol\"][property]);\n    if (oldValue !== JSON.stringify(newValue)) {\n        await template.setFlag(\"midi-qol\", property, newValue);\n        return true;\n    }\n    return false;\n}\n\nasync function handleMWAKRange() {\n    if (!effectOriginActor.flags[\"midi-qol\"]?.range?.mwak) return false;\n\n    let mwakExpire = effectOriginActor.appliedEffects\n        .filter(effect => effect.duration.turns == 1)\n        .reduce((acc, effect) => {\n            const change = effect.changes.find(change => change.key == \"flags.midi-qol.range.mwak\");\n            return change ? acc + Number(change.value) : acc;\n        }, 0);\n\n    let mwakRange = effectOriginActor.flags[\"midi-qol\"].range.mwak - mwakExpire;\n    return await checkAndSetFlag(\"opportunityAttackTemplateMwakRange\", mwakRange);\n}\n\nfunction calculateMaxRange(validWeapons, validSpells, gameVersion, tokenSize) {\n    const units = canvas.scene.grid.units;\n    let conversionFactor;\n    if (units === \"feet\" || units === \"f\" || units === \"ft\") {\n        conversionFactor = 1;\n    } else if (units === \"meters\" || units === \"m\" || units === \"mt\") {\n        conversionFactor = 0.3;\n    }\n\n    const tokenSizeOffset = tokenSize * 0.5 * canvas.scene.dimensions.distance;\n\n    if (!validWeapons.length && !validSpells.length) return;\n\n    let onlyThrownWeapons = validWeapons.length > 0 && validWeapons.every(item => {\n        return gameVersion >= 3 ? item.system.properties.has('thr') : item.system.properties.thr;\n    });\n\n    let maxRange;\n\n    if (onlyThrownWeapons || (validSpells.length && !validWeapons.length)) {\n        maxRange = 5;\n    } else {\n        maxRange = validWeapons.reduce((max, item) => {\n            let rangeValue = item.system.range?.value;\n            let noThr = gameVersion >= 3 ? !item.system.properties?.has('thr') : !item.system.properties?.thr;\n            if (rangeValue && !isNaN(rangeValue) && noThr) {\n                return Math.max(max, rangeValue);\n            }\n            return max;\n        }, 0);\n    }\n\n    if (effectOriginToken.document.width === 1 && maxRange === 10) maxRange += 1.7;\n    if (effectOriginToken.document.width === 2 && maxRange === 5) maxRange += 0.7;\n    if (effectOriginToken.document.width === 3 && maxRange === 5) maxRange += 1.7;\n    if (effectOriginToken.document.width === 3 && maxRange === 10) maxRange += 0.7;\n    if (effectOriginToken.document.width === 4 && maxRange === 10) maxRange += 1.6;\n\n    maxRange = (maxRange * conversionFactor) + tokenSizeOffset;\n\n    if (effectOriginActor.flags[\"midi-qol\"]?.range?.mwak) {\n        maxRange += (template.flags[\"midi-qol\"].opportunityAttackTemplateMwakRange * conversionFactor);\n    }\n    return maxRange;\n}"
                    }
                }
            },
            'angle': 0
            };

            await canvas.scene.createEmbeddedDocuments('MeasuredTemplate', [templateData])
            .then(createdTemplates => {
                const firstTemplate = createdTemplates[0];
          
                try {
                    actor.setFlag("gambits-premades", "templateAttachedToken", firstTemplate.uuid);
                    actor.setFlag("gambits-premades", "tokenAttachedTemplate", token.id);
                    actor.setFlag("midi-qol", "opportunityAttackTemplate", firstTemplate.uuid);
                    //Handle rippers tooltip overlay
                    if(firstTemplate.object && firstTemplate.object.tooltip) firstTemplate.object.tooltip.visible = false;
                    if(oaDisabled) firstTemplate.setFlag("midi-qol", "opportunityAttackDisabled", true);
                } catch (error) {
                    console.error('Error during token attachment:', error);
                }
            });
        }
    }

    if(combatEvent === "startCombat") {
        for (let combatant of combat.combatants.values()) {
            await processCombatant(combatant);
        }
        //await canvas.draw();
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

        let templateFlag = await actor.getFlag("midi-qol", "opportunityAttackTemplate");
        let checkBraceFlag = await actor.getFlag("midi-qol", "checkBraceDecision");
        let templateAttachmentFlag = await actor.getFlag("gambits-premades", "templateAttachedToken");
        let templateData = templateFlag ? await fromUuid(templateFlag) : null;

        let effectNames = ["Opportunity Attack Reaction", "Maneuvers: Brace Opportunity Attack"];
        let effectIdsToDelete = actor.effects
            .filter(effect => effectNames.includes(effect.name))
            .map(effect => effect.id);

        if (effectIdsToDelete.length > 0) {
            await actor.deleteEmbeddedDocuments("ActiveEffect", effectIdsToDelete);
        }

        if (templateData) await templateData.delete();
        if (templateFlag) await actor.unsetFlag("midi-qol", "opportunityAttackTemplate");
        if (checkBraceFlag) await actor.unsetFlag("midi-qol", "checkBraceDecision");
        if (templateAttachmentFlag) await actor.unsetFlag("gambits-premades", "templateAttachedToken");
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

export async function showOpportunityAttackDialog({dialogTitle,effectOriginTokenUuid,effectOriginActorUuid,tokenUuid,braceItemUuid,dialogId,source,type}) {
    const module = await import('../module.js');
    const socket = module.socket;

    return await new Promise(resolve => {
        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `Opportunity Attack Timeout`));
        
        let effectOriginToken = fromUuidSync(effectOriginTokenUuid);
        let effectOriginActor = fromUuidSync(effectOriginActorUuid);
        let browserUser = MidiQOL.playerForActor(effectOriginActor);
        let token = fromUuidSync(tokenUuid);

        let gameVersion = parseInt(game.system.version.split('.')[0], 10);
        let hasSentinel = effectOriginActor.items.some(i => i.name.toLowerCase() === "sentinel");

        // Check if origin token can see token moving
        if(!MidiQOL.canSee(effectOriginToken, token)) resolve({ userDecision: false, programmaticallyClosed: false, source, type});

        // Check if same disposition token
        if(token.disposition === effectOriginToken.disposition) resolve({ userDecision: false, programmaticallyClosed: false, source, type});

        // Check if origin tokens reaction is already used or a spell effect is preventing reactions
        const effectNamesOrigin = ["Reaction", "Confusion", "Arms of Hadar", "Shocking Grasp", "Slow", "Staggering Smite"];
        let hasEffectOrigin = (gameVersion >= 3 ? effectOriginActor.appliedEffects : effectOriginActor.effects)
            .some(effect => effectNamesOrigin.includes(effect.name));
        if(hasEffectOrigin) resolve({ userDecision: false, programmaticallyClosed: false, source, type});

        // Check if origin token is incapacitated
        let isIncapacitated = MidiQOL.checkIncapacitated(effectOriginToken);
        if(isIncapacitated) resolve({ userDecision: false, programmaticallyClosed: false, source, type});

        //Check if token is disengaged and origin token does not have Sentinel
        let isDisengaged = token.actor.effects.some(e => e.name.toLowerCase() === "disengage");
        if(isDisengaged && !hasSentinel) resolve({ userDecision: false, programmaticallyClosed: false, source, type});

        //Check if token activated mobile feat attack feature
        let isMobileFeat = token.actor.getFlag("midi-qol", "oaMobileFeatAttack");
        if (isMobileFeat && isMobileFeat.includes(effectOriginToken.id)) resolve({ userDecision: false, programmaticallyClosed: false, source, type});

        //Check if token activated fancy footwork attack feature
        let isFancyFootwork = token.actor.getFlag("midi-qol", "oaFancyFootworkAttack");
        if (isFancyFootwork && isFancyFootwork.includes(effectOriginToken.id)) resolve({ userDecision: false, programmaticallyClosed: false, source, type});

        //Check if origin token is Charmed by initiating token
        let isCharmed = (gameVersion >= 3 ? effectOriginActor.appliedEffects : effectOriginActor.effects)
            .find(e => e.name.toLowerCase() === "charmed");
        if(isCharmed) {
            let charmerItem = fromUuidSync(isCharmed.origin);
            let charmer;
            if(charmerItem) charmer = charmerItem.parent.id;
            if(charmer === token.actor.id) resolve({ userDecision: false, programmaticallyClosed: false, source, type});
        }

        // Check if the token has cast Kinetic Jaunt, Zephyr Strike, or the generic immunity effect has been applied
        const effectNamesToken = ["Kinetic Jaunt", "Zephyr Strike", "Opportunity Attack Immunity"];
        let hasEffectToken = (gameVersion >= 3 ? token.actor.appliedEffects : token.actor.effects)
            .some(effect => effectNamesToken.includes(effect.name));
        if(hasEffectToken) resolve({ userDecision: false, programmaticallyClosed: false, source, type});

        let hasFlyby = token.actor.items.find(i => i.name.toLowerCase().includes("flyby"));
        if(hasFlyby) resolve({ userDecision: false, programmaticallyClosed: false, source, type});

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
        if (!validWeapons.length) resolve({ userDecision: false, programmaticallyClosed: false, source, type});

        // Find 'Unarmed Strike' and remove it to re-add at the end
        const unarmedIndex = validWeapons.findIndex(item => item.name.toLowerCase() === "unarmed strike");
        let unarmedStrike;
        if (unarmedIndex > -1) {
            unarmedStrike = validWeapons.splice(unarmedIndex, 1)[0];
        }
        
        // Sort the weapons alphabetically
        validWeapons.sort((a, b) => a.name.localeCompare(b.name));
        
        let favoriteWeaponName;
        let favoriteWeaponUuid = null;
        // Check for favorite weapon and put it on top
        const favoriteWeaponIndex = validWeapons.findIndex(item => item.flags?.['midi-qol']?.oaFavoriteAttack);
        if (favoriteWeaponIndex > -1) {
            const favoriteWeapon = validWeapons.splice(favoriteWeaponIndex, 1)[0];
            favoriteWeaponUuid = favoriteWeapon.uuid;
            favoriteWeaponName = favoriteWeapon.name;
            validWeapons.unshift(favoriteWeapon);
        }
        
        if (unarmedStrike) {
            validWeapons.push(unarmedStrike);
        }

        let optionData = validWeapons.map(item => `<option value="${item.uuid}">${item.name} ${item.system.actionType === "msak" ? "(Melee)" : item.system.actionType === "rsak" ? "(Ranged)" : item.system.actionType === "save" ? "(Save)" : ""}</option>`).join("");
        let dialogContent = `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 5px; background-color: transparent; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="flex-grow: 1; margin-right: 20px;">
                <p>Would you like to use your reaction to attack?${braceItemUuid ? " This will initiate a use of your Superiority Die for the Brace maneuver." : ""}</p>
                <div>
                    <label for="item-select" style="display: block; margin-bottom: 8px;">Choose your Attack:</label>
                    <select id="item-select" style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 16px; box-sizing: border-box; background-color: transparent; font-size: 16px; height: auto;">
                        ${optionData}
                    </select>
                </div>
                <div style="display: flex; align-items: center;">
                    <input type="checkbox" id="favorite-checkbox" style="margin-right: 5px; vertical-align: middle;"/>
                    <label for="favorite-checkbox">Favorite this Attack?${favoriteWeaponName ? "<br>(Current: <b>" + favoriteWeaponName + "</b>)" : ""}</label>
                </div>
            </div>
            <div style="display: flex; flex-direction: column; justify-content: center; padding-left: 20px; border-left: 1px solid #ccc; text-align: center;">
                <p><b>Time Remaining</b></p>
                <p><span id="countdown" style="font-size: 16px; color: red;">${initialTimeLeft}</span> seconds</p>
                <button id='pauseButton' style='margin-top: 5px; width: 100px;'>Pause</button>
            </div>
        </div>

        `;

        let timer;

        let dialog = new Dialog({
            title: dialogTitle,
            content: dialogContent,
            id: dialogId,
            buttons: {
                yes: {
                    label: "Yes",
                    callback: async (html) => {
                        dialog.dialogState.interacted = true;
                        dialog.dialogState.decision = "yes";
                        if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: dialogId });
                        if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: dialogId });
                        const uuid = effectOriginActor.uuid;

                        if(braceItemUuid) {
                            let braceItem = await fromUuid(braceItemUuid);

                            const braceRoll = await braceItem.use();
                            if(braceRoll.aborted === true) resolve({ userDecision: false, programmaticallyClosed: false, source, type });
                        }

                        let selectedItemUuid = html.find("#item-select").val();
                        if (!selectedItemUuid) {
                            console.log("No weapon selected");
                            resolve({ userDecision: false, programmaticallyClosed: false, source, type});
                        }

                        let chosenWeapon = await fromUuid(selectedItemUuid);
                        let rsakCheck = chosenWeapon.system.actionType === "rsak";
                        let favoriteWeaponCheck = favoriteWeaponUuid;
                        let favoriteWeapon;
                        if(favoriteWeaponCheck !== "null") favoriteWeapon = await fromUuid(favoriteWeaponCheck);
                        let favoriteSet = html.find("#favorite-checkbox").is(':checked');
                        if(favoriteSet && favoriteWeaponCheck) {
                           await chosenWeapon.setFlag("midi-qol", "oaFavoriteAttack", true);
                           if (favoriteWeapon.uuid !== chosenWeapon.uuid) {
                           await favoriteWeapon.unsetFlag("midi-qol", "oaFavoriteAttack");
                           }
                        }
                        else if(favoriteSet) {
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
                        
                        const itemRoll = await MidiQOL.completeItemUse(chosenWeapon, {}, options);
                        if(itemRoll.aborted === true) resolve({ userDecision: false, programmaticallyClosed: false, source, type });
                        if(itemRoll) {
                            const hasEffectApplied = await game.dfreds.effectInterface.hasEffectApplied('Reaction', uuid);

                            if (!hasEffectApplied) {
                                await game.dfreds.effectInterface.addEffect({ effectName: 'Reaction', uuid });
                            }
                        }

                        await effectOriginActor.unsetFlag("midi-qol", "dragonTurtleShieldOA");

                        resolve({userDecision: true, programmaticallyClosed: false, source, type});
                    }
                },
                no: {
                    label: "No",
                    callback: async () => {
                        // Reaction Declined
                        dialog.dialogState.interacted = true;
                        dialog.dialogState.decision = "no";
                        await effectOriginActor.unsetFlag("midi-qol", "dragonTurtleShieldOA");
                        resolve({ userDecision: false, programmaticallyClosed: false, source, type});
                    }
                },
            }, default: "no",
            render: (html) => {
                $(html).attr('id', dialog.options.id);
                let timeLeft = initialTimeLeft;
                let isPaused = false;
                const countdownElement = html.find("#countdown");
                const pauseButton = html.find("#pauseButton");

                dialog.updateTimer = (newTimeLeft, paused) => {
                    timeLeft = newTimeLeft;
                    isPaused = paused;
                    countdownElement.text(`${timeLeft}`);
                    pauseButton.text(isPaused ? 'Paused' : 'Pause');
                };

                timer = setInterval(() => {
                    if (!isPaused) {
                        timeLeft--;
                        countdownElement.text(`${timeLeft}`);
                        if (timeLeft <= 0) {
                            dialog.data.buttons.no.callback();
                            dialog.close();
                        }
                    }
                }, 1000);

                pauseButton.click(() => {
                    isPaused = !isPaused;
                    pauseButton.text(isPaused ? 'Paused' : 'Pause');
                    if (source && source === "user" && type === "multiDialog") {
                        socket.executeAsGM("pauseDialogById", { dialogId, timeLeft, isPaused });
                    } else if (source && source === "gm" && type === "multiDialog") {
                        socket.executeAsUser("pauseDialogById", browserUser.id, { dialogId, timeLeft, isPaused });
                    }
                });

                html.on('focusin', () => {
                    effectOriginToken.object.control({ releaseOthers: true });
                }).on('focusout', () => {
                    effectOriginToken.object.release();
                });

                const dialogElement = html.closest('.window-app');
                dialogElement.on('mousedown', () => {
                    setTimeout(() => html.focus(), 0);
                    effectOriginToken.object.control({ releaseOthers: true });
                });

                dialogElement.find('.window-title').on('mousedown', () => {
                    setTimeout(() => html.focus(), 0);
                    effectOriginToken.object.control({ releaseOthers: true });
                });
            },
            close: () => {
                clearInterval(timer);
                if (dialog.dialogState.programmaticallyClosed) {
                    resolve({ userDecision: false, programmaticallyClosed: true, source, type });
                }
                else if (!dialog.dialogState.interacted) {
                    resolve({ userDecision: false, programmaticallyClosed: false, source, type });
                }

                effectOriginToken.object.release();
            }
        });
        dialog.dialogState = { interacted: false, decision: null, programmaticallyClosed: false };
        dialog.render(true);
    });
}
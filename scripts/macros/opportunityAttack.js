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
                    'opportunityAttackSet': true,
                    'opportunityAttackTemplateValidWeapons': validWeapons,
                    'opportunityAttackTemplateValidSpells': validSpells,
                    'opportunityAttackTemplateMwakRange': mwakRange,
                    'opportunityAttackTemplateTokenSize': Math.max(token.width, token.height),
                    'opportunityAttackTemplateConFac': conversionFactor
                },
                'walledtemplates': {
                    'hideBorder': 'alwaysHide',
                    'hideHighlighting': 'alwaysHide',
                    'showOnHover': 'alwaysHide'
                },
                "gambits-premades": {
                    "templateHiddenOA": true
                },
                "templatemacro": {
                    "never": {
                      "asGM": false,
                      "command": "let { dialogTitle,effectOriginToken,effectOriginActor,token,braceItem } = this;\nasync function wait(ms) { return new Promise(resolve => { setTimeout(resolve, ms); }); }\nlet gameVersion = parseInt(game.system.version.split('.')[0], 10);\nlet hasSentinel = effectOriginActor.items.some(i => i.name.toLowerCase() === \"sentinel\");\n\n// Check if origin token can see token moving\nif(!MidiQOL.canSee(effectOriginToken, token)) return;\n\n// Check if same disposition token\nif(token.document.disposition === effectOriginToken.document.disposition) return;\n\n// Check if origin tokens reaction is already used or a spell effect is preventing reactions\nconst effectNamesOrigin = [\"Reaction\", \"Confusion\", \"Arms of Hadar\", \"Shocking Grasp\", \"Slow\", \"Staggering Smite\"];\nlet hasEffectOrigin = (gameVersion >= 3 ? effectOriginActor.appliedEffects : effectOriginActor.effects)\n    .some(effect => effectNamesOrigin.includes(effect.name));\nif(hasEffectOrigin) return;\n\n// Check if origin token is incapacitated\nlet isIncapacitated = await MidiQOL.checkIncapacitated(effectOriginToken);\nif(isIncapacitated) return;\n\n//Check if token is disengaged and origin token does not have Sentinel\nlet isDisengaged = token.actor.effects.some(e => e.name.toLowerCase() === \"disengage\");\nif(isDisengaged && !hasSentinel) return;\n\n//Check if token activated mobile feat attack feature\nlet isMobileFeat = await token.actor.getFlag(\"midi-qol\", \"oaMobileFeatAttack\");\nif (isMobileFeat && isMobileFeat.includes(effectOriginToken.id)) return;\n\n//Check if token activated fancy footwork attack feature\nlet isFancyFootwork = await token.actor.getFlag(\"midi-qol\", \"oaFancyFootworkAttack\");\nif (isFancyFootwork && isFancyFootwork.includes(effectOriginToken.id)) return;\n\n//Check if origin token is Charmed by initiating token\nlet isCharmed = (gameVersion >= 3 ? effectOriginActor.appliedEffects : effectOriginActor.effects)\n    .find(e => e.name.toLowerCase() === \"charmed\");\nif(isCharmed) {\n    let charmerItem = await fromUuid(isCharmed.origin);\n    let charmer;\n    if(charmerItem) charmer = charmerItem.parent.id;\n    if(charmer === token.actor.id) return;\n}\n\n// Check if the token has used an effect to prevent opportunity attacks against them, or the generic immunity effect has been applied\nconst effectNamesToken = [\"Kinetic Jaunt\", \"Zephyr Strike\", \"Opportunity Attack Immunity\", \"Ashardalon's Stride\"];\nlet hasEffectToken = (gameVersion >= 3 ? token.actor.appliedEffects : token.actor.effects)\n    .some(effect => effectNamesToken.includes(effect.name));\nif(hasEffectToken) return;\n\nlet hasFlyby = token.actor.items.find(i => i.name.toLowerCase().includes(\"flyby\"));\nif(hasFlyby) return;\n\nlet originDisadvantage = token.actor.items.some(i => i.name.toLowerCase().includes(\"escape the hoard\"));\n\n// Check valid weapons\nlet hasWarCaster = effectOriginActor.items.find(i => i.name.toLowerCase() === \"war caster\");\nlet hasWarCasterConfigDialog = effectOriginActor.items.some(i => i.name.toLowerCase() === \"war caster\");\nlet overrideItems = [\"Booming Blade\"];\n\nlet validWeapons = effectOriginActor.items.filter(item => {\n    return (((item.system?.actionType === \"mwak\" && item.system?.equipped === true) || (item.system?.type?.value === \"monster\" && item?.type === \"feat\" && (item.system?.actionType === \"mwak\" || item.system?.actionType === \"msak\")) || (item?.type === \"weapon\" && item.system?.actionType === \"msak\")) || \n            (hasWarCaster && ((item.type === \"spell\" && item.system?.activation?.type === \"action\" && \n            (item.system?.actionType === \"msak\" || item.system?.actionType === \"rsak\" || \n            item.system?.actionType === \"save\") && (item.system?.preparation?.prepared === true || item.system?.preparation?.mode !== 'prepared' || !item.system?.preparation) &&\n            (item.system?.target?.type === \"creature\" || item.system?.target?.type === \"enemy\")) || overrideItems.includes(item.name))));\n});\nif (!validWeapons.length) return;\n\n// Find 'Unarmed Strike' and remove it to re-add at the end\nconst unarmedIndex = validWeapons.findIndex(item => item.name.toLowerCase() === \"unarmed strike\");\nlet unarmedStrike;\nif (unarmedIndex > -1) {\n    unarmedStrike = validWeapons.splice(unarmedIndex, 1)[0];\n}\n\n// Sort the weapons alphabetically\nvalidWeapons.sort((a, b) => a.name.localeCompare(b.name));\n\nlet favoriteWeaponUuid = null;\n// Check for favorite weapon and put it on top\nconst favoriteWeapon = validWeapons.find(item => item.flags?.['midi-qol']?.oaFavoriteAttack);\nif (favoriteWeapon) {\n    favoriteWeaponUuid = favoriteWeapon.uuid;\n    validWeapons.unshift(favoriteWeapon);\n}\n\nif (unarmedStrike) {\n    validWeapons.push(unarmedStrike);\n}\n\nlet initialTimeLeft = Number(game.settings.get('gambits-premades', 'Opportunity Attack Timeout'));\n\nlet optionData = validWeapons.map(item => `<option value=\"${item.uuid}\">${item.name} ${item.system.actionType === \"msak\" ? \"(Melee)\" : item.system.actionType === \"rsak\" ? \"(Ranged)\" : item.system.actionType === \"save\" ? \"(Save)\" : \"\"}</option>`).join(\"\");\nlet dialogContent = `\n<div style=\"display: flex; align-items: center; justify-content: space-between; padding: 5px; background-color: transparent; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);\">\n    <div style=\"flex-grow: 1; margin-right: 20px;\">\n        <p>Would you like to use your reaction to attack?</p>\n        <div>\n            <label for=\"item-select\" style=\"display: block; margin-bottom: 8px;\">Choose your Attack:</label>\n            <select id=\"item-select\" style=\"width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 16px; box-sizing: border-box; background-color: transparent; font-size: 16px; height: auto;\">\n                ${optionData}\n            </select>\n        </div>\n        <div style=\"display: flex; align-items: center;\">\n            <input type=\"checkbox\" id=\"favorite-checkbox\" style=\"margin-right: 5px; vertical-align: middle;\"/>\n            <label for=\"favorite-checkbox\">Favorite this Attack?</label>\n        </div>\n    </div>\n    <div style=\"display: flex; flex-direction: column; justify-content: center; padding-left: 20px; border-left: 1px solid #ccc; text-align: center;\">\n        <p><b>Time Remaining</b></p>\n        <p><span id=\"countdown\" style=\"font-size: 16px; color: red;\">${initialTimeLeft}</span> seconds</p>\n    </div>\n</div>\n\n`;\n\nlet dialogContentBrace = `\n\t<div style='display: flex; align-items: center; justify-content: space-between;'>\n\t\t<div style='flex: 1;'>\n                     Use your Brace Maneuver for an Opportunity Attack?\n\t\t</div>\n\t\t<div style='border-left: 1px solid #ccc; padding-left: 10px; text-align: center;'>\n\t\t\t<p><b>Time remaining</b></p>\n\t\t\t<p><span id='countdown' style='font-size: 16px; color: red;'>${initialTimeLeft}</span> seconds</p>\n\t\t</div>\n\t</div>`;\n\n// Let Active Auras recover - was needed when we were doing movement, may be needed again...\n//await wait(100);\n\nlet braceDecision = undefined;\n\nif(braceItem) {\n// Create temporary effect for dialog\nconst tempEffectDataBrace = [{\n\t\"icon\": \"icons/skills/melee/weapons-crossed-swords-yellow.webp\",\n\t\"name\": \"Maneuvers: Brace Opportunity Attack\",\n        \"changes\": [],\n        \"origin\": effectOriginActor.uuid,\n        \"disabled\": false,\n        \"duration\": {\n            \"rounds\": 1\n        },\n        \"flags\": {\n            \"dae\": {\n                \"macroRepeat\": \"none\"\n            },\n            \"effectmacro\": {\n                \"onCreate\": {\n                    \"script\": `\n                        let dialogInteraction = undefined;\n                        let timer;\n\n                        let dialog = new Dialog({\n                            title: \"Brace Maneuver\",\n                            content: \\`${dialogContentBrace}\\`,\n                            buttons: {\n                                yes: {\n                                    label: \"Yes\",\n                                    callback: async (html) => {\n                                        dialogInteraction = true;\n                                        let braceItem = await fromUuid(\\`${braceItem.uuid}\\`)\n                                        await braceItem.use();\n                                        await actor.setFlag(\"midi-qol\", \"checkBraceDecision\", true);\n                                    }\n                                },\n                                no: {\n                                    label: \"No\",\n                                    callback: async () => {\n                                        dialogInteraction = true;\n                                        await actor.setFlag(\"midi-qol\", \"checkBraceDecision\", false);\n                                    }\n                                },\n                            }, default: \"no\",\n                                            render: (html) => {\n                let timeLeft = ${initialTimeLeft};\n                const countdownElement = html.find(\"#countdown\");\n                timer = setInterval(() => {\n                    timeLeft--;\n                    countdownElement.text(timeLeft);\n                    if (timeLeft <= 0) {\n                        dialog.data.buttons.no.callback();\n                        dialog.close();\n                    }\n                }, 1000);\n            },\n            close: async () => {\n                clearInterval(timer);\n                if (dialogInteraction === undefined) await actor.setFlag(\"midi-qol\", \"checkBraceDecision\", false);\n            }\n        });\n        dialog.render(true);\n                    `\n                },\n                \"onDelete\": {\n                    \"script\": `await actor.unsetFlag(\"midi-qol\", \"checkBraceDecision\");`\n                }\n            }\n        }\n    }];\n\nawait MidiQOL.socket().executeAsGM(\"createEffects\", { actorUuid: effectOriginActor.uuid, effects: tempEffectDataBrace });\n\nwhile (braceDecision === undefined) {\n    braceDecision = await effectOriginActor.getFlag(\"midi-qol\", \"checkBraceDecision\");\n    if(braceDecision === undefined) {\n        await new Promise(resolve => setTimeout(resolve, 1000));\n    }\n}\n}\n\nconst tempEffectRemoveBrace = effectOriginActor.effects.getName(\"Maneuvers: Brace Opportunity Attack\");\nif(tempEffectRemoveBrace) await MidiQOL.socket().executeAsGM(\"removeEffects\", { actorUuid: effectOriginActor.uuid, effects: [tempEffectRemoveBrace.id] });\nif(braceDecision === false) return;\n\n// Create temporary effect for dialog\nconst tempEffectData = [{\n\t\"icon\": \"icons/weapons/swords/sword-guard-flanged-purple.webp\",\n\t\"name\": \"Opportunity Attack Reaction\",\n        \"changes\": [],\n        \"origin\": effectOriginActor.uuid,\n        \"disabled\": false,\n        \"duration\": {\n            \"rounds\": 1\n        },\n        \"flags\": {\n            \"dae\": {\n                \"macroRepeat\": \"none\"\n            },\n            \"effectmacro\": {\n                \"onCreate\": {\n                    \"script\": `\n                        let timer;\n\n                        let dialog = new Dialog({\n                            title: \"${dialogTitle}\",\n                            content: \\`${dialogContent}\\`,\n                            buttons: {\n                                yes: {\n                                    label: \"Yes\",\n                                    callback: async (html) => {\n                                        // Logic for yes response\n\n                                        let selectedItemUuid = html.find(\"#item-select\").val();\n                                        if (!selectedItemUuid) {\n                                            console.log(\"No weapon selected\");\n                                            return;\n                                        }\n\n                                        let chosenWeapon = await fromUuid(selectedItemUuid);\n                                        let rsakCheck = chosenWeapon.system.actionType === \"rsak\";\n                                        let favoriteWeaponCheck = \\`${favoriteWeaponUuid}\\`;\n                                        let favoriteWeapon;\n                                        if(favoriteWeaponCheck !== \"null\") favoriteWeapon = await fromUuid(favoriteWeaponCheck);\n                                        let favoriteSet = html.find(\"#favorite-checkbox\").is(':checked');\n                                        if(favoriteSet && favoriteWeaponCheck !== \"null\") {\n                                           await chosenWeapon.setFlag(\"midi-qol\", \"oaFavoriteAttack\", true);\n                                           if (favoriteWeapon && favoriteWeapon?.uuid !== chosenWeapon.uuid) {\n                                           await favoriteWeapon.unsetFlag(\"midi-qol\", \"oaFavoriteAttack\");\n                                           }\n                                        }\n                                        else if(favoriteSet) {\n                                           await chosenWeapon.setFlag(\"midi-qol\", \"oaFavoriteAttack\", true);\n                                        }\n                                          \n                                            chosenWeapon = chosenWeapon.clone({\n                                                system: {\n                                                    \"range\": {\n                                                        \"value\": null,\n                                                        \"long\": null,\n                                                        \"units\": \"\"\n                                                    }\n                                                }\n                                            }, { keepId: true });\n                                        chosenWeapon.prepareData();\n                                        chosenWeapon.prepareFinalAttributes();\n\n                                        const options = {\n                                            showFullCard: false,\n                                            createWorkflow: true,\n                                            versatile: false,\n                                            configureDialog: ${hasWarCasterConfigDialog},\n                                            targetUuids: [\\`${token.document.uuid}\\`],\n                                            workflowOptions: {\n                                                autoRollDamage: 'onHit',\n                                                autoFastDamage: true,\n                                            }\n                                        };\n                                        if (rsakCheck || ${originDisadvantage}) {\n                                           options.workflowOptions.disadvantage = true;\n                                        }\n                                        const attackRoll = await MidiQOL.completeItemUse(chosenWeapon, {}, options);\n\t\t\t\t\t\t\t\t\t\tconst uuid = actor.uuid;\n\t\t\t\t\t\t\t\t\t\tconst hasEffectApplied = await game.dfreds.effectInterface.hasEffectApplied('Reaction', uuid);\n\t\t\t\t\t\t\t\t\t\tif (!hasEffectApplied) {\n\t\t\t\t\t\t\t\t\t\t  await game.dfreds.effectInterface.addEffect({ effectName: 'Reaction', uuid });\n\t\t\t\t\t\t\t\t\t\t}\n                                                                                await actor.unsetFlag(\"midi-qol\", \"dragonTurtleShieldOA\");\n                                    }\n                                },\n                                no: {\n                                    label: \"No\",\n                                    callback: async () => {\n                                        await actor.unsetFlag(\"midi-qol\", \"dragonTurtleShieldOA\");\n                                    }\n                                },\n                            }, default: \"no\",\n                                            render: (html) => {\n                let timeLeft = ${initialTimeLeft};\n                const countdownElement = html.find(\"#countdown\");\n                timer = setInterval(() => {\n                    timeLeft--;\n                    countdownElement.text(timeLeft);\n                    if (timeLeft <= 0) {\n                        dialog.data.buttons.no.callback();\n                        dialog.close();\n                    }\n                }, 1000);\n            },\n            close: () => {\n                clearInterval(timer);\n            }\n        });\n        dialog.render(true);\n                    `\n                }\n            }\n        }\n    }];\n\nawait MidiQOL.socket().executeAsGM(\"createEffects\", { actorUuid: effectOriginActor.uuid, effects: tempEffectData });\nawait wait(500);\nlet tempEffectRemoveOpp;\nif(gameVersion >= 3) {\n   tempEffectRemoveOpp = effectOriginActor.appliedEffects.find(i => i.name.toLowerCase() === \"opportunity attack reaction\");\n}\nelse {\n   tempEffectRemoveOpp = effectOriginActor.effects.getName(\"Opportunity Attack Reaction\");\n}\nawait MidiQOL.socket().executeAsGM(\"removeEffects\", { actorUuid: effectOriginActor.uuid, effects: [tempEffectRemoveOpp.id] });"
                    },
                    "whenThrough": {
                      "asGM": false,
                      "command": "let oaDisabled = await template.getFlag(\"midi-qol\", \"opportunityAttackDisabled\");\nif(oaDisabled) return;\nif (this.hook.animate === false || (token.actor.type !== 'npc' && token.actor.type !== 'character')) return;\nlet gameVersion = parseInt(game.system.version.split('.')[0], 10);\n\nlet currentCombatant = canvas.tokens.get(game.combat.current.tokenId);\nif (currentCombatant.id !== token.id && currentCombatant.document.disposition === token.document.disposition) return; // Avoid initiating opportunity attack when it's not a token's turn if they are doing something like riding another allied token. This should allow for dialog to fire if forced movement via an enemy spell moves the token outside range outside of their turn but not when being moved as part of an allied unit\nconst effectNamesToken = [\"Dissonant Whispers\"];\nlet hasEffectToken = (gameVersion >= 3 ? token.actor.appliedEffects : token.actor.effects)\n    .some(effect => effectNamesToken.includes(effect.name));\nif (currentCombatant.id !== token.id && !hasEffectToken) return;\n\nconst effectOriginActor = await fromUuid(template.flags[\"midi-qol\"].actorUuid);\nconst effectOriginToken = await MidiQOL.tokenForActor(effectOriginActor.uuid);\n\n//Simple elevation check in lieu of a more robust option for actually triggering OA on elevation change\nif((token.document.elevation > (effectOriginToken.document.elevation + template.distance)) || (token.document.elevation < (effectOriginToken.document.elevation - template.distance))) return;\n\nawait template.callMacro(\"never\", { dialogTitle: `${effectOriginActor.name} | Opportunity Attack`, effectOriginToken, effectOriginActor, token });"
                    },
                    "whenLeft": {
                      "asGM": false,
                      "command": "let oaDisabled = await template.getFlag(\"midi-qol\", \"opportunityAttackDisabled\");\nif(oaDisabled) return;\nif (this.hook.animate === false || (token.actor.type !== 'npc' && token.actor.type !== 'character')) return;\nlet gameVersion = parseInt(game.system.version.split('.')[0], 10);\n\nlet currentCombatant = canvas.tokens.get(game.combat.current.tokenId);\nif (currentCombatant.id !== token.id && currentCombatant.document.disposition === token.document.disposition) return; // Avoid initiating opportunity attack when it's not a token's turn if they are doing something like riding another allied token. This should allow for dialog to fire if forced movement via an enemy spell moves the token outside range outside of their turn but not when being moved as part of an allied unit\nconst effectNamesToken = [\"Dissonant Whispers\"];\nlet hasEffectToken = (gameVersion >= 3 ? token.actor.appliedEffects : token.actor.effects)\n    .some(effect => effectNamesToken.includes(effect.name));\nif (currentCombatant.id !== token.id && !hasEffectToken) return;\n\nconst effectOriginActor = await fromUuid(template.flags[\"midi-qol\"].actorUuid);\nconst effectOriginToken = await MidiQOL.tokenForActor(effectOriginActor.uuid);\n\n//Simple elevation check in lieu of a more robust option for actually triggering OA on elevation change\nif((token.document.elevation > (effectOriginToken.document.elevation + template.distance)) || (token.document.elevation < (effectOriginToken.document.elevation - template.distance))) return;\n\nlet dragonTurtleShield = effectOriginActor.items.getName(\"Dragon Turtle Dueling Shield\");\nif(dragonTurtleShield) await effectOriginActor.setFlag(\"midi-qol\", \"dragonTurtleShieldOA\", true)\n\nawait template.callMacro(\"never\", { dialogTitle: `${effectOriginActor.name} | Opportunity Attack`, effectOriginToken, effectOriginActor, token });"
                    },
                    "whenEntered": {
                      "asGM": false,
                      "command": "let oaDisabled = await template.getFlag(\"midi-qol\", \"opportunityAttackDisabled\");\nif(oaDisabled) return;\nif (this.hook.animate === false || (token.actor.type !== 'npc' && token.actor.type !== 'character')) return;\nlet gameVersion = parseInt(game.system.version.split('.')[0], 10);\n\nlet currentCombatant = canvas.tokens.get(game.combat.current.tokenId);\nif (currentCombatant.id !== token.id && currentCombatant.document.disposition === token.document.disposition) return; //Avoid initiating opportunity attack when it's not a tokens turn if they are doing something like riding another allied token. This should allow for dialog to fire if forced movement via an enemy spell moves the token outside range outside of their turn but not when being moved as part of an allied unit\n\nconst effectOriginActor = await fromUuid(template.flags[\"midi-qol\"].actorUuid);\nconst effectOriginToken = await MidiQOL.tokenForActor(effectOriginActor.uuid);\n\n//Simple elevation check in lieu of a more robust option for actually triggering OA on elevation change\nif((token.document.elevation > (effectOriginToken.document.elevation + template.distance)) || (token.document.elevation < (effectOriginToken.document.elevation - template.distance))) return;\n\nlet hasPolearmReaction = effectOriginActor.items.find(i => i.name.toLowerCase() === \"polearm master\");\nif (hasPolearmReaction) {\nlet weaponNames = [\"glaive\",\"halberd\",\"pike\",\"quarterstaff\",\"spear\"];\nlet hasPolearmWeapon;\nif(gameVersion >= 3) {\n    hasPolearmWeapon = effectOriginActor.items.some(item => item.system?.type?.baseItem && weaponNames.includes(item.system?.type?.baseItem.toLowerCase()) && item.system.equipped === true);\n}\nelse {\n    hasPolearmWeapon = effectOriginActor.items.some(item => item.system?.baseItem && weaponNames.includes(item.system?.baseItem.toLowerCase()) && item.system.equipped === true);\n}\nif(!hasPolearmWeapon) return;\n\nawait template.callMacro(\"never\", { dialogTitle: `${effectOriginActor.name} | Polearm Opportunity Attack`, effectOriginToken, effectOriginActor, token });\n}\n\nif(effectOriginActor.classes?.fighter && effectOriginActor.classes?.fighter?.subclass?.name === \"Battle Master\") {\nlet hasBraceReactionCpr = false;\nif(game.modules.get(\"chris-premades\")?.active) {\n    hasBraceReactionCpr = chrisPremades.helpers.getItem(effectOriginActor, 'Maneuvers: Brace');\n}\nlet hasBraceReaction = effectOriginActor.items.getName(\"Maneuvers: Brace\");\nlet braceItem;\n\nif(hasBraceReactionCpr) {\n    braceItem = hasBraceReactionCpr;\n}\nelse if(hasBraceReaction) {\n    braceItem = hasBraceReaction;\n}\nelse return;\n\nconst superiorityNames = [\"superiority dice\", \"superiority die\"];\n\nlet resourceExistsWithValue = [effectOriginActor.system.resources.primary, effectOriginActor.system.resources.secondary, effectOriginActor.system.resources.tertiary].some(resource =>\n    superiorityNames.includes(resource?.label.toLowerCase()) && resource.value !== 0);\nlet itemExistsWithValue;\n\nif (!resourceExistsWithValue) {\n    itemExistsWithValue = !!effectOriginActor.items.find(i => superiorityNames.includes(i.name.toLowerCase()) && i.system.uses.value !== 0);\n}\n\nif (!resourceExistsWithValue && !itemExistsWithValue) return;\n\nawait template.callMacro(\"never\", { dialogTitle: `${effectOriginActor.name} | Maneuvers: Brace Opportunity Attack`, effectOriginToken, effectOriginActor, token, braceItem });\n}\n\nlet hasDeadlyReachReaction = effectOriginActor.items.find(i => i.name.toLowerCase() === \"deadly reach\");\nif (hasDeadlyReachReaction) {\n    await template.callMacro(\"never\", { dialogTitle: `${effectOriginActor.name} | Deadly Reach Opportunity Attack`, effectOriginToken, effectOriginActor, token });\n}"
                    },
                    "whenDeleted": {
                      "asGM": false,
                      "command": "const effectOriginActor = await fromUuid(template.flags[\"midi-qol\"].actorUuid);\nlet effectOriginToken = await MidiQOL.tokenForActor(effectOriginActor.uuid);\nawait effectOriginActor.unsetFlag('midi-qol', 'opportunityAttackTemplate');"
                    },
                    "whenTurnEnd": {
                      "asGM": true,
                      "command": "let gameVersion = parseInt(game.system.version.split('.')[0], 10);\nlet oaEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'Enable Opportunity Attack');\nif(!oaEnabled) return;\nlet legacy = MidiQOL.safeGetGameSetting('gambits-premades', 'Enable Opportunity Attack Legacy System');\n\nconst effectOriginActor = await fromUuid(template.flags[\"midi-qol\"].actorUuid);\nconst effectOriginToken = await MidiQOL.tokenForActor(effectOriginActor.uuid);\n\nlet recalculate = false;\nlet tokenSize = Math.max(effectOriginToken.document.width, effectOriginToken.document.height);\nlet validWeapons = effectOriginActor.items.filter(item => (item.system.actionType === \"mwak\" && item.system.equipped) || (item.system?.type?.value === \"monster\" && item?.type === \"feat\" && (item.system?.actionType === \"mwak\" || item.system?.actionType === \"msak\")) || (item?.type === \"weapon\" && item.system?.actionType === \"msak\"));\n\nrecalculate = await checkAndSetFlag(\"opportunityAttackTemplateValidWeapons\", validWeapons) || recalculate;\nrecalculate = await checkAndSetFlag(\"opportunityAttackTemplateTokenSize\", tokenSize) || recalculate;\nrecalculate = await handleMWAKRange() || recalculate;\n\nif (!recalculate) return;\n\nconst validSpells = template.flags[\"midi-qol\"].opportunityAttackTemplateValidSpells;\nlet maxRange = calculateMaxRange(validWeapons, validSpells, gameVersion, tokenSize);\n\nawait effectOriginActor.setFlag(\"midi-qol\", \"opportunityAttackTemplateValidOptions\", validWeapons.length > 0 || validSpells.length > 0);\n\n// Update the template with the new range\nawait template.update({\"distance\": maxRange});\nawait template.setFlag(\"midi-qol\", \"opportunityAttackDisabled\", false);\nawait tokenAttacher.attachElementsToToken([template], effectOriginToken, false);\n \nasync function checkAndSetFlag(property, newValue) {\n    const oldValue = JSON.stringify(template.flags[\"midi-qol\"][property]);\n    if (oldValue !== JSON.stringify(newValue)) {\n        await template.setFlag(\"midi-qol\", property, newValue);\n        return true;\n    }\n    return false;\n}\n\nasync function handleMWAKRange() {\n    if (!effectOriginActor.flags[\"midi-qol\"]?.range?.mwak) return false;\n\n    let mwakExpire = effectOriginActor.appliedEffects\n        .filter(effect => effect.duration.turns == 1)\n        .reduce((acc, effect) => {\n            const change = effect.changes.find(change => change.key == \"flags.midi-qol.range.mwak\");\n            return change ? acc + Number(change.value) : acc;\n        }, 0);\n\n    let mwakRange = effectOriginActor.flags[\"midi-qol\"].range.mwak - mwakExpire;\n    return await checkAndSetFlag(\"opportunityAttackTemplateMwakRange\", mwakRange);\n}\n\nfunction calculateMaxRange(validWeapons, validSpells, gameVersion, tokenSize) {\n    const units = canvas.scene.grid.units;\n    let conversionFactor;\n    if (units === \"feet\" || units === \"f\" || units === \"ft\") {\n        conversionFactor = 1;\n    } else if (units === \"meters\" || units === \"m\" || units === \"mt\") {\n        conversionFactor = 0.3;\n    }\n\n    const tokenSizeOffset = tokenSize * 0.5 * canvas.scene.dimensions.distance;\n\n    if (!validWeapons.length && !validSpells.length) return;\n\n    let onlyThrownWeapons = validWeapons.length > 0 && validWeapons.every(item => {\n        return gameVersion >= 3 ? item.system.properties.has('thr') : item.system.properties.thr;\n    });\n\n    let maxRange;\n\n    if (onlyThrownWeapons || (validSpells.length && !validWeapons.length)) {\n        maxRange = 5;\n    } else {\n        maxRange = validWeapons.reduce((max, item) => {\n            let rangeValue = item.system.range?.value;\n            let noThr = gameVersion >= 3 ? !item.system.properties?.has('thr') : !item.system.properties?.thr;\n            if (rangeValue && !isNaN(rangeValue) && noThr) {\n                return Math.max(max, rangeValue);\n            }\n            return max;\n        }, 0);\n    }\n\n    if (effectOriginToken.document.width === 1 && maxRange === 10) maxRange += 1.7;\n    if (effectOriginToken.document.width === 2 && maxRange === 5) maxRange += 0.7;\n    if (effectOriginToken.document.width === 3 && maxRange === 5) maxRange += 1.7;\n    if (effectOriginToken.document.width === 3 && maxRange === 10) maxRange += 0.7;\n    if (effectOriginToken.document.width === 4 && maxRange === 10) maxRange += 1.6;\n\n    maxRange = (maxRange * conversionFactor) + tokenSizeOffset;\n\n    if (effectOriginActor.flags[\"midi-qol\"]?.range?.mwak) {\n        maxRange += (template.flags[\"midi-qol\"].opportunityAttackTemplateMwakRange * conversionFactor);\n    }\n    return maxRange;\n}"
                    }
                }
            },
            'angle': 0
            };

                let createdTemplates = await canvas.scene.createEmbeddedDocuments('MeasuredTemplate', [templateData]);
                const firstTemplate = createdTemplates[0];
          
                actor.setFlag("gambits-premades", "templateAttachedToken", firstTemplate.uuid);
                actor.setFlag("gambits-premades", "tokenAttachedTemplate", token.id);
                actor.setFlag("midi-qol", "opportunityAttackTemplate", firstTemplate.uuid);
                //Handle rippers tooltip overlay
                if(firstTemplate.object && firstTemplate.object.tooltip) firstTemplate.object.tooltip.visible = false;
                if(oaDisabled) firstTemplate.setFlag("midi-qol", "opportunityAttackDisabled", true);
        }
    }

    if(combatEvent === "startCombat") {
        for (let combatant of combat.combatants.values()) {
            await processCombatant(combatant);
        }
        await canvas.draw();
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
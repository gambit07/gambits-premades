const counterspellIds = {"2014": "a3992a10-f36a-4416-a995-f83d444c3c0a", "2024": "fb401e12-b875-47bd-9acd-8a09639c6852"};

export async function resolveCounterspell({workflowData, workflowType, workflowCombat}) {
    const workflow = await MidiQOL.Workflow.getWorkflow(`${workflowData}`);
    if(!workflow || workflow.aborted || !workflow.token || workflow.item.type !== "spell") return;
    if(Object.values(counterspellIds).includes(workflow.item.flags["gambits-premades"]?.gpsUuid)) return;
    if(workflow.activity?.midiProperties?.automationOnly || workflow.gps?.counterspellResolved) return;
    (workflow.gps ??= {}).counterspellResolved = true;
    const gmUser = game.gps.getPrimaryGM();
    const itemName = "Counterspell";
    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting("gambits-premades", "Counterspell Timeout"));
    const castProperties = ["vocal", "somatic", "material"];
    const spent = new Set();
    const initial = {token: workflow.token, item: workflow.item, level: workflow.castData?.castLevel ?? workflow.castData?.baseLevel ?? workflow.item.system.level, itemCardUuid: workflow.itemCardUuid};
    if(await countered(initial)) workflow.aborted = true;

    async function countered(cast) {
        const properties = cast.item.system.properties;
        if(cast.subtle || !castProperties.some(property => properties.has(property))) return false;
        const vocalOnly = properties.has("vocal") && !properties.has("somatic") && !properties.has("material");
        for(const sourceRules of ["2014", "2024"]) {
            const gpsUuid = counterspellIds[sourceRules];
            const candidates = game.gps.findValidTokens({initiatingToken: cast.token, targetedToken: null, itemName, itemType: "spell", itemChecked: null, reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", workflowType, workflowCombat, gpsUuid, sourceRules});
            for(const validTokenPrimary of candidates) {
                if(spent.has(validTokenPrimary.actor.uuid) || MidiQOL.hasUsedReaction(validTokenPrimary.actor)) continue;
                if(vocalOnly && validTokenPrimary.document.hasStatusEffect("deafened")) continue;
                const chosenItem = validTokenPrimary.actor.items.find(item => item.flags["gambits-premades"]?.gpsUuid === gpsUuid);
                if(!chosenItem) continue;
                const itemProperName = chosenItem.name;
                const dialogId = gpsUuid;
                const browserUser = game.gps.getBrowserUser({actorUuid: validTokenPrimary.actor.uuid});
                const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
                const dialogTitleGM = game.i18n.format("GAMBITSPREMADES.Dialogs.Common.WaitingForSelection", {actorName: validTokenPrimary.actor.name, itemName: itemProperName});
                const {dialogSubtle, itemSorcery} = getSubtleSpell({validToken: validTokenPrimary});
            let dialogContent = `
                <style>
                #gps-checkbox { position: absolute; opacity: 0; width: 0; height: 0; } #gps-checkbox + label { display: flex; align-items: center; cursor: pointer; } #gps-checkbox + label::before { content: "\\f6a9"; font-family: "Font Awesome 5 Free"; font-weight: 400; font-size: 20px; margin-right: 5px; line-height: 1; vertical-align: middle; } #gps-checkbox:checked + label::before { content: "\\f6a9"; font-family: "Font Awesome 5 Free"; font-weight: 900; }
                </style>
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <div>
                                <div class="gps-dialog-flex">
                                    <p class="gps-dialog-paragraph">${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.Spells.Counterspell.Prompts.UseYourReaction.Default", { itemName: itemProperName })}</p>
                                    <div id="image-container" class="gps-dialog-image-container">
                                        <img id="img_${dialogId}" src="${chosenItem.img}" class="gps-dialog-image">
                                    </div>
                                </div>
                                ${dialogSubtle}
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
    
            let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${game.i18n.format("GAMBITSPREMADES.ChatMessages.Common.ReactionAvailableSpellTrigger", { actorName: validTokenPrimary.actor.name, itemProperName: itemProperName })}</span>`;
            let chatData = { user: gmUser, content: content, roll: false };
            let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });
    
            let result;
    
            if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
                let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid, focusTokenUuid: cast.token.document.uuid,source: "user",type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
                
                let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid, focusTokenUuid: cast.token.document.uuid,source: "gm",type: "multiDialog", notificationId: notificationMessage._id };
            
                result = await game.gps.handleDialogPromises({userDialogArgs, gmDialogArgs});
            } else {
                result = await game.gps.queryDialog("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid, focusTokenUuid: cast.token.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
            }
                    

                if(!result?.userDecision) continue;
                const useUser = result.source === "gm" ? gmUser : browserUser;
                const itemRoll = await game.gps.queryUser("remoteCompleteItemUse", useUser, {
                    itemUuid: chosenItem.uuid, actorUuid: validTokenPrimary.actor.uuid,
                    options: {showFullCard: false, createWorkflow: true, configureDialog: true, targetUuids: [cast.token.document.uuid]}
                });
                if(!itemRoll?.completed) continue;
                spent.add(validTokenPrimary.actor.uuid);
                await game.gps.addReaction({actorUuid: validTokenPrimary.actor.uuid});
                const subtle = !!result.genericCheck && !!itemSorcery && itemSorcery.system.uses.spent < itemSorcery.system.uses.max;
                if(subtle) await itemSorcery.update({"system.uses.spent": itemSorcery.system.uses.spent + 1});
                const attempt = {token: validTokenPrimary, item: chosenItem, level: itemRoll.castLevel || itemRoll.baseLevel || chosenItem.system.level, itemCardUuid: itemRoll.itemCardUuid, subtle};
                if(await countered(attempt)) continue;
                let success, roll;
                let details = {};
                let key;
                if(sourceRules === "2024") {
                    const save = await game.gps.queryUser("gpsActivityUse", useUser, {itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: cast.token.document.uuid});
                    if(!save) continue;
                    success = save.failedSaves.size !== 0;
                    roll = save.saveRolls;
                    key = `GAMBITSPREMADES.ChatMessages.Automations2024.Spells.Counterspell2024.Counterspell${success ? "Success" : "Failed"}`;
                } else {
                    let level = Number(cast.level) || 0;
                    if(MidiQOL.safeGetGameSetting("gambits-premades", "enableCounterspellSpellPenetration")) {
                        if(cast.token.actor.items.some(item => item.name === "Greater Spell Penetration")) level += 5;
                        else if(cast.token.actor.items.some(item => item.name === "Spell Penetration")) level += 3;
                    }
                    success = attempt.level >= level;
                    key = "GAMBITSPREMADES.ChatMessages.Automations.Spells.Counterspell.CounterspellAutoSuccess";
                    if(!success) {
                        const activity = chosenItem.system.activities.find(activity => activity.identifier === "syntheticCheck");
                        if(!activity) continue;
                        const spellThreshold = 10 + level;
                        await game.gps.queryUser("gpsActivityUpdate", gmUser, {activityUuid: activity.uuid, updates: {"check.ability": validTokenPrimary.actor.spellcastingAbility, "check.dc.calculation": "", "check.dc.formula": String(spellThreshold)}});
                        const check = await game.gps.queryUser("gpsActivityUse", useUser, {itemUuid: chosenItem.uuid, identifier: "syntheticCheck", targetUuid: validTokenPrimary.document.uuid});
                        if(!check?.saveRolls) continue;
                        roll = check.saveRolls;
                        const proficiency = validTokenPrimary.actor.items.some(item => item.identifier === "improved-abjuration") ? validTokenPrimary.actor.system.attributes.prof : 0;
                        const skillTotal = roll.total + proficiency;
                        success = skillTotal >= spellThreshold;
                        details = {skillTotal, skillFlavor: validTokenPrimary.actor.system.attributes.spell.abilityLabel, abjurationChat: proficiency ? ` (+${proficiency})` : "", spellThreshold, spellPenetrationChat: ""};
                        key = `GAMBITSPREMADES.ChatMessages.Automations.Spells.Counterspell.Counterspell${success ? "Success" : "Failed"}`;
                    }
                }
                const chatContent = `<span>${game.i18n.format(key, details)}<br><img src="${cast.token.actor.img}" width="30" height="30"></span>`;
                await game.gps.queryUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, itemCardUuid: attempt.itemCardUuid, chatContent, rollData: roll});
                if(!success) continue;
                if(game.gps.getCprConfig({itemUuid: chosenItem.uuid}).animEnabled) {
                    game.gps.counterspellAnimation({sourceToken: validTokenPrimary, targetToken: cast.token});
                }
                if(sourceRules === "2024") await game.gps.queryUser("refundCounterspellSlot", gmUser, {itemCardUuid: cast.itemCardUuid, actorUuid: cast.token.actor.uuid});
                return true;
            }
        }
        return false;
    }
}

function getSubtleSpell({validToken}) {
    let subtleSpell = validToken.actor.items.some(i => i.identifier === "subtle-spell" || i.name === "Subtle Spell");
    let itemSorcery;
    let dialogSubtle = "";
    if(subtleSpell) itemSorcery = validToken.actor.items.find(i => (["sorcery-points", "font-of-magic", "metamagic-adept"].includes(i.identifier) || i.name === "Sorcery Points" || i.name === "Font of Magic" || i.name === "Metamagic Adept") && i.system.uses?.max && i.system.uses?.spent < i.system.uses?.max);

    if(itemSorcery) {
        const pointsRemaining = itemSorcery.system.uses.max - itemSorcery.system.uses.spent;
        const pointsLabel = game.i18n.localize(pointsRemaining === 1 ? "GAMBITSPREMADES.UI.Point" : "GAMBITSPREMADES.UI.Points");
        const subtleSpellLabel = game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.Spells.Counterspell.SubtleSpellRemaining", { pointsRemaining, pointsLabel });

        dialogSubtle = `
            <div style="display: flex; align-items: center;">
                <input type="checkbox" id="gps-checkbox" style="vertical-align: middle;"/>
                <label for="gps-checkbox">
                    ${subtleSpellLabel}
                </label>
            </div>
        `;
    }

    return {dialogSubtle, itemSorcery};
}
export async function refundCounterspellSlot({itemCardUuid, actorUuid}) {
    const actor = await fromUuid(actorUuid);
    if(!actor) return;
    const message = MidiQOL.getCachedChatMessage(itemCardUuid);
    const consumed = message?.system.deltas;
    if (!consumed?.actor?.length || message.getAssociatedActor()?.uuid !== actor.uuid) return;
    const slots = consumed.actor.filter(({ keyPath, delta }) => /^system\.spells\.(spell[1-9]|pact)\.value$/.test(keyPath) && delta < 0);
    if (!slots.length) return;
    const updates = {};
    for (const { keyPath, delta } of slots) {
        const current = foundry.utils.getProperty(actor, keyPath);
        if (Number.isFinite(current)) updates[keyPath] = (updates[keyPath] ?? current) - delta;
    }
    if (!Object.keys(updates).length) return;
    await actor.update(updates);
    await message.update({ "system.deltas.actor": consumed.actor.filter(usage => !slots.includes(usage)) });
}

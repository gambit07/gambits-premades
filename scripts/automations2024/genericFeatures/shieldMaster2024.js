export async function shieldMaster2024({ speaker, actor, token, character, item, args, scope, workflow, options, macroItem }) {
    if(args?.[0].macroPass === "postAttackRollComplete" && workflow.hitTargets.first() && token.actor.items.filter(i => i.name.toLowerCase().includes('shield') && i.system.equipped === true).length > 0) {
        let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
        if(!game.combat) return;
        let meleeAttack = ((workflow.activity?.actionType === 'mwak' && !workflow.item.system?.properties?.has('thr')) || (workflow.activity?.actionType === 'mwak' && MidiQOL.findNearby('Hostile',workflow.targets.first(), game.gps.convertFromFeet({range:6})).length > 0 && workflow.item.system?.properties?.has('thr'))) ? true : false;
        if (!meleeAttack) return;
        if(game.combat?.current.tokenId !== token.id) {
            if(debugEnabled) console.error(`Shield Bash for ${actor.name} failed due to not tokens turn in combat`);
            return;
        }

        item = await actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "b32e3d48-034b-4a56-95b4-f392a525f299");
        let shieldMasterCheck = await item.getFlag("gambits-premades", "checkShieldMaster") ?? null;
        if(shieldMasterCheck === false || shieldMasterCheck === `${token.id}_${game.combat.round}`) return;

        let target = workflow.hitTargets.first();
        let dialogId = "shieldmastershieldbash";
        let dialogTitlePrimary = `${token.actor.name} | ${item.name}`;
        let dialogTitleGM = `Waiting for ${token.actor.name}'s selection | ${item.name}`;
        let browserUser = game.gps.getBrowserUser({ actorUuid: actor.uuid });
        let initialTimeLeft = 30;
        let gmUser = game.gps.getPrimaryGM();
        let result;
        let pushRange = game.gps.convertFromFeet({range: 5});
        const units = canvas.scene.grid.units;
        let pushRangeText = `${pushRange} ${(units === "meters" || units === "m" || units === "mt" || units === "metri") ? "m" : "ft"}`

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <p class="gps-dialog-paragraph">Would you like to use Shield Bash to cause your target to make a saving throw to potentially be Pushed (${pushRangeText}) or to go Prone?</p>
                        <div>
                            <div class="gps-dialog-flex">
                                <table style="background-color: rgba(181, 99, 69, 0.2);" width="100%"><tbody><tr><th>Prone</th><th>Push</th></tr><tr><td style="text-align: center;vertical-align: middle;"><input type="radio" value="prone" id="prone" name="ability-check" style="margin: 0 auto;"></td><td style="text-align: center;vertical-align: middle;"><input type="radio" value="push" id="push" name="ability-check" style="margin: 0 auto;"></td></tr></tbody></table>
                                <div id="image-container" class="gps-dialog-image-container">
                                    <img id="img_${dialogId}" src="${item.img}" class="gps-dialog-image">
                                </div>
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

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid,source: "user",type: "multiDialog", browserUser: browserUser };
            
            let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid,source: "gm",type: "multiDialog" };

            result = await game.gps.socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
        } else {
        result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid,source:gmUser === browserUser ? "gm" : "user",type:"singleDialog"});
        }
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result || {};

        if (!userDecision) {
            await item.setFlag("gambits-premades", "checkShieldMaster", false);
            return;
        }
        else if (userDecision) {
            await item.setFlag("gambits-premades", "checkShieldMaster", `${token.id}_${game.combat.round}`);

            const saveResult = await game.gps.gpsActivityUse({itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: target.document.uuid});

            if (saveResult.failedSaves.size !== 0) {
                if(abilityCheck === "prone") await game.gps.socket.executeAsGM("gmToggleStatus", {tokenUuid: `${target.document.uuid}`, status: "prone", active: true });
                else if(abilityCheck === "push") await MidiQOL.moveTokenAwayFromPoint(target, pushRange, token, true, true);
                else return;
            }
        }
    }

    if(args?.[0].macroPass === "preTargetSave") {
        if(!token.actor.items.filter(i => i.name.toLowerCase().includes('shield') && i.system.equipped === true).length > 0) return;
        if(MidiQOL.hasUsedReaction(actor)) return;
        item = await actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "b32e3d48-034b-4a56-95b4-f392a525f299");

        let dialogId = "shieldmasterinterposeshield";
        let dialogTitleGM = `Waiting for ${token.actor.name}'s selection | ${item.name}`;
        let dialogTitlePrimary = `${token.actor.name} | ${item.name}`;
        let browserUser = game.gps.getBrowserUser({ actorUuid: actor.uuid });
        let result;
        let initialTimeLeft = 15;
        let gmUser = game.gps.getPrimaryGM();

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">Would you like to use your reaction to potentially take no damage on a save success with Interpose Shield?</p>
                                <div id="image-container" class="gps-dialog-image-container">
                                    <img id="img_${dialogId}" src="${item.img}" class="gps-dialog-image">
                                </div>
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
        
        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid,source: "user",type: "multiDialog", browserUser: browserUser };
            
            let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid,source: "gm",type: "multiDialog" };
        
            result = await game.gps.socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
        } else {
            result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid,source:gmUser === browserUser ? "gm" : "user",type:"singleDialog"});
        }
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result || {};

        if (!userDecision) {
            return;
        }
        else if (userDecision) {
            let effectData = await actor.allApplicableEffects().find(e => e.flags["gambits-premades"]?.gpsUuid === "2109c2b7-7640-4649-ad3c-26b5a84d5646");
            await effectData.update({"disabled" : false});
            await game.gps.addReaction({actorUuid: `${actor.uuid}`});
        }
    }

    if(args?.[0] === "each") {
        item = await fromUuid(args[2]);
        await item.unsetFlag("gambits-premades", "checkShieldMaster");
    }
}
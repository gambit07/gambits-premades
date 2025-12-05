export async function elementalAffinity2024({ speaker, actor, token, character, item, args, scope, workflow, options, macroItem }) {
    if(args?.[0].macroPass === "postAllRollsComplete") {

        let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
        item = await actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "1c11dbbe-c4f3-4208-9449-c025d6a34218");
        
        if(workflow.item.type !== "spell") return;
        if(!workflow.activity.consumption.spellSlot) {
            if(debugEnabled) console.error(`${item.name} failed no activity spell slot consumption (assumed activity is not an initial spell cast)`);
            return;
        }
        let damageType = false;
        let browserUser = game.gps.getBrowserUser({ actorUuid: actor.uuid });
        let gmUser = game.gps.getPrimaryGM();

        let cprConfig = game.gps.getCprConfig({itemUuid: item.uuid, type: "damageType"});
        if(cprConfig.dType) damageType = cprConfig.dType;

        if(!damageType) {
            if(debugEnabled) console.error(`${item.name} no damage type selected in CPR medkit, default Acid used`);
            damageType = "acid";
        }
        const damageSpell = workflow.damageDetail.map(part => part?.type ?? null);

        if (!damageSpell?.some(type => damageType.includes(type))) {
            if(debugEnabled) console.error(`${item.name} failed, not relevant damage type`);
            return;
        }

        let targets = Array.from(workflow.targets);
        const targetUuids = targets.map(t => t.document.uuid);
        const targetNames = targets.map(t => t.document.name);
        let target = workflow.targets.first();

        if(targets.length > 1) {
            let initialTimeLeft = 15;
            let dialogId = "elementalaffinity";
            const dialogTitlePrimary = `${actor.name} | ${item.name}`;
            const dialogTitleGM = `Waiting for ${actor.name}'s selection | ${item.name}`;

            let dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <p class="gps-dialog-paragraph">Choose the enemy to receive additional ${damageType} damage from your Elemental Affinity below:</p>
                            <div>
                                <div class="gps-dialog-flex">
                                    <label for="enemy-token" class="gps-dialog-label">Target:</label>
                                    <select id="enemy-token" class="gps-dialog-select">
                                        ${targetNames.map((name, index) => `<option class="gps-dialog-option" value="${targetUuids[index]}">${name}</option>`).join('')}
                                    </select>
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

            let result;
            
            if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
                let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft, validTokenPrimaryUuid: token.document.uuid, source: "user", type: "multiDialog", browserUser: browserUser };
                
                let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid, source: "gm", type: "multiDialog" };

                result = await game.gps.socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
            } else {
                result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid, source: gmUser === browserUser ? "gm" : "user", type: "singleDialog"});
            }
                    
            const { userDecision, enemyTokenUuid, source, type } = result || {};

            if (userDecision) {
                let targetDocument = await fromUuid(enemyTokenUuid);
                target = targetDocument.object;
            }
            else return;
        }

        let activityToUpdate = await item.system.activities.find(a => a.identifier === "syntheticDamage");

        let damageParts = foundry.utils.duplicate(activityToUpdate.damage.parts);
        if(damageType !== damageParts[0].types[0]) {
            damageParts[0].types = [];
            damageParts[0].types.push(damageType);
            await game.gps.socket.executeAsUser("gpsActivityUpdate", gmUser, { activityUuid: activityToUpdate.uuid, updates: {"damage.parts": damageParts} });
        }
        await game.gps.socket.executeAsUser("gpsActivityUse", gmUser, {itemUuid: item.uuid, identifier: "syntheticDamage", targetUuid: target.uuid});
    }
}
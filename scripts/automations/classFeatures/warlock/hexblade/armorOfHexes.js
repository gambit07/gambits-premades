export async function armorOfHexes({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "isAttacked") {
        const targetUuid = token.document?.uuid ?? token.uuid;
        let target = [...workflow.targets].find(t => t.document.uuid === targetUuid && t.actor.uuid === actor.uuid);
        if(!target) return;
        const ownedCurse = workflow.actor.appliedEffects.some(effect => {
            if(effect.name !== "Hexblade's Curse: Target") return false;
            return DAE.getEffectSource(effect).actorUuid === actor.uuid;
        });
        if(!ownedCurse) return;
        if(item.parent.uuid !== target.actor.uuid) return;
        if (MidiQOL.hasUsedReaction(target.actor)) return;
        if (!game.gps.attackHits(workflow, target)) return;

        let dialogId = "armorofhexes";
        let dialogTitleGM = game.i18n.format("GAMBITSPREMADES.Dialogs.Common.WaitingForSelection", { actorName: token.actor.name, itemName: item.name });
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
                                <p class="gps-dialog-paragraph">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Warlock.Hexblade.ArmorOfHexes.Prompt")}</p>
                                <div id="image-container" class="gps-dialog-image-container">
                                    <img id="img_${dialogId}" src="${item.img}" class="gps-dialog-image">
                                </div>
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
        
        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid, focusTokenUuid: workflow.token?.document?.uuid,source: "user",type: "multiDialog", browserUser: browserUser };
            
            let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid, focusTokenUuid: workflow.token?.document?.uuid,source: "gm",type: "multiDialog" };
        
            result = await game.gps.handleDialogPromises({userDialogArgs, gmDialogArgs});
        } else {
            result = await game.gps.queryDialog("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid, focusTokenUuid: workflow.token?.document?.uuid,source:gmUser === browserUser ? "gm" : "user",type:"singleDialog"});
        }
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result || {};

        if (!userDecision) {
            return;
        }
        else if (userDecision) {
            let rollData = await new CONFIG.Dice.DamageRoll('1d6').evaluate();
            await MidiQOL.displayDSNForRoll(rollData, 'damageRoll');
            if(rollData.total >= 4) {
                let actorPlayer = MidiQOL.playerForActor(actor);
                let chatData = {
                user: actorPlayer?.id ?? game.user.id,
                speaker: ChatMessage.getSpeaker({ token: token }),
                content: game.i18n.format("GAMBITSPREMADES.ChatMessages.ArmorOfHexes.Success", {actorName: target.actor.name, itemName: item.name})
                };
                await ChatMessage.create(chatData);

                game.gps.forceAttackMiss(workflow, target);
            }
            else {
                let actorPlayer = MidiQOL.playerForActor(actor);
                let chatData = {
                user: actorPlayer?.id ?? game.user.id,
                speaker: ChatMessage.getSpeaker({ token: token }),
                content: game.i18n.format("GAMBITSPREMADES.ChatMessages.ArmorOfHexes.Failure", {actorName: target.actor.name, itemName: item.name})
                };
                await ChatMessage.create(chatData);
            }

            await game.gps.addReaction({actorUuid: `${actor.uuid}`});
        }
    }
}

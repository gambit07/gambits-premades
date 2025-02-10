export async function armorOfHexes({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "isAttacked") {
        let target = workflow.targets.first();
        if(item.parent.uuid !== target.actor.uuid) return;
        if (MidiQOL.hasUsedReaction(target.actor)) return;
        if (target.actor.system.attributes.ac.value > workflow.attackTotal) return;

        let dialogId = "armorofhexes";
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
                                <p class="gps-dialog-paragraph">Would you like to use Armor of Hexes to try and avoid this attack?</p>
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
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result;

        if (!userDecision) {
            return;
        }
        else if (userDecision) {
            let rollData = await new CONFIG.Dice.DamageRoll('1d6').evaluate();
            await MidiQOL.displayDSNForRoll(rollData, 'damageRoll');
            if(rollData.total >= 4) {
                let actorPlayer = MidiQOL.playerForActor(actor);
                let chatData = {
                user: actorPlayer.id,
                speaker: ChatMessage.getSpeaker({ token: token }),
                content: `${target.actor.name} used Armor of Hexes and successfully avoided the attack.`
                };
                ChatMessage.create(chatData);

                let reroll = await new Roll(`-99`).evaluate();
                await workflow.setAttackRoll(reroll);
            }
            else {
                let actorPlayer = MidiQOL.playerForActor(actor);
                let chatData = {
                user: actorPlayer.id,
                speaker: ChatMessage.getSpeaker({ token: token }),
                content: `${target.actor.name} used Armor of Hexes but was unable to avoid the attack.`
                };
                ChatMessage.create(chatData);
            }

            await game.gps.addReaction({actorUuid: `${actor.uuid}`});
        }
    }
}
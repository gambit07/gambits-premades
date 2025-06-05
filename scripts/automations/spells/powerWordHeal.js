export async function powerWordHeal({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "postPreambleComplete") {
        const targets = workflow.targets;
        let gmUser = game.gps.getPrimaryGM();
        for(let target of targets) {
            if(target.actor.system.details?.type?.value === "construct" || target.actor.system.details?.type?.value === "undead") {
                ui.notifications.warn("The target is an undead or construct and is not effected");
                workflow.targets.delete(target);
                continue;
            }

            let isCharmed = target.document.hasStatusEffect("charmed");
            if(isCharmed) await game.gps.socket.executeAsUser("gmToggleStatus", gmUser, {tokenUuid: `${target.document.uuid}`, status: "charmed", active: false });
            let isFrightened = target.document.hasStatusEffect("frightened");
            if(isFrightened) await game.gps.socket.executeAsUser("gmToggleStatus", gmUser, {tokenUuid: `${target.document.uuid}`, status: "frightened", active: false });
            let isParalyzed = target.document.hasStatusEffect("paralyzed");
            if(isParalyzed) await game.gps.socket.executeAsUser("gmToggleStatus", gmUser, {tokenUuid: `${target.document.uuid}`, status: "paralyzed", active: false });
            let isStunned = target.document.hasStatusEffect("stunned");
            if(isStunned) await game.gps.socket.executeAsUser("gmToggleStatus", gmUser, {tokenUuid: `${target.document.uuid}`, status: "stunned", active: false });

            let currentHP = target.actor.system.attributes.hp.value
            let maxHP = target.actor.system.attributes.hp.max;
            let remainingHP = maxHP - currentHP;

            let healRoll = await new CONFIG.Dice.DamageRoll(`${remainingHP}`, {}, {type: "healing", properties: ["mgc"]}).evaluate();

            const itemData = {
                name: "Power Word Healing",
                type: "feat",
                img: item.img
            }

            await new MidiQOL.DamageOnlyWorkflow(actor, token, healRoll.total, "healing", [target], healRoll, {itemData: itemData, flavor: "Power Word Healing"});

            let isProne = target.document.hasStatusEffect("prone");
            if(!isProne) return;

            let dialogId = "powerwordheal";
            let dialogTitleGM = `Waiting for ${target.actor.name}'s selection | ${item.name}`;
            let dialogTitlePrimary = `${target.actor.name} | ${item.name}`;
            let browserUser = game.gps.getBrowserUser({ actorUuid: target.actor.uuid });
            let result;
            let initialTimeLeft = 15;

            let dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <div>
                                <div class="gps-dialog-flex">
                                    <p class="gps-dialog-paragraph">Would you like to use your reaction to get up from Prone?</p>
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
                await game.gps.socket.executeAsUser("gmToggleStatus", gmUser, {tokenUuid: `${target.document.uuid}`, status: "prone", active: false });
                await game.gps.addReaction({actorUuid: target.actor.uuid});
            }
        }
    }
}
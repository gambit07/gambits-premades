export async function rodOfThePactKeeper({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    const spellLevel = actor.system.spells.pact.value;
    const spellMax = actor.system.spells.pact.max;


    if (spellLevel === spellMax) {
    ui.notifications.warn("You have no appropriate spell slot to recover");
    await item.update({ "system.uses.value": 1 });
    return;
    }

    const spellLevelNew = spellLevel + 1;

    let dialogId = "rodofthepactkeeper";
    let dialogTitlePrimary = `${token.actor.name} | ${item.name}`;
    let browserUser = game.gps.getBrowserUser({ actorUuid: actor.uuid });
    let gmUser = game.gps.getPrimaryGM();

    let dialogContent = `
        <div class="gps-dialog-container">
            <div class="gps-dialog-section">
                <div class="gps-dialog-content">
                    <div>
                        <div class="gps-dialog-flex">
                            <p class="gps-dialog-paragraph">Would you like to use your action to recover a spell slot?</p>
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

    let result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft: 30,validTokenPrimaryUuid: token.document.uuid,source:gmUser === browserUser ? "gm" : "user",type:"singleDialog"});
        
    const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result;

    if (!userDecision) {
        return;
    }
    else if (userDecision) {
        await actor.update({ "system.spells.pact.value": spellLevelNew });
        const message = spellLevelNew === 1 ? "Spell slot recovered! You now have 1 pact spell remaining." : `Spell slot recovered! You now have ${spellLevelNew} pact spells remaining.`;
        ui.notifications.info(message);
    }
}
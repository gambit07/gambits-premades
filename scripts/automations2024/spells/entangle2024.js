export async function entangle2024({ tokenUuid, regionUuid, regionScenario, speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args?.[0].macroPass === "postSave")
    {
        const template = await fromUuid(workflow.templateUuid);
        const targets = Array.from(workflow.failedSaves);

        for (let target of targets) {
            if(target.document.uuid === token.document.uuid) continue;
            const hasEffectApplied = target.document.hasStatusEffect("restrained");

            if (!hasEffectApplied) {
                await game.gps.socket.executeAsGM("gmToggleStatus", {tokenUuid: `${target.document.uuid}`, status: "restrained", active: true });
            }
        }

        await game.gps.animation.entangle({template, itemUuid: workflow.item.uuid, targets, token});
    }

    if(regionScenario === "tokenTurnStart") {
        if(!tokenUuid || !regionUuid || !regionScenario) {
            if(debugEnabled) console.error(`No Region or Token found for ${itemName}`);
            return;
        }

        let region = await fromUuid(regionUuid);
        let tokenDocument = await fromUuid(tokenUuid);
        let token = tokenDocument?.object;
        actor = tokenDocument.actor;
        item = await fromUuid(region.flags["region-attacher"].itemUuid);

        const hasEffectApplied = actor.appliedEffects.find(e => e.name === "Restrained");
        if(!hasEffectApplied) return;

        let dialogId = "entangle";
        let dialogTitlePrimary = `${token.actor.name} | ${item.name}`;
        let browserUser = game.gps.getBrowserUser({ actorUuid: actor.uuid });
        let gmUser = game.gps.getPrimaryGM();

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">Would you like to use your action to make a Athletics ability check to escape being Restrained?</p>
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
        
        let result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft: 30,validTokenPrimaryUuid: tokenDocument.uuid,source:gmUser === browserUser ? "gm" : "user",type:"singleDialog"});
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result || {};

        if (!userDecision) {
            return;
        }
        else if (userDecision) {
            const saveResult = await game.gps.gpsActivityUse({itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: tokenDocument.uuid});

            if (saveResult.failedSaves.size === 0)
            {
                const hasEffectApplied = tokenDocument.hasStatusEffect("restrained");

                if (hasEffectApplied) {
                    await game.gps.socket.executeAsGM("gmToggleStatus", {tokenUuid: `${tokenDocument.uuid}`, status: "restrained", active: false });
                }

                Sequencer.EffectManager.endEffects({ name: `${tokenDocument.id}Entangle`, object: token });
            }
        }
    }

    if(regionScenario === "tokenExits") {
        let tokenDocument = await fromUuid(tokenUuid);
        const hasEffectApplied = tokenDocument.hasStatusEffect("restrained");

        if (hasEffectApplied) {
            await game.gps.socket.executeAsGM("gmToggleStatus", {tokenUuid: `${tokenDocument.uuid}`, status: "restrained", active: false });
        }

        Sequencer.EffectManager.endEffects({ name: `${tokenDocument.id}Entangle`, object: token });
    }
}
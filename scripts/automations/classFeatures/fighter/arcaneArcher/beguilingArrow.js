export async function beguilingArrow({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "postSave") {
        let target = workflow.failedSaves.first();
        if(!target) return;
        const allies = canvas.tokens.placeables.filter(t => t.document.disposition === token.document.disposition && MidiQOL.canSee(token, t) && MidiQOL.computeDistance(token, t, {wallsBlock: true, includeCover: true}) <= 30);

        const allyUuids = allies.map(t => t.actor.uuid);
        const allyNames = allies.map(t => t.actor.name);

        if (allyUuids.length === 0) return;

        let dialogId = "beguilingarrow";
        let dialogTitlePrimary = `${token.actor.name} | ${item.name}`;
        let browserUser = game.gps.getBrowserUser({ actorUuid: actor.uuid });
        const optionBackground = (document.body.classList.contains("theme-dark")) ? 'black' : 'var(--color-bg)';
        let gmUser = game.gps.getPrimaryGM();

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <p class="gps-dialog-paragraph">Select which ally you would like the target to be Charmed by.</p>
                        <div>
                            <div class="gps-dialog-flex">
                                <label for="ally-token" class="gps-dialog-label"Ally:</label>
                                <select id="ally-token" class="gps-dialog-select">
                                    ${allyNames.map((name, index) => `<option class="gps-dialog-option" style="background-color: ${optionBackground};" value="${allyUuids[index]}">${name}</option>`).join('')}
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
        
        let result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft: 30,validTokenPrimaryUuid: token.document.uuid,source:gmUser === browserUser ? "gm" : "user",type:"singleDialog"});
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result;

        if (!userDecision) {
            return;
        }
        else if (userDecision) {
            let allyToken = await fromUuid(allyTokenUuid);

            let effectData = [
                {
                    "icon": "systems/dnd5e/icons/svg/statuses/charmed.svg",
                    "origin": `${allyToken.actor.uuid}`,
                    "disabled": false,
                    "name": "Charmed",
                    "transfer": false,
                    "flags": {
                        "dae": {
                            "specialDuration": [
                                "turnStartSource"
                            ]
                        }
                    }
                }
            ];
            await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: allyToken.actor.uuid, effects: effectData });

            let content = `<span style='text-wrap: wrap;'>You use Beguiling Arrow and cause the target to be Charmed by ${allyToken.actor.name}.<br/><img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`;

            let actorPlayer = MidiQOL.playerForActor(actor);
            let chatData = {
                user: actorPlayer.id,
                speaker: ChatMessage.getSpeaker({ token: token }),
                content: content
            };
            ChatMessage.create(chatData);

            let contentAlly = `<span style='text-wrap: wrap;'>${actor.name} used Beguiling Arrow and caused their target to be Charmed by you. This effect ends if you attack it, deal damage to it, or force it to make a saving throw.<br/><img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`;

            let actorPlayerAlly = MidiQOL.playerForActor(allyToken.actor);
            let chatDataAlly = {
                user: actorPlayerAlly.id,
                speaker: ChatMessage.getSpeaker({ token: allyToken }),
                content: contentAlly
            };
            ChatMessage.create(chatDataAlly);
        }
    }

    if(args[0].macroPass === "prePreambleComplete") {
        let itemUses = actor.items.find(i => i.flags["gambits-premades"].gpsUuid === "62e57050-5c6e-4fb1-82d2-ea9a289e7cf9");
        if(itemUses.system.uses?.spent >= itemUses.system.uses?.max) {
            ui.notifications.warn("You have no Arcane Shot uses remaining");
            return workflow.aborted = true;
        }
        let itemValid = await actor.getFlag('gambits-premades', `arcaneShotValid`);
        if(!itemValid) {
            ui.notifications.warn("You must have hit with a bow prior to using this feature.");
            return workflow.aborted = true;
        }
    }
}
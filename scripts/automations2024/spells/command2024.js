export async function command2024({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "postSavesComplete" && workflow.failedSaves) {
        let targets = workflow.failedSaves;

        await foundry.applications.api.DialogV2.wait({
            window: { title: game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.Spells.Command.WindowTitle") },
            content: `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                <div class="gps-dialog-content">
                    <p class="gps-dialog-paragraph">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.Spells.Command.Prompts.SelectCommand")}</p>
                    <div>
                    <div class="gps-dialog-flex">
                        <select class="gps-dialog-select" name="commandSelect" id="commandSelect" autofocus>
                            <option value="Approach">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations2024.Spells.Command2024.Approach")}</option>
                            <option value="Drop">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations2024.Spells.Command2024.Drop")}</option>
                            <option value="Flee">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations2024.Spells.Command2024.Flee")}</option>
                            <option value="Grovel">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations2024.Spells.Command2024.Grovel")}</option>
                            <option value="Halt">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations2024.Spells.Command2024.Halt")}</option>
                        </select>
                        <div id="image-container" class="gps-dialog-image-container">
                        <img src="${workflow.item.img}" class="gps-dialog-image">
                        </div>
                    </div>
                    </div>
                </div>
                </div>
            </div>
            `,
            buttons: [{
            action: "Cast",
            label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Cast"),
            default: true,
            callback: async (event, button, dialog) => {
                const selected = document.querySelector('#commandSelect').value;
                for (let target of targets) {
                await MidiQOL.socket().executeAsGM('_gmSetFlag', {
                    actorUuid: target.actor.uuid,
                    base: 'gambits-premades',
                    key: 'commandWord',
                    value: selected
                });
                }
            }
            }],
            close: async (event, dialog) => { return; },
            rejectClose: false
        });
    }
    else if(args[0] === "off") {
        let wordInput = await actor.getFlag("gambits-premades", "commandWord")
        let content = game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.Spells.Command.MustNow", { actorName: actor.name, wordInput: wordInput });
        let actorPlayer = MidiQOL.playerForActor(actor);
        let chatData = {
            user: actorPlayer.id,
            speaker: ChatMessage.getSpeaker({ token: token }),
            content: content
        };
        ChatMessage.create(chatData);

        const style = {
            "fill": "#ffffff",
            "fontFamily": "Helvetica",
            "fontSize": 50,
            "strokeThickness": 0,
            fontWeight: "bold"
        }

        let delay = 0;
        const delayIncrement = 500;

        wordInput.split('').forEach((char, index) => {
            new Sequence()
                .effect()
                .atLocation(token, {
                    offset: { x: index * 0.35 - (wordInput.length - 1) * 0.18, y: -0.7 * token.document.height },
                    randomOffset: 0.1,
                    gridUnits: true
                })
                .text(char, style)
                .delay(delay)
                .duration(6000)
                .fadeOut(1500)
                .animateProperty("sprite", "position.y", {
                    from: -1.5 * token.document.height,
                    to: -0.2 * token.document.height,
                    duration: 2000,
                    gridUnits: true,
                    ease: "easeInExpo"
                })
                .scaleIn(0, 1500, { ease: "easeOutElastic" })
                .filter("Glow", { color: 0x4169E1 })
                .zIndex(100 + index)
                .play();

            delay += delayIncrement;
        });

        MidiQOL.socket().executeAsGM('_gmUnsetFlag', { actorUuid : actor.uuid, base : 'gambits-premades', key : 'commandWord' })
    }
}
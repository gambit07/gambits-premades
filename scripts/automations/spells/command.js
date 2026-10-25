import {commandExpiredAtTurnStart} from "../../utils/rulesReviewUtils.js";

export async function command({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "postSavesComplete" && workflow.failedSaves?.size) {

        const selection = await game.gps.showAutomationDialog({
            focusTokenUuid: workflow.failedSaves.size === 1 ? workflow.failedSaves.first().document.uuid : false,
            window: { title: game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.Spells.Command.WindowTitle") },
            content: `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <p class="gps-dialog-paragraph">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.Spells.Command.Prompts.SingleWord")}</p>
                            <div>
                                <div class="gps-dialog-flex">
                                    <div style='width: 100%; text-align: center;'>
                                        <input type="text" name="wordInput" id="wordInput" required pattern="\\s*\\S+\\s*" autofocus>
                                    </div>
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
                    let wordInput = button.form.elements.wordInput.value;
                    (workflow.gps ??= {}).commandWord = wordInput.trim();
                }
            }],
            close: async (event, dialog) => {
                return;
            }, rejectClose:false
        });
        if(!selection) workflow.aborted = true;
    }
    else if(args[0]?.macroPass === "postActiveEffects") {
        const word = workflow.gps?.commandWord;
        if(!word) return;
        for(const target of workflow.failedSaves ?? []) {
            const effect = target.actor.effects.filter(effect => effect.flags?.["gambits-premades"]?.command && DAE.effectMatchesSource(effect, item.uuid)).at(-1);
            if(effect) await MidiQOL.socket().executeAsGM("updateEffects", {actorUuid: target.actor.uuid, updates: [{_id: effect.id, "flags.gambits-premades.commandWord": word}]});
        }
    }
    else if(args[0] === "off") {
        const context = args.at(-1);
        if(!commandExpiredAtTurnStart(context?.effectUuid)) return;
        const wordInput = context?.efData?.flags?.["gambits-premades"]?.commandWord;
        if(!wordInput) return;
        let content = game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.Spells.Command.MustNow", { actorName: actor.name, wordInput: foundry.utils.escapeHTML(wordInput) });
        let actorPlayer = MidiQOL.playerForActor(actor);
        let chatData = {
            user: actorPlayer?.id ?? game.user.id,
            speaker: ChatMessage.getSpeaker({ actor, token }),
            content: content
        };
        await ChatMessage.create(chatData);
        if(!token || !game.gps.getCprConfig({itemUuid: item.uuid}).animEnabled) return;

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


    }
}

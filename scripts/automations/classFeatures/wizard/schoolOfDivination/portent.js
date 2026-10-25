export async function portent({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args?.[0].macroPass === "preActiveEffects") {
        let description = item.system.description.value;

        function extractPortentRolls(description) {
            let parser = new DOMParser();
            let doc = parser.parseFromString(description, 'text/html');
            let portentRollDivs = [];
            doc.querySelectorAll("[id^='Portent Roll']").forEach(div => {
                portentRollDivs.push(div);
            });
            return portentRollDivs;
        }

        let portentRollDivs = extractPortentRolls(description);
        if(!portentRollDivs || portentRollDivs.length === 0) return workflow.aborted = true;

        function generatePortentRollButtons() {
            let buttons = [];
            portentRollDivs.forEach((divContent, index) => {
                let parser = new DOMParser();
                let doc = parser.parseFromString(divContent.innerHTML, 'text/html');
                let span = doc.querySelector("[id^='portentRoll']");
                let roll = span?.textContent.trim() ?? "";

                if(!roll || !Number.isFinite(Number(roll))) return;
                const label = game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Wizard.SchoolOfDivination.Portent.Roll", {number: Number(divContent.id.match(/\d+$/)?.[0]) || index + 1});
                buttons.push({
                action: `${divContent.id} | ${roll}`,
                label: `${label} | ${roll}`,
                callback: async (html) => {
                    const current = new DOMParser().parseFromString(item.system.description.value, "text/html");
                    const entry = current.getElementById(divContent.id);
                    if(!entry) return false;
                    entry.remove();
                    const newDescription = current.body.innerHTML;

                    await actor.updateEmbeddedDocuments("Item", [{
                    _id: item.id,
                    system: {
                        description: {
                        value: newDescription
                        }
                    }
                    }]);
                    
                    const chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Wizard.SchoolOfDivination.Portent.PortentApplied", { portentLabel: label, roll: roll })}</span>`;
                    await game.gps.replaceChatCard({ actorUuid: actor.uuid, itemUuid: item.uuid, itemCardUuid: workflow.itemCardUuid, chatContent });
                }
                });
            });
            return buttons;
        }

        const choices = generatePortentRollButtons();
        if(!choices.length) return void (workflow.aborted = true);
        const selection = await game.gps.showAutomationDialog({
            window: { title: game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Wizard.SchoolOfDivination.Portent.Windowtitle") },
            content: `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <div>
                                <div class="gps-dialog-flex">
                                    <p class="gps-dialog-paragraph">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Wizard.SchoolOfDivination.Portent.SelectPortentRoll")}</p>
                                    <div id="image-container" class="gps-dialog-image-container">
                                        <img src="${item.img}" class="gps-dialog-image">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            buttons: choices,
            close: async (event, dialog) => {
                return;
            }, rejectClose:false
        });
        if(!selection) workflow.aborted = true;
    }

    else if(args?.[0] === "off") {
        let diceNum = actor.classes.wizard.system.levels >= 14 ? 3 : 2;
        let diceResult = game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Wizard.SchoolOfDivination.Portent.Rolls") + "<br><br>";
        
        for (let i = 1; i <= diceNum; i++) {
            let roll = await game.gps.gpsActivityUse({itemUuid: item.uuid, identifier: "syntheticRoll", targetUuid: token.document.uuid});

            let result = roll?.utilityRolls?.total;
            
            diceResult += `<div id="Portent Roll ${i}">${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Wizard.SchoolOfDivination.Portent.PortentRoll", { i: i })} <b><span id="portentRoll${i}">${result}</span></b></div>`;
        }

        diceResult += '<br><div id="endPortentRolls"></div>';

        let actorPlayer = MidiQOL.playerForActor(actor);
        let chatData = {
            speaker: ChatMessage.getSpeaker(),
            content: diceResult,
            whisper: [actorPlayer?.id ?? game.gps.getPrimaryGM()].filter(Boolean)
        };
        await ChatMessage.create(chatData);

        let existingDescription = item.system.description.value;
        let markerIndex = existingDescription.indexOf('<div id="endPortentRolls"></div>');
        let newDescription = diceResult + (markerIndex !== -1 ? existingDescription.substring(markerIndex + '<div id="endPortentRolls"></div>'.length) : existingDescription);

        await actor.updateEmbeddedDocuments("Item", [{
            _id: item.id,
            system: {
                description: {
                    value: newDescription
                }
            }
        }]);

        let effectData = Array.from(actor.allApplicableEffects()).find(e => e.name === item.name);
        await effectData?.update({"disabled": false});
    }
}
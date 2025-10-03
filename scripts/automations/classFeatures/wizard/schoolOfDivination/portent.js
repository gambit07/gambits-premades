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
                let roll = span ? span.innerText : "N/A";

                buttons.push({
                action: `${divContent.id} | ${roll}`,
                label: `${divContent.id} | ${roll}`,
                callback: async (html) => {
                    const divId = `${divContent.id}`;
                    const regex = new RegExp(`<div id="${divId}">[\\s\\S]*?<\\/div>`, 'g');

                    let newDescription = description.replace(regex, '');

                    await actor.updateEmbeddedDocuments("Item", [{
                    _id: item.id,
                    system: {
                        description: {
                        value: newDescription
                        }
                    }
                    }]);
                    
                    const chatMessage = MidiQOL.getCachedChatMessage(workflow.itemCardUuid);
                    let content = foundry.utils.duplicate(chatMessage.content);
                    let searchString = /<div class="midi-qol-attack-roll">[\s\S]*<div class="end-midi-qol-attack-roll">/g;
                    let replaceString = `<div class="midi-qol-attack-roll"><span style='text-wrap: wrap;'>You used ${divContent.id} and changed the dice result to ${roll}.</span><div class="end-midi-qol-attack-roll">`;
                    content = content.replace(searchString, replaceString);
                    await chatMessage.update({ content: content });
                }
                });
            });
            return buttons;
        }

        await foundry.applications.api.DialogV2.wait({
            window: { title: 'Portent Roll Selection' },
            content: `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <div>
                                <div class="gps-dialog-flex">
                                    <p class="gps-dialog-paragraph">Which portent roll would you like to use?</p>
                                    <div id="image-container" class="gps-dialog-image-container">
                                        <img src="${item.img}" class="gps-dialog-image">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            buttons: generatePortentRollButtons(),
            close: async (event, dialog) => {
                return;
            }, rejectClose:false
        });
    }

    else if(args?.[0] === "off") {
        let diceNum = actor.classes.wizard.system.levels >= 14 ? 3 : 2;
        let diceResult = "Your portent rolls are:<br><br>";
        
        for (let i = 1; i <= diceNum; i++) {
            let roll = await new CONFIG.Dice.D20Roll('1d20').evaluate();
            await MidiQOL.displayDSNForRoll(roll, 'damageRoll');
            let result = roll.dice[0].results[0].result;
            
            diceResult += `<div id="Portent Roll ${i}">- Portent Roll ${i}: <b><span id="portentRoll${i}">${result}</span></b></div>`;
        }

        diceResult += '<br><div id="endPortentRolls"></div>';

        let actorPlayer = MidiQOL.playerForActor(actor);
        let chatData = {
            speaker: ChatMessage.getSpeaker(),
            content: diceResult,
            whisper: actorPlayer.id
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
        await effectData.update({"disabled": false});
    }
}
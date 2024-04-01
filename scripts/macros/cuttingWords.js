export async function cuttingWords({workflowData,workflowType}) {
    console.log(workflowData)
    const module = await import('../module.js');
    const socket = module.socket;
    const workflowUuid = workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowUuid);
    if(!workflow) return;
    if(workflow.item.name.toLowerCase() === "cutting words") return;
    
    if (!game.combat) return;

    // Check if Opportunity Attack is initiating the workflow
    if(workflow.item.name === "Opportunity Attack") return;

    function findCuttingWordsTokens(token, dispositionCheck) {
        let validTokens = game.combat.combatants.map(combatant => combatant.value).filter(t => {
            // Check if invalid token on the canvas
            if (!t.actor) return;

            // Check if the token has cutting words available
            if (!t.actor.items.find(i => i.name.toLowerCase() === "cutting words")) return;

            // Check if the tokens reaction already used
            let reactionUsed = t.actor.effects.find(i => i.name.toLowerCase() === "reaction");
            if (reactionUsed) return;
            
            // Check if the token is the initiating token or is not an opposite token disposition
            if (workflowType === "attack" || workflowType === "damage") {
                if (dispositionCheck(t, token)) return;
            }

            let midiSightTest = MidiQOL.canSee(t, token);
            
            if (midiSightTest === false) return;

            // Check if scene is gridless
            let gridDecision;
            canvas.scene.grid.type === 0 ? gridDecision = false : gridDecision = true;

            // Check if token is within 60 feet
            let distance = canvas.grid.measureDistance(token, t, { gridSpaces: gridDecision });
            if(distance > 60) return;

            // Check if the token has available uses of Cutting Words
            const itemNames = ["cutting words"];

            let resourceExistsWithValue = [t.actor.system.resources.primary, t.actor.system.resources.secondary, t.actor.system.resources.tertiary].some(resource =>
                itemNames.includes(resource?.label.toLowerCase()) && resource.value !== 0);
            let itemExistsWithValue;

            if (!resourceExistsWithValue) {
                itemExistsWithValue = !!t.actor.items.find(i => itemNames.includes(i.name.toLowerCase()) && i.system.uses.value !== 0);
            }

            if (!resourceExistsWithValue && !itemExistsWithValue) return;

            return t;
        });

    return validTokens;
    }

    let findCuttingWords = findCuttingWordsTokens(workflow.token, (checkedToken, initiatingToken) => {
        return checkedToken.id === initiatingToken.id || checkedToken.document.disposition === initiatingToken.document.disposition;
    });
    
    let browserUser;

    for (const validTokenPrimary of findCuttingWords) {
        let actorUuidPrimary = validTokenPrimary.actor.uuid;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | Cutting Words`;
        let originTokenUuidPrimary = workflow.token.document.uuid;
        let spellData = validTokenPrimary.actor.items.find(i => i.name.toLowerCase() === "cutting words");
        let bardicDie = validTokenPrimary.actor.system.scale.bard["bardic-inspiration"].die;
        browserUser = MidiQOL.playerForActor(validTokenPrimary.actor);
        if (!browserUser.active) {
            browserUser = game.users?.activeGM;
        }
        console.log("made it before damage")
        if(workflowType === "damage") {
            console.log(workflow, "damage cutting words")
               if (workflow.token.document.disposition === validTokenPrimary.document.disposition) return;
               let damageTypes = workflow.damageRoll.dice.map(die => die.flavor);
               const {cuttingWordsDecision, damageChosen} = await socket.executeAsUser("showCuttingWordsDialog", browserUser.id, originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitlePrimary, originTokenUuidPrimary, "damage", damageTypes);
               if (cuttingWordsDecision === false || !cuttingWordsDecision) continue;
               if (cuttingWordsDecision === true) {
                   const saveSetting = workflow.options.noOnUseMacro;
                   workflow.options.noOnUseMacro = true;
                   let reroll = await new Roll(`1${bardicDie}`).roll({async: true});
                   await MidiQOL.displayDSNForRoll(reroll, 'damageRoll');
                   let damageRoll = workflow.damageRoll;
                   let damageIndex = damageRoll.dice.findIndex(die => die.flavor === damageChosen);
                   if (damageIndex !== -1) {
                    let formulas = damageRoll.terms.filter(term => typeof term === 'string' || term instanceof Die);

                    let adjustedFormula = formulas.map(term => {
                        if (term instanceof Die && term.flavor === damageChosen) {
                            return `${term.number}d${term.faces}[${term.flavor}] - ${reroll.total}`;
                        } else {
                            return term.formula ? term.formula : term;
                        }
                    }).join(" + ");
                
                    let newRoll = await new Roll(adjustedFormula).roll({async: true});
                    await workflow.setDamageRoll(newRoll);
                    }

                   workflow.options.noOnUseMacro = saveSetting;

                    let chatList = [];

                    chatList = `The creature takes a cutting word, and their damage is reduced by ${reroll.total}. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px">`;

                    let msgHistory = [];
                    game.messages.reduce((list, message) => {
                        if (message.flags["midi-qol"]?.itemId === spellData._id && message.speaker.token === validTokenPrimary.id) msgHistory.push(message.id);
                    }, msgHistory);
                    let itemCard = msgHistory[msgHistory.length - 1];
                    let chatMessage = await game.messages.get(itemCard);
                    let content = await duplicate(chatMessage.content);
                    let insertPosition = content.indexOf('<div class="end-midi-qol-attack-roll"></div>');
                    if (insertPosition !== -1) {
                        content = content.slice(0, insertPosition) + chatList + content.slice(insertPosition);
                    }
                    await chatMessage.update({ content: content });
           }
        }

            if(workflowType === "attack") {
                //if(workflow.isCritical === true || workflow.isFumble === true) return;
                if (workflow.token.document.disposition === validTokenPrimary.document.disposition) return;
                const {cuttingWordsDecision} = await socket.executeAsUser("showCuttingWordsDialog", browserUser.id, originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitlePrimary, originTokenUuidPrimary, "attack");
                if (cuttingWordsDecision === false || !cuttingWordsDecision) continue;
                if (cuttingWordsDecision === true) {
                    let targetAC = workflow.hitTargets.first().actor.system.attributes.ac.value;
                    const saveSetting = workflow.options.noOnUseMacro;
                    workflow.options.noOnUseMacro = true;
                    let reroll = await new Roll(`1${bardicDie}`).roll({async: true});
                    await MidiQOL.displayDSNForRoll(reroll, 'damageRoll');
                    let rerollNew = await new Roll(`${workflow.attackRoll.result} - ${reroll.total}`).roll({async: true});
                    await workflow.setAttackRoll(rerollNew);
                    workflow.options.noOnUseMacro = saveSetting;

                    if((workflow.attackTotal - reroll.total) < targetAC) {
                        let chatList = [];

                        chatList = `The creature takes a cutting word, and failed their attack. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px">`;

                        let msgHistory = [];
                        game.messages.reduce((list, message) => {
                            if (message.flags["midi-qol"]?.itemId === spellData._id && message.speaker.token === validTokenPrimary.id) msgHistory.push(message.id);
                        }, msgHistory);
                        let itemCard = msgHistory[msgHistory.length - 1];
                        let chatMessage = await game.messages.get(itemCard);
                        let content = await duplicate(chatMessage.content);
                        let insertPosition = content.indexOf('<div class="end-midi-qol-attack-roll"></div>');
                        if (insertPosition !== -1) {
                            content = content.slice(0, insertPosition) + chatList + content.slice(insertPosition);
                        }
                        await chatMessage.update({ content: content });
                    }

                    else {
                        let chatList = [];

                        chatList = `The creature takes a cutting word, but were still able to hit their target. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px">`;

                        let msgHistory = [];
                        game.messages.reduce((list, message) => {
                            if (message.flags["midi-qol"]?.itemId === spellData._id && message.speaker.token === validTokenPrimary.id) msgHistory.push(message.id);
                        }, msgHistory);
                        let itemCard = msgHistory[msgHistory.length - 1];
                        let chatMessage = await game.messages.get(itemCard);
                        let content = await duplicate(chatMessage.content);
                        let insertPosition = content.indexOf('<div class="end-midi-qol-attack-roll"></div>');
                        if (insertPosition !== -1) {
                            content = content.slice(0, insertPosition) + chatList + content.slice(insertPosition);
                        }
                        await chatMessage.update({ content: content });
                    }
            }
        }
    }
}

export async function showCuttingWordsDialog(tokenUuids, actorUuid, tokenUuid, dialogTitle, targetNames, outcomeType, damageTypes) {
    return await new Promise(resolve => {
        const initialTimeLeft = Number(game.settings.get('gambits-premades', 'Cutting Words Timeout'));
        let dialogContent;

        if(outcomeType === "attack") {
        dialogContent = `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 5px; background-color: transparent; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="flex-grow: 1; margin-right: 20px;">
                    <p>Would you like to use your reaction to use Cutting Words for this ${outcomeType} roll?</p>
                </div>
                <div style="display: flex; flex-direction: column; justify-content: center; padding-left: 20px; border-left: 1px solid #ccc; text-align: center;">
                    <p><b>Time Remaining</b></p>
                    <p><span id="countdown" style="font-size: 16px; color: red;">${initialTimeLeft}</span> seconds</p>
                </div>
            </div>
        `;
        }

        if(outcomeType === "damage") {
            dialogContent = `
                <div style='display: flex; flex-direction: column; align-items: start; justify-content: center; padding: 10px;'>
                    <div style='margin-bottom: 20px;'>
                        <p style='margin: 0; font-weight: bold;'>Would you like to use your reaction to use Cutting Words for this ${outcomeType} roll?</p>
                    </div>
                    <div style='display: flex; width: 100%; gap: 20px;'>
    
                            <div style='flex-grow: 1; display: flex; flex-direction: column;'>
                                <p style='margin: 0 0 10px 0;'>Choose damage type to cut:</p>
                                <select id="damageSelection" style="padding: 4px; width: 100%; box-sizing: border-box; border-radius: 4px; border: 1px solid #ccc;">
                                    ${damageTypes.map((name, index) => `<option value="${name}">${name}</option>`).join('')}
                                </select>
                            </div>
                    </div>
                    <div style='padding-top: 20px; text-align: center; width: 100%;'>
                        <p><b>Time remaining</b></p>
                        <p><span id='countdown' style='font-size: 16px; color: red;'>${initialTimeLeft}</span> seconds</p>
                    </div>
                </div>
            `;
            }

        let dialogInteraction = undefined;
        let timer;

        let dialog = new Dialog({
            title: dialogTitle,
            content: dialogContent,
            buttons: {
                yes: {
                    label: "Yes",
                    callback: async (html) => {
                        dialogInteraction = true;
                        let actor = await fromUuid(actorUuid);
                        let uuid = actor.uuid;
                        let originToken;
                        originToken = await fromUuid(tokenUuids);
                        originToken = await MidiQOL.tokenForActor(originToken.actor.uuid);
                        let damageChosen = html.find("#damageSelection").val()

                        let chosenSpell = actor.items.find(i => i.name.toLowerCase() === "cutting words");

                        chosenSpell.prepareData();
                        chosenSpell.prepareFinalAttributes();

                        const options = {
                            showFullCard: false,
                            createWorkflow: true,
                            versatile: false,
                            configureDialog: true,
                            targetUuids: [originToken.document.uuid],
                        };

                        const itemRoll = await MidiQOL.completeItemUse(chosenSpell, {}, options);

                        const hasEffectApplied = await game.dfreds.effectInterface.hasEffectApplied('Reaction', uuid);

                        if (!hasEffectApplied) {
                            game.dfreds.effectInterface.addEffect({ effectName: 'Reaction', uuid });
                        }

                        if(itemRoll.aborted === true) return resolve({ cuttingWordsDecision: false });

                        let hasDeafened = originToken.actor.effects.find(i => i.name.toLowerCase() === "deafened");
                        if (hasDeafened) return resolve({ cuttingWordsDecision: false });
            
                        let charmImmunity = originToken.actor.system.traits.ci.value.has("charmed");
                        if (charmImmunity) return resolve({ cuttingWordsDecision: false });
                        
                        let cuttingWordsDecision = true;

                        resolve({cuttingWordsDecision, damageChosen});
                    }
                },
                no: {
                    label: "No",
                    callback: async () => {
                        // Reaction Declined
                        dialogInteraction = true;
                        resolve({ cuttingWordsDecision: false});
                    }
                },
            }, default: "no",
            render: (html) => {
                let timeLeft = initialTimeLeft;
                const countdownElement = html.find("#countdown");
                timer = setInterval(() => {
                    timeLeft--;
                    countdownElement.text(timeLeft);
                    if (timeLeft <= 0) {
                        dialog.data.buttons.no.callback();
                        dialog.close();
                    }
                }, 1000);
            },
            close: () => {
                clearInterval(timer);
                if (dialogInteraction === undefined) resolve({ cuttingWordsDecision: false });
            }
        });
        dialog.render(true);
    })
}
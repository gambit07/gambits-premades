export async function elementalAffinity2024({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "postDamageRoll") {
        if(workflow.item.type !== "spell") return;
        item = await actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "1c11dbbe-c4f3-4208-9449-c025d6a34218");
        let damageType = await item.getFlag("gambits-premades", "elementalAffinityType") ?? null;
        let browserUser = game.gps.getBrowserUser({ actorUuid: actor.uuid });
        let gmUser = game.gps.getPrimaryGM();

        if(!damageType) {
            await foundry.applications.api.DialogV2.wait({
                window: { title: 'Elemental Affinity Damage' },
                content: `
                    <div class="gps-dialog-container">
                        <div class="gps-dialog-section">
                            <div class="gps-dialog-content">
                                <div>
                                    <div class="gps-dialog-flex">
                                        <p class="gps-dialog-paragraph">Which damage type did you choose for your Draconic Magic? This will determine your resistance type and extra damage type for spells.</p>
                                        <div id="image-container" class="gps-dialog-image-container">
                                            <img src="${item.img}" class="gps-dialog-image">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `,
                buttons: [{
                    action: "Acid",
                    label: "Acid",
                    callback: async (event, button, dialog) => {
                        await item.setFlag("gambits-premades", "elementalAffinityType", "acid");
                    }
                },
                {
                    action: "Cold",
                    label: "Cold",
                    callback: async (event, button, dialog) => {
                        await item.setFlag("gambits-premades", "elementalAffinityType", "cold");
                    }
                },
                {
                    action: "Fire",
                    label: "Fire",
                    callback: async (event, button, dialog) => {
                        await item.setFlag("gambits-premades", "elementalAffinityType", "fire");
                    }
                },
                {
                    action: "Lightning",
                    label: "Lightning",
                    callback: async (event, button, dialog) => {
                        await item.setFlag("gambits-premades", "elementalAffinityType", "lightning");
                    }
                },
                {
                    action: "Poison",
                    label: "Poison",
                    callback: async (event, button, dialog) => {
                        await item.setFlag("gambits-premades", "elementalAffinityType", "poison");
                    }
                }],
                close: async (event, dialog) => {
                    return;
                }, rejectClose:false
            });

            damageType = await item.getFlag("gambits-premades", "elementalAffinityType") ?? null;
            if(!damageType) return;

            if (!actor.system.traits.dr.value.has(damageType)) {
                const newDR = new Set(actor.system.traits.dr.value);
                newDR.add(damageType);
                await actor.update({ "system.traits.dr.value": Array.from(newDR) });
            }

            await ChatMessage.create({
                user: gmUser,
                whisper: [gmUser],
                speaker: ChatMessage.getSpeaker({ actor }),
                content: `⚠️ ${actor.name} chose ${damageType} damage for their Elemental Affinity ability, which has given them resistance to that type and the ability to do extra damage of that type.`
            });
        }

        if(!damageType) return;
        const damageSpell = workflow.activity?.damage?.parts?.flatMap(part => Array.from(part?.types ?? []));
        if (!damageSpell?.some(type => damageType.includes(type))) return;

        let targets = Array.from(workflow.targets);
        const targetUuids = targets.map(t => t.document.uuid);
        const targetNames = targets.map(t => t.document.name);
        let target = workflow.targets.first();

        if(targets.length > 1) {
            let initialTimeLeft = 15;
            let dialogId = "elementalaffinity";
            const dialogTitlePrimary = `${actor.name} | ${item.name}`;
            const dialogTitleGM = `Waiting for ${actor.name}'s selection | ${item.name}`;

            let dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <p class="gps-dialog-paragraph">Choose the enemy to receive additional ${damageType} damage from your Elemental Affinity below:</p>
                            <div>
                                <div class="gps-dialog-flex">
                                    <label for="enemy-token" class="gps-dialog-label">Target:</label>
                                    <select id="enemy-token" class="gps-dialog-select">
                                        ${targetNames.map((name, index) => `<option class="gps-dialog-option" value="${targetUuids[index]}">${name}</option>`).join('')}
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

            let result;
            
            if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
                let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft, validTokenPrimaryUuid: token.document.uuid, source: "user", type: "multiDialog", browserUser: browserUser };
                
                let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid, source: "gm", type: "multiDialog" };

                result = await game.gps.socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
            } else {
                result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: token.document.uuid, source: gmUser === browserUser ? "gm" : "user", type: "singleDialog"});
            }
                    
            const { userDecision, enemyTokenUuid, source, type } = result || {};

            if (userDecision) {
                let targetDocument = await fromUuid(enemyTokenUuid);
                target = targetDocument.object;
            }
        }

        let extraDamage = await new CONFIG.Dice.DamageRoll(`${actor.system.abilities.cha.mod}`, {}, {type: damageType, properties: ["mgc"]}).evaluate();

        const itemData = {
            name: `Elemental Affinity Damage - ${damageType}`,
            type: "feat",
            img: item.img
        }

        await new MidiQOL.DamageOnlyWorkflow(actor, token, extraDamage.total, damageType, [target], extraDamage, {itemData: itemData, flavor: `Elemental Affinity Damage - ${damageType}`});
    }
}
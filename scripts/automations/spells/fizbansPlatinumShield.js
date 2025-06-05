export async function fizbansPlatinumShield({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "postActiveEffects") {
        const fizbanChangeTarget = `
            if (args[0].macroPass === "preActiveEffects") {
            let currentTargetUuid = macroItem.getFlag("gambits-premades", "fizbansPlatShieldTarget");
            let currentTarget = await fromUuid(currentTargetUuid);
            if (!currentTarget) return macroItem.delete();
            
            const rangeCheck = MidiQOL.findNearby(null, token, 60, { includeToken: true });
            const withinRange = rangeCheck.filter(t => {
                const hasShield = t.actor.appliedEffects.some(e => e.name === "Fizban's Platinum Shield");
                return !hasShield && t.document.disposition === token.document.disposition;
            });
            
            if (withinRange.length > 0) {
                let dialogId = "fizbansplatinumshield";
                let dialogTitlePrimary = \`\${token.actor.name} | \${macroItem.name}\`;
                let browserUser = game.gps.getBrowserUser({ actorUuid: actor.uuid });
                let gmUser = game.gps.getPrimaryGM();
                
                let dialogContent = \`
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <p class="gps-dialog-paragraph">Who would you like to move Fizban's Platinum Shield to?</p>
                        <div>
                        <div class="gps-dialog-flex">
                            <label for="ally-token" class="gps-dialog-label">Advantage:</label>
                            \${withinRange.length >= 1
                            ? \`<select id="ally-token" class="gps-dialog-select">
                                \${withinRange.map(friendly => \`<option class="gps-dialog-option" value="\${friendly.document.uuid}">\${friendly.actor.name}</option>\`).join('')}
                                </select>\`
                            : '<div style="padding: 4px; width: 100%; box-sizing: border-box; line-height: normal;"> No valid allies in range.</div>'
                            }
                            <div id="image-container" class="gps-dialog-image-container">
                            <img id="img_\${dialogId}" src="\${macroItem.img}" class="gps-dialog-image">
                            </div>
                        </div>
                        </div>
                    </div>
                    </div>
                    <div class="gps-dialog-button-container">
                    <button id="pauseButton_\${dialogId}" type="button" class="gps-dialog-button">
                        <i class="fas fa-pause" id="pauseIcon_\${dialogId}" style="margin-right: 5px;"></i>Pause
                    </button>
                    </div>
                </div>
                \`;
                
                let result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {
                dialogTitle: dialogTitlePrimary,
                dialogContent,
                dialogId,
                initialTimeLeft: 30,
                validTokenPrimaryUuid: token.document.uuid,
                source: gmUser === browserUser ? "gm" : "user",
                type: "singleDialog"
                });
                
                const { userDecision, allyTokenUuid } = result || {};
                
                if (!userDecision) {
                return;
                } else {
                let returnedToken = await fromUuid(\`\${allyTokenUuid}\`);
                let currentEffect = currentTarget.actor.appliedEffects.find(e => e.name === "Fizban's Platinum Shield");
                
                let newEffect = await MidiQOL.socket().executeAsGM("createEffects", {
                    actorUuid: returnedToken.actor.uuid,
                    effects: [currentEffect]
                });
                
                let originItemUuid = macroItem.getFlag("gambits-premades", "fizbansPlatShieldItem");
                const concEffect = MidiQOL.getConcentrationEffect(actor, originItemUuid);
                await concEffect.addDependent(newEffect[0]);
                
                await MidiQOL.socket().executeAsGM("removeEffects", {
                    actorUuid: currentTarget.actor.uuid,
                    effects: [currentEffect.id]
                });

                Sequencer.EffectManager.endEffects({ name: \`\${currentTarget.id}.FizbansPlatinumShield\`\ });
                
                new Sequence()

                .effect()
                    .name(\`\${returnedToken.id}.FizbansPlatinumShield\`\)
                    .file('jb2a.markers.shield_rampart.loop.03.blue')
                    .attachTo(returnedToken,{bindVisibility: true})
                    .scaleToObject(1.7)
                    .opacity(0.85)
                    .zIndex(0)
                    .persist()
                    .belowTokens(true)
                    .fadeIn(2500)
                    .fadeOut(2500)

                .play()
                
                await macroItem.setFlag("gambits-premades", "fizbansPlatShieldTarget", returnedToken.uuid);
                await macroItem.update({ name: \`Fizban's Platinum Shield - Change Target (\${returnedToken.actor.name})\` });
                }
            }
            }
            `;
        let targets = workflow.targets;
        
        for(let target of targets) {
        let itemData = {
            "name": `Fizban's Platinum Shield - Change Target (${target.actor.name})`,
            "type": "feat",
            "img": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
            "origin": actor.uuid,
            "system": {
                "activation": {
                    "type": "bonus",
                    "cost": 1
                },
                "type": {
                    "value": "feat",
                    "subtype": ""
                },
                "activities": {
                    "fpsChangeTarget": {
                        "type": "utility",
                        "activation": {
                            "type": "bonus"
                        },
                        "duration": {
                            "units": "inst",
                            "concentration": false
                        },
                        "range": {
                            "units": "any"
                        },
                        "name": `Fizban's Platinum Shield - Change Target (${target.actor.name})`
                    }
                }
            },
            "flags": {
            "dae": {
                "macro": {
                    "name": "Fizban's Platinum Shield - Change Target",
                    "img": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
                    "type": "script",
                    "scope": "global",
                    "command": fizbanChangeTarget
                }
            },
            "midi-qol": {
                "onUseMacroName": "[preActiveEffects]ItemMacro"
            },
            "gambits-premades": {
                "fizbansPlatShieldTarget": target.document.uuid,
                "fizbansPlatShieldItem": item.uuid
            }
            },
        }
    
        await actor.createEmbeddedDocuments("Item", [itemData]);
    
        new Sequence()
    
        .effect()
        .name(`${target.document.id}.FizbansPlatinumShield`)
        .file("jb2a.markers.shield_rampart.loop.03.blue")
        .attachTo(target,{bindVisibility: true})
        .scaleToObject(1.7)
        .zIndex(0)
        .persist()
        .belowTokens(true)
        .fadeIn(2500)
        .fadeOut(2500)
    
        .play()
        }
    }
    
    if(args[0] === "off") {
        let gmUser = game.gps.getPrimaryGM();
        const effectOriginActor = await fromUuid(args[2]);
        let concData = await MidiQOL.getConcentrationEffect(effectOriginActor, args[3]);
    
        if(!concData) {
            let itemData = effectOriginActor.items.getName(`Fizban's Platinum Shield - Change Target (${actor.name})`);
            if(itemData) await game.gps.socket.executeAsUser("gmDeleteItem", gmUser, {itemUuid:itemData.uuid});
            Sequencer.EffectManager.endEffects({ name: `${token.document.id}.FizbansPlatinumShield` });
        }
    }
}
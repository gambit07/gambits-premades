export async function stormMote({ speaker, actor, token, character, item, args, scope, workflow, options, macroItem }) {
    if (args[0].macroPass === "postPreambleComplete") {
        let numMotes = (actor.system.details.level >= 17) ? 4 : (actor.system.details.level >= 11) ? 3 : (actor.system.details.level >= 5) ? 2 : 1;
        let totalAssignedMotes = 0;

        if(workflow.targets.size === 1) {
            await MidiQOL.socket().executeAsGM("_gmSetFlag",{actorUuid:workflow.targets.first().actor.uuid, base :"gambits-premades", key: "stormMotesGiven", value: numMotes});
            await MidiQOL.socket().executeAsGM("_gmSetFlag",{actorUuid:workflow.targets.first().actor.uuid, base :"gambits-premades", key: "stormMoteOrigin", value: token.document.uuid});
            return;
        }

        const content = `
        <div class="gps-dialog-container">
            <div class="gps-dialog-section">
                <div class="gps-dialog-content">
                    <p class="gps-dialog-paragraph">Assign the ${numMotes} motes you have available:</p>
                    <div class="gps-dialog-flex">
                        <div style="margin-bottom: 10px;">
                            ${Array.from(workflow.targets).map(target => `
                                <div style="margin-bottom: 10px; display: flex; align-items: center;">
                                    <label for="form-fields" style="flex: 2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${target.actor.name}</label>
                                    <div class="form-group" style="flex: 1;">
                                        <div id="form-fields" class="form-fields" style="display: flex; align-items: center; justify-content: flex-end; margin-left: 86px;">
                                            <button type="button" class="mote-decrement" data-target="${target.actor.uuid}" data-key="${target.id}">-</button>
                                            <span id="moteDisplay-${target.id}" style="flex: 0 0 auto; margin: 0 10px; text-align: center;">0</span>
                                            <button type="button" class="mote-increment" data-target="${target.actor.uuid}" data-key="${target.id}">+</button>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div id="image-container" class="gps-dialog-image-container">
                            <img src="${macroItem.img}" class="gps-dialog-image">
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;

        await foundry.applications.api.DialogV2.wait({
            window: { title: 'Assign Motes' },
            content: content,
            buttons: [{
                action: "Confirm",
                label: "Confirm",
                callback: async (event, button, dialog) => {
                    for (const target of workflow.targets) {
                        let assignedCount = parseInt(document.querySelector(`#moteDisplay-${target.id}`).textContent, 10);
                        await MidiQOL.socket().executeAsGM("_gmSetFlag",{actorUuid:target.actor.uuid, base :"gambits-premades", key: "stormMotesGiven", value: assignedCount});
                        await MidiQOL.socket().executeAsGM("_gmSetFlag",{actorUuid:target.actor.uuid, base :"gambits-premades", key: "stormMoteOrigin", value: token.document.uuid});
                    }
                }
            }, {
                action: "Cancel",
                label: "Cancel",
                callback: async (event, button, dialog) => {
                    workflow.aborted = true;
                }
            }],
            render: (html) => {
                document.querySelectorAll('.mote-increment').forEach(button => {
                    button.addEventListener('click', event => {
                        let key = event.currentTarget.dataset.key;
                        let display = document.querySelector(`#moteDisplay-${key}`);
                        let currentValue = parseInt(display.textContent, 10);
                        if (currentValue < numMotes && totalAssignedMotes < numMotes) {
                            display.textContent = currentValue + 1;
                            totalAssignedMotes += 1;
                        }
                    });
                });

                document.querySelectorAll('.mote-decrement').forEach(button => {
                    button.addEventListener('click', event => {
                        let key = event.currentTarget.dataset.key;
                        let display = document.querySelector(`#moteDisplay-${key}`);
                        let currentValue = parseInt(display.textContent, 10);
                        if (currentValue > 0) {
                            display.textContent = currentValue - 1;
                            totalAssignedMotes -= 1;
                        }
                    });
                });
            },
            close: async (event, dialog) => {
                return;
            },
            rejectClose: false
        });
    }

    if (args[0].macroPass === "postApplyDynamicEffects") {
        for (const invalidTarget of workflow.hitTargets) {
            if(!invalidTarget.actor.getFlag("gambits-premades", "stormMotesGiven") || invalidTarget.actor.getFlag("gambits-premades", "stormMotesGiven") === 0) {
                let effectData = invalidTarget.actor.appliedEffects.find(e => e.name === macroItem.name);
                if(effectData) await effectData.delete();
            }
        }
        let numMotes = (actor.system.details.level >= 17) ? 4 : (actor.system.details.level >= 11) ? 3 : (actor.system.details.level >= 5) ? 2 : 1;
        const offsets = [
            { x: -90, y: -55 },
            { x: -90, y: 55 },
            { x: 90, y: -55 },
            { x: 90, y: 55 }
        ];
        let cprConfig = game.gps.getCprConfig({itemUuid: macroItem.uuid});
        const { animEnabled, animColor } = cprConfig;
        let hue;
        let color = "purple"

        switch(animColor) {
            case 'orange':
                hue = 0;
                color = "orange"
                break;
            case 'blue':
                hue = 0;
                color = "blue"
                break;
            case 'green':
                hue = 215;
                break;
            case 'red':
                hue = 90;
                break;
            case 'purple':
                hue = 0;
                break;
            default:
                hue = 215;
                break;
        }

        if (workflow.targets.size === 1) {
            let target = workflow.targets.first();
            for (let i = 0; i < numMotes; i++) {
                let effectData = target.actor.effects.find(e => e.name === "Storm Mote");
                let offset = offsets[i % offsets.length];

                if(animEnabled) {
                    new Sequence()
                        .effect()
                            .attachTo(target)
                            .tieToDocuments(effectData)
                            .file(`jb2a.token_border.circle.spinning.${color}.003`)
                            .fadeIn(500)
                            .fadeOut(500)
                            .scaleToObject(0.4)
                            .spriteOffset({ x: offset.x, y: offset.y })
                            .filter("ColorMatrix", { hue: hue })
                            .persist()
                            .name(`StormMote_${target.actor.id}_${i}`)
                        .play();
                }
            }
        }
        else {
            for (let target of workflow.targets) {
                let givenMotes = await target.actor.getFlag("gambits-premades", "stormMotesGiven")
                for (let i = 0; i < givenMotes; i++) {
                    let effectData = target.actor.effects.find(e => e.name === "Storm Mote");
                    let offset = offsets[i % offsets.length];

                    if(animEnabled) {
                        new Sequence()
                            .effect()
                                .attachTo(target)
                                .tieToDocuments(effectData)
                                .file(`jb2a.token_border.circle.spinning.${color}.003`)
                                .fadeIn(500)
                                .fadeOut(500)
                                .scaleToObject(0.4)
                                .spriteOffset({ x: offset.x, y: offset.y })
                                .filter("ColorMatrix", { hue: hue })
                                .persist()
                                .name(`StormMote_${target.actor.id}_${i}`)
                            .play();
                    }
                }
            }
        }
    }

    if(args[0].macroPass === "postAttackRollComplete") {
        let effectOriginActorUuid = actor.getFlag("gambits-premades", "stormMoteOrigin");
        if(workflow.targets.first()?.document.uuid !== effectOriginActorUuid) return;
        let cprConfig = game.gps.getCprConfig({itemUuid: macroItem.uuid});
        const { animEnabled, animColor } = cprConfig;
        let givenMotes = await actor.getFlag("gambits-premades", "stormMotesGiven");
        if((givenMotes - 1) <= 0) {
            await actor.unsetFlag("gambits-premades", "stormMotesGiven");
            let effectData = actor.effects.find(e => e.name === "Storm Mote");
            await effectData.delete();
        }
        else {
            await actor.setFlag("gambits-premades", "stormMotesGiven", givenMotes - 1);

            if(animEnabled) {
                let highestIndex = -1;

                for (let i = 0; i < givenMotes; i++) {
                    const effects = Sequencer.EffectManager.getEffects({name: `StormMote_${actor.id}_${i}`, source: token});
                    if (effects.length > 0) {
                        highestIndex = i;
                    }
                }

                if (highestIndex !== -1) {
                    Sequencer.EffectManager.endEffects({name: `StormMote_${actor.id}_${highestIndex}`, source: token});
                }
            }
        }
    }

    if(args[0] === "off") {
        await actor.unsetFlag("gambits-premades", "stormMotesGiven");
    }
}
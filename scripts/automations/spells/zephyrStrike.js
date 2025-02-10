export async function zephyrStrike({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "preAttackRoll") {
        if(workflow.activity?.actionType !== "mwak" && workflow.activity?.actionType !== "rwak") return;
        
        await foundry.applications.api.DialogV2.wait({
            window: { title: 'Zephyr Strike' },
            content: `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <div>
                                <div class="gps-dialog-flex">
                                    <p class="gps-dialog-paragraph">Would you like to use Zephyr Strike to give advantage on this attack and increase your speed until the end of this turn?</p>
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
                action: "Yes",
                label: "Yes",
                callback: async (event, button, dialog) => {
                workflow.advantage = true;
    
                let effectData = actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "507baaea-a55b-43b5-af50-6fefba1b3220");
                await effectData.setFlag("gambits-premades", "zephyrStrikeUsed", true);
    
                    let effectDataSpeed = [
                    {
                        "icon": `${item.img}`,
                        "origin": `${actor.uuid}`,
                        "disabled": false,
                        "duration": {
                            "turns": 1
                        },
                        "name": "Zephyr Strike - Speed",
                        "changes": [
                        {
                            "key": "system.attributes.movement.all",
                            "value": "+ 30",
                            "mode": CONST.ACTIVE_EFFECT_MODES.CUSTOM
                        }
                        ],
                        "transfer": false
                    }
                ];
    
                    await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: actor.uuid, effects: effectDataSpeed });
                }
            },
            {
                action: "No",
                label: "No",
                callback: async (event, button, dialog) => {return;}
            }],
            close: async (event, dialog) => {
                return;
            }, rejectClose:false
        });
    }
    
    if(args[0].macroPass === "postDamageRollComplete") {
        if(workflow.activity?.actionType !== "mwak" && workflow.activity?.actionType !== "rwak") return;
        let effectData = actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "507baaea-a55b-43b5-af50-6fefba1b3220");
        let effectAdv = effectData.getFlag("gambits-premades", "zephyrStrikeUsed");
        let target = workflow.hitTargets.first();
        let numDice = workflow.isCritical ? 2 : 1;
        if(effectAdv) {
            let damageRoll = await new CONFIG.Dice.DamageRoll(`${numDice}d8`, {}, {type: "force", properties: ["mgc"]}).evaluate();
            await MidiQOL.displayDSNForRoll(damageRoll, 'damageRoll');
        
            const itemData = {
                name: "Zephyr Strike - Damage (Force)",
                type: "feat",
                img: item.img
            }
        
            new MidiQOL.DamageOnlyWorkflow(actor, token, damageRoll.total, "force", [target], damageRoll, {itemData: itemData, flavor: "Zephyr Strike - Damage (Force)"});
        
            await effectData.delete();
        }
    }
}
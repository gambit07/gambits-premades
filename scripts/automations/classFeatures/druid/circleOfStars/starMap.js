export async function starMap({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(workflow.macroPass !== "preItemRoll") return;
    if(workflow.item.name !== "Guiding Bolt") return;
    let freeUses = item.system.uses.max - item.system.uses.spent;

    if(freeUses === 0) return;

    await foundry.applications.api.DialogV2.wait({
        window: { title: `Free ${workflow.item.name} Use` },
        content: `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">Would you like to use Circle of Stars to initiate a free use of ${workflow.item.name}? It will be cast at its base level. You have ${freeUses} uses remaining.</p>
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
            action: "Yes",
            label: "Yes",
            callback: async (event, button, dialog) => {
                workflow.config.midiOptions.consumeSpellSlot = false;
                workflow.config.midiOptions.consumeSpellLevel = false;
                workflow.config.midiOptions.needsConfiguration = false;
                workflow.config.midiOptions.configureDialog = false;
                await item.update({ "system.uses.spent": item.system.uses.spent + 1 });
                ui.notifications.info(`You used Circle of Stars to initiate ${workflow.item.name} and did not use a spell slot`)
            }
        },
        {
            action: "No",
            label: "No",
            callback: async () => false
        }],
        close: async (event, dialog) => {
            return;
        }, rejectClose:false
    });
}
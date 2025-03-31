export async function starMap({ item }) {
    let freeUses = item.system.uses.max - item.system.uses.spent;

    if(freeUses === 0) return false;

    let result = await foundry.applications.api.DialogV2.wait({
        window: { title: `Free ${item.name} Use` },
        content: `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">Would you like to use Circle of Stars to initiate a free use of ${item.name}? It will be cast at its base level. You have ${freeUses} uses remaining.</p>
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
                await item.update({ "system.uses.spent": item.system.uses.spent + 1 });
                ui.notifications.info(`You used Circle of Stars to initiate ${item.name} and did not use a spell slot`);
                return true;
            }
        },
        {
            action: "No",
            label: "No",
            callback: async () => {return false;}
        }],
        close: async (event, dialog) => {
            return false;
        }, rejectClose:false
    });

    return result;
}
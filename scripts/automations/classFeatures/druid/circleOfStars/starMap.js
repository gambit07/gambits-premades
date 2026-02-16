export async function starMap({ item }) {
    let freeUses = item.system.uses.max - item.system.uses.spent;

    if(freeUses === 0) return false;

    let result = await foundry.applications.api.DialogV2.wait({
        window: { title: game.i18n.format("GAMBITSPREMADES.Dialogs.Common.FreeUse", { itemName: item.name }) },
        content: `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Druid.CircleOfStars.StarMap.Prompt", { itemName: item.name, freeUses: freeUses })}</p>
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
            label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Yes"),
            callback: async (event, button, dialog) => {
                await item.update({ "system.uses.spent": item.system.uses.spent + 1 });
                ui.notifications.info(game.i18n.format("GAMBITSPREMADES.Notifications.ClassFeatures.Druid.CircleOfStars.StarMap.NoSpellSlotConsumed", { name: item.name }));
                return true;
            }
        },
        {
            action: "No",
            label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.No"),
            callback: async () => {return false;}
        }],
        close: async (event, dialog) => {
            return false;
        }, rejectClose:false
    });

    return result;
}
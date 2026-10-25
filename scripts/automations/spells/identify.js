export async function identify({ speaker, actor, token, character, item, args, scope, workflow, options, dialog, usage }) {
    if(usage?.midiOptions?.gpsIdentify) return;
    workflow.aborted = true;
    const items = actor.items.contents.filter(i => i.system.identified === false);
    if (items.length === 0) return ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Spells.Identify.NoUnidentifiedItems"));

    const castType = await game.gps.showAutomationDialog({
        window: { title: game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.Spells.Identify.Windowtitle") },
        content: `<p>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.Spells.Identify.PromptRitualCast")}</p>`,
        buttons: [{
            action: "Yes",
            label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Yes")
        },
        {
            action: "No",
            label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.No"),
            default: true
        }],
        rejectClose:false
    });
    if(castType !== "Yes" && castType !== "No") return;

    const ritual = castType === "Yes" || item.system.method === "ritual";
    if(!ritual) {
        const cast = await MidiQOL.completeActivityUse(workflow.activity.uuid, {
            midiOptions: {gpsIdentify: true, noOnUseMacro: true, createWorkflow: true, targetUuids: [], configureDialog: true}
        }, {configure: true}, {});
        if(!cast || cast.aborted) return;
    }
    await listUnidentifiedItems(ritual);

    async function listUnidentifiedItems(ritual) {
        const timeToCast = ritual ? "(11m)" : "";
        let pending = false;
        let content = `
            <ul class="gps-identify-list">
        `;
        items.forEach((item) => {
            content += `
                <li id="item-${item.id}" class="gps-identify-item">
                    <div>
                        <img src="${item.img}" width="30" height="30">
                        <span>${foundry.utils.escapeHTML(item.name)} (${item.system.quantity})</span>
                    </div>
                    <button type="button" class="identify-btn" data-item-id="${item.id}">${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.Spells.Identify.Identify", { timeToCast }).trim()}</button>
                </li>
            `;
        });
        content += "</ul>";

        await game.gps.showAutomationDialog({
            window: { title: ritual ? game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.Spells.Identify.WindowTitleRitual") : game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.Spells.Identify.WindowTitle") },
            content: content,
            buttons: [{
                action: "Close",
                label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Close"),
                icon: "fas fa-times",
            }],
            render: (event) => {
                let dialogElement = event.target.element;
                dialogElement.querySelectorAll('.identify-btn').forEach(button => {
                    button.addEventListener('click', async event => {
                        if(pending) return;
                        const itemId = event.currentTarget.dataset.itemId;
                        const target = actor.items.get(itemId);
                        if(!target || target.system.identified) return;
                        pending = true;
                        const buttons = [...dialogElement.querySelectorAll('.identify-btn')];
                        buttons.forEach(button => button.disabled = true);
                        try {
                            if(ritual) {
                                const cast = await MidiQOL.completeActivityUse(workflow.activity.uuid, {
                                    consume: false, spell: {slot: "ritual"},
                                    midiOptions: {gpsIdentify: true, noOnUseMacro: true, createWorkflow: true, targetUuids: [], configureDialog: false}
                                }, {configure: false}, {});
                                if(!cast || cast.aborted) return;
                            }
                            await identifyItem(itemId, dialogElement);
                        } finally {
                            pending = false;
                            buttons.forEach(button => button.disabled = false);
                        }
                    });
                });
            },
            close: async (event, dialog) => {
                return;
            }, rejectClose:false
        });
    }

    async function identifyItem(itemId, dialogElement) {
        const itemData = actor.items.get(itemId);
        if (itemData) {
            await game.gps.queryGM('gmIdentifyItem', { itemUuid: itemData.uuid });
            ui.notifications.info(game.i18n.format("GAMBITSPREMADES.Notifications.Spells.Identify.Identified", { name: itemData.name }));

            const itemText = `
                <div style="display: flex; align-items: center;">
                    <img src="${itemData.img}" width="30" height="30">
                    <span><a class="open-item-sheet" data-item-id="${itemData.id}">${foundry.utils.escapeHTML(itemData.name)}</a> (${itemData.system.quantity})</span>
                </div>
            `;

            const listItem = dialogElement.querySelector(`#item-${itemId}`);
            listItem.innerHTML = itemText;
            listItem.querySelector('.open-item-sheet').addEventListener('click', (ev) => {
                itemData.sheet.render(true);
            });
        }
    }

}

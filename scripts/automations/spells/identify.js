export async function identify({ speaker, actor, token, character, item, args, scope, workflow, options, dialog, usage }) {
    dialog.configure = false;
    usage.consume = usage.consume || {};
    usage.consume.spellSlot = false;
    const items = actor.items.contents.filter(i => i.system.identified === false);
    if (items.length === 0) return ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Spells.Identify.NoUnidentifiedItems"));

    await foundry.applications.api.DialogV2.wait({
        window: { title: game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.Spells.Identify.Windowtitle") },
        content: `<p>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.Spells.Identify.PromptRitualCast")}</p>`,
        buttons: [{
            action: "Yes",
            label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Yes"),
            callback: async () => {
                workflow.aborted = true;
                listUnidentifiedItems(true);
            }
        },
        {
            action: "No",
            label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.No"),
            default: true,
            callback: async () => {
                const spells = actor.system.spells;
                let spellLevel = item?.system?.level;
                let checkType = item?.system?.method;
                let hasSpellSlots = false;
                if(checkType === "spell" && !item?.system.prepared) return;
                if(checkType === "spell")
                {
                    for (let level = spellLevel; level <= 9; level++) {
                        let spellSlot = actor.system.spells[`spell${level}`].value;
                        if (spellSlot > 0) {
                            hasSpellSlots = true;
                            break;
                        }
                    }
                }
                else if(checkType === "pact")
                {
                    let spellSlotValue = spells.pact.value;
                    if (spellSlotValue > 0) hasSpellSlots = true;
                }
                else if(checkType === "innate" || checkType === "atwill")
                {
                    let slotValue = checkItem.system.uses.max - checkItem.system.uses.spent;
                    let slotEnabled = checkItem.system.uses.max;
                    if (slotValue > 0 || slotEnabled === null) hasSpellSlots = true;
                }
                else if(checkType === "ritual") {
                    workflow.aborted = true;
                    listUnidentifiedItems(true);
                    return ui.notifications.info(game.i18n.localize("GAMBITSPREMADES.Notifications.Spells.Identify.RitualOnly"))
                }

                if (!hasSpellSlots) {
                    return ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Spells.Identify.NoSpellSlots"));
                }
                else {
                    workflow.aborted = true;
                    listUnidentifiedItems(false)
                }
            }
        }],
        close: async (event, dialog) => {
            return;
        }, rejectClose:false
    });

    async function listUnidentifiedItems(ritual) {
        let dropdownOptions = "";
        if (!ritual) {
            for (let level = 1; level <= 9; level++) {
                let spellSlot = actor.system.spells[`spell${level}`].value;
                if (spellSlot > 0) {
                    let levelWithOrdinal = getOrdinalNumber(level);
                    dropdownOptions += `<option class="gps-dialog-option" value="${level}">${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.Spells.Identify.Level", { levelWithOrdinal: levelWithOrdinal, spellSlot: spellSlot })}</option>`;
                }
            }
        }

        let timeToCast = ritual ? "(11m)" : "(1m)";
        let spellLevelDropdown = dropdownOptions ? `<select style="background-color: rgba(181, 99, 69, 0.2);" class="gps-dialog-select" id="spellLevelDropdown">${dropdownOptions}</select>` : '';

        let content = `
            <style>
                .dialog { width: 550px !important; } .identify-btn:hover { box-shadow: 0 0 8px #333; } .item-list { display: flex; justify-content: space-between; align-items: center; padding: 4px; height: 50px; } .item-list div { flex-grow: 1; display: flex; align-items: center; } .item-list img { border: 0; margin-right: 10px; vertical-align: middle; } .item-list span { margin-left: 5px; }
            </style>
            <ul style='list-style-type: none; padding: 0;'>
        `;
        items.forEach((item) => {
            content += `
                <li id="item-${item.id}" class="item-list">
                    <div>
                        <img src="${item.img}" width="30" height="30">
                        <span>${item.name} (${item.system.quantity})</span>
                    </div>
                    <span id="spellLevelSelect_${item.id}">${spellLevelDropdown}</span>
                    <button type="button" class="identify-btn" data-item-id="${item.id}" style="width: 25%; margin-left: 10px;">${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.Spells.Identify.Identify", { timeToCast: timeToCast })}</button>
                </li>
            `;
        });
        content += "</ul>";

        await foundry.applications.api.DialogV2.wait({
            window: { title: ritual ? game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.Spells.Identify.WindowTitleRitual") : game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.Spells.Identify.WindowTitle") },
            content: content,
            buttons: [{
                action: "Close",
                label: `<i class="fas fa-times" style="margin-right: 5px;"></i>${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Close")}`,
            }],
            render: (event) => {
                let dialogElement = event.target.element;
                dialogElement.querySelectorAll('.identify-btn').forEach(button => {
                    button.addEventListener('click', async event => {
                        const itemId = event.currentTarget.dataset.itemId;
                        const selectElement = dialogElement.querySelector(`#spellLevelSelect_${itemId} select`);
                        let castLevel = !ritual ? selectElement?.value : null;

                        if (castLevel) {
                            let currentSlots = actor.system.spells[`spell${castLevel}`].value;
                            await actor.update({ [`system.spells.spell${castLevel}.value`]: currentSlots - 1 });
                            refreshSpellLevelDropdown(dialogElement, actor);
                        }

                        await identifyItem(itemId, dialogElement);
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
            if (MidiQOL.safeGetGameSetting('gambits-premades', 'Enable Identify Restrictions') === true) {
                await game.gps.socket.executeAsGM('gmIdentifyItem', { itemUuid: itemData.uuid });
            } else {
                await itemData.update({ "system.identified": true });
            }
            ui.notifications.info(game.i18n.format("GAMBITSPREMADES.Notifications.Spells.Identify.Identified", { name: itemData.name }));

            const itemText = `
                <div style="display: flex; align-items: center;">
                    <img src="${itemData.img}" width="30" height="30">
                    <span><a class="open-item-sheet" data-item-id="${itemData.id}">${itemData.name}</a> (${itemData.system.quantity})</span>
                </div>
            `;

            const listItem = dialogElement.querySelector(`#item-${itemId}`);
            listItem.innerHTML = itemText;
            listItem.querySelector('.open-item-sheet').addEventListener('click', (ev) => {
                itemData.sheet.render(true);
            });
        }
    }

    async function refreshSpellLevelDropdown(dialogElement, actor) {
        const items = actor.items.contents.filter(i => i.system.identified === false);

        let dropdownOptions = '';
        for (let level = 1; level <= 9; level++) {
            let spellSlot = actor.system.spells[`spell${level}`]?.value;
            if (spellSlot > 0) {
                let levelWithOrdinal = getOrdinalNumber(level);
                dropdownOptions += `<option class="gps-dialog-option" value="${level}">${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.Spells.Identify.Level", { levelWithOrdinal: levelWithOrdinal, spellSlot: spellSlot })}</option>`;
            }
        }

        if (dropdownOptions) {
            items.forEach(i => {
                const selectContainer = dialogElement.querySelector(`#spellLevelSelect_${i.id}`);
                if (selectContainer) {
                    selectContainer.innerHTML = `<select style="background-color: rgba(181, 99, 69, 0.2);" class="gps-dialog-select" id="spellLevelDropdown">${dropdownOptions}</select>`;
                }
            });
        }
    }

    function getOrdinalNumber(number) {
        switch (number) {
            case 1: return "1st";
            case 2: return "2nd";
            case 3: return "3rd";
            default: return number + "th";
        }
    }
}
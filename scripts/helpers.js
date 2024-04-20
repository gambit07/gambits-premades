export async function deleteChatMessage({ chatId }) {
    if(!chatId) return;
    let chatMessage = game.messages.get(chatId);
    await chatMessage.delete();
}

export async function gmIdentifyItem({ itemUuid }) {
    if(!itemUuid) return;
    let itemData = await fromUuid(`${itemUuid}`);
    if(itemData) await itemData.update({"system.identified": true});
}

export async function closeDialogById({ dialogId }) {
    let activeDialog = ui.activeWindow?.data?.id;

    if (activeDialog === dialogId) {
        ui.activeWindow.dialogState.programmaticallyClosed = true;
        ui.activeWindow.close();
    }
    else {
        let dialog = Object.values(ui.windows).find(d => d.data?.id === dialogId);
        if (dialog) {
            dialog.dialogState.programmaticallyClosed = true;
            dialog.close();
        }
    }
}

export async function rollAsUser({ rollParams, type }) {
    if(!rollParams) return;
    let reroll;
    //const DamageRoll = CONFIG.Dice.DamageRoll;
    
    reroll = await new Roll(`${rollParams}`).evaluate({async: true});

    await MidiQOL.displayDSNForRoll(reroll, 'damageRoll');
    console.log(reroll,"this is reroll helper")
    return reroll;
}

export function convertFromFeet({ range }) {
    const units = canvas.scene.grid.units;
    let conversionFactor;
    if (units === "meters" || units === "m" || units === "mt") conversionFactor = 0.3;
    else conversionFactor = 1;
    return range * conversionFactor;
}

export async function handleDialogPromises(userDialogPromise, gmDialogPromise) {
    return new Promise((resolve, reject) => {
        let userResolved = false;
        let gmResolved = false;
        let anyDialogInteracted = false;

        const checkAndResolve = () => {
            if (anyDialogInteracted) {
                resolve(anyDialogInteracted);
            }

            else if (userResolved && gmResolved) {
                resolve({programmaticallyClosed: true});
            }
        };

        userDialogPromise.then(result => {
            userResolved = true;
            if (result && !result.programmaticallyClosed) {
                anyDialogInteracted = result;
            }
            checkAndResolve();
        });

        gmDialogPromise.then(result => {
            gmResolved = true;
            if (result && !result.programmaticallyClosed) {
                anyDialogInteracted = result;
            }
            checkAndResolve();
        });
    });
}
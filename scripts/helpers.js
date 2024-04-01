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

export async function handleDialogPromises(userDialogPromise, gmDialogPromise) {
    return new Promise((resolve, reject) => {
        let userResolved = false;
        let gmResolved = false;
        let anyDialogInteracted = false;

        const checkAndResolve = () => {
            // If either dialog has been interacted with by a user, resolve.
            if (anyDialogInteracted) {
                resolve(anyDialogInteracted);
            }
            // If both dialogs resolved without user interaction, resolve or reject based on your logic.
            else if (userResolved && gmResolved) {
                resolve({programmaticallyClosed: true}); // or use reject based on your needs
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
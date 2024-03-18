export async function deleteChatMessage({ chatId }) {
    if(!chatId) return;
    let chatMessage = game.messages.get(chatId);
    await chatMessage.delete();
}
export async function kineticJaunt({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    const rangeCheck = MidiQOL.findNearby(null, token, 2, { includeToken: false });

    if(rangeCheck.length > 0) {
        let damageRoll = await new CONFIG.Dice.DamageRoll(`1d8`, {}, {type: "force", properties: ["mgc"]}).evaluate();
        await MidiQOL.applyTokenDamage([{ damage: damageRoll.total, type: 'force' }], damageRoll.total, new Set([token]), null, null);
        let content = `You end your turn in another creatures space and take ${damageRoll.total} points of force damage and are moved to your last position before entering that creatures space.`
        let actorPlayer = MidiQOL.playerForActor(actor);
        let chatData = {
            user: actorPlayer.id,
            speaker: ChatMessage.getSpeaker({ token: token }),
            content: content
        };
        ChatMessage.create(chatData);
    }
}
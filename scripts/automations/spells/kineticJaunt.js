export async function kineticJaunt({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    const rangeCheck = MidiQOL.findNearby(null, token, 2, { includeToken: false });

    if(rangeCheck.length > 0) {
        let damageRoll = await new CONFIG.Dice.DamageRoll(`1d8`, {}, {type: "force", properties: ["mgc"]}).evaluate();
        await MidiQOL.applyTokenDamage([{ damage: damageRoll.total, type: 'force' }], damageRoll.total, new Set([token]), null, null);
        let content = game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.Spells.KineticJaunt.EndTurnAnotherCreaturesSpace", { damageTotal: damageRoll.total })
        let actorPlayer = MidiQOL.playerForActor(actor);
        let chatData = {
            user: actorPlayer.id,
            speaker: ChatMessage.getSpeaker({ token: token }),
            content: content
        };
        ChatMessage.create(chatData);
    }
}
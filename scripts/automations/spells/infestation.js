export async function infestation({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "postSavesComplete" && workflow.failedSaves.size !== 0) {
        let gmUser = game.gps.getPrimaryGM();
        let targets = workflow.failedSaves;
        for(let target of targets) {
            const directionRoll = await new CONFIG.Dice.DamageRoll(`1d4`).evaluate();
            await MidiQOL.displayDSNForRoll(directionRoll, 'damageRoll')
            const directionResult = directionRoll.total;
            const directions = ["North", "South", "East", "West"];
            const directionContent = directions[directionResult - 1];
            const walkSpeedFeet = 5;
            await game.gps.socket.executeAsUser("moveTokenByCardinal", gmUser, {targetUuid: target.document.uuid, distance: walkSpeedFeet, direction: directionContent });

            let content = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.Spells.Infestation.MovementRollMovesUsingUp", { targetName: target.actor.name, directionResult: directionResult, directionContent: directionContent })}</span>`

            await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: actor.uuid, itemUuid: workflow.item.uuid, chatContent: content, rollData: directionRoll});
        }
    }
}
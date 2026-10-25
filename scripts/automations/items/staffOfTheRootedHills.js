export async function staffOfTheRootedHills({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "postDamageRoll") {
        let flagValue = await item.getFlag("gambits-premades", "rootedHillsStaff");
        if(flagValue === 0) return;
        let target = workflow.hitTargets.first();
        if(!target) return;
        const saveResult = await game.gps.gpsActivityUse({itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: target.document.uuid});

        if(!saveResult) return;
        await item.setFlag("gambits-premades", "rootedHillsStaff", 0);
        if(saveResult.failedSaves.size !== 0) {
            const hasEffectApplied = target.document.hasStatusEffect("restrained");
            if (!hasEffectApplied) {
                await game.gps.queryGM("gmToggleStatus", {tokenUuid: `${target.document.uuid}`, status: "restrained", active: true });
            }

            let content = game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.Items.StaffOfTheRootedHills.RestrainedBy")
            let actorPlayer = MidiQOL.playerForActor(actor);
            let chatData = {
                user: actorPlayer.id,
                speaker: ChatMessage.getSpeaker({ token: token }),
                content: content
            };
            ChatMessage.create(chatData);
        }
    }
    else if(args[0] === "each") {
        await item.setFlag("gambits-premades", "rootedHillsStaff", 1);
    }
    else if(args[0] === "off") {
        await item.unsetFlag("gambits-premades", "rootedHillsStaff");
    }
}
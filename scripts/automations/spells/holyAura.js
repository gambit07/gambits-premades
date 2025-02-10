export async function holyAura({ speaker, actor, token, character, item, args, scope, workflow, options, rolledItem, rolledActivity, macroItem }) {
    if(args[0].macroPass === "isDamaged") {
        console.log(item, macroItem, scope)
        let gpsUuid = "5f7adec6-3c0f-4654-8516-a4a38260ed85";
        let effect = await actor?.appliedEffects?.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        item = await fromUuid(effect.flags["midi-qol"].castData.itemUuid);
        const rcheck = ["undead","fiend"].includes(MidiQOL.raceOrType(workflow.token));
        const attackType = workflow.activity?.actionType;
        if (!rcheck || !['mwak', 'msak'].includes(attackType)) return;

        const saveResult = await game.gps.gpsActivityUse({itemUuid: item.uuid, identifier: "syntheticSave", targetUuid: workflow.token.document.uuid});

        if (saveResult.failedSaves.size === 1) {
            const hasEffectApplied = actor.appliedEffects.find(e => e.name === "Blinded");

            if (!hasEffectApplied) {
                await game.gps.socket.executeAsGM("gmToggleStatus", { tokenUuid: `${workflow.token.document.uuid}`, status: "blinded", active: true });
            }
        }
    }
}
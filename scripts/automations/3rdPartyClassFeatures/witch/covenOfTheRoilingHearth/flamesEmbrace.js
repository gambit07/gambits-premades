export async function flamesEmbrace({ speaker, actor, token, character, item, args, scope, workflow, options, macroItem }) {
    if (args[0].macroPass === "isDamaged") {
        let damageTypes = ["fire"];
        let rollFound = workflow.damageDetail.some(roll => damageTypes.includes(roll.type));

        if (rollFound) {
            const saveResult = await game.gps.gpsActivityUse({itemUuid: macroItem.uuid, identifier: "syntheticSave2", targetUuid: token.document.uuid});

            if (saveResult.failedSaves.size === 0) {
                let effectData = actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "c87befde-c36f-4237-b645-e98e1526de42");
                await effectData.delete();
                Sequencer.EffectManager.endEffects({ name: `${token.id}.FlamesEmbrace` });
            }
        }
    }
}
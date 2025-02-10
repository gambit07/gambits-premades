export async function arcaneShot({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "postDamageRoll") {
        if(workflow.activity?.actionType === "rwak" && workflow.item.name.toLowerCase().includes("bow") && workflow.hitTargets.first()) {
            await actor.setFlag('gambits-premades', `arcaneShotValid`, true);
        }
    }

    if(args[0] === "each" && args[2].turn === "startTurn") {
        let itemValid = await actor.getFlag('midi-qol', `arcaneShotValid`);
        if(itemValid) await actor.unsetFlag('midi-qol', `arcaneShotValid`);
    }

    if(args[0] === "each" && args[2].turn === "endTurn") {
        let itemValid = await actor.getFlag('midi-qol', `arcaneShotValid`);
        if(itemValid) await actor.unsetFlag('midi-qol', `arcaneShotValid`);
    }
}
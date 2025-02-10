export async function mobile({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "preWaitForAttackRoll") {
        let actionType = workflow.activity?.actionType;
        if(actionType != "mwak" && actionType != "msak") return;
        let targetId = workflow.targets.first()?.id;
        if (!targetId) return;
        let existingTargets = await actor.getFlag("midi-qol", `oaMobileFeatAttack`) || [];
        if (!existingTargets.includes(targetId)) {
            existingTargets.push(targetId);
        }
        await actor.setFlag("midi-qol", `oaMobileFeatAttack`, existingTargets);
    }

    if (args[0] === "each" && args[2].turn === "startTurn") {
        await actor.unsetFlag("midi-qol", `oaMobileFeatAttack`);
    }
    if (args[0] === "each" && args[2].turn === "endTurn") {
        await actor.unsetFlag("midi-qol", `oaMobileFeatAttack`);
    }
}
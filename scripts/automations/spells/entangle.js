export async function entangle({ tokenUuid, regionUuid, regionScenario, speaker, actor, token, character, item, args, scope, workflow, options, turnKey }) {
    if(args?.[0]?.macroPass === "postSave")
    {
        const template = await fromUuid(workflow.templateUuid);
        const targets = Array.from(workflow.failedSaves);

        for (let target of targets) {
            const hasEffectApplied = game.gps.regionStatusEffects(target, template.uuid).length > 0;

            if (!hasEffectApplied) {
                await game.gps.queryGM("setRegionStatus", {tokenUuid: target.document.uuid, regionUuid: template.uuid, active: true });
            }
        }

        await game.gps.animation.entangle({template, itemUuid: workflow.item.uuid, targets, token});
    }

    if(regionScenario === "tokenTurnStart") {
        if(game.user.id !== game.gps.getPrimaryGM()) return;
        await game.gps.promptRegionEscape({tokenUuid, regionUuid, turnKey: turnKey ?? game.gps.regionTurnKey(), regionScenario});
    }

    if(regionScenario === "tokenExits") {
        let tokenDocument = fromUuidSync(tokenUuid);
        Sequencer.EffectManager.endEffects({ name: `${tokenDocument.id}Entangle`, object: tokenDocument.object });
    }
}
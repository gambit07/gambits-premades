export async function arcaneShot({ speaker, actor, token, character, item, args, scope, workflow, options, macroItem }) {
    if(args?.[0].macroPass === "postAttackRollComplete") {
        let itemUsed = await actor.getFlag('gambits-premades', `arcaneShotTurnUsed`);
        if(itemUsed) {
            return;
        }

        if(macroItem.system.uses?.spent >= macroItem.system.uses?.max) {
            return;
        }

        if(workflow.activity?.actionType === "rwak" && workflow.item.name.toLowerCase().includes("bow") && workflow.hitTargets.first()) {
            const options = { midiOptions: { targetsToUse: workflow.hitTargets, configureDialog: false, showFullCard: false, ignoreUserTargets: true, checkGMStatus: true, autoRollAttack: true, autoRollDamage: "always", fastForwardAttack: true, fastForwardDamage: true } };

            await MidiQOL.completeItemUseV2(macroItem, options, {}, {});
        }
    };

    if(args?.[0].macroPass === "postPreambleComplete") {
        let chosenActivity = workflow.activity.identifier;

        if(chosenActivity === "graspingArrow" || chosenActivity === "seekingArrow" || chosenActivity === "seekingArrow18") {
            if(chosenActivity === "graspingArrow") await game.gps.graspingArrow({workflow, args, actor, token, item});
            else if(chosenActivity === "seekingArrow" || chosenActivity === "seekingArrow18") await game.gps.seekingArrow({workflow, args, actor, token, item});
            await actor.setFlag('gambits-premades', `arcaneShotTurnUsed`, true);
        }
        else if(chosenActivity) await actor.setFlag('gambits-premades', `arcaneShotTurnUsed`, true);
        else return;
    }

    if(args?.[0].macroPass === "preActiveEffects") {
        await item.update({"flags.midiProperties.ignoreTotalCover" : false});

        let chosenActivity = workflow.activity.identifier;

        if(chosenActivity === "burstingArrow") await game.gps.burstingArrow({workflow, args, actor, token, item});
        else return;
    }

    if(args?.[0].macroPass === "postSave") {
        let chosenActivity = workflow.activity.identifier;

        if(chosenActivity === "beguilingArrow") await game.gps.beguilingArrow({workflow, args, actor, token, item});
        else return;
    }

    if(args?.[0] === "each" && args[2].turn === "startTurn") {
        let itemValid = await actor.getFlag('gambits-premades', `arcaneShotTurnUsed`);
        if(itemValid) await actor.unsetFlag('gambits-premades', `arcaneShotTurnUsed`);
    }

    if(args?.[0] === "each" && args[2].turn === "endTurn") {
        let itemValid = await actor.getFlag('gambits-premades', `arcaneShotTurnUsed`);
        if(itemValid) await actor.unsetFlag('gambits-premades', `arcaneShotTurnUsed`);
    }
}
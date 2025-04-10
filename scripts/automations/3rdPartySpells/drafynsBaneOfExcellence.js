export async function drafynsBaneOfExcellence({ speaker, actor, token, character, item, args, scope, workflow, options, macroItem, workflowData, workflowType, workflowCombat }) {
    //Initiate Flag assignment for target if saving throw is failed
    if(args?.[0]?.macroPass === "preActiveEffects") {
        let isSave = workflow.saves.first();
        if(isSave) return;
        let target = workflow.targets.first();
        const level = actor.system.details.level;
        let flagSet = level < 5 ? 1 : level < 11 ? 2 : level < 17 ? 3 : 4;
        await MidiQOL.socket().executeAsGM('_gmSetFlag', { actorUuid : target.actor.uuid, base : 'midi-qol', key : 'drafynFlag', value : flagSet })
    }
    //Check target Attack Roll
    if(args?.[0]?.macroPass === "preAttackRollComplete") {
        let attack20 = workflow.attackRoll.dice[0].total === 20;
        if(!attack20) return;
        let flagValue = await actor.getFlag("midi-qol", "drafynFlag");
        if(flagValue <= 1) {
            const effectName = await actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "e6e24759-a9d3-4993-b0f2-6328010a6520");
            await effectName.delete();
            await MidiQOL.socket().executeAsGM('_gmUnsetFlag', { actorUuid : workflow.actor.uuid, base : 'midi-qol', key : 'drafynFlag' })
            const saveSetting = workflow.workflowOptions.noOnUseMacro;
            workflow.workflowOptions.noOnUseMacro = true;
            let reroll = await new Roll(`-99`).roll();
            await workflow.setAttackRoll(reroll);
            workflow.workflowOptions.noOnUseMacro = saveSetting;
        }
        else {
            await actor.setFlag("midi-qol", "drafynFlag", flagValue - 1);
            const saveSetting = workflow.workflowOptions.noOnUseMacro;
            workflow.workflowOptions.noOnUseMacro = true;
            let reroll = await new Roll(`-99`).roll();
            await workflow.setAttackRoll(reroll);
            workflow.workflowOptions.noOnUseMacro = saveSetting;
        }
        let content = `<div class="midi-qol-flex-container"><div class="midi-qol-target-npc midi-qol-target-name" id="${token.id}"></br>Your natural 20 was cancelled due to Drafyn's Bane of Excellence and you fail the attack.</div><div><img src="${token.actor.img}" width="30" height="30" style="border:0px"></div></div>`;
        let chatData = {
            user: actor.id,
            speaker: ChatMessage.getSpeaker({ token: token }),
            content: content
        };
        await ChatMessage.create(chatData);
    }

    //Check target Saving Throw
    if(workflowType && workflowType === "save") {
        const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
        let workflowTargets = Array.from(workflow.saves).filter(t => t.document.actor.appliedEffects.some(e => e.flags["gambits-premades"]?.gpsUuid === "e6e24759-a9d3-4993-b0f2-6328010a6520"));
        let validTargets = workflowTargets.filter(t => workflow.saveRolls.find(roll => roll.data.actorUuid === t.actor.uuid && roll.dice[0].total === 20));
        if(validTargets <= 0) return;

        for (const target of validTargets) {
            let flagValue = await target.actor.getFlag("midi-qol", "drafynFlag");
            if(flagValue <= 1) {
                const effectData = await target.actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "e6e24759-a9d3-4993-b0f2-6328010a6520");
                await effectData.delete();
                await MidiQOL.socket().executeAsGM('_gmUnsetFlag', { actorUuid : target.actor.uuid, base : 'midi-qol', key : 'drafynFlag' })
            }
            else {
                await MidiQOL.socket().executeAsGM('_gmSetFlag', { actorUuid : target.actor.uuid, base : 'midi-qol', key : 'drafynFlag', value : flagValue - 1 })
            }

            workflow.saves.delete(target);
            workflow.failedSaves.add(target);

            let content = `<div class="midi-qol-flex-container"><div class="midi-qol-target-npc midi-qol-target-name" id="${target.id}"></br>Your natural 20 was cancelled due to Drafyn's Bane of Excellence and you fail your saving throw.</div><div><img src="${target.actor.img}" width="30" height="30" style="border:0px"></div></div>`;
            let chatData = {
                user: target.actor.id,
                speaker: ChatMessage.getSpeaker({ token: target }),
                content: content
            };
            await ChatMessage.create(chatData);
            return;
        }
    }

    if(args[0] === "off") {
        await actor.unsetFlag("midi-qol", "drafynFlag");
    }
}
export async function drafynsBaneOfExcellence({ speaker, actor, token, character, item, args, scope, workflow, options, macroItem }) {
    //Initiate Flag assignment for target if saving throw is failed
    if(args[0].macroPass === "preActiveEffects") {
        let isSave = workflow.saves.first();
        if(isSave) return;
        let target = workflow.targets.first();
        const level = actor.system.details.level;
        let flagSet = level < 5 ? 1 : level < 11 ? 2 : level < 17 ? 3 : 4;
        await MidiQOL.socket().executeAsGM('_gmSetFlag', { actorUuid : target.actor.uuid, base : 'midi-qol', key : 'drafynFlag', value : flagSet })
    }
    //Check target Attack Roll
    if(args[0].macroPass === "preAttackRollComplete") {
        let attack20 = workflow.attackRoll.dice[0].total === 20;
        if(!attack20) return;
        let flagValue = await actor.getFlag("midi-qol", "drafynFlag");
        if(flagValue <= 1) {
            const effectName = await actor.effects.getName("Drayfn’s Bane of Excellence");
            await effectName.delete();
            await MidiQOL.socket().executeAsGM('_gmUnsetFlag', { actorUuid : workflow.actor.uuid, base : 'midi-qol', key : 'drafynFlag' })
            const saveSetting = workflow.options.noOnUseMacro;
            workflow.options.noOnUseMacro = true;
            let reroll = await new Roll(`-99`).roll();
            await workflow.setAttackRoll(reroll);
            workflow.options.noOnUseMacro = saveSetting;
        }
        else {
            await actor.setFlag("midi-qol", "drafynFlag", flagValue - 1);
            const saveSetting = workflow.options.noOnUseMacro;
            workflow.options.noOnUseMacro = true;
            let reroll = await new Roll(`-99`).roll();
            await workflow.setAttackRoll(reroll);
            workflow.options.noOnUseMacro = saveSetting;
        }
        let content = `<div class="midi-qol-flex-container"><div class="midi-qol-target-npc midi-qol-target-name" id="${token.id}"></br>The creature's natural 20 was cancelled due to Drafyn's Bane of Excellence and they fail their attack.</div><div><img src="${token.actor.img}" width="30" height="30" style="border:0px"></div></div>`;
        let chatData = {
            user: actor.id,
            speaker: ChatMessage.getSpeaker({ token: token }),
            content: content
        };
        await ChatMessage.create(chatData);
    }

    //Check target Saving Throw
    if(workflow.macroPass === "preSavesComplete") {
        console.log(workflow)
        let workflowTarget = Array.from(workflow.saves).find(t => t.document.uuid === token.document.uuid);
        let save20 = workflow.saveResults[0].dice[0].total === 20;
        if(!save20) return;
        let flagValue = await actor.getFlag("midi-qol", "drafynFlag");
        let damageToAdd = Math.floor(workflow.damageTotal / 2);
        if(flagValue <= 1) {
            const effectName = await actor.effects.getName("Drayfn’s Bane of Excellence");
            await effectName.delete();
            await MidiQOL.socket().executeAsGM('_gmUnsetFlag', { actorUuid : actor.uuid, base : 'midi-qol', key : 'drafynFlag' })
            return await new Roll("-99").roll();
        }
        else {
            await MidiQOL.socket().executeAsGM('_gmSetFlag', { actorUuid : actor.uuid, base : 'midi-qol', key : 'drafynFlag', value : flagValue - 1 })
        }
        let content = `<div class="midi-qol-flex-container"><div class="midi-qol-target-npc midi-qol-target-name" id="${token.id}"></br>The creature's natural 20 was cancelled due to Drafyn's Bane of Excellence and they fail their saving throw. (This is only a notice for now, manually add ${damageToAdd} damage back to the target)</div><div><img src="${token.actor.img}" width="30" height="30" style="border:0px"></div></div>`;
        let chatData = {
            user: actor.id,
            speaker: ChatMessage.getSpeaker({ token: token }),
            content: content
        };
        await ChatMessage.create(chatData);
        return await new Roll("-99").roll();
    }

    if(args[0] === "off") {
        await actor.unsetFlag("midi-qol", "drafynFlag");
    }
}
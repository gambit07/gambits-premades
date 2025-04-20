export async function enervation({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "postActiveEffects") {
        let targets = Array.from(workflow.failedSaves);
        let effectData = actor.appliedEffects.find(e => e.name === "Enervation - Range");

        if(!targets || targets.length >= 3) {
            const concEffect = MidiQOL.getConcentrationEffect(actor, item.uuid);
            if (concEffect)	await concEffect.delete();
            return;
        }

        let targetUuids = targets.map(t => t.document.uuid);

        for(let target of targets) {
            let healAmount = Math.floor(workflow.damageTotal / 2);
            await MidiQOL.applyTokenDamage([{ damage: healAmount, type: "healing" }], healAmount, new Set([token]), item, new Set());

            let content = `<span style='text-wrap: wrap;'>You deal ${workflow.damageTotal} points of damage to your target and heal up to ${healAmount} points using Enervation. <img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`
            let actorPlayer = MidiQOL.playerForActor(actor);
            let chatData = {
                user: actorPlayer.id,
                speaker: ChatMessage.getSpeaker({ token: token }),
                content: content
            };
            ChatMessage.create(chatData);

            new Sequence()
            .effect()
                .file("jb2a.energy_beam.reverse.dark_green")
                .persist()
                .name(`${target.id}_Enervation`)
                .fadeIn(500)
                .fadeOut(500)
                .attachTo(token)
                .stretchTo(target,{ attachTo: true })
            .play()
        }

        let targetValidation;
        if(targetUuids.length > 1) {
            targetValidation = {
                "ActiveAuras": 
                {
                    "customCheck": `(token.document.uuid === '${targets[0].document.uuid}' || token.document.uuid === '${targets[1].document.uuid}') && (MidiQOL.canSee(token.document.uuid, '${targets[0].document.uuid}') || MidiQOL.canSee(token.document.uuid, '${targets[1].document.uuid}'))`,
                    "isAura": true,
                    "aura": "Enemy",
                    "nameOverride": "",
                    "radius": "60",
                    "alignment": "",
                    "type": "",
                    "ignoreSelf": true,
                    "height": true,
                    "hidden": false,
                    "displayTemp": false,
                    "hostile": false,
                    "onlyOnce": false,
                    "wallsBlock": "true"
                }
            };
        }
        else {
            targetValidation = {
                "ActiveAuras": 
                {
                    "customCheck": `token.document.uuid === '${targets[0].document.uuid}' && MidiQOL.canSee(token.document.uuid, '${targets[0].document.uuid}')`,
                    "isAura": true,
                    "aura": "Enemy",
                    "nameOverride": "",
                    "radius": "60",
                    "alignment": "",
                    "type": "",
                    "ignoreSelf": true,
                    "height": true,
                    "hidden": false,
                    "displayTemp": false,
                    "hostile": false,
                    "onlyOnce": false,
                    "wallsBlock": "true"
                }
            };
        }

        await effectData.update({ flags: targetValidation });
        let effectDataSource = actor.appliedEffects.find(e => e.name === item.name);
        await effectDataSource.setFlag("gambits-premades", "enervationTargetUuid", targetUuids);
        await effectDataSource.setFlag("gambits-premades", "enervationCastLevel", workflow.castData.castLevel);
    }

    if(args[0] === "off") {
        const originActor = await fromUuid(args[2]);

        let effectData = originActor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "9c513478-ffd9-4d5a-9e39-3d72bf0518ab");
        if(!effectData) return;
        let effectDataRange = originActor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "0d9ce5a3-a0b0-44a9-b03b-edd413590139");
        if(!effectDataRange) return;
        let targetUuids = effectData.getFlag("gambits-premades", "enervationTargetUuid");

        if(targetUuids.length <= 1) {
            const concEffect = MidiQOL.getConcentrationEffect(originActor, args[3]);
            if(!concEffect) return;
            await MidiQOL.socket().executeAsGM('removeEffects', { actorUuid: originActor.uuid, effects: [concEffect.id] });
        }
        else {
            targetUuids = targetUuids.filter(uuid => uuid !== token.document.uuid);
            await effectData.setFlag("gambits-premades", "enervationTargetUuid", targetUuids);
            await effectDataRange.setFlag("ActiveAuras", "customCheck", `token.document.uuid === '${targetUuids[0]}' && MidiQOL.canSee(token.document.uuid, '${targetUuids[0]}')`);
        }

        await Sequencer.EffectManager.endEffects({ name: `${token.id}_Enervation`});
    }

    if(args[0] === "each") {
        item = await fromUuid(args[3]);
        let dialogId = "enervation";
        let dialogTitlePrimary = `${token.actor.name} | ${item.name}`;
        let browserUser = game.gps.getBrowserUser({ actorUuid: actor.uuid });
        let gmUser = game.gps.getPrimaryGM();
        let effectData = actor.appliedEffects.find(e => e.name === item.name);
        const targetUuids = effectData.getFlag("gambits-premades", "enervationTargetUuid");
        const castLevel = effectData.getFlag("gambits-premades", "enervationCastLevel");
        const numDice = castLevel - 1;

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">Would you like to use your action this round to deal 4d8 necrotic damage to your target via Enervation?</p>
                                <div id="image-container" class="gps-dialog-image-container">
                                    <img id="img_${dialogId}" src="${item.img}" class="gps-dialog-image">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="gps-dialog-button-container">
                    <button id="pauseButton_${dialogId}" type="button" class="gps-dialog-button">
                        <i class="fas fa-pause" id="pauseIcon_${dialogId}" style="margin-right: 5px;"></i>Pause
                    </button>
                </div>
            </div>
        `;
        
        let result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft: 30,validTokenPrimaryUuid: token.document.uuid,source:gmUser === browserUser ? "gm" : "user",type:"singleDialog"});
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result;

        if (!userDecision) {
            return;
        }
        else if (userDecision) {
            for(let target of targetUuids) {
                target = await fromUuid(target);
                let damageRoll = await new CONFIG.Dice.DamageRoll(`${numDice}d8`, {}, {type: "necrotic", properties: ["mgc"]}).evaluate();
                await MidiQOL.displayDSNForRoll(damageRoll, 'damageRoll');

                const itemData = {
                    name: "Enervation - Damage (Necrotic)",
                    type: "feat",
                    img: item.img
                }

                await new MidiQOL.DamageOnlyWorkflow(actor, token, damageRoll.total, "necrotic", [target.object], damageRoll, {itemData: itemData, flavor: "Enervation - Damage (Necrotic)"});

                const healAmount = Math.floor(damageRoll.total / 2);
                await MidiQOL.applyTokenDamage([{ damage: healAmount, type: "healing" }], healAmount, new Set([token]), item, new Set());

                let content = `<span style='text-wrap: wrap;'>You deal ${damageRoll.total} points of damage to your target and heal up to ${healAmount} points using Enervation. <img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`
                let actorPlayer = MidiQOL.playerForActor(actor);
                let chatData = {
                    user: actorPlayer.id,
                    speaker: ChatMessage.getSpeaker({ token: token }),
                    content: content
                };
                ChatMessage.create(chatData);
            }
        }
    }
}
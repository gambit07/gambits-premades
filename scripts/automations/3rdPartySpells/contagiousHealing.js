export async function contagiousHealing({ speaker, actor, token, character, item, args, scope, workflow, options, macroItem }) {
    if(args[0].macroPass === "isDamaged") {
        const rangeCheck = MidiQOL.findNearby(null, token, 10, { includeToken: false });
        const withinRange = rangeCheck.filter(t => (!t.actor.flags["gambits-premades"].contagiousHealingApplied) && t.document.disposition === token.document.disposition && !["undead","construct"].includes(MidiQOL.raceOrType(t)));
        let effectData = token.actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "dabf704f-a59b-43b4-8552-9aa18734a362");

        if (withinRange.length > 0) {
            const randomToken = withinRange[Math.floor(Math.random() * withinRange.length)];
            await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: randomToken.actor.uuid, effects: [effectData.toObject()] });
            if(effectData) await MidiQOL.socket().executeAsGM("removeEffects", { actorUuid: actor.uuid, effects: [effectData.id] });
        }
        else {
            let effectOriginToken = await fromUuid(effectData.getFlag("gambits-premades", "contagiousHealingTokenUuid"));
            let targets = canvas.tokens.placeables.filter(t => {
                if (t.document.disposition !== token.document.disposition) return;
                if (!t.actor.flags["gambits-premades"].contagiousHealingApplied) return;
                return t;
            });

            if (targets.length === 0) return;

            for(let target of targets) {
                await target.actor.unsetFlag("gambits-premades", "contagiousHealingApplied");
            }

            let content = `<span style='text-wrap: wrap;'>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ThirdPartySpells.ContagiousHealing.NoAdditionalAlliesInRange")}</span>`;
            let actorPlayer = MidiQOL.playerForActor(effectOriginToken.actor);

            let chatData = {
                user: actorPlayer.id,
                speaker: ChatMessage.getSpeaker({ token: effectOriginToken }),
                content: game.i18n.localize(content)
            };
            ChatMessage.create(chatData);

            await MidiQOL.socket().executeAsGM("removeEffects", { actorUuid: actor.uuid, effects: [effectData.id] });
            await actor.unsetFlag("gambits-premades", "contagiousHealingApplied");
        }
    }

    else if(args[0].macroPass === "postActiveEffects") {
        let target = workflow.targets.first();
        let effectData = target.actor.appliedEffects.find(e => e.name === macroItem.name);
        let spellcasting = actor.system.attributes.spellcasting;
        let spellMod = actor.system.abilities[spellcasting].mod;
        let castLevel = workflow.castData.castLevel - 1;
        
        new Sequence()
            .effect()
                .file("jb2a.particle_burst.01.circle.green")
                .attachTo(target)
                .scaleToObject(3)
                .opacity(1)
                .zIndex(0)
                .belowTokens(false)
                .fadeIn(1500)
                .fadeOut(1500)
        .play()

        await target.actor.setFlag("gambits-premades", "contagiousHealingApplied", true);
        await effectData.setFlag("gambits-premades", "contagiousHealingCastLevel", castLevel);
        await effectData.setFlag("gambits-premades", "contagiousHealingSpellMod", spellMod);
        await effectData.setFlag("gambits-premades", "contagiousHealingTokenUuid", token.document.uuid);
    }

    else if(args[0] === "on") {
        let effectData = token.actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "dabf704f-a59b-43b4-8552-9aa18734a362");
        if(!effectData) return;
        let effectOriginToken = await fromUuid(effectData.getFlag("gambits-premades", "contagiousHealingTokenUuid"));
        if(!effectOriginToken) return;
        let castLevel = await effectData.getFlag("gambits-premades", "contagiousHealingCastLevel");
        if(!castLevel) return;
        let spellMod = await effectData.getFlag("gambits-premades", "contagiousHealingSpellMod");

        let healRoll = await new CONFIG.Dice.DamageRoll(`${castLevel}d8 + ${spellMod}`, {}, {type: "healing", properties: ["mgc"]}).evaluate();
        await MidiQOL.displayDSNForRoll(healRoll, 'damageRoll')

        const itemData = {
            name: "Contagious Healing",
            type: "feat",
            img: item.img
        }

        await new MidiQOL.DamageOnlyWorkflow(effectOriginToken.actor, effectOriginToken.object, healRoll.total, "healing", token ? [token] : [], healRoll, {itemData: itemData, flavor: "Contagious Healing"});
        
        new Sequence()
            .effect()
                .file("jb2a.particle_burst.01.circle.green")
                .attachTo(token)
                .scaleToObject(3)
                .opacity(1)
                .zIndex(0)
                .belowTokens(false)
                .fadeIn(1500)
                .fadeOut(1500)
        .play()

        await actor.setFlag("gambits-premades", "contagiousHealingApplied", true);
    }
}
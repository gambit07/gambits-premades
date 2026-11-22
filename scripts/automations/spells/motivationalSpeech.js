const speechId = "32cabdaf-560e-48ea-8980-37cf5ad242c0";
const pending = new Set();

export async function grantSpeechAdvantage({effectUuid}) {
    if(pending.has(effectUuid)) return;
    pending.add(effectUuid);
    try {
        const speech = await fromUuid(effectUuid), actor = speech?.parent;
        const claim = actor?.getFlag("gambits-premades", "motivationalSpeechTempHp");
        if(!speech?.active || speech.flags["gambits-premades"]?.gpsUuid !== speechId || claim?.effectUuid !== effectUuid
            || claim.paused || !(actor.system.attributes.hp.temp > 0) || actor.effects.some(e => e.flags.dnd5e?.dependentOn === effectUuid
                && e.flags["gambits-premades"]?.speechAdvantage)) return;
        const [bonus] = await actor.createEmbeddedDocuments("ActiveEffect", [{
            name: "Motivational Speech Advantage", img: speech.img, origin: speech.uuid, transfer: false,
            system: {magical: true, changes: [{key: "attack", type: "dnd5e.advantage", value: "1", priority: 100}]},
            flags: {dnd5e: {dependentOn: speech.uuid}, dae: {specialDuration: ["1Attack"]}, "gambits-premades": {speechAdvantage: true}}
        }]);
        if(bonus && (!actor.effects.get(speech.id)?.active || actor.getFlag("gambits-premades", "motivationalSpeechTempHp")?.effectUuid !== effectUuid)
            && actor.effects.has(bonus.id)) await bonus.delete();
    } finally { pending.delete(effectUuid); }
}

export async function motivationalSpeech({ speaker, actor, token, character, item, args, scope, workflow, options, macroItem }) {   
    if(args?.[0]?.macroPass === "isHit") {
        const claim = actor.getFlag("gambits-premades", "motivationalSpeechTempHp");
        if(claim?.effectUuid && !claim.paused) await game.gps.queryGM("grantSpeechAdvantage", {effectUuid: claim.effectUuid});
        return;
    }

    if(args?.[0]?.macroPass === "preActiveEffects")
    {
      let gmUser = game.gps.getPrimaryGM();
      const spellLevel = workflow.castData.castLevel - 2;
      const tempHpAmount = parseInt(spellLevel) * 5;
      await game.gps.queryUser("gpsApplyTempHp", gmUser, { actorUuids: workflow.targets.documents.filter(target => target.actor).map(target => target.actor.uuid), tempHp: tempHpAmount, motivationalSpeechSource: item.uuid });
    }

    if(args?.[0] !== "on" && args?.[0] !== "off") return;
    const context = args.at(-1);
    if(args[0] === "off" && game.gps.effectSuspended(context)) {
        const ids = actor.effects.filter(e => e.flags.dnd5e?.dependentOn === context.effectUuid && e.flags["gambits-premades"]?.speechAdvantage).map(e => e.id);
        if(ids.length) await MidiQOL.socket().executeAsGM("removeEffects", {actorUuid: actor.uuid, effects: ids});
    }
    const claim = actor.getFlag("gambits-premades", "motivationalSpeechTempHp");
    if(!claim || !context.effectUuid || (claim.effectUuid && claim.effectUuid !== context.effectUuid)) return;
    const source = macroItem?.uuid ?? item?.uuid;
    if(!claim.effectUuid && claim.sourceUuid !== source && claim.sourceUuid !== context.origin) return;
    const hp = actor.system.attributes.hp.temp ?? 0;
    const flag = "flags.gambits-premades.motivationalSpeechTempHp";
    const clear = {"flags.gambits-premades.-=motivationalSpeechTempHp": null};
    const sync = {gpsMotivationalSpeechSync: true};
    if(args[0] === "on") {
        if(claim.paused && hp > 0) return actor.update(clear, sync);
        if(claim.effectUuid && !claim.paused) return;
        const updates = {[flag]: {...claim, effectUuid: context.effectUuid, paused: false}};
        if(claim.paused) updates["system.attributes.hp.temp"] = claim.amount;
        return actor.update(updates, sync);
    }
    if(game.gps.effectSuspended(context)) {
        if(claim.paused) return;
        if(hp <= 0 || hp > claim.amount) return actor.update(clear, sync);
        return actor.update({[flag]: {...claim, effectUuid: context.effectUuid, amount: hp, paused: true},
            "system.attributes.hp.temp": 0}, sync);
    }
    if(!claim.paused && hp > 0 && hp <= claim.amount) clear["system.attributes.hp.temp"] = 0;
    return actor.update(clear, sync);
}

/** Only real loss of this spell's last temporary hit point ends its effect. */
export async function trackSpeechHp(actor, hp, options) {
    if(options?.gpsMotivationalSpeechGrant || options?.gpsMotivationalSpeechSync) return;
    const claim = actor.getFlag("gambits-premades", "motivationalSpeechTempHp");
    if(!claim) return;
    if(claim.paused && hp <= 0) return;
    if(claim.paused || hp > claim.amount || hp <= 0) {
        await actor.unsetFlag("gambits-premades", "motivationalSpeechTempHp");
        if(!claim.paused && hp <= 0 && claim.effectUuid) {
            const effect = actor.effects.find(e => e.uuid === claim.effectUuid);
            if(effect) await effect.delete();
        }
    } else if(hp !== claim.amount) await actor.setFlag("gambits-premades", "motivationalSpeechTempHp", {...claim, amount: hp});
}

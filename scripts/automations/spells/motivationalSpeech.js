export async function motivationalSpeech({ speaker, actor, token, character, item, args, scope, workflow, options, macroItem }) {   
    if(args?.[0]?.macroPass === "isHit")
    {
      item = await actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "32cabdaf-560e-48ea-8980-37cf5ad242c0");
      const effectName = "Motivational Speech Advantage";
      const effectCheck = actor.appliedEffects.some(e => e.name === effectName);
    
      if(!effectCheck)
      {
        const uuid = actor.uuid;
        let effectData = [{
          disabled: false,
          flags: {
            dae: { specialDuration: ["1Attack"] }
          },
          img: macroItem?.img ?? item?.img,
          duration: { value: 99999, units: "seconds" },
          name: "Motivational Speech Advantage",
          system: { changes: [
                {
                  key: "attack",
                  type: "dnd5e.advantage",
                  value: "1",
                  priority: 100
                }
              ] }
          }];
        await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: uuid, effects: effectData });
      }
    }

    if(args === "effectRemoval")
    {
      const effectId = await actor.appliedEffects?.find(e => e.flags["gambits-premades"]?.gpsUuid === "32cabdaf-560e-48ea-8980-37cf5ad242c0")?.id;
      if(effectId) await MidiQOL.socket().executeAsGM("removeEffects", { actorUuid: actor.uuid, effects: [effectId] });
    }
    
    if(args?.[0]?.macroPass === "preActiveEffects")
    {
      let gmUser = game.gps.getPrimaryGM();
      const spellLevel = workflow.castData.castLevel - 2;
      const tempHpAmount = parseInt(spellLevel) * 5;
      await game.gps.queryUser("gpsApplyTempHp", gmUser, { actorUuids: Array.from(workflow.targets).filter(target => target.actor).map(target => target.actor.uuid), tempHp: tempHpAmount, motivationalSpeechSource: item.uuid });
    }

    if(args?.[0] === "on")
    {
        const claim = actor.getFlag("gambits-premades", "motivationalSpeechTempHp");
        const effectUuid = args.at(-1)?.effectUuid;
        if(claim && !claim.effectUuid && effectUuid && claim.sourceUuid === (macroItem?.uuid ?? item?.uuid)) {
            await actor.setFlag("gambits-premades", "motivationalSpeechTempHp", {...claim, effectUuid});
        }
    }
    
    if(args?.[0] === "off")
    {
        const claim = actor.getFlag("gambits-premades", "motivationalSpeechTempHp");
        if(claim?.effectUuid && claim.effectUuid === args.at(-1)?.effectUuid) {
            const updates = {"flags.gambits-premades.-=motivationalSpeechTempHp": null};
            if(actor.system.attributes.hp.temp <= claim.amount) updates["system.attributes.hp.temp"] = 0;
            await actor.update(updates);
        }
    }
}

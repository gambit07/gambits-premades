export async function motivationalSpeech({ speaker, actor, token, character, item, args, scope, workflow, options, macroItem }) {
    if (args[0] === "onUpdateActor" && args?.[1].updates.system.attributes.hp.temp <= 0) {
      const effectId = await args[1].actor.appliedEffects?.find(e => e.flags["gambits-premades"]?.gpsUuid === "32cabdaf-560e-48ea-8980-37cf5ad242c0").id;
      await MidiQOL.socket().executeAsGM("removeEffects", { actorUuid: args[1].actorUuid, effects: [effectId] });
    }
    
    if(args[0].macroPass === "isHit")
    {
      item = await actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "32cabdaf-560e-48ea-8980-37cf5ad242c0");
      const effectName = "Motivational Speech Advantage";
      const effectCheck = await token.actor.appliedEffects.some(e => e.name === effectName);
    
      if(!effectCheck)
      {
        const uuid = actor.uuid;
        let effectData = [{
          disabled: false,
          flags: {
            dae: { specialDuration: ["1Attack"] }
          },
          icon: macroItem.img,
          duration: {
            seconds: 99999
          },
          name: "Motivational Speech Advantage",
          changes: [
                {
                  key: "flags.midi-qol.advantage.attack.all",
                  mode: 2,
                  value: "1",
                  priority: 20
                }
              ]
          }];
        await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: uuid, effects: effectData });
      }
    }
    
    if(args[0].macroPass === "preActiveEffects")
    {
      const spellLevel = workflow.castData.castLevel - 2;
      const tempHpAmount = parseInt(spellLevel) * 5;
      await Promise.all(workflow.targets.map(target => target.actor.applyTempHP(tempHpAmount)));
    }
    
    if(args[0] === "off")
    {
        await actor.update({"system.attributes.hp.temp": 0});
    }
}
export async function weaponOil({actor, token, item, macroItem, args, workflow}) {
    const oil = macroItem ?? item;
    const oilType = oil.flags["gambits-premades"]?.oilType;
    if(!oilType) return;
    const context = args.at(-1);
    const sourceUuid = context?.effectUuid ?? (context?.effectId ? `${actor.uuid}.ActiveEffect.${context.effectId}` : undefined);
    if(args[0] === "on" && sourceUuid) {
        const damageType = {arcane: "force", flame: "fire", frost: "cold", spark: "lightning", insanity: "necrotic", corrosive: "acid"}[oilType];
        for(const weapon of actor.items.filter(weapon => weapon.type === "weapon" && weapon.system.equipped && weapon.system.activities?.some(activity => ["mwak", "rwak"].includes(activity.actionType)))) {
            if(weapon.effects.some(effect => effect.flags["gambits-premades"]?.oilSource === sourceUuid)) continue;
            const changes = [{key: "system.properties", type: "add", value: "mgc", priority: 20}];
            if(damageType) changes.push({key: "system.damage.parts", type: "add", value: JSON.stringify({number: 1, denomination: 6, bonus: "", types: [damageType]}), priority: 20});
            await weapon.createEmbeddedDocuments("ActiveEffect", [{
                name: oil.name, img: oil.img, origin: oil.uuid, type: "enchantment", transfer: true,
                system: {changes}, flags: {dnd5e: {dependentOn: sourceUuid}, "gambits-premades": {oilSource: sourceUuid, oilItem: oil.uuid, oilType}}
            }]);
        }
        return;
    }
    if(args[0] === "off" && sourceUuid) {
        for(const weapon of actor.items) {
            const ids = weapon.effects.filter(effect => effect.flags["gambits-premades"]?.oilSource === sourceUuid).map(effect => effect.id);
            if(ids.length) await weapon.deleteEmbeddedDocuments("ActiveEffect", ids);
        }
        return;
    }
    if(!workflow || !["mwak", "rwak"].includes(workflow.activity?.actionType)) return;
    const coated = workflow.item.effects.some(effect => !effect.disabled && effect.flags["gambits-premades"]?.oilItem === oil.uuid);
    if(!coated) return;
    const pass = args[0]?.macroPass;
    if(oilType === "anti-demon") {
        const target = (pass === "preWaitForAttackRoll" ? workflow.targets : workflow.hitTargets).first();
        if(!target || !["undead", "fiend"].includes(MidiQOL.raceOrType(target))) return;
        if(pass === "preWaitForAttackRoll") workflow.advantage = true;
        if(pass !== "preDamageApplication") return;
        const roll = await new CONFIG.Dice.DamageRoll(`${workflow.isCritical ? 2 : 1}d6`, {}, {type: "radiant", properties: ["mgc"]}).evaluate();
        await MidiQOL.displayDSNForRoll(roll, "damageRoll");
        new MidiQOL.DamageOnlyWorkflow(actor, token, roll.total, "radiant", [target], roll, {itemData: {flags: {}, name: oil.name, type: "feat", img: oil.img}});
    }
    if(oilType === "corrosive") {
        for(const target of workflow.hitTargets) {
            if(pass === "preDamageRoll") await MidiQOL.socket().executeAsGM("createEffects", {actorUuid: target.actor.uuid, effects: [{
                name: "Corrosive Damage DR", img: oil.img, origin: oil.uuid,
                flags: {"gambits-premades": {corrosiveWorkflow: workflow.id}}, duration: {expiry: "turnEnd"},
                system: {changes: [{key: "flags.midi-qol.DR.all", type: "override", priority: 99, value: 0}]}
            }]});
            if(pass === "postActiveEffects") {
                const ids = target.actor.effects.filter(effect => DAE.effectMatchesSource(effect, oil.uuid) && effect.flags["gambits-premades"]?.corrosiveWorkflow === workflow.id).map(effect => effect.id);
                if(ids.length) await MidiQOL.socket().executeAsGM("removeEffects", {actorUuid: target.actor.uuid, effects: ids});
            }
        }
    }
}

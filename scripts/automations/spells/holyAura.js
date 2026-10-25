export async function holyAura({actor, item, args, workflow}) {
    if(args?.[0]?.macroPass === "postActiveEffects") {
        if(item.system.source.rules !== "2024" || workflow.aborted) return;
        const concentration = MidiQOL.getConcentrationEffect(actor, item.uuid);
        if(!concentration) return;
        const data = item.effects.find(effect => effect.flags["gambits-premades"]?.gpsUuid === "5f7adec6-3c0f-4654-8516-a4a38260ed85")?.toObject();
        if(!data) return;
        delete data._id;
        delete data._key;
        const recipients = Array.from(workflow.targets, target => target.document.uuid);
        data.type = "auraeffects.aura";
        data.origin = item.uuid;
        data.flags.dnd5e = {dependentOn: concentration.uuid};
        data.flags.auraeffects = {originalType: "base"};
        data.flags["gambits-premades"].holyAuraSource = item.uuid;
        data.system = {
            ...data.system, showRadius: false, applyToSelf: true, canStack: false,
            collisionTypes: ["move"], combatOnly: false, distanceFormula: "30", disposition: 0,
            evaluatePreApply: false, script: `${JSON.stringify(recipients)}.includes(token.document.uuid)`,
            stashedChanges: [], stashedStatuses: []
        };
        await actor.createEmbeddedDocuments("ActiveEffect", [data]);
        return;
    }
    if(args?.[0]?.macroPass !== "isHit" || !["mwak", "msak"].includes(workflow.activity?.actionType)) return;
    if(!["undead", "fiend"].includes(MidiQOL.raceOrType(workflow.token))) return;
    const effects = actor?.appliedEffects?.filter(effect => effect.flags["gambits-premades"]?.gpsUuid === "5f7adec6-3c0f-4654-8516-a4a38260ed85") ?? [];
    for(const effect of effects) {
        const sourceUuid = effect.flags["gambits-premades"]?.holyAuraSource ?? effect.flags["midi-qol"]?.castData?.itemUuid;
        const source = sourceUuid ? await fromUuid(sourceUuid) : DAE.getEffectItem(effect);
        if(!source) continue;
        workflow.gps ??= {};
        workflow.gps.holyAura ??= new Set();
        if(workflow.gps.holyAura.has(source.uuid)) continue;
        workflow.gps.holyAura.add(source.uuid);
        const save = await game.gps.gpsActivityUse({itemUuid: source.uuid, identifier: "syntheticSave", targetUuid: workflow.token.document.uuid});
        if(save?.failedSaves.size !== 1) continue;
        const concentration = MidiQOL.getConcentrationEffect(source.actor, source.uuid);
        if(!concentration) continue;
        const revised = source.system.source.rules === "2024";
        const data = {
            name: `${source.name}: ${game.i18n.localize("DND5E.ConBlinded")}`,
            img: source.img, origin: source.uuid, transfer: false, statuses: ["blinded"],
            duration: revised ? {expiry: "targetEnd", value: null} : {},
            flags: {"gambits-premades": {holyAuraBlindness: concentration.uuid}, dnd5e: revised ? {} : {dependentOn: concentration.uuid}}
        };
        await MidiQOL.socket().executeAsGM("createEffects", {actorUuid: workflow.token.actor.uuid, effects: [data]});
    }
}

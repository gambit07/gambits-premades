export async function lightSpell({ actor, token, item, args, workflow }) {
    if(args?.[0]?.macroPass !== "preActiveEffects" || !workflow || workflow.aborted) return;
    const haltEffectsApplication = {haltEffectsApplication: true};
    if(workflow.gpsLightProcessed) return haltEffectsApplication;
    const sourceItem = workflow.item ?? item;
    const sourceActor = sourceItem?.actor ?? actor;
    if(!sourceItem || !sourceActor || workflow.activity?.identifier === "syntheticSave") return;

    const target = workflow.targets.first() ?? token;
    const targetDocument = target?.document ?? target;
    const isLightEffect = effect => !effect.transfer
        && effect.system?.changes?.some(change => change.key === "token.light.color");
    const collectPrevious = () => {
        const sourceItems = new Map([[sourceItem.uuid, sourceItem]]);
        for(const spell of sourceActor.items) {
            if(spell.type === "spell" && spell.system.identifier === "light") sourceItems.set(spell.uuid, spell);
        }
        const origins = new Set();
        const candidates = new Map();
        for(const spell of sourceItems.values()) {
            origins.add(spell.uuid);
            for(const dependent of MidiQOL.MidiDependentsRegistry.get(spell.uuid)) candidates.set(dependent.uuid, dependent);
            for(const effect of spell.effects.filter(isLightEffect)) {
                origins.add(effect.uuid);
                for(const dependent of effect.getDependents()) candidates.set(dependent.uuid, dependent);
            }
        }
        for(const recipient of [sourceActor, targetDocument?.actor]) {
            for(const effect of recipient?.effects ?? []) candidates.set(effect.uuid, effect);
        }
        const matchesSource = effect => [...origins].some(uuid => DAE.effectMatchesSource(effect, uuid));
        for(const recipient of game.actors) {
            for(const effect of recipient.effects) {
                if(isLightEffect(effect) && matchesSource(effect)) candidates.set(effect.uuid, effect);
            }
        }
        for(const scene of game.scenes) {
            for(const sceneToken of scene.tokens) {
                if(sceneToken.actorLink || !sceneToken._source.delta?.effects?.some(effect => isLightEffect(effect) && matchesSource(effect))) continue;
                for(const effect of sceneToken.actor?.effects ?? []) {
                    if(isLightEffect(effect) && matchesSource(effect)) candidates.set(effect.uuid, effect);
                }
            }
        }
        const previous = new Map();
        for(const effect of candidates.values()) {
            if(effect.documentName !== "ActiveEffect" || effect.parent?.documentName !== "Actor"
                || effect.duration.expired || !effect.parent.effects.some(current => current.id === effect.id)
                || !isLightEffect(effect) || !matchesSource(effect)) continue;
            const effects = previous.get(effect.parent.uuid) ?? [];
            effects.push(effect.id);
            previous.set(effect.parent.uuid, effects);
        }
        return previous;
    };
    const previous = collectPrevious();
    const removePrevious = async reason => {
        workflow.gpsLightProcessed = true;
        for(const [actorUuid, effects] of collectPrevious()) {
            await MidiQOL.socket().executeAsGM("removeEffects", {
                actorUuid, effects, options: {"expiry-reason": reason}
            });
        }
    };
    const localize = key => game.i18n.localize(`GAMBITSPREMADES.Dialogs.Light.${key}`);
    const controls = [
        ...(previous.size ? [{action: "off", label: localize("TurnOff"), description: localize("TurnOffDescription"), icon: "fas fa-power-off"}] : []),
        {action: "cancel", label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Cancel"), classes: ["gps-choice-secondary"]}
    ];

    let unwilling = false;
    if(sourceItem.system.source.rules === "2024") {
        const kind = await game.gps.showAutomationDialog({ focusTokenUuid: targetDocument?.uuid,window: {title: sourceItem.name}, content: `<p>${game.i18n.localize("GAMBITSPREMADES.RulesReview.LightObject2024")}</p>`, buttonLayout: "list", buttons: [
            {action: "caster", label: localize("Caster"), description: game.i18n.localize("GAMBITSPREMADES.RulesReview.LightCasterObject"), icon: "fas fa-hand"},
            {action: "loose", label: localize("Unattended"), description: game.i18n.localize("GAMBITSPREMADES.RulesReview.LightLooseObject"), icon: "fas fa-cube"},
            ...controls
        ], rejectClose: false});
        if(kind === "off" && previous.size) {
            await removePrevious("light-dismissed");
            return haltEffectsApplication;
        }
        if(!targetDocument?.actor || !["caster", "loose"].includes(kind) || kind === "caster" && targetDocument.actor.uuid !== sourceActor.uuid) return haltEffectsApplication;

    }
    else {
        const eligibility = await game.gps.showAutomationDialog({ focusTokenUuid: targetDocument?.uuid,window: {title: sourceItem.name}, content: `<p>${game.i18n.localize("GAMBITSPREMADES.RulesReview.LightObject2014")}</p>`, buttonLayout: "list",
            buttons: [
                {action: "willing", label: localize("Willing"), description: game.i18n.localize("GAMBITSPREMADES.RulesReview.LightWilling"), icon: "fas fa-check"},
                {action: "unwilling", label: localize("Unwilling"), description: game.i18n.localize("GAMBITSPREMADES.RulesReview.LightUnwilling"), icon: "fas fa-shield-halved"},
                ...controls
            ], rejectClose: false});
        if(eligibility === "off" && previous.size) {
            await removePrevious("light-dismissed");
            return haltEffectsApplication;
        }
        if(!targetDocument?.actor || !["willing", "unwilling"].includes(eligibility)) return haltEffectsApplication;
        unwilling = eligibility === "unwilling";
    }

    const choices = sourceItem.effects.filter(isLightEffect);
    if(!choices.length) return haltEffectsApplication;
    const selected = await game.gps.showAutomationDialog({ focusTokenUuid: targetDocument?.uuid,
        window: {title: sourceItem.name},
        content: `<p>${game.i18n.localize("GAMBITSPREMADES.Dialogs.Window.LightColor")}</p>`,
        buttons: choices.map(effect => ({action: effect.uuid, label: effect.name, image: effect.img, callback: () => effect}))
    });
    if(!selected) return haltEffectsApplication;

    let resisted = false;
    if(sourceItem.system.source.rules === "2014" && unwilling) {
        const save = await game.gps.gpsActivityUse({
            itemUuid: sourceItem.uuid, identifier: "syntheticSave", targetUuid: targetDocument.uuid
        });
        if(!save) return haltEffectsApplication;
        resisted = save.failedSaves.size === 0;
    }

    await removePrevious("light-recast");
    if(!resisted) await DAE.doActivityEffects(workflow.activity, true, [targetDocument.uuid], [selected.uuid], {
        itemCardUuid: workflow.itemCardUuid, origin: selected.uuid
    });
    return haltEffectsApplication;
}

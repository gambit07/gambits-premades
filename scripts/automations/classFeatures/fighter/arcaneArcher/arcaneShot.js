const substitutions = new Set(["seekingArrow", "piercingArrow"]);
const optionId = activity => activity.identifier.replace(/18$/, "");
const itemId = item => (item.system.identifier ?? "").replace(/^arcane-shot-options-/, "").replace(/-legacy$/, "");
const markerId = activity => optionId(activity).replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
const turnKey = () => game.combat?.started ? `${game.combat.id}:${game.combat.round}:${game.combat.turn}` : null;
const learned = (actor, activity) => actor.items.some(item => itemId(item) === markerId(activity));
const levelAllowed = (actor, activity) => !["banishingArrow", "seekingArrow", "piercingArrow"].includes(optionId(activity)) || activity.identifier.endsWith("18") === (Number(actor.classes?.fighter?.system.levels ?? actor.system.classes?.fighter?.levels ?? 0) >= 18);
const isBow = item => item.type === "weapon" && ["shortbow", "longbow"].includes(item.system.type.baseItem || item.system.identifier);

export async function arcaneShot({actor, token, item, args, workflow, macroItem}) {
    const pass = args?.[0]?.macroPass;
    if(!workflow || workflow.aborted) return;
    const resource = actor.items.find(item => itemId(item) === "arcane-shot");
    if(!resource) return;
    const currentTurn = turnKey();
    const used = currentTurn && actor.getFlag("gambits-premades", "arcaneShotTurnUsed") === currentTurn;
    if(pass === "postAttackRollComplete") {
        if(used || !isBow(workflow.item) || !workflow.hitTargets.size || workflow.activity.activation.type !== "action" || workflow.workflowOptions?.gps?.opportunityAttack) return;
        if(Number(resource.system.uses.spent) >= Number(resource.system.uses.max)) return;
        const choices = resource.system.activities.filter(activity => learned(actor, activity) && levelAllowed(actor, activity) && !substitutions.has(optionId(activity)));
        if(!choices.length) return;
        const content = choices.map(activity => `<option value="${activity.id}">${foundry.utils.escapeHTML(activity.name)}</option>`).join("");
        const selected = await game.gps.showAutomationDialog({window: {title: resource.name}, content: `<p>${game.i18n.localize("GAMBITSPREMADES.RulesReview.ArcaneChoose")}</p><select name="option">${content}</select>`, buttons: [
            {action: "use", label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Yes"), callback: (event, button) => button.form.elements.option.value},
            {action: "cancel", label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Cancel")}
        ], rejectClose: false});
        const activity = choices.find(activity => activity.id === selected);
        if(activity) await MidiQOL.completeActivityUse(activity.uuid, {midiOptions: {targetUuids: [workflow.hitTargets.first().document.uuid], ignoreUserTargets: true, configureDialog: false,
            isCritical: workflow.isCritical, workflowOptions: {gps: {arcaneShotHit: true}}}}, {}, {});
        return;
    }
    if(itemId(item) !== "arcane-shot") return;
    const activity = workflow.activity;
    const option = optionId(activity);
    if(pass === "preItemRoll") {
        if(used || !learned(actor, activity) || !levelAllowed(actor, activity) || (!substitutions.has(option) && !workflow.workflowOptions?.gps?.arcaneShotHit)) return false;
        if(substitutions.has(option)) {
            const bows = actor.items.filter(item => isBow(item) && item.system.equipped);
            if(!bows.length) return false;
            const options = bows.map(item => `<option value="${item.id}">${foundry.utils.escapeHTML(item.name)}</option>`).join("");
            const selected = await game.gps.showAutomationDialog({window: {title: activity.name}, content: `<p>${game.i18n.localize("GAMBITSPREMADES.RulesReview.ArcaneAttackAction")}</p><label>${game.i18n.localize("GAMBITSPREMADES.RulesReview.ArcaneBow")}<select name="bow">${options}</select></label>`, buttons: [
                {action: "use", label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Yes"), callback: (event, button) => button.form.elements.bow.value},
                {action: "cancel", label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Cancel")}
            ], rejectClose: false});
            const bow = bows.find(item => item.id === selected);
            if(!bow) return false;
            if(option === "seekingArrow" && (workflow.targets.size !== 1 || !game.gps.withinRange(token, workflow.targets.first(), Number(bow.system.range.long || bow.system.range.value)))) return false;
            const attack = bow.system.activities.find(activity => activity.type === "attack");
            if(!attack) return false;
            const ammoOptions = (bow.system.ammunitionOptions ?? []).filter(option => actor.items.has(option.value));
            let ammoId = bow.getFlag("dnd5e", `last.${attack.id}.ammunition`);
            if(!ammoOptions.some(option => option.value === ammoId)) ammoId = ammoOptions[0]?.value;
            if(ammoOptions.length > 1) {
                const selectedAmmo = await game.gps.showAutomationDialog({window: {title: bow.name}, content: `<select name="ammunition">${ammoOptions.map(option => `<option value="${option.value}"${option.value === ammoId ? " selected" : ""}>${foundry.utils.escapeHTML(option.label)}</option>`).join("")}</select>`, buttons: [{action: "use", label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Yes"), callback: (event, button) => button.form.elements.ammunition.value}], rejectClose: false});
                if(!ammoOptions.some(option => option.value === selectedAmmo)) return false;
                ammoId = selectedAmmo;
            }
            if(ammoId && actor.items.get(ammoId)?.system.quantity < 1) return false;
            (workflow.gps ??= {}).arcaneAmmunitionId = ammoId;
            (workflow.gps ??= {}).arcaneBowUuid = bow.uuid;
        }
    }
    if(pass === "postPreambleComplete") {
        if(currentTurn) await actor.setFlag("gambits-premades", "arcaneShotTurnUsed", currentTurn);
        if(option === "graspingArrow") await game.gps.graspingArrow({workflow, args, actor, token, item});
    }
    if(pass === "preDamageRollComplete" && substitutions.has(option) && !workflow.gps?.arcaneWeaponDamage) {
        const bow = await fromUuid(workflow.gps?.arcaneBowUuid);
        const attack = bow?.system.activities.find(activity => activity.type === "attack");
        if(!attack) return;
        const ammunition = actor.items.get(workflow.gps?.arcaneAmmunitionId);
        const config = attack.getDamageConfig({isCritical: false, ammunition});
        const rolls = [];
        for(const part of config.rolls) rolls.push(await new CONFIG.Dice.DamageRoll(part.parts.join(" + "), part.data, {...part.options, isCritical: false}).evaluate());
        if(ammunition) {
            if(ammunition.system.quantity < 1) return void (workflow.aborted = true);
            await ammunition.update({"system.quantity": ammunition.system.quantity - 1});
        }
        (workflow.gps ??= {}).arcaneWeaponDamage = true;
        await workflow.setDamageRolls([...rolls, ...workflow.damageRolls]);
    }
    if(pass === "preActiveEffects" && option === "burstingArrow") {
        workflow.hitTargets = new Set(workflow.targets);
        await game.gps.burstingArrow({workflow, args, actor, token, item});
    }
    if(pass === "postSave" && option === "beguilingArrow") await game.gps.beguilingArrow({workflow, args, actor, token, item});
}

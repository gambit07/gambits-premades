// Animate at the same time damage is applied
async function preDamageApplication() {
    if (workflow.fireballanimated) return;
    await renderExplosion();
}

// Animate even if there are no targets
async function preActiveEffects() {
    if (workflow.fireballanimated) return;
    await renderExplosion();
}

async function renderExplosion() {
    let { animEnabled, damageColor } = game.gps.getCprConfig({itemUuid: macroItem.uuid});
    if (!animEnabled) return; 

    const damageType = workflow.damageDetail[0]?.type ?? "fire";
    damageColor = damageColor ?? "orange";
    if (["radiant", "lightning", "cold"].includes(damageType)) damageColor = "blue";
    else if (["necrotic", "poison", "acid"].includes(damageType)) damageColor = "green";
    else if (["thunder", "force", "psychic"].includes(damageType)) damageColor = "purple";
    else if (["slashing", "bludgeoning", "piercing"].includes(damageType)) damageColor = "purple";

    const templateData = fromUuidSync(workflow.templateUuid);
    let cast = game.gps.animation.fireball.cast(token, templateData, {color: damageColor});
    let explosion = game.gps.animation.fireball.explosion(token, templateData, {color: damageColor});

    await cast.play();
    await explosion.play();
    workflow.fireballanimated = true;
}

try {
    let states = {preActiveEffects, preDamageApplication};
    if (typeof workflow != "undefined") await states[workflow.macroPass]();
    else await states[args[0]]();
} catch(e) { console.error(e); }

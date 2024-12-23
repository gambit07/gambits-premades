/* DIME entry only -- not integrated into game.gps */

async function postDamageRoll() {
    let { animEnabled, damageColor } = game.gps.getCprConfig({itemUuid: macroItem.uuid});
    if(!animEnabled) return; 

    const damageType = workflow.damageDetail[0]?.type ?? "fire";
    damageColor = damageColor ?? "orange";
    if (["radiant", "lightning", "cold"].includes(damageType)) damageColor = "blue";
    else if (["necrotic", "poison", "acid"].includes(damageType)) damageColor = "green";
    else if (["thunder", "force", "psychic"].includes(damageType)) damageColor = "purple";
    else if (["slashing", "bludgeoning", "piercing"].includes(damageType)) damageColor = "red";

    const templateData = fromUuidSync(workflow.templateUuid);
    let cast = game.gps.animation.fireball.cast(token, templateData, {color: damageColor});
    let explosion = game.gps.animation.fireball.explosion(token, templateData, {color: damageColor});

    await cast.play();
    await explosion.play();
}

try {
    let states = {postDamageRoll};
    if (typeof workflow != "undefined") await states[workflow.macroPass]();
    else await states[args[0]]();
} catch(e) { console.error(e); }

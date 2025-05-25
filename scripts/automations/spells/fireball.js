export async function fireball({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    async function postDamageRoll() {
        if (workflow.fireballAnimated) return;
        await renderExplosion();
    }

    async function preActiveEffects() {
        if (workflow.fireballAnimated) return;
        await renderExplosion();
    }

    async function renderExplosion() {
        let { animEnabled, animColor } = game.gps.getCprConfig({itemUuid: item.uuid});
        if (!animEnabled) return;

        const damageType = workflow.damageDetail[0]?.type ?? "fire";
        animColor = animColor ?? "orange";
        if(animColor !== "orange") animColor = animColor;
        else if (["radiant", "lightning", "cold"].includes(damageType)) animColor = "blue";
        else if (["necrotic", "poison", "acid"].includes(damageType)) animColor = "green";
        else if (["thunder", "force", "psychic"].includes(damageType)) animColor = "purple";
        else if (["slashing", "bludgeoning", "piercing"].includes(damageType)) animColor = "purple";

        const templateData = fromUuidSync(workflow.templateUuid);
        let cast = game.gps.animation.fireball({type: "cast", token, templateData, color: animColor});
        let explosion = game.gps.animation.fireball({type: "explosion", token, templateData, color: animColor});

        await cast.play();
        await explosion.play();
        workflow.fireballAnimated = true;
    }

    try {
        let states = {preActiveEffects, postDamageRoll};
        if (typeof workflow != "undefined") await states[workflow.macroPass]();
        else await states[args[0]]();
    } catch(e) { console.error(e); }
}
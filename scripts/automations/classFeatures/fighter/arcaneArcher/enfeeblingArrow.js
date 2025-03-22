export async function enfeeblingArrow({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "preDamageRollComplete") {
        await game.gps.halfWeaponDamage({workflow});
    }
}
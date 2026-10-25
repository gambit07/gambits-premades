export async function ashardalonsStride({type, token, itemUuid, effectUuid}) {
    if(!game.gps.getCprConfig({itemUuid}).animEnabled) return;
    if(type === "use" && effectUuid) return game.gps.queryGM("setSpellVisual", {effectUuid, itemUuid, tokenUuid: token.document.uuid, kind: "stride", color: "orange"});
    if(type === "damage") game.gps.animation.spellEffect({kind: "strideImpact", at: token, scale: 1.3});
}

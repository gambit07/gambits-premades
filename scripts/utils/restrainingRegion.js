export async function restrainingRegion({tokenUuid, regionUuid, regionScenario, userId, turnKey, kind, revised = false}) {
    if(!tokenUuid || !regionUuid || game.user.id !== game.gps.regionEventUser(regionScenario, userId)) return;
    const tokenDocument = fromUuidSync(tokenUuid);
    const token = tokenDocument?.object;
    if(!token?.actor || !["npc", "character"].includes(token.actor.type) || !MidiQOL.isTargetable(token)) return;
    if(kind === "web" && token.actor.items.some(item => item.identifier === "web-walker")) return;
    const region = fromUuidSync(regionUuid);
    if(!region) return;
    const spell = await fromUuid(region.getFlag("dnd5e", "item"));
    if(!spell) return;
    const eventTurnKey = turnKey ?? game.gps.regionTurnKey();
    const turnEvent = revised && kind === "blackTentacles" ? "tokenTurnEnd" : "tokenTurnStart";
    const flag = `regionTurns.${kind === "web" ? "checkWebRound" : "checkBlackTentacleRound"}.${token.id}`;
    const handled = region.getFlag("gambits-premades", flag) === eventTurnKey;
    const restrained = () => game.gps.regionStatusEffects(token, regionUuid).length > 0;
    if(handled && !(restrained() && regionScenario === turnEvent)) return;
    let resumeMovement;
    let stopped = false;
    try {
        if(restrained() && regionScenario === turnEvent) {
            if(!handled && kind === "blackTentacles") {
                const result = await game.gps.gpsActivityUse({itemUuid: spell.uuid, identifier: revised ? "syntheticSave" : "syntheticDamage", targetUuid: tokenUuid});
                if(result || !revised) await game.gps.queryGM("gmSetFlag", {flagDocumentUuid: regionUuid, key: flag, value: eventTurnKey});
            }
        }
        else if(!restrained()) {
            if(regionScenario === "tokenEnter") resumeMovement = tokenDocument.pauseMovement();
            const save = await game.gps.gpsActivityUse({itemUuid: spell.uuid, identifier: "syntheticSave", targetUuid: tokenUuid});
            if(!save) return;
            await game.gps.queryGM("gmSetFlag", {flagDocumentUuid: regionUuid, key: flag, value: eventTurnKey});
            if(save.failedSaves.size) await game.gps.queryGM("setRegionStatus", {tokenUuid, regionUuid, active: true});
        }
        if(!restrained()) return;
        await game.gps.queryGM("ensureRegionEscape", {tokenUuid, regionUuid});
        if(regionScenario === "regionCreated") return;
        await game.gps.promptRegionEscape({tokenUuid, regionUuid, turnKey: eventTurnKey, regionScenario});
        if(regionScenario === "tokenEnter" && restrained()) {
            await game.gps.stopMovementEnter({token: tokenDocument});
            stopped = true;
        }
    }
    finally {
        if(!stopped) await resumeMovement?.();
    }
}

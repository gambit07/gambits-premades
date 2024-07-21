const regionTokenStates = new Map();

export async function cloudOfDaggers({tokenUuid, regionUuid, regionScenario}) {
    let region = await fromUuid(regionUuid);
    let template = await fromUuid(region.flags["region-attacher"].attachedTemplate)
    let tokenDocument = await fromUuid(tokenUuid);
    let token = tokenDocument.object;
    if(!token || !region || !regionScenario) return;
    if (!MidiQOL.isTargetable(token)) return;

    if ((token.actor.type !== 'npc' && token.actor.type !== 'character')) return;

    const effectOriginActor = await fromUuid(region.flags["region-attacher"].actorUuid);
    const effectOriginToken = await MidiQOL.tokenForActor(region.flags["region-attacher"].actorUuid);
    let itemProperName = "Cloud of Daggers";
    let chosenItem = effectOriginActor.items.find(i => i.name === itemProperName);

    if(regionScenario === "onExit") {
        const tokenState = regionTokenStates.get(region.id);
        if (tokenState) {
            tokenState.delete(token.id);
            regionTokenStates.set(region.id, tokenState);
        }
        regionTokenStates.set(`${region.id}-${token.id}-exited`, true);
        return;
    }
    else if(regionScenario === "onEnter") {
        const tokenState = regionTokenStates.get(region.id) || new Set();
        tokenState.add(token.id);
        regionTokenStates.set(region.id, tokenState);
        regionTokenStates.set(`${region.id}-${token.id}-entered`, true);
    }
    else if(regionScenario === "onPostMove") {
        if (token?.regions?.has(region)) return;
        const entered = regionTokenStates.get(`${region.id}-${token.id}-entered`);
        const exited = regionTokenStates.get(`${region.id}-${token.id}-exited`);
    
        if (entered || exited) {
            // This move is part of an enter or exit event, do not trigger the move logic
            regionTokenStates.delete(`${region.id}-${token.id}-entered`);
            regionTokenStates.delete(`${region.id}-${token.id}-exited`);
            return;
        }
    }

    let turn = game.combat.round + '-' + game.combat.turn;
    let lastTurn = region.flags['gambits-premades']?.spell?.cloudOfDaggers?.[token.id]?.turn;
    if (turn === lastTurn) return;
    await region.setFlag('gambits-premades', 'spell.cloudOfDaggers.' + token.id + '.turn', turn);

    let castLevel = template.getFlag("gambits-premades", "codCastLevel");

    let damageDice =  castLevel + 2;
    let damageRoll = await new CONFIG.Dice.DamageRoll(`${damageDice}d4`).evaluate();
    await MidiQOL.displayDSNForRoll(damageRoll, 'damageRoll');

    const itemData = {
        name: "Cloud of Daggers - Damage (Slashing)",
        type: "feat",
        img: chosenItem.img
    }

    new MidiQOL.DamageOnlyWorkflow(effectOriginActor, effectOriginToken, damageRoll.total, "slashing", token ? [token] : [], damageRoll, {itemData: itemData});
}
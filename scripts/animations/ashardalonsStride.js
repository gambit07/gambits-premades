export function ashardalonsStride({type, token, itemUuid}) {
    let cprConfig = game.gps.getCprConfig({itemUuid});
    if(!cprConfig.animEnabled) return;

    if(type === "use") {
        return new Sequence()
            .effect()
                .attachTo(token, {offset:{x: 0, y: -30}, local: true})
                .file("animated-spell-effects-cartoon.fire.30")
                .scaleToObject(2)
                .name(`${token.id}_ashardalonsStride`)
                .belowTokens()
                .persist()
            .play()
    }
    else if(type === "damage") {
        return new Sequence()
            .effect()
                .atLocation(token)
                .file("animated-spell-effects-cartoon.fire.16")
                .scaleToObject(1.3)
            .play()
    }
}
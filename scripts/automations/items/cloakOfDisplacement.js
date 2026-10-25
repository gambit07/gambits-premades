export async function cloakOfDisplacement({ actor, token, item, args = [], workflow }) {
    if(!actor) return;
    const tokens = token ? [token] : actor.getActiveTokens();
    const endAnimation = async () => {
        for(const activeToken of tokens) await Sequencer.EffectManager.endEffects({name: `${activeToken.id}-cloakOfDisplacement`});
    };
    if(args[0] === "off" && args[2] !== "startEnd") {
        await endAnimation();
        return;
    }
    const effects = Array.from(actor.allApplicableEffects());
    const cloak = effects.find(effect => effect.flags?.["gambits-premades"]?.cloakOfDisplacement === "benefit" || effect.name === "Cloak of Displacement");
    if(!cloak) return;
    const unavailable = actor.system.attributes.movement.speeds.walk === 0 || ["incapacitated", "paralyzed", "petrified", "stunned", "unconscious"].some(status => actor.statuses?.has(status));
    const suppressed = () => actor.getFlag("gambits-premades", "codTurnSuppressed");
    const setEnabled = async () => {
        if(unavailable || suppressed()) return;
        if(cloak.disabled) await cloak.update({disabled: false, "flags.gambits-premades.-=cloakStateSuppressed": null});
    };

    if(args[0] === "each") {
        await actor.unsetFlag("gambits-premades", "codTurnSuppressed");
        if(unavailable) {
            if(!cloak.flags?.["gambits-premades"]?.cloakStateSuppressed) await cloak.update({disabled: true, "flags.gambits-premades.cloakStateSuppressed": true});
            return;
        }
        await setEnabled();
    }
    else if(args?.[0]?.macroPass === "isDamaged") {
        if(!workflow?.damageTotal) return;
        await actor.setFlag("gambits-premades", "codTurnSuppressed", true);
        if(!cloak.disabled) await cloak.update({disabled: true});
        await endAnimation();
    }
    else if(["effectState", "effectSuppression", "effectActivation"].includes(args)) {
        if(unavailable && (!cloak.disabled || suppressed())) {
            if(!cloak.flags?.["gambits-premades"]?.cloakStateSuppressed) await cloak.update({disabled: true, "flags.gambits-premades.cloakStateSuppressed": true});
            await endAnimation();
        }
        else if(cloak.flags?.["gambits-premades"]?.cloakStateSuppressed) await setEnabled();
    }
    else if(["on", "off"].includes(args[0]) && args[2] === "startEnd") {
        await actor.unsetFlag("gambits-premades", "codTurnSuppressed");
        const controller = await fromUuid(args.at(-1)?.effectUuid);
        if(controller?.disabled) await controller.update({disabled: false});
        await setEnabled();
    }
    else if(args[0] === "on" && !unavailable && !suppressed()) {
        item = cloak.parent?.documentName === "Item" ? cloak.parent : item;
        if(!item) return;
        for(const activeToken of tokens) {
            if(Sequencer.EffectManager.getEffects({name: `${activeToken.id}-cloakOfDisplacement`}).length) continue;
            processSequencer({token: activeToken});
        }
    }

    function processSequencer({token}) {
        let cprConfig = game.gps.getCprConfig({itemUuid: item.uuid});
        const { animEnabled } = cprConfig;
        if(!animEnabled) return;

        new Sequence()

        .animation()
        .on(token)
        .opacity(0)

        .effect()
        .copySprite(token)
        .atLocation(token)
        .belowTokens()
        .animateProperty("sprite", "position.x", { from: -15, to: 15, duration: 500, pingPong: true})
        .duration(1500)
        .opacity(0.75)
        .tint("#d0c2ff")
        .loopProperty("alphaFilter", "alpha", { from: 0.75, to: 0.5, duration: 1000, pingPong: true})

        .effect()
        .copySprite(token)
        .atLocation(token)
        .belowTokens()
        .animateProperty("sprite", "position.x", { from: 15, to: -15, duration: 500, pingPong: true})
        .duration(1500)
        .opacity(0.75)
        .tint("#d0c2ff")
        .loopProperty("alphaFilter", "alpha", { from: 0.75, to: 0.5, duration: 1000, pingPong: true})

        .wait(500)

        .effect()
        .copySprite(token)
        .atLocation(token)
        .scaleToObject(1)
        .anchor({x:0.5})
        .belowTokens()
        .attachTo(token, {bindAlpha: false, bindRotation:true})
        .persist()
        .filter("Blur", { blurX: 2, blurY: 5 })
        .loopProperty("sprite", "position.x", { from: -10, to: 10, duration: 2500, pingPong:true})
        .zeroSpriteRotation()
        .opacity(0.75)
        .tint("#d0c2ff")
        .loopProperty("alphaFilter", "alpha", { from: 0.75, to: 0.5, duration: 2000, pingPong: true})
        .zIndex(4)
        .name(`${token.id}-cloakOfDisplacement`)

        .wait(200)

        .animation()
        .on(token)
        .fadeIn(1000)
        .opacity(1)

        .play();
    }
}

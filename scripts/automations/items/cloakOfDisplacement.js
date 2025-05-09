export async function cloakOfDisplacement({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if (args[0] === "each") {
        actor.unsetFlag("gambits-premades", "codTurnSuppressed");
        let effectData = await fromUuid(args[2].effectUuid);
        if(!effectData.disabled) return;
        if((actor.system.attributes.movement.walk === 0) || token.document.hasStatusEffect("incapacitated")) return;
        await effectData.update({"disabled" : false});
    }

    else if(args[0] === "off" && args[2] === "startEnd") {
        actor.unsetFlag("gambits-premades", "codTurnSuppressed");
        let effectOrigin = await fromUuid(args[3].effectUuid);
        await effectOrigin.update({"disabled" : false});
        if((actor.system.attributes.movement.walk === 0) || token.document.hasStatusEffect("incapacitated")) return;
        let effectData = await actor.allApplicableEffects().find(e => e.name === item.name)
        if(effectData.disabled) await effectData.update({"disabled" : false});
    }

    else if(args[0].macroPass === "isDamaged") {
        if(!workflow.damageTotal) return;
        let effectData = actor.appliedEffects.find(e => e.name === "Cloak of Displacement");
        await effectData.update({"disabled" : true});
        Sequencer.EffectManager.endEffects({ name: `${token.id}-cloakOfDisplacement` });
        actor.setFlag("gambits-premades", "codTurnSuppressed", true);
    }

    else if(args === "effectSuppression") {
        let effectData = actor.appliedEffects.find(e => e.name === "Cloak of Displacement");
        await effectData.update({"disabled" : true});
        Sequencer.EffectManager.endEffects({ name: `${token.id}-cloakOfDisplacement` });
    }

    else if (args === "effectActivation") {
        if(actor.getFlag("gambits-premades", "codTurnSuppressed")) return;
        let effectData = await actor.allApplicableEffects().find(e => e.name === "Cloak of Displacement")
        if(effectData.disabled) await effectData.update({"disabled" : false});
    }

    else if(args[0] === "on" && args[2] === "startEnd") {
        let effectData = await actor.allApplicableEffects().find(e => e.name === item.name)
        if(effectData.disabled) await effectData.update({"disabled" : false});
        let effectOrigin = await fromUuid(args[3].effectUuid);
        await effectOrigin.update({"disabled" : false});
        actor.unsetFlag("gambits-premades", "codTurnSuppressed");
        let currentSeq = Sequencer.EffectManager.getEffects({ name: `${token.id}-cloakOfDisplacement` });
        if(currentSeq.length >= 1) return;
        processSequencer({token: token});
    }

    else if(args[0] === "on") {
        let currentSeq = Sequencer.EffectManager.getEffects({ name: `${token.id}-cloakOfDisplacement` });
        if(currentSeq.length >= 1) return;
        processSequencer({token: token});
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
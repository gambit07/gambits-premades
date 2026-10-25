export async function divineSense({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    async function wait(ms) { return new Promise(resolve => { setTimeout(resolve, ms); }); }
    let timeoutValue = 30; // Change duration effect will display for here in seconds.
    let distance = workflow.activity.range.value ?? game.gps.convertFromFeet({ range: 60 });
    let targets = MidiQOL.findNearby(null, token, distance, {includeToken: false, maxSize: CONFIG.DND5E.actorSizes['grg'].token});

    let totalCount = [];
    let is_celestial = [];
    let is_fiend = [];
    let is_undead = [];

    const getTypeOrRace = target => MidiQOL.raceOrType(target) ?? "";

    targets.forEach(target => {
        let typeOrRace = getTypeOrRace(target).toLowerCase();
        let collisionDetected = CONFIG.Canvas.polygonBackends.move.testCollision(token.center, target.center, {type:"move", mode:"any"});
        if (!collisionDetected) {
            if (["celestial", "fiend", "undead"].some(type => typeOrRace.includes(type))) {
                totalCount.push(target);
            }

            if (typeOrRace.includes("celestial")) is_celestial.push(target);
            if (typeOrRace.includes("fiend")) is_fiend.push(target);
            if (typeOrRace.includes("undead")) is_undead.push(target);
        }
    });

    await wait(300);
    let the_message = `<table border="1" style="text-align:center;"><thead><tr><th>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Paladin.DivineSense.Type")}</th><th>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Paladin.DivineSense.Found")}</th></tr></thead><tbody><tr><td>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Paladin.DivineSense.Undead")}</td><td>${is_undead.length}</td></tr><tr><td>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Paladin.DivineSense.Fiends")}</td><td>${is_fiend.length}</td></tr><tr><td>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Paladin.DivineSense.Celestials")}</td><td>${is_celestial.length}</td></tr></tbody><tbody style="background: rgba(0, 0, 0, 0.5);color: #f0f0e0;text-shadow: 1px 1px #000;border-bottom: 1px solid #000;"><tr><td>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Paladin.DivineSense.TotalSensed")}</td><td>${totalCount.length}</td></tr></tbody></table>`;
    await game.gps.replaceChatCard({ actorUuid: actor.uuid, itemUuid: item.uuid, itemCardUuid: workflow.itemCardUuid, chatContent: the_message });
    await wait(300);
    ui.chat.scrollBottom();

    let cprConfig = game.gps.getCprConfig({itemUuid: item.uuid});
    const { animEnabled } = cprConfig;

    if(animEnabled) {
        new Sequence()

        .effect()
        .file("jb2a.detect_magic.circle.yellow")
        .atLocation(token)
        .size(25, {gridUnits:true})
        .fadeOut(4000)
        .opacity(0.75)
        .belowTokens()

        .play()
    }

    const effectId = foundry.utils.randomID();
    let effectData = [{
        _id: effectId,
        img: item.img,
        "origin": item.uuid,
        "disabled": false,
        "name": item.name,
        system: { changes: [
        {
            "key": "token.detectionModes.divineSense.enabled",
            "type": "override",
            "value": true,
            "priority": 19
        },
        {
            "key": "token.detectionModes.divineSense.range",
            "type": "override",
            "value": String(distance),
            "priority": 20
        }
        ] }
    }];
    await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: actor.uuid, effects: effectData, options: {keepId: true} });

    setTimeout(() => {
        if(actor.effects.has(effectId)) MidiQOL.socket().executeAsGM("removeEffects", {actorUuid: actor.uuid, effects: [effectId]});
    }, timeoutValue * 1000);

    targets.forEach(target => {
        if (target.name !== token.name) {
            let collisionDetected = CONFIG.Canvas.polygonBackends.move.testCollision(token.center, target.center, {type:"move", mode:"any"});
            if (collisionDetected) return;

            const distance = Math.sqrt(
            Math.pow(target.x - token.x, 2) + Math.pow(target.y - token.y, 2)
            );

            const gridDistance = distance/canvas.grid.size

            if(animEnabled) {
                new Sequence()

                .effect()
                .delay(gridDistance*125)
                .file("jb2a.detect_magic.circle.yellow")
                .atLocation(token)
                .scaleToObject(2.5)
                .mask(token)

                .wait(500)

                .effect()
                .delay(gridDistance*125)
                .copySprite(target)
                .belowTokens()
                .attachTo(target, {locale: true})
                .scaleToObject(1, {considerTokenScale:true})
                .spriteRotation(target.rotation*-1)
                .filter("Glow", { color: 0xFFFFFF, distance: 15 })
                .duration(3000)
                .fadeIn(500, {delay:0})
                .fadeOut(1000, {ease: "easeInCubic"})
                .zIndex(0.2)
                .opacity(1)
                .playIf(() => {
                return ["fiend", "celestial", "undead"].includes(MidiQOL.raceOrType(target));
                })

                //Fiend Effect
                .effect()
                .delay(gridDistance*125)
                .copySprite(target)
                .belowTokens()
                .attachTo(target, {locale: true})
                .scaleToObject(1, {considerTokenScale:true})
                .spriteRotation(target.rotation*-1)
                .filter("Glow", { color: 0x911a1a, distance: 15 })
                .duration(timeoutValue * 1000)
                .fadeIn(2000, {delay:1000})
                .fadeOut(3500, {ease: "easeInSine"})
                .opacity(0.8)
                .zIndex(0.1)
                .loopProperty("alphaFilter", "alpha", { values: [0.5, 0], duration: 1000, pingPong: true ,delay:500})
                .playIf(() => {
                return MidiQOL.raceOrType(target) == "fiend";
                })

                .effect()
                .delay(gridDistance*125)
                .file("jb2a.extras.tmfx.outflow.circle.01")
                .attachTo(target, {locale: true})
                .scaleToObject(1.5, {considerTokenScale:false})
                .randomRotation()
                .duration(timeoutValue * 1000)
                .fadeIn(5000, {delay:0})
                .fadeOut(3500, {ease: "easeInSine"})
                .scaleIn(0, 3500, {ease: "easeInOutCubic"})
                .tint(0x870101)
                .opacity(0.5)
                .belowTokens()
                .playIf(() => {
                return MidiQOL.raceOrType(target) == "fiend";
                })

                //Celestial Effect
                .effect()
                .delay(gridDistance*125)
                .copySprite(target)
                .belowTokens()
                .attachTo(target, {locale: true})
                .scaleToObject(1, {considerTokenScale:true})
                .spriteRotation(target.rotation*-1)
                .filter("Glow", { color: 0xffd000, distance: 15 })
                .duration(timeoutValue * 1000)
                .fadeIn(2000, {delay:1000})
                .fadeOut(3500, {ease: "easeInSine"})
                .opacity(0.5)
                .zIndex(0.1)
                .loopProperty("alphaFilter", "alpha", { values: [0.5, 0], duration: 1000, pingPong: true ,delay:500})
                .playIf(() => {
                return MidiQOL.raceOrType(target) == "celestial";
                })

                .effect()
                .delay(gridDistance*125)
                .file("jb2a.extras.tmfx.outflow.circle.01")
                .attachTo(target, {locale: true})
                .scaleToObject(1.5, {considerTokenScale:false})
                .randomRotation()
                .duration(timeoutValue * 1000)
                .fadeIn(5000, {delay:0})
                .fadeOut(3500, {ease: "easeInSine"})
                .scaleIn(0, 3500, {ease: "easeInOutCubic"})
                .tint(0xf3d877)
                .opacity(0.75)
                .belowTokens()
                .playIf(() => {
                return MidiQOL.raceOrType(target) == "celestial";
                })

                //Undead Effect
                .effect()
                .delay(gridDistance*125)
                .copySprite(target)
                .belowTokens()
                .attachTo(target, {locale: true})
                .scaleToObject(1, {considerTokenScale:true})
                .spriteRotation(target.rotation*-1)
                .filter("Glow", { color: 0x111111, distance: 15 })
                .duration(timeoutValue * 1000)
                .fadeIn(2000, {delay:1000})
                .fadeOut(3500, {ease: "easeInSine"})
                .opacity(0.8)
                .zIndex(0.1)
                .loopProperty("alphaFilter", "alpha", { values: [0.5, 0], duration: 1000, pingPong: true ,delay:500})
                .playIf(() => {
                return MidiQOL.raceOrType(target) == "undead";
                })

                .effect()
                .delay(gridDistance*125)
                .file("jb2a.extras.tmfx.outflow.circle.01")
                .attachTo(target, {locale: true})
                .scaleToObject(1.5, {considerTokenScale:false})
                .randomRotation()
                .duration(timeoutValue * 1000)
                .fadeIn(5000, {delay:0})
                .fadeOut(3500, {ease: "easeInSine"})
                .scaleIn(0, 3500, {ease: "easeInOutCubic"})
                .tint(0x121212)
                .opacity(0.5)
                .belowTokens()
                .playIf(() => {
                return MidiQOL.raceOrType(target) == "undead";
                })

                .play()
            }
        }
    })
}
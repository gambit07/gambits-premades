export async function viciousMockery({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "prePreambleComplete") {
        const targets = workflow.targets;
        for(let target of targets) {
            const hasEffectApplied = target.document.hasStatusEffect("deafened");
            if(hasEffectApplied) {
                workflow.targets.delete(target);
                ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Spells.ViciousMockery.TargetCannotHearYou"));
            }
        }

        if(workflow.targets.size === 0) return workflow.aborted = true;
    }

    if(args[0].macroPass === "postSavesComplete") {
        if(!game.modules.get("animated-spell-effects-cartoon")?.active) return ui.notifications.error(game.i18n.localize("GAMBITSPREMADES.Notifications.Spells.DimensionDoor.MissingDependency"));
        let cprConfig = game.gps.getCprConfig({itemUuid: item.uuid});
        const { animEnabled } = cprConfig;

        const gmInputType = "freeform";

        const targets = workflow.failedSaves;
        if(targets.size === 0) return;

        for(let target of targets) {
            const targetActor = target.actor;
            const targetUuid = target.document.uuid;
            const uuid = targetActor.uuid;

            const effectDisadv = [{
                changes: [{ key: "flags.midi-qol.disadvantage.attack.all", mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM, value: 1, priority: 20 }],
                flags: { "dae": { "token": targetUuid, "specialDuration": ["1Attack","turnEnd"] } },
                disabled: false,
                name: item.name,
                icon: item.img,
                duration: {
                    seconds: 12
                }
            }];
            const checkEffect = targetActor.appliedEffects.find(i => i.name ===  item.name);
            if(!checkEffect) await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: uuid, effects: effectDisadv });

            if((gmInputType !== "dropdown" && gmInputType !== "freeform") || !gmInputType) return;
            if(!animEnabled) return;

            new Sequence()

            .effect()
            .name("Casting")
            .atLocation(token)
            .file(`jb2a.magic_signs.circle.02.enchantment.loop.purple`)
            .scaleToObject(1.5)
            .rotateIn(180, 600, {ease: "easeOutCubic"})
            .scaleIn(0, 600, {ease: "easeOutCubic"})
            .loopProperty("sprite", "rotation", { from: 0, to: -360, duration: 10000})
            .belowTokens()
            .fadeOut(2000)
            .zIndex(0)

            .effect()
            .atLocation(token)
            .file(`jb2a.magic_signs.circle.02.enchantment.loop.purple`)
            .scaleToObject(1.5)
            .rotateIn(180, 600, {ease: "easeOutCubic"})
            .scaleIn(0, 600, {ease: "easeOutCubic"})
            .loopProperty("sprite", "rotation", { from: 0, to: -360, duration: 10000})
            .belowTokens(true)
            .filter("ColorMatrix", {saturate:-1, brightness:2})
            .filter("Blur", { blurX: 5, blurY: 10 })
            .zIndex(1)
            .duration(1200)
            .fadeIn(200, {ease: "easeOutCirc", delay: 500})
            .fadeOut(300, {ease: "linear"})

            .effect()
            .file("jb2a.music_notations.{{music}}.purple")
            .scaleIn(0, 500, {ease: "easeOutQuint"})
            .delay(500)
            .atLocation(token, {offset:{y:-0.2}, gridUnits:true, randomOffset: 1.5})
            .scaleToObject(0.8)
            .zIndex(1)
            .playbackRate(1.5)
            .setMustache({
            "music": ()=> {
            const musics = [`bass_clef`,`beamed_quavers`,`crotchet`,`flat`,`quaver`, `treble_clef`];
            return musics[Math.floor(Math.random()*musics.length)];
            }
            })
            .repeats(5, 200, 200)
            .fadeOut(500)

            .play()

            let word = [];
            let content;
            if(gmInputType === "dropdown") {
                content = `
                    <div class="gps-dialog-container">
                        <div class="gps-dialog-section">
                            <div class="gps-dialog-content">
                                <p class="gps-dialog-paragraph">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.Spells.ViciousMockery.WhatDoYouSay")}</p>
                                <div>
                                    <div class="gps-dialog-flex">
                                        <select id="wordSelect" class="gps-dialog-select" style="background-color: rgba(181, 99, 69, 0.2);">
                                            ${gmInputText.map((name) => `<option class="gps-dialog-option" value="${name}">${name}</option>`).join('')}
                                        </select>
                                        <div id="image-container" class="gps-dialog-image-container">
                                            <img src="${item.img}" class="gps-dialog-image">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `
            }
            else if(gmInputType === "freeform") {
                content = `
                    <div class="gps-dialog-container">
                        <div class="gps-dialog-section">
                            <div class="gps-dialog-content">
                                <div>
                                    <div class="gps-dialog-flex">
                                        <p class="gps-dialog-paragraph">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.Spells.ViciousMockery.WhatDoYouSay")}</p>
                                        <div style='width: 100%; text-align: center;'>
                                            <input type="text" name="wordInput" id="wordInput" maxlength = "50" autofocus>
                                        </div>
                                        <div id="image-container" class="gps-dialog-image-container">
                                            <img src="${item.img}" class="gps-dialog-image">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `
            }

            await foundry.applications.api.DialogV2.wait({
                window: { title: game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.Spells.ViciousMockery.Windowtitle") },
                content: content,
                buttons: [{
                    action: "Cast",
                    label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Cast"),
                    default: true,
                    callback: async (event, button, dialog) => {
                        let wordInput = document.querySelector('#wordInput');
                        if(wordInput) word = wordInput.value;
                        let wordSelect = document.querySelector('#wordSelect');
                        if(wordSelect) word = wordSelect.options[wordSelect.selectedIndex].value;
                    }
                }],
                close: async () => {
                    return;
                }, rejectClose:false
            });

            const style = {
                "fill": "#ffffff",
                "fontFamily": "Helvetica",
                "fontSize": 40,
                "strokeThickness": 0,
                fontWeight: "bold"
            }

            new Sequence()

            .sound()
                .file("modules/dnd5e-animations/assets/sounds/Creatures/laughter.mp3")
                .fadeInAudio(500)
                .fadeOutAudio(500)

            .effect()
            .atLocation(target, {offset: {x: -0.25*target.document.width, y:-0.3*target.document.width}, randomOffset: 0.1, gridUnits: true})
            .file(`animated-spell-effects-cartoon.level 01.healing word.purple`)
            .fadeOut(250)
            .zIndex(1)
            .scale(0.25*target.width)
            .scaleIn(0, 500, {ease: "easeOutBack"})
            .zIndex(0)
            .animateProperty("sprite", "position.x", { from: -0.6, to:0, duration: 600, gridUnits: true, ease: "easeInExpo" })
            .animateProperty("sprite", "position.y", { from: -0.6, to:0, duration: 600, gridUnits: true, ease: "easeInExpo" })
            .animateProperty("sprite", "rotation", { from: 0, to:45, duration: 10,  ease: "easeOutElastic" })
            .scaleIn(0, 500, {ease: "easeOutElastic"})
            .filter("ColorMatrix", { hue: 50 })

            .effect()
            .file("jb2a.particles.outward.orange.02.02")
            .atLocation(target, {offset: {x: -0.25*target.document.width, y:-0.3*target.document.width}, randomOffset: 0.1, gridUnits: true})
            .scale(0.25*target.width)
            .duration(800)
            .fadeOut(200)
            .zIndex(1)
            .animateProperty("sprite", "position.x", { from: -0.6, to:0, duration: 600, gridUnits: true, ease: "easeInExpo" })
            .animateProperty("sprite", "position.y", { from: -0.6, to:0, duration: 600, gridUnits: true, ease: "easeInExpo" })
            .animateProperty("sprite", "rotation", { from: 0, to:45, duration: 10,  ease: "easeOutElastic" })
            .scaleIn(0, 500, {ease: "easeOutElastic"})
            .zIndex(2)

            .effect()
            .atLocation(target, {offset: {x: -0.25*target.document.width, y:-0.3*target.document.width}, randomOffset: 0.1, gridUnits: true})
            .text(`${word}`, style)
            .duration(5000)
            .fadeOut(1000)
            .animateProperty("sprite", "position.x", { from: -2.0, to:0, duration: 2000, gridUnits: true, ease: "easeInExpo" })
            .animateProperty("sprite", "position.y", { from: -2.0, to:0, duration: 2000, gridUnits: true, ease: "easeInExpo" })
            .animateProperty("sprite", "rotation", { from: 0, to:45, duration: 500,  ease: "easeOutElastic" })
            .animateProperty("sprite", "rotation", { from: -2.5, to:2.5, duration: 500,  ease: "easeOutElastic", delay: 650 })
            .scaleIn(0, 1000, {ease: "easeOutElastic"})
            .filter("Glow", { color: 0x6820ee })
            .zIndex(2)
            .shape("polygon", {
                        lineSize: 1,
                        lineColor: "#FF0000",
                        fillColor: "#FF0000",
            points: [{ x: -4, y: -4},{ x: 1.175, y: -1},{ x: -1, y: 1.175} ],
                        fillAlpha: 1,
                        gridUnits: true,
                        isMask:true,
                        name: "test"
                    })
                    
            .effect()
            .delay(600)
            .file("jb2a.impact.010.purple")
            .atLocation(target, {offset: {x: -0.25*target.document.width, y:-0.3*target.document.width},gridUnits: true})
            .scaleToObject(1.25)
            .zIndex(1)

            .effect()
            .delay(600)
            .copySprite(target)
            .attachTo(target)
            .fadeIn(200)
            .fadeOut(500)
            .loopProperty("sprite", "position.x", { from: -0.05, to: 0.05, duration: 50, pingPong: true, gridUnits: true})
            .scaleToObject(target.document.texture.scaleX)
            .duration(1800)
            .opacity(0.2)
            .tint(0x6820ee)

            .effect()
            .delay(1200)
            .file("animated-spell-effects-cartoon.misc.demon")
            .atLocation(target, {offset: {x: -0, y:-0.5*target.document.width},gridUnits: true})
            .scaleToObject(0.75)
            .playbackRate(1.5)
            .rotate(-20)
            .filter("ColorMatrix", {hue:-100})

            .effect()
            .delay(1500)
            .file("animated-spell-effects-cartoon.misc.demon")
            .atLocation(target, {offset: {x: -0.5*target.document.width, y:-0},gridUnits: true})
            .scaleToObject(0.75)
            .playbackRate(1.5)
            .rotate(15)
            .filter("ColorMatrix", {hue:-100})

            .play()
        }
    }
}
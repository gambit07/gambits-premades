export async function lanternHooded({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    let lightSource = "lantern";
    let fileHoodUp = "modules/gambits-premades/assets/images/hoodUpLantern.webp"
    let fileHoodDown = "modules/gambits-premades/assets/images/hoodDownLantern.webp"

    if (args[0] === "off" && args[2]["expiry-reason"] && (args[2]["expiry-reason"].includes("times-up") || args[2]["expiry-reason"].includes("effect-deleted")) && args[2]?.existing !== "effect-stacking") {
        const light = { dim: 0, bright: 0 };
        await token.document.update({ light });
        await Sequencer.EffectManager.endEffects({ name: `${token.document.id} ${lightSource}`, object: token });
    }

    if (args[0].macroPass === "preApplyDynamicEffects") {
    foundry.applications.api.DialogV2.wait({
        window: { title: 'Lantern' },
        content: `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">What would you like to do with your lantern?</p>
                                <div id="image-container" class="gps-dialog-image-container">
                                    <img src="${macroItem.img}" class="gps-dialog-image">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `,
        buttons: [{
            action: "Light",
            label: "Light",
            callback: async (event, button, dialog) => {
                new Sequence()

                .effect()
                .name(`${token.document.id} ${lightSource}`)
                .file(fileHoodUp)
                .atLocation(token)
                .attachTo(token, {followRotation: true, local: true})
                .scaleToObject(1, {considerTokenScale: true})
                .scaleIn(0, 500, {ease: "easeOutElastic"})
                .scaleOut(0, 250, {ease: "easeOutCubic"})
                .spriteOffset({x:0.35*token.document.width, y:0.1*token.document.width}, {gridUnits:true})
                .animateProperty("sprite", "rotation", { from: 60, to: -60, duration: 300, ease: "easeInOutBack"})
                .animateProperty("sprite", "rotation", { from: 0, to: 30, duration: 250, delay: 200, ease: "easeOutBack"})
                .loopProperty("sprite", "rotation", { from: 3, to: -3, duration: 1500, ease: "easeOutQuad", pingPong: true })
                .persist()
                .zeroSpriteRotation()
                .waitUntilFinished(-500)
                .play()

                //Define token light options
                var light = {dim: game.gps.convertFromFeet({ range: 60 }), bright: game.gps.convertFromFeet({ range: 30 }), alpha:0.25, angle:360, luminosity: 0.5, color: "#ffb433", animation: {type: "torch", speed: 4, intensity: 4},attenuation: 0.75, contrast:0.15, shadows:0.2};

                await token.document.update({light});
            }
        },
        {
            action: "Dim",
            label: "Dim",
            callback: async (event, button, dialog) => {
                await Sequencer.EffectManager.endEffects({ name: `${token.document.id} ${lightSource}`, object: token });
                new Sequence()

                .effect()
                .name(`${token.document.id} ${lightSource}`)
                .file(fileHoodDown)
                .atLocation(token)
                .attachTo(token, {followRotation: true, local: true})
                .scaleToObject(1, {considerTokenScale: true})
                .scaleIn(0, 500, {ease: "easeOutElastic"})
                .scaleOut(0, 250, {ease: "easeOutCubic"})
                .spriteOffset({x:0.35*token.document.width, y:0.1*token.document.width}, {gridUnits:true})
                .animateProperty("sprite", "rotation", { from: 60, to: -60, duration: 300, ease: "easeInOutBack"})
                .animateProperty("sprite", "rotation", { from: 0, to: 30, duration: 250, delay: 200, ease: "easeOutBack"})
                .loopProperty("sprite", "rotation", { from: 3, to: -3, duration: 1500, ease: "easeOutQuad", pingPong: true })
                .persist()
                .zeroSpriteRotation()
                .rotate(tokenData.document.flags?.autorotate?.offset ?? 0)
                .spriteScale({ x: 1.0 / tokenData.document.texture.scaleX, y: 1.0 / tokenData.document.texture.scaleY })
                .waitUntilFinished(-500)
                .play()
                var light = {dim: game.gps.convertFromFeet({ range: 5 }), bright: 0, alpha:0.25, luminosity: 0.5, angle:360, color: "#ffb433", animation: {type: "torch", speed: 4, intensity: 4},attenuation: 0.75, contrast:0.15, shadows:0.2};
                await token.document.update({light});
            }
        },
        {
            action: "Extinguish",
            label: "Extinguish",
            callback: async (event, button, dialog) => {
                var light = {dim: 0, bright: 0};
                await token.document.update({light});
                await Sequencer.EffectManager.endEffects({ name: `${token.document.id} ${lightSource}`, object: token });
                const effectData = await actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "517ab516-3a1f-4df0-ae1c-1cebbd9ee1d0");
                if(effectData) await effectData.delete();
            }
        }
        ],
        close: async (event, dialog) => {
            return;
        }, rejectClose:false
    });
    }
}
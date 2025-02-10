export async function lanternBullseye({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    let lightSource = "lantern";
    let file = "modules/gambits-premades/assets/images/bullseyeLantern.webp"
    let lanternStatus = Sequencer.EffectManager.getEffects({ name: `${token.document.id} ${lightSource}` });

    if (args[0] === "off" && args[2]["expiry-reason"] && (args[2]["expiry-reason"].includes("times-up") || args[2]["expiry-reason"].includes("effect-deleted")) && args[2]?.existing !== "effect-stacking") {
        const light = { dim: 0, bright: 0 };
        await token.document.update({ light });
        await Sequencer.EffectManager.endEffects({ name: `${token.document.id} ${lightSource}`, object: token });
    }

    async function updateLantern() {
        if (args[0].macroPass === "preApplyDynamicEffects") {
            if (lanternStatus.length === 0) {
                await showLanternLightDialog();
            } else if (lanternStatus.length !== 0) {
                await showLanternOptionsDialog();
            }
            else {
                workflow.aborted = true;
            }
        }

        if (args[0] === "off" && args[2]["expiry-reason"] && (args[2]["expiry-reason"].includes("times-up") || args[2]["expiry-reason"].includes("effect-deleted")) && args[2]?.existing !== "effect-stacking") {
            const light = { dim: 0, bright: 0 };
            await token.document.update({ light });
            await Sequencer.EffectManager.endEffects({ name: `${token.document.id} ${lightSource}`, object: token });
        }
    }

    async function showLanternLightDialog() {
        await foundry.applications.api.DialogV2.wait({
            window: { title: 'Lantern' },
            content: `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <div>
                                <div class="gps-dialog-flex">
                                    <p class="gps-dialog-paragraph">Would you like to light your lantern?</p>
                                    <div id="image-container" class="gps-dialog-image-container">
                                        <img src="${item.img}" class="gps-dialog-image">
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
                    await lightNewLantern();
                }
            }],
            close: async (event, dialog) => {
                return;
            }, rejectClose:false
        });
    }

    async function showLanternOptionsDialog() {
        let result;
        await foundry.applications.api.DialogV2.wait({
            window: { title: 'Lantern' },
            content: `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <div>
                                <div class="gps-dialog-flex">
                                    <p class="gps-dialog-paragraph">Would you like to extinguish your lantern?</p>
                                    <div id="image-container" class="gps-dialog-image-container">
                                        <img src="${item.img}" class="gps-dialog-image">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            buttons: [{
                action: "Extinguish",
                label: "Extinguish",
                callback: async (event, button, dialog) => {
                    result = ({userDecision: true});
                }
            }],
            close: async (event, dialog) => {
                return;
            }, rejectClose:false
        });

        const { userDecision } = result;

        if(userDecision === true) {
            const light = {dim: 0, bright: 0};
            await token.document.update({light});
            await Sequencer.EffectManager.endEffects({ name: `${token.document.id} ${lightSource}`, object: token });
            const effectData = await actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "b41e3485-37ea-4e0c-9a99-e9874d85116e");
            if(effectData) await effectData.delete();
        }
    }

    async function lightNewLantern() {
        new Sequence()

        .effect()
        .name(`${token.document.id} ${lightSource}`)
        .file(file)
        .atLocation(token)
        .attachTo(token, {bindRotation: true, local: true})
        .scaleToObject(.7, {considerTokenScale: true})
        .scaleIn(0, 500, {ease: "easeOutElastic"})
        .scaleOut(0, 250, {ease: "easeOutCubic"})
        .spriteOffset({x:0.0*token.document.width, y:0.45*token.document.width}, {gridUnits:true})
        .animateProperty("sprite", "rotation", { from: 60, to: -60, duration: 300, ease: "easeInOutBack"})
        .animateProperty("sprite", "rotation", { from: 0, to: 30, duration: 250, delay: 200, ease: "easeOutBack"})
        .loopProperty("sprite", "rotation", { from: 3, to: -3, duration: 1500, ease: "easeOutQuad", pingPong: true })
        .persist()
        .zeroSpriteRotation()
        .waitUntilFinished(-500)
        .play()

        //Define token light options
        var light = {dim: game.gps.convertFromFeet({ range: 120 }), bright: game.gps.convertFromFeet({ range: 60 }), alpha:0.25, angle:30, luminosity: 0.5, color: "#ffb433", animation: {type: "torch", speed: 4, intensity: 4},attenuation: 0.75, contrast:0.15, shadows:0.2};

        await token.document.update({light});
    }

    updateLantern();
}
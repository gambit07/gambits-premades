export async function candle({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    const LIGHT_SOURCE = "candle";
    const FILE_PATH = "modules/gambits-premades/assets/images/candle.webp";

    let lightStatus = Sequencer.EffectManager.getEffects({ name: `${token.document.id} ${LIGHT_SOURCE}` });

    async function updateLight() {
        if (args[0].macroPass === "preApplyDynamicEffects") {
            if (lightStatus.length === 0 && hasRemainingUses()) {
                await showLightDialog();
            } else if (lightStatus.length !== 0) {
                await showOptionsDialog();
            } else {
                notifyNoneRemaining();
                workflow.aborted = true;
            }
        }

        if (shouldExtinguish(args)) {
            await extinguishLight();
        }
    }

    function hasRemainingUses() {
        return (item.system.uses.max !== item.system.uses.spent) || item.system.quantity !== 1;
    }

    function shouldExtinguish(args) {
        return args[0] === "off" && args[2]["expiry-reason"] && 
            (args[2]["expiry-reason"].includes("times-up") || args[2]["expiry-reason"].includes("effect-deleted")) &&
            args[2]?.existing !== "effect-stacking";
    }

    async function extinguishLight() {
        const light = { dim: 0, bright: 0 };
        await token.document.update({ light });
        await Sequencer.EffectManager.endEffects({ name: `${token.document.id} ${LIGHT_SOURCE}`, object: token });
        let effectData = await actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "6a406ebd-b1d3-4ba9-ba5f-259d857879cf");
        if (effectData) await effectData.delete();
    }

    function notifyNoneRemaining() {
        ui.notifications.warn("You do not have any candles remaining.");
    }

    async function showLightDialog() {
        const dialog = await showDialog("Candle", "Would you like to light a candle?", [
            {
                action: "Light",
                label: "Light",
                callback: async () => await lightNew({})
            }
        ]);
    }

    async function showOptionsDialog() {
        const dialog = await showDialog("Candle", "What would you like to do with your candle?", [
            {
                action: "Light New",
                label: "Light New",
                callback: async () => {
                    await Sequencer.EffectManager.endEffects({ name: `${token.document.id} ${LIGHT_SOURCE}`, object: token });
                    if (!hasRemainingUses()) {
                        await extinguishLight();
                        notifyNoneRemaining();
                        return;
                    }
                    await lightNew({});
                }
            },
            {
                action: "Extinguish",
                label: "Extinguish",
                callback: async () => await extinguishLight()
            }
        ]);
    }

    async function showDialog(title, message, buttons) {
        const dialog = await new foundry.applications.api.DialogV2({
            window: { title },
            content: `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <div>
                                <div class="gps-dialog-flex">
                                    <p class="gps-dialog-paragraph">${message}</p>
                                    <div id="image-container" class="gps-dialog-image-container">
                                        <img src="${item.img}" class="gps-dialog-image">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            buttons: buttons.map(button => ({
                ...button,
                callback: async function () {
                    dialog.close();

                    if (button.callback) {
                        await button.callback();
                    }
                }
            })),
            close: async () => {},
            rejectClose: false
        });

        await dialog.render(true);
        return dialog;
    }

    async function lightNew({ torchOffsetX = 0.35 * token.document.width, flameOffsetX = 0.43 * token.document.width, tokenData = token }) {
        new Sequence()
            .effect()
            .delay(150)
            .name(`${tokenData.document.id} ${LIGHT_SOURCE}`)
            .file(game.modules.get("jb2a_patreon")?.active ? "jb2a.impact.002.orange" : "")
            .atLocation(tokenData)
            .attachTo(tokenData, { bindRotation: true, local: true })
            .scaleToObject(0.9, { considerTokenScale: true })
            .spriteOffset({ x: 0.525 * tokenData.document.width, y: -0.05 * tokenData.document.width }, { gridUnits: true })
            .spriteRotation(45)
            .zIndex(0.1)
            .rotate(tokenData.document.flags?.autorotate?.offset ?? 0)
            .spriteScale({ x: 1.0 / tokenData.document.texture.scaleX, y: 1.0 / tokenData.document.texture.scaleY })
            .effect()
            .name(`${tokenData.document.id} ${LIGHT_SOURCE}`)
            .file(FILE_PATH)
            .atLocation(tokenData)
            .attachTo(tokenData, { bindRotation: true, local: true })
            .scaleToObject(1, { considerTokenScale: true })
            .scaleIn(0, 500, { ease: "easeOutElastic" })
            .scaleOut(0, 250, { ease: "easeOutCubic" })
            .spriteOffset({ x: torchOffsetX, y: 0.1 * tokenData.document.width }, { gridUnits: true })
            .animateProperty("sprite", "rotation", { from: 60, to: -60, duration: 300, ease: "easeInOutBack" })
            .animateProperty("sprite", "rotation", { from: 0, to: 30, duration: 250, delay: 200, ease: "easeOutBack" })
            .persist()
            .zeroSpriteRotation()
            .rotate(tokenData.document.flags?.autorotate?.offset ?? 0)
            .spriteScale({ x: 1.0 / tokenData.document.texture.scaleX, y: 1.0 / tokenData.document.texture.scaleY })
            .effect()
            .delay(250)
            .name(`${tokenData.document.id} ${LIGHT_SOURCE}`)
            .file("jb2a.flames.04.loop.orange")
            .atLocation(tokenData)
            .attachTo(tokenData, { bindRotation: true, local: true })
            .scaleToObject(0.4, { considerTokenScale: true })
            .spriteOffset({ x: flameOffsetX, y: -0.12 * tokenData.document.width }, { gridUnits: true })
            .persist()
            .rotate(tokenData.document.flags?.autorotate?.offset ?? 0)
            .spriteScale({ x: 1.0 / tokenData.document.texture.scaleX, y: 1.0 / tokenData.document.texture.scaleY })
            .zIndex(0.1)
            .waitUntilFinished(-500)
            .play();

        const light = {
            dim: game.gps.convertFromFeet({ range: 10 }),
            bright: game.gps.convertFromFeet({ range: 5 }),
            alpha: 0.25,
            angle: 360,
            luminosity: 0.5,
            color: "#ffb433",
            animation: { type: "candle", speed: 4, intensity: 4 },
            attenuation: 0.75,
            contrast: 0.15,
            shadows: 0.2
        };
        await tokenData.document.update({ light });
        if (item.system.quantity > 1) {
            await item.update({ "system.quantity": item.system.quantity - 1 });
        } else {
            await item.update({ "system.uses.spent": 1 });
        }
    }

    updateLight();
}
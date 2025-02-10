export async function torch({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    const LIGHT_SOURCE = "torch";
    const FILE_PATH = "modules/gambits-premades/assets/images/torch.webp";

    let torchStatus = Sequencer.EffectManager.getEffects({ name: `${token.document.id} ${LIGHT_SOURCE}` });

    async function updateTorch() {
        if (args[0].macroPass === "preApplyDynamicEffects") {
            if (torchStatus.length === 0 && hasRemainingTorch()) {
                await showTorchLightDialog();
            } else if (torchStatus.length !== 0) {
                await showTorchOptionsDialog();
            } else {
                notifyNoTorchesRemaining();
                workflow.aborted = true;
            }
        }

        if (shouldExtinguishTorch(args)) {
            await extinguishTorch();
        }
    }

    function hasRemainingTorch() {
        return (item.system.uses.max !== item.system.uses.spent) || item.system.quantity !== 1;
    }

    function shouldExtinguishTorch(args) {
        return args[0] === "off" && args[2]["expiry-reason"] && 
            (args[2]["expiry-reason"].includes("times-up") || args[2]["expiry-reason"].includes("effect-deleted")) &&
            args[2]?.existing !== "effect-stacking";
    }

    async function extinguishTorch() {
        const light = { dim: 0, bright: 0 };
        await token.document.update({ light });
        await Sequencer.EffectManager.endEffects({ name: `${token.document.id} ${LIGHT_SOURCE}`, object: token });
        console.log(args, "this is args")
        let effectData = await actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "31ef3b37-2ae3-4057-8335-63f690d1ae8d");
        if (effectData) await effectData.delete(); 
    }

    function notifyNoTorchesRemaining() {
        ui.notifications.warn("You do not have any torches remaining.");
    }

    async function showTorchLightDialog() {
        const dialog = await showDialog("Torch", "Would you like to light a torch?", [
            {
                action: "Light",
                label: "Light",
                callback: async () => await lightNewTorch({})
            },
            {
                action: "Throw",
                label: "Throw",
                callback: async () => {
                    await createItemPileWithEffect();
                    if (item.system.quantity > 1) {
                        await item.update({ "system.quantity": item.system.quantity - 1 });
                    } else {
                        await item.update({ "system.uses.spent": 1 });
                    }
                }
            }
        ]);
    }

    async function showTorchOptionsDialog() {
        const dialog = await showDialog("Torch", "What would you like to do with your torch?", [
            {
                action: "Light New",
                label: "Light New",
                callback: async () => {
                    await Sequencer.EffectManager.endEffects({ name: `${token.document.id} ${LIGHT_SOURCE}`, object: token });
                    if (!hasRemainingTorch()) {
                        await extinguishTorch();
                        notifyNoTorchesRemaining();
                        return;
                    }
                    await lightNewTorch({});
                }
            },
            {
                action: "Extinguish",
                label: "Extinguish",
                callback: async () => await extinguishTorch()
            },
            {
                action: "Throw",
                label: "Throw",
                callback: async () => {
                    await Sequencer.EffectManager.endEffects({ name: `${token.document.id} ${LIGHT_SOURCE}`, object: token });
                    await extinguishTorch();
                    if (!hasRemainingTorch()) {
                        notifyNoTorchesRemaining();
                    }
                    await createItemPileWithEffect();
                }
            }
        ]);
    }

    async function showDialog(title, message, buttons) {
        const dialog = new foundry.applications.api.DialogV2({
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

    async function lightNewTorch({ torchOffsetX = 0.35 * token.document.width, flameOffsetX = 0.5 * token.document.width, tokenData = token }) {
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
            .spriteScale({ x: 1.0 / tokenData.document.texture.scaleX, y: 1.0 / tokenData.document.texture.scaleY })
            .zIndex(0.1)
            .rotate(tokenData.document.flags?.autorotate?.offset ?? 0)
            .effect()
            .name(`${tokenData.document.id} ${LIGHT_SOURCE}`)
            .file(FILE_PATH)
            .atLocation(tokenData)
            .attachTo(tokenData, { bindRotation: true, local: true })
            .scaleToObject(1.2, { considerTokenScale: true })
            .scaleIn(0, 500, { ease: "easeOutElastic" })
            .scaleOut(0, 250, { ease: "easeOutCubic" })
            .spriteOffset({ x: torchOffsetX, y: 0.1 * tokenData.document.width }, { gridUnits: true })
            .spriteScale({ x: 1.0 / tokenData.document.texture.scaleX, y: 1.0 / tokenData.document.texture.scaleY })
            .animateProperty("sprite", "rotation", { from: 60, to: -60, duration: 300, ease: "easeInOutBack" })
            .animateProperty("sprite", "rotation", { from: 0, to: 30, duration: 250, delay: 200, ease: "easeOutBack" })
            .persist()
            .zeroSpriteRotation()
            .rotate(tokenData.document.flags?.autorotate?.offset ?? 0)
            .effect()
            .delay(250)
            .name(`${tokenData.document.id} ${LIGHT_SOURCE}`)
            .file("jb2a.flames.01.orange")
            .atLocation(tokenData)
            .attachTo(tokenData, { bindRotation: true, local: true })
            .scaleToObject(1, { considerTokenScale: true })
            .spriteOffset({ x: flameOffsetX, y: -0.05 * tokenData.document.width }, { gridUnits: true })
            .spriteScale({ x: 1.0 / tokenData.document.texture.scaleX, y: 1.0 / tokenData.document.texture.scaleY })
            .persist()
            .spriteRotation(45)
            .zIndex(0.1)
            .waitUntilFinished(-500)
            .rotate(tokenData.document.flags?.autorotate?.offset ?? 0)
            .play();

        const light = {
            dim: game.gps.convertFromFeet({ range: 40 }),
            bright: game.gps.convertFromFeet({ range: 20 }),
            alpha: 0.25,
            angle: 360,
            luminosity: 0.5,
            color: "#ffb433",
            animation: { type: "torch", speed: 4, intensity: 4 },
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

    async function createItemPileWithEffect() {
        let itemData = item.toObject();
        itemData.system.quantity = 1;
        
        try {
            const light = {
                dim: game.gps.convertFromFeet({ range: 40 }),
                bright: game.gps.convertFromFeet({ range: 20 }),
                alpha: 0.25,
                angle: 360,
                luminosity: 0.5,
                color: "#ffb433",
                animation: { type: "lantern", speed: 4, intensity: 4 },
                attenuation: 0.75,
                contrast: 0.15,
                shadows: 0.2
            };
            const options = {
                position: { x: token.center.x, y: token.center.y },
                sceneId: game.scenes.current.id,
                tokenOverrides: {
                    name: "Torch",
                    img: FILE_PATH,
                    light
                },
                items: [itemData],
                createActor: false,
                pileActorName: "Torch",
                pileSettings: {
                    type: game.itempiles.pile_types.PILE
                }
            };
            const { tokenUuid, actorUuid } = await game.itempiles.API.createItemPile(options);

            let tokenData = await fromUuid(tokenUuid);
            if(tokenData.texture.src !== FILE_PATH) await tokenData.update({"texture.src": FILE_PATH})
            tokenData = tokenData.object;

            new Sequence()
                .effect()
                .name(`${tokenData.document.id} ${LIGHT_SOURCE}`)
                .file(game.modules.get("jb2a_patreon")?.active ? "jb2a.impact.002.orange" : "")
                .atLocation(tokenData)
                .attachTo(tokenData, { bindRotation: true, local: true })
                .scaleToObject(0.9, { considerTokenScale: true })
                .spriteOffset({ x: 0.525 * tokenData.document.width, y: -0.05 * tokenData.document.width }, { gridUnits: true })
                .spriteRotation(45)
                .zIndex(0.1)
                .effect()
                .delay(250)
                .name(`${tokenData.document.id} ${LIGHT_SOURCE}`)
                .file("jb2a.flames.01.orange")
                .atLocation(tokenData)
                .attachTo(tokenData, { bindRotation: true, local: true })
                .scaleToObject(1, { considerTokenScale: true })
                .spriteOffset({ x: 0.12, y: -0.12 * tokenData.document.width }, { gridUnits: true })
                .persist()
                .spriteRotation(45)
                .zIndex(0.1)
                .waitUntilFinished(-500)
                .play();

            actor.sheet.minimize();

            let config = {
                gridHighlight: true,
                icon: { texture: FILE_PATH, borderVisible: true },
                location: { obj: tokenData, limitMaxRange: 60, showRange: true, wallBehavior: Sequencer.Crosshair.PLACEMENT_RESTRICTIONS.NO_COLLIDABLES }
            };

            let position = await Sequencer.Crosshair.show(config);

            if (!position) {
                await actor.sheet.maximize();
                return;
            }

            new Sequence()
                .animation()
                .on(tokenData)
                .opacity(0)
                .waitUntilFinished(-100)
                .effect()
                .copySprite(tokenData)
                .atLocation(tokenData)
                .opacity(1)
                .duration(1000)
                .anchor({ x: 0.5, y: 1 })
                .loopProperty("sprite", "position.y", { values: [50, 0, 50], duration: 500 })
                .moveTowards(position, { rotate: false })
                .zIndex(2)
                .effect()
                .copySprite(tokenData)
                .atLocation(tokenData)
                .opacity(0.5)
                .scale(0.9)
                .belowTokens()
                .duration(1000)
                .anchor({ x: 0.5, y: 0.5 })
                .filter("ColorMatrix", { brightness: -1 })
                .filter("Blur", { blurX: 5, blurY: 10 })
                .moveTowards(position, { rotate: false })
                .zIndex(2)
                .waitUntilFinished(-100)
                .animation()
                .on(tokenData)
                .teleportTo(position)
                .snapToGrid()
                .opacity(1)
                .play();

            await actor.sheet.maximize();
            let effectData = await actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "31ef3b37-2ae3-4057-8335-63f690d1ae8d");
            if (effectData) await effectData.delete();
        } catch (error) {
            console.error("Failed to create item pile:", error);
        }
    }

    updateTorch();
}
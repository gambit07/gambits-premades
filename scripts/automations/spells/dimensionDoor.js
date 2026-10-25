export async function dimensionDoor({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if (args[0].macroPass === "preActiveEffects") {
        if (workflow.targets.size > 1) return ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Spells.DimensionDoor.CanOnlySelectOne"));
        let target = workflow.targets.first() ?? null;
        if(target) {
            let targetDistance = MidiQOL.computeDistance(target,token, {wallsBlock: true, includeCover: true})
            if(targetDistance < 0 || targetDistance > game.gps.convertFromFeet({range:5})) return ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Spells.DimensionDoor.MustBeWithin5Feet"));

            const sizeMap = {
                tiny: 1,
                sm: 2,
                med: 3,
                lg: 4,
                huge: 5,
                grg: 6
            };
            let targetValue = sizeMap[target.actor.system.traits.size];
            let initiatingValue = sizeMap[actor.system.traits.size];
            if(targetValue > initiatingValue) return ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Spells.DimensionDoor.TooLarge"));
        }
        const portalScale = token?.w / canvas.grid.size * 0.7;

        const x1 = token.center.x;
        const y1 = token.center.y;
        const x2 = target?.center.x;
        const y2 = target?.center.y;
        let midpointX;
        let midpointY;
        if(target) {
            midpointX = (x1 + x2) / 2;
            midpointY = (y1 + y2) / 2;
        }
        else {
            midpointX = x1;
            midpointY = y1;
        }

        let cprConfig = game.gps.getCprConfig({itemUuid: item.uuid});
        let { animEnabled, animColor } = cprConfig;
        if(animColor === "orange") animColor = "yellow";
        if(!["green", "purple", "yellow"].includes(animColor)) animColor = "green";
        animEnabled &&= Sequencer.Database.entryExists(`eskie.environment.portal.doorway.01.side.one_shot.no_base.${animColor}`);

        if(animEnabled) {
            const magicSign = new Sequence().effect()
                .file(`eskie.environment.portal.doorway.01.side.one_shot.no_base.${animColor}`)
                .atLocation({ x: midpointX, y: midpointY })
                .scale(portalScale * 1.5)
                .opacity(1)
                .name(`${token.document.name}_DimensionDoor1`)
                .persist();

            const magicSign2 = new Sequence().effect()
                .file(`jb2a.portals.horizontal.ring.dark_${animColor}`)
                .belowTokens()
                .atLocation(token)
                .scaleToObject(2)
                .opacity(0.5)
                .name(`${token.document.name}_DimensionDoor2`)
                .persist();

            let magicSign3;
            if(target) {
                magicSign3 = new Sequence().effect()
                    .file(`jb2a.portals.horizontal.ring.dark_${animColor}`)
                    .belowTokens()
                    .atLocation(target)
                    .scaleToObject(2)
                    .opacity(0.5)
                    .name(`${token.document.name}_DimensionDoor3`)
                    .persist();
            }

            await magicSign.play();
            await magicSign2.play();
            if(target) await magicSign3.play();
        }

        let config = {
            gridHighlight: true,
            icon: {
                texture: token.document.texture.src,
                borderVisible: true
            },
            location: {
                obj: token,
                limitMaxRange: workflow.activity.range.value ?? game.gps.convertFromFeet({range: 500}),
                showRange: true
            }
        };
          
        let callbacks = animEnabled ? {
            [Sequencer.Crosshair.CALLBACKS.MOUSE_MOVE]: (crosshair) => {
                new Sequence()
                    .effect()
                        .file(`eskie.environment.portal.doorway.01.side.one_shot.no_base.${animColor}`)
                        .atLocation({ x: crosshair.x, y: crosshair.y })
                        .scale(0.25)
                        .duration(500)
                        .fadeOut(500)
                .play();
            }
        } : {};
          
        let position = await Sequencer.Crosshair.show(config, callbacks);

        if(animEnabled) {
            Sequencer.EffectManager.endEffects({ name: `${token.document.name}_DimensionDoor1` });
            Sequencer.EffectManager.endEffects({ name: `${token.document.name}_DimensionDoor2` });
            if(target) Sequencer.EffectManager.endEffects({ name: `${token.document.name}_DimensionDoor3` });
        }

        if(!position) return;

        const outroSequence = new Sequence();
        if(animEnabled) {
            let hue;
            let file;
            switch (animColor) {
                case "green":
                    hue = 0;
                    file = "jb2a.energy_conduit.greenyellow.square"
                    break;
                case "purple":
                    hue = 30;
                    file = "jb2a.energy_conduit.bluepurple.square.01"
                    break;
                case "yellow":
                    hue = 60;
                    file = "jb2a.energy_conduit.greenyellow.square"
                    break;
            }
            
            outroSequence.effect()
                .file(file)
                .scale(portalScale * 0.5)
                .duration(1200)
                .fadeOut(500)
                .fadeIn(200)
                .atLocation({ x: midpointX, y: midpointY })
                .filter("ColorMatrix", { hue: hue })
                .stretchTo(position);

            outroSequence.effect()
                .copySprite(token)
                .fadeIn(500)
                .duration(500)
                .zeroSpriteRotation()
                .waitUntilFinished();
        }

        outroSequence.animation()
            .on(token)
            .teleportTo(position, { relativeToCenter: true })
            .opacity(1);

        await outroSequence.play();

        let offsetLocation = position;

        if(target) {
            const tokenSize = target.w;
            const offsetX = (token.w + tokenSize) / 2;

            offsetLocation = {
                x: position.x + offsetX,
                y: position.y 
            };

            const outroSequence2 = new Sequence();
            outroSequence2.animation()
                .on(target)
                .teleportTo(offsetLocation, { relativeToCenter: true })
                .opacity(1);

            await outroSequence2.play();
        }
        if(animEnabled) {
            const outroSequence3 = new Sequence().effect()
            .file(`eskie.environment.portal.doorway.01.side.one_shot.no_base.${animColor}`)
            .atLocation(offsetLocation)
            .scale(portalScale * 1.5)
            .opacity(1);
            await outroSequence3.play();
        }
    }
}
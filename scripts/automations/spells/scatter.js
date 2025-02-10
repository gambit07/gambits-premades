export async function scatter({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if (args[0].macroPass === "preActiveEffects") {
        for (let target of workflow.failedSaves) {
            if(!MidiQOL.canSee(token, target)) continue;
            const portalScale = target.w / canvas.grid.size * 0.7;

            const magicSign = new Sequence().effect()
                .file('jb2a.magic_signs.rune.conjuration.intro.purple')
                .atLocation(target)
                .scale(portalScale * 0.7)
                .opacity(0.5)
                .waitUntilFinished(-600);

            const introSequence = new Sequence().effect()
                .file('jb2a.template_circle.vortex.loop.purple')
                .atLocation(target)
                .scale(portalScale * 0.5)
                .persist()
                .fadeIn(200)
                .belowTokens(true)
                .name(`${target.document.name}_Scatter`)
                .fadeOut(500);
            introSequence.animation()
                .on(target)
            introSequence.effect()
                .copySprite(target)
                .zeroSpriteRotation()
                .fadeOut(500)
                .duration(500);
            introSequence.wait(250);

            await magicSign.play();
            await introSequence.play();

            let config = {
                gridHighlight: true,
                icon: {texture: target.document.texture.src, borderVisible: true},
                location: {obj: token, limitMaxRange: 120, showRange: true, wallBehavior: Sequencer.Crosshair.PLACEMENT_RESTRICTIONS.NO_COLLIDABLES}
            }

            let position = await Sequencer.Crosshair.show(config)

            Sequencer.EffectManager.endEffects({ name: `${target.document.name}_Scatter` });
            if(!position) return;
            const outroSequence = new Sequence();
            outroSequence.effect()
                .file('jb2a.template_circle.vortex.outro.purple')
                .scale(portalScale * 0.5)
                .duration(1200)
                .fadeOut(500)
                .fadeIn(200)
                .atLocation(position);

            outroSequence.effect()
                .copySprite(target)
                .fadeIn(500)
                .duration(500)
                .zeroSpriteRotation()
                .waitUntilFinished();

            outroSequence.animation()
                .on(target)
                .teleportTo(position, { relativeToCenter: true })
                .opacity(1);

            await outroSequence.play();
        }
    }
}
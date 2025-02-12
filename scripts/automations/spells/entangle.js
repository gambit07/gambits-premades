export async function entangle({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if (args[0].macroPass === "preActiveEffects") {
        return await AAHelpers.applyTemplate(args);
    }

    if(args[0].macroPass === "postSave")
    {
        const template = await fromUuid(workflow.templateUuid);
        const gridDecision = true;
        let edgeDecision = "inner";
        let alignmentDecision;
        (MidiQOL.safeGetGameSetting('dnd5e', 'gridAlignedSquareTemplates') === true) ? alignmentDecision = "center" : alignmentDecision = "right";
        const targets = Array.from(workflow.failedSaves);

        for (let target of targets) {
            const hasEffectApplied = target.document.hasStatusEffect("restrained");

            if (!hasEffectApplied) {
                await game.gps.socket.executeAsGM("gmToggleStatus", {tokenUuid: `${target.document.uuid}`, status: "restrained", active: true });
            }
        }

        new Sequence()

        .effect()
        .atLocation(token)
        .file(`jb2a.magic_signs.circle.02.conjuration.loop.green`)
        .scaleToObject(1.25)
        .rotateIn(180, 600, {ease: "easeOutCubic"})
        .scaleIn(0, 600, {ease: "easeOutCubic"})
        .loopProperty("sprite", "rotation", { from: 0, to: -360, duration: 10000})
        .belowTokens()
        .fadeOut(2000)
        .zIndex(0)

        .effect()
        .atLocation(token)
        .file(`jb2a.magic_signs.circle.02.conjuration.complete.dark_green`)
        .scaleToObject(1.25)
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
        .file("jb2a.entangle.green")
        .attachTo(template, { align: alignmentDecision, edge: edgeDecision })
        .delay(1000)
        .fadeIn(2000)
        .opacity(0.95)
        .fadeOut(500)
        .belowTokens()
        .persist()
        .zIndex(1.5)
        .name(`Entangle`)

        .effect()
        .file("jb2a.entangle.green")
        .attachTo(template, { align: alignmentDecision, edge: edgeDecision })
        .delay(1000)
        .fadeIn(2000)
        .opacity(0.85)
        .fadeOut(500)
        .belowTokens()
        .persist()
        .zIndex(1.3)
        .name(`Entangle`)

        .effect()
        .file("jb2a.entangle.green")
        .attachTo(template, { align: alignmentDecision, edge: edgeDecision })
        .delay(1000)
        .fadeIn(2000)
        .opacity(0.75)
        .fadeOut(500)
        .belowTokens()
        .persist()
        .zIndex(1.2)
        .name(`Entangle`)

        .effect()
        .file("jb2a.plant_growth.02.ring.4x4.pulse.greenred")
        .attachTo(template, { align: alignmentDecision, edge: edgeDecision })
        .scale(0.8)
        .delay(500)
        .scaleIn(0, 500, {ease: "easeOutCubic"})
        .fadeIn(500)
        .fadeOut(500)
        .belowTokens()
        .randomRotation()
        .zIndex(2)
        .name(`Entangle`)

        .effect()
        .attachTo(template, { align: alignmentDecision, edge: edgeDecision })
        .file(`jb2a.fireflies.many.01.green`)
        .delay(1000)
        .size(4, {gridUnits: gridDecision})
        .fadeIn(2500)
        .opacity(1)
        .persist()
        .zIndex(2)
        .name(`Entangle`)

        .effect()
        .file("jb2a.plant_growth.02.ring.4x4.pulse.greenred")
        .attachTo(template, { align: alignmentDecision, edge: edgeDecision })
        .scale(0.8)
        .delay(500)
        .scaleIn(0, 500, {ease: "easeOutCubic"})
        .fadeIn(500)
        .fadeOut(500)
        .belowTokens()
        .randomRotation()
        .zIndex(2)

        .effect()
        .file("jb2a.swirling_leaves.outburst.01.greenorange")
        .scaleIn(0, 500, {ease: "easeOutQuint"})
        .delay(500)
        .fadeOut(1000)
        .atLocation(token)
        .duration(1000)
        .size(1.75, {gridUnits: gridDecision})
        .animateProperty("spriteContainer", "position.y", {  from:0 , to: -0.15, gridUnits:gridDecision, duration: 1000})
        .zIndex(1)

        .effect()
        .attachTo(template, { align: alignmentDecision, edge: edgeDecision })
        .file(`jb2a.magic_signs.circle.02.conjuration.complete.dark_green`)
        .scale(0.5)
        .fadeIn(600)
        .rotateIn(180, 600, {ease: "easeOutCubic"})
        .scaleIn(0, 600, {ease: "easeOutCubic"})
        .opacity(1)
        .persist()
        .belowTokens()
        .zIndex(1)
        .name(`Entangle`)
        .waitUntilFinished()

        .play()

        targets.forEach(target => {

        new Sequence()

        .effect()
        .delay(100)
        .file('jb2a.entangle.green')
        .scaleToObject(1, {considerTokenScale:true})
        .attachTo(target)
        .fadeIn(5000)
        .zIndex(1)
        .fadeOut(1000)
        .scaleIn(0, 5000, {ease: "easeOutCubic"})
        .mask(target)
        .persist() 
        .name(`${target.document.id}Entangle`)


        .play()
            
        })
    }

    if(args[0] === "each") {
        const hasEffectApplied = actor.appliedEffects.find(e => e.name === "Restrained");
        if(!hasEffectApplied) return;

        let dialogId = "entangle";
        let dialogTitlePrimary = `${token.actor.name} | ${item.name}`;
        let browserUser = game.gps.getBrowserUser({ actorUuid: actor.uuid });
        let gmUser = game.gps.getPrimaryGM();

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">Would you like to use your action to make a Strength ability check to escape being Restrained?</p>
                                <div id="image-container" class="gps-dialog-image-container">
                                    <img id="img_${dialogId}" src="${item.img}" class="gps-dialog-image">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="gps-dialog-button-container">
                    <button id="pauseButton_${dialogId}" type="button" class="gps-dialog-button">
                        <i class="fas fa-pause" id="pauseIcon_${dialogId}" style="margin-right: 5px;"></i>Pause
                    </button>
                </div>
            </div>
        `;
        
        let result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft: 30,validTokenPrimaryUuid: token.document.uuid,source:gmUser === browserUser ? "gm" : "user",type:"singleDialog"});
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, abilityCheck, source, type } = result;

        if (!userDecision) {
            return;
        }
        else if (userDecision) {
            const saveResult = await game.gps.gpsActivityUse({itemUuid: args[2], identifier: "syntheticSave", targetUuid: token.document.uuid});

            if (saveResult.failedSaves.size === 0)
            {
                const hasEffectApplied = token.document.hasStatusEffect("restrained");

                if (hasEffectApplied) {
                    await game.gps.socket.executeAsGM("gmToggleStatus", {tokenUuid: `${token.document.uuid}`, status: "restrained", active: false });
                }

                Sequencer.EffectManager.endEffects({ name: `${token.document.id}Entangle`, object: token });
            }
        }
    }

    if(args[0] === "off") {
        const hasEffectApplied = token.document.hasStatusEffect("restrained");

        if (hasEffectApplied) {
            await game.gps.socket.executeAsGM("gmToggleStatus", {tokenUuid: `${token.document.uuid}`, status: "restrained", active: false });
        }

        Sequencer.EffectManager.endEffects({ name: `${token.document.id}Entangle`, object: token });
    }
}
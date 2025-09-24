export async function animateLightMovement({ tokenData, actor, effectName, filePath, animType }) {
  if(animType === "torch") {
    new Sequence()
      .effect()
        .name(`${effectName}_ip`)
        .file(game.modules.get("jb2a_patreon")?.active ? "jb2a.impact.002.orange" : "")
        .atLocation(tokenData)
        .attachTo(tokenData, { bindRotation: true, local: true })
        .scaleToObject(0.9, { considerTokenScale: true })
        .spriteOffset({ x: 0.525 * tokenData.document.width, y: -0.05 * tokenData.document.width }, { gridUnits: true })
        .spriteRotation(45)
        .zIndex(0.1)
      .effect()
        .delay(250)
        .name(`${effectName}_ip`)
        .file("jb2a.flames.01.orange")
        .atLocation(tokenData)
        .attachTo(tokenData, { bindRotation: true, local: true })
        .scaleToObject(1, { considerTokenScale: true })
        .spriteOffset({ x: 0.12, y: -0.12 * tokenData.document.width }, { gridUnits: true })
        .persist()
        .spriteRotation(45)
        .zIndex(0.1)
        .waitUntilFinished()
    .play();
  }

  actor.sheet.minimize();

  let config = {
    gridHighlight: true,
    icon: { texture: filePath, borderVisible: true },
    location: {
      obj: tokenData,
      limitMaxRange: 60,
      showRange: true,
      wallBehavior: Sequencer.Crosshair.PLACEMENT_RESTRICTIONS.NO_COLLIDABLES
    }
  };

  const position = await Sequencer.Crosshair.show(config);
  if (!position) return null;

  new Sequence()
    .animation()
      .on(tokenData)
      .opacity(0)
      .waitUntilFinished()
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
      .waitUntilFinished()
    .animation()
      .on(tokenData)
      .teleportTo(position)
      .snapToGrid()
      .opacity(1)
    .play();

  actor.sheet.maximize();

  return position;
}

export async function animateLight({ tokenData, effectName, filePath, offsets = {}, animType, filePathDim = null}) {
  if(animType === "torch") {
    const torchOffsetX = offsets.torchOffsetX ?? 0.35 * tokenData.document.width;
    const flameOffsetX = offsets.flameOffsetX ?? 0.5 * tokenData.document.width;

    new Sequence()
      .effect()
        .delay(150)
        .name(effectName)
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
        .name(effectName)
        .file(filePath)
        .atLocation(tokenData)
        .attachTo(tokenData, { bindRotation: true, local: true })
        .scaleToObject(1.2, { considerTokenScale: true })
        .scaleIn(0, 500, { ease: "easeOutElastic" })
        .scaleOut(0, 250, { ease: "easeOutCubic" })
        .spriteOffset({ x: torchOffsetX, y: 0.1 * tokenData.document.width }, { gridUnits: true })
        .spriteScale({ x: 1.0 / tokenData.document.texture.scaleX, y: 1.0 / tokenData.document.texture.scaleY })
        .animateProperty("sprite", "rotation", { from: 60, to: -60, duration: 300, ease: "easeInOutBack" })
        .animateProperty("sprite", "rotation", { from: 0, to: 30, duration: 250, delay: 200, ease: "easeOutBack" })
        .loopProperty("sprite", "rotation", { from: 2, to: -2, duration: 1500, ease: "easeOutQuad", pingPong: true })
        .persist()
        .rotate(tokenData.document.flags?.autorotate?.offset ?? 0)

      .effect()
        .delay(250)
        .name(effectName)
        .file("jb2a.flames.01.orange")
        .atLocation(tokenData)
        .attachTo(tokenData, { bindRotation: true, local: true })
        .scaleToObject(1, { considerTokenScale: true })
        .spriteOffset({ x: flameOffsetX, y: -0.05 * tokenData.document.width }, { gridUnits: true })
        .spriteScale({ x: 1.0 / tokenData.document.texture.scaleX, y: 1.0 / tokenData.document.texture.scaleY })
        .animateProperty("sprite", "rotation", { from: 60, to: -60, duration: 300, ease: "easeInOutBack" })
        .animateProperty("sprite", "rotation", { from: 0, to: 30, duration: 250, delay: 200, ease: "easeOutBack" })
        .loopProperty("sprite", "rotation", { from: 2, to: -2, duration: 1500, ease: "easeOutQuad", pingPong: true })
        .persist()
        .spriteRotation(45)
        .zIndex(0.1)
        .waitUntilFinished()
        .rotate(tokenData.document.flags?.autorotate?.offset ?? 0)
    .play();

    return;
  }
  else if(animType === "lamp") {
    new Sequence()
      .effect()
        .name(effectName)
        .file(filePath)
        .atLocation(tokenData)
        .attachTo(tokenData, {bindRotation: true, local: true})
        .scaleToObject(1, {considerTokenScale: true})
        .scaleIn(0, 500, {ease: "easeOutElastic"})
        .scaleOut(0, 250, {ease: "easeOutCubic"})
        .spriteOffset({x:0.35*tokenData.document.width, y:0.1*tokenData.document.width}, {gridUnits:true})
        .animateProperty("sprite", "rotation", { from: 60, to: -60, duration: 300, ease: "easeInOutBack"})
        .animateProperty("sprite", "rotation", { from: 0, to: 30, duration: 250, delay: 200, ease: "easeOutBack"})
        .loopProperty("sprite", "rotation", { from: 3, to: -3, duration: 1500, ease: "easeOutQuad", pingPong: true })
        .persist()
        .waitUntilFinished()
        .rotate(tokenData.document.flags?.autorotate?.offset ?? 0)
        .spriteScale({ x: 1.0 / tokenData.document.texture.scaleX, y: 1.0 / tokenData.document.texture.scaleY })
    .play()

    return;
  }
  else if(animType === "lanternBullseye") {
    new Sequence()
      .effect()
        .name(effectName)
        .file(filePath)
        .atLocation(tokenData)
        .attachTo(tokenData, {bindRotation: true, local: true})
        .scaleToObject(.7, {considerTokenScale: true})
        .scaleIn(0, 500, {ease: "easeOutElastic"})
        .scaleOut(0, 250, {ease: "easeOutCubic"})
        .spriteOffset({x:0.0*tokenData.document.width, y:0.45*tokenData.document.width}, {gridUnits:true})
        .animateProperty("sprite", "rotation", { from: 60, to: -60, duration: 300, ease: "easeInOutBack"})
        .animateProperty("sprite", "rotation", { from: 0, to: 30, duration: 250, delay: 200, ease: "easeOutBack"})
        .loopProperty("sprite", "rotation", { from: 3, to: -3, duration: 1500, ease: "easeOutQuad", pingPong: true })
        .persist()
        .rotate(tokenData.document.flags?.autorotate?.offset ?? 0)
        .spriteScale({ x: 1.0 / tokenData.document.texture.scaleX, y: 1.0 / tokenData.document.texture.scaleY })
        .waitUntilFinished()
    .play()

    return;
  }
  else if(animType === "lanternHooded") {
    if(!filePathDim) {
      new Sequence()
        .effect()
          .name(effectName)
          .file(filePath)
          .atLocation(tokenData)
          .attachTo(tokenData, {bindRotation: true, local: true})
          .scaleToObject(1, {considerTokenScale: true})
          .scaleIn(0, 500, {ease: "easeOutElastic"})
          .scaleOut(0, 250, {ease: "easeOutCubic"})
          .spriteOffset({x:0.35*tokenData.document.width, y:0.1*tokenData.document.width}, {gridUnits:true})
          .animateProperty("sprite", "rotation", { from: 60, to: -60, duration: 300, ease: "easeInOutBack"})
          .animateProperty("sprite", "rotation", { from: 0, to: 30, duration: 250, delay: 200, ease: "easeOutBack"})
          .loopProperty("sprite", "rotation", { from: 3, to: -3, duration: 1500, ease: "easeOutQuad", pingPong: true })
          .persist()
          .rotate(tokenData.document.flags?.autorotate?.offset ?? 0)
          .spriteScale({ x: 1.0 / tokenData.document.texture.scaleX, y: 1.0 / tokenData.document.texture.scaleY })
          .waitUntilFinished()
      .play()

      return;
    }
    else {
      new Sequence()
        .effect()
          .name(effectName)
          .file(filePathDim)
          .atLocation(tokenData)
          .attachTo(tokenData, {bindRotation: true, local: true})
          .scaleToObject(1, {considerTokenScale: true})
          .scaleIn(0, 500, {ease: "easeOutElastic"})
          .scaleOut(0, 250, {ease: "easeOutCubic"})
          .spriteOffset({x:0.35*tokenData.document.width, y:0.1*tokenData.document.width}, {gridUnits:true})
          .animateProperty("sprite", "rotation", { from: 60, to: -60, duration: 300, ease: "easeInOutBack"})
          .animateProperty("sprite", "rotation", { from: 0, to: 30, duration: 250, delay: 200, ease: "easeOutBack"})
          .loopProperty("sprite", "rotation", { from: 3, to: -3, duration: 1500, ease: "easeOutQuad", pingPong: true })
          .persist()
          .rotate(tokenData.document.flags?.autorotate?.offset ?? 0)
          .spriteScale({ x: 1.0 / tokenData.document.texture.scaleX, y: 1.0 / tokenData.document.texture.scaleY })
          .waitUntilFinished()
      .play()

      return;
    }
  }
  else if(animType === "candle") {
    const torchOffsetX = offsets.torchOffsetX ?? 0.35 * tokenData.document.width;
    const flameOffsetX = offsets.flameOffsetX ?? 0.43 * tokenData.document.width;

    new Sequence()
      .effect()
        .delay(150)
        .name(effectName)
        .file(game.modules.get("jb2a_patreon")?.active ? "jb2a.impact.002.orange" : "")
        .atLocation(tokenData)
        .attachTo(tokenData, { bindRotation: true, local: true })
        .scaleToObject(0.9, { considerTokenScale: true })
        .spriteOffset({ x: 0.525 * tokenData.document.width, y: -0.05 * tokenData.document.width }, { gridUnits: true })
        .spriteRotation(45)
        .zIndex(0.1)
        .rotate(tokenData.document.flags?.autorotate?.offset ?? 0)
        .spriteScale({ x: 1.0 / tokenData.document.texture.scaleX, y: 1.0 / tokenData.document.texture.scaleY })
        .rotate(tokenData.document.flags?.autorotate?.offset ?? 0)
        .spriteScale({ x: 1.0 / tokenData.document.texture.scaleX, y: 1.0 / tokenData.document.texture.scaleY })

      .effect()
        .name(effectName)
        .file(filePath)
        .atLocation(tokenData)
        .attachTo(tokenData, { bindRotation: true, local: true })
        .scaleToObject(1, { considerTokenScale: true })
        .scaleIn(0, 500, { ease: "easeOutElastic" })
        .scaleOut(0, 250, { ease: "easeOutCubic" })
        .spriteOffset({ x: torchOffsetX, y: 0.1 * tokenData.document.width }, { gridUnits: true })
        .animateProperty("sprite", "rotation", { from: 60, to: -60, duration: 300, ease: "easeInOutBack" })
        .animateProperty("sprite", "rotation", { from: 0, to: 30, duration: 250, delay: 200, ease: "easeOutBack" })
        .persist()
        .rotate(tokenData.document.flags?.autorotate?.offset ?? 0)
        .spriteScale({ x: 1.0 / tokenData.document.texture.scaleX, y: 1.0 / tokenData.document.texture.scaleY })
        .rotate(tokenData.document.flags?.autorotate?.offset ?? 0)
        .spriteScale({ x: 1.0 / tokenData.document.texture.scaleX, y: 1.0 / tokenData.document.texture.scaleY })

      .effect()
        .delay(250)
        .name(effectName)
        .file("jb2a.flames.04.loop.orange")
        .atLocation(tokenData)
        .attachTo(tokenData, { bindRotation: true, local: true })
        .scaleToObject(0.4, { considerTokenScale: true })
        .spriteOffset({ x: flameOffsetX, y: -0.12 * tokenData.document.width }, { gridUnits: true })
        .persist()
        .rotate(tokenData.document.flags?.autorotate?.offset ?? 0)
        .spriteScale({ x: 1.0 / tokenData.document.texture.scaleX, y: 1.0 / tokenData.document.texture.scaleY })
        .zIndex(0.1)
        .rotate(tokenData.document.flags?.autorotate?.offset ?? 0)
        .spriteScale({ x: 1.0 / tokenData.document.texture.scaleX, y: 1.0 / tokenData.document.texture.scaleY })
        .waitUntilFinished()
    .play();

    return;
  }

  return;
}

export async function weaponAnimations({enableTrail = true, enableImpact = true, enableSound = false, enableSwitchDistance = false, enableReturn = false, enableBlood = true, enableShake = true, weapon, trail, impact, impactScale, soundFileMelee, soundFileRange, delaySound, switchDistanceFt, range, returnFile, delayBetweenAttacks, source, targets}) {
  if(!game.modules.get("jb2a_patreon")?.active) return;
  try {
      async function meleeAttack({target, randMelee, randTrail, impact, isMirrored, targetScale, within5ft}) {
          const sourceScale = { x: source?.document?.texture?.scaleX ?? 1, y: source?.document?.texture?.scaleY ?? 1 }
          const gridSize = canvas.grid.size;
          
          const amplitude = Sequencer.Helpers.random_float_between(0.0, 0.2);
          let hitRay = new foundry.canvas.geometry.Ray(source, target);
          const shakeDirection = { x: Math.sign(hitRay.dx), y: Math.sign(hitRay.dy) };
          const values = {
              x: [0, -amplitude * shakeDirection.y, amplitude * shakeDirection.y, (-amplitude * shakeDirection.y) / 4, (amplitude * shakeDirection.y) / 4, 0],
              y: [0, amplitude * shakeDirection.x, -amplitude * shakeDirection.x, (amplitude * shakeDirection.x) / 4, (-amplitude * shakeDirection.x) / 4, 0]
          }
          const interval = 50;
          const easeOption = "easeInOutSine";

          new Sequence()

              .effect()
              .copySprite(source)
              .scale({ x: sourceScale.x, y: sourceScale.y })
              .anchor(0.5)
              .rotate(0)
              .rotateTowards(target, {rotationOffset: -90})
              .duration(1500)
              .fadeOut(500)
              .zIndex(5)
              .playIf(within5ft)

              .effect()
              .copySprite(source)
              .scale({ x: sourceScale.x, y: sourceScale.y })
              .anchor(0.5)
              .rotate(0)
              .rotateTowards(target, {rotationOffset: -90})
              .animateProperty("sprite", "position.y", { from: 0, to: hitRay.distance -gridSize, duration: 500+hitRay.distance, ease: "easeOutQuint"})
              .duration(1500)
              .fadeOut(500)
              .zIndex(5)
              .playIf(!within5ft)

              .animation()
              .on(source)
              .fadeOut(50)

              .effect()
              .file("jb2a.gust_of_wind.veryfast")
              .atLocation(source, {cacheLocation: true})
              .stretchTo(target)
              .randomizeMirrorY()
              .belowTokens()
              .playIf(!within5ft)

              .effect()
              .file(`${randTrail}`)
              .atLocation(target)
              .rotateTowards(source)
              .rotate(180)
              .animateProperty("sprite", "position.x", { from: -(2.5*gridSize + hitRay.distance), to: -2.5*gridSize, duration: 500+hitRay.distance, ease: "easeOutQuint"})
              .scale(1)
              .mirrorY(isMirrored)
              .zIndex(11)
              .playbackRate(0.9)
              .playIf(enableTrail)

              .effect()
              .file(`${randMelee}`)
              .atLocation(target)
              .rotateTowards(source)
              .rotate(180)
              .animateProperty("sprite", "position.x", { from: -(2.5*gridSize + hitRay.distance), to: -2.5*gridSize, duration: 500+hitRay.distance, ease: "easeOutQuint"})
              .scale(1)
              .mirrorY(isMirrored)
              .zIndex(10)
              .playbackRate(0.9)
              .waitUntilFinished(-1000) // By design, The hit should always be 1 second from the end of the weapon attack and the trail animations


              .animation()
              .on(source)
              .fadeIn(500)

              .sound()
              .file(soundFileMelee)
              .playIf(enableSound)

              .effect()
              .file(`${impact}`)
              .atLocation(target)
              .scaleToObject(impactScale, { uniform: true })
              .zIndex(12)
              .playbackRate(0.9)
              .playIf(enableImpact)

              //START - BLOOD SPLATTER EFFECT
              .effect()
              .file('jb2a.liquid.splash_side.red')
              .atLocation(target)
              .rotateTowards(source)
              .randomRotation()
              .scaleToObject(1.5, { uniform: true })
              .playIf(enableBlood)
              .zIndex(12)
              //END - BLOOD SPLATTER EFFECT

              // START OF SHAKE SECTION
              .animation()
              .on(target)
              .fadeOut(50)
              .playIf(enableShake)

              .effect()
              .copySprite(target)
              .loopProperty("spriteContainer", "position.x", {
                  values: values.x,
                  duration: interval - ((interval * amplitude) / 2),
                  gridUnits: true,
                  ease: easeOption
              })
              .loopProperty("spriteContainer", "position.y", {
                  values: values.y,
                  duration: interval - ((interval * amplitude) / 2),
                  gridUnits: true,
                  ease: easeOption
              })
              .scale({ x: targetScale.x, y: targetScale.y })
              .duration(interval * 9)
              .playIf(enableShake)
              .zIndex(1)
              .waitUntilFinished(-150)

              .animation()
              .on(target)
              .fadeIn(50)
              .playIf(enableShake)
              // END OF SHAKE SECTION

              .play();
      };

      async function rangedAttack({target, targetScale}) {
          const sourceScale = { x: source?.document?.texture?.scaleX ?? 1, y: source?.document?.texture?.scaleY ?? 1 }
          const amplitude = Sequencer.Helpers.random_float_between(0.0, 0.2);
          let hitRay = new Ray(source, target);
          const shakeDirection = { x: Math.sign(hitRay.dx), y: Math.sign(hitRay.dy) };
          const values = {
              x: [0, -amplitude * shakeDirection.y, amplitude * shakeDirection.y, (-amplitude * shakeDirection.y) / 4, (amplitude * shakeDirection.y) / 4, 0],
              y: [0, amplitude * shakeDirection.x, -amplitude * shakeDirection.x, (amplitude * shakeDirection.x) / 4, (-amplitude * shakeDirection.x) / 4, 0]
          }
          const interval = 50;
          const easeOption = "easeInOutSine";

          new Sequence()

              .sound()
              .file(soundFileRange)
              .playIf(enableSound)
              .delay(delaySound)

              .effect()
              .copySprite(source)
              .scale({ x: sourceScale.x, y: sourceScale.y })
              .anchor(0.5)
              .rotate(0)
              .rotateTowards(target, {rotationOffset: -90})
              .duration(1500)
              .fadeOut(500)
              .zIndex(5)

              .effect()
              .file(range)
              .atLocation(source)
              .stretchTo(target)
              .waitUntilFinished(-800)
              .zIndex(10)

              .effect()
              .file(`${impact}`)
              .atLocation(target)
              .scaleToObject(1.2, { uniform: true })
              .zIndex(12)
              .playIf(enableImpact)

              .effect()
              .file(returnFile)
              .atLocation(source)
              .stretchTo(target)
              .zIndex(10)
              .playIf(enableReturn)

              //START - BLOOD SPLATTER EFFECT
              .effect()
              .file('jb2a.liquid.splash_side.red')
              .atLocation(target)
              .rotateTowards(source)
              .randomRotation()
              .scaleToObject(1.5, { uniform: true })
              .zIndex(11)
              .playIf(enableBlood)
              //END - BLOOD SPLATTER EFFECT

              // START OF SHAKE SECTION
              .animation()
              .on(target)
              .fadeOut(50)
              .playIf(enableShake)

              .effect()
              .copySprite(target)
              .loopProperty("spriteContainer", "position.x", {
                  values: values.x,
                  duration: interval - ((interval * amplitude) / 2),
                  gridUnits: true,
                  ease: easeOption
              })
              .loopProperty("spriteContainer", "position.y", {
                  values: values.y,
                  duration: interval - ((interval * amplitude) / 2),
                  gridUnits: true,
                  ease: easeOption
              })
              .scale({ x: targetScale.x, y: targetScale.y })
              .duration(interval * 9)
              .playIf(enableShake)
              .zIndex(1)
              .waitUntilFinished(-150)

              .animation()
              .on(target)
              .fadeIn(50)
              .playIf(enableShake)
              // END OF SHAKE SECTION

              .play()
      }

      /**************************
       * ANIMATION CALL AND LOOP*
       **************************/

      const dbPath = weapon;
      const entries = Sequencer.Database.getEntry(dbPath) ?? null;
      const entriesLength = entries.length;
      const gridSize = canvas.grid.size;

      for (let target of targets) {
          let targetScale = { x: target?.document?.texture?.scaleX ?? 1, y: target?.document?.texture?.scaleY ?? 1 }
          let rand = Math.floor(Math.random() * ((entriesLength -1) + 1))

          let randMelee = `${dbPath}.${rand}`;
          let randTrail;
          enableTrail ? randTrail =`${trail}.${rand}` : randTrail = ''
          
          // Let's add to the randomisation by mirroring the animation half the time, on top of the random attack variation.
          let isMirrored = Math.random() < 0.5; // 50% probability. 0.1 would make it 10%, 0.2 20%...etc

          const targetBounds = target.bounds.pad(gridSize * (switchDistanceFt / 5 - 1 + 0.5), gridSize * (switchDistanceFt / 5 - 1 + 0.5));
          const sourceBounds = source.bounds;
          const within5ft = (target.bounds.pad(gridSize * (0.5), gridSize * (0.5))).intersects(sourceBounds);
          const withinSwitchDistance = targetBounds.intersects(sourceBounds);

          if (withinSwitchDistance || !enableSwitchDistance) {
              await meleeAttack({target, randMelee, randTrail, impact, isMirrored, targetScale, within5ft})
              await Sequencer.Helpers.wait(delayBetweenAttacks)
          }
          else {
              await rangedAttack({target, targetScale})
              await Sequencer.Helpers.wait(delayBetweenAttacks)
          }
      }
  }
  catch (err) {
      console.error("Error in weaponAnimations, likely missing JB2A Patreon:", err);
  }
}
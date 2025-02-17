export function animateTorch({ tokenData, effectName, filePath, offsets = {}}) {
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
      .zeroSpriteRotation()
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
      .waitUntilFinished(-500)
      .rotate(tokenData.document.flags?.autorotate?.offset ?? 0)
    .play();
}

export async function animateTorchMovement({ tokenData, actor, effectName, filePath }) {
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
      .waitUntilFinished(-500)
    .play();

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

  actor.sheet.maximize();

  return position;
}

export function animateLamp({ tokenData, effectName, filePath, offsets = {}}) {
  new Sequence()
    .effect()
      .name(effectName)
      .file(filePath)
      .atLocation(tokenData)
      .attachTo(tokenData, {followRotation: true, local: true})
      .scaleToObject(1, {considerTokenScale: true})
      .scaleIn(0, 500, {ease: "easeOutElastic"})
      .scaleOut(0, 250, {ease: "easeOutCubic"})
      .spriteOffset({x:0.35*tokenData.document.width, y:0.1*tokenData.document.width}, {gridUnits:true})
      .animateProperty("sprite", "rotation", { from: 60, to: -60, duration: 300, ease: "easeInOutBack"})
      .animateProperty("sprite", "rotation", { from: 0, to: 30, duration: 250, delay: 200, ease: "easeOutBack"})
      .loopProperty("sprite", "rotation", { from: 3, to: -3, duration: 1500, ease: "easeOutQuad", pingPong: true })
      .persist()
      .zeroSpriteRotation()
      .waitUntilFinished(-500)
      .rotate(tokenData.document.flags?.autorotate?.offset ?? 0)
      .spriteScale({ x: 1.0 / tokenData.document.texture.scaleX, y: 1.0 / tokenData.document.texture.scaleY })
    .play()
}

export async function animateLampMovement({ tokenData, actor, effectName, filePath }) {
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

  actor.sheet.maximize();

  return position;
}
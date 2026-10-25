import {
    showLightDialog,
    lightExtinguish
} from "../../utils/lightActions.js";
  
export async function lanternHooded({ speaker, actor, token, item, args, workflow }) {
  const effectName = `${token.document.id} Hooded Lantern`;
  const gpsUuid = "4d035518-5171-42fb-94e0-2f68f1208e55";
  const gpsUuidDim = "16b82105-df43-4489-89ac-d20b4915e601";
  let filePath = "modules/gambits-premades/assets/images/hoodUpLantern.webp"
  let filePathDim = "modules/gambits-premades/assets/images/hoodDownLantern.webp"
  const animType = "lanternHooded";
  
  if (args[0] === "off") {
    await lightExtinguish({ token, actor, effectName, gpsUuid, scenario: "off" });
    return;
  }
  else if(args[0] === "on" || args[0] === "init") return;

  let rangeDim = game.gps.convertFromFeet({range: 60});
  let rangeBright = game.gps.convertFromFeet({range: 30});

  const lightEffect = [
    {
      origin: item.uuid,
      duration: { value: 21600, units: "seconds" },
      disabled: false,
      name: item.name,
      img: item.img,
      type: "base",
      system: { changes: [
        { key: "token.light.dim", type: "override", value: `${rangeDim}`, priority: 20 },
        { key: "token.light.bright", type: "override", value: `${rangeBright}`, priority: 20 },
        { key: "token.light.alpha", type: "override", value: 0.0625, priority: 20 },
        { key: "token.light.angle", type: "override", value: 360, priority: 20 },
        { key: "token.light.luminosity", type: "override", value: 0.5, priority: 20 },
        { key: "token.light.color", type: "override", value: "#ffb433", priority: 20 },
        { key: "token.light.animation.type", type: "override", value: "torch", priority: 20 },
        { key: "token.light.animation.speed", type: "override", value: 4, priority: 20 },
        { key: "token.light.animation.intensity", type: "override", value: 4, priority: 20 },
        { key: "token.light.attenuation", type: "override", value: 0.75, priority: 20 },
        { key: "token.light.contrast", type: "override", value: 0.15, priority: 20 },
        { key: "token.light.shadows", type: "override", value: 0.2, priority: 20 },
        {
          key: "macro.itemMacro",
          type: "custom",
          value: "function.game.gps.lanternHooded",
          priority: 20
        }
      ] },
      transfer: false,
      flags: {
        "gambits-premades": { gpsUuid: gpsUuid }
      }
    }
  ];

  const lightEffectDim = [
    {
      origin: item.uuid,
      duration: { value: 21600, units: "seconds" },
      disabled: false,
      name: item.name,
      img: item.img,
      type: "base",
      system: { changes: [
        { key: "token.light.dim", type: "override", value: 5, priority: 20 },
        { key: "token.light.bright", type: "override", value: 0, priority: 20 },
        { key: "token.light.alpha", type: "override", value: 0.0625, priority: 20 },
        { key: "token.light.angle", type: "override", value: 360, priority: 20 },
        { key: "token.light.luminosity", type: "override", value: 0.5, priority: 20 },
        { key: "token.light.color", type: "override", value: "#ffb433", priority: 20 },
        { key: "token.light.animation.type", type: "override", value: "torch", priority: 20 },
        { key: "token.light.animation.speed", type: "override", value: 4, priority: 20 },
        { key: "token.light.animation.intensity", type: "override", value: 4, priority: 20 },
        { key: "token.light.attenuation", type: "override", value: 0.75, priority: 20 },
        { key: "token.light.contrast", type: "override", value: 0.15, priority: 20 },
        { key: "token.light.shadows", type: "override", value: 0.2, priority: 20 },
        {
          key: "macro.itemMacro",
          type: "custom",
          value: "function.game.gps.lanternHooded",
          priority: 20
        }
      ] },
      transfer: false,
      flags: {
        "gambits-premades": { gpsUuid: gpsUuidDim }
      }
    }
  ];

  const activeLight = actor.appliedEffects.some(e => e.flags["gambits-premades"]?.gpsUuid === gpsUuid);
  const activeLightDim = actor.appliedEffects.some(e => e.flags["gambits-premades"]?.gpsUuid === gpsUuidDim);
  const canThrow = game.modules.get("item-piles")?.active === true;
  const hasRemaining = (item.system.quantity !== 0);

  if (!activeLight && !activeLightDim) {
    if (!hasRemaining) {
      ui.notifications.warn(game.i18n.format("GAMBITSPREMADES.Notifications.Items.Candle.DoNotAnyS", { animType: animType }));
      workflow.aborted = true;
      return;
    }
    else if (canThrow) {
      await showLightDialog({ actions: ["light", "dim", "throw"], token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid, filePathDim, lightEffectDim, gpsUuidDim });
    } else {
      await showLightDialog({ actions: ["light", "dim"], token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid, filePathDim, lightEffectDim , gpsUuidDim});
    }
  } else if (activeLight) {
    if (canThrow) {
      await showLightDialog({ actions: ["dim", "extinguish", "throw"], token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid, filePathDim, lightEffectDim, gpsUuidDim });
    } else {
      await showLightDialog({ actions: ["dim", "extinguish"], token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid, filePathDim, lightEffectDim, gpsUuidDim });
    }
  }
  else if (activeLightDim) {
    if (canThrow) {
      await showLightDialog({ actions: ["light", "extinguish", "throw"], token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid, filePathDim, lightEffectDim, gpsUuidDim });
    } else {
      await showLightDialog({ actions: ["light", "extinguish"], token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid, filePathDim, lightEffectDim, gpsUuidDim });
    }
  }
}
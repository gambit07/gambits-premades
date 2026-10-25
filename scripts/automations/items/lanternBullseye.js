import {
    showLightDialog,
    lightExtinguish
} from "../../utils/lightActions.js";
  
export async function lanternBullseye({ speaker, actor, token, item, args, workflow }) {
  const effectName = `${token.document.id} Bullseye Lantern`;
  const gpsUuid = "c11cf151-f1aa-4ba1-bab6-1c483fcfa3c9";
  const filePath = "modules/gambits-premades/assets/images/bullseyeLantern.webp";
  const animType = "lanternBullseye";
  
  if (args[0] === "off") {
    await lightExtinguish({ token, actor, effectName, gpsUuid, scenario: "off" });
    return;
  }
  else if(args[0] === "on" || args[0] === "init") return;

  let rangeDim = game.gps.convertFromFeet({range: 120});
  let rangeBright = game.gps.convertFromFeet({range: 60});

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
        { key: "token.light.angle", type: "override", value: 30, priority: 20 },
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
          value: "function.game.gps.lanternBullseye",
          priority: 20
        }
      ] },
      transfer: false,
      flags: {
        "gambits-premades": { gpsUuid: gpsUuid }
      }
    }
  ];

  const activeLight = actor.appliedEffects.some(e => e.flags["gambits-premades"]?.gpsUuid === gpsUuid);
  const canThrow = game.modules.get("item-piles")?.active === true;
  const hasRemaining = (item.system.quantity !== 0);

  if (!activeLight) {
    if (!hasRemaining) {
      ui.notifications.warn(game.i18n.format("GAMBITSPREMADES.Notifications.Items.Candle.DoNotAnyS", { animType: animType }));
      workflow.aborted = true;
      return;
    }
    else if (canThrow) {
      await showLightDialog({ actions: ["light", "throw"], token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid });
    } else {
      await showLightDialog({ actions: ["light"], token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid });
    }
  } else {
    if (canThrow) {
      await showLightDialog({ actions: ["extinguish", "throw"], token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid });
    } else {
      await showLightDialog({ actions: ["extinguish"], token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid });
    }
  }
}
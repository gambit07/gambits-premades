import {
    showLightDialog,
    lightExtinguish
} from "../../utils/lightActions.js";
  
export async function lamp({ speaker, actor, token, item, args, workflow }) {
  const effectName = `${token.document.id} Lamp`;
  const gpsUuid = "ed5ddad4-9a4b-4ff8-ba7a-141862cb4fec";
  const filePath = "modules/gambits-premades/assets/images/lamp.webp";
  const animType = "lamp";
  
  if (args[0] === "off") {
    await lightExtinguish({ token, actor, effectName, gpsUuid, scenario: "off" });
    return;
  }
  else if(args[0] === "on") return;

  let rangeDim = game.gps.convertFromFeet({range: 30});
  let rangeBright = game.gps.convertFromFeet({range: 15});

  const lightEffect = [
    {
      origin: item.uuid,
      duration: { seconds: 21600 },
      disabled: false,
      name: item.name,
      img: item.img,
      type: "base",
      changes: [
        { key: "ATL.light.dim", mode: 0, value: `${rangeDim}`, priority: 20 },
        { key: "ATL.light.bright", mode: 0, value: `${rangeBright}`, priority: 20 },
        { key: "ATL.light.alpha", mode: 0, value: "0.25", priority: 20 },
        { key: "ATL.light.angle", mode: 0, value: "360", priority: 20 },
        { key: "ATL.light.luminosity", mode: 0, value: "0.5", priority: 20 },
        { key: "ATL.light.color", mode: 0, value: "#ffb433", priority: 20 },
        { key: "ATL.light.animation", mode: 0, value: "{ type: \"lamp\", speed: 4, intensity: 4 }", priority: 20 },
        { key: "ATL.light.attenuation", mode: 0, value: "0.75", priority: 20 },
        { key: "ATL.light.contrast", mode: 0, value: "0.15", priority: 20 },
        { key: "ATL.light.shadows", mode: 0, value: "0.2", priority: 20 },
        {
          key: "macro.itemMacro",
          mode: 0,
          value: "function.game.gps.lamp",
          priority: 20
        }
      ],
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
      ui.notifications.warn(`You do not have any ${animType}s remaining.`);
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
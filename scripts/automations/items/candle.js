import {
    showLightDialog,
    lightExtinguish
} from "../../utils/lightActions.js";
  
export async function candle({ speaker, actor, token, item, args, workflow }) {
  if(!game.modules.get("ATL")?.active) return ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Items.Candle.MissingDependency"));
  const effectName = `${token.document.id} Candle`;
  const gpsUuid = "3c2adfee-50c0-4393-8ed3-b6ac53a53fe2";
  const filePath = "modules/gambits-premades/assets/images/candle.webp";
  const animType = "candle";
  
  if (args[0] === "off") {
    await lightExtinguish({ token, actor, effectName, gpsUuid, scenario: "off" });
    return;
  }
  else if(args[0] === "on") return;

  let rangeDim = game.gps.convertFromFeet({range: 10});
  let rangeBright = game.gps.convertFromFeet({range: 5});

  const lightEffect = [
    {
      origin: item.uuid,
      duration: { seconds: 3600 },
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
        { key: "ATL.light.animation", mode: 0, value: "{ type: \"candle\", speed: 4, intensity: 4 }", priority: 20 },
        { key: "ATL.light.attenuation", mode: 0, value: "0.75", priority: 20 },
        { key: "ATL.light.contrast", mode: 0, value: "0.15", priority: 20 },
        { key: "ATL.light.shadows", mode: 0, value: "0.2", priority: 20 },
        {
          key: "macro.itemMacro",
          mode: 0,
          value: "function.game.gps.candle",
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
import {
    showLightDialog,
    lightExtinguish
} from "../../utils/lightActions.js";
  
export async function torch({ speaker, actor, token, item, args, workflow }) {
  const effectName = `${token.document.id} Torch`;
  const gpsUuid = "31ef3b37-2ae3-4057-8335-63f690d1ae8d";
  const filePath = "modules/gambits-premades/assets/images/torch.webp";
  const animType = "torch";
  
  if (args[0] === "off") {
    await lightExtinguish({ token, actor, effectName, gpsUuid, scenario: "off" });
    return;
  }
  else if(args[0] === "on" || args[0] === "init") return;

  let rangeDim = game.gps.convertFromFeet({range: 40});
  let rangeBright = game.gps.convertFromFeet({range: 20});

  const lightEffect = [
    {
      origin: item.uuid,
      duration: { value: 3600, units: "seconds" },
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
          value: "function.game.gps.torch",
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
  const canThrow = game.modules.get("item-piles")?.active;
  const hasRemaining = (item.system.quantity !== 0);

  if (!activeLight) {
    if (!hasRemaining) {
      ui.notifications.warn(game.i18n.format("GAMBITSPREMADES.Notifications.Items.Torch.DoNotAnyEs", { animType: animType }));
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
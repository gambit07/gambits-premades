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
  else if(args[0] === "on") return;

  const lightEffect = [
    {
      origin: item.uuid,
      duration: { seconds: 21600 },
      disabled: false,
      name: item.name,
      img: item.img,
      type: "base",
      changes: [
        { key: "ATL.light.dim", mode: 0, value: "60", priority: 20 },
        { key: "ATL.light.bright", mode: 0, value: "30", priority: 20 },
        { key: "ATL.light.alpha", mode: 0, value: "0.25", priority: 20 },
        { key: "ATL.light.angle", mode: 0, value: "360", priority: 20 },
        { key: "ATL.light.luminosity", mode: 0, value: "0.5", priority: 20 },
        { key: "ATL.light.color", mode: 0, value: "#ffb433", priority: 20 },
        { key: "ATL.light.animation", mode: 0, value: "{ type: \"torch\", speed: 4, intensity: 4 }", priority: 20 },
        { key: "ATL.light.attenuation", mode: 0, value: "0.75", priority: 20 },
        { key: "ATL.light.contrast", mode: 0, value: "0.15", priority: 20 },
        { key: "ATL.light.shadows", mode: 0, value: "0.2", priority: 20 },
        {
          key: "macro.itemMacro",
          mode: 0,
          value: "function.game.gps.lanternHooded",
          priority: 20
        }
      ],
      transfer: false,
      flags: {
        "gambits-premades": { gpsUuid: gpsUuid }
      }
    }
  ];

  const lightEffectDim = [
    {
      origin: item.uuid,
      duration: { seconds: 21600 },
      disabled: false,
      name: item.name,
      img: item.img,
      type: "base",
      changes: [
        { key: "ATL.light.dim", mode: 0, value: "5", priority: 20 },
        { key: "ATL.light.bright", mode: 0, value: "0", priority: 20 },
        { key: "ATL.light.alpha", mode: 0, value: "0.25", priority: 20 },
        { key: "ATL.light.angle", mode: 0, value: "360", priority: 20 },
        { key: "ATL.light.luminosity", mode: 0, value: "0.5", priority: 20 },
        { key: "ATL.light.color", mode: 0, value: "#ffb433", priority: 20 },
        { key: "ATL.light.animation", mode: 0, value: "{ type: \"torch\", speed: 4, intensity: 4 }", priority: 20 },
        { key: "ATL.light.attenuation", mode: 0, value: "0.75", priority: 20 },
        { key: "ATL.light.contrast", mode: 0, value: "0.15", priority: 20 },
        { key: "ATL.light.shadows", mode: 0, value: "0.2", priority: 20 },
        {
          key: "macro.itemMacro",
          mode: 0,
          value: "function.game.gps.lanternHooded",
          priority: 20
        }
      ],
      transfer: false,
      flags: {
        "gambits-premades": { gpsUuid: gpsUuidDim }
      }
    }
  ];

  const activeLight = actor.appliedEffects.some(e => e.flags["gambits-premades"]?.gpsUuid === gpsUuid);
  const activeLightDim = actor.appliedEffects.some(e => e.flags["gambits-premades"]?.gpsUuid === gpsUuid);
  const canThrow = game.modules.get("item-piles")?.active === true;
  const hasRemaining = (item.system.quantity !== 0);

  if (!activeLight && !activeLightDim) {
    if (!hasRemaining) {
      ui.notifications.warn(`You do not have any ${animType}s remaining.`);
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
      await showLightDialog({ actions: ["light", "extinguish", "throw"], token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid, lightEffectDim, gpsUuidDim });
    } else {
      await showLightDialog({ actions: ["light", "extinguish"], token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid, lightEffectDim, gpsUuidDim });
    }
  }
}
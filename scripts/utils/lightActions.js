import { animateLightMovement, animateLight } from "./animationUtils.js";
import { showDialog } from "./dialogUtils.js";

function localizeSafe(key) {
  return game?.i18n?.localize ? game.i18n.localize(key) : key;
}

function formatSafe(key, data = {}) {
  return game?.i18n?.format ? game.i18n.format(key, data) : key;
}

const ACTION_DEFINITIONS = {
  "light": {
    labelKey: "GAMBITSPREMADES.Dialogs.Utils.LightActions.Light",
    callback: async ({ token, item, effectName, filePath, lightEffect, animType, gpsUuid, gpsUuidDim }) => {
      await light({ token, item, effectName, filePath, lightEffect, animType, gpsUuid, gpsUuidDim });
    }
  },
  "throw": {
    labelKey: "GAMBITSPREMADES.Dialogs.Utils.LightActions.Throw",
    callback: async ({ token, actor, item, filePath, filePathDim, lightEffect, lightEffectDim, effectName, animType, gpsUuid, gpsUuidDim }) => {
      await lightThrow({ token, actor, item, filePath, filePathDim, lightEffect, lightEffectDim, effectName, animType, gpsUuid, gpsUuidDim });

      if (item.system.quantity >= 1) {
        await item.update({ "system.quantity": item.system.quantity - 1 });
      }
    }
  },
  "extinguish": {
    labelKey: "GAMBITSPREMADES.Dialogs.Utils.LightActions.Extinguish",
    callback: async ({ token, effectName, gpsUuid, gpsUuidDim }) => {
      await lightExtinguish({ token, effectName, gpsUuid, gpsUuidDim });
    }
  },
  "dim": {
    labelKey: "GAMBITSPREMADES.Dialogs.Utils.LightActions.Dim",
    callback: async ({ token, item, effectName, filePathDim, lightEffectDim, animType, gpsUuid, gpsUuidDim }) => {
      await light({ token, item, effectName, filePathDim, lightEffect: lightEffectDim, animType, gpsUuid, gpsUuidDim });
    }
  }
};

function buildDialogButtons(actionsToUse, context) {
  const buttons = [];

  for (const actionKey of actionsToUse) {
    const def = ACTION_DEFINITIONS[actionKey];
    if (!def) {
      console.warn(`Unknown action: ${actionKey}`);
      continue;
    }

    buttons.push({
      action: actionKey,
      label: localizeSafe(def.labelKey),
      callback: async () => {
        await def.callback(context);
      }
    });
  }
  return buttons;
}

export async function showLightDialog({ actions, token, item, effectName, filePath, lightEffect, animType, gpsUuid, actor, filePathDim, lightEffectDim, gpsUuidDim = null }) {
  const dialogTitle = item?.name ?? localizeSafe("GAMBITSPREMADES.Dialogs.Utils.LightActions.Light");
  const dialogMessage = formatSafe("GAMBITSPREMADES.Dialogs.Utils.LightActions.PromptAction", { dialogTitle: dialogTitle });

  const buttons = buildDialogButtons(actions, { token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid, filePathDim, lightEffectDim, gpsUuidDim });

  return await showDialog({
    title: dialogTitle,
    message: dialogMessage,
    image: item?.img,
    buttons
  });
}

export async function light({ token, item, effectName, filePath, lightEffect, animType, filePathDim, gpsUuid, gpsUuidDim }) {
  const effectData = token.actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === gpsUuid);
  const effectDataDim = token.actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === gpsUuidDim);
  if (effectData) await effectData.delete();
  if (effectDataDim) await effectDataDim.delete();
  
  await animateLight({ tokenData: token, effectName, filePath, animType, filePathDim });

  if (lightEffect?.[0]) {
    lightEffect[0].origin = item.uuid;
    lightEffect[0].name = item.name;
    lightEffect[0].img = item.img;
  }

  await token.actor.createEmbeddedDocuments("ActiveEffect", lightEffect);
  return;
}

export async function lightExtinguish({ token, effectName, gpsUuid, gpsUuidDim, scenario }) {
  await Sequencer.EffectManager.endEffects({ name: effectName, object: token });
  if(scenario === "off") return;

  const effectData = token.actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === gpsUuid);
  const effectDataDim = token.actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === gpsUuidDim);
  if (effectData) await effectData.delete();
  if (effectDataDim) await effectDataDim.delete();
}

export async function lightThrow({ token, actor, item, filePath, filePathDim, lightEffect, lightEffectDim, effectName, animType, gpsUuid, gpsUuidDim }) {
  if(animType === "lanternHooded") {
    let effectDataDim = token.actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === gpsUuidDim);
    if(effectDataDim) {
      filePath = filePathDim;
      lightEffect = lightEffectDim;
    }
  }
  const itemData = item.toObject();
  itemData.system.quantity = 1;

  const options = {
    position: { x: token.center.x, y: token.center.y },
    sceneId: game.scenes.current.id,
    tokenOverrides: { name: itemData.name, texture: {src: filePath} },
    actorOverrides: { effects: lightEffect, ownership: { [game.user.id]: 3 } },
    items: [itemData],
    createActor: false,
    pileActorName: itemData.name,
    pileSettings: { type: game.itempiles.pile_types.PILE }
  };

  try {
    const { tokenUuid } = await game.itempiles.API.createItemPile(options);
    let tokenData = await fromUuid(tokenUuid);
    tokenData = tokenData.object;

    await Sequencer.EffectManager.endEffects({ name: effectName, object: token });
    await animateLightMovement({ tokenData, actor, effectName, filePath, animType });

    const effectData = token.actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === gpsUuid);
    const effectDataDim = token.actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === gpsUuidDim);
    if (effectData) await effectData.delete();
    if (effectDataDim) await effectDataDim.delete();
    await item.update({ "system.quantity": item.system.quantity - 1 });
  } catch (error) {
    game.gps.logInfo("Failed to create item pile:", error);
  }
}
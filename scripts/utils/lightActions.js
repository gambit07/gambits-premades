import { animateTorch, animateTorchMovement, animateLamp, animateLampMovement } from "./animationUtils.js";
import { showDialog } from "./dialogUtils.js";

export async function light({ token, item, effectName, filePath, lightEffect, animType }) {
  if(animType === "torch") animateTorch({ tokenData: token, effectName, filePath });
  else if(animType === "lamp") animateLamp({ tokenData: token, effectName, filePath });

  const gmUser = game.gps.getPrimaryGM();
  if (lightEffect?.[0]) {
    lightEffect[0].origin = item.uuid;
    lightEffect[0].name = item.name;
    lightEffect[0].img = item.img;
  }

  await MidiQOL.socket().executeAsUser("createEffects", gmUser, {
    actorUuid: token.actor.uuid,
    effects: lightEffect
  });

  await item.update({ "system.quantity": item.system.quantity - 1 });
}

export async function lightExtinguish({ token, effectName, gpsUuid }) {
  await Sequencer.EffectManager.endEffects({ name: effectName, object: token });

  const effectData = token.actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === gpsUuid);
  if (effectData) {
    await effectData.delete();
  }
}

export async function lightThrow({ token, actor, item, filePath, lightEffect, effectName, animType, gpsUuid }) {
  const itemData = item.toObject();
  itemData.system.quantity = 1;

  const options = {
    position: { x: token.center.x, y: token.center.y },
    sceneId: game.scenes.current.id,
    tokenOverrides: { name: itemData.name, img: filePath },
    actorOverrides: { effects: lightEffect },
    items: [itemData],
    createActor: false,
    pileActorName: itemData.name,
    pileSettings: { type: game.itempiles.pile_types.PILE }
  };

  try {
    const { tokenUuid } = await game.itempiles.API.createItemPile(options);
    let tokenData = await fromUuid(tokenUuid);

    if (tokenData.texture.src !== filePath) {
      await tokenData.update({ "texture.src": filePath });
    }
    tokenData = tokenData.object;

    if(animType === "torch") await animateTorchMovement({ tokenData, actor, effectName, filePath });
    else if(animType === "lamp") animateLampMovement({ tokenData, actor, effectName, filePath });

    const existingEffect = actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === gpsUuid);
    if (existingEffect) await existingEffect.delete();

  } catch (error) {
    console.error("Failed to create item pile:", error);
  }
}

export async function showLightDialog({ token, item, effectName, filePath, lightEffect, animType }) {
  await showDialog({
    title: item.name,
    message: `Would you like to light a ${item.name}?`,
    image: item.img,
    buttons: [
      {
        action: "Light",
        label: "Light",
        callback: async () => {
          await light({ token, item, effectName, filePath, lightEffect, animType });
        }
      }
    ]
  });
}

export async function showLightThrowDialog({ token, item, effectName, filePath, lightEffect, animType, gpsUuid }) {
  await showDialog({
    title: item.name,
    message: `Would you like to light or throw a ${item.name}?`,
    image: item.img,
    buttons: [
      {
        action: "Light",
        label: "Light",
        callback: async () => {
          await light({ token, item, effectName, filePath, lightEffect, animType });
        }
      },
      {
        action: "Throw",
        label: "Throw",
        callback: async () => {
          await lightThrow({ token, actor: item.actor, item, filePath, lightEffect, effectName, animType, gpsUuid });
          if (item.system.quantity >= 1) {
            await item.update({ "system.quantity": item.system.quantity - 1 });
          }
        }
      }
    ]
  });
}

export async function showLightThrowOptionsDialog({ token, actor, item, effectName, gpsUuid, filePath, lightEffect, animType }) {
  await showDialog({
    title: item.name,
    message: `What would you like to do with your ${item.name}?`,
    image: item.img,
    buttons: [
      {
        action: "Light New",
        label: "Light New",
        callback: async () => {
          await Sequencer.EffectManager.endEffects({ name: effectName, object: token });

          if (!hasRemaining(item)) {
            await lightExtinguish({ token, effectName, gpsUuid });
            ui.notifications.warn(`You do not have any ${item.name} remaining.`);
            return;
          }
          await light({ token, item, effectName, filePath, lightEffect });
        }
      },
      {
        action: "Extinguish",
        label: "Extinguish",
        callback: async () => {
          await lightExtinguish({ token, effectName, gpsUuid });
        }
      },
      {
        action: "Throw",
        label: "Throw",
        callback: async () => {
          await Sequencer.EffectManager.endEffects({ name: effectName, object: token });
          await lightExtinguish({ token, actor, effectName, gpsUuid });

          if (!hasRemaining(item)) {
            ui.notifications.warn(`You do not have any ${item.name}s remaining.`);
          }
          await lightThrow({ token, actor, item, filePath, lightEffect, effectName, animType, gpsUuid });
        }
      }
    ]
  });
}

export async function showLightOptionsDialog({ token, actor, item, effectName, gpsUuid, filePath, lightEffect, animType }) {
  await showDialog({
    title: item.name,
    message: `What would you like to do with your ${item.name}?`,
    image: item.img,
    buttons: [
      {
        action: "Light New",
        label: "Light New",
        callback: async () => {
          await Sequencer.EffectManager.endEffects({ name: effectName, object: token });
          if (!hasRemaining(item)) {
            await lightExtinguish({ token, actor, effectName, gpsUuid });
            ui.notifications.warn(`You do not have any ${item.name}s remaining.`);
            return;
          }
          await light({ token, item, effectName, filePath, lightEffect, animType });
        }
      },
      {
        action: "Extinguish",
        label: "Extinguish",
        callback: async () => {
          await lightExtinguish({ token, effectName, gpsUuid });
        }
      }
    ]
  });
}

export async function showThrowExtinguishDialog({ token, item, effectName, filePath, lightEffect, animType, gpsUuid }) {
  await showDialog({
    title: item.name,
    message: `Would you like to throw or extinguish your ${item.name}?`,
    image: item.img,
    buttons: [
      {
        action: "Throw",
        label: "Throw",
        callback: async () => {
          await lightThrow({ token, actor: item.actor, item, filePath, lightEffect, effectName, animType, gpsUuid });
          if (item.system.quantity >= 1) {
            await item.update({ "system.quantity": item.system.quantity - 1 });
          }
        }
      },
      {
        action: "Extinguish",
        label: "Extinguish",
        callback: async () => {
          await lightExtinguish({ token, effectName, gpsUuid });
        }
      }
    ]
  });
}

function hasRemaining(item) {
  return item.system.quantity !== 0;
}
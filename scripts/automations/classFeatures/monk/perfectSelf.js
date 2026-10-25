export async function perfectSelf({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0] === "off") {
        if ((actor.classes?.monk?.system.levels ?? 0) < 20) return;

        async function checkAndUpdateResource(key) {
            const resource = actor.system.resources?.[key];
            if (resource && (resource.label.toLowerCase() === "ki" || resource.label.toLowerCase() === "ki points")) {
                if (resource.value !== 0) return false;
                await actor.update({[`system.resources.${key}.value`]: 4});
                return true;
            }
            return false;
        }

        async function updateEffects() {
            let effectData = Array.from(actor.allApplicableEffects()).find(e => e.name === item.name);
            await effectData?.update({"disabled" : false});
        }

        if (!await checkAndUpdateResource("primary") &&
            !await checkAndUpdateResource("secondary") &&
            !await checkAndUpdateResource("tertiary")) {
            
            const kiItems = actor.items.filter(i => 
                i.name.toLowerCase() === "ki" || i.name.toLowerCase() === "ki points"
            );

            if (kiItems.length === 0) return await updateEffects();

            let itemData;
            if (kiItems.length > 1 && kiItems[0].system.uses.max && kiItems[1].system.uses.max) {
                itemData = kiItems[0];
            } else {
                itemData = kiItems.find(i => i.system.uses.max);
            }

            if (!itemData || (itemData.system.uses?.spent < itemData.system.uses?.max)) return await updateEffects();

            await itemData.update({"system.uses.spent": itemData.system.uses.spent - 4});
        }

        await updateEffects();
    }
}
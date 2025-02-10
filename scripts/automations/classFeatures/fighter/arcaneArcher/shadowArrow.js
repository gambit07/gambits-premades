export async function shadowArrow({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "prePreambleComplete") {
        let itemUses = actor.items.find(i => i.flags["gambits-premades"].gpsUuid === "62e57050-5c6e-4fb1-82d2-ea9a289e7cf9");
        if(itemUses.system.uses?.spent >= itemUses.system.uses?.max) {
            ui.notifications.warn("You have no Arcane Shot uses remaining");
            return workflow.aborted = true;
        }
        let itemValid = await actor.getFlag('gambits-premades', `arcaneShotValid`);
        if(!itemValid) {
            ui.notifications.warn("You must have hit with a bow prior to using this feature.");
            return workflow.aborted = true;
        }
    }
}
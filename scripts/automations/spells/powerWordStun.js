export async function powerWordStun({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "postPreambleComplete") {
        const targets = workflow.targets;
        for(let target of targets) {
            if(target.actor.system.attributes.hp.value > 150) {
                ui.notifications.warn("The target has more than 150 hit points.");
                workflow.targets.delete(target);
                continue;
            }
        }
    }
}
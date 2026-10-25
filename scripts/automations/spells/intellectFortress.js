export async function intellectFortress({actor, token, item, args, workflow}) {
    if(args?.[0]?.macroPass !== "prePreambleComplete") return;
    const targets = [...workflow.targets];
    const castTargets = Math.max(1, (workflow.castData?.castLevel || item.system.level) - 2);
    let key;
    if(targets.length > castTargets) key = "SelectedMoreTokensThan";
    else if(targets.some(target => target.actor.uuid !== actor.uuid && !MidiQOL.canSee(token, target))) key = "UnableSee";
    else if(targets.some((a, index) => targets.slice(index + 1).some(b => !game.gps.withinRange(a, b, 30)))) key = "TargetsNotWithinRange";
    if(!key) return;
    workflow.aborted = true;
    ui.notifications.warn(game.i18n.localize(`GAMBITSPREMADES.Notifications.Spells.IntellectFortress.${key}`));
    const message = MidiQOL.getCachedChatMessage(workflow.itemCardUuid);
    if(message?.system.deltas && message.getAssociatedActor()?.uuid === actor.uuid) {
        await workflow.activity.refund(message.system.deltas);
        await message.update({"system.-=deltas": null});
    }
}

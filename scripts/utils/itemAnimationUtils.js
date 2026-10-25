/** Disable BLFX auto-recognition for each activity in GPS-generated item data. */
export function disableBlfxAutoRecognition(itemData) {
    const activities = Object.entries(itemData.system?.activities ?? {});
    if (!activities.length) return itemData;
    itemData.flags ??= {};
    const flags = itemData.flags["boss-loot-assets-premium"] ??= {};
    for (const [key, activity] of activities) {
        const id = activity._id ?? key;
        const existing = flags[id] ?? {};
        const title = CONFIG.DND5E.activityTypes[activity.type]?.documentClass?.metadata?.title;
        flags[id] = {
            ...existing,
            autoRec: {...existing.autoRec, enabled: false},
            activityName: activity.name || (title ? game.i18n.localize(title) : activity.type),
            activityType: activity.type,
            version: existing.version ?? 2
        };
    }
    return itemData;
}

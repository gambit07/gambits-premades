const regionPreparations = new Map();

export function getRegionVisibility(item) {
    if (!item || !game.modules.get("cat")?.active) return CONST.REGION_VISIBILITY.LAYER;
    const visibility = cat.utils.automationUtils.getConfigValues(item, ["regionVisibility"])?.regionVisibility;
    return Object.hasOwn(CONST.REGION_VISIBILITY, visibility) ? CONST.REGION_VISIBILITY[visibility] : CONST.REGION_VISIBILITY.LAYER;
}

export function getRegionActor(region) {
    const token = fromUuidSync(region?.getFlag("dnd5e", "origin"));
    return token?.actor ?? fromUuidSync(region?.getFlag("dnd5e", "item"))?.actor;
}

export function getRegionAnimationData(region) {
    region = region.document ?? region;
    const levels = Array.from(region.levels);
    const floors = levels.map(id => region.parent.levels.get(id)?.elevation.bottom).filter(Number.isFinite);
    const bottom = region.elevation.bottom;
    let elevation = Math.max(Number.isFinite(bottom) ? bottom : -Infinity, floors.length ? Math.min(...floors) : -Infinity);
    if (!Number.isFinite(elevation)) {
        const originUuid = region.getFlag("dnd5e", "origin");
        const origin = originUuid ? fromUuidSync(originUuid) : null;
        elevation = Number.isFinite(origin?.elevation) ? origin.elevation : 0;
    }
    return { elevation, levels };
}

export async function prepareRegion({ regionUuid }) {
    if (!game.user.isGM) return;
    if (regionPreparations.has(regionUuid)) return regionPreparations.get(regionUuid);
    const prepare = async () => {
        const region = await fromUuid(regionUuid);
        if (region?.documentName !== "Region") return;
        const activity = await fromUuid(region.getFlag("dnd5e", "activity"));
        const item = activity?.item ?? await fromUuid(region.getFlag("dnd5e", "item"));
        const behaviors = item?.getFlag("gambits-premades", "regionBehaviors")?.[activity?.id];
        if (!behaviors?.length) return;
        const visibility = getRegionVisibility(item);
        if (region.visibility !== visibility || !region.getFlag("gambits-premades", "area")) {
            await region.update({ visibility, "flags.gambits-premades.area": true });
        }
        const missing = behaviors.filter(behavior => !region.behaviors.has(behavior._id));
        if (missing.length) await region.createEmbeddedDocuments("RegionBehavior", foundry.utils.deepClone(missing), { keepId: true });
    };
    const preparation = prepare();
    regionPreparations.set(regionUuid, preparation);
    try {
        return await preparation;
    } finally {
        regionPreparations.delete(regionUuid);
    }
}

export async function prepareWorkflowRegions(workflow) {
    if (!workflow.item?.getFlag("gambits-premades", "regionBehaviors")) return;
    for (const regionUuid of workflow.templateUuids ?? []) {
        if (game.user.isGM) await prepareRegion({ regionUuid });
        else await game.gps.queryUser("prepareRegion", game.gps.getPrimaryGM(), { regionUuid });
    }
}

export async function moveRegion({ regionUuid, x, y }) {
    const region = await fromUuid(regionUuid);
    if (region?.documentName !== "Region" || !Number.isFinite(x) || !Number.isFinite(y)) return;
    const center = region.bounds.center;
    const dx = x - center.x;
    const dy = y - center.y;
    const shapes = region.shapes.map(shape => {
        const copy = shape.clone();
        copy.move({ x: shape.origin.x + dx, y: shape.origin.y + dy });
        return copy.toObject();
    });
    await region.update({ shapes });
}

export async function resizeRegion({ regionUuid, radius }) {
    const region = await fromUuid(regionUuid);
    if (region?.documentName !== "Region" || !Number.isFinite(radius) || radius <= 0) return;
    const pixels = radius * region.parent.grid.size / region.parent.grid.distance;
    const shapes = region.shapes.map(shape => {
        const data = shape.toObject();
        if (data.type === "circle" || data.type === "emanation") data.radius = pixels;
        else if (data.type === "ellipse") data.radiusX = data.radiusY = pixels;
        return data;
    });
    await region.update({ shapes, "flags.dnd5e.dimensions.size": radius });
}

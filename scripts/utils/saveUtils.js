export async function updateSaveResult({workflow, token, roll, saved}) {
    const uuid = token?.document?.uuid ?? token?.uuid;
    token = Array.from(workflow.targets ?? []).find(t => t.document.uuid === uuid) ?? token?.object ?? token;
    if(!uuid || !token?.actor || !roll) return;
    if(!(roll instanceof Roll)) roll = Roll.fromJSON(JSON.stringify(roll));
    const previous = workflow.tokenSaves?.[uuid];
    const dc = workflow.saveDC ?? workflow.saveActivity?.save?.dc?.value ?? workflow.saveActivity?.check?.dc?.value;
    const forcedSuccess = workflow.saves.has(token) && previous?.total < dc && !workflow.criticalSaves?.has(token);
    if(workflow.determineCriticalOrFumble) {
        const result = workflow.determineCriticalOrFumble(roll, roll.total);
        for(const [key, active] of [["criticalSaves", result.isCritical], ["fumbleSaves", result.isFumble]]) {
            workflow[key] ??= new Set();
            workflow[key].delete(token);
            if(active) workflow[key].add(token);
        }
    }
    if(saved === undefined) {
        saved = roll.total >= dc || forcedSuccess;
        if(MidiQOL.checkRule?.("criticalSaves")) {
            saved = (workflow.criticalSaves?.has(token) || saved) && !workflow.fumbleSaves?.has(token);
        }
    }
    roll.options = {...previous?.options, ...roll.options,
        "midi-qol": {...previous?.options?.["midi-qol"], ...roll.options?.["midi-qol"], rollType: "save", targetUuid: uuid}};
    workflow.targetSaveDetails ??= {};
    workflow.targetSaveDetails[uuid] ??= {};
    workflow.targetSaveDetails[uuid].saveRoll = roll;
    if(workflow.saveResults) workflow.saveResults = workflow.saveResults.map(result =>
        result === previous || result.options?.["midi-qol"]?.targetUuid === uuid ? roll : result);
    workflow.saves.delete(token);
    workflow.failedSaves.delete(token);
    (saved ? workflow.saves : workflow.failedSaves).add(token);
    if(workflow.buildSaveDisplayEntry) {
        workflow.saveDisplayData = (workflow.saveDisplayData ?? []).filter(entry => entry.target?.document?.uuid !== uuid);
        await workflow.buildSaveDisplayEntry(token, roll, saved, dc);
    }
    return saved;
}

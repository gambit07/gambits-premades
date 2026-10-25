let registered = false;

/** Returns the miss override belonging to this workflow and attack attempt. */
function attackMissOverride(workflow) {
    const override = workflow.workflowOptions?.gps?.attackMiss;
    if(override?.workflowId !== workflow.id || override?.attackRollCount !== workflow.attackRollCount) return;
    return override;
}

/** Checks whether an attack is forced to miss a particular token, or every target when no token is supplied. */
export function isAttackForcedMiss(workflow, target) {
    const override = attackMissOverride(workflow);
    if(!override) return false;
    if(override.allTargets) return true;
    if(!target) return false;
    return override.targetUuids.includes(target.document?.uuid ?? target.uuid);
}

function allTargetsMiss(workflow) {
    return isAttackForcedMiss(workflow) || (workflow.targets.size > 0
        && [...workflow.targets].every(target => isAttackForcedMiss(workflow, target)));
}

/** Records an explicit miss without altering the rolled dice or actor effects. Returns false for a duplicate override. */
export function forceAttackMiss(workflow, target) {
    if(isAttackForcedMiss(workflow, target)) return false;
    const uuid = target?.document?.uuid ?? target?.uuid;
    if(target && !uuid) return false;
    const previous = attackMissOverride(workflow);
    const options = workflow.workflowOptions ?? {};
    workflow.workflowOptions = {
        ...options,
        gps: {
            ...options.gps,
            attackMiss: {
                workflowId: workflow.id,
                attackRollCount: workflow.attackRollCount,
                allTargets: !target || previous?.allTargets === true,
                targetUuids: [...new Set([...(previous?.targetUuids ?? []), ...(uuid ? [uuid] : [])])]
            }
        }
    };
    applyAttackMisses(workflow);
    return true;
}

/** Applies forced misses before hit-triggered macros, damage eligibility, and hit-card rendering. */
function applyAttackMisses(workflow) {
    if(!attackMissOverride(workflow)) return;
    for(const key of ["hitTargets", "hitTargetsEC"]) {
        const targets = workflow[key];
        if(!targets) continue;
        const remaining = new Set([...targets].filter(target => !isAttackForcedMiss(workflow, target)));
        if(remaining.size !== targets.size) workflow[key] = remaining;
    }
    for(const target of workflow.targets) {
        if(!isAttackForcedMiss(workflow, target)) continue;
        const hit = workflow.hitDisplayData?.[target.document?.uuid ?? target.uuid];
        if(hit) Object.assign(hit, {isHit: false, hitClass: "failure", hitSymbol: "fa-xmark", hitResultNumeric: ""});
    }
    if(allTargetsMiss(workflow) && workflow.isCritical) workflow.isCritical = false;
}

/** Registers outcome handling once; workflows without an override retain Midi's normal processing. */
export function registerAttackOutcomeHandling() {
    if(registered) return;
    libWrapper.register("gambits-premades", "MidiQOL.Workflow.prototype.checkHits", async function(wrapped, ...args) {
        if(!attackMissOverride(this)) return wrapped(...args);
        const options = this.workflowOptions;
        const hadReactionOption = Object.hasOwn(options, "noProvokeReaction");
        const reactionOption = options.noProvokeReaction;
        const suppressReactions = allTargetsMiss(this);
        if(suppressReactions) options.noProvokeReaction = true;
        try {
            const result = await wrapped(...args);
            applyAttackMisses(this);
            return result;
        } finally {
            if(suppressReactions) {
                if(hadReactionOption) this.workflowOptions.noProvokeReaction = reactionOption;
                else delete this.workflowOptions.noProvokeReaction;
            }
        }
    }, "WRAPPER");
    libWrapper.register("gambits-premades", "MidiQOL.Workflow.prototype.processCriticalFlags", function(wrapped, ...args) {
        applyAttackMisses(this);
        return wrapped(...args);
    }, "WRAPPER");
    libWrapper.register("gambits-premades", "MidiQOL.Workflow.prototype.triggerTargetMacros", function(wrapped, triggers, ...args) {
        if(triggers.includes("isHit") || triggers.includes("isMissed")) applyAttackMisses(this);
        return wrapped(triggers, ...args);
    }, "WRAPPER");
    libWrapper.register("gambits-premades", "MidiQOL.Workflow.prototype.displayHits", function(wrapped, ...args) {
        applyAttackMisses(this);
        return wrapped(...args);
    }, "WRAPPER");
    registered = true;
}

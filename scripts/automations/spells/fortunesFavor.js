export async function fortunesFavor({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    const d20 = workflow.attackRoll.terms[0].results[0].result ? workflow.attackRoll.terms[0].results[0].result : workflow.attackRoll.total;
    if (!await Dialog.confirm({title: this.name, content: `Use ${item.name} to reroll attack roll d20: <strong>${d20}</strong>`})) return;
    const reRoll = await workflow.attackRoll.reroll({async: true});
    const red20 = reRoll.terms[0].results[0].result ? reRoll.terms[0].results[0].result : reRoll.total;
    if (await Dialog.confirm({title: this.name, content: `Replace ${d20} with ${red20}`, defaultYes: true}))
    workflow.setAttackRoll(reRoll);
    const effectsToDelete = actor.appliedEffects.filter(ef => ef.origin === item.uuid);
    if (effectsToDelete.length > 0) await actor.deleteEmbeddedDocuments("ActiveEffect", effectsToDelete.map(ef => ef.id))
}
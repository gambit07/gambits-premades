export async function seekingArrow({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    await item.update({"flags.midiProperties.ignoreTotalCover" : true});
}
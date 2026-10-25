export async function seekingArrow({workflow}) {
    if(workflow?.activity?.midiProperties) workflow.activity.midiProperties.ignoreFullCover = true;
}

export function stinkingCloud({template, itemUuid}) {
    let cprConfig = game.gps.getCprConfig({itemUuid});
    if(!cprConfig.animEnabled) return;

    new Sequence()
        .effect()
            .atLocation(template)
            .file("jb2a.fog_cloud.02.green")
            .scaleToObject()
            .tieToDocuments(template)
            .belowTokens()
            .mask()
            .persist()
    .play()
}
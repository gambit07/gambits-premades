export async function command({ speaker, actor, token, character, item, args, scope, workflow, options, macroItem }) {
    if(args[0].macroPass === "postAttackRoll") {
        let target = workflow.hitTargets.first();
        let missTarget = workflow.targets.first();

        if(!target) {
            let fire = new Sequence()
            .effect()
            .file("animated-spell-effects-cartoon.electricity.shockwave.blue")
            .scaleIn(0, 500, {ease: "easeOutQuint"})
            .fadeOut(1000)
            .atLocation(token)
            .duration(1000)
            .scaleToObject(1.5)
            .zIndex(1)
            .sound()
            .file("assets/sounds/elemental-electricity-impact_4.ogg")

            .effect()
            .file("jb2a.lightning_bolt.narrow.dark_blue")
            .atLocation(token)
            .missed(true)
            .delay(800)
            .stretchTo(missTarget)
            .randomizeMirrorY()
            fire.play();
        }

        else {
            let level = actor.system.details.level;
            let numDice = 1 + (Math.floor((level + 1) / 6));
            let damageType = "lightning";
            const metalKeywords = [ "Chain Mail", "Chain Shirt", "Scale Mail", "Half Plate", "Plate Armor", "Plate", "Breastplate", "Ring Mail", "Splint", "Longsword", "Shortsword", "Battleaxe", "Warhammer", "Rapier", "Dagger", "Greatsword", "Scimitar", "Falchion", "Halberd", "Glaive", "Flail", "Mace", "Morningstar", "Pike", "Trident", "War Pick" ];  // Add additional armor here that you want included for this effect. This will do partial matches, so Mithral Scale Mail would return true with the search below and continue with the effect
            let hasMatchingEquipment = target.actor.items.some(item => item.system.equipped && metalKeywords.some(keyword => item.name.includes(keyword)));

            let damageRoll = hasMatchingEquipment ? await new CONFIG.Dice.DamageRoll(`${numDice}d10`, {}, {type: damageType, properties: ["mgc"]}).evaluate() : await new CONFIG.Dice.DamageRoll(`${numDice}d8`, {}, {type: damageType, properties: ["mgc"]}).evaluate();

            if(damageRoll) {
                let fire = new Sequence()
                .effect()
                .file("animated-spell-effects-cartoon.electricity.shockwave.blue")
                .scaleIn(0, 500, {ease: "easeOutQuint"})
                .fadeOut(1000)
                .atLocation(token)
                .duration(1000)
                .scaleToObject(1.5)
                .zIndex(1)
                .sound()
                .file("assets/sounds/elemental-electricity-impact_4.ogg")

                .effect()
                .file("jb2a.lightning_bolt.narrow.dark_blue")
                .atLocation(token)
                .missed(false)
                .delay(800)
                .stretchTo(target)
                .randomizeMirrorY()
                fire.play();

                const itemData = {
                    name: "Cecily's Stormshot - Damage (Lightning)",
                    type: "feat",
                    img: macroItem.img
                }

                await MidiQOL.displayDSNForRoll(damageRoll, 'damageRoll');

                await new MidiQOL.DamageOnlyWorkflow(actor, token, damageRoll.total, damageType, [target], damageRoll, { itemData: itemData, flavor: "Cecily's Stormshot - Damage (Lightning)" });
            }
        }
    }
}
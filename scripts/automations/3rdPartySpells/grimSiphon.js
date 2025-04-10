export async function grimSiphon({ speaker, actor, token, character, item, args, scope, workflow, options, macroItem }) {
    if(args[0].macroPass === "postActiveEffects") {
        let target = workflow.failedSaves.first();
        if(!target) return;
        const nearbyFriendlies = MidiQOL.findNearby(null, target, 5, { includeToken: false });
        let validFriendlies = nearbyFriendlies.filter(t => t.document.disposition === token.document.disposition);
        if(validFriendlies.length === 0) return;
        let damageTotal = workflow.damageTotal;
    
        await foundry.applications.api.DialogV2.wait({
        window: { title: 'Grim Siphon Healing' },
        content: `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <p class="gps-dialog-paragraph">Who would you like to heal?</p>
                        <div>
                            <div class="gps-dialog-flex">
                                <label for="ally-token" class="gps-dialog-label">Heal:</label>
                                ${validFriendlies.length >= 1 ? 
                                `<select id="ally-token" class="gps-dialog-select">
                                    ${validFriendlies.map(friendly => `<option class="gps-dialog-option" value="${friendly.document.uuid}">${friendly.actor.name}</option>`).join('')}
                                </select>` : '<div style="padding: 4px; width: 100%; box-sizing: border-box; line-height: normal;"> No valid allies in range.</div>'
                                }
                                <div id="image-container" class="gps-dialog-image-container">
                                    <img src="${item.img}" class="gps-dialog-image">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `,
        buttons: [{
            action: "Heal",
            label: "Heal",
            callback: async (event, button, dialog) => {
                const tokenUuid = document.querySelector('#ally-token').value;
                const tokenToHeal = await fromUuid(tokenUuid);
                if (tokenToHeal) {
                    const healingAmount = Math.floor(damageTotal / 2);
                    const damageRoll = await new CONFIG.Dice.DamageRoll(`${healingAmount}`, {}, {type: "healing", properties: ["mgc"]}).evaluate();
                    await MidiQOL.displayDSNForRoll(damageRoll, 'damageRoll');
            
                    const itemData = {
                        name: "Grim Siphon - Healing",
                        type: "feat",
                        img: item.img
                    }
            
                    new MidiQOL.DamageOnlyWorkflow(actor, token, damageRoll.total, "healing", tokenToHeal.object ? [tokenToHeal.object] : [], damageRoll, {itemData: itemData, flavor: "Grim Siphon - Healing"});
                }
            }
        }],
        close: async (event, dialog) => {
            return;
        }, rejectClose:false
        });
    }
}
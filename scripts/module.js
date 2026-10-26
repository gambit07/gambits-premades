import { registerSettings } from './utils/settings.js';
import { registerHooks } from "./utils/hooks.js";
import { daeInitFlags, daeInjectFlags } from "./utils/hookUtils.js"
import { automationRegistry } from "./automations/index.js";
import { automationRegistry2024 } from "./automations2024/index.js";
import { registerWrapping, updateSettings } from "./utils/hookUtils.js";
import * as helpers from "./utils/helpers.js";
import { weaponAnimations } from "./utils/animationUtils.js";
import { animation } from './animations/_index.js';
import { registerCatConfig } from "./utils/catUtils.js";
import { deleteEnervationEffect } from "./automations/spells/enervation.js";

Hooks.once("catReady", registerCatConfig);
Hooks.on("updateSetting", setting => {
    if (setting.key === "cat.automationSources") return registerCatConfig();
});

Hooks.once('init', async function() {
    registerSettings();
    helpers.registerDialogQueries();
    helpers.registerSpellVisuals();
    helpers.registerRemoteQueries({
        gm: {
            addReaction: helpers.addReaction,
            claimRegionEscape: helpers.claimRegionEscape,
            consumeDrafynMote: helpers.consumeDrafynMote,
            deleteChatMessage: helpers.deleteChatMessage,
            deleteEnervationEffect: deleteEnervationEffect,
            ensureFreedomEscape: helpers.ensureFreedomEscape,
            ensureRegionEscape: helpers.ensureRegionEscape,
            gmDeleteItem: helpers.gmDeleteItem,
            gmIdentifyItem: helpers.gmIdentifyItem,
            gmSetFlag: helpers.gmSetFlag,
            gmToggleStatus: helpers.gmToggleStatus,
            gmUpdateDisposition: helpers.gmUpdateDisposition,
            gpsActivityUpdate: helpers.gpsActivityUpdate,
            gpsApplyTempHp: helpers.gpsApplyTempHp,
            huntersSenseResult: helpers.huntersSenseResult,
            initializeDrafynMotes: helpers.initializeDrafynMotes,
            moveTokenByCardinal: helpers.moveTokenByCardinal,
            moveTokenByOriginPoint: helpers.moveTokenByOriginPoint,
            prepareRegion: helpers.prepareRegion,
            refundCounterspellSlot: helpers.refundCounterspellSlot,
            replaceChatCard: helpers.replaceChatCard,
            resolveHearthSpirit: helpers.resolveHearthSpirit,
            requestFuryOfTheSmall: helpers.requestFuryOfTheSmall,
            setRegionStatus: helpers.setRegionStatus,
            setSpellVisual: helpers.setSpellVisual,
        },
        user: {
            playSpellVisual: helpers.playSpellVisual,
            playCounterspellAnimation: helpers.playCounterspellAnimation,
            playSilveryBarbsAnimation: helpers.playSilveryBarbsAnimation,
            gpsActivityUse: helpers.gpsActivityUse,
            remoteCompleteItemUse: helpers.remoteCompleteItemUse,
            rollAsUser: helpers.rollAsUser,
            useRegionEscape: helpers.useRegionEscape,
        }
    });
    helpers.registerDetectionModes();
    game.gpsSettings = game.gpsSettings || {};
    updateSettings();
    daeInitFlags();

    if(game.settings.get('gambits-premades', 'enableTokenMovementSpeed') && !isNaN(game.settings.get('gambits-premades', 'tokenMovementSpeed'))) CONFIG.Token.movement.defaultSpeed = game.settings.get('gambits-premades', 'tokenMovementSpeed');

    Hooks.on("dae.modifySpecials", (specKey, specials) => {
        specials["flags.gambits-premades.oaImmunity"] = [new foundry.data.fields.StringField(), 5];
        specials["flags.gambits-premades.oaSuppression"] = [new foundry.data.fields.StringField(), 5];
        specials["flags.gambits-premades.oaDisadvantage"] = [new foundry.data.fields.StringField(), 5];
        specials["flags.gambits-premades.oaDisadvantageSource"] = [new foundry.data.fields.StringField(), 5];
    });

    registerWrapping();
    helpers.registerRulesReviewHooks();
});

Hooks.once('ready', async function() {
    game.gps = {
        ...game.gps,
        ...helpers,
        ...automationRegistry,
        ...automationRegistry2024,
        weaponAnimations,
        disableRegionTeleport: false,
        animation,
        logInfo: helpers.logInfo
    };

    if(game.user.isGM && !game.settings.get("gambits-premades", "primaryGM")) game.settings.set("gambits-premades", "primaryGM", game.users.activeGM?.id);

    registerHooks();
    daeInjectFlags();
    await game.gps.syncOpportunityAttackRegions();
});

Hooks.once("ready", async () => {
    const packageId = "gambits-premades";
    const version = game.modules.get(packageId).version;
    if (game.settings.get(packageId, "releaseMessage") !== version && game.user.isGM) {
        const content = `
            <div class="gps-announcement" style="border:4px solid #4A90E2; border-radius:6px; padding:12px;">
                <h3 style="margin:0;">🎉 Welcome to Gambit's Premades V${version}!</h3>
                <p style="font-size:1em;">This release removes a -legacy suffix from Heroes Feast, Mental Prison, Arcane Shot, and Arcane Shot arrow items to bring them in line with other items. If you have characters using those items I suggest reviewing them to make sure they update appropriately via the CAT medkit process.</p>
                <p style="font-size:1em;">After installing, use CAT to update existing item automations or manually replace relevant items with their updated compendium items. Make sure you are on the Beta releases for Midi QOL (14.6.4) and DAE (14.6.3) if you want to use this update.</p>
                <p style="font-size:1em;">Please check out the <a href="https://github.com/gambit07/gambits-premades/releases/latest" target="_blank" rel="noopener noreferrer" style="color:#dd6b20; text-decoration:none; font-weight:bold;">Release Notes</a> for more detail.</p>
                <ul>
                    <li>If you'd like to support development and get access to these additional modules:
                        <ul>
                            <li><a href="https://foundryvtt.com/packages/fxmaster-plus" target="_blank" rel="noopener noreferrer" style="color:#CC66CC; text-decoration:none; font-weight:bold;">Gambit's FXMaster+</a></li>
                            <li><a href="https://foundryvtt.com/packages/gambitsGames" target="_blank" rel="noopener noreferrer" style="color:#CC66CC; text-decoration:none; font-weight:bold;">Gambit's Games</a></li>
                            <li><a href="https://foundryvtt.com/packages/gambitsAssetPreviewer" target="_blank" rel="noopener noreferrer" style="color:#CC66CC; text-decoration:none; font-weight:bold;">Gambit's Asset Previewer</a></li>
                            <li><a href="https://foundryvtt.com/packages/gambitsImageViewer" target="_blank" rel="noopener noreferrer" style="color:#CC66CC; text-decoration:none; font-weight:bold;">Gambit's Image Viewer</a></li>
                        </ul>
                        Please consider supporting me (Gambit!) on <a href="https://patreon.com/GambitsLounge" target="_blank" rel="noopener noreferrer" style="color:#dd6b20; text-decoration:none; font-weight:bold;">Patreon</a>.
                    </li>
                    <li>If you have any questions about the module, feel free to join the <a href="https://discord.gg/YNquuTzcJB" target="_blank" rel="noopener noreferrer" style="color:#4e5d94; text-decoration:none; font-weight:bold;">Discord</a>!</li>
                </ul>
            </div>
        `;
        await ChatMessage.create({content});
        await game.settings.set(packageId, "releaseMessage", version);
    }
});
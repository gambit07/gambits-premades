import {registerSettings} from './utils/settings.js';
import { registerHooks } from "./utils/hooks.js";
import { daeInitFlags, daeInjectFlags } from "./utils/hookUtils.js"
import { automationRegistry } from "./automations/index.js";
import { automationRegistry2024 } from "./automations2024/index.js";
import { refreshTemplateVisibility, registerWrapping, updateSettings } from "./utils/hookUtils.js";
import * as helpers from "./utils/helpers.js";
import { weaponAnimations } from "./utils/animationUtils.js";

Hooks.once('init', async function() {
    registerSettings();
    game.gpsSettings = game.gpsSettings || {};
    updateSettings();
    daeInitFlags();

    Hooks.on("dae.modifySpecials", (specKey, specials) => {
        specials["flags.gambits-premades.oaImmunity"] = [new foundry.data.fields.StringField(), 5];
        specials["flags.gambits-premades.oaSuppression"] = [new foundry.data.fields.StringField(), 5];
    });

    registerWrapping();
});

Hooks.once('socketlib.ready', async function() {
    game.gps = game.gps || {};
    game.gps.socket = socketlib.registerModule("gambits-premades");
    
    //Automations
    game.gps.socket.register("counterspell", automationRegistry.counterspell);
    game.gps.socket.register("silveryBarbs", automationRegistry.silveryBarbs);
    game.gps.socket.register("cuttingWords", automationRegistry.cuttingWords);
    game.gps.socket.register("interception", automationRegistry.interception);
    game.gps.socket.register("poetryInMisery", automationRegistry.poetryInMisery);
    game.gps.socket.register("enableOpportunityAttack", automationRegistry.enableOpportunityAttack);
    game.gps.socket.register("disableOpportunityAttack", automationRegistry.disableOpportunityAttack);
    game.gps.socket.register("protection", automationRegistry.protection);
    game.gps.socket.register("indomitable", automationRegistry.indomitable);
    game.gps.socket.register("sentinel", automationRegistry.sentinel);
    game.gps.socket.register("riposte", automationRegistry.riposte);
    game.gps.socket.register("witchesHex", automationRegistry.witchesHex);
    game.gps.socket.register("powerWordRebound", automationRegistry.powerWordRebound);
    game.gps.socket.register("mageSlayer", automationRegistry.mageSlayer);
    game.gps.socket.register("instinctiveCharm", automationRegistry.instinctiveCharm);
    game.gps.socket.register("rainOfCinders", automationRegistry.rainOfCinders);
    game.gps.socket.register("restoreBalance", automationRegistry.restoreBalance);
    game.gps.socket.register("legendaryResistance", automationRegistry.legendaryResistance);
    game.gps.socket.register("burstOfIngenuity", automationRegistry.burstOfIngenuity);
    game.gps.socket.register("temporalShunt", automationRegistry.temporalShunt);
    game.gps.socket.register("drafynsBaneOfExcellence", automationRegistry.drafynsBaneOfExcellence);
    game.gps.socket.register("taleOfHubris", automationRegistry.taleOfHubris);
    game.gps.socket.register("counterspell2024", automationRegistry2024.counterspell2024);

    //Helpers
    game.gps.socket.register("deleteChatMessage", helpers.deleteChatMessage);
    game.gps.socket.register("closeDialogById", helpers.closeDialogById);
    game.gps.socket.register("handleDialogPromises", helpers.handleDialogPromises);
    game.gps.socket.register("gmIdentifyItem", helpers.gmIdentifyItem);
    game.gps.socket.register("rollAsUser", helpers.rollAsUser);
    game.gps.socket.register("convertFromFeet", helpers.convertFromFeet);
    game.gps.socket.register("gmUpdateTemplateSize", helpers.gmUpdateTemplateSize);
    game.gps.socket.register("findValidTokens", helpers.findValidTokens);
    game.gps.socket.register("pauseDialogById", helpers.pauseDialogById);
    game.gps.socket.register("freeSpellUse", helpers.freeSpellUse);
    game.gps.socket.register("process3rdPartyReactionDialog", helpers.process3rdPartyReactionDialog);
    game.gps.socket.register("moveTokenByCardinal", helpers.moveTokenByCardinal);
    game.gps.socket.register("moveTokenByOriginPoint", helpers.moveTokenByOriginPoint);
	game.gps.socket.register("addReaction", helpers.addReaction);
    game.gps.socket.register("gmUpdateDisposition", helpers.gmUpdateDisposition);
    game.gps.socket.register("gmToggleStatus", helpers.gmToggleStatus);
    game.gps.socket.register("replaceChatCard", helpers.replaceChatCard);
    game.gps.socket.register("validateRegionMovement", helpers.validateRegionMovement);
    game.gps.socket.register("ritualSpellUse", helpers.ritualSpellUse);
    game.gps.socket.register("getBrowserUser", helpers.getBrowserUser);
    game.gps.socket.register("gmDeleteItem", helpers.gmDeleteItem);
    game.gps.socket.register("remoteCompleteItemUse", helpers.remoteCompleteItemUse);
    game.gps.socket.register("remoteAbilityTest", helpers.remoteAbilityTest);
    game.gps.socket.register("gpsActivityUse", helpers.gpsActivityUse);
    game.gps.socket.register("gpsActivityUpdate", helpers.gpsActivityUpdate);
    game.gps.socket.register("gpsUpdateMidiRange", helpers.gpsUpdateMidiRange);
})

Hooks.once('ready', async function() {
    game.gps = {
        ...game.gps,
        ...helpers,
        ...automationRegistry,
        ...automationRegistry2024,
        weaponAnimations,
        disableRegionTeleport: false
    };

    refreshTemplateVisibility();

    if(game.user.isGM && !game.settings.get("gambits-premades", "primaryGM")) game.settings.set("gambits-premades", "primaryGM", game.users.activeGM?.id);

    registerHooks();
    daeInjectFlags();
});
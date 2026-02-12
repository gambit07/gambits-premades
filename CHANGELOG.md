# Changelog

## [v2.1.36] - 2026-02-12
- Bugfixes:
  - Resolved an item being duplicated in compendium

## [v2.1.35] - 2026-02-12
- Updates:
  - Updated a number of items to resolve Midi's advantage/check flag deprecations
  - Updated gps debug logs to use a more unique style, no longer reads with the red error text and instead reads with a blue 'GPS |' prefix and yellow message body
- Bugfixes:
  - Elemental Affinity 2024: Fixed damage not applying... again
  - gpsApplyTempHp: Fix to register functions socket, fixes Motivational Speech so it works as expected

## [v2.1.34] - 2026-02-10
- Additions:
  - Opportunity Attacks: Added new DAE flag oaDisadvantageSource. This will cause the actor with the effect to have disadvantage on any opportunity attack they make.
- Updates:
  - Opportunity Attacks: Added guard to prevent opportunity attacks if the OA setting is disabled but for whatever reason a token still has an OA region.
  - Dialogs: Reworked countdown bar animation again because I wasn't happy with it. Should be much more performant via updating to a transform animation that also allows a smoother bar animation
- Bugfixes:
  - Debug Logs: Fixed Unprepared spells not outputting their relevant debug message
  - Elemental Affinity 2024: Fixed damage not applying
  - Black Tentacles 2024: Resolved automation never firing after initial dialog prompt due to an invalid logic gate. Also updated animation to scale properly again

## [v2.1.33] - 2025-12-05
- Updates:
  - Third Party Reactions: Updated all temporary informational chat notifications for reactions to display for all users instead of just the GM, should give everybody a better sense of what's going on when there's a pause in gameplay while waiting for a dialog selection

## [v2.1.32] - 2025-12-05
- Added compatability for DND5e V5.2
- Updates:
  - Hills Tumble: Added Prone check to prevent dialog from popping if target is already prone
- Bugfixes:
  - Ice Knife: Reverted last update to a working version
  - Elemental Affinity 2024: Resolved issue causing additional damage not to apply

## [v2.1.31] - 2025-11-23
- Updates:
  - Updated a number of spells to use default damage details instead of custom, just a relic of the old days
  - Elemental Affinity: Updated damage roll to add to existing damage roll rather than creating its own in order to not trigger things like extra concentration checks
- Bugfixes:
  - Dialogs: Resolved some bad performance bugs
  - Ice Knife: Updated to work with CPR transmuted spell (I think)
  - Reckless Attack 2024: Updated to prevent dialog if token is not using a strength weapon

## [v2.1.31] - 2025-11-23
- Updates:
  - Updated a number of spells to use default damage details instead of custom, just a relic of the old days
  - Elemental Affinity: Updated damage roll to add to existing damage roll rather than creating its own in order to not trigger things like extra concentration checks
- Bugfixes:
  - Dialogs: Resolved some bad performance bugs
  - Ice Knife: Updated to work with CPR transmuted spell (I think)
  - Reckless Attack 2024: Updated to prevent dialog if token is not using a strength weapon

## [v2.1.30] - 2025-11-01
- Additions:
  - Token Movement Speed: Added a token movement speed setting in GPS General Settings. This allows adjusting the default token movement speed on the canvas. Just a general setting I wanted!
- Updates:
  - Reckless Attack 2024: Added CPR's reckless attack identifer so that GPS reckless attack AE will work with CPR's Frenzy feature
- Bugfixes:
  - Whirlwind: Updated Air Elemental's Whirlwind feature to fix a few issues
  - Cloud of Daggers 2024: Fixed small syntax error causing the Move feature to not work
  - Silvery Barbs: Fixed Enable/Disable on Nat 20 applying to Saves

## [v2.1.28] - 2025-10-16
- Updates:
  - Bump 5e compatability so 5.1.10+ can be used
- Bugfixes:
  - Shield Master 2024: Fix Interpose Shield activating on any save

## [v2.1.27] - 2025-10-06
- Updates:
  - Second pass at updating the release process.
- Bugfixes:
  - Merged fixes for various automations metric range detection, thanks Tallon

## [v2.1.20] - 2025-10-05
- Additions:
  - Polearm Master 2024: Added 2024 feat, no changes.
- Updates:
  - Compendium Data: Added a build of compendium data to the release process to resolve issues with invalid pack data
- Bugfixes:
  - Polearm Master: Add @mod damage bonus to attack

## [v2.1.19] - 2025-10-05
- Additions:
  - Polearm Master 2024: Added 2024 feat, no changes
- Updates:
  - Compendium Data: Added a build of compendium data to the release process to resolve issues with invalid pack data
- Bugfixes:
  - Polearm Master: Add @mod damage bonus to attack

## [v2.1.19] - 2025-10-05
- Additions:
  - Polearm Master 2024: Added 2024 feat, no changes
- Updates:
  - Compendium Data: Added a build of compendium data to the release process to resolve issues with invalid pack data
- Bugfixes:
  - Polearm Master: Add @mod damage bonus to attack

## [v2.1.18] - 2025-10-04
- Updates:
  - Healing Surge: Updated to dialogV2, added native hit die roll handling, removed custom chat modification, etc
- Bugfixes:
  - findValidTokens: Fix a missing guard for actorless tokens
  - Triumph: Fix a couple dialog issues

## [v2.1.17] - 2025-10-03
- Updates:
  - Portent: Converted portent rolls to activity rolls so roll data context is accessible
- Bugfixes:
  - Gift of the Gem Dragon: Fixed activity not consuming item uses

## [v2.1.16] - 2025-10-02
- Updates:
  - Dissonant Whispers: Changed chat notification output to go to GM instead of player for movement info
  - Zephyr Strike: Updated to add roll to initial damage roll to avoid multiple concentration checks
  - Portent: Change dice roll type to better work with CPR manual rolls
  - process3rdPartyReactionDialog: Improved performance of countdown timer animation
- Bugfixes:
  - Defile Ground: Fix effect being created multiple times on application
  - Phantasmal Force 2014 & 2024: Fix overtime not applying save DC correctly
  - findValidTokens: Fix general item validity checks being inside out
  - Confusion 2014 & 2024: Fix initial activity firing automation only activity
  - Elemental Affinity: Fix damage roll applying for any damage type
  - Freedom of Movement 2014 & 2024: Fix effect always applying to caster
  - Opportunity Attack: Fix activity parsing sometimes incorrectly using a ranged value

## [v2.1.15] - 2025-09-24
- Updates:
  - Ill Omen Bow: Updated for v13, last updated in.... v11
  - Fire Form: Updated Fire Elemental's monster feature to use Aura Effects instead of Active Auras
  - Cold Aura: Updated Ice Spider Queen's monster feature to use Aura Effects instead of Active Auras
  - Flash of Genius: Updated to account for sheet rolls

## [v2.1.14] - 2025-09-22
- Updates:
  - Opportunity Attack: Tried to scrape some more performance out of Opportunity Attacks. Increased duration of timeout period before a region will update itself on movement and coalesced to a single update with improved logic. Added new onTurnStart behavior that will turn off onExit and onEnter processing for that tokens region on their turn. This prevents any of the OA logic from firing on a tokens turn when they don't need it anyway, and should help a smidge with performance on lower end machines. onTurnEnd will re-enable the onExit and onEnter events for normal processing of OA.
- Bugfixes:
  - Shield Master: Fixed a couple bugs introduced in the last update
  - Silvery Barbs: Fixed an issue that could occur in certain circumstances for the save ability pickup. Added text to the SB output description defining what item the SB use was for.

## [v2.1.13] - 2025-09-22
- Additions:
  - Flash of Genius: Added Artificer's Flash of Genius feature
- Updates:
  - Fireball: Reduced overall volume of the blast sound
  - Opportunity Attack: Fixed incorrect debug log text for sight
  - Silvery Barbs: Added handling for ability checks triggered via a midi activity
  - Riposte: Added origin item lookup for the Combat Superiority item to better align with CPR (I think)
- Bugfixes:
  - Shield Master: Resolved Shield Bash never prompting after the first use, and Shield Bash potentially popping up on Opportunity Attacks
  - Elemental Affinity: Resolved damage type not being parsed correctly in some circumstances

## [v2.1.12] - 2025-09-08
- Updates:
  - freeSpellUse: Revamped freeSpellUse function. As a reminder, this can be used by adding gpsFreeSpellUse to an activity Chat Flavor text box. Previously this only supported a single free use per long rest. Now also supports configuring the number of uses when setting the activity up to use Item or Activity Uses. This will account for the number of uses, as well as the recharge duration option set (Long Rest, Short Rest, or Daily). You can still simply add gpsFreeSpellUse without item/activity uses to have a simple once per long rest effect added.
- Bugfixes:
  - Burst of Ingenuity: Fixed Save DC not being checked on activity properly

## [v2.1.11] - 2025-09-07
- Additions:
  - Power Word Pain: Added
- Updates:
  - Second try at removing default midi reactions for a bunch of items because I'm a dummy
- Bugfixes:
  - Opportunity Attack: Resolve error preventing GM from receiving Opportunity Attacks when PC's moved due to token control issue

## [v2.1.10] - 2025-09-05
- Updates:
  - Restore Balance: Added better debug support

## [v2.1.9] - 2025-09-04
- Additions:
  - Reckless Attack 2024: Added due to minimal changes needed from the 2014 version. Offers an alternative if you'd prefer the dialog on first attack instead of CPR toggle
- Bugfixes:
  - Reckless Attack: Fixed advantage not working after initial attack due to missing activity handling along with other various fixes
  - Opportunity Attack: Improved diagonal movement parsing on gridded by modifying the region shapes

## [v2.1.8] - 2025-09-03
- Bugfixes:
  - Restore Balance: Cleaned up attack handling to resolve a number of issues

## [v2.1.7] - 2025-09-03
- Bugfixes:
  - Armor of Hexes: Added missing check for Hexblade's Curse effect
  - Dissonant Whispers: Fixed reaction effect application not socketed correctly
  - Indomitable 2024: Fix missing debugEnabled variable

## [v2.1.6] - 2025-08-31
- Additions:
  - All relevant 2014 spells should now have their 2024 variant included
  - Entangle 2024: Added 2024 version
  - Black Tentacles 2024: Added 2024 version
  - Dissonant Whispers 2024: Added 2024 version
  - Foresight 2024: Added 2024 version (No changes)
  - Hellish Rebuke 2024: Added 2024 version (No changes)
  - Heroes Feast 2024: Added 2024 version
  - Holy Aura 2024: Added 2024 version (No changes)
  - Identify 2024: Added 2024 version (No changes)
  - Ray of Sickness 2024: Added 2024 version
  - Power Word Heal 2024: Added 2024 version
  - Power Word Stun 2024: Added 2024 version
  - Stinking Cloud 2024: Added 2024 version
  - Vicious Mockery 2024: Added 2024 version

## [v2.1.4] - 2025-08-30
- Additions:
  - Confusion 2024: Added 2024 version, only a slight change to the directional roll
  - Command 2024: Added 2024 version, now only has a dropdown list of selectable commands
- Updates:
  - Re-built all module compendiums, hopefully will be more stable compendium db's across all server builds

## [v2.1.3] - 2025-08-30
- Updates:
  - Add check for Wounded homebrew to prevent hook failures

## [v2.1.2] - 2025-08-30
- Updates:
  - Updated a TON of reaction items not using activation condition false in activities which was causing the default midi reaction to pop-up as a duplicate. Think I caught everything but let me know if you see a rogue Midi reaction dialog
  - Elemental Affinity 2024: Updated implementation to use the cpr medkit to assign selected damage type instead of a dialog on first use. Added homebrew damage types to medkit selector.
- Bugfixes:
  - Indomitable 2024: Fixed hook never actually getting called, oops
  - Opportunity Attack: Resolved bug where metric wasn't being checked for spells and weapons causing incorrect OA sizing in certain scenarios
  - Dissonant Whispers: Resolved some incorrect and missing variables
  - moveTokenByCardinal: Updated and improved movement functionality
  - moveTokenByOriginPoint: Updated and improved movement functionality, better respects stopping at the origin tokens point

## [v2.1.1] - 2025-08-16
- Additions:
  - Indomitable 2024: Added Fighter's 2024 feature
- Bugfixes:
  - Midi's workflow.activityHasSave was probably reverted to it's proper true/false value, but previously it stored some save data that was used. Multiple automations fixed where that caused issues
  - findValidTokens: Function updated to find spell slots appropriately again, typo in the spell check path

## [v2.1.0] - 2025-08-16
- Official 5e 5.1 release! This includes some features only available in 5.1, so this and future releases will be 5.1 specific moving forward
- Additions:
  - Freedom of Movement 2014 & 2024: Added the spell Freedom of Movement now that it is able to work with difficult terrain natively in Foundry. These spells handle difficult terrain, movement un-restriction for walk and swim, and paralyzed/restrained prevention. It does not handle grapple/restraint removal
- Updates:
  - Black Tentacles: Added full difficult terrain handling
  - Web: Added full difficult terrain handling
  - Biohazard: Added full difficult terrain handling
  - Entangle: Added full difficult terrain handling
  - Updated a number of items to account for new item.system.method and item.system.prepared deprecations
- Bugfixes:
  - Restore Balance: Resolved a number of issues preventing it from working at all
  - Sentinel: Resolved hook not firing under the correct conditions
  - Sleep 2024: Resolved concentration not being applied correctly on initial cast

## [v2.0.10] - 2025-08-11
- Bugfixes:
  - Entropic Ward: Resolved item calls not referencing the origin item
  - Fix OA size not updating if a weapon was enabled/disabled before turn end

## [v2.0.9] - 2025-08-09
- Bugfixes:
  - Fix module not loading because I did a dumb thing

## [v2.0.8] - 2025-08-09
- Bugfixes:
  - Hide Templates: Resolved non-gm users templates displaying after world refresh when Hide Templates setting was enabled
  - stopMovementEnter: Tweaked gps region function for stopping a token to more consistently stop the token within the Region bounds appropriately
  - Black Tentacles: Resolved a number of issues caused by a change in how regions execute script behavior in v13
  - Web: Resolved a number of issues caused by a change in how regions execute script behavior in v13
  - Biohazard: Resolved a number of issues caused by a change in how regions execute script behavior in v13
  - Cloud of Daggers: Resolved a number of issues caused by a change in how regions execute script behavior in v13
  - Caltrops: Resolved a number of issues caused by a change in how regions execute script behavior in v13
  - Ball Bearings: Resolved a number of issues caused by a change in how regions execute script behavior in v13

## [v2.0.7] - 2025-08-05
- Bugfixes:
  - Dialogs: Added throttling to the dialog title bar animation to keep it from consuming FPS

## [v2.0.6] - 2025-08-04
- Additions:
  - Elemental Affinity 2024: Added Draconic Sorcerer's 2024 ability Elemental Affinity
  - Shield Master 2024: Added the generic feature Shield Master for 2024
  - Dread Counterspell: Added Vecna's Dread Counterspell
- Bugfixes:
  - Dissonant Whispers: Fix spell damage not scaling properly
  - Enervation: Updated to work with Aura Effects latest update which resolved a few lingering issues for the V13 Enervation release
  - Heated Body: Resolved effect not looking at activity type properly
  - Defile Ground: A few touch ups, probably needs to be cleaned up further
- Removed:
  - Generic Weapons: Seemed most people found them an annoyance, so they've been completely removed

## [v2.0.5] - 2025-07-31
- Bugfixes:
  - Rust Metal: Fixed and improved implementation. Now gives a clear GM chat message regarding the status of the effected weapon.
  - Blood Frenzy: Fixed to correctly look at activity info
  - Settings: A few bugfixes for html strings that were no longer relevant in appv2

## [v2.0.4] - 2025-07-30
- V13 and 5e 5.x first release! I would still classify this as a beta, I'm sure there will be some issues so keep that in mind if you want to use it in a live game. If you find a bug, feel free to post it to my gps-bugs channel on my discord
- Updated settings menus to app v2
- Updated module dependencies: Removed Active Auras and added Aura Effects. Converted all existing aura effect automations to the Aura Effects module. Thanks to MrPrimate for maintaining Active Auras for so long, and thanks to Michael for creating a new and more performant module for v13!
- Fully removed GPS Primary GM setting, now relies on MidiQOL's Preferred GM setting instead
- Reworked Region Wrapping to be compatible with V13
- Note: The next release of core Foundry V13 will have a bugfix for some token hitching that is present when moving in and out of a region. This primarily effects Opportunity Attacks, but also other region Execute Script automations so just something to be aware of.
- Additions:
  - Web 2024: No changes in functionality
  - Boots of Speed 2024: No changes in functionality
  - Candle 2024: No changes in functionality
  - Lamp 2024: No changes in functionality
  - Lantern, Bullseye 2024: No changes in functionality
  - Staff of Withering 2024: No changes in functionality
  - Torch 2024: No changes in functionality
- Updates:
  - Opportunity Attacks: Tons of improvements made possible by Foundry V13. Now makes use of Pause/Resume/Stop system functionality to allow parsing opportunity attacks in sequence, this enables Sentinel to be fully automated and is just a better visual user experience. Resolved bug with finding the proper max range value in certain circumstances where multiple activities were present for a weapon. Reduced complexity of region setup, less region behaviors needed and less code on those region behaviors. Cleaned up and removed about 1/3 of the code base.
  - Web: Tons of improvements made possible by Foundry V13. Cleaned up codebase. Reduced complexity of region setup, less region behaviors needed and less code on those region behaviors. Added region's native movement cost addition for difficult terrain.
  - Black Tentacles: Tons of improvements made possible by Foundry V13. Cleaned up codebase. Reduced complexity of region setup, less region behaviors needed and less code on those region behaviors. Added region's native movement cost addition for difficult terrain.
  - Cloud of Daggers: Tons of improvements made possible by Foundry V13. Cleaned up codebase. Reduced complexity of region setup, less region behaviors needed and less code on those region behaviors. Many bugfixes for 2024 CoD.
  - Biohazard: Tons of improvements made possible by Foundry V13. Cleaned up codebase. Reduced complexity of region setup, less region behaviors needed and less code on those region behaviors. Added region's native movement cost addition for difficult terrain.
  - Caltrops: Tons of improvements made possible by Foundry V13. Cleaned up codebase. Reduced complexity of region setup, less region behaviors needed and less code on those region behaviors.
  - Ball Bearings: Tons of improvements made possible by Foundry V13. Cleaned up codebase. Reduced complexity of region setup, less region behaviors needed and less code on those region behaviors.
  - Entangle: Converted from an Aura automation to a Region automation. Added region's native movement cost addition for difficult terrain.
  - Aura Automations: All automations using an Aura updated to use the Aura Effects module instead of the Active Auras module.
- Bugfixes:
  - Silvery Barbs: Fixed Magic Resistance (or other advantage effects) applying advantage to the Silvery Barbs roll when it should always be a straight roll

## [v1.0.53] - 2025-06-26
- Additions:
  - Mage Slayer 2024: Added the 2024 version of Mage Slayer
- Bugfixes:
  - Circle of Power: Fix animation playing on each ally in the aura
  - Reckless: Somehow removed the macro, re-added and made a couple small fixes
  - Sentinel 2024: Fix item use gpsUuid from Sentinel 2014

## [v1.0.52] - 2025-06-22
- Additions:
  - Sentinel 2024: Added the 2024 version of Sentinel
- Updates:
  - Opportunity Attack: BREAKING-Removed all deprecated code for item specific effect lookup handling. Moving forward, Opportunity Attack Immunity, Opportunity Attack Suppression, and Opportunity Attack Disadvantage should be applied with the relevant gps DAE keys.
- Bugfixes:
  - Portent/Greater Portent: Fixed item card lookup no longer functioning and cleaned up chat card output plus a few other small things
  - Mobile: Fixed mobile's effect not being applied to actor by default
  - Sentinel: Updated macropass to invoke a Sentinel attack after initiating attack is complete
  - Generic Weapon Animations: Abort animation if JB2A Patreon is not present

## [v1.0.51] - 2025-06-13
- Updates:
  - Wound: Updated the effect to use a single stacking effect instead of multiple effects. Cleaned up self-damage application

## [v1.0.50] - 2025-06-13
- Bugfixes:
  - Wound - Fix missing identifier

## [v1.0.49] - 2025-06-12
- Bugfixes:
  - Black Tentacles: Resolve missing synthetic activities on items
  - Opportunity Attack: Fix variable not initialized early enough for debug logs
  - Hide  Wound Checker effect by default for Wound homebrew

## [v1.0.48] - 2025-06-05
- Bugfixes:
  - Wound: Fix bug using macroItem with Midi
  - Fires Burn: Fix bug using macroItem with Midi
  - Frosts Chill: Fix bug using macroItem with Midi
  - Storms Thunder: Fix bug using macroItem with Midi
  - Hills Tumble: Fix bug using macroItem with Midi

## [v1.0.47] - 2025-06-05
- Additions:
  - Wound: Added homebrew feature Wound
- Bugfixes:
  - Opportunity Attack: couple small bugfixes - thanks bugbear!
  - Small 3rd party automation general fix
  - Roksja's Husk: Fix roll not being passed to the correct origin user
  - Motivational Speech: Fix temporary hp not being applied due to missing socket

## [v1.0.47] - 2025-06-05
- Additions:
  - Wound: Added homebrew feature Wound
- Bugfixes:
  - Opportunity Attack: couple small bugfixes - thanks bugbear!
  - Roksja's Husk: Fix roll not being passed to the correct origin user
  - Motivational Speech: Fix temporary hp not being applied due to missing socket

## [v1.0.46] - 2025-05-25
- Additions:
  - Cloud of Daggers 2024: Added 2024 version of Cloud of Daggers
- Bugfixes:
  - Defile Ground: Fix for activity id error, updated item to use regions instead of AA for template handling
  - Cloud of Daggers: Small fix for a missing return

## [v1.0.45] - 2025-05-25
-Updates:
  - Opportunity Attack: Added a new DAE key oaDisadvantage. This key will grant disadvantage to a token for any opportunity attack made against them while the effect is active.
  - Animations: Began process of moving animations into a dedicated animations library - Thanks bakana for the inspiration and work on fireball!
  - Fireball: Updated some pieces of the animation to make it more consistent. Added automated handling if different damage types are set on fireball to change the color. A user selected color is still set as the highest priority.
  - Template Animations: No longer require Grid Aligned Square Templates 5e setting to be off
  - Cloud of Daggers: Added medkit config for different animation color options
-Bugfixes:
  - Fire's Burn: Fix automation not only applying to attack damage
  - Frost's Chill: Fix automation not only applying to attack damage
  - Hill's Tumble: Fix automation not only applying to attack damage

## [v1.0.44] - 2025-05-23
-Bugfixes:
  - Fix issue with pack data

## [v1.0.43] - 2025-05-22
-Updates:
  - Opportunity Attack: Fixed OA region not updating appropriately on token elevation changes. Added some additional guards into the update hook which should make OA a tiny bit more performant as well.

## [v1.0.42] - 2025-05-22
-Updates:
  - Opportunity Attack: Added check to try and better handle tokens on different Levels levels - again

## [v1.0.41] - 2025-05-22
-Updates:
  - Opportunity Attack: Added check to try and better handle tokens on different Levels levels - again

## [v1.0.40] - 2025-05-22
-Additions:
  - Dimension Door 2024: Added the 2024 version
  - Fire's Burn 2024: Added the Goliath feature
  - Frost's Chill 2024: Added the Goliath feature
  - Hill's Tumble 2024: Added the Goliath feature
  - Storm's Thunder 2024: Added the Goliath feature
  - Light: Added the 2014 and 2024 versions of the Cantrip
-Updates:
  - Opportunity Attack: Added check to try and better handle tokens on different Levels levels

## [v1.0.39] - 2025-05-15
-Bugfixes:
  - Ice Knife: Fixed damage not scaling properly... again, for real this time.

## [v1.0.38] - 2025-05-14
- Updates:
  - Ashardalons Stride: Migrated damage to an activity, moving forward damage type can be customized in the activity for homebrew. Fixed bug causing animation not to display.
  - Identify Restrictions: Added check for my new module Gambit's Identification Inhibitor and ignore gps identification handling if that's active.
-Bugfixes:
  - Motivational Speech: flags.dae.onUpdateTarget seems to no longer work, switched to a more robust alternative
  - Ice Knife: Fixed damage not scaling properly. Updated macroPass to account for misses properly.

## [v1.0.37] - 2025-05-09
- Additions:
  - Ice Knife: Added 2014 and 2024 (same version) with an animation, configurable in cprs medkit
  - Phantasmal Killer: Added 2014 and 2024 versions
- Updates:
  - Updated module.json for 12.343 compatability
- Bugfixes:
  - Cloak of Displacement: Fix small logic issue around re-activating effect in certain instances

## [v1.0.36] - 2025-05-04
- Bugfixes:
  - Sleep 2024: Fix a few small bugs
  - Region Wrapping: Updated inset to a dynamic calculation so that it will work appropriately on grids with a small pixel Grid Size
  - Few other small misc bugfixes

## [v1.0.35] - 2025-05-04
- Additions:
  - Hideous Laughter 2024: Added the 2024 spell compendium item. No change in functionality from my 2014 version.
  - Sleep 2024: Added the 2024 Sleep spell
- Updates:
  - Rebuke the Damned: Updated for V4 Compatability
  - Web: Added handling for tokens with the web walker feature
- Bugfixes:
  - Grasping Arrow: Fix damage roll processor not looking for the origin actor's scale
  - Cloak of Displacement: Fix movement speed of 0 and the incapacitated condition not disabling the cloak's effect
  - Amulet of the Devout +1/+2/+3: Fix AE mode of custom not working for the spell dc bonus
  - Rod of the Pact Keeper +1/+2/+3: Fix AE mode of custom not working for the spell dc bonus
  - findValidTokens: Added a cast activity check to determine if a 3rd party reaction has item uses from a parent item and do additional validation based off that result
  - remoteCompleteItemUse: Fixed a bunch of reaction items that were not properly ending the reaction use process if the user cancelled the item use dialog after selecting yes to the reaction dialog

## [v1.0.34] - 2025-05-04
- Additions:
  - Hideous Laughter 2024: Added the 2024 spell compendium item. No change in functionality from my 2014 version.
  - Sleep 2024: Added the 2024 Sleep spell
- Updates:
  - Rebuke the Damned: Updated for V4 Compatability
  - Web: Added handling for tokens with the web walker feature
- Bugfixes:
  - Grasping Arrow: Fix damage roll processor not looking for the origin actor's scale
  - Cloak of Displacement: Fix movement speed of 0 and the incapacitated condition not disabling the cloak's effect
  - Amulet of the Devout +1/+2/+3: Fix AE mode of custom not working for the spell dc bonus
  - Rod of the Pact Keeper +1/+2/+3: Fix AE mode of custom not working for the spell dc bonus
  - findValidTokens: Added a cast activity check to determine if a 3rd party reaction has item uses from a parent item and do additional validation based off that result
  - remoteCompleteItemUse: Fixed a bunch of reaction items that were not properly ending the reaction use process if the user cancelled the item use dialog after selecting yes to the reaction dialog

## [v1.0.33] - 2025-05-04
- Foundry api didn't update off the last build, is it as simple as re-posting...

## [v1.0.32] - 2025-05-03
- Additions:
  - Hideous Laughter 2024: Added the 2024 spell compendium item. No change in functionality from my 2014 version.
  - Sleep 2024: Added the 2024 Sleep spell
- Updates:
  - Rebuke the Damned: Updated for V4 Compatability
  - Web: Added handling for tokens with the web walker feature
- Bugfixes:
  - Grasping Arrow: Fix damage roll processor not looking for the origin actor's scale
  - Cloak of Displacement: Fix movement speed of 0 and the incapacitated condition not disabling the cloak's effect
  - Amulet of the Devout +1/+2/+3: Fix AE mode of custom not working for the spell dc bonus
  - Rod of the Pact Keeper +1/+2/+3: Fix AE mode of custom not working for the spell dc bonus
  - findValidTokens: Added a cast activity check to determine if a 3rd party reaction has item uses from a parent item and do additional validation based off that result
  - remoteCompleteItemUse: Fixed a bunch of reaction items that were not properly ending the reaction use process if the user cancelled the item use dialog after selecting yes to the reaction dialog

## [1.0.31] - 2025-04-21

- Bugfixes:
  - workflow.hitTargets: Unsure if this is a midi bug, but put a workaround in place to determine targets differently for certain workflow passes to prevent failure.
  - Dissonant Whispers: Add in missing Medkit config option for enabling/disabling animation.

## [1.0.30] - 2025-04-20

- Bugfixes:
  - findValidToken: Fix a small bug for innate/at will spells that have no max uses set
  - Poetry in Misery: Resolve error thrown on save rolls when workflow undefined

## [1.0.29] - 2025-04-15

- Updates:
  - Magic Users Nemesis: Cleaned up a couple things
  - Identify Restrictions: Updated to prevent the identify denial message when a player levels up a character. The level up process seems to try to modify the items attunement in certain instances which would cause a denial message to pop.

## [1.0.28] - 2025-04-15

- Additions:
  - Magic Users Nemesis: Added Monster Slayer Conclave Rangers Magic Users Nemesis feature. Covers all components

## [1.0.27] - 2025-04-10

- Additions:
  - Chronal Shift: Added Chronurgist Wizards Chronal Shift feature. Covers enemy attacks and saves, along with allied saves.
- Bugfixes:
  - Fixed a midi deprecation warning.
  - Added additional handling for chat card update/creation function to avoid failures.
  - Removed some unnecessary html for dialogs.

## [1.0.26] - 2025-04-08

- Bugfixes:
  - Stinking Cloud: Updated implementation to use a region and fixed some bugs.

## [1.0.25] - 2025-04-07

- Bugfixes:
  - Identify: Fixes for midis new preItemRoll functionality.
  - A couple small v13 pre-release fixes

## [1.0.24] - 2025-04-01

- Updates:
  - Region Wrapping: Removed the removal of wrapping on gridded scenes. This causes.... unforeseen issues that were assuredly foreseen when originally implemented. The new method will ignore any non-executeScript type region behaviors so that wrapping will not mess with things like region teleport functionality.
- Bugfixes:
  - Opportunity Attack: See above

## [1.0.23] - 2025-03-31

- Bugfixes:
  - Star Map: Couple additional bugfixes

## [1.0.22] - 2025-03-31

- Updates:
  - Weapon Animations: Cleaned up the arguments that get passed to make them more straightforward for custom implementations. Couple small sequencer bugfixes.
- Bugfixes:
  - Circle of Stars: Fixed the free spell uses for guiding bolt not working in v4
  - freeSpellUse: Fixed the freeSpellUse function not working in v4. No longer requires an onUse macroPass, simply add gpsFreeSpellUse in a given spell activities Chat Flavor

## [1.0.21] - 2025-03-30

- Updates:
  - Light Automations (Torch/Lamps/etc): Added handling for metric vs imperial for light distances.
- Bugfixes:
  - Cleaned up a bunch of automations using partial or explicit item name lookups to use identifier lookups instead. This mostly applies to automations that were looking for a qualifying sub-item

## [1.0.20] - 2025-03-29

- Bugfixes:
  - Protection: Cleaned up a couple small things.
  - Indomitable: Cleaned up a couple small things.
  - replaceChatCard: Bugfixes to address some changes in the chat data returned in 4.x. Items using this function will now only create a new chat card when necessary, otherwise the original will be updated like in 3.x.

## [1.0.19] - 2025-03-28

- Bugfixes:
  - Fix the new pack banner missing in assets.

## [1.0.18] - 2025-03-28

- Additions:
  - Counterspell: But 2024 this time! This is the first gps 2024 item, you can find it in a new GPS Spells 2024 compendium. CPR should have medkit functionality updated before too long as well if its not done already
- Bugfixes:
  - Fixed a bug causing chat updates for specific items to create a new chat card instead of updating the existing chat card for the spell.

## [1.0.17] - 2025-03-27

- Additions:
  - Karma: Added homebrew feature Karma
- Bugfixes:
  - Couple small fixes for animationUtils and an arcane archer hook error.

## [1.0.16] - 2025-03-22

- Bugfixes:
  - Counterspell: Few additional fixes for subtle spell.

## [1.0.15] - 2025-03-22

- Bugfixes:
  - Counterspell: Fixed function naming issue.

## [1.0.14] - 2025-03-22

- Additions: Arcane Archer: Updated to add all Arcane Archer shot types. These are now housed as activities on the Arcane Shot item, you will still need the individual Arrow types (Bursting, Shadow, etc) from my compendium/medkit so that appropriate arrow activities are displayed.
- Updates:
  - Multiple Items: Updated synthetic activity handling to socket the use to the appropriate user where relevant. NOTE: Module now requires Midi 12.4.34 minimum as there were some important bugfixes for socketing activities
  - Silvery Barbs: Added activity handling for Save events. Should make them more resilient in the future.
  - Indomitable: Added activity handling for Save reroll. Should make this more resilient in the future.
  - Region Wrapping: Update Region Wrapping to use default behavior on square gridded scenes to resolve some intermittent issues with region teleporting.
  - Opportunity Attack: Added updated region shapes for OA. Gridless now uses a squircle shape, and Hex grids use a hex shape. Added new DAE flags oaImmunity and oaSuppression. oaImmunity can be added to an effect on a token to prevent any opportunity attacks against it. oaSuppression can be added to an effect on a token to prevent it from being able to make any opportunity attacks. NOTE: The old method of looking for a named effect ex. Opportunity Attack Immunity for general immunity or a specific item effect ex. Shocking Grasp will be deprecated in the future, premades or individual automations should use these dae flags moving forward.
  - Counterspell: Added Subtle Spell casting support. Counterspell will now present a checkbox to the user to use Subtle Spell when present and sorcery points available. If checked, the spell will become un-counterspellable and the appropriate sorcery point will be used.
  - GPS Dialogs: Added support for Carolingian UI. GPS Dialogs colors will now match color theming from Carolingian if present.
- Bugfixes:
  - Temporal Shunt: Fixed a couple issues and re-worked to use an activity on the roll.
  - Divine Sense: Fix args itemCardId no longer being found, for some reason.
  - process3rdPartyReactionDialog: Fixed awaiting reaction generic chat messages not being removed when dialog closed via the top right x button.

## [1.0.13] - 2025-03-15

- Bugfixes
  - Opportunity Attack: Fix Brace item use not socketed correctly.
  - Dissonant Whispers: Fix item activity missing somehow
  - Triumph: Fix effect macro still set to run from forever ago
  - Indomitable: Fix prompt firing for non-save events (May have been an issue in some other automations as well)
  - Storm Mote: Fix this being completely broken due to a simple activity consumption issue

## [1.0.12] - 2025-03-10

- Bugfixes
  - Fix incorrect manifest location
  - Silvery Barbs: Fix incorrect reference to save values on v4
  - Mage Slayer: Fix non-spells being included in hook
  - Protection: Fixed something
  - Power Word Rebound: Fixed something

## [1.0.7] - 2025-02-28

- Additions
  - Drafyns Bane of Excellence: Reminder to checkout Kobold Press Deep Magic 2. V4.x compatability plus expansion to fully cover the saving throw aspect of this item.
- Bugfixes
  - Opportunity Attack: Updated the Brace integration in OA to target the creature the attack is against and removed some unneeded code. Should now properly integrate with CPRs Brace feature.
  - Lighting Throw Action: Updated to remove the need for users to give explicit permissions to the Default Item Piles actor for the Throw action. The Torch/Candle/Lantern/etc automations will now assign the appropriate permissions for the user when the throw occurs.
  - Vicious Mockery: Fix bug preventing effect from being applied and incorrect macroPass provided on item.

## [1.0.6] - 2025-02-27

- Bugfixes
  - Opportunity Attack: Fix another war caster issue due to cpr config missing issue

## [1.0.5] - 2025-02-27

- Bugfixes
  - Opportunity Attack: Fix some unresolved bugs with the new war caster stuff due to les incompetents

## [1.0.4] - 2025-02-25

- Additions
  - Grim Siphon: Reminder to checkout Kobold Press Deep Magic 2. V4.x compatability
- Updates
  - Dimension Door: Added a fun animation to crosshair move while selecting teleport location. Playing around with it has inspired a future update to Template Previewer I think
- Bugfixes
  - Opportunity Attack: Resolve an additional issue with War Caster medkit options causing issues due to a config flag not being output unless the customConfig value had been changed. Resolve issues with midi-qol outputting a range error message in certain instances. This cannot be a complete fix as other automations sometimes modify weapons/spells after use, but should fix most instances especially for weapons. My suggestion is to just turn off MidiQOLs out of range checking if you want to avoid any issues entirely.
  - Cloud of Daggers: Resolve appropriate damage type not being assigned in DamageOnlyWorkflow

## [1.0.3] - 2025-02-24

- Bugfixes
  - Opportunity Attack: Fix issue with attacks displaying out of range. Fix issue with some accidental code left in during the war caster re-work.
- Additions
  - Billy The Club: Reminder to visit Abyssal Brews Patreon. V4.x compatability
  - Roksjas Husk: Reminder to visit Abyssal Brews Patreon. V4.x compatability
  - Triumph: Reminder to visit Abyssal Brews Patreon. V4.x compatability
  - Weavers Hoop: Reminder to visit Abyssal Brews Patreon. V4.x compatability

## [1.0.2] - 2025-02-23

- Bugfixes
  - Opportunity Attack: Fixed a few issues with the War Caster integration not recognizing spells correctly. Added a CPR config option to War Caster to allow disabling melee or ranged spell attacks. Disabling ranged will disable rsak and save actionTypes. Disabling melee will disable msak actionTypes.

## [1.0.1] - 2025-02-22

- Official 5e V4.x+ Release!
  - This has been a large re-work of items from GPS to better support Foundrys new activities system. Most automations that synthetically created items/features/etc now use an on item activity which can be more easily modified by users to adjust things such as the saving throw, dc, damage type, etc. All item code has now been built into the module and is no longer located on each item in the compendium to allow easier updates in the future. Any kofi support is appreciated.
  - NOTE: All automations are still built for 2014. Ive opted to wait on 2024 as CPR has opted to build most of those automations on their end, and I do not want to duplicate work on my end. There will likely be some exceptions for more complex automations such as Counterspell where I also have a lot of unique handling for various interactions and homebrew requests.
  - NOTE: This release covers all 5e automations, and a handful of 3rd party content automations. I will continue to build out 3rd party content automations, but homebrow items have not been updated. Just because it has not been updated specifically for 4.x does not mean it doesnt work, but homebrew items see minimal use, so I will accept requests to update specific homebrew automations in my Posneys Foundry Automation discord thread if you have one you are using on 4.x+ that does not work.
  - NOTE: There will likely be some bugs in this release as its a large re-work, you can report any bugs you find on my github or posneys foundry automation discord thread
- Item Callouts:
  - Counterspell: Now uses activities for ability checks. Multitude of small tweaks for better functionality surrounding that, should be better than ever.
  - Torch/Lamp/Candle/Lanterns: Large rework of these automations. All now have a throwable option if Item Piles is enabled. All now will not consume a quantity use unless the item is thrown. Quantity now comes down to a gm determination of when the item is empty/burned out, in which case a quantity use can be done on the item itself. Extinguishing and relighting an item will simply reset its effect timer. Since all items can be thrown, Im leaving it in the hands of gms to determine whether something is thrown successfully. Ex. Setting a candle down next to you, probably fine. Hurling a candle 60 feet, its likely not staying lit (or is it? #nat20s).
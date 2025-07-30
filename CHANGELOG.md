# Changelog

## [v2.0.3] - 2025-07-30
- V13 and 5e 5.x first release! I would still classify this as a beta, I'm sure there will be some issues so keep that in mind if you want to use it in a live game. If you find a bug, feel free to post it to my gps-bugs channel on my discord. I've added a new V13 and 5.x tag
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
  - Stinking Cloud: Tons of improvements made possible by Foundry V13. Cleaned up codebase. Reduced complexity of region setup, less region behaviors needed and less code on those region behaviors.
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
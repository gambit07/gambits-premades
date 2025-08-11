<h1 style="text-align: center;">Gambit's Premades</h1>
<p style="text-align: center;"><i>Gambit&rsquo;s Premades delivers a curated library of automated spells, items, and feats that slot straight into your Foundry VTT world. Leveraging MidiQOL, focus on storytelling&mdash;premades handle the mechanics so you don&rsquo;t have to.</i></p>
<p style="text-align: center;"><img src="https://img.shields.io/github/v/release/gambit07/gambits-premades?style=for-the-badge" alt="GitHub release" /> <img src="https://img.shields.io/github/downloads/gambit07/gambits-premades/total?style=for-the-badge" alt="GitHub all releases" /> <a href="https://discord.gg/YNquuTzcJB" target="_blank" rel="nofollow noopener"><img src="https://dcbadge.limes.pink/api/server/BA7SQKqMpa" alt="Discord" /></a></p>
<h2 style="text-align: center;">Supporting The Module</h2>
<p style="text-align: center;"><a href="https://ko-fi.com/gambit07" target="_blank" rel="nofollow noopener"><img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="ko-fi" /></a> <a href="https://www.patreon.com/GambitsLounge" target="_blank" rel="nofollow noopener"> <img src="https://img.shields.io/badge/Patreon-Gambits Lounge-F96854?style=for-the-badge&amp;logo=patreon" alt="Patreon Gambits Lounge" /> </a></p>

<p>A custom collection of automated spells, items, and feats for Foundry VTT. These automations primarily use the MidiQOL and Dynamic Active Effect modules to implement automations, along with other synergistic modules.</p>
<ul>
<li>Contains a suite of fully automated items, features, spells, etc. This includes some very difficult to handle "3rd party reaction" items such as Counterspell, Opportunity Attacks, Silvery Barbs, etc.</li>
<li>Beautiful AppV2 Dialogs for reaction automations with an integrated and animated countdown timer.</li>
<li>Optional customization to display reaction dialogs for the module to both the GM and Player. AFK player? No problem.</li>
<li>Optional customization for Region Token wrapping to better recognize tokens within regions based off 5e's ruleset.</li>
<li>Optional customization to fully hide placed templates, let an animation define the area without ugly template borders and filler.</li>
<li>Optional customization to fully prevent players from self-identifying unidentified items, except when using the Identify spell automation.</li>
<li>And many more</li>
</ul>

<b>Dependencies V13 5e 5.x (V2.0.0-V2.x.x)</b>
<BLOCKQUOTE>
Midi QOL<br>
Aura Effects<br>
Sequencer<br>
socketlib<br>
Dynamic effects using Active Effects<br>
Region Attacher<br>
</BLOCKQUOTE>

<b>Dependencies V12 5e 4.x (V1.0.1-V1.0.53)</b>
<BLOCKQUOTE>
Midi QOL<br>
Active Auras<br>
Sequencer<br>
socketlib<br>
Dynamic effects using Active Effects<br>
Region Attacher<br>
</BLOCKQUOTE>

<b>Dependencies V12 5e 3.x (V0.5.0-V0.5.90)</b>
<BLOCKQUOTE>
Midi QOL<br>
Active Auras<br>
Sequencer<br>
socketlib<br>
Dynamic effects using Active Effects<br>
Region Attacher<br>
</BLOCKQUOTE>

<b>Dependencies V11 (V0.0.6-V0.1.86)</b>
<BLOCKQUOTE>
Midi QOL<br>
Active Auras<br>
Dfreds Convenient Effects<br>
Warp Gate<br>
Effect Macro<br>
Template Macro<br>
Sequencer<br>
socketlib<br>
Dynamic effects using Active Effects
</BLOCKQUOTE>

<b>Animation Modules</b><br>
<p>
<a href="https://foundryvtt.com/packages/jaamod/" target="_blank">Jinkers Animated Art</a><br>
<a href="https://foundryvtt.com/packages/animated-spell-effects/" target="_blank">Animated Spell Effects (Jack Kerouac)</a><br>
<a href="https://github.com/chrisk123999/animated-spell-effects-cartoon" target="_blank">Animated Spell Effects: Cartoon (Jack Kerouac)</a><br>
<a href="https://www.patreon.com/c/JB2A/posts" target="_blank">JB2A Patreon</a>
</p>

**NOTE: All of the example videos below are now outdated, I hope to update them when I have time. Dialogs are now using Foundry's Application V2 and look much cleaner**

<b>Instructions:</b>
<p>
Most of my automations exist as an item in my compendiums, which are labeled as GPS [Automation Item Type]. Each automation item in a compendium will include an item description with the required dependencies, and any relevant information related to the setup of the item. To use these automations, you can simply replace the item on the characters sheet with the item from my compendium. Alternatively, this module is also integrated with Chris Premades modules 'Medkit' button. This is a button on the item sheet which can be pressed to automatically import an item automation, based on compendium priorities within the Chris Premades module. To setup my module for proper integration with Chris Premades see the screenshot below:

![cpr_medkit](https://github.com/gambit07/gambits-premades/assets/4236874/bf17af7b-2304-48e2-a9f1-985b688a4e5e)

Finally, my more complex automations are setup within my modules settings page. Simply select the appropriate checkboxes and options to activate these automations. Video below:

https://github.com/gambit07/gambits-premades/assets/4236874/a8f30a75-0f33-4f56-a3b3-bccdf8c48f0d

</p>

I feel like videos are the best way to see these type of automations, so including a partial list of videos below. I'll continue to add more over time.

<details>
<summary><b>Opportunity Attack</b> (click to expand)</summary>
<p>

- This automates opportunity attacks while taking into account opportunity attack specific features of the Sentinel feat, War Caster feat, Polearm Master feat, and Battle Master Fighters Brace feature. This feature will only function while actors are in combat. Note: The Sentinel part of this automation does not stop a token from moving when hit.
- Opportunity Attack will account for the following features/spells when on an actor:
  - Feat: Mobile
  - Feat: Polearm Master
  - Feat: Sentinel
  - Feat: War Caster
  - Fighter Feature: Battle Master - Brace
  - Fighter Feature: Battle Master - Riposte
  - Generic Effect: Charmed (Against Charmer)
  - Generic Feature: Disengage
  - Goblin Feature: Nimble Escape - Disengage
  - Monster Feature: Deadly Reach
  - Monster Feature: Flyby
  - Rogue Feature: Swashbuckler - Fancy Footwork
  - Spell: Arms of Hadar
  - Spell: Confusion
  - Spell: Dissonant Whispers
  - Spell: Kinetic Jaunt
  - Spell: Shocking Grasp
  - Spell: Slow
  - Spell: Staggering Smite
  - Spell: Zephyr Strike

https://github.com/gambit07/gambits-premades/assets/4236874/9a16a77a-4623-47e0-aad0-8c54e3f7674a

</p>
</details>

<details>
<summary><b>Counterspell</b> (click to expand)</summary>
<p>

- This automates counterspell and includes handling for:
  - Improved Abjuration

https://github.com/gambit07/gambits-premades/assets/4236874/9890ef7e-99a9-481a-b2e8-9ff726479c8c

</p>
</details>

<details>
<summary><b>Silvery Barbs</b> (click to expand)</summary>
<p>

https://github.com/gambit07/gambits-premades/assets/4236874/845902f7-8f87-4d22-9177-eb7b6d69ec85

</p>
</details>

<details>
<summary><b>Cutting Words</b> (click to expand)</summary>
<p>

https://github.com/gambit07/gambits-premades/assets/4236874/36d2bd22-61fc-4d80-a90c-c86d994e00c8

</p>
</details>

<details>
<summary><b>Poetry in Misery</b> (click to expand)</summary>
<p>

https://github.com/gambit07/gambits-premades/assets/4236874/cda2836c-1d9c-4290-8993-1efedcb69e15

</p>
</details>

<details>
<summary><b>Lantern, Bullseye</b> (click to expand)</summary>
<p>

- This automates the bullseye lantern with a bullseye lantern animation and lighting

https://github.com/gambit07/gambits-premades/assets/4236874/a38b7393-a8df-4677-9152-ae5b6571d986

</p>
</details>

<details>
<summary><b>Lantern, Hooded</b> (click to expand)</summary>
<p>

- This automates the hooded lantern with a hooded lantern animation and lighting

https://github.com/gambit07/gambits-premades/assets/4236874/41371e6d-e59e-4aec-bb62-e531a4974e28

</p>
</details>

<details>
<summary><b>Torch</b> (click to expand)</summary>
<p>

- This automates torches with animation and lighting

https://github.com/gambit07/gambits-premades/assets/4236874/17657ca0-b10c-445e-bdab-de547669e957

</p>
</details>

<details>
<summary><b>Rod of the Pact Keeper</b> (click to expand)</summary>
<p>

- This automates the Rod of the Pact Keeper, including buffs to spell dc and spell attack, as well as item uses to recover spell slots

https://github.com/gambit07/gambits-premades/assets/4236874/5d4fb5b8-b968-4648-9de3-97ac8cb265bb

</p>
</details>

<details>
<summary><b>Staff Of Withering</b> (click to expand)</summary>
<p>

- This automates the Staff of Withering, including charge uses and damage application + save and effect handling

https://github.com/gambit07/gambits-premades/assets/4236874/a5544f8e-d151-445b-9422-d3c214b969ce

</p>
</details>

<details>
<summary><b>Cloud of Daggers</b> (click to expand)</summary>
<p>

- This automates Cloud of Daggers, will only work while in combat.

https://github.com/gambit07/gambits-premades/assets/4236874/cc030dcf-12e6-44b0-bca4-8a45fbefd2bb

</p>
</details>

<details>
<summary><b>Stroke of Luck</b> (click to expand)</summary>
<p>

- This automates the Rogue Feature, Stroke of Luck. This automates Attack Roll, Ability Check, and Skill Check components, and adds a homebrew option (disabled by default) for Saving Throws as well.

https://github.com/gambit07/gambits-premades/assets/4236874/64db7d8a-8589-4dde-851b-87718ac4e727

</p>
</details>

<details>
<summary><b>Divine Sense</b> (click to expand)</summary>
<p>

- This automates the Paladin feature Divine Sense. This is primarily if you don't want to use the vision5e setting where divine sense is always active.

https://github.com/gambit07/gambits-premades/assets/4236874/77b70335-5f79-4b25-a1dd-c821de13d2fe

</p>
</details>

<details>
<summary><b>Circle of Power</b> (click to expand)</summary>
<p>

- This automates the spell Circle of Power. It covers magic resistance as well as no damage on magical effect saving throws where you would take half damage on a save. This requires the magic effect midi property being set for damage spells.

https://github.com/gambit07/gambits-premades/assets/4236874/cf0e6a98-96e5-43d5-a862-7073160190ec

</p>
</details>

<details>
<summary><b>Dragon's Breath</b> (click to expand)</summary>
<p>

- This automates the spell Dragon's Breath

Placeholder

</p>
</details>

<details>
<summary><b>Ill Omen Bow</b> (click to expand)</summary>
<p>

- This automates the homebrew item Ill Omen Bow

https://github.com/gambit07/gambits-premades/assets/4236874/dc7fc344-b368-45bf-957d-0517ca09fc7c

</p>
</details>


<details>
<summary><b>Defile Ground</b> (click to expand)</summary>
<p>

- This automates the Druid feature Defile Ground

https://github.com/gambit07/gambits-premades/assets/4236874/14bb450b-43b6-4099-a6ef-2e59d7afaad6

</p>
</details>

<details>
<summary><b>Confusion</b> (click to expand)</summary>
<p>

- This automates the spell Confusion

https://github.com/gambit07/gambits-premades/assets/4236874/28448d90-b465-4a6e-9f3d-56a7289ab06e

</p>
</details>

<details>
<summary><b>Portent & Greater Portent</b> (click to expand)</summary>
<p>

- This automates the Wizard features Portent and (at the appropriate level) Greater Portent

https://github.com/gambit07/gambits-premades/assets/4236874/b22a2472-636a-4847-b5d3-fa33a67441eb

</p>
</details>

<details>
<summary><b>Aura of Conquest</b> (click to expand)</summary>
<p>

- This automates the Paladin feature Aura of Conquest

https://github.com/gambit07/gambits-premades/assets/4236874/0a6cd18b-8371-40a1-b15b-a70231751e57

</p>
</details>

<details>
<summary><b>Tentacles</b> (click to expand)</summary>
<p>

- This automates the Mindflayers Tentacles feature.

https://github.com/gambit07/gambits-premades/assets/4236874/a86e8454-5112-45ae-9191-a20a3f70234e

</p>
</details>

<details>
<summary><b>Conquering Presence</b> (click to expand)</summary>
<p>

- This automates the Paladin Conquering Presence feature

https://github.com/gambit07/gambits-premades/assets/4236874/9e74b32f-5dbe-4598-9670-c36334d7e7dc

</p>
</details>

<details>
<summary><b>Transient Healing</b> (click to expand)</summary>
<p>

- This automates the homebrew feature Transient Healing

https://github.com/gambit07/gambits-premades/assets/4236874/d6e5ccf7-33aa-4267-8caf-c114050903ba

</p>
</details>

<details>
<summary><b>Rust Metal</b> (click to expand)</summary>
<p>

- This automates the Rust Monster feature Rust Metal

https://github.com/gambit07/gambits-premades/assets/4236874/b8fa2587-23b9-4634-a48c-fbd8d14ebb5b

</p>
</details>

<details>
<summary><b>Nova</b> (click to expand)</summary>
<p>

- This automates the homebrew feature Nova

https://github.com/gambit07/gambits-premades/assets/4236874/bfdd53c4-a22c-4fbc-a254-813dad23474a

</p>
</details>

<details>
<summary><b>Scornful Rebuke</b> (click to expand)</summary>
<p>

- This automates the paladin feature Scornful Rebuke

https://github.com/gambit07/gambits-premades/assets/4236874/b616a083-bad2-48ee-a751-afa31ef07b13

</p>
</details>

<details>
<summary><b>Hunter's Sense</b> (click to expand)</summary>
<p>

- This automates the Ranger feature Hunter's Sense

https://github.com/gambit07/gambits-premades/assets/4236874/77c71b27-f82e-4982-95c3-be6056ae75c3

</p>
</details>

<details>
<summary><b>Holy Aura</b> (click to expand)</summary>
<p>

Placeholder

</p>
</details>

<details>
<summary><b>Healing Surge</b> (click to expand)</summary>
<p>

Placeholder

</p>
</details>

<details>
<summary><b>Heated Body</b> (click to expand)</summary>
<p>

Placeholder

</p>
</details>

<details>
<summary><b>Perfect Self</b> (click to expand)</summary>
<p>

Placeholder

</p>
</details>

<details>
<summary><b>Enervation</b> (click to expand)</summary>
<p>

https://github.com/gambit07/gambits-premades/assets/4236874/11df20c2-7f0e-4524-b2af-9f4675647597

</p>
</details>

<details>
<summary><b>Scatter</b> (click to expand)</summary>
<p>

https://github.com/gambit07/gambits-premades/assets/4236874/a63ecc04-8af3-4ac7-bb17-74826d90537c

</p>
</details>

<details>
<summary><b>Stinking Cloud</b> (click to expand)</summary>
<p>

https://github.com/gambit07/gambits-premades/assets/4236874/cc947ee4-5135-48de-8e96-588c70c43261

</p>
</details>

<details>
<summary><b>Identify</b> (click to expand)</summary>
<p>

https://github.com/gambit07/gambits-premades/assets/4236874/2125dc92-57a0-4dc7-b3b6-98655102b5c8

</p>
</details>

<details>
<summary><b>Mind Blast</b> (click to expand)</summary>
<p>

https://github.com/gambit07/gambits-premades/assets/4236874/ff1aa39e-d1ec-4064-ad56-52297231337f

</p>
</details>

<details>
<summary><b>Motivational Speech</b> (click to expand)</summary>
<p>

https://github.com/gambit07/gambits-premades/assets/4236874/62173b0c-1836-4f1b-b2fe-ab3049fd56dd

</p>
</details>

<details>
<summary><b>Black Tentacles</b> (click to expand)</summary>
<p>

https://github.com/gambit07/gambits-premades/assets/4236874/402f41ef-20c0-4084-98c6-30a20c7f49de

</p>
</details>

<details>
<summary><b>Enemies Abound</b> (click to expand)</summary>
<p>

https://github.com/gambit07/gambits-premades/assets/4236874/7766b3d8-2005-447e-b19e-86c630a57a4e

</p>
</details>

<details>
<summary><b>Ray of Sickness</b> (click to expand)</summary>
<p>

https://github.com/gambit07/gambits-premades/assets/4236874/ba11c3a2-cdc6-4eb3-a6f6-dbd430234afc

</p>
</details>

<details>
<summary><b>Dissonant Whispers</b> (click to expand)</summary>
<p>

https://github.com/gambit07/gambits-premades/assets/4236874/fc2ae75e-ecb2-4d43-9d2d-c0961c37eda0

</p>
</details>

<details>
<summary><b>Vicious Mockery</b> (click to expand)</summary>
<p>

https://github.com/gambit07/gambits-premades/assets/4236874/774aaf32-895d-4cce-aa82-c93b565a7f68

</p>
</details>

<details>
<summary><b>Tasha's Hideous Laughter</b> (click to expand)</summary>
<p>

https://github.com/gambit07/gambits-premades/assets/4236874/5dab58c7-d74c-4a9a-8587-3d4ca0c53b4d

</p>
</details>

<details>
<summary><b>Entangle</b> (click to expand)</summary>
<p>

https://github.com/gambit07/gambits-premades/assets/4236874/c3c61a43-71f7-421c-a69a-2446ad02def3

</p>
</details>

<details>
<summary><b>Infestation</b> (click to expand)</summary>
<p>

Placeholder

</p>
</details>

<details>
<summary><b>Staff of Rooted Hills</b> (click to expand)</summary>
<p>

Placeholder

</p>
</details>

<details>
<summary><b>Cause Fear</b> (click to expand)</summary>
<p>

Placeholder

</p>
</details>

<details>
<summary><b>Healing Glyph</b> (click to expand)</summary>
<p>

Placeholder

</p>
</details>

<details>
<summary><b>Drawing the Hearth</b> (click to expand)</summary>
<p>

Placeholder

</p>
</details>

<details>
<summary><b>Electric Eels</b> (click to expand)</summary>
<p>

https://github.com/gambit07/gambits-premades/assets/4236874/bf23a625-d26d-458d-89e7-668cdea28abb

</p>
</details>

<details>
<summary><b>Toll the Dead</b> (click to expand)</summary>
<p>

Placeholder

</p>
</details>

<details>
<summary><b>Festering Fever</b> (click to expand)</summary>
<p>

Placeholder

</p>
</details>

<details>
<summary><b>Contagious Healing</b> (click to expand)</summary>
<p>

Placeholder

</p>
</details>

<details>
<summary><b>Shroom of Doom</b> (click to expand)</summary>
<p>

Placeholder

</p>
</details>

<details>
<summary><b>Cecily's Stormshot</b> (click to expand)</summary>
<p>

Placeholder

</p>
</details>

<details>
<summary><b>Grim Siphon</b> (click to expand)</summary>
<p>

Placeholder

</p>
</details>

<details>
<summary><b>Dipolar Gauges</b> (click to expand)</summary>
<p>

https://github.com/gambit07/gambits-premades/assets/4236874/8b3d74e8-a4c6-4a50-9454-c5e15e5e5517

</p>
</details>

<details>
<summary><b>Fighting Style Protection</b> (click to expand)</summary>
<p>

https://github.com/gambit07/gambits-premades/assets/4236874/50d1851b-63d4-473e-8273-ce7c7cb3aa4f

</p>
</details>

<details>
<summary><b>Fighting Style Interception</b> (click to expand)</summary>
<p>

https://github.com/gambit07/gambits-premades/assets/4236874/06649ff1-c5ea-4e3e-a1b9-3b0241bad72a

</p>
</details>

<details>
<summary><b>Cloud Rune</b> (click to expand)</summary>
<p>

https://github.com/user-attachments/assets/8606cc0e-0ad7-44a2-bf7b-7f6452caed25

</p>
</details>

<details>
<summary><b>Entropic Ward</b> (click to expand)</summary>
<p>

https://github.com/user-attachments/assets/8914a2a6-0f58-46ac-b71c-9baa136bd737

</p>
</details>

<details>
<summary><b>Dimension Door</b> (click to expand)</summary>
<p>

https://github.com/user-attachments/assets/d689ad12-f7b7-4353-b109-c9b9a60adb7e

</p>
</details>

<details>
<summary><b>Thought Shield</b> (click to expand)</summary>
<p>

https://github.com/user-attachments/assets/49c1d9d9-5040-4c55-915c-49a3c7ab4c18

</p>
</details>

<details>
<summary><b>Runic Shield</b> (click to expand)</summary>
<p>

https://github.com/user-attachments/assets/7b0d6987-594e-44ac-a877-c474835ef119

</p>
</details>

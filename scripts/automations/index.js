import { thirdPartyClassFeaturesMacros } from "./3rdPartyClassFeatures/_index.js";
import { thirdPartySpellsMacros } from "./3rdPartySpells/_index.js";
import { classFeaturesMacros } from "./classFeatures/_index.js";
import { genericFeaturesMacros } from "./genericFeatures/_index.js";
import { homebrewItemsMacros } from "./homebrewItems/_index.js";
import { itemsMacros } from "./items/_index.js";
import { monsterFeaturesMacros } from "./monsterFeatures/_index.js";
import { raceFeaturesMacros } from "./raceFeatures/_index.js";
import { spellsMacros } from "./spells/_index.js";
import { homebrewFeaturesMacros } from "./homebrewFeatures/_index.js";

export const automationRegistry = {
    ...thirdPartyClassFeaturesMacros,
    ...thirdPartySpellsMacros,
    ...classFeaturesMacros,
    ...genericFeaturesMacros,
    ...homebrewItemsMacros,
    ...itemsMacros,
    ...monsterFeaturesMacros,
    ...raceFeaturesMacros,
    ...spellsMacros,
    ...homebrewFeaturesMacros
};
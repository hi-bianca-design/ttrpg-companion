-- supabase/migrations/20260510000009_srd_magic_items_seed.sql
-- Seeds all SRD 5.2.1 magic items A-Z

BEGIN;

INSERT INTO public.magic_items
  (name, item_type, rarity, requires_attunement, attunement_condition, description, properties)
VALUES

-- A
('Adamantine Armor', 'Armor', 'Uncommon', false, null,
 'This suit of armor is reinforced with adamantine, one of the hardest substances in existence. While you''re wearing it, any Critical Hit against you becomes a normal hit.',
 '{"applies_to": "Any Medium or Heavy armor except Hide"}'::jsonb),

('Ammunition, +1', 'Weapon', 'Uncommon', false, null,
 'You have a +1 bonus to attack rolls and damage rolls made with this piece of magic ammunition. Once it hits a target, the ammunition is no longer magical.',
 '{"bonus": 1}'::jsonb),

('Ammunition, +2', 'Weapon', 'Rare', false, null,
 'You have a +2 bonus to attack rolls and damage rolls made with this piece of magic ammunition. Once it hits a target, the ammunition is no longer magical.',
 '{"bonus": 2}'::jsonb),

('Ammunition, +3', 'Weapon', 'Very Rare', false, null,
 'You have a +3 bonus to attack rolls and damage rolls made with this piece of magic ammunition. Once it hits a target, the ammunition is no longer magical.',
 '{"bonus": 3}'::jsonb),

('Ammunition of Slaying', 'Weapon', 'Very Rare', false, null,
 'This magic ammunition is meant to slay creatures of a particular type. If a creature of that type takes damage from the ammunition, the creature makes a DC 17 Constitution saving throw, taking an extra 6d10 Force damage on a failed save or half as much extra damage on a successful one. After dealing its extra damage to a creature, the ammunition becomes nonmagical.',
 '{}'::jsonb),

('Amulet of Health', 'Wondrous Item', 'Rare', true, null,
 'Your Constitution score is 19 while you wear this amulet. It has no effect if your Constitution is already 19 or higher.',
 '{}'::jsonb),

('Amulet of Proof against Detection and Location', 'Wondrous Item', 'Uncommon', true, null,
 'While wearing this amulet, you can''t be targeted by Divination spells or perceived through magical scrying sensors unless you allow it.',
 '{}'::jsonb),

('Amulet of the Planes', 'Wondrous Item', 'Very Rare', true, null,
 'While wearing this amulet, you can take a Magic action to name a location that you are familiar with on another plane of existence. Then make a DC 15 Intelligence (Arcana) check. On a successful check, you cast Plane Shift. On a failed check, you and each creature and object within 15 feet of you travel to a random destination.',
 '{}'::jsonb),

('Animated Shield', 'Armor', 'Very Rare', true, null,
 'While holding this Shield, you can take a Bonus Action to cause it to animate. The Shield leaps into the air and hovers in your space to protect you as if you were wielding it, leaving your hands free. The Shield remains animate for 1 minute, until you take a Bonus Action to end this effect, or until you die or have the Incapacitated condition.',
 '{}'::jsonb),

('Apparatus of the Crab', 'Wondrous Item', 'Legendary', false, null,
 'This item first appears to be a sealed iron barrel weighing 500 pounds. The barrel has a hidden catch. Releasing it unlocks a hatch at one end, allowing two Medium or smaller creatures to crawl inside. Ten levers allow the apparatus to transform into a giant lobster. The Apparatus of the Crab is a Large object: AC 20; HP 200; Speed 30 ft., Swim 30 ft.; Immunity to Poison and Psychic damage. It can submerge to 900 feet depth.',
 '{"ac": 20, "hp": 200}'::jsonb),

('Armor, +1', 'Armor', 'Rare', false, null,
 'You have a +1 bonus to Armor Class while wearing this armor (any Light, Medium, or Heavy).',
 '{"bonus": 1}'::jsonb),

('Armor, +2', 'Armor', 'Very Rare', false, null,
 'You have a +2 bonus to Armor Class while wearing this armor (any Light, Medium, or Heavy).',
 '{"bonus": 2}'::jsonb),

('Armor, +3', 'Armor', 'Legendary', false, null,
 'You have a +3 bonus to Armor Class while wearing this armor (any Light, Medium, or Heavy).',
 '{"bonus": 3}'::jsonb),

('Armor of Invulnerability', 'Armor', 'Legendary', true, null,
 'You have Resistance to Bludgeoning, Piercing, and Slashing damage while you wear this armor. Metal Shell. You can take a Magic action to give yourself Immunity to Bludgeoning, Piercing, and Slashing damage for 10 minutes or until you are no longer wearing the armor. Once this property is used, it can''t be used again until the next dawn.',
 '{"applies_to": "Plate Armor"}'::jsonb),

('Armor of Resistance', 'Armor', 'Rare', true, null,
 'You have Resistance to one type of damage while you wear this armor. The GM chooses the type or determines it randomly.',
 '{}'::jsonb),

('Armor of Vulnerability', 'Armor', 'Rare', true, null,
 'While wearing this armor, you have Resistance to one of the following damage types: Bludgeoning, Piercing, or Slashing. Curse. This armor is cursed. While cursed, you have Vulnerability to two of the three damage types associated with the armor.',
 '{"cursed": true}'::jsonb),

('Arrow-Catching Shield', 'Armor', 'Rare', true, null,
 'You gain a +2 bonus to Armor Class against ranged attack rolls while you wield this Shield. This bonus is in addition to the Shield''s normal bonus to AC. Whenever an attacker makes a ranged attack roll against a target within 5 feet of you, you can take a Reaction to become the target of the attack instead.',
 '{"bonus_vs_ranged": 2}'::jsonb),

-- B
('Bag of Beans', 'Wondrous Item', 'Rare', false, null,
 'This heavy cloth bag contains 3d4 dry beans when found. If you dump one or more beans out of the bag, they explode in a 10-foot-radius Sphere centered on them, dealing 5d4 Force damage (DC 15 Dexterity save for half). If you remove a bean from the bag, plant it in dirt or sand, and then water it, the bean disappears and produces a random magical effect 1 minute later.',
 '{}'::jsonb),

('Bag of Devouring', 'Wondrous Item', 'Very Rare', false, null,
 'This bag resembles a Bag of Holding but is a feeding orifice for a gigantic extradimensional creature. Animal or vegetable matter placed wholly in the bag is devoured and lost forever. When part of a living creature is placed in the bag, there is a 50 percent chance that the creature is pulled inside the bag. Any creature that starts its turn inside the bag is devoured, its body destroyed.',
 '{}'::jsonb),

('Bag of Holding', 'Wondrous Item', 'Uncommon', false, null,
 'This bag has an interior space considerably larger than its outside dimensions—roughly 2 feet square and 4 feet deep on the inside. The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet. The bag weighs 5 pounds, regardless of its contents.',
 '{"capacity_lbs": 500, "capacity_cubic_ft": 64}'::jsonb),

('Bag of Tricks (Gray)', 'Wondrous Item', 'Uncommon', false, null,
 'This bag made from gray cloth appears empty. Reaching inside reveals a small, fuzzy object. You can take a Magic action to pull the fuzzy object from the bag and throw it up to 20 feet. When the object lands, it transforms into a random creature (Gray table). The creature is Friendly to you and vanishes at the next dawn or when it drops to 0 Hit Points. Once three fuzzy objects have been pulled from the bag, the bag can''t be used again until the next dawn.',
 '{"color": "gray"}'::jsonb),

('Bag of Tricks (Rust)', 'Wondrous Item', 'Very Rare', false, null,
 'This bag made from rust cloth appears empty. Reaching inside reveals a small, fuzzy object. You can take a Magic action to pull the fuzzy object from the bag and throw it up to 20 feet. When the object lands, it transforms into a random creature (Rust table). The creature is Friendly to you and vanishes at the next dawn or when it drops to 0 Hit Points.',
 '{"color": "rust"}'::jsonb),

('Bag of Tricks (Tan)', 'Wondrous Item', 'Uncommon', false, null,
 'This bag made from tan cloth appears empty. Reaching inside reveals a small, fuzzy object. You can take a Magic action to pull the fuzzy object from the bag and throw it up to 20 feet. When the object lands, it transforms into a random creature (Tan table). The creature is Friendly to you and vanishes at the next dawn or when it drops to 0 Hit Points.',
 '{"color": "tan"}'::jsonb),

('Bead of Force', 'Wondrous Item', 'Rare', false, null,
 'This small black sphere measures 3/4 of an inch in diameter and weighs an ounce. You can take a Magic action to throw the bead up to 60 feet. The bead explodes in a 10-foot-radius Sphere on impact and is destroyed. Each creature in the Sphere must succeed on a DC 15 Dexterity saving throw or take 5d4 Force damage. A sphere of transparent force then encloses the area for 1 minute.',
 '{}'::jsonb),

('Bead of Nourishment', 'Wondrous Item', 'Common', false, null,
 'This flavorless, gelatinous bead dissolves on your tongue and provides as much nourishment as 1 day of Rations.',
 '{}'::jsonb),

('Belt of Dwarvenkind', 'Wondrous Item', 'Rare', true, null,
 'While wearing this belt, you gain the following benefits: you know Dwarvish; you have Advantage on Charisma (Persuasion) checks made to interact with dwarves and duergar; your Constitution increases by 2, to a maximum of 20. If you aren''t a dwarf or duergar, you also gain Darkvision with a range of 60 feet and Resistance to Poison damage.',
 '{}'::jsonb),

('Belt of Giant Strength', 'Wondrous Item', 'Varies', true, null,
 'While wearing this belt, your Strength changes to a score granted by the belt. The type of giant determines the score: Hill (21, Rare), Frost/Stone (23, Very Rare), Fire (25, Very Rare), Cloud (27, Legendary), Storm (29, Legendary). The item has no effect if your Strength without the belt equals or exceeds the belt''s score.',
 '{"varies_by_type": true}'::jsonb),

('Berserker Axe', 'Weapon', 'Rare', true, null,
 'You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon. In addition, while you are attuned to this weapon, your Hit Point maximum increases by 1 for each level you have attained. Curse. While cursed, you are unwilling to part with the weapon. Whenever another creature damages you while the weapon is in your possession, you must succeed on a DC 15 Wisdom saving throw or go berserk.',
 '{"bonus": 1, "cursed": true}'::jsonb),

('Boots of Elvenkind', 'Wondrous Item', 'Uncommon', false, null,
 'While you wear these boots, your steps make no sound, regardless of the surface you are moving across. You also have Advantage on Dexterity (Stealth) checks.',
 '{}'::jsonb),

('Boots of Levitation', 'Wondrous Item', 'Rare', true, null,
 'While you wear these boots, you can cast Levitate on yourself.',
 '{}'::jsonb),

('Boots of Speed', 'Wondrous Item', 'Rare', true, null,
 'While you wear these boots, you can take a Bonus Action to click the boots'' heels together. If you do, the boots double your Speed, and any creature that makes an Opportunity Attack against you has Disadvantage on the attack roll. When you''ve used the boots'' property for a total of 10 minutes, the magic ceases to function until you finish a Long Rest.',
 '{}'::jsonb),

('Boots of Striding and Springing', 'Wondrous Item', 'Uncommon', true, null,
 'While you wear these boots, your Speed becomes 30 feet unless your Speed is higher, and your Speed isn''t reduced by carrying weight in excess of your carrying capacity or wearing Heavy Armor. Once on each of your turns, you can jump up to 30 feet by spending only 10 feet of movement.',
 '{}'::jsonb),

('Boots of the Winterlands', 'Wondrous Item', 'Uncommon', true, null,
 'These furred boots are snug and feel warm. While wearing them, you have Resistance to Cold damage, can tolerate temperatures of 0 degrees Fahrenheit or lower without any additional protection, and you ignore Difficult Terrain created by ice or snow.',
 '{}'::jsonb),

('Bowl of Commanding Water Elementals', 'Wondrous Item', 'Rare', false, null,
 'While this bowl is filled with water and you are within 5 feet of it, you can take a Magic action to summon a Water Elemental. The elemental obeys your commands and takes its turn immediately after you on your Initiative count. The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action. The bowl can''t be used this way again until the next dawn.',
 '{}'::jsonb),

('Bracers of Archery', 'Wondrous Item', 'Uncommon', true, null,
 'While wearing these bracers, you have proficiency with the Longbow and Shortbow, and you gain a +2 bonus to damage rolls made with such weapons.',
 '{"damage_bonus": 2}'::jsonb),

('Bracers of Defense', 'Wondrous Item', 'Rare', true, null,
 'While wearing these bracers, you gain a +2 bonus to Armor Class if you are wearing no armor and using no Shield.',
 '{"ac_bonus": 2}'::jsonb),

('Brazier of Commanding Fire Elementals', 'Wondrous Item', 'Rare', false, null,
 'While you are within 5 feet of this brazier, you can take a Magic action to summon a Fire Elemental. The elemental obeys your commands. The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action. The brazier can''t be used this way again until the next dawn.',
 '{}'::jsonb),

('Brooch of Shielding', 'Wondrous Item', 'Uncommon', true, null,
 'While wearing this brooch, you have Resistance to Force damage, and you have Immunity to damage from the Magic Missile spell.',
 '{}'::jsonb),

('Broom of Flying', 'Wondrous Item', 'Uncommon', true, null,
 'This wooden broom functions like a mundane broom until you stand astride it and take a Magic action to make it hover beneath you. It has a Fly Speed of 50 feet. It can carry up to 400 pounds, but its Fly Speed becomes 30 feet while carrying over 200 pounds. As a Magic action, you can send the broom to travel alone to a destination within 1 mile of you if you name the location and are familiar with it.',
 '{"fly_speed": 50}'::jsonb),

-- C
('Candle of Invocation', 'Wondrous Item', 'Very Rare', true, null,
 'This candle''s magic is activated when the candle is lit, which requires a Magic action. After burning for 4 hours, the candle is destroyed. While lit, the candle sheds Dim Light in a 30-foot radius. While you are within that light, you have Advantage on D20 Tests. In addition, a Cleric or Druid in the light can cast level 1 spells they have prepared without expending spell slots.',
 '{}'::jsonb),

('Cape of the Mountebank', 'Wondrous Item', 'Rare', false, null,
 'This cape smells faintly of brimstone. While wearing it, you can use it to cast Dimension Door as a Magic action. This property can''t be used again until the next dawn. When you teleport with that spell, you leave behind a cloud of smoke.',
 '{}'::jsonb),

('Carpet of Flying', 'Wondrous Item', 'Very Rare', false, null,
 'You can make this carpet hover and fly by taking a Magic action and using the carpet''s command word. It moves according to your directions if you are within 30 feet of it. Four sizes of Carpet of Flying exist, ranging from 3 ft. x 5 ft. (80 ft. Fly Speed) to 6 ft. x 9 ft. (30 ft. Fly Speed). A carpet can carry up to twice its normal weight capacity, but its Fly Speed is halved if it carries more than its normal capacity.',
 '{}'::jsonb),

('Censer of Controlling Air Elementals', 'Wondrous Item', 'Rare', false, null,
 'While gently swinging this censer, you can take a Magic action to summon an Air Elemental. The elemental obeys your commands. The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action. The censer can''t be used this way again until the next dawn.',
 '{}'::jsonb),

('Chime of Opening', 'Wondrous Item', 'Rare', false, null,
 'This hollow metal tube measures about 1 foot long and weighs 1 pound. As a Magic action, you can strike the chime to cast Knock. The spell''s customary knocking sound is replaced by the clear, ringing tone of the chime, which is audible out to 300 feet. The chime can be used 10 times. After the tenth time, it cracks and becomes useless.',
 '{"charges": 10}'::jsonb),

('Circlet of Blasting', 'Wondrous Item', 'Uncommon', false, null,
 'While wearing this circlet, you can cast Scorching Ray with it (+5 to hit). The circlet can''t cast this spell again until the next dawn.',
 '{}'::jsonb),

('Cloak of Arachnida', 'Wondrous Item', 'Very Rare', true, null,
 'This fine garment is made of black silk interwoven with faint, silvery threads. While wearing it, you gain Resistance to Poison damage, a Climb Speed equal to your Speed, the ability to move through webs as Difficult Terrain, and you can cast Web (save DC 13) once per dawn.',
 '{}'::jsonb),

('Cloak of Displacement', 'Wondrous Item', 'Rare', true, null,
 'While you wear this cloak, it magically projects an illusion that makes you appear to be standing in a place near your actual location, causing any creature to have Disadvantage on attack rolls against you. If you take damage, the property ceases to function until the start of your next turn. This property is suppressed while your Speed is 0.',
 '{}'::jsonb),

('Cloak of Elvenkind', 'Wondrous Item', 'Uncommon', true, null,
 'While you wear this cloak, Wisdom (Perception) checks made to perceive you have Disadvantage, and you have Advantage on Dexterity (Stealth) checks.',
 '{}'::jsonb),

('Cloak of Invisibility', 'Wondrous Item', 'Legendary', true, null,
 'This cloak has 3 charges and regains 1d3 expended charges daily at dawn. While wearing the cloak, you can take a Magic action to pull its hood over your head and expend 1 charge to give yourself the Invisible condition for 1 hour.',
 '{"charges": 3}'::jsonb),

('Cloak of Protection', 'Wondrous Item', 'Uncommon', true, null,
 'You gain a +1 bonus to Armor Class and saving throws while you wear this cloak.',
 '{"ac_bonus": 1, "save_bonus": 1}'::jsonb),

('Cloak of the Bat', 'Wondrous Item', 'Rare', true, null,
 'While wearing this cloak, you have Advantage on Dexterity (Stealth) checks. In an area of Dim Light or Darkness, you can grip the edges of the cloak and use it to gain a Fly Speed of 40 feet. While wearing the cloak in an area of Dim Light or Darkness, you can cast Polymorph on yourself, shape-shifting into a Bat. The cloak can''t be used this way again until the next dawn.',
 '{}'::jsonb),

('Cloak of the Manta Ray', 'Wondrous Item', 'Uncommon', true, null,
 'While wearing this cloak, you can breathe underwater, and you have a Swim Speed of 60 feet.',
 '{"swim_speed": 60}'::jsonb),

('Crystal Ball', 'Wondrous Item', 'Very Rare', true, null,
 'While touching this crystal orb, you can cast Scrying (save DC 17) with it.',
 '{}'::jsonb),

('Crystal Ball of Mind Reading', 'Wondrous Item', 'Legendary', true, null,
 'While touching this crystal orb, you can cast Scrying (save DC 17) with it. In addition, you can cast Detect Thoughts (save DC 17) targeting creatures you can see within 30 feet of the spell''s sensor. You don''t need to concentrate on this Detect Thoughts spell.',
 '{}'::jsonb),

('Crystal Ball of Telepathy', 'Wondrous Item', 'Legendary', true, null,
 'While touching this crystal orb, you can cast Scrying (save DC 17) with it. In addition, you can communicate telepathically with creatures you can see within 30 feet of the spell''s sensor. You can also cast Suggestion (save DC 17) through the sensor on one of those creatures.',
 '{}'::jsonb),

('Crystal Ball of True Seeing', 'Wondrous Item', 'Legendary', true, null,
 'While touching this crystal orb, you can cast Scrying (save DC 17) with it. In addition, you have Truesight with a range of 120 feet centered on the spell''s sensor.',
 '{}'::jsonb),

('Cube of Force', 'Wondrous Item', 'Rare', true, null,
 'This cube is about an inch across. Each face has a distinct marking on it. You can press one of those faces, expend the number of charges required, and cast the spell associated with it (save DC 17). The cube starts with 10 charges, and it regains 1d6 expended charges daily at dawn.',
 '{"charges": 10}'::jsonb),

('Cubic Gate', 'Wondrous Item', 'Legendary', false, null,
 'This cube is 3 inches across and radiates palpable magical energy. The six sides of the cube are each keyed to a different plane of existence, one of which is the Material Plane. The cube has 3 charges and regains 1d3 expended charges daily at dawn. As a Magic action, you can expend 1 charge to cast Gate or Plane Shift using the cube.',
 '{"charges": 3}'::jsonb),

-- D
('Dagger of Venom', 'Weapon', 'Rare', false, null,
 'You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon. You can take a Bonus Action to magically coat the blade with poison. The poison remains for 1 minute or until an attack using this weapon hits a creature. That creature must succeed on a DC 15 Constitution saving throw or take 2d10 Poison damage and have the Poisoned condition for 1 minute.',
 '{"bonus": 1}'::jsonb),

('Dancing Sword', 'Weapon', 'Very Rare', true, null,
 'You can take a Bonus Action to toss this magic weapon into the air. When you do so, the weapon begins to hover, flies up to 30 feet, and attacks one creature of your choice within 5 feet of itself. The weapon uses your attack roll and adds your ability modifier to damage rolls. After the hovering weapon attacks for the fourth time, it flies back to you.',
 '{}'::jsonb),

('Decanter of Endless Water', 'Wondrous Item', 'Uncommon', false, null,
 'This stoppered flask sloshes when shaken, as if it contains water. You can take a Magic action to remove the stopper and issue one of three command words to produce water: Splash (1 gallon), Fountain (5 gallons), or Geyser (30 gallons in a 30-foot Line, DC 13 Strength save or take 1d4 Bludgeoning damage and fall Prone).',
 '{}'::jsonb),

('Deck of Illusions', 'Wondrous Item', 'Uncommon', false, null,
 'This box contains a set of cards. A full deck has 34 cards: 32 depicting specific creatures and two with a mirrored surface. You can take a Magic action to draw a card at random and throw it to the ground. An illusion of a creature forms over the thrown card and remains until dispelled. The illusory creature can''t do harm. Any physical interaction with it reveals it to be false.',
 '{}'::jsonb),

('Defender', 'Weapon', 'Legendary', true, null,
 'You gain a +3 bonus to attack rolls and damage rolls made with this magic weapon. The first time you attack with the weapon on each of your turns, you can transfer some or all of the weapon''s bonus to your Armor Class instead. The adjusted bonuses remain in effect until the start of your next turn.',
 '{"bonus": 3}'::jsonb),

('Demon Armor', 'Armor', 'Very Rare', true, null,
 'While wearing this armor, you gain a +1 bonus to Armor Class, and you know Abyssal. The armor''s clawed gauntlets allow your Unarmed Strikes to deal 1d8 Slashing damage, and you gain a +1 bonus to the attack and damage rolls of your Unarmed Strikes. Curse. Once you don this cursed armor, you can''t doff it unless targeted by a Remove Curse spell.',
 '{"bonus": 1, "cursed": true}'::jsonb),

('Dimensional Shackles', 'Wondrous Item', 'Rare', false, null,
 'You can take a Utilize action to place these shackles on a creature that has the Incapacitated condition. The shackles prevent a creature bound by them from using any method of extradimensional movement, including teleportation or travel to a different plane of existence. Once every 30 days, the bound creature can make a DC 30 Strength (Athletics) check to break free.',
 '{}'::jsonb),

('Dragon Orb', 'Wondrous Item', 'Artifact', true, null,
 'An orb is an etched crystal globe about 10 inches in diameter. While attuned to an orb, you can take a Magic action to peer into the orb''s depths (DC 15 Charisma saving throw or the orb imposes the Charmed condition on you). The orb has 7 charges and can cast various spells including Cure Wounds, Daylight, Death Ward, Detect Magic, and Scrying. You can also use it to Call Dragons within 40 miles.',
 '{"charges": 7}'::jsonb),

('Dragon Scale Mail', 'Armor', 'Very Rare', true, null,
 'Made of the scales of one kind of dragon. While wearing this armor, you gain a +1 bonus to Armor Class, you have Advantage on saving throws against the breath weapons of Dragons, and you have Resistance to one damage type determined by the kind of dragon that provided the scales. Additionally, you can focus your senses to discern the distance and direction to the closest dragon of the same type within 30 miles.',
 '{"bonus": 1}'::jsonb),

('Dragon Slayer', 'Weapon', 'Rare', false, null,
 'You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon. The weapon deals an extra 3d6 damage of the weapon''s type if the target is a Dragon.',
 '{"bonus": 1}'::jsonb),

('Dust of Disappearance', 'Wondrous Item', 'Uncommon', false, null,
 'This powder resembles fine sand. There is enough of it for one use. When you take a Utilize action to throw the dust into the air, you and each creature and object within a 10-foot Emanation have the Invisible condition for 2d4 minutes. Immediately after an affected creature makes an attack roll, deals damage, or casts a spell, the Invisible condition ends for that creature.',
 '{}'::jsonb),

('Dust of Dryness', 'Wondrous Item', 'Uncommon', false, null,
 'This small packet contains 1d6 + 4 pinches of dust. As a Utilize action, you can sprinkle a pinch of the dust over water, turning up to a 15-foot Cube of water into one marble-sized pellet. You can also sprinkle a pinch on a water-based Elemental within 5 feet of yourself, which must make a DC 13 Constitution saving throw, taking 10d6 Necrotic damage on a failure.',
 '{}'::jsonb),

('Dust of Sneezing and Choking', 'Wondrous Item', 'Uncommon', false, null,
 'Found in a small container, this powder resembles Dust of Disappearance, and Identify reveals it to be such. As a Utilize action, you can throw the dust into the air, forcing yourself and every creature in a 30-foot Emanation to make a DC 15 Constitution saving throw. On a failed save, a creature begins sneezing uncontrollably; it has the Incapacitated condition and is suffocating.',
 '{}'::jsonb),

('Dwarven Plate', 'Armor', 'Very Rare', false, null,
 'While wearing this armor, you gain a +2 bonus to Armor Class. In addition, if an effect moves you against your will along the ground, you can take a Reaction to reduce the distance you are moved by up to 10 feet.',
 '{"bonus": 2}'::jsonb),

('Dwarven Thrower', 'Weapon', 'Very Rare', true, 'by a Dwarf or a Creature Attuned to a Belt of Dwarvenkind',
 'You gain a +3 bonus to attack rolls and damage rolls made with this magic weapon. It has the Thrown property with a normal range of 20 feet and a long range of 60 feet. When you hit with a ranged attack using this weapon, it deals an extra 1d8 Force damage, or an extra 2d8 Force damage if the target is a Giant. Immediately after hitting or missing, the weapon flies back to your hand.',
 '{"bonus": 3}'::jsonb),

-- E
('Efficient Quiver', 'Wondrous Item', 'Uncommon', false, null,
 'Each of the quiver''s three compartments connects to an extradimensional space that allows the quiver to hold numerous items while never weighing more than 2 pounds. The shortest compartment can hold up to 60 Arrows or Bolts. The mid-size compartment holds up to 18 Javelins or similar objects. The longest compartment holds up to 6 long objects, such as bows, Quarterstaffs, or Spears.',
 '{}'::jsonb),

('Efreeti Bottle', 'Wondrous Item', 'Very Rare', false, null,
 'When you take a Magic action to remove the stopper of this painted brass bottle, a cloud of thick smoke flows out of it. At the end of your turn, an Efreeti appears in an unoccupied space within 30 feet of you. The first time the bottle is opened, roll 1d10 to determine the efreeti''s reaction: on a 1, it attacks you; on 2-9, it obeys your commands for 1 hour; on a 10, it grants one Wish.',
 '{}'::jsonb),

('Elemental Gem', 'Wondrous Item', 'Uncommon', false, null,
 'This gem contains a mote of elemental energy. When you take a Utilize action to break the gem, an elemental is summoned and the gem ceases to be magical. The type of gem determines the elemental: Blue sapphire (Air Elemental), Emerald (Water Elemental), Red corundum (Fire Elemental), Yellow diamond (Earth Elemental).',
 '{}'::jsonb),

('Elixir of Health', 'Potion', 'Rare', false, null,
 'When you drink this potion, you are cured of all magical contagions. In addition, the following conditions end on you: Blinded, Deafened, Paralyzed, and Poisoned. The clear, red liquid has tiny bubbles of light in it.',
 '{}'::jsonb),

('Elven Chain', 'Armor', 'Rare', false, null,
 'You gain a +1 bonus to Armor Class while you wear this armor. You are considered trained with this armor even if you lack training with Medium or Heavy armor.',
 '{"bonus": 1}'::jsonb),

('Energy Bow', 'Weapon', 'Very Rare', true, null,
 'You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon, which has no string. Each time you pull your arm back in a firing motion, a magical arrow made of golden energy appears nocked and ready to fire. An arrow produced by this weapon deals Force damage. The bow has additional properties: Arrow of Restraint (DC 15 Strength save or Restrained), Arrow of Transport (teleports a target), and Energy Ladder (creates a magical ladder).',
 '{"bonus": 1}'::jsonb),

('Eversmoking Bottle', 'Wondrous Item', 'Uncommon', false, null,
 'As a Magic action, you can open or close this bottle. Opening the bottle causes thick smoke to billow out, forming a cloud that fills a 60-foot Emanation originating from the bottle. The area within the smoke is Heavily Obscured. Each minute the bottle remains open, the Emanation increases by 10 feet to a maximum size of 120 feet.',
 '{}'::jsonb),

('Eyes of Charming', 'Wondrous Item', 'Uncommon', true, null,
 'These crystal lenses fit over the eyes. They have 3 charges. While wearing them, you can expend 1 or more charges to cast Charm Person (save DC 13). The lenses regain all expended charges daily at dawn.',
 '{"charges": 3}'::jsonb),

('Eyes of Minute Seeing', 'Wondrous Item', 'Uncommon', false, null,
 'These crystal lenses fit over the eyes. While wearing them, your vision improves significantly out to a range of 1 foot, granting you Darkvision within that range and Advantage on Intelligence (Investigation) checks made to examine something within that range.',
 '{}'::jsonb),

('Eyes of the Eagle', 'Wondrous Item', 'Uncommon', false, null,
 'These crystal lenses fit over the eyes. While wearing them, you have Advantage on Wisdom (Perception) checks that rely on sight. In conditions of clear visibility, you can make out details of even extremely distant creatures and objects as small as 2 feet across.',
 '{}'::jsonb),

-- F
('Feather Token', 'Wondrous Item', 'Varies', false, null,
 'This object looks like a feather. Different types of feather tokens exist, each with a different single-use effect. Types include: Anchor (Uncommon), Bird (Rare), Fan (Uncommon), Swan Boat (Rare), Tree (Uncommon), and Whip (Rare).',
 '{"varies_by_type": true}'::jsonb),

('Figurine of Wondrous Power', 'Wondrous Item', 'Varies', false, null,
 'A Figurine of Wondrous Power is a statuette small enough to fit in a pocket. If you take a Magic action to throw the figurine to a point on the ground within 60 feet, the figurine becomes a living creature. Types include: Bronze Griffon (Rare), Ebony Fly (Rare), Golden Lions (Rare), Ivory Goats (Rare), Marble Elephant (Rare), Obsidian Steed (Very Rare), Onyx Dog (Rare), Serpentine Owl (Rare), Silver Raven (Uncommon).',
 '{"varies_by_type": true}'::jsonb),

('Flame Tongue', 'Weapon', 'Rare', true, null,
 'While holding this magic weapon, you can take a Bonus Action and use a command word to cause flames to engulf the damage-dealing part of the weapon. These flames shed Bright Light in a 40-foot radius and Dim Light for an additional 40 feet. While the weapon is ablaze, it deals an extra 2d6 Fire damage on a hit.',
 '{"extra_damage": "2d6 fire"}'::jsonb),

('Folding Boat', 'Wondrous Item', 'Rare', false, null,
 'This object appears as a wooden box that measures 12 inches long, 6 inches wide, and 6 inches deep. It weighs 4 pounds and floats. It has three command words, each requiring a Magic action: the first unfolds it into a Rowboat, the second into a Keelboat, and the third folds it back into a box.',
 '{}'::jsonb),

('Frost Brand', 'Weapon', 'Very Rare', true, null,
 'When you hit with an attack roll using this magic weapon, the target takes an extra 1d6 Cold damage. While you hold the weapon, you have Resistance to Fire damage. In freezing temperatures, the weapon sheds Bright Light in a 10-foot radius. When you draw this weapon, you can extinguish all nonmagical flames within 30 feet of yourself (once per hour).',
 '{"extra_damage": "1d6 cold"}'::jsonb),

-- G
('Gauntlets of Ogre Power', 'Wondrous Item', 'Uncommon', true, null,
 'Your Strength is 19 while you wear these gauntlets. They have no effect on you if your Strength is 19 or higher without them.',
 '{"strength": 19}'::jsonb),

('Gem of Brightness', 'Wondrous Item', 'Uncommon', false, null,
 'This prism has 50 charges. While you are holding it, you can take a Magic action and use one of three command words: the first sheds Bright Light in a 30-foot radius (no charge); the second fires a blinding beam at one creature (DC 15 Constitution save or Blinded, 1 charge); the third causes a 30-foot Cone of intense light (5 charges). When all charges are expended, the gem becomes a nonmagical jewel worth 50 GP.',
 '{"charges": 50}'::jsonb),

('Gem of Seeing', 'Wondrous Item', 'Rare', true, null,
 'This gem has 3 charges. As a Magic action, you can expend 1 charge. For the next 10 minutes, you have Truesight out to 120 feet when you peer through the gem. The gem regains 1d3 expended charges daily at dawn.',
 '{"charges": 3}'::jsonb),

('Giant Slayer', 'Weapon', 'Rare', false, null,
 'You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon. When you hit a Giant with this weapon, the Giant takes an extra 2d6 damage of the weapon''s type and must succeed on a DC 15 Strength saving throw or have the Prone condition.',
 '{"bonus": 1}'::jsonb),

('Glamoured Studded Leather', 'Armor', 'Rare', false, null,
 'While wearing this armor, you gain a +1 bonus to Armor Class. You can also take a Bonus Action to cause the armor to assume the appearance of a normal set of clothing or some other kind of armor. The illusory appearance lasts until you use this property again or doff the armor.',
 '{"bonus": 1}'::jsonb),

('Gloves of Missile Snaring', 'Wondrous Item', 'Uncommon', true, null,
 'If you''re hit by an attack roll made with a Ranged or Thrown weapon while wearing these gloves, you can take a Reaction to reduce the damage by 1d10 plus your Dexterity modifier if you have a free hand. If you reduce the damage to 0, you can catch the ammunition or weapon if it is small enough for you to hold in that hand.',
 '{}'::jsonb),

('Gloves of Swimming and Climbing', 'Wondrous Item', 'Uncommon', true, null,
 'While wearing these gloves, you have a Climb Speed and a Swim Speed equal to your Speed, and you gain a +5 bonus to Strength (Athletics) checks made to climb or swim.',
 '{}'::jsonb),

('Gloves of Thievery', 'Wondrous Item', 'Uncommon', false, null,
 'These gloves are imperceptible while worn. While wearing them, you gain a +5 bonus to Dexterity (Sleight of Hand) checks.',
 '{}'::jsonb),

('Goggles of Night', 'Wondrous Item', 'Uncommon', false, null,
 'While wearing these dark lenses, you have Darkvision out to 60 feet. If you already have Darkvision, wearing the goggles increases its range by 60 feet.',
 '{"darkvision": 60}'::jsonb),

-- H
('Hammer of Thunderbolts', 'Weapon', 'Legendary', true, null,
 'You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon. The weapon has 5 charges. You can expend 1 charge to make a ranged attack hurling it (20 ft. normal range, 60 ft. long). If the attack hits, it unleashes a thunderclap audible out to 300 feet, and the target and every creature within 30 feet must succeed on a DC 17 Constitution saving throw or have the Stunned condition. When attuned with a Belt of Giant Strength or Gauntlets of Ogre Power, you gain additional benefits including potentially slaying Giants on a 20.',
 '{"bonus": 1, "charges": 5}'::jsonb),

('Handy Haversack', 'Wondrous Item', 'Rare', false, null,
 'This backpack has a central pouch and two side pouches, each of which is an extradimensional space. Each side pouch can hold up to 200 pounds, not exceeding a volume of 25 cubic feet. The central pouch can hold up to 500 pounds, not exceeding a volume of 64 cubic feet. The haversack always weighs 5 pounds, regardless of its contents.',
 '{"capacity_lbs": 500, "capacity_cubic_ft": 64}'::jsonb),

('Hat of Disguise', 'Wondrous Item', 'Uncommon', true, null,
 'While wearing this hat, you can cast the Disguise Self spell. The spell ends if the hat is removed.',
 '{}'::jsonb),

('Hat of Many Spells', 'Wondrous Item', 'Very Rare', true, 'by a Wizard',
 'This pointed hat functions as a Spellcasting Focus for Wizard spells. While holding the hat, you can try to cast a level 1+ spell you don''t know from the Wizard spell list (Intelligence (Arcana) check DC 10 + spell level). On a success, you cast the spell. On a failure, a random effect occurs instead.',
 '{}'::jsonb),

('Headband of Intellect', 'Wondrous Item', 'Uncommon', true, null,
 'Your Intelligence is 19 while you wear this headband. It has no effect on you if your Intelligence is 19 or higher without it.',
 '{"intelligence": 19}'::jsonb),

('Helm of Brilliance', 'Wondrous Item', 'Very Rare', true, null,
 'This helm is set with 1d10 diamonds, 2d10 rubies, 3d10 fire opals, and 4d10 opals. You gain benefits while wearing the helm: diamonds emit an Emanation that damages Undead; fire opals allow a weapon to burst into flames dealing extra 1d6 Fire damage; rubies grant Resistance to Fire damage; and gems allow casting of Daylight, Fireball, Prismatic Spray, or Wall of Fire.',
 '{}'::jsonb),

('Helm of Comprehending Languages', 'Wondrous Item', 'Uncommon', false, null,
 'While wearing this helm, you can cast Comprehend Languages from it.',
 '{}'::jsonb),

('Helm of Telepathy', 'Wondrous Item', 'Uncommon', true, null,
 'While wearing this helm, you have telepathy with a range of 30 feet, and you can cast Detect Thoughts or Suggestion (save DC 13) from the helm. Once either spell is cast from the helm, that spell can''t be cast from it again until the next dawn.',
 '{}'::jsonb),

('Helm of Teleportation', 'Wondrous Item', 'Rare', true, null,
 'This helm has 3 charges. While wearing it, you can expend 1 charge to cast Teleport from it. The helm regains 1d3 expended charges daily at dawn.',
 '{"charges": 3}'::jsonb),

('Holy Avenger', 'Weapon', 'Legendary', true, 'by a Paladin',
 'You gain a +3 bonus to attack rolls and damage rolls made with this magic weapon. When you hit a Fiend or an Undead with it, that creature takes an extra 2d10 Radiant damage. While you hold the drawn weapon, it creates a 10-foot Emanation. You and all creatures Friendly to you in the Emanation have Advantage on saving throws against spells and other magical effects.',
 '{"bonus": 3, "extra_damage_vs_fiend_undead": "2d10 radiant"}'::jsonb),

('Horn of Blasting', 'Wondrous Item', 'Rare', false, null,
 'You can take a Magic action to blow the horn, which emits a thunderous blast in a 30-foot Cone audible out to 600 feet. Each creature in the Cone makes a DC 15 Constitution saving throw. On a failed save, a creature takes 5d8 Thunder damage and has the Deafened condition for 1 minute. Each use of the horn''s magic has a 20 percent chance of causing the horn to explode, dealing 10d6 Force damage to the user.',
 '{}'::jsonb),

('Horn of Valhalla', 'Wondrous Item', 'Varies', false, null,
 'You can take a Magic action to blow this horn. In response, warrior spirits from the plane of Ysgard appear within 60 feet of you and remain for 1 hour. Four types exist: Silver (2 spirits, Rare), Brass (3 spirits, Rare), Bronze (4 spirits, Very Rare), Iron (5 spirits, Legendary). If you blow the horn without meeting its requirement, the summoned spirits attack you.',
 '{"varies_by_type": true}'::jsonb),

('Horseshoes of a Zephyr', 'Wondrous Item', 'Very Rare', false, null,
 'These horseshoes come in a set of four. While all four shoes are affixed to the hooves of a horse or similar creature, they allow the creature to move normally while floating 4 inches above a surface. The creature can cross or stand above nonsolid or unstable surfaces, leaves no tracks, ignores Difficult Terrain, and can travel for up to 12 hours a day without gaining Exhaustion from extended travel.',
 '{}'::jsonb),

('Horseshoes of Speed', 'Wondrous Item', 'Rare', false, null,
 'These horseshoes come in a set of four. While all four horseshoes are attached to the same creature, its Speed is increased by 30 feet.',
 '{"speed_bonus": 30}'::jsonb),

-- I
('Immovable Rod', 'Rod', 'Uncommon', false, null,
 'This iron rod has a button on one end. You can take a Utilize action to press the button, which causes the rod to become magically fixed in place. Until you or another creature takes a Utilize action to push the button again, the rod doesn''t move, even if it defies gravity. The rod can hold up to 8,000 pounds of weight.',
 '{}'::jsonb),

('Instant Fortress', 'Wondrous Item', 'Rare', true, null,
 'As a Magic action, you can place this 1-inch adamantine statuette on the ground and, using a command word, cause it to grow rapidly into a square adamantine tower, 20 feet on a side and 30 feet high. The tower has arrow slits on all sides and a battlement atop it. Only a Wish spell can repair the tower.',
 '{}'::jsonb),

('Ioun Stone', 'Wondrous Item', 'Varies', true, null,
 'When you take a Magic action to toss an Ioun Stone into the air, the stone orbits your head at a distance of 1d3 feet, conferring its benefit to you. Types include: Absorption (Very Rare), Agility (Very Rare), Awareness (Rare), Fortitude (Very Rare), Greater Absorption (Legendary), Insight (Very Rare), Intellect (Very Rare), Leadership (Very Rare), Mastery (Legendary), Protection (Rare), Regeneration (Legendary), Reserve (Rare), Strength (Very Rare), Sustenance (Rare).',
 '{"varies_by_type": true}'::jsonb),

('Iron Bands', 'Wondrous Item', 'Rare', false, null,
 'This rusty iron sphere measures 3 inches in diameter and weighs 1 pound. You can take a Magic action to throw the sphere at a Huge or smaller creature you can see within 60 feet of yourself. Make a ranged attack roll. On a hit, the target has the Restrained condition. A creature that can touch the bands can take an action to make a DC 20 Strength (Athletics) check to break them.',
 '{}'::jsonb),

('Iron Flask', 'Wondrous Item', 'Legendary', false, null,
 'While holding this brass-stoppered iron flask, you can take a Magic action to target a creature native to a plane of existence other than the one you''re on. If the flask is empty, the target must succeed on a DC 17 Wisdom saving throw or be trapped in the flask. Once trapped, a creature remains in the flask until released. You can release the creature, which then obeys your commands for 1 hour.',
 '{}'::jsonb),

-- J
('Javelin of Lightning', 'Weapon', 'Uncommon', false, null,
 'Each time you make an attack roll with this magic weapon and hit, you can have it deal Lightning damage instead of Piercing damage. Lightning Bolt. When you throw this weapon at a target no farther than 120 feet from you, you can forgo the attack roll and turn the weapon into a bolt of lightning dealing 4d6 Lightning damage (DC 13 Dexterity save for half). This property can''t be used again until the next dawn.',
 '{}'::jsonb),

-- L
('Lantern of Revealing', 'Wondrous Item', 'Uncommon', false, null,
 'While lit, this hooded lantern burns for 6 hours on 1 pint of oil, shedding Bright Light in a 30-foot radius and Dim Light for an additional 30 feet. Invisible creatures and objects are visible as long as they are in the lantern''s Bright Light.',
 '{}'::jsonb),

('Luck Blade', 'Weapon', 'Legendary', true, null,
 'You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon. While the weapon is on your person, you also gain a +1 bonus to saving throws. Luck. You can reroll one failed D20 Test per dawn. Wish. The weapon has 1d3 charges. While holding it, you can expend 1 charge and cast Wish from it.',
 '{"bonus": 1}'::jsonb),

-- M
('Mace of Disruption', 'Weapon', 'Rare', true, null,
 'When you hit a Fiend or an Undead with this magic weapon, that creature takes an extra 2d6 Radiant damage. If the target has 25 Hit Points or fewer after taking this damage, it must succeed on a DC 15 Wisdom saving throw or be destroyed. On a successful save, the creature has the Frightened condition until the end of your next turn. While you hold this weapon, it sheds Bright Light in a 20-foot radius.',
 '{"extra_damage_vs_fiend_undead": "2d6 radiant"}'::jsonb),

('Mace of Smiting', 'Weapon', 'Rare', false, null,
 'You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon. The bonus increases to +3 when you use the weapon to attack a Construct. When you roll a 20 on an attack roll made with this weapon, the target takes an extra 7 Bludgeoning damage, or 14 Bludgeoning damage if it''s a Construct.',
 '{"bonus": 1}'::jsonb),

('Mace of Terror', 'Weapon', 'Rare', true, null,
 'This magic weapon has 3 charges and regains 1d3 expended charges daily at dawn. While holding the weapon, you can take a Magic action and expend 1 charge to release a wave of terror. Each creature of your choice within 30 feet of you must succeed on a DC 15 Wisdom saving throw or have the Frightened condition for 1 minute.',
 '{"charges": 3}'::jsonb),

('Mantle of Spell Resistance', 'Wondrous Item', 'Rare', true, null,
 'You have Advantage on saving throws against spells while you wear this cloak.',
 '{}'::jsonb),

('Manual of Bodily Health', 'Wondrous Item', 'Very Rare', false, null,
 'This book contains health and nutrition tips, and its words are charged with magic. If you spend 48 hours over a period of 6 days or fewer studying the book''s contents and practicing its guidelines, your Constitution increases by 2, to a maximum of 30. The manual then loses its magic but regains it in a century.',
 '{"stat_increase": "Constitution +2"}'::jsonb),

('Manual of Gainful Exercise', 'Wondrous Item', 'Very Rare', false, null,
 'This book describes fitness exercises, and its words are charged with magic. If you spend 48 hours over a period of 6 days or fewer studying the book''s contents and practicing its guidelines, your Strength increases by 2, to a maximum of 30. The manual then loses its magic but regains it in a century.',
 '{"stat_increase": "Strength +2"}'::jsonb),

('Manual of Golems', 'Wondrous Item', 'Very Rare', false, null,
 'This tome contains information and incantations necessary to make a particular type of golem. To decipher and use the manual, you must be a spellcaster with at least two level 5 spell slots. Types: Clay Golem (30 days, 65,000 GP), Flesh Golem (60 days, 50,000 GP), Iron Golem (120 days, 100,000 GP), Stone Golem (90 days, 80,000 GP).',
 '{}'::jsonb),

('Manual of Quickness of Action', 'Wondrous Item', 'Very Rare', false, null,
 'This book contains coordination and balance exercises, and its words are charged with magic. If you spend 48 hours over a period of 6 days or fewer studying the book''s contents and practicing its guidelines, your Dexterity increases by 2, to a maximum of 30. The manual then loses its magic but regains it in a century.',
 '{"stat_increase": "Dexterity +2"}'::jsonb),

('Marvelous Pigments', 'Wondrous Item', 'Very Rare', false, null,
 'This fine wooden box contains 1d4 pots of pigment and a brush. Using the brush and expending 1 pot of pigment, you can paint any number of three-dimensional objects and terrain features confined to a 20-foot Cube over 10 minutes. When the work is done, all the painted objects and terrain features become real. No object created by a pot of pigment can have a value greater than 25 GP.',
 '{}'::jsonb),

('Medallion of Thoughts', 'Wondrous Item', 'Uncommon', true, null,
 'The medallion has 5 charges. While wearing it, you can expend 1 charge to cast Detect Thoughts (save DC 13) from it. The medallion regains 1d4 expended charges daily at dawn.',
 '{"charges": 5}'::jsonb),

('Mirror of Life Trapping', 'Wondrous Item', 'Very Rare', false, null,
 'When this 4-foot-tall, 2-foot-wide mirror is viewed indirectly, its surface shows faint images of creatures. If the mirror is hanging on a vertical surface and you are within 5 feet of it, you can take a Magic action to activate it. Any creature other than you that sees its reflection in the activated mirror while within 30 feet must succeed on a DC 15 Charisma saving throw or be trapped in one of the mirror''s twelve extradimensional cells.',
 '{}'::jsonb),

('Mithral Armor', 'Armor', 'Uncommon', false, null,
 'Mithral is a light, flexible metal. Armor made of this substance can be worn under normal clothes. If the armor normally imposes Disadvantage on Dexterity (Stealth) checks or has a Strength requirement, the mithral version of the armor doesn''t.',
 '{}'::jsonb),

('Mysterious Deck', 'Wondrous Item', 'Legendary', false, null,
 'Usually found in a box or pouch, this deck contains a number of cards made of ivory or vellum. Most decks have thirteen cards, but some have twenty-two. Before you draw a card, you must declare how many cards you intend to draw. Each card drawn has a powerful effect including: Balance, Comet, Donjon, Euryale, Fates, Flames, Fool, Gem, Jester, Key, Knight, Moon, Puzzle, Rogue, Ruin, Sage, Skull, Star, Sun, Talons, Throne, and Void.',
 '{}'::jsonb),

-- N
('Necklace of Adaptation', 'Wondrous Item', 'Uncommon', true, null,
 'While wearing this necklace, you can breathe normally in any environment, and you have Advantage on saving throws made to avoid or end the Poisoned condition.',
 '{}'::jsonb),

('Necklace of Fireballs', 'Wondrous Item', 'Rare', false, null,
 'This necklace has 1d6 + 3 beads hanging from it. You can take a Magic action to detach a bead and throw it up to 60 feet away. When it reaches the end of its trajectory, the bead detonates as a level 3 Fireball (save DC 15). You can hurl multiple beads at one time, increasing the damage by 1d6 for each bead after the first (maximum 12d6).',
 '{}'::jsonb),

('Necklace of Prayer Beads', 'Wondrous Item', 'Rare', true, 'by a Cleric, Druid, or Paladin',
 'This necklace has 1d4 + 2 magic beads. Six types of magic beads exist: Bead of Blessing (Bless), Bead of Curing (Cure Wounds level 2), Bead of Favor (Greater Restoration), Bead of Smiting (Shining Smite), Bead of Summons (Guardian of Faith), Bead of Wind Walking (Wind Walk). Each bead can be used once per dawn as a Bonus Action.',
 '{}'::jsonb),

('Nine Lives Stealer', 'Weapon', 'Very Rare', true, null,
 'You gain a +2 bonus to attack rolls and damage rolls made with this magic weapon. Life Stealing. The weapon has 1d8 + 1 charges. When you attack a creature that has fewer than 100 Hit Points with this weapon and roll a 20 on the d20 for the attack roll, the creature must succeed on a DC 15 Constitution saving throw or be slain instantly. The weapon loses 1 charge if the creature is slain.',
 '{"bonus": 2}'::jsonb),

-- O
('Oathbow', 'Weapon', 'Very Rare', true, null,
 'When you use this weapon to make a ranged attack, you can utter the command words to make the target your sworn enemy until it dies or until dawn 7 days later. When you make a ranged attack roll with this weapon against your sworn enemy, you have Advantage on the roll, your target gains no benefit from Half Cover or Three-Quarters Cover, and the attack deals an extra 3d6 Piercing damage.',
 '{}'::jsonb),

('Oil of Etherealness', 'Potion', 'Rare', false, null,
 'One vial of this oil can cover one Medium or smaller creature. Applying the oil takes 10 minutes. The affected creature then gains the effect of the Etherealness spell for 1 hour. Beads of this cloudy, gray oil form on the outside of its container and quickly evaporate.',
 '{}'::jsonb),

('Oil of Sharpness', 'Potion', 'Very Rare', false, null,
 'One vial of this oil can coat one Melee weapon or twenty pieces of ammunition that deal Slashing or Piercing damage. Applying the oil takes 1 minute. The oil seeps into whatever it coats, turning the coated weapon into a +3 Weapon or the coated ammunition into +3 Ammunition.',
 '{"bonus": 3}'::jsonb),

('Oil of Slipperiness', 'Potion', 'Uncommon', false, null,
 'One vial of this oil can cover one Medium or smaller creature. Applying the oil takes 10 minutes. The affected creature then gains the effect of the Freedom of Movement spell for 8 hours. Alternatively, the oil can be poured on the ground as a Magic action to cover a 10-foot square, duplicating the effect of the Grease spell for 8 hours.',
 '{}'::jsonb),

-- P
('Pearl of Power', 'Wondrous Item', 'Uncommon', true, 'by a Spellcaster',
 'While this pearl is on your person, you can take a Magic action to regain one expended spell slot of level 3 or lower. Once you use the pearl, it can''t be used again until the next dawn.',
 '{}'::jsonb),

('Periapt of Health', 'Wondrous Item', 'Uncommon', true, null,
 'While wearing this pendant, you can take a Magic action to regain 2d4 + 2 Hit Points. Once used, this property can''t be used again until the next dawn. In addition, you have Advantage on saving throws to avoid or end the Poisoned condition while you wear this pendant.',
 '{}'::jsonb),

('Periapt of Proof against Poison', 'Wondrous Item', 'Rare', true, null,
 'This delicate silver chain has a brilliant-cut black gem pendant. While you wear it, you have Immunity to the Poisoned condition and Poison damage.',
 '{}'::jsonb),

('Periapt of Wound Closure', 'Wondrous Item', 'Uncommon', true, null,
 'While wearing this pendant, you gain the following benefits. Life Preservation: Whenever you make a Death Saving Throw, you can change a roll of 9 or lower to a 10. Natural Healing Boost: Whenever you roll a Hit Point Die to regain Hit Points, double the number of Hit Points it restores.',
 '{}'::jsonb),

('Philter of Love', 'Potion', 'Uncommon', false, null,
 'The next time you see a creature within 10 minutes after drinking this philter, you are charmed by that creature and have the Charmed condition for 1 hour. This rose-hued, effervescent liquid contains one easy-to-miss bubble shaped like a heart.',
 '{}'::jsonb),

('Pipes of Haunting', 'Wondrous Item', 'Uncommon', false, null,
 'These pipes have 3 charges and regain 1d3 expended charges daily at dawn. You can take a Magic action to play them and expend 1 charge to create an eerie, spellbinding tune. Each creature of your choice within 30 feet of you must succeed on a DC 15 Wisdom saving throw or have the Frightened condition for 1 minute.',
 '{"charges": 3}'::jsonb),

('Pipes of the Sewers', 'Wondrous Item', 'Uncommon', true, null,
 'While these pipes are on your person, ordinary rats and giant rats are Indifferent toward you and won''t attack you unless you threaten or harm them. The pipes have 3 charges and regain 1d3 expended charges daily at dawn. If you play the pipes as a Magic action, you can take a Bonus Action to expend 1 to 3 charges, calling forth one Swarm of Rats with each expended charge.',
 '{"charges": 3}'::jsonb),

('Plate Armor of Etherealness', 'Armor', 'Legendary', true, null,
 'While you''re wearing this armor, you can take a Magic action and use a command word to gain the effect of the Etherealness spell. The spell ends immediately if you remove the armor or take a Magic action to repeat the command word. This property of the armor can''t be used again until the next dawn.',
 '{}'::jsonb),

('Portable Hole', 'Wondrous Item', 'Rare', false, null,
 'This fine black cloth, soft as silk, unfolds into a circular sheet 6 feet in diameter. You can take a Magic action to place it on or against a solid surface, creating an extradimensional hole 10 feet deep. You can take a Magic action to close a Portable Hole by folding it up. Any creatures or objects within remain in the extradimensional space.',
 '{}'::jsonb),

('Potion of Animal Friendship', 'Potion', 'Uncommon', false, null,
 'When you drink this potion, you can cast the level 3 version of the Animal Friendship spell (save DC 13). Agitating this potion''s muddy liquid brings little bits into view: a fish scale, a hummingbird feather, a cat claw, or a squirrel hair.',
 '{}'::jsonb),

('Potion of Clairvoyance', 'Potion', 'Rare', false, null,
 'When you drink this potion, you gain the effect of the Clairvoyance spell (no Concentration required). An eyeball bobs in this potion''s yellowish liquid but vanishes when the potion is opened.',
 '{}'::jsonb),

('Potion of Climbing', 'Potion', 'Common', false, null,
 'When you drink this potion, you gain a Climb Speed equal to your Speed for 1 hour. During this time, you have Advantage on Strength (Athletics) checks to climb. This potion is separated into brown, silver, and gray layers resembling bands of stone.',
 '{}'::jsonb),

('Potion of Diminution', 'Potion', 'Rare', false, null,
 'When you drink this potion, you gain the "reduce" effect of the Enlarge/Reduce spell for 1d4 hours (no Concentration required). The red in the potion''s liquid continuously contracts to a tiny bead and then expands to color the clear liquid around it.',
 '{}'::jsonb),

('Potion of Flying', 'Potion', 'Very Rare', false, null,
 'When you drink this potion, you gain a Fly Speed equal to your Speed for 1 hour and can hover. If you''re in the air when the potion wears off, you fall unless you have some other means of staying aloft. This potion''s clear liquid floats at the top of its container.',
 '{}'::jsonb),

('Potion of Gaseous Form', 'Potion', 'Rare', false, null,
 'When you drink this potion, you gain the effect of the Gaseous Form spell for 1 hour (no Concentration required) or until you end the effect as a Bonus Action. This potion''s container seems to hold fog that moves and pours like water.',
 '{}'::jsonb),

('Potion of Giant Strength', 'Potion', 'Varies', false, null,
 'When you drink this potion, your Strength score changes for 1 hour. The type of giant determines the score: Hill (21, Uncommon), Frost/Stone (23, Rare), Fire (25, Rare), Cloud (27, Very Rare), Storm (29, Legendary). The potion has no effect on you if your Strength is equal to or greater than that score.',
 '{"varies_by_type": true}'::jsonb),

('Potion of Growth', 'Potion', 'Uncommon', false, null,
 'When you drink this potion, you gain the "enlarge" effect of the Enlarge/Reduce spell for 10 minutes (no Concentration required). The red in the potion''s liquid continuously expands from a tiny bead to color the clear liquid around it and then contracts.',
 '{}'::jsonb),

('Potion of Healing', 'Potion', 'Common', false, null,
 'You regain 2d4 + 2 Hit Points when you drink this potion. The potion''s red liquid glimmers when agitated.',
 '{"healing": "2d4+2"}'::jsonb),

('Potion of Healing (greater)', 'Potion', 'Uncommon', false, null,
 'You regain 4d4 + 4 Hit Points when you drink this potion. The potion''s red liquid glimmers when agitated.',
 '{"healing": "4d4+4"}'::jsonb),

('Potion of Healing (superior)', 'Potion', 'Rare', false, null,
 'You regain 8d4 + 8 Hit Points when you drink this potion. The potion''s red liquid glimmers when agitated.',
 '{"healing": "8d4+8"}'::jsonb),

('Potion of Healing (supreme)', 'Potion', 'Very Rare', false, null,
 'You regain 10d4 + 20 Hit Points when you drink this potion. The potion''s red liquid glimmers when agitated.',
 '{"healing": "10d4+20"}'::jsonb),

('Potion of Heroism', 'Potion', 'Rare', false, null,
 'When you drink this potion, you gain 10 Temporary Hit Points that last for 1 hour. For the same duration, you are under the effect of the Bless spell (no Concentration required). This potion''s blue liquid bubbles and steams as if boiling.',
 '{}'::jsonb),

('Potion of Invisibility', 'Potion', 'Rare', false, null,
 'This potion''s container looks empty but feels as though it holds liquid. When you drink the potion, you have the Invisible condition for 1 hour. The effect ends early if you make an attack roll, deal damage, or cast a spell.',
 '{}'::jsonb),

('Potion of Invulnerability', 'Potion', 'Rare', false, null,
 'For 1 minute after you drink this potion, you have Resistance to all damage. This potion''s syrupy liquid looks like liquefied iron.',
 '{}'::jsonb),

('Potion of Longevity', 'Potion', 'Very Rare', false, null,
 'When you drink this potion, your physical age is reduced by 1d6 + 6 years, to a minimum of 13 years. Each time you subsequently drink a Potion of Longevity, there is 10 percent cumulative chance that you instead age by 1d6 + 6 years.',
 '{}'::jsonb),

('Potion of Mind Reading', 'Potion', 'Rare', false, null,
 'When you drink this potion, you gain the effect of the Detect Thoughts spell (save DC 13) for 10 minutes (no Concentration required). This potion''s dense, purple liquid has an ovoid cloud of pink floating in it.',
 '{}'::jsonb),

('Potion of Poison', 'Potion', 'Uncommon', false, null,
 'This concoction looks, smells, and tastes like a Potion of Healing or another beneficial potion. However, it is actually poison masked by illusion magic. If you drink this potion, you take 4d6 Poison damage and must succeed on a DC 13 Constitution saving throw or have the Poisoned condition for 1 hour.',
 '{"cursed": true}'::jsonb),

('Potion of Resistance', 'Potion', 'Uncommon', false, null,
 'When you drink this potion, you have Resistance to one type of damage for 1 hour. The GM chooses the type or determines it randomly.',
 '{}'::jsonb),

('Potion of Speed', 'Potion', 'Very Rare', false, null,
 'When you drink this potion, you gain the effect of the Haste spell for 1 minute (no Concentration required) without suffering the wave of lethargy that typically occurs when the effect ends. This potion''s yellow fluid is streaked with black and swirls on its own.',
 '{}'::jsonb),

('Potion of Vitality', 'Potion', 'Very Rare', false, null,
 'When you drink this potion, it removes any Exhaustion levels you have and ends the Poisoned condition on you. For the next 24 hours, you regain the maximum number of Hit Points for any Hit Point Die you spend.',
 '{}'::jsonb),

('Potion of Water Breathing', 'Potion', 'Uncommon', false, null,
 'You can breathe underwater for 24 hours after drinking this potion. This potion''s cloudy green fluid smells of the sea and has a jellyfish-like bubble floating in it.',
 '{}'::jsonb),

-- Q
('Quarterstaff of the Acrobat', 'Weapon', 'Very Rare', true, null,
 'You have a +2 bonus to attack rolls and damage rolls made with this magic weapon. While holding this weapon, you can cause it to emit green Dim Light, alter its form between a 6-inch rod, a 10-foot pole, and a Quarterstaff. In Quarterstaff form: you have Advantage on Dexterity (Acrobatics) checks, can take a Reaction to gain +5 to AC against an attack, and the weapon has the Thrown property.',
 '{"bonus": 2}'::jsonb),

-- R
('Ring of Animal Influence', 'Ring', 'Rare', false, null,
 'This ring has 3 charges, and it regains 1d3 expended charges daily at dawn. While wearing the ring, you can expend 1 charge to cast one of the following spells (save DC 13) from it: Animal Friendship, Fear (affects Beasts only), or Speak with Animals.',
 '{"charges": 3}'::jsonb),

('Ring of Djinni Summoning', 'Ring', 'Legendary', true, null,
 'While wearing this ring, you can take a Magic action to summon a particular Djinni from the Elemental Plane of Air. The djinni appears in an unoccupied space within 120 feet of yourself. It remains as long as you maintain Concentration, to a maximum of 1 hour, or until it drops to 0 Hit Points. The ring becomes nonmagical if the djinni dies.',
 '{}'::jsonb),

('Ring of Elemental Command', 'Ring', 'Legendary', true, null,
 'Each Ring of Elemental Command is linked to one of the four Elemental Planes. While wearing the ring, you have Advantage on attack rolls against Elementals and they have Disadvantage on attack rolls against you. You can also try to compel an Elemental (DC 18 Wisdom saving throw). Elemental Focus grants additional benefits based on the linked plane. The ring has 5 charges for casting plane-specific spells.',
 '{"charges": 5}'::jsonb),

('Ring of Evasion', 'Ring', 'Rare', true, null,
 'This ring has 3 charges, and it regains 1d3 expended charges daily at dawn. When you fail a Dexterity saving throw while wearing the ring, you can take a Reaction to expend 1 charge to succeed on that save instead.',
 '{"charges": 3}'::jsonb),

('Ring of Feather Falling', 'Ring', 'Rare', true, null,
 'When you fall while wearing this ring, you descend 60 feet per round and take no damage from falling.',
 '{}'::jsonb),

('Ring of Free Action', 'Ring', 'Rare', true, null,
 'While you wear this ring, Difficult Terrain doesn''t cost you extra movement. In addition, magic can neither reduce any of your Speeds nor cause you to have the Paralyzed or Restrained condition.',
 '{}'::jsonb),

('Ring of Invisibility', 'Ring', 'Legendary', true, null,
 'While wearing this ring, you can take a Magic action to give yourself the Invisible condition. You remain Invisible until the ring is removed or until you take a Bonus Action to become visible again.',
 '{}'::jsonb),

('Ring of Jumping', 'Ring', 'Uncommon', true, null,
 'While wearing this ring, you can cast Jump from it, but can target only yourself when you do so.',
 '{}'::jsonb),

('Ring of Mind Shielding', 'Ring', 'Uncommon', true, null,
 'While wearing this ring, you are immune to magic that allows other creatures to read your thoughts, determine whether you are lying, know your alignment, or know your creature type. If you die while wearing the ring, your soul enters it. You can remain in the ring or depart for the afterlife.',
 '{}'::jsonb),

('Ring of Protection', 'Ring', 'Rare', true, null,
 'You gain a +1 bonus to Armor Class and saving throws while wearing this ring.',
 '{"ac_bonus": 1, "save_bonus": 1}'::jsonb),

('Ring of Regeneration', 'Ring', 'Very Rare', true, null,
 'While wearing this ring, you regain 1d6 Hit Points every 10 minutes if you have at least 1 Hit Point. If you lose a body part, the ring causes the missing part to regrow and return to full functionality after 1d6 + 1 days if you have at least 1 Hit Point the whole time.',
 '{}'::jsonb),

('Ring of Resistance', 'Ring', 'Rare', false, null,
 'You have Resistance to one damage type while wearing this ring. The gemstone in the ring indicates the type: Pearl (Acid), Tourmaline (Cold), Garnet (Fire), Sapphire (Force), Citrine (Lightning), Jet (Necrotic), Amethyst (Poison), Jade (Psychic), Topaz (Radiant), Spinel (Thunder).',
 '{}'::jsonb),

('Ring of Shooting Stars', 'Ring', 'Very Rare', true, null,
 'You can cast Dancing Lights or Light from the ring. The ring has 6 charges and regains 1d6 expended charges daily at dawn. You can expend charges to use: Faerie Fire (1 charge), Lightning Spheres (2 charges, up to four 3-foot spheres), or Shooting Stars (1-3 charges to launch glowing motes dealing 5d4 Radiant damage in a 15-foot Cube).',
 '{"charges": 6}'::jsonb),

('Ring of Spell Storing', 'Ring', 'Rare', true, null,
 'This ring stores spells cast into it, holding them until the attuned wearer uses them. The ring can store up to 5 levels worth of spells at a time. Any creature can cast a spell of level 1 through 5 into the ring. While wearing this ring, you can cast any spell stored in it.',
 '{}'::jsonb),

('Ring of Spell Turning', 'Ring', 'Legendary', true, null,
 'While wearing this ring, you have Advantage on saving throws against spells. If you succeed on the save for a spell of level 7 or lower, the spell has no effect on you. If that spell targeted only you and didn''t create an area of effect, you can take a Reaction to deflect the spell back at the spell''s caster.',
 '{}'::jsonb),

('Ring of Swimming', 'Ring', 'Uncommon', false, null,
 'You have a Swim Speed of 40 feet while wearing this ring.',
 '{"swim_speed": 40}'::jsonb),

('Ring of Telekinesis', 'Ring', 'Very Rare', true, null,
 'While wearing this ring, you can cast Telekinesis from it.',
 '{}'::jsonb),

('Ring of the Ram', 'Ring', 'Rare', true, null,
 'This ring has 3 charges and regains 1d3 expended charges daily at dawn. While wearing the ring, you can take a Magic action to expend 1 to 3 charges to make a ranged spell attack against one creature within 60 feet. The ring produces a spectral ram''s head (+7 to hit). On a hit, for each charge you spend, the target takes 2d10 Force damage and is pushed 5 feet away.',
 '{"charges": 3}'::jsonb),

('Ring of Three Wishes', 'Ring', 'Legendary', false, null,
 'While wearing this ring, you can expend 1 of its 3 charges to cast Wish from it. The ring becomes nonmagical when you use the last charge.',
 '{"charges": 3}'::jsonb),

('Ring of Warmth', 'Ring', 'Uncommon', true, null,
 'If you take Cold damage while wearing this ring, the ring reduces the damage you take by 2d8. In addition, while wearing this ring, you and everything you wear and carry are unharmed by temperatures of 0 degrees Fahrenheit or lower.',
 '{}'::jsonb),

('Ring of Water Walking', 'Ring', 'Uncommon', false, null,
 'While wearing this ring, you cast Water Walk from it, targeting only yourself.',
 '{}'::jsonb),

('Ring of X-ray Vision', 'Ring', 'Rare', true, null,
 'While wearing this ring, you can take a Magic action to gain X-ray vision with a range of 30 feet for 1 minute. The vision can penetrate 1 foot of stone, 1 inch of common metal, or up to 3 feet of wood or dirt. Whenever you use the ring again before taking a Long Rest, you must succeed on a DC 15 Constitution saving throw or gain 1 Exhaustion level.',
 '{}'::jsonb),

('Robe of Eyes', 'Wondrous Item', 'Rare', true, null,
 'This robe is adorned with eyelike patterns. While you wear the robe, you gain All-Around Vision (Advantage on Perception checks relying on sight) and Special Senses (Darkvision and Truesight with a range of 120 feet). A Light spell or Daylight spell cast near the robe gives you the Blinded condition for 1 minute.',
 '{}'::jsonb),

('Robe of Scintillating Colors', 'Wondrous Item', 'Very Rare', true, null,
 'This robe has 3 charges, and it regains 1d3 expended charges daily at dawn. While you wear it, you can take a Magic action and expend 1 charge to cause the garment to display a shifting pattern of dazzling hues until the end of your next turn. During this time, the robe sheds Bright Light in a 30-foot radius, creatures have Disadvantage on attack rolls against you, and creatures in the Bright Light must succeed on a DC 15 Wisdom saving throw or have the Stunned condition.',
 '{"charges": 3}'::jsonb),

('Robe of Stars', 'Wondrous Item', 'Very Rare', true, null,
 'This black or dark-blue robe is embroidered with small white or silver stars. You gain a +1 bonus to saving throws while you wear it. Six large stars allow you to cast the level 5 version of Magic Missile (1d6 removed stars reappear at dusk). You can also take a Magic action to enter the Astral Plane while wearing the robe.',
 '{"save_bonus": 1}'::jsonb),

('Robe of the Archmagi', 'Wondrous Item', 'Legendary', true, 'by a Sorcerer, Warlock, or Wizard',
 'While wearing this robe, you gain: Armor (base AC 15 + Dexterity modifier if wearing no armor), Magic Resistance (Advantage on saving throws against spells and other magical effects), and War Mage (spell save DC and spell attack bonus each increase by 2).',
 '{}'::jsonb),

('Robe of Useful Items', 'Wondrous Item', 'Uncommon', false, null,
 'This robe has cloth patches of various shapes and colors covering it. While wearing the robe, you can take a Magic action to detach one of the patches, causing it to become the object or creature it represents. The robe has two of each of the following patches: Bullseye Lantern, Dagger, Mirror, Pole, Rope (coiled), and Sack, plus 4d4 other randomly determined patches.',
 '{}'::jsonb),

('Rod of Absorption', 'Rod', 'Very Rare', true, null,
 'While holding this rod, you can take a Reaction to absorb a spell that is targeting only you and doesn''t create an area of effect. The absorbed spell''s effect is canceled and its energy is stored in the rod (up to 50 levels total over its existence). If you are a spellcaster holding the rod, you can convert stored energy into spell slots.',
 '{}'::jsonb),

('Rod of Alertness', 'Rod', 'Very Rare', true, null,
 'While holding the rod, you have Advantage on Wisdom (Perception) checks and on Initiative rolls. You can cast Detect Evil and Good, Detect Magic, Detect Poison and Disease, and See Invisibility from it. You can also plant the rod in the ground to shed Bright Light in a 60-foot radius and grant a +1 bonus to AC and saving throws to allies in the light.',
 '{}'::jsonb),

('Rod of Lordly Might', 'Rod', 'Legendary', true, null,
 'This rod functions as a magic Mace that grants a +3 bonus to attack rolls and damage rolls. Six buttons allow it to transform: into a flaming Longsword or Shortsword (+2d6 Fire damage), a Battleaxe, a Spear, a climbing pole, a battering ram, or a compass. It also has Drain Life, Paralyze, and Terrify properties.',
 '{"bonus": 3}'::jsonb),

('Rod of Resurrection', 'Rod', 'Legendary', true, null,
 'The rod has 5 charges. While you hold it, you can cast Heal (1 charge) or Resurrection (5 charges) from it. The rod regains 1 expended charge daily at dawn. If you expend the last charge, roll 1d20. On a 1, the rod disappears in a harmless burst of radiance.',
 '{"charges": 5}'::jsonb),

('Rod of Rulership', 'Rod', 'Rare', true, null,
 'You can take a Magic action to present the rod and command obedience from each creature of your choice that you can see within 120 feet. Each target must succeed on a DC 15 Wisdom saving throw or have the Charmed condition for 8 hours. Once used, this property can''t be used again until the next dawn.',
 '{}'::jsonb),

('Rod of Security', 'Rod', 'Very Rare', false, null,
 'While holding this rod, you can take a Magic action to activate it. The rod then instantly transports you and up to 199 other willing creatures you can see to a demiplane of your design. The demiplane contains enough water and food to sustain its visitors. Visitors can remain there for up to 200 days divided by the number of creatures present.',
 '{}'::jsonb),

('Rope of Climbing', 'Wondrous Item', 'Uncommon', false, null,
 'This 60-foot length of rope can hold up to 3,000 pounds. While holding one end of the rope, you can take a Magic action to command the other end to animate and move toward a destination you choose. You can also tell the rope to fasten itself to an object, knot or unknot itself, or coil itself for carrying. The rope has AC 20, HP 20, and Immunity to Poison and Psychic damage.',
 '{}'::jsonb),

('Rope of Entanglement', 'Wondrous Item', 'Rare', false, null,
 'This rope is 30 feet long. While holding one end, you can take a Magic action to command the other end to dart forward and entangle one creature you can see within 20 feet. The target must succeed on a DC 15 Dexterity saving throw or have the Restrained condition. The rope has AC 20, HP 20, and Immunity to Poison and Psychic damage.',
 '{}'::jsonb),

-- S
('Scarab of Protection', 'Wondrous Item', 'Legendary', true, null,
 'This beetle-shaped medallion provides three benefits: Defense (+1 bonus to Armor Class), Preservation (12 charges; if you fail a saving throw against a Necromancy spell or harmful effect from an Undead, you can expend 1 charge to turn the failed save into a successful one), and Spell Resistance (Advantage on saving throws against spells).',
 '{"charges": 12, "ac_bonus": 1}'::jsonb),

('Scimitar of Speed', 'Weapon', 'Very Rare', true, null,
 'You gain a +2 bonus to attack rolls and damage rolls made with this magic weapon. In addition, you can make one attack with it as a Bonus Action on each of your turns.',
 '{"bonus": 2}'::jsonb),

('Sending Stones', 'Wondrous Item', 'Uncommon', false, null,
 'Sending Stones come in pairs, with each stone carved to match the other. While you touch one stone, you can cast Sending from it. The target is the bearer of the other stone. Once Sending is cast using either stone, the stones can''t be used again until the next dawn.',
 '{}'::jsonb),

('Sentinel Shield', 'Armor', 'Uncommon', false, null,
 'While holding this Shield, you have Advantage on Initiative rolls and Wisdom (Perception) checks. The Shield is emblazoned with a symbol of an eye.',
 '{}'::jsonb),

('Shield, +1', 'Armor', 'Uncommon', false, null,
 'While holding this Shield, you have a +1 bonus to Armor Class in addition to the Shield''s normal bonus to AC.',
 '{"bonus": 1}'::jsonb),

('Shield, +2', 'Armor', 'Rare', false, null,
 'While holding this Shield, you have a +2 bonus to Armor Class in addition to the Shield''s normal bonus to AC.',
 '{"bonus": 2}'::jsonb),

('Shield, +3', 'Armor', 'Very Rare', false, null,
 'While holding this Shield, you have a +3 bonus to Armor Class in addition to the Shield''s normal bonus to AC.',
 '{"bonus": 3}'::jsonb),

('Shield of Missile Attraction', 'Armor', 'Rare', true, null,
 'While holding this Shield, you have Resistance to damage from attacks made with Ranged weapons. Curse. Attuning to it curses you until you are targeted by a Remove Curse spell. Whenever an attack with a Ranged weapon targets a creature within 10 feet of you, the curse causes you to become the target instead.',
 '{"cursed": true}'::jsonb),

('Shield of the Cavalier', 'Armor', 'Very Rare', true, null,
 'While holding this Shield, you have a +2 bonus to Armor Class in addition to the Shield''s normal bonus to AC. Forceful Bash: When you take the Attack action, you can make one attack with the Shield dealing 2d6 + 2 + Strength modifier Force damage. Protective Field: As a Reaction, you can create an immobile 5-foot Emanation that protects creatures inside it for up to 1 minute.',
 '{"ac_bonus": 2}'::jsonb),

('Slippers of Spider Climbing', 'Wondrous Item', 'Uncommon', true, null,
 'While you wear these light shoes, you can move up, down, and across vertical surfaces and along ceilings, while leaving your hands free. You have a Climb Speed equal to your Speed. However, the slippers don''t allow you to move this way on a slippery surface, such as one covered by ice or oil.',
 '{}'::jsonb),

('Sovereign Glue', 'Wondrous Item', 'Legendary', false, null,
 'This viscous, milky-white substance can form a permanent adhesive bond between any two objects. One ounce of the glue can cover a 1-foot square surface. Once the glue sets after 1 minute, the bond it creates can be broken only by the application of Universal Solvent or Oil of Etherealness, or with a Wish spell.',
 '{}'::jsonb),

('Spell Scroll', 'Scroll', 'Varies', false, null,
 'A Spell Scroll bears the words of a single spell. If the spell is on your spell list, you can read the scroll and cast its spell without Material components. Cantrip/Level 1 (Common), Level 2-3 (Uncommon), Level 4-5 (Rare), Level 6-8 (Very Rare), Level 9 (Legendary). Once the spell is cast, the scroll crumbles to dust.',
 '{"varies_by_type": true}'::jsonb),

('Spellguard Shield', 'Armor', 'Very Rare', true, null,
 'While holding this Shield, you have Advantage on saving throws against spells and other magical effects, and spell attack rolls have Disadvantage against you.',
 '{}'::jsonb),

('Sphere of Annihilation', 'Wondrous Item', 'Legendary', false, null,
 'This 2-foot-diameter black sphere is a hole in the multiverse, hovering in space and stabilized by a magical field surrounding it. The sphere obliterates all matter it passes through and all matter that passes through it. Artifacts are the exception. If you are within 60 feet of a sphere, you can take a Magic action to make a DC 25 Intelligence (Arcana) check to control it.',
 '{}'::jsonb),

('Staff of Charming', 'Staff', 'Rare', true, 'by a Bard, Cleric, Druid, Sorcerer, Warlock, or Wizard',
 'This staff has 10 charges. While holding the staff, you can use its properties: cast Charm Person, Command, or Comprehend Languages (1 charge each); if you succeed on a saving throw against an Enchantment spell, you can Reflect Enchantment (1 charge); if you fail, you can Resist Enchantment (once per dawn). The staff regains 1d8 + 2 expended charges daily at dawn.',
 '{"charges": 10}'::jsonb),

('Staff of Fire', 'Staff', 'Very Rare', true, 'by a Druid, Sorcerer, Warlock, or Wizard',
 'You have Resistance to Fire damage while you hold this staff. The staff has 10 charges for casting Burning Hands (1 charge), Fireball (3 charges), or Wall of Fire (4 charges). The staff regains 1d6 + 4 expended charges daily at dawn.',
 '{"charges": 10}'::jsonb),

('Staff of Frost', 'Staff', 'Very Rare', true, 'by a Druid, Sorcerer, Warlock, or Wizard',
 'You have Resistance to Cold damage while you hold this staff. The staff has 10 charges for casting Fog Cloud (1 charge), Ice Storm (4 charges), Cone of Cold (5 charges), or Wall of Ice (4 charges). The staff regains 1d6 + 4 expended charges daily at dawn.',
 '{"charges": 10}'::jsonb),

('Staff of Healing', 'Staff', 'Rare', true, 'by a Bard, Cleric, or Druid',
 'This staff has 10 charges for casting Cure Wounds (1 charge per spell level, max 4), Lesser Restoration (2 charges), or Mass Cure Wounds (5 charges). The staff regains 1d6 + 4 expended charges daily at dawn.',
 '{"charges": 10}'::jsonb),

('Staff of Power', 'Staff', 'Very Rare', true, 'by a Sorcerer, Warlock, or Wizard',
 'This staff has 20 charges and can be wielded as a magic Quarterstaff that grants a +2 bonus to attack rolls and damage rolls. While holding it, you gain a +2 bonus to Armor Class, saving throws, and spell attack rolls. You can cast various spells from it. The staff can also be broken in a Retributive Strike.',
 '{"bonus": 2, "charges": 20}'::jsonb),

('Staff of Striking', 'Staff', 'Very Rare', true, null,
 'This staff can be wielded as a magic Quarterstaff that grants a +3 bonus to attack rolls and damage rolls. The staff has 10 charges. When you hit with a melee attack using it, you can expend up to 3 charges. For each charge you expend, the target takes an extra 1d6 Force damage.',
 '{"bonus": 3, "charges": 10}'::jsonb),

('Staff of Swarming Insects', 'Staff', 'Rare', true, 'by a Bard, Cleric, Druid, Sorcerer, Warlock, or Wizard',
 'This staff has 10 charges. Insect Cloud: While holding the staff, you can expend 1 charge to cause a swarm of harmless flying insects to fill a 30-foot Emanation for 10 minutes. You can also cast Giant Insect (4 charges) or Insect Plague (5 charges). The staff regains 1d6 + 4 expended charges daily at dawn.',
 '{"charges": 10}'::jsonb),

('Staff of the Magi', 'Staff', 'Legendary', true, 'by a Sorcerer, Warlock, or Wizard',
 'This staff has 50 charges and can be wielded as a magic Quarterstaff that grants a +2 bonus to attack rolls and damage rolls. While holding it, you have Advantage on saving throws against spells and can absorb spells that target only you (gaining charges equal to the spell''s level). You can cast a wide variety of spells from it. The staff can also be used in a Retributive Strike.',
 '{"bonus": 2, "charges": 50}'::jsonb),

('Staff of the Python', 'Staff', 'Uncommon', true, null,
 'As a Magic action, you can throw this staff so that it lands in an unoccupied space within 10 feet of you, causing the staff to become a Giant Constrictor Snake in that space under your control. As a Bonus Action, you can command the snake to revert to staff form; you can''t use the staff''s property again for 1 hour. If the snake is reduced to 0 Hit Points, the staff is destroyed.',
 '{}'::jsonb),

('Staff of the Woodlands', 'Staff', 'Rare', true, 'by a Druid',
 'This staff has 6 charges and can be wielded as a magic Quarterstaff that grants a +2 bonus to attack rolls and damage rolls. While holding it, you have a +2 bonus to spell attack rolls. You can cast spells from it (Animal Friendship, Awaken, Barkskin, Locate Animals or Plants, Pass without Trace, Speak with Animals, Speak with Plants, Wall of Thorns) and transform it into a tree.',
 '{"bonus": 2, "charges": 6}'::jsonb),

('Staff of Thunder and Lightning', 'Staff', 'Very Rare', true, null,
 'This staff can be wielded as a magic Quarterstaff that grants a +2 bonus to attack rolls and damage rolls. It also has additional properties (each usable once per dawn): Lightning (extra 2d6 Lightning damage on hit), Thunder (target makes DC 17 Constitution save or Stunned), Thunder and Lightning (combined use), Lightning Strike (120-foot Line dealing 9d6 Lightning), and Thunderclap (60-foot Emanation dealing 2d6 Thunder, DC 17).',
 '{"bonus": 2}'::jsonb),

('Staff of Withering', 'Staff', 'Rare', true, null,
 'This staff has 3 charges and regains 1d3 expended charges daily at dawn. The staff can be wielded as a magic Quarterstaff. On a hit, you can expend 1 charge to deal an extra 2d10 Necrotic damage and force the target to make a DC 15 Constitution saving throw. On a failed save, the target has Disadvantage for 1 hour on any ability check or saving throw that uses Strength or Constitution.',
 '{"charges": 3}'::jsonb),

('Stone of Controlling Earth Elementals', 'Wondrous Item', 'Rare', false, null,
 'While touching this 5-pound stone to the ground, you can take a Magic action to summon an Earth Elemental. The elemental obeys your commands and takes its turn immediately after you on your Initiative count. The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action. The stone can''t be used this way again until the next dawn.',
 '{}'::jsonb),

('Stone of Good Luck', 'Wondrous Item', 'Uncommon', true, null,
 'While this polished agate is on your person, you gain a +1 bonus to ability checks and saving throws.',
 '{"ability_check_bonus": 1, "save_bonus": 1}'::jsonb),

('Sun Blade', 'Weapon', 'Rare', true, null,
 'This item appears to be a sword hilt. While grasping the hilt, you can take a Bonus Action to cause a blade of pure radiance to spring into existence. This magic weapon functions as a Longsword with the Finesse property. You gain a +2 bonus to attack rolls and damage rolls, which deals Radiant damage. When you hit an Undead with it, that target takes an extra 1d8 Radiant damage. The blade emits Bright Light in a 15-foot radius.',
 '{"bonus": 2}'::jsonb),

('Sword of Life Stealing', 'Weapon', 'Rare', true, null,
 'When you attack a creature with this magic weapon and roll a 20 on the d20 for the attack roll, that target takes an extra 15 Necrotic damage if it isn''t a Construct or an Undead, and you gain Temporary Hit Points equal to the amount of Necrotic damage taken.',
 '{}'::jsonb),

('Sword of Sharpness', 'Weapon', 'Very Rare', true, null,
 'When you attack an object with this magic weapon and hit, maximize your weapon damage dice against the target. When you attack a creature with this weapon and roll a 20 on the d20 for the attack roll, that target takes an extra 14 Slashing damage and gains 1 Exhaustion level.',
 '{}'::jsonb),

('Sword of Wounding', 'Weapon', 'Rare', true, null,
 'When you hit a creature with an attack using this magic weapon, the target takes an extra 2d6 Necrotic damage and must succeed on a DC 15 Constitution saving throw or be unable to regain Hit Points for 1 hour. The target repeats the save at the end of each of its turns, ending the effect on itself on a success.',
 '{"extra_damage": "2d6 necrotic"}'::jsonb),

-- T
('Talisman of Pure Good', 'Wondrous Item', 'Legendary', true, 'by a Cleric or Paladin',
 'This item symbolizes pure goodness. A Fiend or an Undead that touches the talisman takes 8d6 Radiant damage. You can use the talisman as a Holy Symbol gaining a +2 bonus to spell attack rolls. The talisman has 7 charges; you can expend 1 charge to target a creature on the ground within 120 feet, opening a flaming fissure (DC 20 Dexterity save or destroyed).',
 '{"charges": 7}'::jsonb),

('Talisman of the Sphere', 'Wondrous Item', 'Legendary', true, null,
 'While holding or wearing this talisman, you have Advantage on any Intelligence (Arcana) check you make to control a Sphere of Annihilation. In addition, when you start your turn in control of a Sphere of Annihilation, you can take a Magic action to move it 10 feet plus 10 times your Intelligence modifier.',
 '{}'::jsonb),

('Talisman of Ultimate Evil', 'Wondrous Item', 'Legendary', true, null,
 'This item symbolizes unrepentant evil. A creature that isn''t a Fiend or an Undead that touches the talisman takes 8d6 Necrotic damage. You can use the talisman as a Holy Symbol gaining a +2 bonus to spell attack rolls. The talisman has 6 charges; you can expend 1 charge to target a creature on the ground within 120 feet, opening a flaming fissure (DC 20 Dexterity save or destroyed).',
 '{"charges": 6}'::jsonb),

('Thunderous Greatclub', 'Weapon', 'Very Rare', true, null,
 'While you are attuned to this magic weapon, your Strength is 20 unless your Strength is already equal to or greater than that score. The weapon deals an extra 1d8 Thunder damage to any creature it hits. Clap of Thunder (Magic action): creates a 30-foot Cone dealing Thunder damage (DC 15 Strength save). Earthquake (Magic action): 50-foot-radius circle affecting structures and creatures (DC 20 Dexterity save).',
 '{"strength": 20}'::jsonb),

('Tome of Clear Thought', 'Wondrous Item', 'Very Rare', false, null,
 'This book contains memory and logic exercises, and its words are charged with magic. If you spend 48 hours over a period of 6 days or fewer studying the book''s contents and practicing its guidelines, your Intelligence increases by 2, to a maximum of 30. The manual then loses its magic but regains it in a century.',
 '{"stat_increase": "Intelligence +2"}'::jsonb),

('Tome of Leadership and Influence', 'Wondrous Item', 'Very Rare', false, null,
 'This book contains guidelines for influencing and charming others, and its words are charged with magic. If you spend 48 hours over a period of 6 days or fewer studying the book''s contents and practicing its guidelines, your Charisma increases by 2, to a maximum of 30. The manual then loses its magic but regains it in a century.',
 '{"stat_increase": "Charisma +2"}'::jsonb),

('Tome of Understanding', 'Wondrous Item', 'Very Rare', false, null,
 'This book contains intuition and insight exercises, and its words are charged with magic. If you spend 48 hours over a period of 6 days or fewer studying the book''s contents and practicing its guidelines, your Wisdom increases by 2, to a maximum of 30. The manual then loses its magic, but regains it in a century.',
 '{"stat_increase": "Wisdom +2"}'::jsonb),

('Trident of Fish Command', 'Weapon', 'Uncommon', true, null,
 'This magic weapon has 3 charges, and it regains 1d3 expended charges daily at dawn. While you carry it, you can expend 1 charge to cast Dominate Beast (save DC 15) from it on a Beast that has a Swim Speed.',
 '{"charges": 3}'::jsonb),

-- U
('Universal Solvent', 'Wondrous Item', 'Legendary', false, null,
 'This tube holds milky liquid with a strong alcohol smell. When found, a tube contains 1d6 + 1 ounces. You can take a Utilize action to pour 1 or more ounces of solvent from the tube onto a surface within reach. Each ounce instantly dissolves up to 1 square foot of adhesive it touches, including Sovereign Glue.',
 '{}'::jsonb),

-- V
('Vicious Weapon', 'Weapon', 'Rare', false, null,
 'This magic weapon deals an extra 2d6 damage to any creature it hits. This extra damage is of the same type as the weapon''s normal damage.',
 '{"extra_damage": "2d6"}'::jsonb),

('Vorpal Sword', 'Weapon', 'Legendary', true, null,
 'You gain a +3 bonus to attack rolls and damage rolls made with this magic weapon. In addition, the weapon ignores Resistance to Slashing damage. When you use this weapon to attack a creature that has at least one head and roll a 20 on the d20 for the attack roll, you cut off one of the creature''s heads. The creature dies if it can''t survive without the lost head.',
 '{"bonus": 3}'::jsonb),

-- W
('Wand of Binding', 'Wand', 'Rare', true, null,
 'This wand has 7 charges. While holding the wand, you can cast Hold Monster (5 charges) or Hold Person (2 charges) (save DC 17). The wand regains 1d6 + 1 expended charges daily at dawn.',
 '{"charges": 7}'::jsonb),

('Wand of Enemy Detection', 'Wand', 'Rare', true, null,
 'This wand has 7 charges. While holding it, you can take a Magic action to expend 1 charge. For 1 minute, you know the direction of the nearest creature Hostile to you within 60 feet, but not its distance. The wand regains 1d6 + 1 expended charges daily at dawn.',
 '{"charges": 7}'::jsonb),

('Wand of Fear', 'Wand', 'Rare', true, null,
 'This wand has 7 charges. While holding the wand, you can cast Command ("flee" or "grovel" only, 1 charge) or Fear in a 60-foot Cone (3 charges) (save DC 15). The wand regains 1d6 + 1 expended charges daily at dawn.',
 '{"charges": 7}'::jsonb),

('Wand of Fireballs', 'Wand', 'Rare', true, 'by a Spellcaster',
 'This wand has 7 charges. While holding it, you can expend no more than 3 charges to cast Fireball (save DC 15) from it. For 1 charge, you cast the level 3 version of the spell. You can increase the spell''s level by 1 for each additional charge you expend. The wand regains 1d6 + 1 expended charges daily at dawn.',
 '{"charges": 7}'::jsonb),

('Wand of Lightning Bolts', 'Wand', 'Rare', true, 'by a Spellcaster',
 'This wand has 7 charges. While holding it, you can expend no more than 3 charges to cast Lightning Bolt (save DC 15) from it. For 1 charge, you cast the level 3 version of the spell. You can increase the spell''s level by 1 for each additional charge you expend. The wand regains 1d6 + 1 expended charges daily at dawn.',
 '{"charges": 7}'::jsonb),

('Wand of Magic Detection', 'Wand', 'Uncommon', false, null,
 'This wand has 3 charges. While holding it, you can expend 1 charge to cast Detect Magic from it. The wand regains 1d3 expended charges daily at dawn.',
 '{"charges": 3}'::jsonb),

('Wand of Magic Missiles', 'Wand', 'Uncommon', false, null,
 'This wand has 7 charges. While holding it, you can expend no more than 3 charges to cast Magic Missile from it. For 1 charge, you cast the level 1 version of the spell. You can increase the spell''s level by 1 for each additional charge you expend. The wand regains 1d6 + 1 expended charges daily at dawn.',
 '{"charges": 7}'::jsonb),

('Wand of Paralysis', 'Wand', 'Rare', true, 'by a Spellcaster',
 'This wand has 7 charges. While holding it, you can take a Magic action to expend 1 charge to cause a thin blue ray to streak toward a creature you can see within 60 feet. The target must succeed on a DC 15 Constitution saving throw or have the Paralyzed condition for 1 minute. The wand regains 1d6 + 1 expended charges daily at dawn.',
 '{"charges": 7}'::jsonb),

('Wand of Polymorph', 'Wand', 'Very Rare', true, 'by a Spellcaster',
 'This wand has 7 charges. While holding it, you can expend 1 charge to cast Polymorph (save DC 15) from it. The wand regains 1d6 + 1 expended charges daily at dawn.',
 '{"charges": 7}'::jsonb),

('Wand of Secrets', 'Wand', 'Uncommon', false, null,
 'This wand has 3 charges and regains 1d3 expended charges daily at dawn. While holding it, you can take a Magic action to expend 1 charge, and if a secret door or trap is within 60 feet of you, the wand pulses and points at the one nearest to you.',
 '{"charges": 3}'::jsonb),

('Wand of the War Mage, +1', 'Wand', 'Uncommon', true, 'by a Spellcaster',
 'While holding this wand, you gain a +1 bonus to spell attack rolls determined by the wand''s rarity. In addition, you ignore Half Cover when making a spell attack roll.',
 '{"bonus": 1}'::jsonb),

('Wand of the War Mage, +2', 'Wand', 'Rare', true, 'by a Spellcaster',
 'While holding this wand, you gain a +2 bonus to spell attack rolls. In addition, you ignore Half Cover when making a spell attack roll.',
 '{"bonus": 2}'::jsonb),

('Wand of the War Mage, +3', 'Wand', 'Very Rare', true, 'by a Spellcaster',
 'While holding this wand, you gain a +3 bonus to spell attack rolls. In addition, you ignore Half Cover when making a spell attack roll.',
 '{"bonus": 3}'::jsonb),

('Wand of Web', 'Wand', 'Uncommon', true, 'by a Spellcaster',
 'This wand has 7 charges. While holding it, you can expend 1 charge to cast Web (save DC 13) from it. The wand regains 1d6 + 1 expended charges daily at dawn.',
 '{"charges": 7}'::jsonb),

('Wand of Wonder', 'Wand', 'Rare', true, null,
 'This wand has 7 charges. While holding it, you can take a Magic action to expend 1 charge while choosing a point within 120 feet of yourself. That location becomes the point of origin of a spell or other magical effect determined by rolling on the Wand of Wonder Effects table (1d100). Spells cast from the wand have a save DC of 15. The wand regains 1d6 + 1 expended charges daily at dawn.',
 '{"charges": 7}'::jsonb),

('Weapon, +1', 'Weapon', 'Uncommon', false, null,
 'You have a +1 bonus to attack rolls and damage rolls made with this magic weapon.',
 '{"bonus": 1}'::jsonb),

('Weapon, +2', 'Weapon', 'Rare', false, null,
 'You have a +2 bonus to attack rolls and damage rolls made with this magic weapon.',
 '{"bonus": 2}'::jsonb),

('Weapon, +3', 'Weapon', 'Very Rare', false, null,
 'You have a +3 bonus to attack rolls and damage rolls made with this magic weapon.',
 '{"bonus": 3}'::jsonb),

('Weapon of Warning', 'Weapon', 'Uncommon', true, null,
 'As long as this weapon is within your reach and you are attuned to it, you and allies within 30 feet of you gain: Alarm (the weapon magically awakens sleeping subjects when combat begins) and Supernatural Readiness (each subject has Advantage on Initiative rolls).',
 '{}'::jsonb),

('Well of Many Worlds', 'Wondrous Item', 'Legendary', false, null,
 'This fine black cloth, soft as silk, unfolds into a circular sheet 6 feet in diameter. You can take a Magic action to unfold the Well of Many Worlds and place it on a solid surface, whereupon it forms a two-way, 6-foot-diameter, circular portal to another world or plane of existence. The portal remains open until a creature within 5 feet of it takes a Magic action to close it. Once opened, it can''t open again for 1d8 hours.',
 '{}'::jsonb),

('Wind Fan', 'Wondrous Item', 'Uncommon', false, null,
 'While holding this fan, you can cast Gust of Wind (save DC 13) from it. Each subsequent time the fan is used before the next dawn, it has a cumulative 20 percent chance of not working; if the fan fails to work, it tears into useless, nonmagical tatters.',
 '{}'::jsonb),

('Winged Boots', 'Wondrous Item', 'Uncommon', true, null,
 'These boots have 4 charges and regain 1d4 expended charges daily at dawn. While wearing the boots, you can take a Magic action to expend 1 charge, gaining a Fly Speed of 30 feet for 1 hour. If you are flying when the duration expires, you descend at a rate of 30 feet per round until you land.',
 '{"charges": 4, "fly_speed": 30}'::jsonb),

('Wings of Flying', 'Wondrous Item', 'Rare', true, null,
 'While wearing this cloak, you can take a Magic action to turn the cloak into a pair of wings on your back. The wings last for 1 hour or until you end the effect early as a Magic action. The wings give you a Fly Speed of 60 feet. If you are aloft when the wings disappear, you fall. When the wings disappear, you can''t use them again for 1d12 hours.',
 '{"fly_speed": 60}'::jsonb)

ON CONFLICT (name) DO UPDATE SET
  item_type = EXCLUDED.item_type,
  rarity = EXCLUDED.rarity,
  requires_attunement = EXCLUDED.requires_attunement,
  attunement_condition = EXCLUDED.attunement_condition,
  description = EXCLUDED.description,
  properties = EXCLUDED.properties;

COMMIT;

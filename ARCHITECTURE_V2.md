# Chronicle Defence — Architecture V2

Chronicle Defence is split into six independent systems. Each system owns its own rules/state and communicates through explicit campaign/battle contracts.

## 1. Tactical TD Battle Engine
Responsibilities:
- Battlefield maps, paths, terrain and objectives.
- Placement, targeting, projectiles, damage, waves, base health and battle scoring.
- Region-specific battle modifiers from campaign state.
- Returns structured battle results to the campaign: victory/defeat, breaches, losses, spending, damage, captured objectives.

The battle engine does **not** decide global research, empire economy or army composition. It receives an army roster and battle budget from the campaign.

## 2. World Map & Territory Management
Responsibilities:
- Real-world region graph and ownership.
- Capitals, borders, fronts, ports and supply connections.
- Strategic turns and movement between territories.
- Conquest, occupation, rebellions and defensive missions.
- Victory objectives tied to territory and time.

## 3. Army, Recruitment & Deployment
Responsibilities:
- Persistent armies/commanders on the campaign map.
- Recruitment pools, unit capacity, upkeep and replenishment.
- Moving armies between regions.
- Army composition determines which battlefield defences/units are available in a TD mission.
- Era service windows and obsolescence.

Example: researching Crossbow unlocks Crossbowmen in the Medieval era, but a Modern army cannot deploy Crossbow Positions in a normal battle. Old units may be retired, upgraded or retained only as special/legacy garrisons where historically appropriate.

Before entering battle the player receives a deployment screen:
1. Choose participating army/commander.
2. Choose units to commit within deployment capacity.
3. Choose reserves/support.
4. Enter TD battle with only that roster available.

## 4. Economy & Regional Development
Responsibilities:
- Treasury, Food/Supply, Production, Knowledge, Manpower.
- Regional output, trade, hostile/friendly border effects, war upkeep and supply.
- Investment into regions.

Investment is user-controlled, not a fixed `Invest 100` action.

Player chooses:
- Investment category: Infrastructure, Fortifications, Industry, Agriculture, Trade, Education, Stability/Reconstruction.
- Amount: any affordable amount, e.g. 100, 500, 2,000, 10,000+.

Large investments use diminishing returns and project duration. Spending 10,000 is allowed and materially stronger than 100, but is not 100x as effective instantly. Large projects can take multiple strategic turns and may be disrupted by war.

## 5. Civilization Systems
Responsibilities:
- Research/tech tree and campaign eras.
- Diplomacy, alliances, trade agreements and espionage.
- Policies, administration, objectives and victory conditions.
- Faction-specific traits and unique units.

Era progression belongs to the campaign. Each era contains substantial internal progression rather than being a short bridge to the next era.

## 6. Presentation, Assets & App Shell
Responsibilities:
- iPhone-landscape-first home screen and campaign shell.
- World-map presentation.
- Sprite/animation renderer for units, weapons and environments.
- Menus, drawers, icons, transitions, feedback and audio.
- Save slots/autosave and app lifecycle handling.

This layer must stay separate from rules so the placeholder Canvas graphics can be replaced by production-quality art without rewriting the simulation.

### Graphics target
The next renderer should move away from primitive rectangles/circles toward a coherent 2D/isometric sprite system:
- era-specific terrain sets;
- regional landmarks and coastlines;
- animated formations and crews;
- recognizable weapons and silhouettes;
- muzzle flashes, recoil, smoke, explosions and impact effects;
- illustrated arsenal cards/icons;
- faction heraldry and campaign-map assets;
- scalable iPhone-first interface elements.

## Contracts between systems

### Campaign → Battle
- region/map id
- mission type
- attacker/defender
- army roster
- deployment capacity
- starting battle resources
- supply modifier
- fortification modifier
- commander/faction bonuses
- researched battlefield technologies

### Battle → Campaign
- result
- base/civilian health
- breaches
- casualties
- ammunition/resources spent
- infrastructure damage
- objective performance
- experience gained

This architecture becomes the master implementation direction.
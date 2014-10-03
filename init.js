Game = {};
/*
Changes in this version:
  Update: Drops now land directly in the player's inventory if it is not full.
  Update: The value of Str/Dex/Int varies based on weapon speed (slower weapons do more)
  Fix: Inventories cap at 10 slots (down from 20)
  Fix: Powers that boost a weapon type's damage now work as intended.
  Backend: Reorganisation of functions into multiple files.
TODO:
  Help Tab
  Appearance change for combat log
   - Including health bar visual outputs
  Revisions to the following mechanics:
   - Player powers
   - Debuffs
  Idle system
*/
Game.init = function() {
	//Define some constants we can use later
  this.GAME_VERSION = 0.22; // Used to purge older saves between major version changes
	this.XP_MULT = 1.1;
	this.XP_RANGEMIN = 2.3;
	this.XP_RANGEMAX = 3.0;
	this.XP_BASE = 30;
	this.XP_INIT = 100;
  this.WEAPON_BASE_MULT = 0.6;
	//Player states
	this.STATE_IDLE = 0;
	this.STATE_REPAIR = 1;
	this.STATE_COMBAT = 2;
	//Available boosts
	this.BOOST_REPAIR = 101; // High Maintenance
	this.BOOST_ASPD = 102; // Nimble Fingers
	this.BOOST_HEAL = 103; // Survival Instincts
	this.BOOST_WSPEC = 104; // Keen Eye
	this.BOOST_SKILLPT = 105; // Fortuitous Growth
	this.BOOST_XP = 106; // Fast Learner
	this.BOOST_MELEEDMG = 107; // Brutal Strikes
	this.BOOST_RANGEDMG = 108; // Sniper Training
	this.BOOST_MAGICDMG = 109; // Unleashed Elements
	this.BOOST_MELEEDEF = 110; // Stoneskin
	this.BOOST_RANGEDEF = 111; // Iron Carapace
	this.BOOST_MAGICDEF = 112; // Aetheric Resilience
	this.BOOST_DOUBLE = 113; // Flurry
	this.BOOST_SHIELD = 114; // Divine Shield
	this.BOOST_CONSERVE = 115; // Proper Care
  this.BOOST_CURRENCY = 116; // Pickpocket
	//Weapon Types
	this.WEAPON_MELEE = 201;
	this.WEAPON_RANGE = 202;
	this.WEAPON_MAGIC = 203;
	//Weapon Speeds
	this.WSPEED_SLOW = 211;
	this.WSPEED_MID = 212;
	this.WSPEED_FAST = 213;
  // Armour strengths
  this.ARMOUR_STR_MELEE = 231;
  this.ARMOUR_STR_RANGE = 232;
  this.ARMOUR_STR_MAGIC = 233;
  // Armour vulnerabilities
  this.ARMOUR_VULN_MELEE = 234;
  this.ARMOUR_VULN_RANGE = 235;
  this.ARMOUR_VULN_MAGIC = 236;
  // Debuff types
  this.DEBUFF_SHRED = 241;
  this.DEBUFF_MULTI = 242;
  this.DEBUFF_DRAIN = 243;
  this.DEBUFF_SLOW = 244;
  this.DEBUFF_MC = 245;
  this.DEBUFF_DOT = 246;
  this.DEBUFF_PARAHAX = 247;
  this.DEBUFF_DOOM = 248;
	// Item Quality
	this.QUALITY_POOR = 221;
	this.QUALITY_NORMAL = 222;
	this.QUALITY_GOOD = 223;
	this.QUALITY_GREAT = 224;
	this.QUALITY_AMAZING = 225;
	// Point assignment stats
	this.STAT_STR = 301;
	this.STAT_DEX = 302;
	this.STAT_INT = 303;
	this.STAT_CON = 304;
	// Player variables
  this.MAX_INVENTORY = 10;
	this.p_HP = 0; this.p_MaxHP = 0;
	this.p_Str = 0; this.p_Dex = 0;
	this.p_Int = 0; this.p_Con = 0;
	this.p_EXP = 0; this.p_NextEXP = 0;
	this.p_SkillPoints = 0;
	this.p_Level = 0; this.p_PP = 0; // Power points.
	this.p_Powers = []; // Selected powers.
	this.p_Weapon = []; // Player weapon.
  this.p_Armour = []; // Player armour
	this.p_State = Game.STATE_IDLE; // Player states
	this.p_specUsed = false;
	this.p_autoSaved = true;
	this.p_RepairInterval = null;
  this.p_RepairValue = 0;
  this.p_Currency = 0;
  this.p_Scrap = 0;
	this.p_IdleInterval = null;
	this.combat_enemyInterval = null;
  this.combat_playerInterval = null;
  this.toastTimer = null;
	// Enemy variables
	this.e_HP = 0; this.e_MaxHP = 0;
	this.e_Str = 0; this.e_Dex = 0;
	this.e_Int = 0; this.e_Level = 0;
	this.e_isBoss = false;
	this.e_Weapon = []; // Enemy weapon
  this.e_Armour = []; // Enemy armour
	this.e_DebuffStacks = 0;
	this.last_Weapon = []; // Weapon to take
  this.last_Armour = [];
  this.activePanel = "";
  this.p_WeaponInventory = [];
  this.p_ArmourInventory = [];
  this.updateInv = true;
  this.flurryActive = false;
  if(!this.load()) {
 		this.initPlayer(1);
    this.showPanel("helpTable");
 		this.save();
 	}
  else {
    this.showPanel(this.activePanel);
    this.toastNotification("Game loaded.");
  }
	if(Game.p_State != Game.STATE_COMBAT) { Game.idleHeal(); }
	this.drawActivePanel();
}
Game.reset = function() {
	if(confirm("Are you sure you wish to erase your save? It will be lost permanently...")) {
		window.localStorage.removeItem("gameSave");
		window.location.reload();
	}
}
Game.save = function() {
	var g = JSON.stringify(Game);
	window.localStorage.setItem("gameSave",g);
  Game.toastNotification("Game saved.");
}
Game.load = function() {
	//localStorage yeeeeee
	var g;
	try {
		g = JSON.parse(window.localStorage.getItem("gameSave"));
	}
	catch(x) {
		g = null;
		console.log("Failed to load save. Is localStorage a thing on this browser?");
	}
	if(g !== null && g.GAME_VERSION == Game.GAME_VERSION) {
		Game.p_HP = g.p_HP;
		Game.p_MaxHP = g.p_MaxHP;
		Game.p_Str = g.p_Str;
		Game.p_Dex = g.p_Dex;
		Game.p_Int = g.p_Int;
		Game.p_Con = g.p_Con;
		Game.p_EXP = g.p_EXP;
		Game.p_NextEXP = g.p_NextEXP;
		Game.p_Powers = g.p_Powers;
		Game.p_Level = g.p_Level;
		Game.p_State = g.p_State;
		Game.p_PP = g.p_PP;
    Game.p_Currency = g.p_Currency;
    Game.p_Scrap = g.p_Scrap;
		Game.p_SkillPoints = g.p_SkillPoints;
    Game.p_WeaponInventory = g.p_WeaponInventory
		Game.p_Weapon = g.p_Weapon;
    Game.p_ArmourInventory = g.p_ArmourInventory;
    Game.p_Armour = g.p_Armour;
		Game.last_Weapon = g.last_Weapon;
    Game.last_Armour = g.last_Armour;
    Game.activePanel = g.activePanel;
		return true;
	}
	else { return false; }
}
Game.RNG = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
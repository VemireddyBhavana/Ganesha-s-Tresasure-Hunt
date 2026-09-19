import Phaser from "phaser";
import { saveScore } from "../../firebase/leaderboard";

// ─────────────────────────────────────────────
//  World dimensions (Exact 1376:768 aspect ratio of temple_garden.png)
// ─────────────────────────────────────────────
const WORLD_W   = 2500;
const WORLD_H   = 1400;

// Entrance gate step (top-left)
const SPAWN_X   = 320;
const SPAWN_Y   = 280;

// Temple Courtyard Gate Arch (center-left of temple complex in artwork)
const TEMPLE_GATE_X = 1120;
const TEMPLE_GATE_Y = 890;

// Temple Inner Sanctum Altar (top center of temple structure in artwork)
const TEMPLE_SANCTUM_X = 1680;
const TEMPLE_SANCTUM_Y = 520;

const TIME_LIMIT = 120; // 2 minutes

// ─────────────────────────────────────────────
//  Sacred Collectibles (Aligned along the paved pathways & lawns)
// ─────────────────────────────────────────────
const COLLECTIBLES = [
  // 🌸 Flowers — Entrance walkway & flowerbeds
  { emoji: "🌸", texture: "flower",  color: 0xff69b4, points: 10, x: 450,  y: 420  },
  { emoji: "🌸", texture: "flower",  color: 0xff69b4, points: 10, x: 640,  y: 500  },
  { emoji: "🌸", texture: "flower",  color: 0xff69b4, points: 10, x: 790,  y: 560  },
  { emoji: "🌸", texture: "flower",  color: 0xff69b4, points: 10, x: 540,  y: 740  },

  // 🌿 Durva Grass — Green lawns & stone benches
  { emoji: "🌿", texture: "durva",   color: 0x7cfc00, points: 15, x: 380,  y: 920  },
  { emoji: "🌿", texture: "durva",   color: 0x7cfc00, points: 15, x: 520,  y: 1140 },
  { emoji: "🌿", texture: "durva",   color: 0x7cfc00, points: 15, x: 840,  y: 1200 },
  { emoji: "🌿", texture: "durva",   color: 0x7cfc00, points: 15, x: 1060, y: 1120 },

  // 🍬 Sacred Modaks — Middle paved pathway approaching the temple
  { emoji: "🍬", texture: "modak",   color: 0xffa500, points: 20, x: 720,  y: 840  },
  { emoji: "🍬", texture: "modak",   color: 0xffa500, points: 20, x: 940,  y: 960  },
  { emoji: "🍬", texture: "modak",   color: 0xffa500, points: 20, x: 1080, y: 1000 },
  { emoji: "🍬", texture: "modak",   color: 0xffa500, points: 20, x: 1320, y: 1020 },

  // 🥥 Fresh Coconuts — South path near palm trees
  { emoji: "🥥", texture: "coconut", color: 0x8b4513, points: 25, x: 1560, y: 1220 },
  { emoji: "🥥", texture: "coconut", color: 0x8b4513, points: 25, x: 1860, y: 1180 },
  { emoji: "🥥", texture: "coconut", color: 0x8b4513, points: 25, x: 2120, y: 1040 },

  // 🪔 Aarti Diyas — Sacred parikrama & sanctum approach
  { emoji: "🪔", texture: "diya",    color: 0xffd700, points: 30, x: 1420, y: 960  },
  { emoji: "🪔", texture: "diya",    color: 0xffd700, points: 30, x: 2180, y: 800  },
  { emoji: "🪔", texture: "diya",    color: 0xffd700, points: 30, x: 1960, y: 580  },
];

// ─────────────────────────────────────────────
//  Eco-Seva: Plastic Waste to Clean Up
// ─────────────────────────────────────────────
const PLASTIC_WASTE_SPOTS = [
  { x: 300,  y: 600  },
  { x: 600,  y: 1040 },
  { x: 1200, y: 1240 },
  { x: 1720, y: 1140 },
];

// ─────────────────────────────────────────────
//  Obstacle Rocks (Placed along path borders)
// ─────────────────────────────────────────────
const ROCK_SPOTS = [
  { x: 510,  y: 470,  r: 18 },
  { x: 680,  y: 680,  r: 18 },
  { x: 420,  y: 1000, r: 20 },
  { x: 960,  y: 1160, r: 18 },
  { x: 1480, y: 1100, r: 20 },
  { x: 2020, y: 1160, r: 18 },
  { x: 2120, y: 700,  r: 18 },
];

// ─────────────────────────────────────────────
//  Devotional Audio Synthesizer (Web Audio API)
// ─────────────────────────────────────────────
class SoundFX {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.bgmOsc1 = null;
    this.bgmOsc2 = null;
    this.bgmInterval = null;
    this.bgmPlaying = false;
    this.isMuted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  startBGM() {
    if (this.bgmPlaying) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.bgmPlaying = true;
      const now = this.ctx.currentTime;

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.001, now);
      this.bgmGain.gain.linearRampToValueAtTime(0.08, now + 1.2);
      this.bgmGain.connect(this.masterGain);

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(380, now);
      filter.Q.setValueAtTime(2.0, now);
      filter.connect(this.bgmGain);

      // Drone 1: Root D3 (146.83 Hz)
      this.bgmOsc1 = this.ctx.createOscillator();
      this.bgmOsc1.type = "sawtooth";
      this.bgmOsc1.frequency.setValueAtTime(146.83, now);
      const osc1Gain = this.ctx.createGain();
      osc1Gain.gain.setValueAtTime(0.25, now);
      this.bgmOsc1.connect(osc1Gain);
      osc1Gain.connect(filter);
      this.bgmOsc1.start(now);

      // Drone 2: Fifth A3 (220.0 Hz)
      this.bgmOsc2 = this.ctx.createOscillator();
      this.bgmOsc2.type = "sine";
      this.bgmOsc2.frequency.setValueAtTime(220.00, now);
      const osc2Gain = this.ctx.createGain();
      osc2Gain.gain.setValueAtTime(0.2, now);
      this.bgmOsc2.connect(osc2Gain);
      osc2Gain.connect(this.bgmGain);
      this.bgmOsc2.start(now);

      // Devotional Melody Chimes (Raga Bhupali: D4, E4, F#4, A4, B4, D5)
      const ragaNotes = [293.66, 329.63, 369.99, 440.00, 493.88, 587.33];
      const playChime = () => {
        if (!this.bgmPlaying || !this.ctx) return;
        try {
          const t = this.ctx.currentTime;
          const note = ragaNotes[Math.floor(Math.random() * ragaNotes.length)];
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(note, t);
          g.gain.setValueAtTime(0.04, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
          osc.connect(g);
          g.connect(this.masterGain);
          osc.start(t);
          osc.stop(t + 2.2);
        } catch (e) {}
      };

      this.bgmInterval = setInterval(playChime, 2600);
      playChime();
    } catch (e) {}
  }

  stopBGM() {
    if (!this.bgmPlaying) return;
    this.bgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    try {
      if (this.bgmGain && this.ctx) {
        const now = this.ctx.currentTime;
        this.bgmGain.gain.linearRampToValueAtTime(0.001, now + 0.5);
        setTimeout(() => {
          if (this.bgmOsc1) { try { this.bgmOsc1.stop(); this.bgmOsc1.disconnect(); } catch (e) {} this.bgmOsc1 = null; }
          if (this.bgmOsc2) { try { this.bgmOsc2.stop(); this.bgmOsc2.disconnect(); } catch (e) {} this.bgmOsc2 = null; }
        }, 600);
      }
    } catch (e) {}
  }

  playCollect() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.35);

      const chime = this.ctx.createOscillator();
      const chimeG = this.ctx.createGain();
      chime.type = "triangle";
      chime.frequency.setValueAtTime(1174.66, now + 0.05); // D6
      chimeG.gain.setValueAtTime(0.08, now + 0.05);
      chimeG.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      chime.connect(chimeG);
      chimeG.connect(this.masterGain);
      chime.start(now + 0.05);
      chime.stop(now + 0.4);
    } catch (e) {}
  }

  playEcoClean() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}
  }

  playRockHit() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.22);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {}
  }

  playTempleBell() {
    try {
      this.init();
      if (!this.ctx) return;
      const freqs = [523.25, 1046.5, 1567.98, 2093.0];
      freqs.forEach((f, i) => {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now);
        const vol = 0.15 / (i + 1);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 2.0);
      });
    } catch (e) {}
  }

  playGateOpen() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const freqs = [220, 440, 660, 880];
      freqs.forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = i === 0 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(f, now);
        g.gain.setValueAtTime(0.16 / (i + 1), now);
        g.gain.exponentialRampToValueAtTime(0.0005, now + 2.6);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 2.6);
      });
    } catch (e) {}
  }

  playVictory() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const fanfare = [
        { f: 293.66, t: 0.0, d: 0.3 },
        { f: 369.99, t: 0.18, d: 0.3 },
        { f: 440.00, t: 0.36, d: 0.4 },
        { f: 587.33, t: 0.58, d: 0.7 },
        { f: 739.99, t: 0.85, d: 1.4 },
      ];
      fanfare.forEach(note => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(note.f, now + note.t);
        g.gain.setValueAtTime(0.18, now + note.t);
        g.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(now + note.t);
        osc.stop(now + note.t + note.d);
      });
      setTimeout(() => this.playTempleBell(), 600);
    } catch (e) {}
  }

  playClick() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.06);
      g.gain.setValueAtTime(0.1, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {}
  }
}

export default class Level1Scene extends Phaser.Scene {
  constructor() {
    super("Level1Scene");
  }

  // ═══════════════════════════════════════════
  //  CREATE
  // ═══════════════════════════════════════════
  create() {
    this.soundFX = new SoundFX();

    // Game state
    this.score          = 0;
    this.collected      = 0;
    this.totalItems     = COLLECTIBLES.length;
    this.ecoCleaned     = 0;
    this.lives          = 3;
    this.timeLeft       = TIME_LIMIT;
    this.allCollected   = false;
    this.gameOver       = false;
    this.levelComplete  = false;
    this.isInvincible   = false;
    this.isGamePaused   = false;

    // Virtual joystick / touch steering state
    this.touchVector = { x: 0, y: 0 };
    this.isTouchActive = false;

    // Tracker per offering type
    this.tracker = {
      "🌸": { label: "🌸 Flowers",  count: 0, total: 0, badgeObj: null },
      "🌿": { label: "🌿 Durva",    count: 0, total: 0, badgeObj: null },
      "🍬": { label: "🍬 Modak",    count: 0, total: 0, badgeObj: null },
      "🥥": { label: "🥥 Coconut",  count: 0, total: 0, badgeObj: null },
      "🪔": { label: "🪔 Diya",     count: 0, total: 0, badgeObj: null },
    };
    COLLECTIBLES.forEach(item => { this.tracker[item.emoji].total++; });

    // ─────────────────────────────────────
    //  WORLD & ENVIRONMENT
    // ─────────────────────────────────────
    this.cameras.main.setBackgroundColor("#87CEEB");

    // Clean, authentic hand-drawn Temple Garden background
    this.add.image(WORLD_W / 2, WORLD_H / 2, "temple_garden_bg")
      .setDisplaySize(WORLD_W, WORLD_H)
      .setDepth(0);

    // ─────────────────────────────────────
    //  NATURAL BOUNDARY COLLIDERS
    // ─────────────────────────────────────
    this.boundaryGroup = this.physics.add.staticGroup();

    // Lotus Pond boundary (devotee cannot walk onto pond water)
    const lotusPond = this.add.rectangle(1680, 1120, 360, 150, 0x000000, 0);
    this.physics.add.existing(lotusPond, true);
    this.boundaryGroup.add(lotusPond);

    // Temple outer boundary courtyard walls (before gate opens)
    // Left wall of temple
    const templeLeftWall = this.add.rectangle(950, 800, 32, 220, 0x000000, 0);
    this.physics.add.existing(templeLeftWall, true);
    this.boundaryGroup.add(templeLeftWall);

    // Front wall left wing
    const templeFrontWallLeft = this.add.rectangle(1020, 890, 120, 28, 0x000000, 0);
    this.physics.add.existing(templeFrontWallLeft, true);
    this.boundaryGroup.add(templeFrontWallLeft);

    // Front wall right wing
    const templeFrontWallRight = this.add.rectangle(1220, 890, 80, 28, 0x000000, 0);
    this.physics.add.existing(templeFrontWallRight, true);
    this.boundaryGroup.add(templeFrontWallRight);

    // ─────────────────────────────────────
    //  ROCKS (Static Obstacles with Knockback)
    // ─────────────────────────────────────
    this.rocksGroup = this.physics.add.staticGroup();
    ROCK_SPOTS.forEach(({ x, y, r }) => {
      this.add.ellipse(x, y + r * 0.6, r * 2.2, r * 0.8, 0x000000, 0.25).setDepth(20);
      const rock = this.physics.add.staticImage(x, y, "rock").setDepth(25);
      rock.setScale(0.24);
      rock.body.setSize(30, 24);
      this.rocksGroup.add(rock);
    });
    this.rocksGroup.refresh();

    // ─────────────────────────────────────
    //  ECO-SEVA PLASTIC WASTE (Clean-up Items)
    // ─────────────────────────────────────
    this.ecoGroup = this.physics.add.staticGroup();
    PLASTIC_WASTE_SPOTS.forEach(({ x, y }) => {
      this.add.ellipse(x, y + 8, 22, 10, 0x000000, 0.2).setDepth(30);
      const waste = this.physics.add.image(x, y, "plastic_waste").setDepth(35);
      waste.setScale(0.28);
      this.physics.add.existing(waste, true);

      // Gentle floating alert pulse
      this.tweens.add({
        targets: waste,
        angle: 8,
        yoyo: true,
        repeat: -1,
        duration: 900,
      });

      this.ecoGroup.add(waste);
    });
    this.ecoGroup.refresh();

    // ─────────────────────────────────────
    //  SACRED OFFERINGS (Shadows, Glow, Float)
    // ─────────────────────────────────────
    this.collectiblesGroup = this.physics.add.staticGroup();
    COLLECTIBLES.forEach((item) => {
      const shadow = this.add.ellipse(item.x, item.y + 14, 28, 12, 0x000000, 0.28).setDepth(45);
      const glow = this.add.circle(item.x, item.y, 22, item.color, 0.25).setDepth(48);
      this.tweens.add({
        targets: glow,
        scaleX: 1.35, scaleY: 1.35, alpha: 0.12,
        duration: 900 + Phaser.Math.Between(0, 300),
        yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });

      const sprite = this.physics.add.image(item.x, item.y, item.texture).setDepth(50);
      sprite.setScale(0.24);
      this.physics.add.existing(sprite, true);

      this.tweens.add({
        targets: sprite,
        y: item.y - 7,
        duration: 850 + Phaser.Math.Between(0, 300),
        yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });

      this.tweens.add({
        targets: shadow,
        scaleX: 0.85, scaleY: 0.85, alpha: 0.18,
        duration: 850 + Phaser.Math.Between(0, 300),
        yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });

      const label = this.add.text(item.x, item.y - 28, item.emoji, {
        fontSize: "18px",
      }).setOrigin(0.5).setDepth(55);

      this.tweens.add({
        targets: label,
        y: item.y - 35,
        duration: 850 + Phaser.Math.Between(0, 300),
        yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });

      sprite.pointValue = item.points;
      sprite.itemEmoji  = item.emoji;
      sprite.glowRef    = glow;
      sprite.labelRef   = label;
      sprite.shadowRef  = shadow;

      this.collectiblesGroup.add(sprite);
    });
    this.collectiblesGroup.refresh();

    // ─────────────────────────────────────
    //  TEMPLE COURTYARD GATE & WIN ZONE
    // ─────────────────────────────────────
    // Sacred Toran / Gate Bar across the courtyard archway
    this.gateBar = this.add.rectangle(TEMPLE_GATE_X, TEMPLE_GATE_Y, 130, 20, 0xd84315, 0.9).setDepth(90);
    this.gateBar.setStrokeStyle(3, 0xffd700);
    this.physics.add.existing(this.gateBar, true);

    this.gateLockText = this.add.text(TEMPLE_GATE_X, TEMPLE_GATE_Y - 26, "🔒 Gather 18 Offerings to Enter", {
      fontSize: "13px", color: "#ffffff", fontStyle: "bold",
      backgroundColor: "#b71c1cee", padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(95);

    // Sanctum Win Zone inside the inner temple court
    const templeWinZone = this.add.zone(TEMPLE_SANCTUM_X, TEMPLE_SANCTUM_Y, 190, 160);
    this.physics.add.existing(templeWinZone, true);
    this.physics.add.overlap(
      this.player || null, templeWinZone, this.onReachTemple, null, this
    );
    this.templeWinZone = templeWinZone;

    // ─────────────────────────────────────
    //  ANIMATIONS (Walking & Idle)
    // ─────────────────────────────────────
    if (!this.anims.exists("walk-down")) {
      this.anims.create({
        key: "walk-down",
        frames: this.anims.generateFrameNumbers("player", { start: 0, end: 3 }),
        frameRate: 8, repeat: -1,
      });
    }
    if (!this.anims.exists("walk-left")) {
      this.anims.create({
        key: "walk-left",
        frames: this.anims.generateFrameNumbers("player", { start: 4, end: 7 }),
        frameRate: 8, repeat: -1,
      });
    }
    if (!this.anims.exists("walk-right")) {
      this.anims.create({
        key: "walk-right",
        frames: this.anims.generateFrameNumbers("player", { start: 8, end: 11 }),
        frameRate: 8, repeat: -1,
      });
    }
    if (!this.anims.exists("walk-up")) {
      this.anims.create({
        key: "walk-up",
        frames: this.anims.generateFrameNumbers("player", { start: 12, end: 15 }),
        frameRate: 8, repeat: -1,
      });
    }
    if (!this.anims.exists("idle")) {
      this.anims.create({
        key: "idle",
        frames: this.anims.generateFrameNumbers("player", { start: 16, end: 19 }),
        frameRate: 4, repeat: -1,
      });
    }

    // ─────────────────────────────────────
    //  PLAYER DEVOTEE SPRITE
    // ─────────────────────────────────────
    this.player = this.physics.add.sprite(SPAWN_X, SPAWN_Y, "player");
    this.player.setScale(1.35);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(24, 26);
    this.player.body.setOffset(20, 34);
    this.player.setDepth(150);
    this.player.anims.play("idle", true);
    this._lastDir = "down";

    // Re-bind win zone overlap now that player exists
    this.physics.add.overlap(this.player, this.templeWinZone, this.onReachTemple, null, this);

    // Physics events
    this.physics.add.overlap(this.player, this.collectiblesGroup, this.onCollect, null, this);
    this.physics.add.overlap(this.player, this.ecoGroup, this.onCleanEco, null, this);
    this.physics.add.collider(this.player, this.boundaryGroup);
    this.physics.add.collider(this.player, this.rocksGroup, this.onHitRock, null, this);
    this.gateCollider = this.physics.add.collider(this.player, this.gateBar);

    // Physics & Camera Bounds
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // ─────────────────────────────────────
    //  KEYBOARD & INPUT CONTROLS
    // ─────────────────────────────────────
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
    });

    this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.keyEsc.on("down", () => this.togglePause());

    // Debug hotkeys
    const keyU = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.U);
    keyU.on("down", () => {
      this.collected = this.totalItems;
      this.openTempleGate();
    });
    const keyV = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.V);
    keyV.on("down", () => {
      this.allCollected = true;
      this.onReachTemple();
    });

    // Start background music on user click or touch
    this.input.on("pointerdown", () => {
      if (!this.soundFX.bgmPlaying && !this.soundFX.isMuted) {
        this.soundFX.startBGM();
      }
    });

    // Tap/drag on screen to steer player (mobile / mouse friendly)
    this.input.on("pointermove", (pointer) => {
      if (pointer.isDown && !this.isGamePaused && !this.gameOver && !this.levelComplete) {
        // Only steer if pointer is in world canvas, not clicking HUD buttons
        if (pointer.y > 100) {
          const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
          const dx = worldPoint.x - this.player.x;
          const dy = worldPoint.y - this.player.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 25) {
            this.touchVector = { x: dx / dist, y: dy / dist };
            this.isTouchActive = true;
          } else {
            this.touchVector = { x: 0, y: 0 };
            this.isTouchActive = false;
          }
        }
      }
    });

    this.input.on("pointerup", () => {
      this.isTouchActive = false;
      this.touchVector = { x: 0, y: 0 };
    });

    // Timer Event (every second)
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.onTick,
      callbackScope: this,
      loop: true,
    });

    // ─────────────────────────────────────
    //  HUD: TOP BAR GLASSMORPHISM
    // ─────────────────────────────────────
    // 0. In-game Home button
    this.hudHomeBtn = this.add.text(64, 22, "⬅ HOME", {
      fontSize: "13px", fontStyle: "bold", color: "#ffffff",
      backgroundColor: "#3e2723", padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300).setInteractive({ useHandCursor: true });
    this.hudHomeBtn.on("pointerdown", () => {
      this.soundFX.stopBGM();
      window.dispatchEvent(new CustomEvent("nav-home"));
    });
    this.hudHomeBtn.on("pointerover", () => this.hudHomeBtn.setStyle({ color: "#ffd700", backgroundColor: "#5d4037" }));
    this.hudHomeBtn.on("pointerout", () => this.hudHomeBtn.setStyle({ color: "#ffffff", backgroundColor: "#3e2723" }));

    // 1. Top-Left Vitals Card
    this.add.rectangle(126, 92, 224, 94, 0x1d1007, 0.92)
      .setStrokeStyle(2, 0xffd700, 0.9)
      .setScrollFactor(0).setDepth(200);

    this.scoreText = this.add.text(26, 52, "⭐ SCORE: 0", {
      fontSize: "19px", fontStyle: "bold", color: "#ffd700",
      stroke: "#2a1500", strokeThickness: 3,
    }).setScrollFactor(0).setDepth(201);

    this.livesText = this.add.text(26, 80, "❤️ ❤️ ❤️", {
      fontSize: "18px", color: "#ff4d4d",
    }).setScrollFactor(0).setDepth(201);

    this.timerText = this.add.text(26, 108, `⏱️ TIME: ${TIME_LIMIT}s`, {
      fontSize: "16px", fontStyle: "bold", color: "#64b5f6",
      stroke: "#001a33", strokeThickness: 2,
    }).setScrollFactor(0).setDepth(201);

    // 2. Top-Center Offerings Quest Dock
    const dockW = 540;
    const dockH = 82;
    const dockX = this.scale.width / 2;
    const dockY = 53;

    this.add.rectangle(dockX, dockY, dockW, dockH, 0x1d1007, 0.92)
      .setStrokeStyle(2, 0xffd700, 0.9)
      .setScrollFactor(0).setDepth(200);

    this.add.text(dockX, dockY - 26, "🛕 SACRED OFFERINGS FOR GANESHA", {
      fontSize: "12px", fontStyle: "bold", color: "#ffecb3",
      stroke: "#2a1500", strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    const TRACKER_ORDER = ["🌸", "🌿", "🍬", "🥥", "🪔"];
    const badgeSpacing = 100;
    const startX = dockX - 200;

    TRACKER_ORDER.forEach((emoji, idx) => {
      const t = this.tracker[emoji];
      const bx = startX + idx * badgeSpacing;
      t.badgeObj = this.add.text(bx, dockY, `${emoji} 0/${t.total}`, {
        fontSize: "13px", fontStyle: "bold", color: "#ffffff",
        backgroundColor: "#3e2723", padding: { x: 7, y: 3 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    });

    this.progressBarBg = this.add.rectangle(dockX, dockY + 25, 480, 8, 0x3e2723)
      .setScrollFactor(0).setDepth(201);
    this.progressBarFill = this.add.rectangle(dockX - 240, dockY + 25, 0, 8, 0xffd700)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(202);

    // 3. Top-Right Quick Action Controls
    this.hudPauseBtn = this.add.text(this.scale.width - 76, 34, "⏸️ PAUSE", {
      fontSize: "13px", fontStyle: "bold", color: "#ffffff",
      backgroundColor: "#3e2723", padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300).setInteractive({ useHandCursor: true });
    this.hudPauseBtn.on("pointerdown", () => this.togglePause());

    this.hudAudioBtn = this.add.text(this.scale.width - 76, 74, "🔊 SOUND", {
      fontSize: "13px", fontStyle: "bold", color: "#ffffff",
      backgroundColor: "#2e3b44", padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300).setInteractive({ useHandCursor: true });
    this.hudAudioBtn.on("pointerdown", () => {
      const isMuted = this.soundFX.toggleMute();
      this.hudAudioBtn.setText(isMuted ? "🔇 SOUND" : "🔊 SOUND");
      if (this.pauseAudioBtn) this.pauseAudioBtn.setText(isMuted ? "🔇  Audio: OFF" : "🔊  Audio: ON");
    });

    this.hudFullscreenBtn = this.add.text(this.scale.width - 76, 114, "⛶ FULL", {
      fontSize: "13px", fontStyle: "bold", color: "#ffffff",
      backgroundColor: "#2e3b44", padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300).setInteractive({ useHandCursor: true });
    this.hudFullscreenBtn.on("pointerdown", () => {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen();
          this.hudFullscreenBtn.setText("🗗 EXIT");
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
          this.hudFullscreenBtn.setText("⛶ FULL");
        }
      }
    });

    // Start Entrance Marker
    this.add.text(SPAWN_X, SPAWN_Y - 45, "🛕 TEMPLE GARDEN ENTRANCE", {
      fontSize: "13px", color: "#ffffff", fontStyle: "bold",
      backgroundColor: "#2e7d32ee", padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(60);

    // Hit popup (screen-space)
    this.hitPopup = this.add.text(this.scale.width / 2, this.scale.height / 2 + 30, "", {
      fontSize: "22px", fontStyle: "bold",
      color: "#ff3333", stroke: "#ffffff", strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(500).setVisible(false);

    // ─────────────────────────────────────
    //  ON-SCREEN TOUCH VIRTUAL D-PAD (for mobile/tablet)
    // ─────────────────────────────────────
    this.createTouchControls();

    // Pause Menu Modal
    this.createPauseMenu();

    // Global reference for verification
    window.__level1Scene = this;
  }

  // ═══════════════════════════════════════════
  //  TOUCH D-PAD CONTROLS
  // ═══════════════════════════════════════════
  createTouchControls() {
    const padX = 90;
    const padY = this.scale.height - 90;
    const btnSize = 44;

    const padContainer = this.add.container(padX, padY).setScrollFactor(0).setDepth(300);

    const makeBtn = (bx, by, label, vx, vy) => {
      const bg = this.add.circle(bx, by, btnSize / 2, 0x221105, 0.7)
        .setStrokeStyle(2, 0xffd700, 0.8)
        .setInteractive({ useHandCursor: true });

      const text = this.add.text(bx, by, label, {
        fontSize: "18px", fontStyle: "bold", color: "#ffd700",
      }).setOrigin(0.5);

      bg.on("pointerdown", () => {
        this.touchVector = { x: vx, y: vy };
        this.isTouchActive = true;
        bg.setFillStyle(0xd84315, 0.9);
      });
      bg.on("pointerup", () => {
        this.touchVector = { x: 0, y: 0 };
        this.isTouchActive = false;
        bg.setFillStyle(0x221105, 0.7);
      });
      bg.on("pointerout", () => {
        this.touchVector = { x: 0, y: 0 };
        this.isTouchActive = false;
        bg.setFillStyle(0x221105, 0.7);
      });

      return [bg, text];
    };

    const upBtn    = makeBtn(0, -42, "▲", 0, -1);
    const downBtn  = makeBtn(0, 42, "▼", 0, 1);
    const leftBtn  = makeBtn(-42, 0, "◀", -1, 0);
    const rightBtn = makeBtn(42, 0, "▶", 1, 0);

    padContainer.add([...upBtn, ...downBtn, ...leftBtn, ...rightBtn]);
  }

  // ═══════════════════════════════════════════
  //  PAUSE MENU
  // ═══════════════════════════════════════════
  createPauseMenu() {
    this.pauseContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(800).setVisible(false);

    const overlay = this.add.rectangle(
      this.scale.width / 2, this.scale.height / 2,
      this.scale.width, this.scale.height, 0x000000, 0.75
    ).setInteractive();

    const cardW = 460;
    const cardH = 410;
    const card = this.add.rectangle(
      this.scale.width / 2, this.scale.height / 2, cardW, cardH, 0x241208, 0.96
    );
    card.setStrokeStyle(3, 0xffd700);

    const title = this.add.text(this.scale.width / 2, this.scale.height / 2 - 150, "⏸️ GAME PAUSED", {
      fontSize: "28px", fontStyle: "bold", color: "#ffd700",
      stroke: "#3d1f00", strokeThickness: 4,
    }).setOrigin(0.5);

    this.pauseStatsText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 75, "", {
      fontSize: "16px", color: "#ffffff",
      backgroundColor: "#1c0d05aa",
      padding: { x: 20, y: 10 }, align: "center", lineSpacing: 6,
    }).setOrigin(0.5);

    const resumeBtn = this.add.text(this.scale.width / 2, this.scale.height / 2 + 15, "▶️  Resume Game", {
      fontSize: "18px", fontStyle: "bold", color: "#ffffff",
      backgroundColor: "#d84315", padding: { x: 28, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    resumeBtn.on("pointerdown", () => this.togglePause());

    const restartBtn = this.add.text(this.scale.width / 2, this.scale.height / 2 + 70, "🔄  Restart Level", {
      fontSize: "18px", fontStyle: "bold", color: "#ffffff",
      backgroundColor: "#4e342e", padding: { x: 28, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    restartBtn.on("pointerdown", () => {
      this.soundFX.stopBGM();
      this.scene.restart();
    });

    this.pauseAudioBtn = this.add.text(this.scale.width / 2, this.scale.height / 2 + 125, "🔊  Audio: ON", {
      fontSize: "16px", fontStyle: "bold", color: "#ffffff",
      backgroundColor: "#37474f", padding: { x: 22, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.pauseAudioBtn.on("pointerdown", () => {
      const isMuted = this.soundFX.toggleMute();
      this.pauseAudioBtn.setText(isMuted ? "🔇  Audio: OFF" : "🔊  Audio: ON");
      if (this.hudAudioBtn) this.hudAudioBtn.setText(isMuted ? "🔇 SOUND" : "🔊 SOUND");
    });

    const menuBtn = this.add.text(this.scale.width / 2, this.scale.height / 2 + 172, "🏠  Main Menu", {
      fontSize: "16px", fontStyle: "bold", color: "#b0bec5",
      backgroundColor: "#212121", padding: { x: 22, y: 7 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menuBtn.on("pointerdown", () => {
      this.soundFX.stopBGM();
      window.dispatchEvent(new CustomEvent("nav-home"));
    });

    this.pauseContainer.add([overlay, card, title, this.pauseStatsText, resumeBtn, restartBtn, this.pauseAudioBtn, menuBtn]);
  }

  togglePause() {
    if (this.gameOver || this.levelComplete) return;
    this.isGamePaused = !this.isGamePaused;
    this.soundFX.playClick();

    if (this.isGamePaused) {
      this.physics.world.isPaused = true;
      this.timerEvent.paused = true;
      this.player.body.setVelocity(0);

      this.pauseStatsText.setText(
        `⭐ Current Score: ${this.score} pts\n` +
        `🛕 Offerings: ${this.collected} / ${this.totalItems}\n` +
        `🌱 Eco-Seva Cleaned: ${this.ecoCleaned} items\n` +
        `❤️ Lives Left: ${this.lives}\n` +
        `⏱️ Time Left: ${this.timeLeft}s`
      );
      this.pauseContainer.setVisible(true);
    } else {
      this.physics.world.isPaused = false;
      this.timerEvent.paused = false;
      this.pauseContainer.setVisible(false);
    }
  }

  // ═══════════════════════════════════════════
  //  TIMER TICK
  // ═══════════════════════════════════════════
  onTick() {
    if (this.isGamePaused || this.gameOver || this.levelComplete) return;

    this.timeLeft--;
    this.timerText.setText(`⏱️ TIME: ${this.timeLeft}s`);

    if (this.timeLeft <= 20) {
      this.timerText.setColor(this.timeLeft % 2 === 0 ? "#ff1744" : "#ff8a80");
      this.tweens.add({
        targets: this.timerText,
        scaleX: 1.14, scaleY: 1.14,
        duration: 120, yoyo: true,
      });
    }

    if (this.timeLeft <= 0) {
      this.triggerGameOver("⏱️ Time's Up!\nThe evening aarti has started without offerings...");
    }
  }

  // ═══════════════════════════════════════════
  //  COLLECT ITEM
  // ═══════════════════════════════════════════
  onCollect(player, item) {
    this.score     += item.pointValue;
    this.collected += 1;
    this.soundFX.playCollect();

    const ix = item.x;
    const iy = item.y;

    // Sparkle Burst
    const sparkleColors = [0xffd700, 0xff8f00, 0xffffff, 0xff6f00, 0xffee58, 0xf06292];
    for (let i = 0; i < 12; i++) {
      const col   = sparkleColors[i % sparkleColors.length];
      const p     = this.add.circle(ix, iy, Phaser.Math.Between(3, 6), col, 1).setDepth(350);
      const angle = (i / 12) * Math.PI * 2;
      const dist  = Phaser.Math.Between(26, 54);
      this.tweens.add({
        targets: p,
        x: ix + Math.cos(angle) * dist,
        y: iy + Math.sin(angle) * dist - 10,
        alpha: 0, scale: 0.1,
        duration: Phaser.Math.Between(400, 650),
        ease: "Cubic.easeOut",
        onComplete: () => p.destroy(),
      });
    }

    // Floating score label
    const floatLabel = this.add.text(ix, iy - 16, `${item.itemEmoji} +${item.pointValue}`, {
      fontSize: "19px", fontStyle: "bold",
      color: "#ffffff", stroke: "#2d1600", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(360);

    this.tweens.add({
      targets: floatLabel,
      y: iy - 70, alpha: 0, scale: 1.25,
      duration: 900, ease: "Cubic.easeOut",
      onComplete: () => floatLabel.destroy(),
    });

    this.scoreText.setText(`⭐ SCORE: ${this.score}`);

    // Update tracker badge
    const t = this.tracker[item.itemEmoji];
    if (t) {
      t.count++;
      if (t.count >= t.total) {
        t.badgeObj.setText(`${item.itemEmoji} ${t.total}/${t.total} ✓`);
        t.badgeObj.setStyle({ backgroundColor: "#2e7d32", color: "#ffd700" });
        this.tweens.add({
          targets: t.badgeObj,
          scaleX: 1.25, scaleY: 1.25,
          duration: 150, yoyo: true, ease: "Back.easeOut",
        });
      } else {
        t.badgeObj.setText(`${item.itemEmoji} ${t.count}/${t.total}`);
      }
    }

    // Update Progress Bar
    const progressFrac = Math.min(1, this.collected / this.totalItems);
    this.tweens.add({
      targets: this.progressBarFill,
      width: progressFrac * 480,
      duration: 200, ease: "Sine.easeOut",
    });

    if (item.shadowRef) {
      this.tweens.add({
        targets: item.shadowRef,
        alpha: 0, duration: 200,
        onComplete: () => item.shadowRef.destroy(),
      });
    }

    this.tweens.add({
      targets: [item, item.glowRef, item.labelRef],
      scale: 0, alpha: 0,
      duration: 200, ease: "Back.easeIn",
      onComplete: () => {
        if (item.glowRef) item.glowRef.destroy();
        if (item.labelRef) item.labelRef.destroy();
        item.destroy();
      },
    });

    if (this.collected === this.totalItems) {
      this.openTempleGate();
    }
  }

  // ═══════════════════════════════════════════
  //  ECO-SEVA PLASTIC CLEAN-UP
  // ═══════════════════════════════════════════
  onCleanEco(player, waste) {
    const bonus = 20;
    this.score += bonus;
    this.ecoCleaned += 1;
    this.soundFX.playEcoClean();

    const wx = waste.x;
    const wy = waste.y;

    const floatLabel = this.add.text(wx, wy - 16, "🌱 Clean Seva! +20", {
      fontSize: "17px", fontStyle: "bold",
      color: "#a5d6a7", stroke: "#1b5e20", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(360);

    this.tweens.add({
      targets: floatLabel,
      y: wy - 65, alpha: 0, scale: 1.2,
      duration: 900, ease: "Cubic.easeOut",
      onComplete: () => floatLabel.destroy(),
    });

    this.scoreText.setText(`⭐ SCORE: ${this.score}`);

    this.tweens.add({
      targets: waste,
      scale: 0, alpha: 0,
      duration: 200,
      onComplete: () => waste.destroy(),
    });
  }

  // ═══════════════════════════════════════════
  //  OPEN TEMPLE GATE
  // ═══════════════════════════════════════════
  openTempleGate() {
    if (this.allCollected) return;
    this.allCollected = true;

    if (this.timerEvent) this.timerEvent.paused = true;
    this.player.body.setVelocity(0);
    this.player.anims.play("idle", true);

    // STEP 1: All offerings gathered banner
    const dimBg = this.add.rectangle(
      this.scale.width / 2, this.scale.height / 2,
      this.scale.width, this.scale.height, 0x000000, 0.55
    ).setScrollFactor(0).setDepth(750).setAlpha(0);

    this.tweens.add({ targets: dimBg, alpha: 0.55, duration: 400 });

    const bannerText = this.add.text(
      this.scale.width / 2, this.scale.height / 2,
      "✨ All 18 Sacred Offerings Gathered! ✨\nThe Temple Gate is Opening...",
      {
        fontSize: "24px", fontStyle: "bold", color: "#ffd700",
        stroke: "#3e1700", strokeThickness: 5,
        backgroundColor: "#1f0c03ee", padding: { x: 28, y: 16 },
        align: "center",
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(760).setScale(0.2);

    this.tweens.add({
      targets: bannerText,
      scale: 1, duration: 500, ease: "Back.easeOut",
    });

    // STEP 2: Temple Bell Chime
    this.time.delayedCall(800, () => {
      this.soundFX.playGateOpen();
      this.cameras.main.shake(250, 0.006);
    });

    // STEP 3: Camera Pan to Temple Gate Archway in Artwork
    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: [bannerText, dimBg],
        alpha: 0, duration: 400,
        onComplete: () => {
          bannerText.destroy();
          dimBg.destroy();
        },
      });

      this.cameras.main.stopFollow();
      this.cameras.main.pan(TEMPLE_GATE_X, TEMPLE_GATE_Y, 1300, "Sine.easeInOut");

      // Divine rays from temple gate arch
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const ray = this.add.line(
          TEMPLE_GATE_X, TEMPLE_GATE_Y, 0, 0,
          Math.cos(angle) * 140, Math.sin(angle) * 140,
          0xffd700, 0.95
        ).setLineWidth(4).setDepth(210);

        this.tweens.add({
          targets: ray,
          scaleX: 2.2, scaleY: 2.2, alpha: 0,
          duration: 1500, ease: "Cubic.easeOut",
          onComplete: () => ray.destroy(),
        });
      }
    });

    // STEP 4: Remove blocking barrier
    this.time.delayedCall(3400, () => {
      this.cameras.main.flash(500, 255, 215, 0);

      if (this.gateCollider) {
        this.physics.world.removeCollider(this.gateCollider);
        this.gateCollider = null;
      }

      if (this.gateBar) {
        this.tweens.add({
          targets: this.gateBar,
          scaleX: 0, alpha: 0, duration: 800,
          onComplete: () => {
            if (this.gateBar) this.gateBar.destroy();
          },
        });
      }

      if (this.gateLockText) {
        this.gateLockText.setText("✨ Gate OPEN! Enter the Sanctum ✨");
        this.gateLockText.setStyle({ color: "#2e7d32", backgroundColor: "#e8f5e9ee" });
        this.tweens.add({
          targets: this.gateLockText,
          y: TEMPLE_GATE_Y - 50, alpha: 0, duration: 2500,
          onComplete: () => {
            if (this.gateLockText) this.gateLockText.destroy();
          },
        });
      }
    });

    // STEP 5: Pan camera back to devotee with guidance arrow
    this.time.delayedCall(4800, () => {
      this.cameras.main.pan(
        this.player.x, this.player.y, 1100, "Sine.easeInOut",
        false,
        (camera, progress) => {
          if (progress === 1) {
            this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
          }
        }
      );

      if (this.timerEvent) this.timerEvent.paused = false;

      this._guideBanner = this.add.text(
        this.scale.width / 2, this.scale.height - 42,
        "🛕 The Temple is open! Enter the inner sanctum for Aarti. 🛕",
        {
          fontSize: "15px", fontStyle: "bold", color: "#ffffff",
          backgroundColor: "#d84315ee", padding: { x: 20, y: 8 },
        }
      ).setOrigin(0.5).setScrollFactor(0).setDepth(500);

      this.tweens.add({
        targets: this._guideBanner,
        alpha: 0.6, duration: 700, yoyo: true, repeat: -1,
      });

      this._templeArrow = this.add.text(this.player.x, this.player.y, "➤", {
        fontSize: "26px", fontStyle: "bold", color: "#ffd700",
        stroke: "#3d1f00", strokeThickness: 3,
      }).setOrigin(0.5).setDepth(260);

      this.tweens.add({
        targets: this._templeArrow,
        scaleX: 1.3, scaleY: 1.3,
        duration: 500, yoyo: true, repeat: -1,
      });
    });
  }

  // ═══════════════════════════════════════════
  //  HIT ROCK (Knockback without Resetting to Start!)
  // ═══════════════════════════════════════════
  onHitRock(player, rock) {
    if (this.isInvincible || this.gameOver) return;

    this.soundFX.playRockHit();
    this.isInvincible = true;
    this.time.delayedCall(1400, () => { this.isInvincible = false; });

    this.lives--;
    const hearts = "❤️ ".repeat(Math.max(0, this.lives)) + "🖤 ".repeat(Math.max(0, 3 - this.lives));
    this.livesText.setText(hearts.trim());

    // Knockback player 40px away from the rock (NOT teleport to start!)
    const angle = Phaser.Math.Angle.Between(rock.x, rock.y, player.x, player.y);
    const knockDist = 45;
    player.x = Phaser.Math.Clamp(player.x + Math.cos(angle) * knockDist, 50, WORLD_W - 50);
    player.y = Phaser.Math.Clamp(player.y + Math.sin(angle) * knockDist, 50, WORLD_H - 50);
    player.body.setVelocity(0);

    // Invincibility blink
    this.tweens.add({
      targets: this.player,
      alpha: 0.25, duration: 90,
      yoyo: true, repeat: 6,
      onComplete: () => this.player.setAlpha(1),
    });

    this.cameras.main.shake(220, 0.01);

    // Screen popup
    this.hitPopup
      .setText("💥 Ouch! -1 Life (Watch out!)")
      .setY(this.scale.height / 2 + 30)
      .setVisible(true).setAlpha(1);

    this.tweens.add({
      targets: this.hitPopup,
      y: this.scale.height / 2 - 20,
      alpha: 0, duration: 1100, ease: "Cubic.easeOut",
      onComplete: () => this.hitPopup.setVisible(false),
    });

    if (this.lives <= 0) {
      this.triggerGameOver("💀 No lives left!\nThe offerings were lost along the journey...");
    }
  }

  // ═══════════════════════════════════════════
  //  REACH TEMPLE SANCTUM (VICTORY)
  // ═══════════════════════════════════════════
  onReachTemple() {
    if (!this.allCollected || this.levelComplete || this.gameOver) return;

    this.levelComplete = true;
    if (this.timerEvent) this.timerEvent.remove();

    if (this._guideBanner) { this._guideBanner.destroy(); this._guideBanner = null; }
    if (this._templeArrow) { this._templeArrow.destroy(); this._templeArrow = null; }

    this.player.body.setVelocity(0);
    this.cameras.main.stopFollow();
    this.player.anims.play("walk-up", true);

    this.soundFX.stopBGM();
    this.soundFX.playVictory();

    // Devotee enters sanctum and bows respectfully
    this.tweens.add({
      targets: this.player,
      y: TEMPLE_SANCTUM_Y - 30,
      alpha: 0, duration: 1100, ease: "Cubic.easeOut",
    });

    this.cameras.main.fade(1200, 0, 0, 0);

    this.time.delayedCall(1400, () => {
      this.cameras.main.resetFX();
      this._showVictoryScreen();
    });
  }

  // ═══════════════════════════════════════════
  //  VICTORY CELEBRATION EFFECTS
  // ═══════════════════════════════════════════
  launchCelebrationEffects() {
    const petalColors = [0xffa000, 0xff5722, 0xe91e63, 0xffd54f, 0xf06292, 0xff1744];
    for (let i = 0; i < 45; i++) {
      const startX = Phaser.Math.Between(20, this.scale.width - 20);
      const color = petalColors[i % petalColors.length];
      const petal = this.add.ellipse(startX, -20, Phaser.Math.Between(8, 14), Phaser.Math.Between(12, 20), color, 0.9)
        .setScrollFactor(0).setDepth(620);

      const fallDuration = Phaser.Math.Between(2800, 4800);
      const swayDist = Phaser.Math.Between(30, 80);

      this.tweens.add({
        targets: petal,
        y: this.scale.height + 40,
        x: startX + Phaser.Math.Between(-swayDist, swayDist),
        angle: Phaser.Math.Between(-360, 360),
        duration: fallDuration,
        delay: Phaser.Math.Between(0, 1400),
        ease: "Sine.easeInOut",
        onComplete: () => petal.destroy(),
      });
    }

    const burstPoints = [
      { x: this.scale.width * 0.25, y: this.scale.height * 0.3 },
      { x: this.scale.width * 0.75, y: this.scale.height * 0.3 },
      { x: this.scale.width * 0.5, y: this.scale.height * 0.2 },
    ];

    burstPoints.forEach((pt, bIdx) => {
      this.time.delayedCall(300 + bIdx * 300, () => {
        const ring = this.add.circle(pt.x, pt.y, 8, 0xffd700, 0.9).setScrollFactor(0).setDepth(610);
        this.tweens.add({
          targets: ring,
          scaleX: 9, scaleY: 9, alpha: 0,
          duration: 650, ease: "Cubic.easeOut",
          onComplete: () => ring.destroy(),
        });
      });
    });
  }

  // ═══════════════════════════════════════════
  //  VICTORY MODAL & PLAYER NAME INPUT
  // ═══════════════════════════════════════════
  _showVictoryScreen() {
    this.launchCelebrationEffects();

    const offeringsScore = this.score;
    const timeBonus      = Math.max(0, this.timeLeft * 2);
    const livesBonus     = Math.max(0, this.lives * 50);
    const finalScore     = offeringsScore + timeBonus + livesBonus;

    let stars = 1;
    let starTitle = "⭐ REACHED THE SANCTUM!";
    if (this.allCollected && this.lives >= 2 && this.timeLeft >= 30) {
      stars = 3;
      starTitle = "⭐⭐⭐ DIVINE BLESSINGS!";
    } else if (this.allCollected) {
      stars = 2;
      starTitle = "⭐⭐☆ DEVOTED SEVA!";
    }

    // Modal Dim Overlay
    this.add.rectangle(
      this.scale.width / 2, this.scale.height / 2,
      this.scale.width, this.scale.height, 0x000000, 0.82
    ).setScrollFactor(0).setDepth(600);

    // Card background
    const cardW = 560;
    const cardH = 540;
    const card = this.add.rectangle(
      this.scale.width / 2, this.scale.height / 2, cardW, cardH, 0x23140a, 0.97
    ).setScrollFactor(0).setDepth(650);
    card.setStrokeStyle(4, 0xffd700);

    // Title
    const titleText = this.add.text(
      this.scale.width / 2, this.scale.height / 2 - 215,
      "🏆 LEVEL COMPLETE! 🏆", {
        fontSize: "30px", fontStyle: "bold", color: "#ffd700",
        stroke: "#3d1f00", strokeThickness: 5,
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(700).setScale(0.2);

    this.tweens.add({
      targets: titleText, scale: 1, duration: 450, ease: "Back.easeOut",
    });

    // Subtitle
    this.add.text(
      this.scale.width / 2, this.scale.height / 2 - 170, starTitle, {
        fontSize: "19px", fontStyle: "bold", color: "#ffecb3",
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(700);

    // Animated Star Badges
    const starSpacing = 65;
    for (let i = 0; i < 3; i++) {
      const isEarned = i < stars;
      const s = this.add.text(
        this.scale.width / 2 + (i - 1) * starSpacing, this.scale.height / 2 - 120,
        isEarned ? "⭐" : "☆", { fontSize: "40px", color: isEarned ? "#ffd700" : "#757575" }
      ).setOrigin(0.5).setScrollFactor(0).setDepth(700).setScale(0);

      this.tweens.add({
        targets: s, scale: 1, duration: 350, delay: 200 + i * 180, ease: "Back.easeOut",
      });
    }

    // Stats Breakdown
    const statsText =
      `🌸 Offerings + Eco-Seva: ${offeringsScore} pts\n` +
      `⏱️ Time Left (${this.timeLeft}s): +${timeBonus} pts\n` +
      `❤️ Devotion Bonus (${this.lives} lives): +${livesBonus} pts\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏆 TOTAL SCORE: ${finalScore} pts`;

    this.add.text(
      this.scale.width / 2, this.scale.height / 2 + 5, statsText, {
        fontSize: "16px", color: "#ffffff",
        backgroundColor: "#160b05aa", padding: { x: 20, y: 12 },
        align: "center", lineSpacing: 6,
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(700);

    // Player Name Prompt & Save to Leaderboard
    let enteredName = localStorage.getItem("ganesha_last_player_name") || "";
    const nameLabel = this.add.text(
      this.scale.width / 2, this.scale.height / 2 + 105,
      enteredName ? `Devotee: ${enteredName}` : "Tap here to set your Leaderboard Name", {
        fontSize: "15px", fontStyle: "bold", color: "#ffd700",
        backgroundColor: "#3e2723", padding: { x: 16, y: 6 },
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(700).setInteractive({ useHandCursor: true });

    nameLabel.on("pointerdown", () => {
      const inputName = window.prompt("Enter your name for the Festival Leaderboard:", enteredName || "");
      if (inputName && inputName.trim()) {
        enteredName = inputName.trim().slice(0, 24);
        localStorage.setItem("ganesha_last_player_name", enteredName);
        nameLabel.setText(`Devotee: ${enteredName}`);
        saveScore(enteredName, finalScore, stars, this.timeLeft);
      }
    });

    // Save default score immediately
    try {
      const best = parseInt(localStorage.getItem("ganesha_high_score") || "0", 10);
      if (finalScore > best) localStorage.setItem("ganesha_high_score", finalScore.toString());
      localStorage.setItem("ganesha_stars", Math.max(stars, parseInt(localStorage.getItem("ganesha_stars") || "0", 10)).toString());
      saveScore(enteredName || "Festival Volunteer", finalScore, stars, this.timeLeft);
    } catch (e) {}

    // Action Buttons
    const btnY = this.scale.height / 2 + 175;
    const createBtn = (label, xOffset, bgHex, onClick) => {
      const btn = this.add.text(this.scale.width / 2 + xOffset, btnY, label, {
        fontSize: "16px", fontStyle: "bold", color: "#ffffff",
        backgroundColor: bgHex, padding: { x: 14, y: 10 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(700).setInteractive({ useHandCursor: true });

      btn.on("pointerover", () => { btn.setScale(1.06); btn.setStyle({ color: "#ffd700" }); });
      btn.on("pointerout",  () => { btn.setScale(1.0);  btn.setStyle({ color: "#ffffff" }); });
      btn.on("pointerdown", onClick);
      return btn;
    };

    createBtn("🔄 Play Again", -150, "#d84315", () => {
      this.soundFX.stopBGM();
      this.scene.restart();
    });

    createBtn("🏠 Home", 0, "#4e342e", () => {
      this.soundFX.stopBGM();
      window.dispatchEvent(new CustomEvent("nav-home"));
    });

    createBtn("🏆 Leaderboard", 150, "#1565c0", () => {
      this.soundFX.stopBGM();
      sessionStorage.setItem("open_modal", "leaderboard");
      window.dispatchEvent(new CustomEvent("nav-home"));
    });
  }

  // ═══════════════════════════════════════════
  //  GAME OVER
  // ═══════════════════════════════════════════
  triggerGameOver(reason) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.timerEvent.remove();
    this.soundFX.stopBGM();

    this.player.body.setVelocity(0);
    this.cameras.main.stopFollow();
    this.cameras.main.shake(400, 0.015);

    this.add.rectangle(
      this.scale.width / 2, this.scale.height / 2,
      this.scale.width, this.scale.height, 0x000000, 0.75
    ).setScrollFactor(0).setDepth(600);

    const card = this.add.rectangle(
      this.scale.width / 2, this.scale.height / 2, 500, 360, 0x2a0d0d, 0.95
    ).setScrollFactor(0).setDepth(650);
    card.setStrokeStyle(3, 0xff4444);

    this.add.text(this.scale.width / 2, this.scale.height / 2 - 120, "💔 Game Over", {
      fontSize: "36px", fontStyle: "bold", color: "#ff5252",
      stroke: "#220000", strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(700);

    this.add.text(this.scale.width / 2, this.scale.height / 2 - 20, `${reason}\n\n⭐ Score Achieved: ${this.score} pts`, {
      fontSize: "18px", color: "#ffffff", backgroundColor: "#18050588",
      padding: { x: 18, y: 14 }, align: "center", lineSpacing: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(700);

    const retryBtn = this.add.text(this.scale.width / 2 - 100, this.scale.height / 2 + 115, "🔄  Try Again", {
      fontSize: "19px", fontStyle: "bold", color: "#ffffff",
      backgroundColor: "#c0392b", padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(700).setInteractive({ useHandCursor: true });

    retryBtn.on("pointerdown", () => {
      this.soundFX.stopBGM();
      this.scene.restart();
    });

    const menuBtn = this.add.text(this.scale.width / 2 + 100, this.scale.height / 2 + 115, "🏠  Main Menu", {
      fontSize: "19px", fontStyle: "bold", color: "#ffffff",
      backgroundColor: "#424242", padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(700).setInteractive({ useHandCursor: true });

    menuBtn.on("pointerdown", () => {
      this.soundFX.stopBGM();
      window.dispatchEvent(new CustomEvent("nav-home"));
    });
  }

  // ═══════════════════════════════════════════
  //  UPDATE (every frame)
  // ═══════════════════════════════════════════
  update() {
    if (this.isGamePaused || this.gameOver || this.levelComplete) return;

    const speed = 220;
    let vx = 0;
    let vy = 0;
    let moving = false;
    let dir = this._lastDir;

    // Keyboard Input
    if (this.cursors.left.isDown || this.keys.A.isDown) {
      vx -= 1;
      dir = "left";
      moving = true;
    }
    if (this.cursors.right.isDown || this.keys.D.isDown) {
      vx += 1;
      dir = "right";
      moving = true;
    }
    if (this.cursors.up.isDown || this.keys.W.isDown) {
      vy -= 1;
      dir = "up";
      moving = true;
    }
    if (this.cursors.down.isDown || this.keys.S.isDown) {
      vy += 1;
      dir = "down";
      moving = true;
    }

    // Touch / On-screen D-pad input
    if (this.isTouchActive && (this.touchVector.x !== 0 || this.touchVector.y !== 0)) {
      vx = this.touchVector.x;
      vy = this.touchVector.y;
      moving = true;
      if (Math.abs(vx) > Math.abs(vy)) {
        dir = vx > 0 ? "right" : "left";
      } else {
        dir = vy > 0 ? "down" : "up";
      }
    }

    if (moving) {
      const len = Math.hypot(vx, vy);
      if (len > 0) {
        this.player.body.setVelocity((vx / len) * speed, (vy / len) * speed);
      }
      this._lastDir = dir;
      this.player.anims.play(`walk-${dir}`, true);

      if (!this.soundFX.bgmPlaying && !this.soundFX.isMuted) {
        this.soundFX.startBGM();
      }
    } else {
      this.player.body.setVelocity(0);
      this.player.anims.play("idle", true);
    }

    // Collectibles Proximity Glow
    if (this.collectiblesGroup) {
      const px = this.player.x;
      const py = this.player.y;
      this.collectiblesGroup.getChildren().forEach((item) => {
        if (!item || !item.active || !item.glowRef) return;
        const dist = Phaser.Math.Distance.Between(px, py, item.x, item.y);
        if (dist < 140) {
          const factor = 1 - dist / 140;
          item.glowRef.setAlpha(0.35 + factor * 0.45);
          item.glowRef.setScale(1.2 + factor * 0.6);
        } else {
          item.glowRef.setAlpha(0.25);
          item.glowRef.setScale(1.0);
        }
      });
    }

    // Update Temple Guide Arrow
    if (this._templeArrow && this.allCollected && !this.levelComplete) {
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, TEMPLE_GATE_X, TEMPLE_GATE_Y);
      this._templeArrow.setPosition(
        this.player.x + Math.cos(angle) * 55,
        this.player.y + Math.sin(angle) * 55
      );
      this._templeArrow.setRotation(angle);
    }
  }
}

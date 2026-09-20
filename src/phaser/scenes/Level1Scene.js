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

  // ─── NEW: Aarti Blessing – temple bells + conch resonance ───
  playAartiBlessing() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // Rising temple bell sequence (Panchamrit melody)
      const bellNotes = [
        { f: 392.00, t: 0.00, d: 0.8 },   // G4
        { f: 523.25, t: 0.20, d: 0.8 },   // C5
        { f: 659.25, t: 0.40, d: 0.8 },   // E5
        { f: 783.99, t: 0.60, d: 1.0 },   // G5
        { f: 1046.50, t: 0.90, d: 1.6 },  // C6 – Aarti peak
      ];
      bellNotes.forEach(note => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(note.f, now + note.t);
        g.gain.setValueAtTime(0.22, now + note.t);
        g.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);
        osc.connect(g); g.connect(this.masterGain);
        osc.start(now + note.t); osc.stop(now + note.t + note.d);
      });
      // Conch resonance (low, warm drone)
      const conch = this.ctx.createOscillator();
      const conchG = this.ctx.createGain();
      conch.type = "sawtooth";
      conch.frequency.setValueAtTime(130.81, now + 0.5);  // C3
      conch.frequency.exponentialRampToValueAtTime(174.61, now + 2.5); // F3
      conchG.gain.setValueAtTime(0.0, now + 0.5);
      conchG.gain.linearRampToValueAtTime(0.09, now + 1.0);
      conchG.gain.exponentialRampToValueAtTime(0.001, now + 3.0);
      conch.connect(conchG); conchG.connect(this.masterGain);
      conch.start(now + 0.5); conch.stop(now + 3.0);
    } catch (e) {}
  }
}

export default class Level1Scene extends Phaser.Scene {
  constructor() {
    super("Level1Scene");
  }

  getDeviceScale() {
    try {
      const vw = window.innerWidth || 1280;
      const vh = window.innerHeight || 720;
      if (vw <= 420) return { card: 0.56, dock: 0.52, text: 0.7, pad: 0.72, modal: 0.7, isMobile: true };
      if (vw <= 560) return { card: 0.68, dock: 0.64, text: 0.8, pad: 0.82, modal: 0.8, isMobile: true };
      if (vw <= 768) return { card: 0.82, dock: 0.78, text: 0.9, pad: 0.92, modal: 0.9, isMobile: true };
      return { card: 1, dock: 1, text: 1, pad: 1, modal: 1, isMobile: false };
    } catch (e) {
      return { card: 1, dock: 1, text: 1, pad: 1, modal: 1, isMobile: false };
    }
  }

  // ═══════════════════════════════════════════
  //  CREATE
  // ═══════════════════════════════════════════
  create() {
    this.soundFX = new SoundFX();

    this.ds = this.getDeviceScale();

    const W = this.scale.width;
    const H = this.scale.height;

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

    // Combo / Sprint state
    this.comboCount     = 0;
    this.lastCollectTime = 0;
    this.sprintActive   = false;
    this.sprintTimer    = null;

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
    // Responsive HUD threshold: higher on mobile since stacked HUD takes more top space
    const steerTopThreshold = this.ds.isMobile ? 150 : 100;
    // D-Pad area at bottom-left: skip drag-steer there so D-Pad works cleanly
    const steerPadSafeX = this.ds.isMobile ? 220 : 240;
    const steerPadSafeY = this.ds.isMobile ? 540 : 560;

    this.input.on("pointermove", (pointer) => {
      if (pointer.isDown && !this.isGamePaused && !this.gameOver && !this.levelComplete) {
        const inDpadZone = pointer.x < steerPadSafeX && pointer.y > steerPadSafeY;
        if (pointer.y > steerTopThreshold && !inDpadZone) {
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
    //  HUD: TOP BAR GLASSMORPHISM (Responsive)
    // ─────────────────────────────────────
    const cs = this.ds.card;
    const ts = this.ds.text;
    const dsDock = this.ds.dock;

    const cardPad = this.ds.isMobile ? 10 : 20;
    const prasadCardW = Math.round(230 * cs);
    const prasadCardH = Math.round(54 * cs);
    const prasadCardX = W - prasadCardW / 2 - cardPad;
    const prasadCardY = this.ds.isMobile ? 28 : 38;

    const drawCardCorners = (cx, cy, w, h) => {
      const cornerLen = Math.round(10 * cs);
      const col = 0xffd700;
      const t = Math.max(1, Math.round(2 * cs));
      this.add.line(0, 0, cx - w/2 + cornerLen, cy - h/2, cx - w/2, cy - h/2, col, 1).setLineWidth(t).setScrollFactor(0).setDepth(201);
      this.add.line(0, 0, cx - w/2, cy - h/2 + cornerLen, cx - w/2, cy - h/2, col, 1).setLineWidth(t).setScrollFactor(0).setDepth(201);
      this.add.line(0, 0, cx + w/2 - cornerLen, cy - h/2, cx + w/2, cy - h/2, col, 1).setLineWidth(t).setScrollFactor(0).setDepth(201);
      this.add.line(0, 0, cx + w/2, cy - h/2 + cornerLen, cx + w/2, cy - h/2, col, 1).setLineWidth(t).setScrollFactor(0).setDepth(201);
      this.add.line(0, 0, cx - w/2 + cornerLen, cy + h/2, cx - w/2, cy + h/2, col, 1).setLineWidth(t).setScrollFactor(0).setDepth(201);
      this.add.line(0, 0, cx - w/2, cy + h/2 - cornerLen, cx - w/2, cy + h/2, col, 1).setLineWidth(t).setScrollFactor(0).setDepth(201);
      this.add.line(0, 0, cx + w/2 - cornerLen, cy + h/2, cx + w/2, cy + h/2, col, 1).setLineWidth(t).setScrollFactor(0).setDepth(201);
      this.add.line(0, 0, cx + w/2, cy + h/2 - cornerLen, cx + w/2, cy + h/2, col, 1).setLineWidth(t).setScrollFactor(0).setDepth(201);
    };

    this.add.rectangle(prasadCardX, prasadCardY, prasadCardW, prasadCardH, 0x1d1007, 0.95)
      .setStrokeStyle(Math.max(1, Math.round(2 * cs)), 0xffd700, 0.9)
      .setScrollFactor(0).setDepth(200);
    drawCardCorners(prasadCardX, prasadCardY, prasadCardW, prasadCardH);

    const prasadIconX = prasadCardX - prasadCardW / 2 + Math.round(28 * cs);
    this.add.text(prasadIconX, prasadCardY - Math.round(8 * cs), "🍬", {
      fontSize: `${Math.round(26 * cs)}px`,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    const prasadValX = prasadCardX + Math.round(12 * cs);
    this.scoreText = this.add.text(prasadValX, prasadCardY - Math.round(10 * cs), "0", {
      fontSize: `${Math.round(26 * cs)}px`, fontStyle: "bold", color: "#ffffff",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.add.text(prasadValX, prasadCardY + Math.round(14 * cs), "PRASAD", {
      fontSize: `${Math.max(8, Math.round(11 * ts))}px`, fontStyle: "bold", color: "#ffb74d",
      letterSpacing: "1.5px",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    // 2. Top-Left Best Score Card
    const bestCardW = Math.round(230 * cs);
    const bestCardH = Math.round(54 * cs);
    const bestCardX = bestCardW / 2 + cardPad;
    const bestCardY = prasadCardY;

    this.add.rectangle(bestCardX, bestCardY, bestCardW, bestCardH, 0x1d1007, 0.95)
      .setStrokeStyle(Math.max(1, Math.round(2 * cs)), 0xffd700, 0.9)
      .setScrollFactor(0).setDepth(200);
    drawCardCorners(bestCardX, bestCardY, bestCardW, bestCardH);

    const bestIconX = bestCardX - bestCardW / 2 + Math.round(28 * cs);
    this.add.text(bestIconX, bestCardY - Math.round(8 * cs), "🏆", {
      fontSize: `${Math.round(26 * cs)}px`,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    let storedBest = 0;
    try {
      storedBest = parseInt(localStorage.getItem("ganesha_high_score") || "0", 10);
    } catch (e) {}
    this.storedBest = storedBest;

    const bestValX = bestCardX + Math.round(12 * cs);
    this.bestScoreText = this.add.text(bestValX, bestCardY - Math.round(10 * cs), storedBest.toString(), {
      fontSize: `${Math.round(26 * cs)}px`, fontStyle: "bold", color: "#ffffff",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.add.text(bestValX, bestCardY + Math.round(14 * cs), "BEST SCORE", {
      fontSize: `${Math.max(8, Math.round(11 * ts))}px`, fontStyle: "bold", color: "#ffb74d",
      letterSpacing: "1.5px",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    // 3. Top-Center Offerings Quest Dock (Responsive)
    const dockW = Math.round(540 * dsDock);
    const dockH = Math.round(70 * dsDock);
    const dockX = W / 2;
    const dockY = this.ds.isMobile ? prasadCardY + prasadCardH / 2 + dockH / 2 + Math.round(12 * dsDock) : 110;

    this.add.rectangle(dockX, dockY, dockW, dockH, 0x1d1007, 0.92)
      .setStrokeStyle(Math.max(1, Math.round(2 * dsDock)), 0xffd700, 0.9)
      .setScrollFactor(0).setDepth(200);

    this.add.text(dockX, dockY - Math.round(22 * dsDock), "🛕 SACRED OFFERINGS FOR GANESHA", {
      fontSize: `${Math.max(8, Math.round(11 * ts * dsDock))}px`, fontStyle: "bold", color: "#ffecb3",
      stroke: "#2a1500", strokeThickness: Math.max(1, Math.round(2 * dsDock)),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    const TRACKER_ORDER = ["🌸", "🌿", "🍬", "🥥", "🪔"];
    const badgeSpacing = Math.round(100 * dsDock);
    const startX = dockX - Math.round(200 * dsDock);
    const _progressBarWidth = Math.round(480 * dsDock);
    const badgePad = this.ds.isMobile ? { x: Math.round(5 * dsDock), y: Math.round(2 * dsDock) } : { x: 7, y: 3 };

    TRACKER_ORDER.forEach((emoji, idx) => {
      const t = this.tracker[emoji];
      const bx = startX + idx * badgeSpacing;
      t.badgeObj = this.add.text(bx, dockY + Math.round(6 * dsDock), `${emoji} 0/${t.total}`, {
        fontSize: `${Math.max(10, Math.round(13 * ts * dsDock))}px`, fontStyle: "bold", color: "#ffffff",
        backgroundColor: "#3e2723", padding: badgePad,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    });

    this.progressBarBg = this.add.rectangle(dockX, dockY + Math.round(30 * dsDock), _progressBarWidth, Math.max(4, Math.round(6 * dsDock)), 0x3e2723)
      .setScrollFactor(0).setDepth(201);
    this.progressBarFill = this.add.rectangle(dockX - _progressBarWidth / 2, dockY + Math.round(30 * dsDock), 0, Math.max(4, Math.round(6 * dsDock)), 0xffd700)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(202);
    this._progressBarMaxW = _progressBarWidth;

    // 4. Vitals Row (Lives + Timer)
    const vitalsX = this.ds.isMobile ? 14 : 28;
    const livesY = this.ds.isMobile ? bestCardY + bestCardH / 2 + 18 : 92;
    this.livesText = this.add.text(vitalsX, livesY, "❤️ ❤️ ❤️", {
      fontSize: `${Math.max(12, Math.round(18 * ts))}px`, color: "#ff4d4d",
    }).setScrollFactor(0).setDepth(201);

    this.timerText = this.add.text(vitalsX, livesY + Math.round(this.ds.isMobile ? 22 : 26), `⏱️ TIME: ${TIME_LIMIT}s`, {
      fontSize: `${Math.max(11, Math.round(15 * ts))}px`, fontStyle: "bold", color: "#64b5f6",
      stroke: "#001a33", strokeThickness: Math.max(1, Math.round(2 * ts)),
    }).setScrollFactor(0).setDepth(201);

    // 5. Menu Button + Sound Toggle at Top-Right Corner (Responsive)
    const hudBtnMenuPadX = this.ds.isMobile ? Math.round(8 * cs) : 20;
    const hudBtnMenuY = this.ds.isMobile ? dockY + dockH / 2 + 22 : 100;
    const menuPad = this.ds.isMobile ? { x: Math.round(6 * cs), y: 1 } : { x: 8, y: 1 };
    this.hudMenuBtn = this.add.text(W - hudBtnMenuPadX, hudBtnMenuY, "☰", {
      fontSize: `${Math.max(16, Math.round(26 * cs))}px`, fontStyle: "bold", color: "#ffd700",
      backgroundColor: "#1d1007", padding: menuPad,
      stroke: "#ffd700", strokeThickness: Math.max(1, Math.round(1 * cs)),
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(300).setInteractive({ useHandCursor: true });
    this.hudMenuBtn.on("pointerdown", () => this.togglePause());
    this.hudMenuBtn.on("pointerover", () => this.hudMenuBtn.setStyle({ color: "#ffffff" }));
    this.hudMenuBtn.on("pointerout", () => this.hudMenuBtn.setStyle({ color: "#ffd700" }));

    // 5b. HUD Quick Sound Toggle Button (🔊/🔇)
    const _muteIcon = () => this.soundFX.isMuted ? "🔇" : "🔊";
    const soundBtnPadX = this.ds.isMobile ? Math.round(hudBtnMenuPadX + 52 * cs) : 76;
    const soundPad = this.ds.isMobile ? { x: Math.round(5 * cs), y: Math.round(2 * cs) } : { x: 7, y: 2 };
    this.hudSoundBtn = this.add.text(W - soundBtnPadX, hudBtnMenuY, _muteIcon(), {
      fontSize: `${Math.max(14, Math.round(22 * cs))}px`, color: "#ffd700",
      backgroundColor: "#1d1007", padding: soundPad,
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(300).setInteractive({ useHandCursor: true });
    this.hudSoundBtn.on("pointerdown", () => {
      const muted = this.soundFX.toggleMute();
      this.hudSoundBtn.setText(muted ? "🔇" : "🔊");
      this.soundFX.playClick();
    });
    this.hudSoundBtn.on("pointerover", () => this.hudSoundBtn.setAlpha(0.75));
    this.hudSoundBtn.on("pointerout",  () => this.hudSoundBtn.setAlpha(1.0));

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
  //  TOUCH D-PAD CONTROLS (Responsive)
  // ═══════════════════════════════════════════
  createTouchControls() {
    const W = this.scale.width;
    const H = this.scale.height;
    const ps = this.ds.pad;
    const ts = this.ds.text;

    const btnSize = Math.round(56 * ps);
    const btnGap = Math.round(56 * ps);
    const padPadX = this.ds.isMobile ? Math.round(60 * ps) : 80;
    const padPadY = this.ds.isMobile ? Math.round(80 * ps) : 100;
    const padX = padPadX;
    const padY = H - padPadY;

    const padContainer = this.add.container(padX, padY).setScrollFactor(0).setDepth(300);

    const held = { up: false, down: false, left: false, right: false };
    const updateVector = () => {
      let vx = 0, vy = 0;
      if (held.up)    vy -= 1;
      if (held.down)  vy += 1;
      if (held.left)  vx -= 1;
      if (held.right) vx += 1;
      if (vx !== 0 || vy !== 0) {
        const len = Math.hypot(vx, vy);
        this.touchVector = { x: vx / len, y: vy / len };
        this.isTouchActive = true;
      } else {
        this.touchVector = { x: 0, y: 0 };
        this.isTouchActive = false;
      }
    };

    const makeBtn = (bx, by, label, dir) => {
      const bg = this.add.circle(bx, by, btnSize / 2, 0x221105, 0.75)
        .setStrokeStyle(Math.max(1.5, Math.round(2.5 * ps)), 0xffd700, 0.9)
        .setInteractive({ useHandCursor: true });

      const text = this.add.text(bx, by, label, {
        fontSize: `${Math.max(14, Math.round(22 * ts * ps))}px`, fontStyle: "bold", color: "#ffd700",
      }).setOrigin(0.5);

      const press = () => {
        held[dir] = true;
        updateVector();
        bg.setFillStyle(0xd84315, 0.9);
      };
      const release = () => {
        held[dir] = false;
        updateVector();
        bg.setFillStyle(0x221105, 0.75);
      };

      bg.on("pointerdown", press);
      bg.on("pointerup", release);
      bg.on("pointerout", release);
      bg.on("pointerleave", release);
      bg.on("pointercancel", release);

      return [bg, text];
    };

    const upBtn    = makeBtn(0,  -btnGap, "▲", "up");
    const downBtn  = makeBtn(0,   btnGap, "▼", "down");
    const leftBtn  = makeBtn(-btnGap,  0, "◀", "left");
    const rightBtn = makeBtn(btnGap,   0, "▶", "right");

    padContainer.add([...upBtn, ...downBtn, ...leftBtn, ...rightBtn]);

    // Mobile-only: Sprint hint label near D-Pad
    if (this.ds.isMobile) {
      const hint = this.add.text(0, btnGap + btnSize / 2 + 18, "Hold ▲▼◀▶ to walk", {
        fontSize: `${Math.max(9, Math.round(12 * ts))}px`,
        color: "#ffecb3",
        backgroundColor: "#1a0b04cc",
        padding: { x: 6, y: 3 },
      }).setOrigin(0.5);
      padContainer.add(hint);
    }
  }

  // ═══════════════════════════════════════════
  //  PAUSE MENU (Responsive)
  // ═══════════════════════════════════════════
  createPauseMenu() {
    const W = this.scale.width;
    const H = this.scale.height;
    const ms = this.ds.modal;
    const ts = this.ds.text;

    this.pauseContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(800).setVisible(false);

    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setInteractive();

    const cardW = Math.round(460 * ms);
    const cardH = Math.round(520 * ms);
    const card = this.add.rectangle(W / 2, H / 2, cardW, cardH, 0x241208, 0.96);
    card.setStrokeStyle(Math.max(2, Math.round(3 * ms)), 0xffd700);

    const titlePad = Math.round(200 * ms);
    const title = this.add.text(W / 2, H / 2 - titlePad, "⏸️  PAUSED", {
      fontSize: `${Math.max(18, Math.round(30 * ms * ts))}px`, fontStyle: "bold", color: "#ffd700",
      stroke: "#3d1f00", strokeThickness: Math.max(2, Math.round(4 * ms)),
    }).setOrigin(0.5);

    const statsPad = Math.round(120 * ms);
    const statsPadX = this.ds.isMobile ? { x: Math.round(14 * ms), y: Math.round(8 * ms) } : { x: 20, y: 10 };
    this.pauseStatsText = this.add.text(W / 2, H / 2 - statsPad, "", {
      fontSize: `${Math.max(10, Math.round(15 * ts * ms))}px`, color: "#ffffff",
      backgroundColor: "#1c0d05aa",
      padding: statsPadX, align: "center", lineSpacing: Math.max(3, Math.round(6 * ms)),
    }).setOrigin(0.5);

    const btnSpacing = this.ds.isMobile ? 44 : 55;
    const btnPad = this.ds.isMobile ? { x: Math.round(18 * ms), y: Math.round(8 * ms) } : { x: 28, y: 9 };

    const resumeBtn = this.add.text(W / 2, H / 2 - Math.round(30 * ms), "▶️  Resume Game", {
      fontSize: `${Math.max(12, Math.round(18 * ts * ms))}px`, fontStyle: "bold", color: "#ffffff",
      backgroundColor: "#d84315", padding: btnPad,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    resumeBtn.on("pointerdown", () => this.togglePause());

    const restartBtn = this.add.text(W / 2, H / 2 - Math.round(30 * ms) + btnSpacing, "🔄  Restart Level", {
      fontSize: `${Math.max(12, Math.round(18 * ts * ms))}px`, fontStyle: "bold", color: "#ffffff",
      backgroundColor: "#4e342e", padding: btnPad,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    restartBtn.on("pointerdown", () => {
      this.soundFX.stopBGM();
      this.scene.restart();
    });

    const audioBtnPad = this.ds.isMobile ? { x: Math.round(16 * ms), y: Math.round(7 * ms) } : { x: 22, y: 8 };
    this.pauseAudioBtn = this.add.text(W / 2, H / 2 - Math.round(30 * ms) + btnSpacing * 2, "🔊  Audio: ON", {
      fontSize: `${Math.max(11, Math.round(16 * ts * ms))}px`, fontStyle: "bold", color: "#ffffff",
      backgroundColor: "#37474f", padding: audioBtnPad,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.pauseAudioBtn.on("pointerdown", () => {
      const isMuted = this.soundFX.toggleMute();
      this.pauseAudioBtn.setText(isMuted ? "🔇  Audio: OFF" : "🔊  Audio: ON");
    });

    this.pauseFSBtn = this.add.text(W / 2, H / 2 - Math.round(30 * ms) + btnSpacing * 3, "⛶  Fullscreen", {
      fontSize: `${Math.max(11, Math.round(16 * ts * ms))}px`, fontStyle: "bold", color: "#ffffff",
      backgroundColor: "#1565c0", padding: audioBtnPad,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.pauseFSBtn.on("pointerdown", () => {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().then(() => {
            this.pauseFSBtn.setText("🗗  Exit Fullscreen");
          }).catch(() => {});
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().then(() => {
            this.pauseFSBtn.setText("⛶  Fullscreen");
          }).catch(() => {});
        }
      }
    });

    const menuBtnPad = this.ds.isMobile ? { x: Math.round(16 * ms), y: Math.round(6 * ms) } : { x: 22, y: 7 };
    const menuBtn = this.add.text(W / 2, H / 2 - Math.round(30 * ms) + btnSpacing * 4, "🏠  Main Menu", {
      fontSize: `${Math.max(11, Math.round(16 * ts * ms))}px`, fontStyle: "bold", color: "#b0bec5",
      backgroundColor: "#212121", padding: menuBtnPad,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menuBtn.on("pointerdown", () => {
      this.soundFX.stopBGM();
      window.dispatchEvent(new CustomEvent("nav-home"));
    });

    this.pauseContainer.add([overlay, card, title, this.pauseStatsText, resumeBtn, restartBtn, this.pauseAudioBtn, this.pauseFSBtn, menuBtn]);
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
    // ── Combo Streak ──────────────────────────────────────
    const now = this.time.now;
    const COMBO_WINDOW = 3500; // ms between pickups to maintain streak
    if (now - this.lastCollectTime < COMBO_WINDOW) {
      this.comboCount = Math.min(this.comboCount + 1, 8);
    } else {
      this.comboCount = 1;
    }
    this.lastCollectTime = now;

    // Combo multiplier on score (x1 → x2 → x3 etc.)
    const comboMultiplier = 1 + Math.floor(this.comboCount / 2) * 0.5;
    const earnedPoints = Math.round(item.pointValue * comboMultiplier);
    this.score     += earnedPoints;
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
    const comboLabel = this.comboCount >= 2 ? ` ⚡x${this.comboCount}` : "";
    const floatLabel = this.add.text(ix, iy - 16, `${item.itemEmoji} +${earnedPoints}${comboLabel}`, {
      fontSize: "19px", fontStyle: "bold",
      color: this.comboCount >= 3 ? "#ffd700" : "#ffffff",
      stroke: "#2d1600", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(360);

    this.tweens.add({
      targets: floatLabel,
      y: iy - 80, alpha: 0, scale: this.comboCount >= 2 ? 1.45 : 1.25,
      duration: 900, ease: "Cubic.easeOut",
      onComplete: () => floatLabel.destroy(),
    });

    // ── Divine Sprint Boost (combo ≥ 3) ─────────────────────
    if (this.comboCount >= 3 && !this.sprintActive) {
      this.sprintActive = true;
      if (this.sprintTimer) this.sprintTimer.remove();
      this.sprintTimer = this.time.delayedCall(2500, () => { this.sprintActive = false; });

      const _ts = this.ds.text;
      const _dsDock = this.ds.dock;
      const sprintFont = `${Math.max(11, Math.round(17 * _ts * _dsDock))}px`;
      const sprintPad = this.ds.isMobile
        ? { x: Math.round(10 * _dsDock), y: Math.round(4 * _dsDock) }
        : { x: 14, y: 5 };
      const bannerStartY = this.ds.isMobile ? 165 + Math.round(60 * (1 - _dsDock)) : 165;
      const bannerEndY   = this.ds.isMobile ? 140 + Math.round(60 * (1 - _dsDock)) : 140;
      const sprintBanner = this.add.text(
        this.scale.width / 2, bannerStartY,
        `⚡ DIVINE SPEED! x${(1 + Math.floor(this.comboCount / 2) * 0.5).toFixed(1)} Combo Bonus!`,
        { fontSize: sprintFont, fontStyle: "bold", color: "#ffd700",
          stroke: "#3d1f00", strokeThickness: Math.max(2, Math.round(4 * _dsDock)),
          backgroundColor: "#2d1700cc", padding: sprintPad }
      ).setOrigin(0.5).setScrollFactor(0).setDepth(505);

      this.tweens.add({
        targets: sprintBanner, alpha: 0, y: bannerEndY,
        duration: 1800, delay: 700, ease: "Sine.easeIn",
        onComplete: () => sprintBanner.destroy(),
      });
    }

    this.scoreText.setText(this.score.toString());

    if (this.score > this.storedBest) {
      this.storedBest = this.score;
      if (this.bestScoreText) this.bestScoreText.setText(this.score.toString());
    }

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
    const barMaxW = this._progressBarMaxW || 480;
    this.tweens.add({
      targets: this.progressBarFill,
      width: progressFrac * barMaxW,
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

    this.scoreText.setText(this.score.toString());

    if (this.score > this.storedBest) {
      this.storedBest = this.score;
      if (this.bestScoreText) this.bestScoreText.setText(this.score.toString());
    }

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

    const W = this.scale.width;
    const H = this.scale.height;
    const ms = this.ds.modal;
    const ts = this.ds.text;

    // STEP 1: All offerings gathered banner
    const dimBg = this.add.rectangle(
      W / 2, H / 2, W, H, 0x000000, 0.55
    ).setScrollFactor(0).setDepth(750).setAlpha(0);

    this.tweens.add({ targets: dimBg, alpha: 0.55, duration: 400 });

    const bPad = this.ds.isMobile
      ? { x: Math.round(20 * ms), y: Math.round(12 * ms) }
      : { x: 28, y: 16 };
    const bannerText = this.add.text(
      W / 2, H / 2,
      "✨ All 18 Sacred Offerings Gathered! ✨\nThe Temple Gate is Opening...",
      {
        fontSize: `${Math.max(14, Math.round(24 * ms * ts))}px`, fontStyle: "bold", color: "#ffd700",
        stroke: "#3e1700", strokeThickness: Math.max(2, Math.round(5 * ms)),
        backgroundColor: "#1f0c03ee", padding: bPad,
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

      const guideFont = `${Math.max(10, Math.round(15 * ts * ms))}px`;
      const guidePad = this.ds.isMobile
        ? { x: Math.round(14 * ms), y: Math.round(6 * ms) }
        : { x: 20, y: 8 };
      const guideY = this.ds.isMobile ? H - Math.round(60 + 100 * this.ds.pad) : H - 42;
      this._guideBanner = this.add.text(
        W / 2, guideY,
        "🛕 The Temple is open! Enter the inner sanctum for Aarti. 🛕",
        {
          fontSize: guideFont, fontStyle: "bold", color: "#ffffff",
          backgroundColor: "#d84315ee", padding: guidePad,
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
    // Aarti blessing chimes 1.2s after victory fanfare starts
    this.time.delayedCall(1200, () => this.soundFX.playAartiBlessing());

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

    const W = this.scale.width;
    const H = this.scale.height;
    const ms = this.ds.modal;
    const ts = this.ds.text;

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

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.82)
      .setScrollFactor(0).setDepth(600);

    const cardW = Math.round(580 * ms);
    const cardH = Math.round(560 * ms);
    const card = this.add.rectangle(W / 2, H / 2, cardW, cardH, 0x23140a, 0.97)
      .setScrollFactor(0).setDepth(650);
    card.setStrokeStyle(Math.max(2, Math.round(4 * ms)), 0xffd700);

    const titleText = this.add.text(W / 2, H / 2 - Math.round(225 * ms),
      "🏆 LEVEL COMPLETE! 🏆", {
        fontSize: `${Math.max(16, Math.round(28 * ms * ts))}px`, fontStyle: "bold", color: "#ffd700",
        stroke: "#3d1f00", strokeThickness: Math.max(2, Math.round(5 * ms)),
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(700).setScale(0.2);

    this.tweens.add({ targets: titleText, scale: 1, duration: 450, ease: "Back.easeOut" });

    this.add.text(W / 2, H / 2 - Math.round(175 * ms), starTitle, {
      fontSize: `${Math.max(11, Math.round(18 * ts * ms))}px`, fontStyle: "bold", color: "#ffecb3",
      stroke: "#3d1f00", strokeThickness: Math.max(1, Math.round(3 * ms)),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(700);

    const starSpacing = Math.round(65 * ms);
    for (let i = 0; i < 3; i++) {
      const isEarned = i < stars;
      const s = this.add.text(
        W / 2 + (i - 1) * starSpacing, H / 2 - Math.round(128 * ms),
        isEarned ? "⭐" : "☆",
        { fontSize: `${Math.max(20, Math.round(38 * ms))}px`, color: isEarned ? "#ffd700" : "#757575" }
      ).setOrigin(0.5).setScrollFactor(0).setDepth(700).setScale(0);

      this.tweens.add({
        targets: s, scale: 1, duration: 350, delay: 200 + i * 180, ease: "Back.easeOut",
      });
    }

    const blessingText = stars === 3
      ? "🙏 Ganpati Bappa Morya! 🙏\nMay Lord Ganesha bless you with wisdom, peace & auspicious beginnings."
      : "🙏 Ganpati Bappa Morya! 🙏\nThe sacred offerings have been placed. Lord Ganesha accepts your devotion.";
    const blessPad = this.ds.isMobile
      ? { x: Math.round(12 * ms), y: Math.round(5 * ms) }
      : { x: 16, y: 7 };
    const blessingLabel = this.add.text(W / 2, H / 2 - Math.round(68 * ms), blessingText, {
      fontSize: `${Math.max(9, Math.round(12 * ts * ms))}px`, fontStyle: "italic", color: "#ffe0b2",
      stroke: "#2a1000", strokeThickness: Math.max(1, Math.round(2 * ms)),
      backgroundColor: "#3e1a00cc", padding: blessPad,
      align: "center", lineSpacing: Math.max(2, Math.round(4 * ms)),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(700).setAlpha(0);
    this.tweens.add({ targets: blessingLabel, alpha: 1, duration: 800, delay: 400 });

    const statsText =
      `🌸 Offerings + Eco-Seva: ${offeringsScore} pts\n` +
      `⏱️ Time Left (${this.timeLeft}s): +${timeBonus} pts\n` +
      `❤️ Devotion Bonus (${this.lives} lives): +${livesBonus} pts\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏆 TOTAL SCORE: ${finalScore} pts`;

    const statsPad = this.ds.isMobile
      ? { x: Math.round(16 * ms), y: Math.round(8 * ms) }
      : { x: 22, y: 10 };
    this.add.text(W / 2, H / 2 + Math.round(25 * ms), statsText, {
      fontSize: `${Math.max(9, Math.round(15 * ts * ms))}px`, color: "#ffffff",
      backgroundColor: "#160b05ee", padding: statsPad,
      align: "center", lineSpacing: Math.max(3, Math.round(5 * ms)),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(700);

    let enteredName = localStorage.getItem("ganesha_last_player_name") || "";
    const namePad = this.ds.isMobile
      ? { x: Math.round(12 * ms), y: Math.round(5 * ms) }
      : { x: 16, y: 6 };
    const nameLabel = this.add.text(W / 2, H / 2 + Math.round(126 * ms),
      enteredName ? `👤 Devotee: ${enteredName} (Tap to edit)` : "✏️ Tap here to set your Leaderboard Name", {
        fontSize: `${Math.max(10, Math.round(14 * ts * ms))}px`, fontStyle: "bold", color: "#ffd700",
        backgroundColor: "#3e2723", padding: namePad,
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(700).setInteractive({ useHandCursor: true });

    nameLabel.on("pointerdown", () => {
      const inputName = window.prompt("Enter your name for the Festival Leaderboard:", enteredName || "");
      if (inputName && inputName.trim()) {
        enteredName = inputName.trim().slice(0, 24);
        localStorage.setItem("ganesha_last_player_name", enteredName);
        nameLabel.setText(`👤 Devotee: ${enteredName} (Tap to edit)`);
        saveScore(enteredName, finalScore, stars, this.timeLeft);
      }
    });

    try {
      const best = parseInt(localStorage.getItem("ganesha_high_score") || "0", 10);
      if (finalScore > best) localStorage.setItem("ganesha_high_score", finalScore.toString());
      localStorage.setItem("ganesha_last_score", finalScore.toString());
      localStorage.setItem("ganesha_stars", Math.max(stars, parseInt(localStorage.getItem("ganesha_stars") || "0", 10)).toString());
      saveScore(enteredName || "Festival Volunteer", finalScore, stars, this.timeLeft);
    } catch (e) {}

    const btnY = H / 2 + Math.round(192 * ms);
    const btnPad = this.ds.isMobile
      ? { x: Math.round(10 * ms), y: Math.round(8 * ms) }
      : { x: 14, y: 10 };
    const xOffset = this.ds.isMobile ? null : 150;
    const createBtn = (label, xIdx, bgHex, onClick) => {
      let bx;
      if (this.ds.isMobile) {
        const slots = [-1, 0, 1];
        bx = W / 2 + slots[xIdx] * (cardW / 2 - Math.round(30 * ms));
      } else {
        bx = W / 2 + (xIdx === 0 ? -150 : xIdx === 1 ? 0 : 150);
      }
      const btn = this.add.text(bx, btnY, label, {
        fontSize: `${Math.max(10, Math.round(16 * ts * ms))}px`, fontStyle: "bold", color: "#ffffff",
        backgroundColor: bgHex, padding: btnPad,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(700).setInteractive({ useHandCursor: true });

      btn.on("pointerover", () => { btn.setScale(1.06); btn.setStyle({ color: "#ffd700" }); });
      btn.on("pointerout",  () => { btn.setScale(1.0);  btn.setStyle({ color: "#ffffff" }); });
      btn.on("pointerdown", onClick);
      return btn;
    };

    createBtn("🔄 Play Again", 0, "#d84315", () => {
      this.soundFX.stopBGM();
      this.scene.restart();
    });

    createBtn("🏠 Home", 1, "#4e342e", () => {
      this.soundFX.stopBGM();
      window.dispatchEvent(new CustomEvent("nav-home"));
    });

    createBtn("🏆 Leaderboard", 2, "#1565c0", () => {
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

    const W = this.scale.width;
    const H = this.scale.height;
    const ms = this.ds.modal;
    const ts = this.ds.text;

    this.player.body.setVelocity(0);
    this.cameras.main.stopFollow();
    this.cameras.main.shake(400, 0.015);

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75)
      .setScrollFactor(0).setDepth(600);

    const cardW = Math.round(500 * ms);
    const cardH = Math.round(360 * ms);
    const card = this.add.rectangle(W / 2, H / 2, cardW, cardH, 0x2a0d0d, 0.95)
      .setScrollFactor(0).setDepth(650);
    card.setStrokeStyle(Math.max(2, Math.round(3 * ms)), 0xff4444);

    this.add.text(W / 2, H / 2 - Math.round(120 * ms), "💔 Game Over", {
      fontSize: `${Math.max(18, Math.round(36 * ms * ts))}px`, fontStyle: "bold", color: "#ff5252",
      stroke: "#220000", strokeThickness: Math.max(2, Math.round(5 * ms)),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(700);

    const msgPad = this.ds.isMobile
      ? { x: Math.round(14 * ms), y: Math.round(10 * ms) }
      : { x: 18, y: 14 };
    this.add.text(W / 2, H / 2 - Math.round(20 * ms), `${reason}\n\n⭐ Score Achieved: ${this.score} pts`, {
      fontSize: `${Math.max(11, Math.round(18 * ts * ms))}px`, color: "#ffffff", backgroundColor: "#18050588",
      padding: msgPad, align: "center", lineSpacing: Math.max(4, Math.round(8 * ms)),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(700);

    const btnY = H / 2 + Math.round(115 * ms);
    const btnPad = this.ds.isMobile
      ? { x: Math.round(14 * ms), y: Math.round(8 * ms) }
      : { x: 18, y: 10 };
    const btnFontSize = this.ds.isMobile
      ? `${Math.max(11, Math.round(19 * ts * ms))}px`
      : "19px";

    let retryX, menuX;
    if (this.ds.isMobile) {
      retryX = W / 2 - cardW / 4;
      menuX  = W / 2 + cardW / 4;
    } else {
      retryX = W / 2 - 100;
      menuX  = W / 2 + 100;
    }

    const retryBtn = this.add.text(retryX, btnY, "🔄  Try Again", {
      fontSize: btnFontSize, fontStyle: "bold", color: "#ffffff",
      backgroundColor: "#c0392b", padding: btnPad,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(700).setInteractive({ useHandCursor: true });

    retryBtn.on("pointerdown", () => {
      this.soundFX.stopBGM();
      this.scene.restart();
    });

    const menuBtn = this.add.text(menuX, btnY, "🏠  Main Menu", {
      fontSize: btnFontSize, fontStyle: "bold", color: "#ffffff",
      backgroundColor: "#424242", padding: btnPad,
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

    // Divine Sprint: boost speed when active after a combo
    const speed = this.sprintActive ? 290 : 220;
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

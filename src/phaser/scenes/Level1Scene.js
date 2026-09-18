import Phaser from "phaser";
import { saveScore } from "../../firebase/leaderboard";

// ─────────────────────────────────────────────
//  World dimensions
// ─────────────────────────────────────────────
const WORLD_W   = 2500;
const WORLD_H   = 1500;
const SPAWN_X   = 200;
const SPAWN_Y   = 200;
const TEMPLE_X  = 2200;
const TEMPLE_Y  = 1250;
const TIME_LIMIT = 120; // seconds

// ─────────────────────────────────────────────
//  Collectible definitions (fixed path positions)
// ─────────────────────────────────────────────
const COLLECTIBLES = [
  // 🌸 Flowers — right of spawn
  { emoji: "🌸", texture: "flower",  color: 0xff69b4, points: 10, x: 500,  y: 400  },
  { emoji: "🌸", texture: "flower",  color: 0xff69b4, points: 10, x: 700,  y: 300  },
  { emoji: "🌸", texture: "flower",  color: 0xff69b4, points: 10, x: 950,  y: 380  },
  { emoji: "🌸", texture: "flower",  color: 0xff69b4, points: 10, x: 1100, y: 250  },
  // 🌿 Durva — mid section
  { emoji: "🌿", texture: "durva",   color: 0x7cfc00, points: 15, x: 1250, y: 500  },
  { emoji: "🌿", texture: "durva",   color: 0x7cfc00, points: 15, x: 1450, y: 420  },
  { emoji: "🌿", texture: "durva",   color: 0x7cfc00, points: 15, x: 1650, y: 600  },
  // 🍬 Modaks — vertical path south
  { emoji: "🍬", texture: "modak",   color: 0xffa500, points: 20, x: 1250, y: 700  },
  { emoji: "🍬", texture: "modak",   color: 0xffa500, points: 20, x: 1250, y: 900  },
  { emoji: "🍬", texture: "modak",   color: 0xffa500, points: 20, x: 1350, y: 1050 },
  // 🥥 Coconuts — lower strip
  { emoji: "🥥", texture: "coconut", color: 0x8b4513, points: 25, x: 1600, y: 1250 },
  { emoji: "🥥", texture: "coconut", color: 0x8b4513, points: 25, x: 1800, y: 1250 },
  { emoji: "🥥", texture: "coconut", color: 0x8b4513, points: 25, x: 2000, y: 1300 },
  // 🪔 Diyas — near temple
  { emoji: "🪔", texture: "diya",    color: 0xffd700, points: 30, x: 2050, y: 1150 },
  { emoji: "🪔", texture: "diya",    color: 0xffd700, points: 30, x: 2150, y: 1050 },
];
// Max score = 280 pts

// Rock positions (deliberately placed on paths to create challenge)
const ROCK_SPOTS = [
  { x: 600,  y: 350, r: 20 }, { x: 850,  y: 280, r: 18 },
  { x: 1050, y: 460, r: 22 }, { x: 1300, y: 320, r: 19 },
  { x: 1250, y: 620, r: 21 }, { x: 1450, y: 750, r: 18 },
  { x: 1550, y: 1100,r: 20 }, { x: 1900, y: 1200,r: 22 },
  { x: 2100, y: 1000,r: 19 }, { x: 2250, y: 1150,r: 18 },
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

      // Master BGM gain
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.001, now);
      this.bgmGain.gain.linearRampToValueAtTime(0.09, now + 1.2);
      this.bgmGain.connect(this.masterGain);

      // Warm lowpass filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(360, now);
      filter.Q.setValueAtTime(2.0, now);
      filter.connect(this.bgmGain);

      // Drone 1: Root D3 (146.83 Hz) with subtle harmonic warmth
      this.bgmOsc1 = this.ctx.createOscillator();
      this.bgmOsc1.type = "sawtooth";
      this.bgmOsc1.frequency.setValueAtTime(146.83, now);
      const osc1Gain = this.ctx.createGain();
      osc1Gain.gain.setValueAtTime(0.3, now);
      this.bgmOsc1.connect(osc1Gain);
      osc1Gain.connect(filter);
      this.bgmOsc1.start(now);

      // Drone 2: Fifth A3 (220.0 Hz) pure sine
      this.bgmOsc2 = this.ctx.createOscillator();
      this.bgmOsc2.type = "sine";
      this.bgmOsc2.frequency.setValueAtTime(220.00, now);
      const osc2Gain = this.ctx.createGain();
      osc2Gain.gain.setValueAtTime(0.25, now);
      this.bgmOsc2.connect(osc2Gain);
      osc2Gain.connect(this.bgmGain);
      this.bgmOsc2.start(now);

      // Devotional Melody Bells (Raag Bhupali pentatonic: D4, E4, F#4, A4, B4, D5)
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
          g.gain.setValueAtTime(0.045, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
          osc.connect(g);
          g.connect(this.masterGain);
          osc.start(t);
          osc.stop(t + 2.4);
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
        this.bgmGain.gain.linearRampToValueAtTime(0.001, now + 0.6);
        setTimeout(() => {
          if (this.bgmOsc1) { try { this.bgmOsc1.stop(); this.bgmOsc1.disconnect(); } catch (e) {} this.bgmOsc1 = null; }
          if (this.bgmOsc2) { try { this.bgmOsc2.stop(); this.bgmOsc2.disconnect(); } catch (e) {} this.bgmOsc2 = null; }
        }, 700);
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
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.35);

      // Shimmer overtone
      const chime = this.ctx.createOscillator();
      const chimeG = this.ctx.createGain();
      chime.type = "triangle";
      chime.frequency.setValueAtTime(1174.66, now + 0.05); // D6
      chimeG.gain.setValueAtTime(0.09, now + 0.05);
      chimeG.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      chime.connect(chimeG);
      chimeG.connect(this.masterGain);
      chime.start(now + 0.05);
      chime.stop(now + 0.42);
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
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.25);
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
        const vol = 0.16 / (i + 1);
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
        g.gain.setValueAtTime(0.18 / (i + 1), now);
        g.gain.exponentialRampToValueAtTime(0.0005, now + 2.8);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 2.8);
      });
    } catch (e) {}
  }

  playVictory() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // Celebratory ascending fanfare
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
      g.gain.setValueAtTime(0.12, now);
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
    // ── Audio Synthesizer ──
    this.soundFX = new SoundFX();

    // ── State ──
    this.score          = 0;
    this.collected      = 0;
    this.totalItems     = COLLECTIBLES.length;
    this.lives          = 3;
    this.timeLeft       = TIME_LIMIT;
    this.allCollected   = false;
    this.gameOver       = false;
    this.levelComplete  = false;
    this.isInvincible   = false; // brief invincibility after rock hit

    // Per-type mission tracker (counts derived from COLLECTIBLES array)
    this.tracker = {
      "🌸": { label: "🌸 Flowers",  count: 0, total: 0, textObj: null },
      "🌿": { label: "🌿 Durva",    count: 0, total: 0, textObj: null },
      "🍬": { label: "🍬 Modak",    count: 0, total: 0, textObj: null },
      "🥥": { label: "🥥 Coconut",  count: 0, total: 0, textObj: null },
      "🪔": { label: "🪔 Diya",     count: 0, total: 0, textObj: null },
    };
    COLLECTIBLES.forEach(item => { this.tracker[item.emoji].total++; });

    // ─────────────────────────────────────
    //  WORLD & ENVIRONMENT
    // ─────────────────────────────────────
    this.cameras.main.setBackgroundColor("#87CEEB");

    // Replace background with beautiful AI-generated Temple Garden
    this.add.image(1250, 750, "temple").setDisplaySize(2500, 1500);

    // ─────────────────────────────────────
    //  TREES (Sprites with soft shadows)
    // ─────────────────────────────────────
    const TREE_POSITIONS = [
      { x: 200, y: 150 }, { x: 550, y: 120 }, { x: 950, y: 160 },
      { x: 1400,y: 130 }, { x: 1900,y: 140 }, { x: 2350,y: 170 },
      { x: 300, y: 500 }, { x: 750, y: 600 }, { x: 1200,y: 450 },
      { x: 1650,y: 550 }, { x: 2100,y: 480 }, { x: 120, y: 900 },
      { x: 600, y:1050 }, { x: 1100,y: 950 }, { x: 1700,y:1000 },
      { x: 400, y:1300 }, { x: 900, y:1350 }, { x: 1350,y:1200 },
      { x: 2000,y:1350 },
    ];

    TREE_POSITIONS.forEach(({ x, y }) => {
      // Tree shadow
      this.add.ellipse(x, y + 42, 64, 22, 0x000000, 0.22);
      if (this.textures.exists("tree")) {
        const treeSprite = this.add.image(x, y, "tree");
        treeSprite.setScale(0.5);
      } else {
        // Fallback procedural tree
        this.add.rectangle(x, y + 22, 14, 28, 0x6b3a1f);
        this.add.circle(x, y, 38, 0x1a7a1a);
      }
    });

    // ─────────────────────────────────────
    //  ROCKS (physics obstacles with sprites)
    // ─────────────────────────────────────
    this.rocksGroup = this.physics.add.staticGroup();

    ROCK_SPOTS.forEach(({ x, y, r }) => {
      // Soft ground shadow
      this.add.ellipse(x, y + r * 0.7, r * 2.2, r * 0.9, 0x000000, 0.25);

      const rock = this.physics.add.staticImage(x, y, "rock");
      rock.setScale(0.25);
      this.rocksGroup.add(rock);
    });
    this.rocksGroup.refresh();

    // ─────────────────────────────────────
    //  SACRED TEMPLE & GATE
    // ─────────────────────────────────────
    // Soft shadow under temple
    this.add.ellipse(TEMPLE_X, TEMPLE_Y + 70, 240, 60, 0x000000, 0.28);

    // Temple Sprite / Graphic
    if (this.textures.exists("shrine")) {
      const shrineImg = this.add.image(TEMPLE_X, TEMPLE_Y, "shrine");
      shrineImg.setDisplaySize(240, 240);
    } else {
      this.add.rectangle(TEMPLE_X, 1340, 220, 20, 0xd4a017);
      this.add.rectangle(TEMPLE_X, TEMPLE_Y, 180, 160, 0xffd700);
      this.add.text(TEMPLE_X - 58, 1185, "🛕", { fontSize: "56px" });
    }

    this.add.text(TEMPLE_X, TEMPLE_Y + 120, "🛕 Sacred Temple", {
      fontSize: "18px", color: "#5c3a00", fontStyle: "bold",
      backgroundColor: "#fff8e1ee", padding: { x: 12, y: 5 }
    }).setOrigin(0.5);

    // Gate: red bar across temple entrance
    this.gateBar = this.add.rectangle(TEMPLE_X, 1155, 200, 16, 0xff2222);
    this.physics.add.existing(this.gateBar, true);
    this.gateBar.body.setSize(200, 16);

    // Gate label
    this.gateLockText = this.add.text(TEMPLE_X, 1125, "🔒 Collect all offerings first!", {
      fontSize: "14px", color: "#cc0000", fontStyle: "bold",
      backgroundColor: "#ffffffcc", padding: { x: 6, y: 3 },
    }).setOrigin(0.5);

    // ─────────────────────────────────────
    //  COLLECTIBLES (Sprites + Glows + Labels)
    // ─────────────────────────────────────
    this.collectiblesGroup = this.physics.add.staticGroup();

    COLLECTIBLES.forEach((item) => {
      // Pulsing glow aura
      const glow = this.add.circle(item.x, item.y, 22, item.color, 0.3);
      this.tweens.add({
        targets: glow, scaleX: 1.4, scaleY: 1.4, alpha: 0.08,
        duration: 900 + Phaser.Math.Between(0, 400),
        yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });

      // Real sprite for collectible
      const flower = this.physics.add.image(item.x, item.y, item.texture);
      flower.setScale(0.18);
      this.physics.add.existing(flower, true);

      // Emoji label above
      const label = this.add.text(item.x, item.y - 28, item.emoji, {
        fontSize: "18px",
      }).setOrigin(0.5);

      this.tweens.add({
        targets: label,
        y: item.y - 35,
        duration: 800 + Phaser.Math.Between(0, 300),
        yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });

      // Metadata for collection
      flower.pointValue = item.points;
      flower.itemEmoji  = item.emoji;
      flower.glowRef    = glow;
      flower.labelRef   = label;

      this.collectiblesGroup.add(flower);
    });
    this.collectiblesGroup.refresh();

    // ─────────────────────────────────────
    //  PLAYER (Real Sprite Character)
    // ─────────────────────────────────────
    this.player = this.physics.add.sprite(200, 200, "player");
    this.player.setScale(0.4);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(40, 40, true);

    // ── Walking bob tween (simulates walk cycle without a spritesheet) ──
    this._walkBobTween = null;
    this._lastDir = "down";
    this._isMoving = false;
    this._bobPhase = 0;
    this._setupWalkBob();

    // ─────────────────────────────────────
    //  PHYSICS EVENTS
    // ─────────────────────────────────────
    // Collect items
    this.physics.add.overlap(
      this.player, this.collectiblesGroup, this.onCollect, null, this
    );
    // Rock collision
    this.physics.add.collider(
      this.player, this.rocksGroup, this.onHitRock, null, this
    );
    // Temple gate collision (blocks until opened)
    this.gateCollider = this.physics.add.collider(
      this.player, this.gateBar
    );

    // Temple zone (win condition — overlap with temple body)
    const templeZone = this.add.zone(TEMPLE_X, TEMPLE_Y, 200, 180);
    this.physics.add.existing(templeZone, true);
    this.physics.add.overlap(
      this.player, templeZone, this.onReachTemple, null, this
    );

    // ─────────────────────────────────────
    //  PHYSICS & CAMERA
    // ─────────────────────────────────────
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // ─────────────────────────────────────
    //  KEYBOARD & INPUT
    // ─────────────────────────────────────
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // ESC key for pause
    this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.keyEsc.on("down", () => this.togglePause());

    // Start background music on user click or touch
    this.input.on("pointerdown", () => {
      if (!this.soundFX.bgmPlaying && !this.soundFX.isMuted) {
        this.soundFX.startBGM();
      }
    });

    // ─────────────────────────────────────
    //  TIMER EVENT (every 1 second)
    // ─────────────────────────────────────
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.onTick,
      callbackScope: this,
      loop: true,
    });

    // ─────────────────────────────────────
    //  COMPETITION HUD (Top Bar Glassmorphism)
    // ─────────────────────────────────────
    this.isGamePaused = false;

    // 1. Top-Left Player Vitals Card
    this.add.rectangle(126, 62, 224, 100, 0x1d1007, 0.90)
      .setStrokeStyle(2, 0xffd700, 0.9)
      .setScrollFactor(0).setDepth(200);

    this.scoreText = this.add.text(26, 22, "⭐ SCORE: 0", {
      fontSize: "19px", fontStyle: "bold", color: "#ffd700",
      stroke: "#2a1500", strokeThickness: 3,
    }).setScrollFactor(0).setDepth(201);

    this.livesText = this.add.text(26, 52, "❤️ ❤️ ❤️", {
      fontSize: "18px", color: "#ff4d4d",
    }).setScrollFactor(0).setDepth(201);

    this.timerText = this.add.text(26, 82, `⏱️ TIME: ${TIME_LIMIT}s`, {
      fontSize: "16px", fontStyle: "bold", color: "#64b5f6",
      stroke: "#001a33", strokeThickness: 2,
    }).setScrollFactor(0).setDepth(201);

    // 2. Top-Center Offerings Quest Dock
    const dockW = 500;
    const dockH = 82;
    const dockX = this.scale.width / 2;
    const dockY = 53;

    this.add.rectangle(dockX, dockY, dockW, dockH, 0x1d1007, 0.90)
      .setStrokeStyle(2, 0xffd700, 0.9)
      .setScrollFactor(0).setDepth(200);

    this.add.text(dockX, dockY - 26, "🛕 SACRED OFFERINGS FOR GANESHA", {
      fontSize: "12px", fontStyle: "bold", color: "#ffecb3",
      stroke: "#2a1500", strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    const TRACKER_ORDER = ["🌸", "🌿", "🍬", "🥥", "🪔"];
    const badgeSpacing = 92;
    const startX = dockX - 184;

    TRACKER_ORDER.forEach((emoji, idx) => {
      const t = this.tracker[emoji];
      const bx = startX + idx * badgeSpacing;
      t.badgeObj = this.add.text(bx, dockY, `${emoji} 0/${t.total}`, {
        fontSize: "14px", fontStyle: "bold", color: "#ffffff",
        backgroundColor: "#3e2723", padding: { x: 7, y: 3 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    });

    // Offerings Progress Bar
    this.progressBarBg = this.add.rectangle(dockX, dockY + 25, 440, 8, 0x3e2723)
      .setScrollFactor(0).setDepth(201);
    this.progressBarFill = this.add.rectangle(dockX - 220, dockY + 25, 0, 8, 0xffd700)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(202);

    // 3. Top-Right Quick Action Controls
    // Pause button
    this.hudPauseBtn = this.add.text(this.scale.width - 76, 34, "⏸️ PAUSE", {
      fontSize: "13px", fontStyle: "bold", color: "#ffffff",
      backgroundColor: "#3e2723", padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setInteractive({ useHandCursor: true });
    this.hudPauseBtn.on("pointerdown", () => this.togglePause());
    this.hudPauseBtn.on("pointerover", () => this.hudPauseBtn.setStyle({ color: "#ffd700", backgroundColor: "#5d4037" }));
    this.hudPauseBtn.on("pointerout", () => this.hudPauseBtn.setStyle({ color: "#ffffff", backgroundColor: "#3e2723" }));

    // Audio toggle button
    this.hudAudioBtn = this.add.text(this.scale.width - 76, 74, "🔊 SOUND", {
      fontSize: "13px", fontStyle: "bold", color: "#ffffff",
      backgroundColor: "#2e3b44", padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setInteractive({ useHandCursor: true });
    this.hudAudioBtn.on("pointerdown", () => {
      const isMuted = this.soundFX.toggleMute();
      this.hudAudioBtn.setText(isMuted ? "🔇 SOUND" : "🔊 SOUND");
      if (this.pauseAudioBtn) this.pauseAudioBtn.setText(isMuted ? "🔇  Audio: OFF" : "🔊  Audio: ON");
    });
    this.hudAudioBtn.on("pointerover", () => this.hudAudioBtn.setStyle({ color: "#ffd700" }));
    this.hudAudioBtn.on("pointerout", () => this.hudAudioBtn.setStyle({ color: "#ffffff" }));

    // Spawn label (world space)
    this.add.text(SPAWN_X, SPAWN_Y - 42, "▼ START", {
      fontSize: "14px", color: "#1a5c1a", fontStyle: "bold",
    }).setOrigin(0.5);

    // Popup for rock hit — screen-space (scrollFactor 0)
    this.hitPopup = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 30, "", {
        fontSize: "24px", fontStyle: "bold",
        color: "#ff0000", stroke: "#ffffff", strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(300)
      .setVisible(false);

    // Build Pause Modal
    this.createPauseMenu();
  }

  // ═══════════════════════════════════════════
  //  PAUSE MENU MODAL
  // ═══════════════════════════════════════════
  createPauseMenu() {
    this.pauseContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(800).setVisible(false);

    // Dim overlay
    const overlay = this.add.rectangle(
      this.scale.width / 2, this.scale.height / 2,
      this.scale.width, this.scale.height,
      0x000000, 0.75
    ).setInteractive();

    // Card background
    const cardW = 460;
    const cardH = 410;
    const card = this.add.rectangle(
      this.scale.width / 2, this.scale.height / 2,
      cardW, cardH,
      0x241208, 0.96
    );
    card.setStrokeStyle(3, 0xffd700);

    // Header
    const title = this.add.text(this.scale.width / 2, this.scale.height / 2 - 150, "⏸️ GAME PAUSED", {
      fontSize: "28px", fontStyle: "bold", color: "#ffd700",
      stroke: "#3d1f00", strokeThickness: 4,
    }).setOrigin(0.5);

    // Summary stats
    this.pauseStatsText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 75, "", {
      fontSize: "16px", color: "#ffffff",
      backgroundColor: "#1c0d05aa",
      padding: { x: 20, y: 10 }, align: "center", lineSpacing: 6,
    }).setOrigin(0.5);

    // Resume Button
    const resumeBtn = this.add.text(this.scale.width / 2, this.scale.height / 2 + 15, "▶️  Resume Game", {
      fontSize: "18px", fontStyle: "bold", color: "#ffffff",
      backgroundColor: "#d84315", padding: { x: 28, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    resumeBtn.on("pointerdown", () => this.togglePause());
    resumeBtn.on("pointerover", () => resumeBtn.setStyle({ color: "#ffd700" }));
    resumeBtn.on("pointerout", () => resumeBtn.setStyle({ color: "#ffffff" }));

    // Restart Button
    const restartBtn = this.add.text(this.scale.width / 2, this.scale.height / 2 + 70, "🔄  Restart Level", {
      fontSize: "18px", fontStyle: "bold", color: "#ffffff",
      backgroundColor: "#4e342e", padding: { x: 28, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    restartBtn.on("pointerdown", () => {
      this.soundFX.stopBGM();
      this.scene.restart();
    });
    restartBtn.on("pointerover", () => restartBtn.setStyle({ color: "#ffd700" }));
    restartBtn.on("pointerout", () => restartBtn.setStyle({ color: "#ffffff" }));

    // Audio Toggle Button
    this.pauseAudioBtn = this.add.text(this.scale.width / 2, this.scale.height / 2 + 125, "🔊  Audio: ON", {
      fontSize: "16px", fontStyle: "bold", color: "#ffffff",
      backgroundColor: "#37474f", padding: { x: 22, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.pauseAudioBtn.on("pointerdown", () => {
      const isMuted = this.soundFX.toggleMute();
      this.pauseAudioBtn.setText(isMuted ? "🔇  Audio: OFF" : "🔊  Audio: ON");
      if (this.hudAudioBtn) this.hudAudioBtn.setText(isMuted ? "🔇 SOUND" : "🔊 SOUND");
    });
    this.pauseAudioBtn.on("pointerover", () => this.pauseAudioBtn.setStyle({ color: "#ffd700" }));
    this.pauseAudioBtn.on("pointerout", () => this.pauseAudioBtn.setStyle({ color: "#ffffff" }));

    // Main Menu Button
    const menuBtn = this.add.text(this.scale.width / 2, this.scale.height / 2 + 172, "🏠  Main Menu", {
      fontSize: "16px", fontStyle: "bold", color: "#b0bec5",
      backgroundColor: "#212121", padding: { x: 22, y: 7 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menuBtn.on("pointerdown", () => {
      this.soundFX.stopBGM();
      window.dispatchEvent(new CustomEvent("nav-home"));
    });
    menuBtn.on("pointerover", () => menuBtn.setStyle({ color: "#ffd700" }));
    menuBtn.on("pointerout", () => menuBtn.setStyle({ color: "#b0bec5" }));

    this.pauseContainer.add([overlay, card, title, this.pauseStatsText, resumeBtn, restartBtn, this.pauseAudioBtn, menuBtn]);
  }

  togglePause() {
    if (this.gameOver || this.levelComplete) return;
    this.isGamePaused = !this.isGamePaused;
    this.soundFX.playClick();

    if (this.isGamePaused) {
      this.physics.world.isPaused = true;
      this.timerEvent.paused = true;
      if (this._walkBobTween) this._walkBobTween.pause();
      this.player.body.setVelocity(0);

      this.pauseStatsText.setText(
        `⭐ Current Score: ${this.score} pts\n` +
        `🛕 Offerings: ${this.collected} / ${this.totalItems}\n` +
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
  //  VICTORY CELEBRATION EFFECTS
  // ═══════════════════════════════════════════
  launchCelebrationEffects() {
    // 1. Festive Flower Petal Shower
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

    // 2. Temple Golden Firework Sparkle Bursts
    const burstPoints = [
      { x: this.scale.width * 0.25, y: this.scale.height * 0.3 },
      { x: this.scale.width * 0.75, y: this.scale.height * 0.3 },
      { x: this.scale.width * 0.5, y: this.scale.height * 0.2 },
    ];

    burstPoints.forEach((pt, bIdx) => {
      this.time.delayedCall(350 + bIdx * 320, () => {
        const ring = this.add.circle(pt.x, pt.y, 8, 0xffd700, 0.9).setScrollFactor(0).setDepth(610);
        this.tweens.add({
          targets: ring,
          scaleX: 9, scaleY: 9, alpha: 0,
          duration: 650, ease: "Cubic.easeOut",
          onComplete: () => ring.destroy(),
        });

        for (let j = 0; j < 12; j++) {
          const spark = this.add.text(pt.x, pt.y, "✦", {
            fontSize: "18px", color: j % 2 === 0 ? "#ffd700" : "#ff6f00",
          }).setOrigin(0.5).setScrollFactor(0).setDepth(615);

          const angle = (j / 12) * Math.PI * 2;
          const dist = Phaser.Math.Between(50, 110);
          this.tweens.add({
            targets: spark,
            x: pt.x + Math.cos(angle) * dist,
            y: pt.y + Math.sin(angle) * dist,
            alpha: 0, scale: 0.2, angle: 180,
            duration: 800, ease: "Cubic.easeOut",
            onComplete: () => spark.destroy(),
          });
        }
      });
    });
  }

  // ═══════════════════════════════════════════
  //  WALK BOB SETUP  (called once in create)
  // ═══════════════════════════════════════════
  _setupWalkBob() {
    // We animate scale on Y to create a squat-bounce that reads as walking.
    // The tween loops and is paused/resumed depending on movement.
    this._walkBobTween = this.tweens.add({
      targets: this.player,
      scaleY: { from: 0.4, to: 0.37 },
      scaleX: { from: 0.4, to: 0.42 },
      duration: 160,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      paused: true,
    });
  }

  // ═══════════════════════════════════════════
  //  TIMER TICK
  // ═══════════════════════════════════════════
  onTick() {
    if (this.isGamePaused || this.gameOver || this.levelComplete) return;

    this.timeLeft--;
    this.timerText.setText(`⏱️ TIME: ${this.timeLeft}s`);

    // Flash timer red in last 20 seconds
    if (this.timeLeft <= 20) {
      this.timerText.setColor(this.timeLeft % 2 === 0 ? "#ff1744" : "#ff8a80");
      this.tweens.add({
        targets: this.timerText,
        scaleX: 1.14, scaleY: 1.14,
        duration: 120, yoyo: true,
      });
    }

    if (this.timeLeft <= 0) {
      this.triggerGameOver("⏱️ Time's Up!\nThe aarti has ended without your offerings...");
    }
  }

  // ═══════════════════════════════════════════
  //  COLLECT ITEM
  // ═══════════════════════════════════════════
  onCollect(player, item) {
    this.score     += item.pointValue;
    this.collected += 1;

    // Play devotional collect chime
    this.soundFX.playCollect();

    const ix = item.x;
    const iy = item.y;

    // ── Rich Multi-colour Sparkle Burst ──────────────────────────
    const sparkleColors = [0xffd700, 0xff8f00, 0xffffff, 0xff6f00, 0xffee58, 0xf06292, 0xaed581];
    const numParticles  = 14;
    for (let i = 0; i < numParticles; i++) {
      const col   = sparkleColors[i % sparkleColors.length];
      const size  = Phaser.Math.Between(3, 7);
      const p     = this.add.circle(ix, iy, size, col, 1).setDepth(350);
      const angle = (i / numParticles) * Math.PI * 2;
      const dist  = Phaser.Math.Between(28, 62);
      this.tweens.add({
        targets: p,
        x: ix + Math.cos(angle) * dist,
        y: iy + Math.sin(angle) * dist - Phaser.Math.Between(0, 20),
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: Phaser.Math.Between(400, 700),
        ease: "Cubic.easeOut",
        onComplete: () => p.destroy(),
      });
    }

    // ── Star / diamond sparkle shapes ────────────────────────────
    for (let i = 0; i < 5; i++) {
      const star = this.add.text(
        ix + Phaser.Math.Between(-20, 20),
        iy + Phaser.Math.Between(-20, 10),
        "✦", { fontSize: "14px", color: "#ffd700" }
      ).setOrigin(0.5).setDepth(355);
      this.tweens.add({
        targets: star,
        y: star.y - Phaser.Math.Between(30, 60),
        alpha: 0,
        angle: Phaser.Math.Between(-180, 180),
        scale: 0,
        duration: Phaser.Math.Between(500, 900),
        ease: "Cubic.easeOut",
        delay: i * 60,
        onComplete: () => star.destroy(),
      });
    }

    // ── Collect ring pulse ────────────────────────────────────────
    const ring = this.add.circle(ix, iy, 10, item.color, 0.7).setDepth(340);
    this.tweens.add({
      targets: ring,
      scaleX: 4, scaleY: 4, alpha: 0,
      duration: 500, ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });

    // ── Independent floating score label (per-item, not shared) ──
    const floatLabel = this.add.text(ix, iy - 16,
      `${item.itemEmoji} +${item.pointValue}`, {
        fontSize: "20px", fontStyle: "bold",
        color: "#ffffff",
        stroke: "#2d1600", strokeThickness: 5,
      }
    ).setOrigin(0.5).setDepth(360).setAlpha(1);

    this.tweens.add({
      targets: floatLabel,
      y: iy - 80,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 1000,
      ease: "Cubic.easeOut",
      onComplete: () => floatLabel.destroy(),
    });

    // ── Score counter bump ────────────────────────────────────────
    this.scoreText.setText(`⭐ SCORE: ${this.score}`);
    this.tweens.add({
      targets: this.scoreText,
      scaleX: 1.18, scaleY: 1.18,
      duration: 120, yoyo: true,
      ease: "Back.easeOut",
    });

    // ── Update per-type tracker badge ─────────────────────────────
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

    // ── Progress Bar update ───────────────────────────────────────
    const progressFrac = Math.min(1, this.collected / this.totalItems);
    this.tweens.add({
      targets: this.progressBarFill,
      width: progressFrac * 440,
      duration: 220, ease: "Sine.easeOut",
    });

    item.glowRef.destroy();
    item.labelRef.destroy();
    item.destroy();

    if (this.collected === this.totalItems) {
      this.openTempleGate();
    }
  }

  // ═══════════════════════════════════════════
  //  OPEN TEMPLE GATE
  // ═══════════════════════════════════════════
  openTempleGate() {
    this.allCollected = true;

    // Divine temple bell & gong sound
    this.soundFX.playGateOpen();

    // Remove gate collision & visuals
    this.physics.world.removeCollider(this.gateCollider);
    this.tweens.add({
      targets: [this.gateBar, this.gateLockText],
      alpha: 0, duration: 600,
      onComplete: () => {
        this.gateBar.destroy();
        this.gateLockText.destroy();
      },
    });

    // Gate open banner
    const banner = this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 30,
        "🎉 All offerings collected!\n🛕 Temple Gate OPEN — hurry!", {
        fontSize: "26px", fontStyle: "bold", color: "#ffffff",
        backgroundColor: "#e65100ee", padding: { x: 20, y: 14 },
        align: "center",
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(500);

    // Auto-hide banner after 3s
    this.time.delayedCall(3000, () => {
      this.tweens.add({ targets: banner, alpha: 0, duration: 600,
        onComplete: () => banner.destroy() });
    });

    // Golden temple glow
    this.tweens.add({
      targets: this.player, alpha: 0.6,
      duration: 200, yoyo: true, repeat: 3,
    });
  }

  // ═══════════════════════════════════════════
  //  HIT ROCK
  // ═══════════════════════════════════════════
  onHitRock(player, rock) {
    if (this.isInvincible || this.gameOver) return;

    // Play bump sound
    this.soundFX.playRockHit();

    // Brief invincibility to prevent multiple hits
    this.isInvincible = true;
    this.time.delayedCall(1500, () => { this.isInvincible = false; });

    this.lives--;
    const hearts = "❤️ ".repeat(Math.max(0, this.lives)) + "🖤 ".repeat(Math.max(0, 3 - this.lives));
    this.livesText.setText(hearts.trim());
    this.tweens.add({
      targets: this.livesText,
      scaleX: 1.25, scaleY: 1.25,
      duration: 120, yoyo: true,
    });

    // Flash player red
    this.tweens.add({
      targets: this.player,
      alpha: 0.2, duration: 100,
      yoyo: true, repeat: 5,
      onComplete: () => this.player.setAlpha(1),
    });

    // Camera shake
    this.cameras.main.shake(300, 0.012);

    // Respawn at start
    this.player.setPosition(SPAWN_X, SPAWN_Y);

    // Show -1 life popup (screen-space, fixed to camera)
    this.hitPopup
      .setText("💥 Ouch! -1 Life")
      .setY(this.scale.height / 2 + 30)
      .setVisible(true).setAlpha(1);

    this.tweens.add({
      targets: this.hitPopup,
      y: this.scale.height / 2 - 20,
      alpha: 0,
      duration: 1200, ease: "Cubic.easeOut",
      onComplete: () => this.hitPopup.setVisible(false),
    });

    if (this.lives <= 0) {
      this.triggerGameOver("💀 No lives left!\nThe sacred offerings are lost...");
    }
  }

  // ═══════════════════════════════════════════
  //  REACH TEMPLE (WIN)
  // ═══════════════════════════════════════════
  onReachTemple() {
    if (!this.allCollected || this.levelComplete || this.gameOver) return;

    this.levelComplete = true;
    this.timerEvent.remove();
    this.soundFX.stopBGM();
    this.soundFX.playVictory();
    this.launchCelebrationEffects();

    // Bonus calculations
    const offeringsScore = this.score;
    const timeBonus      = this.timeLeft * 2;
    const livesBonus     = this.lives * 50;
    const finalScore     = offeringsScore + timeBonus + livesBonus;

    // 3-Star Rating System
    let stars = 1;
    let starTitle = "⭐☆☆ OFFERINGS DELIVERED!";
    if (this.lives === 3 && this.timeLeft >= 60) {
      stars = 3;
      starTitle = "⭐⭐⭐ DIVINE BLESSING!";
    } else if (this.lives >= 2 && this.timeLeft >= 30) {
      stars = 2;
      starTitle = "⭐⭐☆ DEVOTED SEVA!";
    }

    // Persist High Score & Stars in localStorage & Firebase
    try {
      const currentBest = parseInt(localStorage.getItem("ganesha_high_score") || "0", 10);
      if (finalScore > currentBest) {
        localStorage.setItem("ganesha_high_score", finalScore.toString());
      }
      const bestStars = parseInt(localStorage.getItem("ganesha_stars") || "0", 10);
      if (stars > bestStars) {
        localStorage.setItem("ganesha_stars", stars.toString());
      }
      saveScore("Festival Volunteer", finalScore, stars, this.timeLeft);
    } catch (e) {
      // Fallback if disabled in private mode
    }

    this.player.body.setVelocity(0);
    this.cameras.main.stopFollow();
    this.cameras.main.flash(700, 255, 215, 0); // Golden flash

    // Dim overlay
    this.add.rectangle(
      this.scale.width / 2, this.scale.height / 2,
      this.scale.width, this.scale.height,
      0x000000, 0.75
    ).setScrollFactor(0).setDepth(600);

    // Victory Modal Card Background
    const cardW = 540;
    const cardH = 460;
    const card = this.add.rectangle(
      this.scale.width / 2, this.scale.height / 2,
      cardW, cardH,
      0x2e1a0e, 0.95
    ).setScrollFactor(0).setDepth(650);
    card.setStrokeStyle(4, 0xffd700);

    // Header title
    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 180,
        "🛕 Victory! Aarti is Saved! 🛕", {
        fontSize: "28px", fontStyle: "bold", color: "#ffd700",
        stroke: "#3d1f00", strokeThickness: 4,
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(700);

    // Star Rank Text
    const starLabel = this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 130,
        starTitle, {
        fontSize: "22px", fontStyle: "bold", color: "#ffecb3",
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(700);

    // Animated Star Icons popping in
    const starIcons = [];
    const starSpacing = 50;
    for (let i = 0; i < 3; i++) {
      const isEarned = i < stars;
      const starChar = isEarned ? "⭐" : "☆";
      const s = this.add
        .text(this.scale.width / 2 + (i - 1) * starSpacing, this.scale.height / 2 - 85,
          starChar, { fontSize: "36px" })
        .setOrigin(0.5).setScrollFactor(0).setDepth(700).setScale(0);

      starIcons.push(s);

      this.tweens.add({
        targets: s,
        scale: 1.2,
        duration: 350,
        delay: 200 + i * 200,
        ease: "Back.easeOut",
        onComplete: () => {
          this.tweens.add({ targets: s, scale: 1.0, duration: 150 });
        }
      });
    }

    // Score Breakdown
    const statsText =
      `🌸 Offerings: ${offeringsScore} pts\n` +
      `⏱️ Time Bonus (${this.timeLeft}s left): +${timeBonus} pts\n` +
      `❤️ Devotion Bonus (${this.lives} lives): +${livesBonus} pts\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏆 Total Score: ${finalScore} pts`;

    this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 35, statsText, {
        fontSize: "17px", color: "#ffffff",
        backgroundColor: "#1c0d0588",
        padding: { x: 18, y: 12 }, align: "center", lineSpacing: 7,
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(700);

    // Play Again Button
    const playAgainBtn = this.add
      .text(this.scale.width / 2 - 110, this.scale.height / 2 + 175,
        "🔄  Play Again", {
        fontSize: "19px", fontStyle: "bold",
        color: "#ffffff", backgroundColor: "#d84315",
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(700)
      .setInteractive({ useHandCursor: true });

    playAgainBtn.on("pointerdown", () => {
      this.soundFX.stopBGM();
      this.scene.restart();
    });
    playAgainBtn.on("pointerover",  () => playAgainBtn.setStyle({ color: "#ffd700" }));
    playAgainBtn.on("pointerout",   () => playAgainBtn.setStyle({ color: "#ffffff" }));

    // Main Menu Button
    const menuBtn = this.add
      .text(this.scale.width / 2 + 110, this.scale.height / 2 + 175,
        "🏠  Main Menu", {
        fontSize: "19px", fontStyle: "bold",
        color: "#ffffff", backgroundColor: "#4e342e",
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(700)
      .setInteractive({ useHandCursor: true });

    menuBtn.on("pointerdown", () => {
      this.soundFX.stopBGM();
      window.dispatchEvent(new CustomEvent("nav-home"));
    });
    menuBtn.on("pointerover",  () => menuBtn.setStyle({ color: "#ffd700" }));
    menuBtn.on("pointerout",   () => menuBtn.setStyle({ color: "#ffffff" }));
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
    this.cameras.main.shake(500, 0.02);

    // Dim overlay
    this.add.rectangle(
      this.scale.width / 2, this.scale.height / 2,
      this.scale.width, this.scale.height,
      0x000000, 0.75
    ).setScrollFactor(0).setDepth(600);

    // Card background
    const card = this.add.rectangle(
      this.scale.width / 2, this.scale.height / 2,
      500, 360,
      0x2a0d0d, 0.95
    ).setScrollFactor(0).setDepth(650);
    card.setStrokeStyle(3, 0xff4444);

    // Title
    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 120,
        "💔 Game Over", {
        fontSize: "36px", fontStyle: "bold",
        color: "#ff5252", stroke: "#220000", strokeThickness: 5,
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(700);

    // Reason & Score
    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 20,
        `${reason}\n\n⭐ Score Achieved: ${this.score} pts`, {
        fontSize: "19px", color: "#ffffff",
        backgroundColor: "#18050588",
        padding: { x: 18, y: 14 }, align: "center", lineSpacing: 8,
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(700);

    // Try Again button
    const retryBtn = this.add
      .text(this.scale.width / 2 - 100, this.scale.height / 2 + 115,
        "🔄  Try Again", {
        fontSize: "19px", fontStyle: "bold",
        color: "#ffffff", backgroundColor: "#c0392b",
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(700)
      .setInteractive({ useHandCursor: true });

    retryBtn.on("pointerdown", () => {
      this.soundFX.stopBGM();
      this.scene.restart();
    });
    retryBtn.on("pointerover",  () => retryBtn.setStyle({ color: "#ffd700" }));
    retryBtn.on("pointerout",   () => retryBtn.setStyle({ color: "#ffffff" }));

    // Main Menu button
    const menuBtn = this.add
      .text(this.scale.width / 2 + 100, this.scale.height / 2 + 115,
        "🏠  Main Menu", {
        fontSize: "19px", fontStyle: "bold",
        color: "#ffffff", backgroundColor: "#424242",
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(700)
      .setInteractive({ useHandCursor: true });

    menuBtn.on("pointerdown", () => {
      this.soundFX.stopBGM();
      window.dispatchEvent(new CustomEvent("nav-home"));
    });
    menuBtn.on("pointerover",  () => menuBtn.setStyle({ color: "#ffd700" }));
    menuBtn.on("pointerout",   () => menuBtn.setStyle({ color: "#ffffff" }));
  }

  // ═══════════════════════════════════════════
  //  UPDATE (every frame)
  // ═══════════════════════════════════════════
  update() {
    if (this.isGamePaused || this.gameOver || this.levelComplete) return;

    const speed = 220;
    const vx = this.player.body.velocity.x;
    const vy = this.player.body.velocity.y;
    this.player.body.setVelocity(0);

    let moving = false;
    let dir = this._lastDir;

    // ── Horizontal movement ──────────────────────────
    if (this.cursors.left.isDown || this.keys.A.isDown) {
      this.player.body.setVelocityX(-speed);
      this.player.setFlipX(true);
      dir = "left";
      moving = true;
    } else if (this.cursors.right.isDown || this.keys.D.isDown) {
      this.player.body.setVelocityX(speed);
      this.player.setFlipX(false);
      dir = "right";
      moving = true;
    }

    // ── Vertical movement ────────────────────────────
    if (this.cursors.up.isDown || this.keys.W.isDown) {
      this.player.body.setVelocityY(-speed);
      dir = "up";
      moving = true;
    } else if (this.cursors.down.isDown || this.keys.S.isDown) {
      this.player.body.setVelocityY(speed);
      dir = "down";
      moving = true;
    }

    // Normalize diagonal speed
    this.player.body.velocity.normalize().scale(speed);
    this._lastDir = dir;

    // ── Start devotional ambient music on movement ───
    if (moving && !this.soundFX.bgmPlaying && !this.soundFX.isMuted) {
      this.soundFX.startBGM();
    }

    // ── Walking animation: bob + tilt ────────────────
    if (moving && !this._isMoving) {
      // Transition to walking state
      this._isMoving = true;
      if (this._walkBobTween) this._walkBobTween.resume();
    } else if (!moving && this._isMoving) {
      // Transition to idle state
      this._isMoving = false;
      if (this._walkBobTween) this._walkBobTween.pause();
      // Snap back to neutral scale
      this.tweens.add({
        targets: this.player,
        scaleX: 0.4, scaleY: 0.4,
        duration: 80, ease: "Sine.easeOut",
      });
      this.player.setAngle(0);
    }

    // ── Tilt left/right while walking ───────────────
    if (moving) {
      const tiltAngle = Math.sin(this.time.now / 90) * 8;
      if (dir === "left" || dir === "right") {
        // Sideways: slight lean in movement direction
        this.player.setAngle(dir === "left" ? -tiltAngle * 0.5 : tiltAngle * 0.5);
      } else {
        // Up/down: gentle sway
        this.player.setAngle(tiltAngle);
      }
    }

    // ── Idle breathe tween (when still, slow scale pulse) ──
    // Only trigger once when idle to avoid stacking tweens
  }
}

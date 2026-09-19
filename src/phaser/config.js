import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import PreloadScene from "./scenes/PreloadScene";
import Level1Scene from "./scenes/Level1Scene";

const gameConfig = {
  type: Phaser.AUTO,

  width: 1280,
  height: 720,

  parent: "game-container",

  backgroundColor: "#FFF8DC",

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },

  dom: {
    createContainer: true,
  },

  scene: [BootScene, PreloadScene, Level1Scene],
};

export default gameConfig;

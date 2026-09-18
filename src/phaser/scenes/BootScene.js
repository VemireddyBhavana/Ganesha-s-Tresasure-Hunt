import Phaser from "phaser";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    // Initial minimal assets or loading configs if any
  }

  create() {
    // Start PreloadScene
    this.scene.start("PreloadScene");
  }
}

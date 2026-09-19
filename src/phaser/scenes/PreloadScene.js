import Phaser from "phaser";

import templeGardenBg from "../../assets/images/backgrounds/temple_garden.png";
import playerImg from "../../assets/images/characters/player_idle.png";
import playerSpriteSheet from "../../assets/images/characters/player_spritesheet.png";
import flowerImg from "../../assets/images/collectibles/flower.png";
import modakImg from "../../assets/images/collectibles/modak.png";
import durvaImg from "../../assets/images/collectibles/durva.png";
import coconutImg from "../../assets/images/collectibles/coconut.png";
import diyaImg from "../../assets/images/collectibles/diya.png";
import rockImg from "../../assets/images/obstacles/rock.png";
import plasticWasteImg from "../../assets/images/obstacles/plastic_waste.png";
import treeImg from "../../assets/images/environment/tree.png";
import templeImg from "../../assets/images/environment/temple.png";

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Loading Screen UI
    const titleText = this.add.text(width / 2, height / 2 - 80, "🛕 Preparing Temple Garden...", {
      fontSize: "32px",
      color: "#8B4513",
      fontStyle: "bold",
    }).setOrigin(0.5);

    const progressBox = this.add.graphics();
    const progressBar = this.add.graphics();
    progressBox.fillStyle(0x3E2723, 0.4);
    progressBox.fillRoundedRect(width / 2 - 200, height / 2 - 20, 400, 40, 10);

    const percentText = this.add.text(width / 2, height / 2, "0%", {
      fontSize: "20px",
      color: "#FFF8DC",
      fontStyle: "bold",
    }).setOrigin(0.5);

    // Event listeners for loading progress
    this.load.on("progress", (value) => {
      progressBar.clear();
      progressBar.fillStyle(0xFF8F00, 1);
      progressBar.fillRoundedRect(width / 2 - 195, height / 2 - 15, 390 * value, 30, 8);
      percentText.setText(parseInt(value * 100) + "%");
    });

    this.load.on("complete", () => {
      progressBar.destroy();
      progressBox.destroy();
      percentText.destroy();
      titleText.destroy();
    });

    // Load Game Assets
    this.load.spritesheet("player", playerSpriteSheet, {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.image("player_idle", playerImg);
    this.load.image("temple", templeGardenBg);
    this.load.image("temple_garden_bg", templeGardenBg);
    this.load.image("flower", flowerImg);
    this.load.image("modak", modakImg);
    this.load.image("durva", durvaImg);
    this.load.image("coconut", coconutImg);
    this.load.image("diya", diyaImg);
    this.load.image("rock", rockImg);
    this.load.image("plastic_waste", plasticWasteImg);
    this.load.image("tree", treeImg);
    this.load.image("shrine", templeImg);
  }

  create() {
    this.scene.start("Level1Scene");
  }
}

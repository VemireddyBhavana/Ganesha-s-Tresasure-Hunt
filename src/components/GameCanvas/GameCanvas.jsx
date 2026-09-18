
import { useEffect, useRef } from "react";
import Phaser from "phaser";
import gameConfig from "../../phaser/config";

function GameCanvas() {
  const gameRef = useRef(null);

  useEffect(() => {
    if (!gameRef.current) {
      gameRef.current = new Phaser.Game(gameConfig);
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return <div id="game-container"></div>;
}

export default GameCanvas;

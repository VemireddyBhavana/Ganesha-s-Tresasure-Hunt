
import { useEffect, useRef } from "react";
import Phaser from "phaser";
import gameConfig from "../../phaser/config";

function GameCanvas() {
  const gameRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Small delay ensures the DOM container is fully mounted before Phaser attaches
    const timeoutId = setTimeout(() => {
      if (!gameRef.current && containerRef.current) {
        gameRef.current = new Phaser.Game({
          ...gameConfig,
          parent: containerRef.current,
        });
      }
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return <div id="game-container" ref={containerRef}></div>;
}

export default GameCanvas;

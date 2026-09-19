import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GameCanvas from "../../components/GameCanvas/GameCanvas";
import "./Game.css";

function Game() {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleNavHome = () => navigate("/home");
    window.addEventListener("nav-home", handleNavHome);

    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      window.removeEventListener("nav-home", handleNavHome);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [navigate]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.error("Error attempting to enable fullscreen:", err);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.error("Error attempting to exit fullscreen:", err);
        });
      }
    }
  };

  return (
    <div className="game-page">
      <GameCanvas />
    </div>
  );
}

export default Game;

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GameCanvas from "../../components/GameCanvas/GameCanvas";
import "./Game.css";

function exitFullscreenSafe() {
  if (document.fullscreenElement) {
    try {
      if (document.exitFullscreen) document.exitFullscreen();
    } catch (e) {}
  }
}

function requestFullscreenSafe() {
  if (!document.fullscreenElement) {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (e) {}
  }
}

function Game() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleNavHome = () => {
      exitFullscreenSafe();
      navigate("/home");
    };
    window.addEventListener("nav-home", handleNavHome);

    const onFullscreenChange = () => {
      try {
        const scene = window.__level1Scene;
        if (scene && scene.pauseFSBtn) {
          scene.pauseFSBtn.setText(
            document.fullscreenElement ? "🗗  Exit Fullscreen" : "⛶  Fullscreen"
          );
        }
      } catch (e) {}
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      window.removeEventListener("nav-home", handleNavHome);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [navigate]);

  return (
    <div className="game-page">
      <GameCanvas />
    </div>
  );
}

export default Game;

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GameCanvas from "../../components/GameCanvas/GameCanvas";
import "./Game.css";

function Game() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleNavHome = () => navigate("/home");
    window.addEventListener("nav-home", handleNavHome);
    return () => window.removeEventListener("nav-home", handleNavHome);
  }, [navigate]);

  return (
    <div className="game-page">
      <div className="game-top-bar">
        <button className="game-nav-btn" onClick={() => navigate("/home")}>
          ⬅ Back to Home
        </button>
        <span className="game-stage-tag">🛕 Level 1: Temple Garden</span>
      </div>
      <GameCanvas />
    </div>
  );
}

export default Game;

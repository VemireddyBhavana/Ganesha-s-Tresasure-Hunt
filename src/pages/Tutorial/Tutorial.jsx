import { useNavigate } from "react-router-dom";
import "./Tutorial.css";

function Tutorial() {
  const navigate = useNavigate();

  return (
    <div className="tutorial">
      <div className="tutorial-card">
        <h1>🎮 How to Play</h1>

        <div className="section">
          <h2>🎯 Your Mission</h2>
          <p>
            Collect all the sacred offerings across the Temple Garden before the evening aarti bell rings!
          </p>
        </div>

        <div className="section">
          <h2>⌨️ Movement Controls</h2>
          <div className="controls-badge-row">
            <span className="key-badge">W</span>
            <span className="key-badge">A</span>
            <span className="key-badge">S</span>
            <span className="key-badge">D</span>
            <span className="or-text">or</span>
            <span className="key-badge">↑</span>
            <span className="key-badge">←</span>
            <span className="key-badge">↓</span>
            <span className="key-badge">→</span>
          </div>
        </div>

        <div className="section">
          <h2>🌸 Sacred Collectibles</h2>
          <div className="items-grid">
            <span className="item-pill">🌸 Flowers (+10 pts)</span>
            <span className="item-pill">🌿 Durva Grass (+15 pts)</span>
            <span className="item-pill">🍬 Sacred Modak (+20 pts)</span>
            <span className="item-pill">🥥 Fresh Coconut (+25 pts)</span>
            <span className="item-pill">🪔 Aarti Diya (+30 pts)</span>
          </div>
        </div>

        <div className="section">
          <h2>🚧 Avoid Obstacles</h2>
          <p>Stay away from rocks, slippery mud puddles, and plastic waste! Collisions reduce your lives.</p>
        </div>

        <div className="tutorial-action-buttons">
          <button className="tutorial-back-btn" onClick={() => navigate("/home")}>
            ⬅ Back to Menu
          </button>
          <button className="tutorial-start-btn" onClick={() => navigate("/game")}>
            ▶ Start Adventure
          </button>
        </div>
      </div>
    </div>
  );
}

export default Tutorial;

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
          <p style={{ marginTop: "10px", fontSize: "14px", color: "#6d4c41" }}>
            📱 On Mobile / Touch screens: Use the on-screen D-Pad or touch and drag to walk!
          </p>
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
          <h2>🌱 Eco-Seva & Obstacles</h2>
          <p>
            • 🪨 <strong>Rocks:</strong> Stay clear! Touching rocks knocks you back and costs 1 life.<br />
            • 🧴 <strong>Plastic Waste:</strong> Clean up littered plastic for <strong>+20 Eco-Seva Bonus pts</strong>!
          </p>
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

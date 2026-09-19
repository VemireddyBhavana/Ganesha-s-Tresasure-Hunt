import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTopScores } from "../../firebase/leaderboard";
import "./Home.css";

function Home() {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState(() => {
    const modal = sessionStorage.getItem("open_modal");
    if (modal) {
      sessionStorage.removeItem("open_modal");
      return modal;
    }
    return null;
  });
  const [leaderboardScores, setLeaderboardScores] = useState([]);
  const [loadingScores, setLoadingScores] = useState(false);

  useEffect(() => {
    if (activeModal === "leaderboard") {
      setLoadingScores(true);
      getTopScores(6)
        .then((res) => {
          setLeaderboardScores(res);
          setLoadingScores(false);
        })
        .catch(() => setLoadingScores(false));
    }
  }, [activeModal]);

  return (
    <div className="home">
      <div className="overlay">
        <h1>🛕</h1>
        <h2>Ganesha's Treasure Hunt</h2>
        <p>The Sacred Modak Quest</p>

        <div className="menu">
          <button onClick={() => navigate("/story")}>
            ▶ Start Adventure
          </button>
          <button onClick={() => navigate("/story")}>
            📖 Story
          </button>
          <button onClick={() => navigate("/tutorial")}>
            🎮 How to Play
          </button>
          <button onClick={() => setActiveModal("leaderboard")}>
            🏆 Leaderboard
          </button>
          <button onClick={() => setActiveModal("settings")}>
            ⚙ Settings
          </button>
          <button onClick={() => setActiveModal("about")}>
            ℹ About
          </button>
        </div>

        <p className="home-footer-credit">
          Made with ❤️ for Ganesh Chaturthi Game Design Contest
        </p>
      </div>

      {activeModal && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {activeModal === "leaderboard" && (
              <div>
                <h3>🏆 Festival Leaderboard</h3>
                <p>Cross-Campus High Scores</p>

                {(() => {
                  const score = localStorage.getItem("ganesha_high_score");
                  const stars = parseInt(localStorage.getItem("ganesha_stars") || "0", 10);
                  const starsDisplay = "⭐".repeat(stars) + "☆".repeat(Math.max(0, 3 - stars));
                  if (!score) return null;
                  return (
                    <div style={{
                      background: "linear-gradient(135deg, #fff3e0, #ffe082)",
                      border: "2px solid #ffa000",
                      borderRadius: "12px",
                      padding: "10px 14px",
                      margin: "12px 0",
                      fontWeight: "bold",
                      color: "#5d4037",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <span>✨ Your Best ({starsDisplay}):</span>
                      <span style={{ color: "#e65100", fontSize: "16px" }}>{score} pts</span>
                    </div>
                  );
                })()}

                <div className="leaderboard-list">
                  {loadingScores ? (
                    <p style={{ textAlign: "center", color: "#888", padding: "12px" }}>
                      ⏳ Loading Devotee Scores...
                    </p>
                  ) : (
                    leaderboardScores.map((entry, idx) => {
                      const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`;
                      const isTop = idx < 3;
                      return (
                        <div key={entry.id || idx} className={`leaderboard-row ${isTop ? "top" : ""}`}>
                          <span>{medal} {entry.playerName}</span>
                          <span>{entry.score.toLocaleString()} pts</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {activeModal === "settings" && (
              <div>
                <h3>⚙️ Game Settings</h3>
                <div className="settings-options">
                  <p>🎵 Festival BGM: <strong>Enabled</strong></p>
                  <p>🔔 Puja Bell Effects: <strong>Enabled</strong></p>
                  <p>⌨️ Controls: <strong>WASD + Arrow Keys</strong></p>
                </div>
              </div>
            )}

            {activeModal === "about" && (
              <div>
                <h3>ℹ️ About the Game</h3>
                <p>
                  <strong>Ganesha&apos;s Treasure Hunt: The Sacred Modak Quest</strong> is built for the Ganesh Chaturthi Game Design Contest.
                </p>
                <p style={{ marginTop: "10px", fontSize: "14px", color: "#666" }}>
                  Celebrate devotion, teamwork, eco-friendly traditions, and help prepare the temple before the evening aarti!
                </p>
              </div>
            )}

            <button className="modal-close-btn" onClick={() => setActiveModal(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;

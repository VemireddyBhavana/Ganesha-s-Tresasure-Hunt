import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getTopScores } from "../../firebase/leaderboard";
import templeImg from "../../assets/images/environment/temple.png";
import "./Home.css";

function requestFullscreenSafe() {
  if (!document.fullscreenElement) {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {}
  }
}

function useHudScores() {
  const [best] = useState(() => {
    try {
      return parseInt(localStorage.getItem("ganesha_high_score") || "0", 10) || 0;
    } catch {
      return 0;
    }
  });
  const [last] = useState(() => {
    try {
      return parseInt(localStorage.getItem("ganesha_last_score") || "0", 10) || 0;
    } catch {
      return 0;
    }
  });
  return { best, last };
}

function HudCard({ side, icon, value, label }) {
  return (
    <div className={`home-hud-corner home-hud-${side}`}>
      <span className="corner-bl" />
      <span className="corner-br" />
      <span className="home-hud-icon">{icon}</span>
      <div className="home-hud-text">
        <span className="home-hud-value">{value.toLocaleString()}</span>
        <span className="home-hud-label">{label}</span>
      </div>
    </div>
  );
}

function Home() {
  const navigate = useNavigate();
  const { best, last } = useHudScores();

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
  const scoresRef = useRef(false);

  useEffect(() => {
    if (activeModal === "leaderboard" && !scoresRef.current) {
      scoresRef.current = true;
      setLoadingScores(true);
      getTopScores(6)
        .then((res) => {
          setLeaderboardScores(res);
          setLoadingScores(false);
        })
        .catch(() => setLoadingScores(false))
        .finally(() => {
          setTimeout(() => { scoresRef.current = false; }, 1200);
        });
    }
  }, [activeModal]);

  const startGame = () => {
    requestFullscreenSafe();
    setTimeout(() => navigate("/game"), 120);
  };

  return (
    <div className="home">
      <HudCard side="left" icon="🍬" value={last} label="LAST PRASAD" />
      <HudCard side="right" icon="🏆" value={best} label="BEST SCORE" />

      <div className="overlay">
        <div className="temple-hero-container">
          <img src={templeImg} alt="Sacred Temple" className="temple-hero-img" />
        </div>
        <h2>Ganesha&apos;s Treasure Hunt</h2>
        <p>The Sacred Modak Quest</p>
        <div className="festival-tag">✦  GANESH CHATURTHI SPECIAL  ✦</div>

        <div className="menu">
          <button onClick={startGame}>
            ▶ PLAY
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
                  const playerName = localStorage.getItem("ganesha_last_player_name") || "Your Best";
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
                      <span>✨ {playerName} ({starsDisplay}):</span>
                      <span style={{ color: "#e65100", fontSize: "16px" }}>{score} pts</span>
                    </div>
                  );
                })()}

                <div className="leaderboard-list">
                  {loadingScores ? (
                    <p style={{ textAlign: "center", color: "#888", padding: "12px" }}>
                      ⏳ Loading Devotee Scores...
                    </p>
                  ) : leaderboardScores.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px 10px", color: "#6d4c41" }}>
                      <p style={{ fontSize: "28px", margin: "0 0 8px" }}>🛕</p>
                      <p style={{ fontWeight: 600, fontSize: "15px" }}>No scores recorded yet!</p>
                      <p style={{ fontSize: "13px", color: "#8d6e63", marginTop: "4px" }}>
                        Play a quest and collect sacred offerings to claim the #1 spot!
                      </p>
                    </div>
                  ) : (
                    leaderboardScores.map((entry, idx) => {
                      const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`;
                      const isTop = idx < 3;
                      return (
                        <div key={`${entry.id || "entry"}-${idx}`} className={`leaderboard-row ${isTop ? "top" : ""}`}>
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
                  <p>🖥️ Fullscreen: <strong>Auto on PLAY (ESC to exit)</strong></p>
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

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Splash.css";

function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/home");
    }, 4000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="splash">
      <div className="overlay">
        <h1>🛕</h1>
        <h2>Ganesha's Treasure Hunt</h2>
        <p>The Sacred Modak Quest</p>
        <button onClick={() => navigate("/home")}>
          Start Adventure
        </button>
      </div>
    </div>
  );
}

export default Splash;


import { useNavigate } from "react-router-dom";
import templeImg from "../../assets/images/environment/temple.png";
import "./Splash.css";

function Splash() {
  const navigate = useNavigate();

  return (
    <div className="splash">
      <div className="splash-overlay">
        <div className="splash-temple-container">
          <img src={templeImg} alt="Sacred Temple" className="splash-temple-img" />
        </div>
        <h2>Ganesha's Treasure Hunt</h2>
        <p>The Sacred Modak Quest</p>
        <button className="splash-start-btn" onClick={() => navigate("/home")}>
          Start Adventure
        </button>
      </div>
    </div>
  );
}

export default Splash;


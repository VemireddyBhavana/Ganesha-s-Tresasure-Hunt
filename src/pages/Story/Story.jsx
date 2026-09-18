import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Story.css";

const STORY_SLIDES = [
  {
    icon: "🌅",
    title: "Ganesh Chaturthi is Tomorrow...",
    desc: "The sacred celebration is arriving, and joy fills the entire town. Everyone is getting ready to welcome Lord Ganesha!",
  },
  {
    icon: "🛕",
    title: "The Temple Needs Help!",
    desc: "The temple preparations are still incomplete because sacred offerings have been scattered across different areas.",
  },
  {
    icon: "🐭",
    title: "A Message from Mushak",
    desc: "Friendly Mushak, Lord Ganesha's companion, approaches you: 'Will you volunteer to gather the sacred items before the festival starts?'",
  },
  {
    icon: "🔔",
    title: "The Sacred Mission",
    desc: "Collect flowers, durva grass, fresh coconuts, diyas, and delicious modaks before the evening aarti bell rings!",
  },
];

function Story() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < STORY_SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate("/tutorial");
    }
  };

  const handleSkip = () => {
    navigate("/tutorial");
  };

  const slide = STORY_SLIDES[currentSlide];

  return (
    <div className="story">
      <div className="story-card">
        <div className="story-progress">
          {STORY_SLIDES.map((_, index) => (
            <span
              key={index}
              className={`story-dot ${index === currentSlide ? "active" : ""}`}
            />
          ))}
        </div>

        <div className="story-icon">{slide.icon}</div>
        <h1>{slide.title}</h1>
        <p>{slide.desc}</p>

        <div className="story-buttons">
          <button className="story-btn-secondary" onClick={handleSkip}>
            Skip to Tutorial
          </button>
          <button className="story-btn-primary" onClick={handleNext}>
            {currentSlide < STORY_SLIDES.length - 1 ? "Next ➔" : "Start Tutorial ➔"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Story;

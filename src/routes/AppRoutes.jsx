import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "../pages/Home/Home";
import Story from "../pages/Story/Story";
import Splash from "../pages/Splash/Splash";
import Tutorial from "../pages/Tutorial/Tutorial";
import Game from "../pages/Game/Game";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/home" element={<Home />} />
        <Route path="/story" element={<Story />} />
        <Route path="/tutorial" element={<Tutorial />} />
        <Route path="/game" element={<Game />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;

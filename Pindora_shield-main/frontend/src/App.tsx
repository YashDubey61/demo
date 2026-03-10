import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import ResultPage from "./pages/ResultPage";
import MoleculeViewer from "./pages/MoleculeViewer";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/viewer" element={<MoleculeViewer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

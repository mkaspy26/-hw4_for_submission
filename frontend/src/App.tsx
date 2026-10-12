import { Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar";
import ChatWidget from "./components/ChatWidget";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import About from "./pages/About";
import Login from "./pages/Login";
import CreateAccount from "./pages/CreateAccount";
import Secret from "./components/Secret";
import Grimoire from "./components/Grimoire";
import { useSecrets } from "./SecretsContext";

export default function App() {
  const { justCompleted, dismissCompleted, total, setGrimoireOpen } = useSecrets();
  return (
    <>
      <NavBar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:productId" element={<ProductDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/create-account" element={<CreateAccount />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
      <footer className="footer">
        <div className="footer-motto">Lux et Veritas</div>
        <p>
          Campus Customs · 57 Broadway, New Haven, CT 06511 <Secret id="apizza" /> · Officially licensed Yale merchandise
        </p>
        <p className="footer-fine">
          {total} keys lie hidden about these halls, each unlocking a secret of Yale <Secret id="burger" />{" "}
          <button className="link-btn footer-grimoire" onClick={() => setGrimoireOpen(true)}>
            Open the Grimoire
          </button>
        </p>
      </footer>
      {justCompleted && (
        <div className="secrets-complete" role="dialog" onClick={dismissCompleted}>
          <div>
            <p className="eyebrow">🗝 All {total} keys found 🗝</p>
            <h2>The Grimoire is complete.</h2>
            <p>The old stones have no more secrets to give you. Sir Handsome Dan tips his crown to you… for now.</p>
            <button className="btn">Return to the shop</button>
          </div>
        </div>
      )}
      <Grimoire />
      <ChatWidget />
    </>
  );
}

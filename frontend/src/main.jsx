import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { AuthProvider } from "./auth.jsx";
import App from "./App.jsx";
import Home from "./pages/Home.jsx";
import EventPage from "./pages/EventPage.jsx";
import Checkout from "./pages/Checkout.jsx";
import OrderPage from "./pages/OrderPage.jsx";
import TicketView from "./pages/TicketView.jsx";
import MyTickets from "./pages/MyTickets.jsx";
import Organizer from "./pages/Organizer.jsx";
import OrganizerDashboard from "./pages/OrganizerDashboard.jsx";
import Results from "./pages/Results.jsx";
import LegalPage from "./pages/LegalPage.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<App />}>
            <Route path="/" element={<Home />} />
            <Route path="/e/:slug" element={<EventPage />} />
            <Route path="/e/:slug/checkout" element={<Checkout />} />
            <Route path="/e/:slug/results" element={<Results />} />
            <Route path="/order/:reference" element={<OrderPage />} />
            <Route path="/t/:qr" element={<TicketView />} />
            <Route path="/tickets" element={<MyTickets />} />
            <Route path="/legal/:slug" element={<LegalPage />} />
            <Route path="/organize" element={<Organizer />} />
            <Route path="/organize/:slug" element={<OrganizerDashboard />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);

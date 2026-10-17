
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";

import Dashboard from "./pages/main/Dashboard";

import Warehouse from "./pages/warehouse-production/Warehouse";
import Purchases from "./pages/warehouse-production/Purchases";
import FeedProduction from "./pages/warehouse-production/FeedProduction";
import FeedInventory from "./pages/warehouse-production/FeedInventory";
import InventoryTransfers from "./pages/warehouse-production/InventoryTransfers";

import ComingSoon from "./pages/ComingSoon";

import { navigation } from "./config/navigation";

export default function App() {
  const implementedPaths = new Set([
    "/",
    "/warehouse",
    "/purchases",
    "/feed-production",
    "/feed-inventory",
    "/inventory-transfers",
  ]);

  const futurePages = navigation
    .flatMap((group) => group.items)
    .filter((item) => !implementedPaths.has(item.path));

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>

          {/* ASOSIY */}

          <Route
            index
            element={<Dashboard />}
          />

          {/* OMBOR VA ISHLAB CHIQARISH */}

          <Route
            path="/warehouse"
            element={<Warehouse />}
          />

          <Route
            path="/purchases"
            element={<Purchases />}
          />

          <Route
            path="/feed-production"
            element={<FeedProduction />}
          />

          <Route
            path="/feed-inventory"
            element={<FeedInventory />}
          />

          <Route
            path="/inventory-transfers"
            element={<InventoryTransfers />}
          />

          {/* FUTURE PAGES */}

          {futurePages.map((item) => (
            <Route
              key={item.path}
              path={item.path}
              element={<ComingSoon title={item.title} />}
            />
          ))}

          {/* UNKNOWN PATH */}

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

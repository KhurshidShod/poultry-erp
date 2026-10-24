import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from './components/layout/AppLayout';

import Dashboard from './pages/main/Dashboard';

import FeedInventory from './pages/warehouse-production/FeedInventory';
import FeedProduction from './pages/warehouse-production/FeedProduction';
import InventoryTransfers from './pages/warehouse-production/InventoryTransfers';
import Purchases from './pages/warehouse-production/Purchases';
import Warehouse from './pages/warehouse-production/Warehouse';

import ComingSoon from './pages/ComingSoon';
import FeedTypes from './pages/master-data/FeedTypes';
import Locations from './pages/master-data/Locations';
import Partners from './pages/master-data/Partners';
import Products from './pages/master-data/Products';
import Recipes from './pages/master-data/Recipes';
import ChickenBatches from './pages/poultry/ChickenBatches';
import EggChickHouse from './pages/poultry/EggChickHouse';
import EggFarm from './pages/poultry/EggFarm';
import EggProduction from './pages/poultry/EggProduction';
import MeatHouse from './pages/poultry/MeatHouse';
import FarmFeedInventory from './pages/warehouse-production/FarmFeedInventory';
import Sales from './pages/finance/Sales';
import Finance from './pages/finance/Finance';
import Veterinary from './pages/poultry/Veterinary';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          {/* Main */}
          <Route path="/" element={<Dashboard />} />

          {/* Warehouse */}
          <Route path="/warehouse" element={<Warehouse />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/feed-production" element={<FeedProduction />} />
          <Route path="/feed-inventory" element={<FeedInventory />} />
          <Route path="/inventory-transfers" element={<InventoryTransfers />} />
          <Route path="/farm-feed-inventory" element={<FarmFeedInventory />} />

          {/* Poultry */}
          <Route path="/chickens" element={<ComingSoon title="" />} />
          <Route path="/eggs" element={<EggProduction />} />
          <Route path="/broken-eggs" element={<ComingSoon title="" />} />
          <Route
            path="/veterinary"
            element={<Veterinary />}
          />
          <Route path="/chicken-batches" element={<ChickenBatches />} />
          <Route path="/meat" element={<MeatHouse />} />
          <Route path="/egg-chick-house" element={<EggChickHouse />} />
          <Route
            path="/egg-farm-1"
            element={<EggFarm locationId="egg-farm-1" />}
          />

          <Route
            path="/egg-farm-2"
            element={<EggFarm locationId="egg-farm-2" />}
          />
          {/* Finance */}
          <Route path="/sales" element={<Sales />} />
          <Route path="/employees" element={<ComingSoon title="Employees" />} />
          <Route path="/utilities" element={<ComingSoon title="Utilities" />} />
          <Route
            path="/equipment-expenses"
            element={<ComingSoon title="Expenses" />}
          />
          <Route path="/finance" element={<Finance />} />
          <Route
            path="/profit-loss"
            element={<ComingSoon title="Profit Loss" />}
          />
          <Route path="/reports" element={<ComingSoon title="Reports" />} />

          {/* Master data */}
          <Route path="/products" element={<Products />} />
          <Route path="/partners" element={<Partners />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/feed-types" element={<FeedTypes />} />
          <Route path="/recipes" element={<Recipes />} />
          {/* System */}
          <Route path="/settings" element={<ComingSoon title="Settings" />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

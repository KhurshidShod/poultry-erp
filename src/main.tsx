import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';

import { FarmFeedProvider } from './context/FarmFeedContext';
import { LocationsProvider } from './context/LocationsContext';
import { MasterDataProvider } from './context/MasterDataContext';
import { PoultryProvider } from './context/PoultryContext';
import { ThemeProvider } from './context/ThemeContext';
import { WarehouseProvider } from './context/WarehouseContext';

import { EggInventoryProvider } from './context/EggInventoryContext';
import { EggProductionProvider } from './context/EggProductionContext';
import { FeedPlanningProvider } from './context/FeedPlanningContext';
import { MeatSalesProvider } from './context/MeatSalesContext';
import { SalesPaymentProvider } from './context/SalesPaymentContext';
import {
  VeterinaryInventoryProvider,
} from './context/VeterinaryInventoryContext';
import './index.css';
import { VeterinaryProvider } from './context/VeterinaryContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <MasterDataProvider>
        <LocationsProvider>
          <WarehouseProvider>
            <PoultryProvider>
              <VeterinaryProvider>
                <VeterinaryInventoryProvider>
                  <FarmFeedProvider>
                    <FeedPlanningProvider>
                      <EggProductionProvider>
                        <EggInventoryProvider>
                          <MeatSalesProvider>
                            <SalesPaymentProvider>
                              <App />
                            </SalesPaymentProvider>
                          </MeatSalesProvider>
                        </EggInventoryProvider>
                      </EggProductionProvider>
                    </FeedPlanningProvider>
                  </FarmFeedProvider>
                </VeterinaryInventoryProvider>
              </VeterinaryProvider>
            </PoultryProvider>
          </WarehouseProvider>
        </LocationsProvider>
      </MasterDataProvider>
    </ThemeProvider>
  </React.StrictMode>
);

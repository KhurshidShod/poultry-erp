
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type LocationType =
  | "warehouse"
  | "feed-warehouse"
  | "poultry"
  | "egg-production"
  | "meat-production"
  | "other";

export interface Location {
  id: string;
  code: string;
  name: string;
  type: LocationType;
  description: string;
  active: boolean;
  canReceiveFeed: boolean;
  isFeedSource: boolean;
}

interface LocationsContextValue {
  locations: Location[];
  activeLocations: Location[];
  feedDestinations: Location[];
  feedSource: Location | undefined;

  saveLocation: (location: Location) => void;
  getLocation: (id: string) => Location | undefined;
}

const LocationsContext =
  createContext<LocationsContextValue | null>(null);

export const locationTypeLabels: Record<
  LocationType,
  string
> = {
  warehouse: "Xomashyo ombori",
  "feed-warehouse": "Yem ombori",
  poultry: "Jo'jaxona",
  "egg-production": "Tuxum ishlab chiqarish",
  "meat-production": "Go'sht yetishtirish",
  other: "Boshqa bo'lim",
};

const initialLocations: Location[] = [
  {
    id: "main-warehouse",
    code: "OMB-001",
    name: "Asosiy ombor",
    type: "warehouse",
    description: "Xomashyo va ingredientlar ombori",
    active: true,
    canReceiveFeed: false,
    isFeedSource: false,
  },
  {
    id: "feed-warehouse",
    code: "OMB-002",
    name: "Yem ombori",
    type: "feed-warehouse",
    description: "Ishlab chiqarilgan yem saqlanadi",
    active: true,
    canReceiveFeed: false,
    isFeedSource: true,
  },
  {
    id: "chick-house",
    code: "PAR-001",
    name: "Jo'jalar bo'limi",
    type: "poultry",
    description: "110 kunlik jo'ja parvarishi",
    active: true,
    canReceiveFeed: true,
    isFeedSource: false,
  },
  {
    id: "egg-farm-1",
    code: "TUX-001",
    name: "Tuxum fermasi №1",
    type: "egg-production",
    description: "Birinchi tuxum ishlab chiqarish fermasi",
    active: true,
    canReceiveFeed: true,
    isFeedSource: false,
  },
  {
    id: "egg-farm-2",
    code: "TUX-002",
    name: "Tuxum fermasi №2",
    type: "egg-production",
    description: "Ikkinchi tuxum ishlab chiqarish fermasi",
    active: true,
    canReceiveFeed: true,
    isFeedSource: false,
  },
  {
    id: "meat-farm",
    code: "GOS-001",
    name: "Go'sht fermasi",
    type: "meat-production",
    description: "40–45 kunlik broyler yetishtirish",
    active: true,
    canReceiveFeed: true,
    isFeedSource: false,
  },
];

export function LocationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [locations, setLocations] =
    useState<Location[]>(initialLocations);

  const activeLocations = useMemo(
    () => locations.filter((item) => item.active),
    [locations]
  );

  const feedDestinations = useMemo(
    () =>
      activeLocations.filter(
        (item) =>
          item.canReceiveFeed &&
          !item.isFeedSource
      ),
    [activeLocations]
  );

  const feedSource = useMemo(
    () =>
      activeLocations.find(
        (item) =>
          item.id === "feed-warehouse" &&
          item.isFeedSource
      ),
    [activeLocations]
  );

  function saveLocation(location: Location) {
    setLocations((previous) => {
      const exists = previous.some(
        (item) => item.id === location.id
      );

      if (exists) {
        return previous.map((item) =>
          item.id === location.id ? location : item
        );
      }

      return [...previous, location];
    });
  }

  function getLocation(id: string) {
    return locations.find((item) => item.id === id);
  }

  return (
    <LocationsContext.Provider
      value={{
        locations,
        activeLocations,
        feedDestinations,
        feedSource,
        saveLocation,
        getLocation,
      }}
    >
      {children}
    </LocationsContext.Provider>
  );
}

export function useLocations() {
  const context = useContext(LocationsContext);

  if (!context) {
    throw new Error(
      "useLocations must be used inside LocationsProvider"
    );
  }

  return context;
}


import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { warehouseMaterials } from "../data/warehouseData";
import type { Material } from "../types/warehouse";

// ========================================
// TYPES
// ========================================

export type Product = Material & {
  active: boolean;
};

export type PartnerRole =
  | "supplier"
  | "customer"
  | "both";

export interface Partner {
  id: string;
  name: string;
  role: PartnerRole;
  phone: string;
  note: string;
  active: boolean;
}

export interface FeedType {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

export interface RecipeIngredient {
  materialId: string;
  percentage: number;
}

export interface FeedRecipe {
  id: string;
  feedTypeId: string;
  name: string;
  description: string;
  ingredients: RecipeIngredient[];
  active: boolean;
}

interface MasterDataContextValue {
  products: Product[];
  partners: Partner[];
  feedTypes: FeedType[];
  recipes: FeedRecipe[];

  activeProducts: Product[];
  suppliers: Partner[];
  customers: Partner[];
  activeFeedTypes: FeedType[];

  saveProduct: (product: Product) => void;
  savePartner: (partner: Partner) => void;
  saveFeedType: (feedType: FeedType) => void;
  saveRecipe: (recipe: FeedRecipe) => void;

  getRecipesByFeedType: (
    feedTypeId: string
  ) => FeedRecipe[];
}

// ========================================
// CONTEXT
// ========================================

const MasterDataContext =
  createContext<MasterDataContextValue | null>(null);

// ========================================
// STORAGE
// ========================================

// Frontend-only persistence.
// Later these records will be stored in PostgreSQL.

const STORAGE_KEYS = {
  products: "poultry-erp-master-products-v1",
  partners: "poultry-erp-master-partners-v1",
  feedTypes: "poultry-erp-feed-types-v1",
  recipes: "poultry-erp-recipes-v1",
} as const;

function loadSavedArray<T>(
  key: string,
  fallback: T[]
): T[] {
  try {
    const raw = localStorage.getItem(key);

    if (raw === null) {
      return fallback.map((item) => ({ ...item }));
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return fallback.map((item) => ({ ...item }));
    }

    return parsed as T[];
  } catch (error) {
    console.error(
      `Ma'lumotlarni yuklashda xatolik: ${key}`,
      error
    );

    return fallback.map((item) => ({ ...item }));
  }
}

function persistArray<T>(
  key: string,
  values: T[]
): void {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(values)
    );
  } catch (error) {
    console.error(
      `Ma'lumotlarni saqlashda xatolik: ${key}`,
      error
    );

    throw new Error(
      "Ma'lumotlarni brauzer xotirasiga saqlab bo'lmadi."
    );
  }
}

// ========================================
// INITIAL DATA
// ========================================

const initialProducts: Product[] =
  warehouseMaterials.map((material) => ({
    ...material,
    active: true,
  }));

const initialPartners: Partner[] = [
  {
    id: "supplier-a",
    name: "Yetkazib beruvchi A",
    role: "supplier",
    phone: "",
    note: "",
    active: true,
  },
  {
    id: "supplier-b",
    name: "Yetkazib beruvchi B",
    role: "supplier",
    phone: "",
    note: "",
    active: true,
  },
  {
    id: "supplier-c",
    name: "Yetkazib beruvchi C",
    role: "supplier",
    phone: "",
    note: "",
    active: true,
  },
];

const initialFeedTypes: FeedType[] = [
  {
    id: "layer",
    name: "Tuxumchi tovuqlar yemi",
    description:
      "Tuxum ishlab chiqaruvchi tovuqlar uchun",
    active: true,
  },
  {
    id: "broiler",
    name: "Broiler yemi",
    description:
      "Go'sht yo'nalishidagi tovuqlar uchun",
    active: true,
  },
  {
    id: "chick",
    name: "Jo'jalar yemi",
    description: "Yosh jo'jalar uchun",
    active: true,
  },
];

const initialRecipes: FeedRecipe[] = [];

// ========================================
// HELPERS
// ========================================

function upsert<T extends { id: string }>(
  items: T[],
  item: T
): T[] {
  return items.some((old) => old.id === item.id)
    ? items.map((old) =>
        old.id === item.id ? item : old
      )
    : [...items, item];
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

// ========================================
// PROVIDER
// ========================================

export function MasterDataProvider({
  children,
}: {
  children: ReactNode;
}) {
  // ======================================
  // STATE WITH PERSISTENCE
  // ======================================

  const [products, setProducts] =
    useState<Product[]>(() =>
      loadSavedArray(
        STORAGE_KEYS.products,
        initialProducts
      )
    );

  const [partners, setPartners] =
    useState<Partner[]>(() =>
      loadSavedArray(
        STORAGE_KEYS.partners,
        initialPartners
      )
    );

  const [feedTypes, setFeedTypes] =
    useState<FeedType[]>(() =>
      loadSavedArray(
        STORAGE_KEYS.feedTypes,
        initialFeedTypes
      )
    );

  const [recipes, setRecipes] =
    useState<FeedRecipe[]>(() =>
      loadSavedArray(
        STORAGE_KEYS.recipes,
        initialRecipes
      )
    );

  // ======================================
  // SAVE PRODUCT
  // ======================================

  function saveProduct(product: Product) {
    const name = normalizeName(product.name);

    if (!product.id || !name) {
      throw new Error(
        "Mahsulot nomi va ID si majburiy."
      );
    }

    if (
      !Number.isFinite(product.quantity) ||
      product.quantity < 0 ||
      !Number.isFinite(product.reserved) ||
      product.reserved < 0 ||
      !Number.isFinite(product.minStock) ||
      product.minStock < 0 ||
      !Number.isFinite(product.unitCost) ||
      product.unitCost < 0
    ) {
      throw new Error(
        "Mahsulot miqdori yoki narxi noto'g'ri."
      );
    }

    const next = upsert(products, {
      ...product,
      name,
    });

    persistArray(STORAGE_KEYS.products, next);
    setProducts(next);
  }

  // ======================================
  // SAVE PARTNER
  // ======================================

  function savePartner(partner: Partner) {
    const name = normalizeName(partner.name);

    if (!partner.id || !name) {
      throw new Error(
        "Hamkor nomi majburiy."
      );
    }

    if (
      partner.role !== "supplier" &&
      partner.role !== "customer" &&
      partner.role !== "both"
    ) {
      throw new Error(
        "Hamkor turi noto'g'ri."
      );
    }

    const next = upsert(partners, {
      ...partner,
      name,
    });

    persistArray(STORAGE_KEYS.partners, next);
    setPartners(next);
  }

  // ======================================
  // SAVE FEED TYPE
  // ======================================

  function saveFeedType(feedType: FeedType) {
    const name = normalizeName(feedType.name);

    if (!feedType.id || !name) {
      throw new Error(
        "Yem turi nomini kiriting."
      );
    }

    const duplicate = feedTypes.some(
      (item) =>
        item.id !== feedType.id &&
        item.name.trim().toLowerCase() ===
          name.toLowerCase()
    );

    if (duplicate) {
      throw new Error(
        "Bunday nomli yem turi mavjud."
      );
    }

    const next = upsert(feedTypes, {
      ...feedType,
      name,
      description: feedType.description.trim(),
    });

    persistArray(STORAGE_KEYS.feedTypes, next);
    setFeedTypes(next);
  }

  // ======================================
  // SAVE RECIPE
  // ======================================

  function saveRecipe(recipe: FeedRecipe) {
    const name = normalizeName(recipe.name);

    const ingredients =
      recipe.ingredients.map((item) => ({
        materialId: item.materialId,
        percentage: item.percentage,
      }));

    const feedType = feedTypes.find(
      (item) =>
        item.id === recipe.feedTypeId
    );

    if (!recipe.id || !name || !feedType) {
      throw new Error(
        "Retsept nomi yoki yem turi noto'g'ri."
      );
    }

    const duplicateName = recipes.some(
      (item) =>
        item.id !== recipe.id &&
        item.feedTypeId === recipe.feedTypeId &&
        item.name.trim().toLowerCase() ===
          name.toLowerCase()
    );

    if (duplicateName) {
      throw new Error(
        "Bu yem turi uchun bunday retsept mavjud."
      );
    }

    const total = ingredients.reduce(
      (sum, item) =>
        sum + item.percentage,
      0
    );

    if (
      ingredients.length === 0 ||
      Math.abs(total - 100) > 0.0001 ||
      ingredients.some(
        (item) =>
          !Number.isFinite(item.percentage) ||
          item.percentage <= 0 ||
          !products.some(
            (product) =>
              product.id === item.materialId &&
              product.unit === "kg"
          )
      )
    ) {
      throw new Error(
        "Retsept tarkibi noto'g'ri. Jami 100% bo'lishi kerak."
      );
    }

    const uniqueIngredientIds =
      new Set(
        ingredients.map(
          (item) => item.materialId
        )
      );

    if (
      uniqueIngredientIds.size !==
      ingredients.length
    ) {
      throw new Error(
        "Bir mahsulot retseptga ikki marta kiritilgan."
      );
    }

    const nextRecipe: FeedRecipe = {
      ...recipe,
      name,
      description: recipe.description.trim(),
      ingredients,
    };

    const next = upsert(recipes, nextRecipe);

    persistArray(STORAGE_KEYS.recipes, next);
    setRecipes(next);
  }

  // ======================================
  // DERIVED DATA
  // ======================================

  const activeProducts = useMemo(
    () =>
      products.filter(
        (product) => product.active
      ),
    [products]
  );

  const suppliers = useMemo(
    () =>
      partners.filter(
        (partner) =>
          partner.active &&
          (
            partner.role === "supplier" ||
            partner.role === "both"
          )
      ),
    [partners]
  );

  const customers = useMemo(
    () =>
      partners.filter(
        (partner) =>
          partner.active &&
          (
            partner.role === "customer" ||
            partner.role === "both"
          )
      ),
    [partners]
  );

  const activeFeedTypes = useMemo(
    () =>
      feedTypes.filter(
        (feedType) => feedType.active
      ),
    [feedTypes]
  );

  function getRecipesByFeedType(
    feedTypeId: string
  ): FeedRecipe[] {
    return recipes.filter(
      (recipe) =>
        recipe.feedTypeId === feedTypeId &&
        recipe.active
    );
  }

  // ======================================
  // PROVIDER VALUE
  // ======================================

  const value: MasterDataContextValue = {
    products,
    partners,
    feedTypes,
    recipes,

    activeProducts,
    suppliers,
    customers,
    activeFeedTypes,

    saveProduct,
    savePartner,
    saveFeedType,
    saveRecipe,

    getRecipesByFeedType,
  };

  return (
    <MasterDataContext.Provider value={value}>
      {children}
    </MasterDataContext.Provider>
  );
}

// ========================================
// HOOK
// ========================================

export function useMasterData() {
  const context = useContext(MasterDataContext);

  if (!context) {
    throw new Error(
      "MasterDataProvider mavjud emas."
    );
  }

  return context;
}

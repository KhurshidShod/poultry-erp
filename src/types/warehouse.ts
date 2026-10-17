
export type MaterialCategory =
  | "Don mahsulotlari"
  | "Yog' va qo'shimchalar"
  | "Minerallar"
  | "Boshqa";

export type StockStatus = "available" | "low" | "out";

export interface Material {
  id: string;
  code: string;
  name: string;
  category: MaterialCategory;
  unit: "kg" | "litr" | "dona";
  quantity: number;
  reserved: number;
  minStock: number;
  unitCost: number;
  currency: "UZS";
  warehouse: string;
  lastUpdated: string;
}

export interface Purchase {
  id: string;
  date: string;
  supplier: string;
  materialId: string;
  quantity: number;
  unitPrice: number;
  status: "received" | "draft";
}

export interface IngredientUsage {
  materialId: string;
  quantity: number;
}

export interface FeedProduction {
  id: string;
  date: string;
  feedType: string;
  recipeName: string;
  quantity: number;
  ingredients: IngredientUsage[];
  status: "completed" | "draft";
}

export interface FeedTransfer {
  id: string;
  date: string;
  productionId: string;
  from: string;
  to: string;
  quantity: number;
  status: "received" | "sent" | "draft";
}

export interface FeedStock {
  productionId: string;
  feedType: string;
  recipeName: string;
  produced: number;
  transferred: number;
  remaining: number;
}

export function getAvailableStock(
  material: Material
): number {
  return material.quantity - material.reserved;
}

export function getStockStatus(
  material: Material
): StockStatus {
  const available = getAvailableStock(material);

  if (available <= 0) return "out";
  if (available <= material.minStock) return "low";

  return "available";
}

export function getStockValue(
  material: Material
): number {
  return material.quantity * material.unitCost;
}

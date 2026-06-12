import { readRestaurantData } from './restaurantData';

export type InventoryProduct = {
  id: number;
  name: string;
  sku: string;
  itemType?: string;
  category: string;
  stock: number;
  maxStock: number;
  price: number;
  expiry: string;
  location?: string;
  unit: string;
  storageTemperature?: string;
  minStock?: number;
  reorderPoint?: number;
};

export const defaultCategoryHierarchy: { [key: string]: string[] } = {
  Fruits: ['Citrus Fruits', 'Berries', 'Tropical Fruits', 'Stone Fruits', 'Melons'],
  Vegetables: ['Leafy Greens', 'Root Vegetables', 'Cruciferous', 'Nightshades', 'Squash'],
  Meat: ['Poultry', 'Beef', 'Pork', 'Lamb', 'Game Meat'],
  Seafood: ['Fish', 'Shellfish', 'Crustaceans', 'Mollusks', 'Canned Seafood'],
  Dairy: ['Milk Products', 'Cheese', 'Yogurt', 'Butter & Cream', 'Eggs'],
  Bakery: ['Bread', 'Pastries', 'Cakes', 'Cookies', 'Muffins'],
  'Oils & Condiments': ['Cooking Oils', 'Vinegars', 'Sauces', 'Spices', 'Seasonings'],
  'Frozen Foods': ['Frozen Vegetables', 'Frozen Fruits', 'Frozen Meals', 'Ice Cream', 'Frozen Seafood'],
};

export const defaultStorageTemperatureOptions = [
  'Frozen (-18 C or below)',
  'Chilled (0-4 C)',
  'Cool Storage (5-10 C)',
  'Room Temperature (20-25 C)',
  'Dry Storage',
];

export const defaultInventoryProducts: InventoryProduct[] = [];

export function getInventoryProducts() {
  return readRestaurantData<InventoryProduct[]>('inventory.products', defaultInventoryProducts);
}

export function getCategoryHierarchy() {
  const storedHierarchy = readRestaurantData<{ [key: string]: string[] }>('inventory.categoryHierarchy', {});

  return Object.entries(storedHierarchy).reduce(
    (hierarchy, [category, subCategories]) => ({
      ...hierarchy,
      [category]: Array.from(new Set([...(hierarchy[category] || []), ...subCategories])),
    }),
    { ...defaultCategoryHierarchy },
  );
}

export function getStorageTemperatureOptions() {
  const customOptions = readRestaurantData<string[]>('inventory.storageTemperatureOptions', []);
  return Array.from(new Set([...defaultStorageTemperatureOptions, ...customOptions].filter(Boolean)));
}

export function splitCategory(category: string) {
  const [main = 'Uncategorized', sub = 'General'] = category.split(' > ');
  return { main, sub };
}

export type StockStatus = 'healthy' | 'medium' | 'low' | 'critical' | 'out-of-stock' | 'overstock';

export function getStockStatus(stock: number, maxStock: number): StockStatus {
  if (stock <= 0) return 'out-of-stock';
  const percentage = maxStock > 0 ? (stock / maxStock) * 100 : 0;
  if (percentage <= 10) return 'critical';
  if (percentage <= 30) return 'low';
  if (percentage <= 70) return 'medium';
  if (percentage <= 100) return 'healthy';
  if (percentage > 100) return 'overstock';
  return 'healthy';
}

export function getDaysUntilExpiry(expiry: string) {
  const expiryTime = new Date(`${expiry}T00:00:00`).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((expiryTime - today.getTime()) / 86400000);
}

export function isExpiringSoon(product: InventoryProduct) {
  return getDaysUntilExpiry(product.expiry) <= 7;
}

export function formatCurrency(value: number) {
  return `PHP ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function getInventoryValue(products: InventoryProduct[]) {
  return products.reduce((sum, product) => sum + product.stock * product.price, 0);
}

export function formatQuantity(value: number, unit?: string) {
  const unitLabel = unit?.trim() || 'unit';
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unitLabel}`;
}

export function getCategoryQuantityData(products: InventoryProduct[]) {
  const grouped = new Map<string, number>();

  products.forEach((product) => {
    const { main } = splitCategory(product.category);
    grouped.set(main, (grouped.get(main) || 0) + product.stock);
  });

  return Array.from(grouped.entries()).map(([category, value]) => ({
    id: category.toLowerCase().replace(/\s+/g, '-'),
    category,
    value,
  }));
}

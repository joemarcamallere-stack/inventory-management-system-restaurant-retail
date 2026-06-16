import { useState } from "react";
import { Search, AlertTriangle } from "lucide-react";
import { useRestaurantInventoryQuery } from "../lib/restaurantQueries";

type Product = {
  id: number;
  backendId?: string;
  name: string;
  sku: string;
  category: string;
  itemType: string;
  stock: number;
  price: number;
  unit: string;
};

export function ProductManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const productsQuery = useRestaurantInventoryQuery<Product[]>();
  const products = productsQuery.data ?? [];

  const nameCounts = products.reduce<Record<string, number>>((acc, p) => {
    const key = p.name.trim().toLowerCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = products.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Product Catalog</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search by name, SKU, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {productsQuery.isLoading && (
        <p className="text-sm text-gray-500">Loading products...</p>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3 text-right">Unit Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && !productsQuery.isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No products found
                </td>
              </tr>
            )}
            {filtered.map((product) => {
              const isDuplicate = nameCounts[product.name.trim().toLowerCase()] > 1;
              return (
                <tr
                  key={product.backendId ?? product.id}
                  className={isDuplicate ? "bg-amber-50" : "hover:bg-gray-50"}
                >
                  <td className="px-4 py-3 font-medium text-gray-800 flex items-center gap-2">
                    {isDuplicate && (
                      <AlertTriangle
                        className="w-4 h-4 text-amber-500 flex-shrink-0"
                        aria-label="Duplicate name"
                      />
                    )}
                    {product.name}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono">{product.sku}</td>
                  <td className="px-4 py-3 text-gray-600">{product.category}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                      {product.itemType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {product.stock} {product.unit}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    ₱{product.price.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

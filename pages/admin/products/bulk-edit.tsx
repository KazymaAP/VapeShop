import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { SkeletonLoader } from '../../../components/SkeletonLoader';

interface Product {
  id: number;
  name: string;
  price: number;
  discount_percent?: number;
  is_hit?: boolean;
  is_new?: boolean;
}

interface BulkUpdates {
  price_action?: string;
  price_value?: number;
  discount_percent?: number;
  is_hit?: boolean;
  is_new?: boolean;
}

export default function BulkEditProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState(new Set<number>());
  const [loading, setLoading] = useState(true);
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [bulkValue, setBulkValue] = useState('');
  const [priceAction, setPriceAction] = useState('set');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products');
      const data = await res.json();
      setProducts(data.data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (productId: number) => {
    const newSelected = new Set(selected);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelected(newSelected);
  };

  const handleBulkUpdate = async () => {
    if (selected.size === 0 || !bulkAction) return;

    try {
      const updates: BulkUpdates = {};

      if (bulkAction === 'price') {
        updates.price_action = priceAction;
        updates.price_value = parseFloat(bulkValue);
      } else if (bulkAction === 'discount') {
        updates.discount_percent = parseFloat(bulkValue);
      } else if (bulkAction === 'status') {
        updates.is_hit = bulkValue === 'hit';
        updates.is_new = bulkValue === 'new';
      }

      const res = await fetch('/api/admin/products/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_ids: Array.from(selected),
          updates,
        }),
      });

      if (res.ok) {
        alert('Updated successfully!');
        setSelected(new Set());
        setBulkValue('');
        fetchProducts();
      }
    } catch (err) {
      console.error('Error updating:', err);
    }
  };

  if (loading) return <SkeletonLoader count={10} />;

  return (
    <AdminLayout title="Bulk Edit Products">
      <div className="mb-6 bg-cardBg border border-border rounded-lg p-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <select
            value={bulkAction || ''}
            onChange={(e) => setBulkAction(e.target.value)}
            className="p-2 bg-bgDark border border-border rounded text-textPrimary"
          >
            <option value="">Select action...</option>
            <option value="price">Change Price</option>
            <option value="discount">Set Discount</option>
            <option value="status">Change Status</option>
          </select>

          {bulkAction === 'price' && (
            <>
              <select
                value={priceAction}
                onChange={(e) => setPriceAction(e.target.value)}
                className="p-2 bg-bgDark border border-border rounded text-textPrimary"
              >
                <option value="set">Set to</option>
                <option value="percent_increase">Increase by %</option>
                <option value="percent_decrease">Decrease by %</option>
                <option value="multiply">Multiply by</option>
              </select>
            </>
          )}

          {bulkAction === 'status' && (
            <select
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              className="p-2 bg-bgDark border border-border rounded text-textPrimary"
            >
              <option value="">Select status...</option>
              <option value="hit">Hit</option>
              <option value="new">New</option>
              <option value="regular">Regular</option>
            </select>
          )}

          {(bulkAction === 'price' || bulkAction === 'discount') && (
            <input
              type="number"
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              placeholder="Value"
              className="p-2 bg-bgDark border border-border rounded text-textPrimary"
            />
          )}
        </div>

        <button
          onClick={handleBulkUpdate}
          disabled={selected.size === 0}
          className="w-full px-4 py-2 bg-neon text-bgDark rounded-lg disabled:opacity-50"
        >
          Update {selected.size} products
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-textPrimary text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="p-2 text-left">
                <input
                  type="checkbox"
                  checked={selected.size === products.length}
                  onChange={() => {
                    if (selected.size === products.length) {
                      setSelected(new Set());
                    } else {
                      setSelected(new Set(products.map((p) => p.id)));
                    }
                  }}
                />
              </th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-right">Price</th>
              <th className="p-2 text-right">Discount</th>
              <th className="p-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-border hover:bg-cardBg">
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={selected.has(product.id)}
                    onChange={() => toggleSelect(product.id)}
                  />
                </td>
                <td className="p-2">{product.name}</td>
                <td className="p-2 text-right">₽{product.price}</td>
                <td className="p-2 text-right">{product.discount_percent || 0}%</td>
                <td className="p-2 text-center">
                  {product.is_hit && (
                    <span className="bg-danger px-2 py-1 rounded text-xs">Hit</span>
                  )}
                  {product.is_new && (
                    <span className="bg-success px-2 py-1 rounded text-xs ml-1">New</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

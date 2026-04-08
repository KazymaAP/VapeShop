import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface PickupPoint {
  id: string;
  name: string;
  address: string;
  active: boolean;
}

interface SavedAddress {
  id: string;
  address: string;
  is_default: boolean;
}

interface DeliverySelectorProps {
  onDeliveryMethodChange: (method: 'pickup' | 'courier') => void;
  onPickupPointChange: (id: string) => void;
  onAddressChange: (address: string) => void;
  onDateChange: (date: string) => void;
  deliveryMethod: 'pickup' | 'courier';
  selectedPickupPointId: string | null;
  address: string;
  deliveryDate: string;
  error?: string;
}

/**
 * Reusable delivery selection component for cart and other pages
 * Handles pickup points and courier delivery options
 */
export default function DeliverySelector({
  onDeliveryMethodChange,
  onPickupPointChange,
  onAddressChange,
  onDateChange,
  deliveryMethod,
  selectedPickupPointId,
  address,
  deliveryDate,
  error,
}: DeliverySelectorProps) {
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDeliveryOptions();
  }, []);

  const fetchDeliveryOptions = async () => {
    setLoading(true);
    try {
      const [pickupRes, addressesRes] = await Promise.all([
        fetch('/api/pickup-points?active=true'),
        fetch('/api/addresses'),
      ]);

      if (!pickupRes.ok) {
        throw new Error(`API Error (pickup): ${pickupRes.status}`);
      }
      if (!addressesRes.ok) {
        throw new Error(`API Error (addresses): ${addressesRes.status}`);
      }

      const pickupData = await pickupRes.json();
      setPickupPoints(pickupData.pickup_points || []);

      const addressesData = await addressesRes.json();
      setSavedAddresses(addressesData.addresses || []);
    } catch (err) {
      logger.error('Error fetching delivery options:', err);
    }
    setLoading(false);
  };

  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getSelectedPickupPoint = () => {
    return pickupPoints.find((p) => p.id === selectedPickupPointId);
  };

  return (
    <div className="bg-cardBg border border-border rounded-2xl p-4 space-y-4">
      <h3 className="font-semibold text-textPrimary">Доставка</h3>

      {/* Delivery Method Selection */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            onDeliveryMethodChange('pickup');
          }}
          className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
            deliveryMethod === 'pickup'
              ? 'bg-neon text-white'
              : 'bg-bgDark border border-border text-textSecondary'
          }`}
        >
          Самовывоз
        </button>
        <button
          onClick={() => {
            onDeliveryMethodChange('courier');
          }}
          className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
            deliveryMethod === 'courier'
              ? 'bg-neon text-white'
              : 'bg-bgDark border border-border text-textSecondary'
          }`}
        >
          Курьер
        </button>
      </div>

      {/* Pickup Points */}
      {deliveryMethod === 'pickup' && (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-4">
              <div className="inline-block w-6 h-6 border-2 border-neon border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pickupPoints.length === 0 ? (
            <p className="text-textSecondary text-sm">Пункты самовывоза не найдены</p>
          ) : (
            <div className="space-y-2">
              {pickupPoints.map((point) => (
                <label
                  key={point.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-bgDark border border-border hover:border-neon cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="pickup-point"
                    value={point.id}
                    checked={selectedPickupPointId === point.id}
                    onChange={(e) => onPickupPointChange(e.target.value)}
                    className="mt-1 w-4 h-4 accent-neon"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-textPrimary font-medium text-sm">{point.name}</p>
                    <p className="text-textSecondary text-xs">{point.address}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
          {getSelectedPickupPoint() && (
            <p className="text-success text-xs mt-2">
              ✓ Выбрана точка: {getSelectedPickupPoint()?.name}
            </p>
          )}
        </div>
      )}

      {/* Courier Delivery */}
      {deliveryMethod === 'courier' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-textSecondary block mb-1">Мои адреса</label>
            {loading ? (
              <div className="text-center py-2">
                <div className="inline-block w-5 h-5 border-2 border-neon border-t-transparent rounded-full animate-spin" />
              </div>
            ) : savedAddresses.length > 0 ? (
              <select
                value={address}
                onChange={(e) => onAddressChange(e.target.value)}
                className="w-full bg-bgDark border border-border rounded-xl px-3 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-neon"
              >
                <option value="">Выберите адрес</option>
                {savedAddresses.map((addr) => (
                  <option key={addr.id} value={addr.address}>
                    {addr.address} {addr.is_default ? '(основной)' : ''}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          <div>
            <label className="text-xs text-textSecondary block mb-1">Адрес доставки</label>
            <textarea
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              placeholder="Улица, дом, квартира, город"
              className="w-full bg-bgDark border border-border rounded-xl px-3 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="text-xs text-textSecondary block mb-1">Дата доставки</label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => onDateChange(e.target.value)}
              min={getTomorrow()}
              className="w-full bg-bgDark border border-border rounded-xl px-3 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-neon"
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && <p className="text-danger text-xs px-3 py-2 bg-danger/10 rounded-lg">{error}</p>}
    </div>
  );
}

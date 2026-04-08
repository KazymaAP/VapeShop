import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import type { Mock } from '@jest/globals';
import { query, transaction } from '@/lib/db';
import handler from '@/pages/api/cart';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Unit Tests for Cart API Endpoint
 * Tests: GET (fetch cart), POST (add item), PUT (update quantity), DELETE (remove item)
 */

// Mock database
jest.mock('@/lib/db');

const mockQuery = query as Mock;
const mockTransaction = transaction as Mock;

describe('/api/cart', () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;
  let jsonMock: Mock;
  let statusMock: Mock;

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnValue(undefined);
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    req = {
      method: 'GET',
      query: {},
      body: {},
      headers: {},
    };
    
    res = {
      status: statusMock,
      json: jsonMock,
      setHeader: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe('GET /api/cart', () => {
    it('should return 400 if telegram_id is missing', async () => {
      req.method = 'GET';
      req.query = {}; // No telegram_id

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        })
      );
    });

    it('should return cart items for valid telegram_id', async () => {
      req.method = 'GET';
      req.query = { telegram_id: '123456789' };

      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 1,
            product_id: 'prod-1',
            quantity: 2,
            price: 100,
            name: 'Product 1',
          },
        ],
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(mockQuery).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      req.method = 'GET';
      req.query = { telegram_id: '123456789' };

      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        })
      );
    });
  });

  describe('POST /api/cart', () => {
    it('should add item to cart', async () => {
      req.method = 'POST';
      req.body = {
        telegram_id: '123456789',
        product_id: 'prod-1',
        quantity: 2,
      };

      mockQuery.mockResolvedValue({
        rows: [{ id: 1 }],
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Array)
      );
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 400 if required fields are missing', async () => {
      req.method = 'POST';
      req.body = {
        telegram_id: '123456789',
        // Missing product_id and quantity
      };

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should handle quantity validation', async () => {
      req.method = 'POST';
      req.body = {
        telegram_id: '123456789',
        product_id: 'prod-1',
        quantity: -1, // Invalid
      };

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('quantity'),
        })
      );
    });
  });

  describe('PUT /api/cart', () => {
    it('should update item quantity', async () => {
      req.method = 'PUT';
      req.body = {
        telegram_id: '123456789',
        product_id: 'prod-1',
        quantity: 5,
      };

      mockQuery.mockResolvedValue({
        rows: [{ quantity: 5 }],
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.any(Array)
      );
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('DELETE /api/cart', () => {
    it('should remove item from cart', async () => {
      req.method = 'DELETE';
      req.body = {
        telegram_id: '123456789',
        product_id: 'prod-1',
      };

      mockQuery.mockResolvedValue({
        rows: [{ affected: 1 }],
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
        expect.any(Array)
      );
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 404 if item not found', async () => {
      req.method = 'DELETE';
      req.body = {
        telegram_id: '123456789',
        product_id: 'nonexistent-prod',
      };

      mockQuery.mockResolvedValue({
        rows: [],
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('Unsupported methods', () => {
    it('should return 405 for PATCH requests', async () => {
      req.method = 'PATCH';

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
    });

    it('should return 405 for HEAD requests', async () => {
      req.method = 'HEAD';

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(405);
    });
  });
});

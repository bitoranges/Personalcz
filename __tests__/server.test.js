const request = require('supertest');
const app = require('../server');

describe('x402 Payment Server', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/unlock', () => {
    it('should return 402 Payment Required when no wallet address provided', async () => {
      const res = await request(app)
        .get('/api/unlock')
        .expect(402);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('unlocked', false);
      expect(res.body).toHaveProperty('paymentRequirements');
      expect(res.body.paymentRequirements).toHaveProperty('amount');
      expect(res.body.paymentRequirements).toHaveProperty('currency', 'USDC');
      expect(res.body.paymentRequirements).toHaveProperty('receiver');
    });

    it('should return 402 Payment Required when wallet address has not paid', async () => {
      const res = await request(app)
        .get('/api/unlock')
        .query({ walletAddress: '0x1234567890123456789012345678901234567890' })
        .expect(402);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('unlocked', false);
    });
  });

  describe('GET /api/payment-status', () => {
    it('should return 400 when no wallet address provided', async () => {
      const res = await request(app)
        .get('/api/payment-status')
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error', 'Wallet address is required');
    });

    it('should return payment status for wallet address', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const res = await request(app)
        .get('/api/payment-status')
        .query({ walletAddress })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('walletAddress');
      expect(res.body).toHaveProperty('hasPaid');
      expect(res.body).toHaveProperty('unlocked');
    });
  });

  describe('POST /api/payment-intent', () => {
    it('should create a payment intent', async () => {
      const res = await request(app)
        .post('/api/payment-intent')
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('sessionId');
      expect(res.body).toHaveProperty('paymentRequirements');
      expect(res.body.paymentRequirements).toHaveProperty('amount');
      expect(res.body.paymentRequirements).toHaveProperty('currency', 'USDC');
    });
  });

  describe('POST /api/unlock', () => {
    it('should return 400 when no wallet address provided', async () => {
      const res = await request(app)
        .post('/api/unlock')
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error', 'Wallet address is required');
    });

    it('should return 400 when no payment proof provided', async () => {
      const res = await request(app)
        .post('/api/unlock')
        .send({ walletAddress: '0x1234567890123456789012345678901234567890' })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error', 'Payment proof is required');
    });

    it('should return 402 when invalid payment proof provided', async () => {
      const res = await request(app)
        .post('/api/unlock')
        .send({
          walletAddress: '0x1234567890123456789012345678901234567890',
          paymentProof: {
            transactionHash: '0xinvalid',
          },
        })
        .expect(402);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error', 'Payment verification failed');
    });
  });
});





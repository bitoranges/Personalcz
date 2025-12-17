# Chengzi Personal Space - x402 Payment Integration

**Version: v0.1**

A personal website with x402 payment protocol integration, built with React frontend and Node.js backend.

## Features

- 🎨 Modern React frontend with TypeScript and Vite
- 💰 x402 payment protocol integration for USDC payments on Base network
- 🔒 Content unlocking after payment verification
- 🪙 Multi-wallet support (MetaMask, OKX, Binance, Coinbase, etc.) with wallet selector
- 📥 File download system with payment verification
- 🧪 Automated testing (Jest for backend, Vitest for frontend)
- 📦 Full-stack integration

## Project Structure

```
Personalcz/
├── frontend/              # React frontend (TypeScript + Vite)
│   ├── components/        # React components
│   ├── __tests__/         # Frontend tests
│   └── package.json
├── __tests__/             # Backend tests
├── server.js              # Express backend server
├── x402-client.js         # x402 payment client library
├── package.json           # Backend dependencies
└── .env                   # Environment variables (create this)
```

## Quick Start

### 1. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Configure Environment

Create a `.env` file in the root directory (see `ENV_SETUP.md` for details):

```env
PORT=3000
NETWORK=base-mainnet
BASE_RPC_URL=https://mainnet.base.org
RECEIVER_ADDRESS=0xYourWalletAddressHere
```

### 3. Run in Development Mode

**Terminal 1 - Backend:**
```bash
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```

Visit `http://localhost:5173` in your browser.

### 4. Run in Production Mode

```bash
# Build frontend
npm run build

# Start server (serves both frontend and backend)
npm start
```

Visit `http://localhost:3000` in your browser.

## Testing

### Backend Tests
```bash
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Documentation

- **[CONFIGURATION_GUIDE.md](./CONFIGURATION_GUIDE.md)** - ⭐ Complete configuration guide (files, avatar, deployment)
- **[WALLET_SELECTOR_GUIDE.md](./WALLET_SELECTOR_GUIDE.md)** - 🪙 Wallet selector usage guide
- [HOW_TO_RUN.md](./HOW_TO_RUN.md) - Detailed setup and running instructions
- [ENV_SETUP.md](./ENV_SETUP.md) - Environment variable configuration
- [TEST_FILE_DOWNLOAD.md](./TEST_FILE_DOWNLOAD.md) - File download testing guide

## API Endpoints

- `GET /health` - Health check
- `GET /api/unlock` - Check access or return 402 payment required
- `POST /api/unlock` - Verify payment and unlock content
- `GET /api/payment-status` - Check payment status
- `POST /api/payment-intent` - Create payment intent
- `GET /api/download/:materialId` - Download file (requires payment verification)

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express
- **Payment**: x402 protocol, ethers.js, USDC on Base network
- **Testing**: Jest (backend), Vitest (frontend)

## License

MIT

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-XX

### Added
- Initial release of x402 payment integration
- Multi-wallet support with wallet selector (MetaMask, OKX Wallet, Coinbase Wallet, Binance Wallet, Brave Wallet, Trust Wallet)
- EIP-6963 wallet discovery standard support
- Legacy wallet detection for compatibility
- USDC payment on Base network
- Content unlocking after payment verification
- File download system with payment verification
- Payment status checking and persistence
- React frontend with TypeScript and Vite
- Node.js/Express backend
- Comprehensive error handling for wallet connections and payments
- User-friendly error messages for cancellations and failures

### Fixed
- Wallet selection logic to prevent wrong wallet being invoked
- Duplicate wallet display in wallet selector
- BigNumberish errors on payment cancellation
- Provider selection and caching issues
- Network switching and balance checking
- Payment verification and retry logic
- Response body stream handling

### Security
- Payment proof verification on backend
- Wallet address validation for downloads
- Secure payment transaction handling

### Technical
- Clean wallet provider management
- Proper error handling and user feedback
- Debug logging infrastructure (removed in production)
- Comprehensive wallet detection and filtering

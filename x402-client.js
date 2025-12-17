/**
 * x402 Client Library
 * Handles HTTP 402 Payment Required protocol on the client side
 * Integrates with ethers.js for wallet connections and USDC payments
 */

/**
 * x402Client - Main client class for handling x402 payments
 */
class x402Client {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || 'http://localhost:3000';
    this.walletAddress = options.walletAddress || null;
    this.provider = options.provider || null;
    this.signer = options.signer || null;
    this.onPaymentRequired = options.onPaymentRequired || null;
    this.onPaymentSuccess = options.onPaymentSuccess || null;
    this.onError = options.onError || null;
    this.onWalletConnected = options.onWalletConnected || null;
  }

  /**
   * Set wallet address and provider/signer
   */
  setWallet(address, provider = null, signer = null) {
    this.walletAddress = address;
    this.provider = provider;
    this.signer = signer;
  }

  /**
   * Connect to user's wallet (MetaMask, Coinbase Wallet, etc.)
   * Requires ethers.js to be loaded
   */
  async connectWallet() {
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('No wallet found. Please install MetaMask or Coinbase Wallet.');
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      // Create provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      this.setWallet(address, provider, signer);

      if (this.onWalletConnected) {
        this.onWalletConnected(address);
      }

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          this.setWallet(null, null, null);
        } else {
          this.setWallet(accounts[0], provider, signer);
          if (this.onWalletConnected) {
            this.onWalletConnected(accounts[0]);
          }
        }
      });

      return address;
    } catch (error) {
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Check if wallet is connected
   */
  isWalletConnected() {
    return !!this.walletAddress && !!this.signer;
  }

  /**
   * Fetch with automatic x402 payment handling
   */
  async fetchWithPayment(url, options = {}) {
    try {
      // First attempt - may return 402
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          ...(this.walletAddress && { 'X-Wallet-Address': this.walletAddress }),
        },
      });

      // If 402 Payment Required, handle payment flow
      if (response.status === 402) {
        const paymentData = await response.json();
        return await this.handlePaymentRequired(url, options, paymentData);
      }

      // Success or other status
      return response;
    } catch (error) {
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Handle 402 Payment Required response
   */
  async handlePaymentRequired(originalUrl, originalOptions, paymentData) {
    if (this.onPaymentRequired) {
      this.onPaymentRequired(paymentData.paymentRequirements);
    }

    // Ensure wallet is connected
    if (!this.isWalletConnected()) {
      await this.connectWallet();
    }

    // Execute payment transaction
    const paymentProof = await this.requestPayment(paymentData.paymentRequirements);

    if (!paymentProof) {
      throw new Error('Payment was cancelled or failed');
    }

    // Retry request with payment proof
    return await this.retryWithPayment(originalUrl, originalOptions, paymentProof);
  }

  /**
   * Request payment from user by executing USDC transfer transaction
   */
  async requestPayment(paymentRequirements) {
    if (!this.isWalletConnected()) {
      throw new Error('Wallet is not connected. Please connect your wallet first.');
    }

    try {
      const { amount, currency, receiver, usdcContractAddress, chainId } = paymentRequirements;

      // Verify we're on the correct network
      if (chainId) {
        const network = await this.provider.getNetwork();
        if (network.chainId !== BigInt(chainId)) {
          // Request network switch
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${chainId.toString(16)}` }],
            });
            // Wait a bit for network to switch
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (switchError) {
            if (switchError.code === 4902) {
              // Chain not added, need to add it
              throw new Error(`Please add Base network (Chain ID: ${chainId}) to your wallet`);
            }
            throw switchError;
          }
        }
      }

      // USDC has 6 decimals
      const amountWei = ethers.parseUnits(amount, 6);

      // USDC ERC20 ABI
      const usdcAbi = [
        'function transfer(address to, uint256 amount) external returns (bool)',
        'function balanceOf(address account) external view returns (uint256)',
        'function decimals() external view returns (uint8)',
      ];

      // Create USDC contract instance
      const usdcContract = new ethers.Contract(usdcContractAddress, usdcAbi, this.signer);

      // Check balance first
      const balance = await usdcContract.balanceOf(this.walletAddress);
      if (balance < amountWei) {
        throw new Error(`Insufficient USDC balance. Required: ${amount}, Available: ${ethers.formatUnits(balance, 6)}`);
      }

      // Execute transfer
      const tx = await usdcContract.transfer(receiver, amountWei);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();

      // Create payment proof
        const paymentProof = {
          walletAddress: this.walletAddress,
        amount: amount,
        currency: currency,
          network: paymentRequirements.network,
        receiver: receiver,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
          timestamp: new Date().toISOString(),
        };

      return paymentProof;
    } catch (error) {
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Retry original request with payment proof
   */
  async retryWithPayment(url, options, paymentProof) {
    const response = await fetch(url, {
      ...options,
      method: options.method || 'POST',
      headers: {
        ...options.headers,
        'X-Payment': JSON.stringify(paymentProof),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...(options.body ? JSON.parse(options.body) : {}),
        paymentProof,
        walletAddress: this.walletAddress,
      }),
    });

    if (response.status === 200 || response.status === 201) {
      if (this.onPaymentSuccess) {
        this.onPaymentSuccess(await response.json());
      }
      return response;
    } else if (response.status === 402) {
      // Payment verification failed
      const errorData = await response.json();
      throw new Error(errorData.error || 'Payment verification failed');
    } else {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }
  }

  /**
   * Unlock content (convenience method)
   */
  async unlockContent() {
    try {
      // Ensure wallet is connected
      if (!this.isWalletConnected()) {
        await this.connectWallet();
      }

      // First check if already unlocked
      const statusResponse = await this.fetchWithPayment(`${this.apiUrl}/api/payment-status`, {
        method: 'GET',
      });

      if (statusResponse.ok) {
        const status = await statusResponse.json();
        if (status.unlocked) {
          // Already unlocked, fetch content
          const contentResponse = await this.fetchWithPayment(`${this.apiUrl}/api/unlock`, {
            method: 'GET',
          });
          return await contentResponse.json();
        }
      }

      // Not unlocked, trigger payment flow
      const response = await this.fetchWithPayment(`${this.apiUrl}/api/unlock`, {
        method: 'GET',
      });
      return await response.json();
    } catch (error) {
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Check payment status
   */
  async checkStatus() {
    if (!this.walletAddress) {
      throw new Error('Wallet address is required');
    }
    const response = await fetch(`${this.apiUrl}/api/payment-status?walletAddress=${this.walletAddress}`);
    return await response.json();
  }
}

/**
 * Wallet Integration Helper
 * Provides utilities for wallet connection
 */
class WalletIntegration {
  /**
   * Check if a wallet is available
   */
  static isWalletAvailable() {
    return typeof window.ethereum !== 'undefined';
  }

  /**
   * Get available wallet name
   */
  static getWalletName() {
    if (!window.ethereum) return null;
    
    if (window.ethereum.isMetaMask) return 'MetaMask';
    if (window.ethereum.isCoinbaseWallet) return 'Coinbase Wallet';
    if (window.ethereum.isBraveWallet) return 'Brave Wallet';
    
    return 'Ethereum Wallet';
  }

  /**
   * Add Base network to wallet if not present
   */
  static async addBaseNetwork() {
    if (!window.ethereum) {
      throw new Error('No wallet found');
    }

    const baseMainnet = {
      chainId: '0x2105', // 8453 in hex
      chainName: 'Base',
      nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
      },
      rpcUrls: ['https://mainnet.base.org'],
      blockExplorerUrls: ['https://basescan.org'],
    };

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [baseMainnet],
      });
    } catch (error) {
      console.error('Error adding Base network:', error);
      throw error;
    }
  }
}

// Export for use in browser
if (typeof window !== 'undefined') {
  window.x402Client = x402Client;
  window.WalletIntegration = WalletIntegration;
  
  // Check if ethers.js is loaded
  if (typeof ethers === 'undefined') {
    console.warn('ethers.js is not loaded. Please include ethers.js library:');
    console.warn('<script src="https://cdn.ethers.io/lib/ethers-6.9.0.umd.min.js"></script>');
  }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { x402Client, WalletIntegration };
}

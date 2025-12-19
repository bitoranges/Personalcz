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
   * Connect to user's wallet using a specific provider
   * @param {Object} walletProvider - The wallet provider (window.ethereum, BinanceChain, okxwallet, etc.)
   */
  async connectWallet(walletProvider = null) {
    try {
      let provider = walletProvider;

      // If no provider specified, try to detect
      if (!provider) {
        // Try EIP-6963 first
        provider = await this.getEIP6963Provider();
        
        // Fallback to window.ethereum
        if (!provider && typeof window.ethereum !== 'undefined') {
          provider = window.ethereum;
        }

        // Try other known providers
        if (!provider) {
          if (typeof window.BinanceChain !== 'undefined') {
            provider = window.BinanceChain;
          } else if (typeof window.okxwallet !== 'undefined') {
            provider = window.okxwallet;
          } else if (typeof window.trustwallet !== 'undefined') {
            provider = window.trustwallet;
          }
        }
      }

      if (!provider) {
        throw new Error('No wallet found. Please install a wallet extension.');
      }

      // Handle Binance Chain (it uses different API, but note: Binance Wallet is primarily for BSC, not Base)
      // For Base network payments, we recommend using MetaMask, OKX, or Coinbase Wallet
      const isBinanceChain = typeof window !== 'undefined' && 
        window.BinanceChain && 
        (provider === window.BinanceChain);
      
      if (isBinanceChain) {
        try {
          // Binance Chain uses eth_requestAccounts but may have different structure
          let accounts;
          if (provider.request) {
            accounts = await provider.request({ method: 'eth_requestAccounts' });
          } else if (provider.enable) {
            accounts = await provider.enable();
          } else {
            throw new Error('Binance Chain provider does not support standard methods');
          }
          
          const address = Array.isArray(accounts) ? accounts[0] : accounts;
          
          if (!address) {
            throw new Error('No account address returned from Binance Chain');
          }
          
          // Note: Binance Wallet is designed for BSC, not Base network
          // We'll use Base RPC but Binance Wallet may not support Base network operations
          // For best experience, users should use MetaMask, OKX, or Coinbase Wallet
          const baseRpcUrl = 'https://mainnet.base.org';
          const ethersProvider = new ethers.JsonRpcProvider(baseRpcUrl);
          
          // Create a signer - this may not work perfectly with Binance Wallet for Base network
          // We use a wrapper that attempts to use the Binance provider for signing
          const signer = ethersProvider.getSigner(address);
          
          this.setWallet(address, ethersProvider, signer);
          
          if (this.onWalletConnected) {
            this.onWalletConnected(address);
          }
          
          console.warn('Binance Wallet connected. Note: Binance Wallet is primarily for BSC. For Base network payments, MetaMask, OKX, or Coinbase Wallet are recommended.');
          
          return address;
        } catch (err) {
          throw new Error('Failed to connect to Binance Wallet. For Base network, please use MetaMask, OKX, or Coinbase Wallet: ' + (err.message || String(err)));
        }
      }

      // Standard EIP-1193 provider (MetaMask, OKX, Coinbase, etc.)
      let accounts;
      if (provider.request) {
        accounts = await provider.request({ method: 'eth_requestAccounts' });
      } else if (provider.enable) {
        // Legacy enable method
        accounts = await provider.enable();
      } else {
        throw new Error('Provider does not support standard connection methods');
      }
      
      const address = Array.isArray(accounts) ? accounts[0] : accounts;
      
      if (!address) {
        throw new Error('No account address returned from wallet');
      }

      // Create provider and signer
      const ethersProvider = new ethers.BrowserProvider(provider);
      
      // Check and switch to Base network if needed (Base mainnet chainId: 8453)
      try {
        const network = await ethersProvider.getNetwork();
        const baseChainId = BigInt(8453);
        
        if (network.chainId !== baseChainId) {
          // Try to switch to Base network
          try {
            await provider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x2105' }], // 8453 in hex
            });
            // Wait for network to switch
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Recreate provider after network switch
            const newProvider = new ethers.BrowserProvider(provider);
            const signer = await newProvider.getSigner();
            this.setWallet(address, newProvider, signer);
          } catch (switchError) {
            // If chain not found (error code 4902), try to add it
            if (switchError.code === 4902 || switchError.code === -32603) {
              try {
                await provider.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: '0x2105',
                    chainName: 'Base',
                    nativeCurrency: {
                      name: 'Ethereum',
                      symbol: 'ETH',
                      decimals: 18,
                    },
                    rpcUrls: ['https://mainnet.base.org'],
                    blockExplorerUrls: ['https://basescan.org'],
                  }],
                });
                await new Promise(resolve => setTimeout(resolve, 1000));
                // Recreate provider after adding network
                const newProvider = new ethers.BrowserProvider(provider);
                const signer = await newProvider.getSigner();
                this.setWallet(address, newProvider, signer);
              } catch (addError) {
                // If user rejects or fails, still set wallet but warn user
                console.warn('Failed to switch to Base network. Please switch manually in your wallet.');
                const signer = await ethersProvider.getSigner();
                this.setWallet(address, ethersProvider, signer);
                throw new Error('Please switch to Base network (Chain ID: 8453) in your wallet to continue.');
              }
            } else {
              // User rejected or other error, still set wallet
              const signer = await ethersProvider.getSigner();
              this.setWallet(address, ethersProvider, signer);
              if (switchError.code === 4001) {
                throw new Error('Network switch was rejected. Please switch to Base network manually.');
              }
              throw new Error('Failed to switch network. Please switch to Base network (Chain ID: 8453) manually.');
            }
          }
        } else {
          // Already on Base network
          const signer = await ethersProvider.getSigner();
          this.setWallet(address, ethersProvider, signer);
        }
      } catch (networkError) {
        // If network check fails, still try to set wallet but log warning
        console.warn('Network check failed, continuing anyway:', networkError);
        try {
          const signer = await ethersProvider.getSigner();
          this.setWallet(address, ethersProvider, signer);
        } catch (signerError) {
          // If we can't even get signer, rethrow the original network error
          throw networkError;
        }
      }

      if (this.onWalletConnected) {
        this.onWalletConnected(address);
      }

      // Listen for account changes
      if (provider.on) {
        provider.on('accountsChanged', (accounts) => {
          if (accounts.length === 0) {
            this.setWallet(null, null, null);
          } else {
            // Recreate provider and signer for account change
            const newProvider = new ethers.BrowserProvider(provider);
            newProvider.getSigner().then(signer => {
              this.setWallet(accounts[0], newProvider, signer);
              if (this.onWalletConnected) {
                this.onWalletConnected(accounts[0]);
              }
            });
          }
        });
        
        // Listen for network changes
        provider.on('chainChanged', (chainId) => {
          // Network changed, recreate provider
          const newProvider = new ethers.BrowserProvider(provider);
          newProvider.getSigner().then(signer => {
            this.setWallet(this.walletAddress, newProvider, signer);
          });
        });
      }

      return address;
    } catch (error) {
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Get EIP-6963 provider if available
   * @private
   */
  async getEIP6963Provider() {
    return new Promise((resolve) => {
      let provider = null;
      
      const handler = (event) => {
        if (!provider) {
          provider = event.detail.provider;
        }
      };

      window.addEventListener('eip6963:announceProvider', handler);
      window.dispatchEvent(new Event('eip6963:requestProvider'));

      setTimeout(() => {
        window.removeEventListener('eip6963:announceProvider', handler);
        resolve(provider);
      }, 300);
    });
  }

  /**
   * Check if wallet is connected
   */
  isWalletConnected() {
    return !!this.walletAddress && !!this.signer;
  }

  /**
   * Fetch with automatic x402 payment handling
   * @param {string} url - The URL to fetch
   * @param {object} options - Fetch options
   * @param {object} explicitProvider - Explicit provider to use for payment (optional)
   */
  async fetchWithPayment(url, options = {}, explicitProvider = null) {
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
        // Clone response to avoid "body stream already read" error
        const clonedResponse = response.clone();
        const paymentData = await clonedResponse.json();
        // CRITICAL: Use explicitProvider if provided, otherwise use this.rawProvider
        // This ensures we use the correct provider even if rawProvider was changed during async operations
        const providerToUse = explicitProvider || this.rawProvider;
        return await this.handlePaymentRequired(url, options, paymentData, providerToUse);
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
  async handlePaymentRequired(originalUrl, originalOptions, paymentData, explicitProvider = null) {
    
    if (this.onPaymentRequired) {
      this.onPaymentRequired(paymentData.paymentRequirements);
    }

    // CRITICAL: Priority order for provider selection:
    // 1. explicitProvider (passed from unlockContent) - highest priority
    // 2. this.rawProvider (set when wallet is selected)
    // 3. window providers (fallback only)
    console.log('[x402-client] handlePaymentRequired provider selection:', {
      hasExplicitProvider: !!explicitProvider,
      hasRawProvider: !!this.rawProvider,
      explicitProviderType: explicitProvider ? (explicitProvider === window.ethereum ? 'ethereum' : explicitProvider === window.BinanceChain ? 'BinanceChain' : 'other') : 'none',
      rawProviderType: this.rawProvider ? (this.rawProvider === window.ethereum ? 'ethereum' : this.rawProvider === window.BinanceChain ? 'BinanceChain' : 'other') : 'none'
    });
    
    let provider = explicitProvider || this.rawProvider;
    
    // Only fallback to window providers if no explicit provider is set
    if (!provider && typeof window !== 'undefined') {
      console.log('[x402-client] No explicit provider, falling back to window providers');
      if (window.ethereum && window.ethereum.request) {
        provider = window.ethereum;
      } else if (window.okxwallet && window.okxwallet.request) {
        provider = window.okxwallet;
      } else if (window.trustwallet && window.trustwallet.request) {
        provider = window.trustwallet;
      }
    }

    if (!provider) {
      console.error('[x402-client] No provider available!');
      throw new Error('No wallet provider available. Please select a wallet first.');
    }
    
    console.log('[x402-client] Selected provider:', provider === window.ethereum ? 'ethereum' : provider === window.BinanceChain ? 'BinanceChain' : 'other');

    // Execute payment transaction (this will handle wallet connection internally if needed)
    const paymentProof = await this.requestPayment(paymentData.paymentRequirements, provider);

    // If user cancelled payment, return null instead of throwing error
    if (!paymentProof) {
      // User cancelled - return a response that indicates cancellation
      // Don't throw error to avoid showing error message
      // CRITICAL: Clear rawProvider on cancellation to prevent using wrong wallet next time
      this.rawProvider = null;
      return new Response(JSON.stringify({ 
        cancelled: true,
        message: 'Payment was cancelled' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Retry request with payment proof
    console.log('[x402-client] Payment successful, retrying request with proof');
    const retryResponse = await this.retryWithPayment(originalUrl, originalOptions, paymentProof);
    
    // Check if retry was successful
    if (retryResponse.status === 200) {
      const retryData = await retryResponse.clone().json();
      console.log('[x402-client] Retry response:', {
        success: retryData?.success,
        unlocked: retryData?.unlocked,
        hasMaterials: !!retryData?.materials
      });
    }
    
    return retryResponse;
  }

  /**
   * Request payment from user by executing USDC transfer transaction
   */
  async requestPayment(paymentRequirements, provider = null) {
    // CRITICAL: Always use the provided provider first (from unlockContent)
    // This ensures we use the wallet that was explicitly selected
    // Only fallback to stored rawProvider if no provider is provided
    let walletProvider = provider;
    
    if (!walletProvider && this.rawProvider) {
      // Use stored raw provider as fallback
      walletProvider = this.rawProvider;
    } else if (!walletProvider) {
      // No provider available - need to get one
      // Try to get from window.ethereum or other sources
      if (typeof window !== 'undefined') {
        if (window.ethereum && window.ethereum.request) {
          walletProvider = window.ethereum;
        } else if (window.okxwallet && window.okxwallet.request) {
          walletProvider = window.okxwallet;
        } else if (window.trustwallet && window.trustwallet.request) {
          walletProvider = window.trustwallet;
        }
      }
      
      if (!walletProvider) {
        throw new Error('No wallet provider available. Please select a wallet first.');
      }
      
      // CRITICAL: Only request accounts if we don't already have a wallet address
      // unlockContent already requested accounts, so we should reuse that address
      // This prevents duplicate connection popups
      if (!this.walletAddress) {
        console.log('[x402-client] requestPayment: No wallet address, requesting accounts...');
        // Get account address for this payment
        let accounts;
        try {
          if (walletProvider.request) {
            accounts = await walletProvider.request({ method: 'eth_requestAccounts' });
          } else if (walletProvider.enable) {
            accounts = await walletProvider.enable();
          } else {
            throw new Error('Wallet provider does not support connection');
          }
          
          const address = Array.isArray(accounts) ? accounts[0] : accounts;
          if (!address) {
            throw new Error('No account address returned from wallet');
          }
          
          // Set wallet address for this payment session
          this.walletAddress = address;
          console.log('[x402-client] requestPayment: Got wallet address:', address);
        } catch (connectError) {
          // CRITICAL: If user rejects connection, return null immediately
          if (connectError.code === 4001 || 
              connectError.message?.includes('rejected') || 
              connectError.message?.includes('denied') ||
              connectError.message?.includes('User rejected')) {
            console.log('[x402-client] requestPayment: User rejected connection');
            return null; // Return null to indicate cancellation
          }
          throw connectError; // Re-throw other errors
        }
      } else {
        console.log('[x402-client] requestPayment: Reusing existing wallet address:', this.walletAddress);
      }
    }

    try {
      // Validate paymentRequirements first
      if (!paymentRequirements || typeof paymentRequirements !== 'object') {
        throw new Error('Invalid payment requirements received');
      }
      
      const { amount, currency, receiver, usdcContractAddress, chainId } = paymentRequirements;
      
      // Validate amount BEFORE any operations
      // CRITICAL: If amount is invalid, return null instead of throwing
      // This prevents BigNumberish errors when user cancels early
      if (!amount || amount === '' || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        // Return null to indicate cancellation/invalid state, don't throw
        console.log('Invalid payment amount, returning null');
        return null;
      }

      // Create ethers provider for this payment
      
      let ethersProvider;
      try {
        ethersProvider = new ethers.BrowserProvider(walletProvider);
      } catch (providerError) {
        throw new Error(`Failed to connect to wallet: ${providerError.message}`);
      }

      // FIRST: Automatically switch to Base network before checking balance
      // This ensures we're on the correct network before any operations
      if (chainId) {
        try {
          const network = await ethersProvider.getNetwork();
          const targetChainId = BigInt(chainId);
          
          if (network.chainId !== targetChainId) {
            
            // Use the walletProvider we already have for network switching
            if (walletProvider && walletProvider.request) {
              try {
                await walletProvider.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: `0x${chainId.toString(16)}` }],
                });
                // Wait for network to switch
                await new Promise(resolve => setTimeout(resolve, 1500));
                // Recreate provider after network switch
                const newProvider = new ethers.BrowserProvider(walletProvider);
                ethersProvider = newProvider;
              } catch (switchError) {
                // If chain not found (error code 4902), try to add it
                if (switchError.code === 4902 || switchError.code === -32603) {
                  try {
                    await walletProvider.request({
                      method: 'wallet_addEthereumChain',
                      params: [{
                        chainId: `0x${chainId.toString(16)}`,
                        chainName: 'Base',
                        nativeCurrency: {
                          name: 'Ethereum',
                          symbol: 'ETH',
                          decimals: 18,
                        },
                        rpcUrls: ['https://mainnet.base.org'],
                        blockExplorerUrls: ['https://basescan.org'],
                      }],
                    });
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    // Recreate provider after adding network
                    const newProvider = new ethers.BrowserProvider(walletProvider);
                    ethersProvider = newProvider;
                  } catch (addError) {
                    throw new Error(`Please add Base network (Chain ID: ${chainId}) to your wallet manually`);
                  }
                } else if (switchError.code === 4001) {
                  // User rejected network switch - return null to indicate cancellation
                  // CRITICAL: Return immediately to avoid BigNumberish errors
                  console.log('Network switch rejected by user');
                  return null;
                } else {
                  throw new Error(`Failed to switch network: ${switchError.message || 'Please switch to Base network manually'}`);
                }
              }
            } else {
              throw new Error(`Please switch to Base network (Chain ID: ${chainId}) in your wallet`);
            }
            
            // Double-check network after switch
            const finalNetwork = await ethersProvider.getNetwork();
            if (finalNetwork.chainId !== targetChainId) {
              throw new Error(`Please switch to Base network (Chain ID: ${chainId}) in your wallet. Current network: ${finalNetwork.chainId}`);
            }
          }
        } catch (networkError) {
          // If user rejected network switch, return null
          if (networkError.code === 4001 || (networkError.message && networkError.message.includes('rejected'))) {
            // CRITICAL: Return immediately to avoid BigNumberish errors
            console.log('Network switch cancelled by user');
            return null;
          }
          // Network switch errors should be thrown immediately
          throw networkError;
        }
      }

      // Get signer for this payment
      const signer = await ethersProvider.getSigner();
      
      // CRITICAL: Ensure walletAddress is set from signer if not already set
      // This handles cases where walletAddress might be null after network switch
      if (!this.walletAddress) {
        try {
          const signerAddress = await signer.getAddress();
          if (signerAddress) {
            this.walletAddress = signerAddress;
            console.log('[x402-client] requestPayment: Got wallet address from signer:', signerAddress);
          }
        } catch (addressError) {
          console.error('[x402-client] requestPayment: Failed to get address from signer:', addressError);
        }
      }
      
      // CRITICAL: Validate walletAddress before proceeding
      if (!this.walletAddress) {
        throw new Error('Wallet address is required but not available. Please connect your wallet.');
      }

      // Amount validation already done at the start of try block
      
      // USDC has 6 decimals
      // CRITICAL: Wrap parseUnits in try-catch to handle any edge cases
      let amountWei;
      try {
        amountWei = ethers.parseUnits(amount.toString(), 6);
      } catch (parseError) {
        // If parseUnits fails (e.g., empty string), return null instead of throwing
        console.log('Failed to parse amount, returning null:', parseError.message);
        return null;
      }

      // USDC ERC20 ABI
      const usdcAbi = [
        'function transfer(address to, uint256 amount) external returns (bool)',
        'function balanceOf(address account) external view returns (uint256)',
        'function decimals() external view returns (uint8)',
      ];

      // Create USDC contract instance with signer
      const usdcContract = new ethers.Contract(usdcContractAddress, usdcAbi, signer);

      // Check balance - NOW we're guaranteed to be on Base network
      // CRITICAL: Wrap balance check in try-catch to handle any errors gracefully
      // CRITICAL: Ensure walletAddress is valid before calling balanceOf
      try {
        if (!this.walletAddress || this.walletAddress === 'null' || this.walletAddress === 'undefined') {
          throw new Error('Wallet address is invalid. Please reconnect your wallet.');
        }
        const balance = await usdcContract.balanceOf(this.walletAddress);
        const balanceFormatted = ethers.formatUnits(balance, 6);
        console.log(`USDC Balance check: Required: ${amount}, Available: ${balanceFormatted}`);
        
        if (balance < amountWei) {
          // Only throw balance error, not network error
          throw new Error(`Insufficient USDC balance. Required: ${amount}, Available: ${balanceFormatted}. Please add more USDC to your wallet.`);
        }
      } catch (balanceError) {
        // Handle user cancellation during balance check
        if (balanceError.code === 4001 || 
            balanceError.message?.includes('rejected') || 
            balanceError.message?.includes('denied') ||
            balanceError.message?.includes('cancelled') ||
            balanceError.message?.includes('user rejected')) {
          return null;
        }
        
        // Handle BigNumberish errors during balance check
        if (balanceError.code === 'INVALID_ARGUMENT' && balanceError.message?.includes('BigNumberish')) {
          return null;
        }
        
        // If balance check fails, provide helpful error message
        if (balanceError.message && balanceError.message.includes('Insufficient')) {
          throw balanceError;
        }
        // Network or contract call error - but we should already be on Base network
        throw new Error(`Failed to check USDC balance: ${balanceError.message}`);
      }

      // Execute transfer
      
      let tx;
      try {
        
        tx = await usdcContract.transfer(receiver, amountWei);
      } catch (txError) {
        
        // Handle user rejection gracefully (code 4001 = user rejected)
        if (txError.code === 4001 || 
            txError.message?.includes('rejected') || 
            txError.message?.includes('denied') ||
            txError.message?.includes('cancelled') ||
            txError.message?.includes('user rejected')) {
          // User cancelled - don't throw error, just return null
          console.log('Payment cancelled by user');
          return null;
        }
        
        // Handle BigNumberish errors - these often occur when amount is invalid
        if (txError.code === 'INVALID_ARGUMENT' && txError.message?.includes('BigNumberish')) {
          // This might be a cancellation or invalid amount - return null to indicate cancellation
          console.log('Transaction error (possibly cancelled):', txError.message);
          return null;
        }
        // Other errors should be thrown
        throw txError;
      }
      
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
    
    // Fix: GET requests cannot have body - use POST for payment verification
    const requestMethod = (options.method && options.method.toUpperCase() === 'GET') ? 'POST' : (options.method || 'POST');
    const requestBody = requestMethod !== 'GET' ? JSON.stringify({
      ...(options.body ? JSON.parse(options.body) : {}),
      paymentProof,
      walletAddress: this.walletAddress,
    }) : undefined;
    
    // Ensure paymentProof is properly stringified
    const paymentProofString = typeof paymentProof === 'string' ? paymentProof : JSON.stringify(paymentProof);
    
    const response = await fetch(url, {
      ...options,
      method: requestMethod,
      headers: {
        ...options.headers,
        'X-Payment': paymentProofString,
        'Content-Type': 'application/json',
      },
      ...(requestBody && { body: requestBody }),
    });

    // Clone response to avoid "body stream already read" error
    // We need to read the body for logging, but also return the response
    const responseClone = response.clone();
    
    if (response.status === 200 || response.status === 201) {
      // Read from clone for data extraction
      const responseData = await responseClone.json();
      if (this.onPaymentSuccess) {
        this.onPaymentSuccess(responseData);
      }
      // Return original response (body not consumed)
      return response;
    } else if (response.status === 402) {
      // Payment verification failed - read from clone
      const errorData = await responseClone.json();
      throw new Error(errorData.error || 'Payment verification failed');
    } else {
      // Read from clone for error data
      const errorData = await responseClone.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }
  }

  /**
   * Unlock content (convenience method)
   */
  async unlockContent(provider = null) {
    try {
      // CRITICAL: x402 protocol flow:
      // 1. Request resource (GET /api/unlock)
      // 2. Server returns 402 Payment Required
      // 3. Client handles payment automatically (connect wallet + execute transaction)
      // 4. Client retries request with payment proof
      // 
      // We should NOT pre-connect wallet here - let the 402 response trigger payment flow
      // This ensures we only request connection once, when payment is actually needed
      
      if (provider) {
        // CRITICAL: Store raw provider for use in payment flow
        // But DON'T request accounts here - wait for 402 response
        console.log('[x402-client] unlockContent: Setting rawProvider:', provider === window.ethereum ? 'ethereum' : provider === window.BinanceChain ? 'BinanceChain' : 'other');
        this.rawProvider = provider;
        
        // Create ethers provider for network checks if needed
        try {
          this.provider = new ethers.BrowserProvider(provider);
        } catch (providerError) {
          // Continue without ethers provider - we'll use raw provider directly
        }
        
        // CRITICAL: DO NOT request accounts here - wait for 402 response
        // This prevents duplicate connection popups
        // The payment flow will request accounts when needed
        console.log('[x402-client] unlockContent: Provider set, will request accounts during payment flow');
      }

      // First check if already unlocked by checking payment status
      // This allows the app to remember unlocked state across page refreshes
      // Only check if we have a wallet address
      if (this.walletAddress) {
        try {
          const status = await this.checkStatus();
        if (status.unlocked) {
          // Already unlocked, fetch content
          // CRITICAL: Pass provider to fetchWithPayment to ensure correct wallet is used
          // Use the provider passed to unlockContent, not this.rawProvider (which might be stale)
          const providerToUse = provider || this.rawProvider;
          const contentResponse = await this.fetchWithPayment(`${this.apiUrl}/api/unlock`, {
            method: 'GET',
          }, providerToUse);
          // Clone to avoid body stream error
          const contentResponseClone = contentResponse.clone();
          const contentData = await contentResponseClone.json();
          return contentData;
        }
        } catch (statusError) {
          // If status check fails, continue with payment flow
          console.log('Status check failed, proceeding with payment flow:', statusError);
        }
      }

      // Not unlocked, trigger payment flow
      // CRITICAL: Pass provider to fetchWithPayment to ensure correct wallet is used
      console.log('[x402-client] Fetching unlock endpoint:', {
        apiUrl: this.apiUrl,
        hasProvider: !!provider,
        providerType: provider ? (provider === window.ethereum ? 'ethereum' : provider === window.BinanceChain ? 'BinanceChain' : 'other') : 'none'
      });
      
      const response = await this.fetchWithPayment(`${this.apiUrl}/api/unlock`, {
        method: 'GET',
      }, provider);
      
      console.log('[x402-client] Unlock response status:', response.status);
      
      // Clone to avoid body stream error
      const responseClone = response.clone();
      const result = await responseClone.json();
      
      console.log('[x402-client] Unlock response data:', {
        success: result?.success,
        unlocked: result?.unlocked,
        cancelled: result?.cancelled,
        error: result?.error,
        message: result?.message
      });
      
      // Check if payment was cancelled (returns cancelled: true)
      if (result && result.cancelled) {
        // Return cancelled result instead of throwing
        return result;
      }
      
      // Check for error response
      if (response.status !== 200 && response.status !== 402) {
        console.error('[x402-client] Unexpected response status:', response.status, result);
        return {
          error: result.error || result.message || 'Failed to unlock content',
          unlocked: false
        };
      }
      
      // If 402, payment is required - this should be handled by fetchWithPayment
      // If 200, check if unlocked
      if (response.status === 200 && result.success && result.unlocked) {
        return result;
      }
      
      // If we get here, something went wrong
      if (result.error) {
        return {
          error: result.error,
          unlocked: false
        };
      }
      
      return result;
    } catch (error) {
      // Handle BigNumberish errors gracefully
      if (error.message && (
        error.message.includes('BigNumberish') ||
        error.message.includes('invalid BigNumberish') ||
        error.message.includes('empty string')
      )) {
        // This is likely a cancellation - return cancelled result
        return { cancelled: true, message: 'Payment was cancelled' };
      }
      
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
    
    const response = await fetch(`${this.apiUrl}/api/payment-status?walletAddress=${this.walletAddress}`, {
      headers: {
        'X-Wallet-Address': this.walletAddress,
      },
    });
    
    if (!response.ok) {
      // If 400 or other error, assume not paid
      return { unlocked: false };
    }
    
    const status = await response.json();
    return status;
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

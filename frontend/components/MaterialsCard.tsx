import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Download, FileText, ChevronRight } from 'lucide-react';
import { CONFIG, MOCK_MATERIALS } from '../constants';
import { WalletSelector } from './WalletSelector';

// Type declaration for x402Client and wallet providers
declare global {
  interface Window {
    x402Client?: any;
    ethers?: any;
    ethereum?: any;
    BinanceChain?: any;
    okxwallet?: any;
    trustwallet?: any;
  }
}

interface Material {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'link' | 'archive' | 'zip' | 'png' | 'jpg' | 'jpeg' | 'gif' | 'svg' | 'webp';
  date: string;
  content?: string;
  url?: string;
}

export const MaterialsCard: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false); // Track status check in progress
  const [error, setError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<Material[]>(MOCK_MATERIALS);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [x402Client, setX402Client] = useState<any>(null);
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [selectedWalletProvider, setSelectedWalletProvider] = useState<any>(null);

  // Get API URL from environment variable or infer from current location
  const getApiUrl = () => {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    if (typeof window !== 'undefined' && window.location) {
      // In development, Vite runs on 5173, backend on 3000
      // In production, both run on the same origin (3000)
      const origin = window.location.origin;
      if (origin.includes(':5173')) {
        return origin.replace(':5173', ':3000');
      }
      return origin; // Same origin in production
    }
    // Default for server-side rendering or test environments
    return 'http://localhost:3000';
  };
  
  const API_URL = getApiUrl();

  // Initialize x402 client
  useEffect(() => {
    const initClient = () => {
      // Check for ethers - it might be on window or global scope
      const hasEthers = typeof window !== 'undefined' && (
        (window as any).ethers || 
        (globalThis as any).ethers
      );
      
      if (typeof window !== 'undefined' && window.x402Client && hasEthers) {
        const client = new window.x402Client({
          apiUrl: API_URL,
          onPaymentRequired: (paymentReqs: any) => {
            console.log('Payment required:', paymentReqs);
          },
          onPaymentSuccess: (data: any) => {
            console.log('Payment successful:', data);
            setIsUnlocked(true);
            if (data.materials) {
              setMaterials(data.materials);
            }
          },
          onError: (err: Error) => {
            console.error('x402 Client Error:', err);
            // Don't show network change errors as they're handled during connection
            if (err.message && err.message.includes('network changed')) {
              // Network change is expected during connection, ignore this error
              return;
            }
            // Don't show error if user cancelled payment
            if (err.message && (
              err.message.includes('rejected') || 
              err.message.includes('denied') ||
              err.message.includes('cancelled') ||
              err.message.includes('user rejected')
            )) {
              // User cancelled - just reset loading state, don't show error
              setIsLoading(false);
              return;
            }
            setError(err.message);
            setIsLoading(false);
          },
          onWalletConnected: (address: string) => {
            setWalletAddress(address);
            // When wallet connects, check if it has already paid
            // This restores unlocked state across page refreshes
            if (address && client) {
              // Set checking status to show loading state
              setIsCheckingStatus(true);
              checkStatus(client, address).finally(() => {
                setIsCheckingStatus(false);
              });
            }
          },
        });
        setX402Client(client);
        
        // Check if already unlocked - this runs on page load to restore unlocked state
        // The checkStatus will verify if the connected wallet has paid
        // We'll check status after wallet is connected or when wallet address is available
        // Don't check immediately as wallet might not be connected yet
      }
    };

    // Wait for scripts to load
    const checkWindow = () => {
      const hasX402 = typeof(window as any).x402Client !== 'undefined';
      const hasWindowEthers = typeof(window as any).ethers !== 'undefined';
      const hasGlobalThisEthers = typeof (globalThis as any).ethers !== 'undefined';
      const hasEthers = hasWindowEthers || hasGlobalThisEthers;
      return {hasX402, hasEthers};
    };
    const windowCheck = checkWindow();
    if (windowCheck.hasX402 && windowCheck.hasEthers) {
      initClient();
    } else {
      const checkInterval = setInterval(() => {
        const check = checkWindow();
        if (check.hasX402 && check.hasEthers) {
          clearInterval(checkInterval);
          initClient();
        }
      }, 100);
      
      // Cleanup after 5 seconds if still not loaded
      setTimeout(() => {
        clearInterval(checkInterval);
        const finalCheck = checkWindow();
        if (!finalCheck.hasX402 || !finalCheck.hasEthers) {
          setError('Failed to load x402 client or ethers.js. Please refresh the page.');
        }
      }, 5000);
    }
    
    // Listen for ethersLoaded event
    const handleEthersLoaded = () => {
      const hasX402 = typeof(window as any).x402Client !== 'undefined';
      const hasWindowEthers = typeof(window as any).ethers !== 'undefined';
      const hasGlobalThisEthers = typeof (globalThis as any).ethers !== 'undefined';
      const hasEthers = hasWindowEthers || hasGlobalThisEthers;
      if (hasX402 && hasEthers && !x402Client) {
        initClient();
      }
    };
    
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('ethersLoaded', handleEthersLoaded);
    }
    
    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('ethersLoaded', handleEthersLoaded);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_URL]);

  // Fetch materials list from server on component mount
  useEffect(() => {
    const loadMaterials = async () => {
      try {
        const response = await fetch(`${API_URL}/api/materials`);
        if (response.ok) {
          const data = await response.json();
          if (data.materials && data.materials.length > 0) {
            setMaterials(data.materials);
            console.log('[MaterialsCard] Loaded materials from server:', data.materials);
          }
        }
      } catch (err: any) {
        console.error('[MaterialsCard] Failed to load materials from server:', err);
        // Keep using MOCK_MATERIALS as fallback
      }
    };
    
    loadMaterials();
  }, [API_URL]);

  const checkStatus = async (client: any, address?: string) => {
    if (!client) {
      setIsCheckingStatus(false);
      return;
    }
    
    // Use provided address, or try to get from state/client
    let addressToCheck = address || walletAddress;
    if (!addressToCheck && client.isWalletConnected && client.isWalletConnected()) {
      addressToCheck = client.walletAddress;
    }
    
    if (!addressToCheck) {
      setIsCheckingStatus(false);
      return;
    }
    
    try {
      // Temporarily set wallet address for status check
      const originalAddress = client.walletAddress;
      if (!client.walletAddress) {
        client.setWallet(addressToCheck, client.provider, client.signer);
      }
      
      const status = await client.checkStatus();
      
      if (status.unlocked) {
        setIsUnlocked(true);
        setWalletAddress(addressToCheck);
        // Fetch materials with download URLs
        await fetchMaterials(client);
      } else {
        // Explicitly set to false if not unlocked (clear any previous state)
        setIsUnlocked(false);
      }
    } catch (err: any) {
      console.log('Status check:', err.message);
      // On error, assume not unlocked
      setIsUnlocked(false);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const fetchMaterials = async (client: any) => {
    try {
      const response = await client.fetchWithPayment(`${API_URL}/api/unlock`, {
        method: 'GET',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.materials) {
          setMaterials(data.materials);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch materials:', err);
    }
  };

  const handleUnlock = () => {
    // CRITICAL: Prevent duplicate calls
    if (isLoading) {
      console.log('[MaterialsCard] handleUnlock: Already loading, ignoring duplicate call');
      return;
    }
    
    // Show wallet selector instead of directly connecting
    if (!walletAddress) {
      setShowWalletSelector(true);
      return;
    }

    // If already connected, proceed with unlock
    // CRITICAL: Use the stored provider, not window.ethereum
    if (!selectedWalletProvider && x402Client && x402Client.rawProvider) {
      // Use the stored provider from previous connection
      console.log('[MaterialsCard] handleUnlock: Using stored provider from x402Client');
    } else if (!selectedWalletProvider) {
      // No provider stored - need to select wallet again
      setShowWalletSelector(true);
      return;
    }
    proceedWithUnlock();
  };

  const proceedWithUnlock = async () => {
    if (!x402Client) {
      setError('x402 client not initialized. Please refresh the page.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Unlock content using x402 protocol
      const result = await x402Client.unlockContent();
      
      if (result.unlocked && result.materials) {
        setIsUnlocked(true);
        setMaterials(result.materials);
        
        // CRITICAL: Save wallet address after successful payment
        // This ensures downloads work after payment completion
        if (x402Client && x402Client.walletAddress) {
          setWalletAddress(x402Client.walletAddress);
        }
        
      } else {
        setError('Failed to unlock content. Please try again.');
      }
    } catch (err: any) {
      console.error('Unlock error:', err);
      setError(err.message || 'Failed to unlock content. Please check your wallet connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletSelect = async (wallet: any) => {
    try {
      setIsLoading(true);
      setError(null);

      // CRITICAL: Clear any previous provider selection to prevent wrong wallet being used
      // This MUST happen BEFORE selecting the new wallet
      console.log('[MaterialsCard] Clearing previous provider, selecting wallet:', wallet.name, wallet.uuid);
      if (x402Client) {
        console.log('[MaterialsCard] Previous rawProvider:', x402Client.rawProvider ? 'exists' : 'null');
        x402Client.rawProvider = null;
        // Also clear wallet address to force fresh connection
        x402Client.walletAddress = null;
      }

      // Get the provider for the selected wallet
      let provider = null;

      if (wallet.uuid.includes('legacy')) {
        // Legacy wallet handling - use exact name matching
        
        // CRITICAL: Check UUID first to ensure we're selecting the right wallet
        if (wallet.uuid === 'metamask-legacy') {
          // MetaMask legacy - verify it's actually MetaMask
          const ethereum = (window as any).ethereum;
          
          // CRITICAL: Strict verification - must be MetaMask, not Binance or other wallets
          if (ethereum && ethereum.isMetaMask && !ethereum.isBraveWallet) {
            // Double-check: ensure it's not Binance masquerading as MetaMask
            if ((window as any).BinanceChain && ethereum === (window as any).BinanceChain) {
              throw new Error('MetaMask not found. Detected Binance Wallet instead.');
            }
            provider = ethereum;
          } else {
            throw new Error('MetaMask not found. Please ensure MetaMask is installed and unlocked.');
          }
        } else if (wallet.uuid === 'binance-legacy' || (wallet.name === 'Binance Wallet' && wallet.uuid === 'binance-legacy')) {
          // Binance Wallet - use BinanceChain, NOT window.ethereum
          provider = (window as any).BinanceChain;
          if (!provider) {
            throw new Error('Binance Wallet not found. Please ensure Binance Wallet is installed and unlocked.');
          }
        } else if (wallet.uuid === 'okx-legacy' || (wallet.name === 'OKX Wallet' && wallet.uuid === 'okx-legacy')) {
          provider = (window as any).okxwallet;
          if (!provider) {
            throw new Error('OKX Wallet not found. Please ensure OKX Wallet is installed and unlocked.');
          }
        } else if (wallet.uuid === 'trust-legacy' || (wallet.name === 'Trust Wallet' && wallet.uuid === 'trust-legacy')) {
          provider = (window as any).trustwallet;
          if (!provider) {
            throw new Error('Trust Wallet not found. Please ensure Trust Wallet is installed and unlocked.');
          }
        } else if (wallet.uuid === 'brave-legacy' || (wallet.name === 'Brave Wallet' && wallet.uuid === 'brave-legacy')) {
          const ethereum = (window as any).ethereum;
          if (ethereum && ethereum.isBraveWallet) {
            provider = ethereum;
          } else {
            throw new Error('Brave Wallet not found. Please ensure Brave Wallet is installed and unlocked.');
          }
        } else {
          throw new Error(`Unknown legacy wallet: ${wallet.name} (${wallet.uuid})`);
        }
        
      } else {
        // EIP-6963 wallet - find provider by EXACT UUID match
        // CRITICAL: Trust EIP-6963 detection - it's the most reliable method
        // The provider from EIP-6963 is guaranteed to be correct for that wallet
        
        try {
          provider = await findEIP6963Provider(wallet.uuid);
          
          if (!provider) {
            throw new Error(`Failed to find provider for ${wallet.name}. Please ensure the wallet is installed and unlocked.`);
          }
          
          // For EIP-6963 wallets, we trust the provider from the event
          // No additional verification needed - EIP-6963 is the source of truth
          console.log(`[MaterialsCard] EIP-6963 provider found for ${wallet.name} (UUID: ${wallet.uuid})`);
        } catch (findError) {
          throw new Error(`Failed to connect to ${wallet.name}: ${findError.message}`);
        }
      }

      if (!provider) {
        throw new Error(`Failed to find provider for ${wallet.name}`);
      }
      
      // CRITICAL: Store provider in x402Client BEFORE calling unlockContent
      // This ensures unlockContent uses the correct provider
      if (x402Client) {
        // CRITICAL: Set rawProvider AFTER clearing it, to ensure fresh state
        x402Client.rawProvider = provider;
        console.log('[MaterialsCard] Set rawProvider to:', provider === window.ethereum ? 'ethereum' : provider === window.BinanceChain ? 'BinanceChain' : 'other');
      }
      
      setSelectedWalletProvider(provider);

      // Connect to the selected wallet
      if (!x402Client) {
        setError('x402 client not initialized. Please refresh the page.');
        setIsLoading(false);
        return;
      }

      // Proceed with unlock - payment will be requested directly
      // unlockContent will use the provider we just set
      console.log('[MaterialsCard] Calling unlockContent with provider:', {
        walletName: wallet.name,
        walletUuid: wallet.uuid,
        hasProvider: !!provider,
        apiUrl: API_URL,
        providerType: provider === window.ethereum ? 'ethereum' : provider === window.BinanceChain ? 'BinanceChain' : 'other'
      });
      
      const result = await x402Client.unlockContent(provider);
      
      console.log('[MaterialsCard] unlockContent result:', {
        hasResult: !!result,
        unlocked: result?.unlocked,
        cancelled: result?.cancelled,
        success: result?.success,
        error: result?.error,
        hasMaterials: !!result?.materials
      });
      
      // Check if payment was cancelled
      if (result && result.cancelled) {
        // Payment was cancelled - show friendly message
        console.log('[MaterialsCard] Payment cancelled by user');
        setError('Failed to unlock content. Please try again.');
        setIsLoading(false);
        setShowWalletSelector(false);
        // CRITICAL: Clear provider on cancellation
        if (x402Client) {
          x402Client.rawProvider = null;
          x402Client.walletAddress = null;
        }
        setSelectedWalletProvider(null);
        return;
      }
      
      // Check for error in result
      if (result && result.error) {
        console.error('[MaterialsCard] Unlock error:', result.error);
        setError(result.error || 'Failed to unlock content. Please try again.');
        setIsLoading(false);
        setShowWalletSelector(false);
        // CRITICAL: Clear provider on error
        if (x402Client) {
          x402Client.rawProvider = null;
          x402Client.walletAddress = null;
        }
        setSelectedWalletProvider(null);
        return;
      }
      
      if (result && result.unlocked && result.materials) {
        console.log('[MaterialsCard] Unlock successful!');
        setIsUnlocked(true);
        setMaterials(result.materials);
        
        // CRITICAL: Save wallet address after successful payment
        // This ensures downloads work after payment completion
        if (x402Client && x402Client.walletAddress) {
          setWalletAddress(x402Client.walletAddress);
        }
        
      } else {
        console.error('[MaterialsCard] Unlock failed - invalid result:', result);
        setError('Failed to unlock content. Please try again.');
      }
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      
      // Handle BigNumberish errors - these occur when user cancels before amount is parsed
      if (err.message && (
        err.message.includes('BigNumberish') ||
        err.message.includes('invalid BigNumberish') ||
        err.message.includes('empty string')
      )) {
        // This is likely a cancellation - show friendly message
        setError('Failed to unlock content. Please try again.');
        if (x402Client) {
          x402Client.rawProvider = null;
        }
        setIsLoading(false);
        setShowWalletSelector(false);
        return;
      }
      
      // Don't show error if user cancelled - just reset state
      if (err.message && (
        err.message.includes('rejected') || 
        err.message.includes('denied') ||
        err.message.includes('cancelled') ||
        err.message.includes('user rejected') ||
        err.code === 4001
      )) {
        // User cancelled - show friendly message
        setError('Failed to unlock content. Please try again.');
        // CRITICAL: Clear all wallet state on cancellation
        if (x402Client) {
          x402Client.rawProvider = null;
          x402Client.walletAddress = null;
        }
        setSelectedWalletProvider(null);
        setIsLoading(false);
        setShowWalletSelector(false);
        // CRITICAL: Prevent wallet selector from reopening
        return;
      }
      
      // Handle network errors more gracefully
      if (err.message && err.message.includes('network')) {
        setError('请切换到 Base 网络 (Chain ID: 8453) 后重试。如果钱包中没有 Base 网络，请手动添加。');
      } else {
        setError(err.message || '连接钱包失败，请重试。');
      }
    } finally {
      // CRITICAL: Always reset loading state, even if error occurred
      setIsLoading(false);
      // CRITICAL: Only close wallet selector if it's still open (don't reopen if already closed)
      // This prevents the selector from reopening after user cancels
      if (showWalletSelector) {
        setShowWalletSelector(false);
      }
    }
  };

  // Helper function to find EIP-6963 provider by EXACT UUID match
  // CRITICAL: Trust EIP-6963 - it provides the correct provider for each wallet
  const findEIP6963Provider = (uuid: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      let provider = null;
      let walletInfo = null;
      const matchedUuids: string[] = [];
      
      const handler = (event: CustomEvent) => {
        const eventUuid = event.detail?.info?.uuid;
        const eventProvider = event.detail?.provider;
        const eventInfo = event.detail?.info;
        
        // CRITICAL: Use EXACT UUID match - no partial matching!
        if (eventUuid === uuid && !provider) {
          provider = eventProvider;
          walletInfo = eventInfo;
          matchedUuids.push(eventUuid);
          console.log(`[findEIP6963Provider] Found provider for UUID ${uuid}, wallet: ${eventInfo?.name}, rdns: ${eventInfo?.rdns}`);
        }
      };

      window.addEventListener('eip6963:announceProvider', handler as EventListener);
      window.dispatchEvent(new Event('eip6963:requestProvider'));

      setTimeout(() => {
        window.removeEventListener('eip6963:announceProvider', handler as EventListener);
        
        if (provider) {
          // CRITICAL: Trust EIP-6963 provider - it's the source of truth
          // EIP-6963 ensures the provider matches the wallet UUID
          // No additional verification needed - this prevents false rejections
          console.log(`[findEIP6963Provider] Resolving provider for UUID ${uuid}`);
          resolve(provider);
        } else {
          reject(new Error(`Provider with UUID ${uuid} not found. Matched UUIDs: ${matchedUuids.join(', ') || 'none'}`));
        }
      }, 1000); // Increased timeout to 1000ms to ensure all wallets respond
    });
  };

  const handleMaterialClick = async (material: Material) => {
    if (!isUnlocked) return;
    
    if (material.type === 'link' && material.url) {
      window.open(material.url, '_blank');
    } else if ((material as any).downloadUrl) {
      // Download file from server with wallet address verification
      try {
        // Try to get wallet address from state first, then from x402Client as fallback
        let addressToUse = walletAddress;
        if (!addressToUse && x402Client && x402Client.walletAddress) {
          addressToUse = x402Client.walletAddress;
          setWalletAddress(addressToUse); // Save it for future use
        }
        
        if (!addressToUse) {
          setError('Wallet address not found. Please reconnect your wallet.');
          return;
        }
        
        const downloadUrl = `${(material as any).downloadUrl}?walletAddress=${encodeURIComponent(addressToUse)}`;
        // Get file extension from type or filename
        let extension = material.type;
        if ((material as any).filename) {
          const match = (material as any).filename.match(/\.([^.]+)$/);
          if (match) extension = match[1];
        }
        const filename = (material as any).filename || `${material.title}.${extension}`;
        
        // Use fetch to download with authentication
        const response = await fetch(downloadUrl, {
          method: 'GET',
          headers: {
            'X-Wallet-Address': addressToUse,
          },
        });
        
        if (!response.ok) {
          if (response.status === 403) {
            setError('Access denied. Please make sure you have paid.');
          } else {
            setError('Failed to download file.');
          }
          return;
        }
        
        // Get blob and create download
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download error:', error);
        setError('Failed to download file. Please try again.');
      }
    }
  };

  return (
    <>
      <WalletSelector
        isOpen={showWalletSelector}
        onClose={() => setShowWalletSelector(false)}
        onSelectWallet={handleWalletSelect}
      />
      <article className="col-span-1 md:col-span-2 bg-card border-[3px] border-ink rounded-[24px] p-6 md:p-8 shadow-soft backdrop-blur-md flex flex-col h-full relative overflow-hidden">
      
      {/* Header Section */}
      <div className="flex justify-between items-start mb-2 relative z-10">
        <h2 className="font-mono font-bold text-2xl tracking-tight flex items-center gap-2">
          Materials
          <span className="text-sm font-normal text-ink2 bg-black/5 px-2 py-0.5 rounded-md">
            {materials.length} Items
          </span>
        </h2>
        {isCheckingStatus ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 border border-blue-500 text-blue-800 text-xs font-mono font-bold uppercase">
            <div className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-blue-800"></div> Checking...
          </span>
        ) : isUnlocked ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-500 text-emerald-800 text-xs font-mono font-bold uppercase">
            <Unlock size={12} /> Access Granted
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ink text-white border border-ink text-xs font-mono font-bold uppercase animate-pulse">
            <Lock size={12} /> Premium Only
          </span>
        )}
      </div>

      <div className="h-1.5 w-[140px] bg-gradient-to-r from-accent via-accent-violet to-accent-cyan rounded-full border border-ink mb-8"></div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-100 border border-red-500 text-red-800 text-sm font-medium">
          {error}
        </div>
      )}

      {/* x402 doesn't need to show "Connected" status - payment happens directly */}

      {/* Material List */}
      <div className="flex flex-col gap-4 mb-8 flex-grow relative z-10">
        {materials.map((item, idx) => (
          <div 
            key={item.id}
            onClick={() => handleMaterialClick(item)}
            className={`
              relative group flex items-center justify-between p-4 rounded-[16px] border-[2px] transition-all duration-300
              ${isUnlocked 
                ? 'bg-white border-ink hover:translate-x-1 hover:shadow-[-4px_4px_0px_0px_rgba(0,0,0,0.1)] cursor-pointer' 
                : 'bg-white/50 border-ink/20 hover:bg-white/80 cursor-not-allowed'
              }
            `}
          >
            <div className="flex items-center gap-4 overflow-hidden w-full">
              {/* Icon Box */}
              <div className={`
                shrink-0 w-12 h-12 rounded-[12px] border-[2px] border-ink flex items-center justify-center transition-colors
                ${isUnlocked 
                  ? 'bg-accent-cyan/10 text-ink' 
                  : 'bg-white text-ink/70'
                }
              `}>
                {(item.type === 'pdf' || item.type === 'png' || item.type === 'jpg' || item.type === 'jpeg' || item.type === 'gif') && <FileText size={20} />}
                {item.type === 'link' && <ChevronRight size={20} />}
                {(item.type === 'archive' || item.type === 'zip') && <Download size={20} />}
              </div>
              
              {/* Text Content */}
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {/* Title is always FULL INK color now */}
                  <span className="font-bold text-base md:text-lg truncate text-ink">
                    {item.title}
                  </span>
                  {!isUnlocked && (
                    <Lock size={12} className="text-ink/40" />
                  )}
                </div>
                
                {/* Description - Blurred if locked */}
                <div className="relative mt-1">
                   <p className={`text-sm truncate text-ink2 ${!isUnlocked && 'blur-[5px] select-none opacity-50'}`}>
                     {item.description}
                   </p>
                </div>
                
                {/* Meta info (Date) */}
                <span className="text-[10px] font-mono text-ink2/50 mt-1 uppercase tracking-wider">
                  {item.date} • {item.type.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Action Button */}
            <div className="shrink-0 pl-4">
              {isUnlocked ? (
                 <div className="w-10 h-10 rounded-full border-[2px] border-ink flex items-center justify-center bg-accent hover:bg-accent-violet hover:text-white transition-colors">
                    <Download size={18} />
                 </div>
              ) : (
                <div className="px-3 py-1 rounded-lg bg-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                  Locked
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Locked Overlay / CTA */}
      {!isUnlocked && (
        <div className="mt-auto pt-4 relative">
          {/* Blur gradient to smooth transition from list to button */}
          <div className="absolute -top-12 left-0 right-0 h-12 bg-gradient-to-b from-transparent to-card/90"></div>
          
          <button
            onClick={handleUnlock}
            disabled={isLoading || !x402Client}
            className="w-full relative group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-ink rounded-[16px] translate-y-1.5 transition-transform group-hover:translate-y-2 group-active:translate-y-0.5"></div>
            <div className="relative bg-ink text-white border-[2px] border-ink rounded-[16px] p-1 transition-transform group-hover:-translate-y-0.5 group-active:translate-y-1.5 overflow-hidden">
               {/* Animated shine effect */}
               <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></div>
               
               <div className="relative flex items-center justify-between px-6 py-4">
                  <div className="flex flex-col items-start">
                    <span className="font-mono font-bold text-xl tracking-tight">
                      {isLoading ? 'Processing Payment...' : 'Unlock All Access'}
                    </span>
                    <span className="text-xs text-white/70 font-medium">One-time payment • Lifetime updates</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <span className="font-mono font-bold text-2xl">${CONFIG.price.amount}</span>
                     <span className="bg-white text-ink text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">{CONFIG.price.chain}</span>
                  </div>
               </div>
            </div>
          </button>
        </div>
      )}
    </article>
    </>
  );
};

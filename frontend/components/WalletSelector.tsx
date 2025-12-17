import React, { useState, useEffect } from 'react';
import { X, Wallet, Download } from 'lucide-react';

interface WalletInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns?: string;
  originalIcon?: string; // For data URI icons from EIP-6963
}

interface WalletSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWallet: (wallet: WalletInfo) => void;
}

// Wallet icons mapping (fallback if icon not provided)
const walletIcons: Record<string, string> = {
  'MetaMask': '🦊',
  'Binance': '🔶',
  'OKX Wallet': '✅',
  'Coinbase Wallet': '🔵',
  'Brave Wallet': '🦁',
  'Trust Wallet': '🔷',
};

// Supported wallets with download links - show all supported wallets, not just detected ones
const SUPPORTED_WALLETS = [
  { name: 'MetaMask', icon: '🦊', downloadUrl: 'https://metamask.io/download/', rdns: 'io.metamask' },
  { name: 'OKX Wallet', icon: '✅', downloadUrl: 'https://www.okx.com/web3', rdns: 'com.okex.wallet' },
  { name: 'Coinbase Wallet', icon: '🔵', downloadUrl: 'https://www.coinbase.com/wallet', rdns: 'com.coinbase.wallet' },
  { name: 'Binance Wallet', icon: '🔶', downloadUrl: 'https://www.binance.com/en/download', rdns: 'com.binance.wallet' },
  { name: 'Brave Wallet', icon: '🦁', downloadUrl: 'https://brave.com/wallet/', rdns: 'com.brave.wallet' },
  { name: 'Trust Wallet', icon: '🔷', downloadUrl: 'https://trustwallet.com/', rdns: 'com.trustwallet.app' },
];

export const WalletSelector: React.FC<WalletSelectorProps> = ({
  isOpen,
  onClose,
  onSelectWallet,
}) => {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [failedIcons, setFailedIcons] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      detectWallets();
    } else {
      // Clean up when modal closes - ensure no text nodes remain
      // This prevents DOM pollution that could cause garbled text to appear
      setWallets([]);
      setFailedIcons(new Set());
    }
  }, [isOpen]);

  const detectWallets = async () => {
    setLoading(true);
    setFailedIcons(new Set()); // Reset failed icons
    const detectedWallets: WalletInfo[] = [];

    // Detect browser environment
    const isCursorBrowser = typeof (window as any).__CURSOR__ !== 'undefined' || 
                            navigator.userAgent.includes('Cursor') ||
                            (window as any).location?.hostname === 'localhost' && 
                            !(window as any).chrome?.runtime;
    
    // Method 1: EIP-6963 wallet discovery
    const eip6963Wallets = await discoverEIP6963Wallets();
    console.log('EIP-6963 wallets detected:', eip6963Wallets.map(w => w.name));
    detectedWallets.push(...eip6963Wallets);

    // Method 2: Legacy detection (window.ethereum)
    // Pass already detected wallets to avoid duplicates
    const legacyWallets = detectLegacyWallets(eip6963Wallets);
    console.log('Legacy wallets detected:', legacyWallets.map(w => w.name));
    detectedWallets.push(...legacyWallets);

    // Remove duplicates by UUID first (more reliable), then by name
    // This ensures we don't accidentally remove different wallets with similar names
    const uniqueWalletsByUuid = Array.from(
      new Map(detectedWallets.map(w => [w.uuid, w])).values()
    );
    
    // If still have duplicates by name, prefer EIP-6963 wallets over legacy
    const uniqueWallets = Array.from(
      new Map(uniqueWalletsByUuid.map(w => [w.name, w])).values()
    );
    
    // CRITICAL: Only show the 6 main supported wallets
    // Filter out any other wallets (Phantom, Magic Eden, etc.)
    const supportedWalletNames = SUPPORTED_WALLETS.map(w => w.name.toLowerCase());
    const filteredWallets = uniqueWallets.filter(wallet => {
      const walletNameLower = wallet.name.toLowerCase();
      return supportedWalletNames.some(supported => 
        walletNameLower === supported || 
        walletNameLower.includes(supported) || 
        supported.includes(walletNameLower)
      );
    }).sort((a, b) => {
      // Sort by name, but prioritize known wallets
      const priority = ['MetaMask', 'OKX Wallet', 'Coinbase Wallet', 'Brave Wallet', 'Binance Wallet', 'Trust Wallet'];
      const aIndex = priority.indexOf(a.name);
      const bIndex = priority.indexOf(b.name);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

    console.log('Final filtered wallets (only main 6):', filteredWallets.map(w => `${w.name} (${w.uuid})`));
    setWallets(filteredWallets);
    setLoading(false);
  };

  const discoverEIP6963Wallets = (): Promise<WalletInfo[]> => {
    return new Promise((resolve) => {
      const wallets: WalletInfo[] = [];

      // Listen for wallet announcements
      const handleAnnounce = (event: CustomEvent) => {
        const { info, provider } = event.detail;
        // Check if icon is a data URI (base64 image)
        const isDataUri = info.icon && info.icon.startsWith('data:image');
        
        // Normalize wallet name for better matching and prevent garbled text
        // Some wallets might have different names in EIP-6963 vs legacy detection
        let normalizedName = info.name || '';
        
        // Clean up any garbled characters - keep only alphanumeric, spaces, hyphens, underscores, and dots
        // Also remove any control characters and non-printable characters
        normalizedName = normalizedName
          .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
          .replace(/[^\w\s\-_\.]/g, '') // Keep only word chars, spaces, hyphens, underscores, dots
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        // Map known wallet names FIRST (before UUID detection) based on rdns or name patterns
        // ALWAYS check rdns first as it's the most reliable identifier
        const nameLower = normalizedName.toLowerCase();
        const rdnsLower = info.rdns?.toLowerCase() || '';
        
        // PRIORITY 1: Check rdns first - it's the most reliable identifier
        // This handles cases where name is garbled but rdns is correct
        if (rdnsLower.includes('phantom') || rdnsLower === 'app.phantom') {
          normalizedName = 'Phantom';
        } else if (rdnsLower.includes('okx') || rdnsLower.includes('okex')) {
          normalizedName = 'OKX Wallet';
        } else if (rdnsLower.includes('binance')) {
          normalizedName = 'Binance Wallet';
        } else if (rdnsLower.includes('metamask')) {
          normalizedName = 'MetaMask';
        } else if (rdnsLower.includes('coinbase')) {
          normalizedName = 'Coinbase Wallet';
        } else if (rdnsLower.includes('brave')) {
          normalizedName = 'Brave Wallet';
        } else if (rdnsLower.includes('trust')) {
          normalizedName = 'Trust Wallet';
        } else if (rdnsLower.includes('magiceden')) {
          normalizedName = 'Magic Eden';
        } else if (rdnsLower.includes('ronin')) {
          normalizedName = 'Ronin Wallet';
        } else if (rdnsLower.includes('pontem')) {
          normalizedName = 'Pontem Wallet';
        } else if (rdnsLower.includes('talisman')) {
          normalizedName = 'Talisman';
        } else if (rdnsLower.includes('compass') || rdnsLower.includes('leapwallet')) {
          normalizedName = 'Compass Wallet';
        } else {
          // PRIORITY 2: Check name patterns (fallback if rdns doesn't match)
          if (nameLower.includes('okx') || nameLower.includes('okex')) {
            normalizedName = 'OKX Wallet';
          } else if (nameLower.includes('binance')) {
            normalizedName = 'Binance Wallet';
          } else if (nameLower.includes('metamask')) {
            normalizedName = 'MetaMask';
          } else if (nameLower.includes('coinbase')) {
            normalizedName = 'Coinbase Wallet';
          } else if (nameLower.includes('brave')) {
            normalizedName = 'Brave Wallet';
          } else if (nameLower.includes('trust')) {
            normalizedName = 'Trust Wallet';
          } else if (nameLower.includes('phantom')) {
            normalizedName = 'Phantom';
          } else if (nameLower.includes('magiceden')) {
            normalizedName = 'Magic Eden';
          } else if (nameLower.includes('ronin')) {
            normalizedName = 'Ronin Wallet';
          } else if (nameLower.includes('pontem')) {
            normalizedName = 'Pontem Wallet';
          } else if (nameLower.includes('talisman')) {
            normalizedName = 'Talisman';
          } else if (nameLower.includes('compass')) {
            normalizedName = 'Compass Wallet';
          } else {
            // PRIORITY 3: Detect garbled/UUID-like names (including those with spaces)
            // Check for patterns like "SB4CI7LJA vOBADJvdsFJ0rhwEy" - long alphanumeric strings with or without spaces
            const isGarbled = normalizedName && 
                              normalizedName.length > 15 && 
                              /^[a-zA-Z0-9\s]+$/.test(normalizedName) && // Allow spaces in garbled text
                              !normalizedName.toLowerCase().includes('wallet') &&
                              !normalizedName.toLowerCase().includes('metamask') &&
                              !normalizedName.toLowerCase().includes('phantom') &&
                              !normalizedName.toLowerCase().includes('okx') &&
                              !normalizedName.toLowerCase().includes('binance') &&
                              !normalizedName.toLowerCase().includes('coinbase') &&
                              !normalizedName.toLowerCase().includes('brave') &&
                              !normalizedName.toLowerCase().includes('trust');
            
            if (isGarbled) {
              // This looks like garbled text or UUID, use rdns instead
              if (info.rdns) {
                // Extract wallet name from rdns (e.g., "app.phantom" -> "Phantom")
                const rdnsParts = info.rdns.split('.');
                const lastPart = rdnsParts[rdnsParts.length - 1] || rdnsParts[rdnsParts.length - 2] || '';
                if (lastPart) {
                  // Capitalize first letter
                  normalizedName = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
                  // Special handling for known wallets
                  if (lastPart === 'phantom') {
                    normalizedName = 'Phantom';
                  } else if (lastPart === 'okex' || lastPart === 'okx') {
                    normalizedName = 'OKX Wallet';
                  } else if (lastPart === 'binance') {
                    normalizedName = 'Binance Wallet';
                  } else if (lastPart === 'metamask') {
                    normalizedName = 'MetaMask';
                  } else if (lastPart === 'coinbase') {
                    normalizedName = 'Coinbase Wallet';
                  } else if (lastPart === 'brave') {
                    normalizedName = 'Brave Wallet';
                  } else if (lastPart === 'trust') {
                    normalizedName = 'Trust Wallet';
                  }
                } else {
                  normalizedName = 'Unknown Wallet';
                }
              } else {
                // If no rdns, use a generic name
                normalizedName = 'Unknown Wallet';
              }
            }
          }
        }
        
        // If name is empty or too short after cleaning, use a fallback
        if (!normalizedName || normalizedName.length < 2) {
          if (info.rdns) {
            const rdnsParts = info.rdns.split('.');
            normalizedName = rdnsParts[rdnsParts.length - 1] || rdnsParts[rdnsParts.length - 2] || 'Unknown Wallet';
            normalizedName = normalizedName.charAt(0).toUpperCase() + normalizedName.slice(1);
          } else {
            normalizedName = 'Unknown Wallet';
          }
        }
        
        // CRITICAL: For known wallets, ALWAYS use correct name based on rdns
        // This is a workaround for wallets that report garbled names
        // COMPLETELY IGNORE info.name if rdns is available - use rdns as single source of truth
        let finalName = 'Unknown Wallet';
        const rdnsLowerFinal = info.rdns?.toLowerCase() || '';
        
        // Use rdns as single source of truth for wallet identification
        // NEVER trust info.name - it might be garbled
        if (rdnsLowerFinal) {
          if (rdnsLowerFinal === 'app.phantom' || rdnsLowerFinal.includes('phantom')) {
            finalName = 'Phantom';
          } else if (rdnsLowerFinal.includes('okex.wallet') || rdnsLowerFinal.includes('okx') || rdnsLowerFinal.includes('okex')) {
            finalName = 'OKX Wallet';
          } else if (rdnsLowerFinal.includes('binance.wallet') || rdnsLowerFinal.includes('binance')) {
            finalName = 'Binance Wallet';
          } else if (rdnsLowerFinal === 'io.metamask' || rdnsLowerFinal.includes('metamask')) {
            finalName = 'MetaMask';
          } else if (rdnsLowerFinal.includes('coinbase')) {
            finalName = 'Coinbase Wallet';
          } else if (rdnsLowerFinal.includes('brave')) {
            finalName = 'Brave Wallet';
          } else if (rdnsLowerFinal.includes('trust')) {
            finalName = 'Trust Wallet';
          } else if (rdnsLowerFinal.includes('magiceden')) {
            finalName = 'Magic Eden';
          } else if (rdnsLowerFinal.includes('ronin')) {
            finalName = 'Ronin Wallet';
          } else if (rdnsLowerFinal.includes('pontem')) {
            finalName = 'Pontem Wallet';
          } else if (rdnsLowerFinal.includes('talisman')) {
            finalName = 'Talisman';
          } else if (rdnsLowerFinal.includes('compass') || rdnsLowerFinal.includes('leapwallet')) {
            finalName = 'Compass Wallet';
          } else {
            // Fallback: extract from rdns
            const rdnsParts = info.rdns.split('.');
            const lastPart = rdnsParts[rdnsParts.length - 1] || rdnsParts[rdnsParts.length - 2] || '';
            if (lastPart) {
              finalName = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
            }
          }
        } else {
          // No rdns - use normalized name as fallback
          finalName = normalizedName;
        }
        
        wallets.push({
          uuid: info.uuid,
          name: finalName, // Use finalName which is guaranteed correct based on rdns
          // If it's a data URI, store it in originalIcon and use fallback emoji for icon field
          // Otherwise use the icon directly or fallback to emoji
          icon: isDataUri ? (walletIcons[finalName] || '💼') : (info.icon || walletIcons[finalName] || '💼'),
          rdns: info.rdns,
          // Store original data URI icon if present
          originalIcon: isDataUri ? info.icon : undefined,
        });
      };

      window.addEventListener('eip6963:announceProvider', handleAnnounce as EventListener);

      // Request wallet providers
      window.dispatchEvent(new Event('eip6963:requestProvider'));

      // Wait a bit longer for responses (some wallets are slower)
      setTimeout(() => {
        window.removeEventListener('eip6963:announceProvider', handleAnnounce as EventListener);
        resolve(wallets);
      }, 1000); // Increased from 500ms to 1000ms
    });
  };

  const detectLegacyWallets = (alreadyDetected: WalletInfo[] = []): WalletInfo[] => {
    const wallets: WalletInfo[] = [];
    
    // Helper to check if a wallet is already detected
    const isAlreadyDetected = (name: string) => {
      return alreadyDetected.some(w => 
        w.name.toLowerCase() === name.toLowerCase() ||
        w.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(w.name.toLowerCase())
      );
    };

    if (typeof window.ethereum !== 'undefined') {
      const ethereum = window.ethereum as any;

      // MetaMask
      if (ethereum.isMetaMask && !ethereum.isBraveWallet) {
        wallets.push({
          uuid: 'metamask-legacy',
          name: 'MetaMask',
          icon: walletIcons['MetaMask'],
          rdns: 'io.metamask', // Add rdns for legacy MetaMask
        });
      }

      // Coinbase Wallet
      if (ethereum.isCoinbaseWallet) {
        wallets.push({
          uuid: 'coinbase-legacy',
          name: 'Coinbase Wallet',
          icon: walletIcons['Coinbase Wallet'],
          rdns: 'com.coinbase.wallet', // Add rdns for legacy Coinbase
        });
      }

      // Brave Wallet
      if (ethereum.isBraveWallet) {
        wallets.push({
          uuid: 'brave-legacy',
          name: 'Brave Wallet',
          icon: walletIcons['Brave Wallet'],
          rdns: 'com.brave.wallet', // Add rdns for legacy Brave
        });
      }

      // Generic Ethereum provider (fallback)
      if (wallets.length === 0) {
        wallets.push({
          uuid: 'generic-legacy',
          name: 'Ethereum Wallet',
          icon: '💼',
          rdns: 'io.ethereum', // Add rdns for generic Ethereum
        });
      }
    }

    // Binance Wallet (separate detection)
    if ((window as any).BinanceChain) {
      wallets.push({
        uuid: 'binance-legacy',
        name: 'Binance Wallet',
        icon: walletIcons['Binance'],
        rdns: 'com.binance.wallet', // Add rdns for legacy Binance
      });
    }

    // OKX Wallet (check for OKX provider)
    // Check multiple possible OKX wallet objects and methods
    let hasOKX = false;
    let okxProvider = null;
    
    // Check various OKX wallet detection methods
    if ((window as any).okxwallet) {
      hasOKX = true;
      okxProvider = (window as any).okxwallet;
    } else if ((window as any).okexchain) {
      hasOKX = true;
      okxProvider = (window as any).okexchain;
    } else if ((window as any).okxwallet?.ethereum) {
      hasOKX = true;
      okxProvider = (window as any).okxwallet.ethereum;
    } else if ((window as any).okxwallet?.okxwallet) {
      hasOKX = true;
      okxProvider = (window as any).okxwallet.okxwallet;
    }
    
    // Also check if window.ethereum might be OKX (some versions inject as ethereum)
    if (!hasOKX && typeof window.ethereum !== 'undefined') {
      const ethereum = window.ethereum as any;
      // OKX Wallet sometimes sets a specific property
      if (ethereum.isOKExWallet || ethereum.isOkxWallet || 
          (ethereum.constructor && ethereum.constructor.name && ethereum.constructor.name.includes('OKX'))) {
        hasOKX = true;
        okxProvider = window.ethereum;
      }
    }
    
    // Additional OKX detection: check for OKX-specific methods or properties
    if (!hasOKX) {
      // Check for OKX-specific methods that might be present
      const win = window as any;
      if (win.okx && win.okx.ethereum) {
        hasOKX = true;
        okxProvider = win.okx.ethereum;
      } else if (win.okxwallet && typeof win.okxwallet === 'object' && win.okxwallet.ethereum) {
        hasOKX = true;
        okxProvider = win.okxwallet.ethereum;
      }
    }
    
    if (hasOKX && !isAlreadyDetected('OKX Wallet')) {
      wallets.push({
        uuid: 'okx-legacy',
        name: 'OKX Wallet',
        icon: walletIcons['OKX Wallet'],
        rdns: 'com.okex.wallet', // Add rdns for legacy OKX
      });
      console.log('OKX Wallet detected via legacy method');
    }

    // Trust Wallet
    if ((window as any).trustwallet) {
      wallets.push({
        uuid: 'trust-legacy',
        name: 'Trust Wallet',
        icon: walletIcons['Trust Wallet'],
        rdns: 'com.trustwallet.app', // Add rdns for legacy Trust
      });
    }

    return wallets;
  };

  const handleWalletSelect = (wallet: WalletInfo) => {
    onSelectWallet(wallet);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[24px] border-[3px] border-ink shadow-[-8px_8px_0px_0px_rgba(0,0,0,0.2)] max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-ink/10">
          <h2 className="font-mono font-bold text-2xl text-ink">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border-2 border-ink flex items-center justify-center hover:bg-ink hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-ink"></div>
              <p className="mt-4 text-ink2">Detecting wallets...</p>
            </div>
          ) : wallets.length === 0 ? (
            <div className="text-center py-8">
              <Wallet size={48} className="mx-auto mb-4 text-ink/30" />
              <p className="text-ink2 font-medium mb-2">No wallets detected</p>
              <p className="text-sm text-ink2/70 mb-2">
                Please install a wallet extension to continue
              </p>
              {/* Check if this is Cursor browser */}
              {(typeof (window as any).__CURSOR__ !== 'undefined' || 
                navigator.userAgent.includes('Cursor') ||
                (!(window as any).chrome?.runtime && (window as any).location?.hostname === 'localhost')) ? (
                <p className="text-xs text-ink2/50 mb-6 italic">
                  Note: Cursor's integrated browser doesn't support wallet extensions. 
                  Please use a regular browser (Chrome, Firefox, etc.) with wallet extensions installed.
                </p>
              ) : null}
              <div className="space-y-2 text-left">
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border-2 border-ink/20 hover:border-ink hover:bg-ink/5 transition-all"
                >
                  <span className="text-2xl">{walletIcons['MetaMask']}</span>
                  <div className="flex-1">
                    <div className="font-bold text-ink">MetaMask</div>
                    <div className="text-xs text-ink2">Download</div>
                  </div>
                  <Download size={16} className="text-ink2" />
                </a>
                <a
                  href="https://www.binance.com/en/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border-2 border-ink/20 hover:border-ink hover:bg-ink/5 transition-all"
                >
                  <span className="text-2xl">{walletIcons['Binance']}</span>
                  <div className="flex-1">
                    <div className="font-bold text-ink">Binance Wallet</div>
                    <div className="text-xs text-ink2">Download</div>
                  </div>
                  <Download size={16} className="text-ink2" />
                </a>
                <a
                  href="https://www.okx.com/web3"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border-2 border-ink/20 hover:border-ink hover:bg-ink/5 transition-all"
                >
                  <span className="text-2xl">{walletIcons['OKX Wallet']}</span>
                  <div className="flex-1">
                    <div className="font-bold text-ink">OKX Wallet</div>
                    <div className="text-xs text-ink2">Download</div>
                  </div>
                  <Download size={16} className="text-ink2" />
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-ink2 mb-4">Select a wallet to connect:</p>
              
              {/* 
                WALLET DETECTION LOGIC EXPLANATION:
                The number of wallets shown depends on:
                1. EIP-6963 Detection: Detects wallets that support the EIP-6963 standard
                   - These wallets announce themselves via 'eip6963:announceProvider' events
                   - Only wallets INSTALLED in the browser will be detected
                   - Different browsers show different counts because they have different extensions installed
                2. Legacy Detection: Detects wallets via window.ethereum, window.okxwallet, etc.
                   - Only detects wallets that are INSTALLED and expose these global objects
                3. Supported Wallets List: Always shows all SUPPORTED_WALLETS
                   - Detected wallets are shown with connection buttons
                   - Non-detected wallets are shown with "Click to install" links
                
                WHY DIFFERENT BROWSERS SHOW DIFFERENT COUNTS:
                - Google Chrome with many wallet extensions → More detected wallets → Longer list
                - Other browsers without extensions → Fewer detected wallets → Shorter list
                - But ALL browsers will show the same SUPPORTED_WALLETS list (with install links for non-detected ones)
              */}
              
              {/* Show all 6 main wallets: detected ones with connect button, undetected ones with install link */}
              {/* CRITICAL: Only show once - removed duplicate display logic */}
              {SUPPORTED_WALLETS.map((supportedWallet) => {
                const detectedWallet = wallets.find(w => 
                  w.name.toLowerCase() === supportedWallet.name.toLowerCase() ||
                  w.rdns === supportedWallet.rdns
                );
                
                if (detectedWallet) {
                  // Wallet is detected - show connect button
                  return (
                    <button
                      key={detectedWallet.uuid}
                      onClick={() => handleWalletSelect(detectedWallet)}
                      className="w-full flex items-center gap-4 p-4 rounded-[16px] border-2 border-ink/20 hover:border-ink hover:bg-ink/5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all text-left group relative"
                    >
                      <div className="w-12 h-12 flex items-center justify-center shrink-0">
                        {detectedWallet.originalIcon && !failedIcons.has(detectedWallet.uuid) ? (
                          <img 
                            src={detectedWallet.originalIcon} 
                            alt={supportedWallet.name}
                            className="w-10 h-10 object-contain"
                            onError={() => {
                              setFailedIcons(prev => new Set(prev).add(detectedWallet.uuid));
                            }}
                          />
                        ) : (
                          <span className="text-3xl">{supportedWallet.icon}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 relative z-10">
                        <div className="font-bold text-ink text-lg truncate" title={supportedWallet.name}>
                          {supportedWallet.name}
                        </div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-ink/20 group-hover:bg-accent transition-colors"></div>
                    </button>
                  );
                } else {
                  // Wallet is not detected - show install link
                  return (
                    <a
                      key={supportedWallet.name}
                      href={supportedWallet.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-4 p-4 rounded-[16px] border-2 border-ink/20 hover:border-ink hover:bg-ink/5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all text-left group relative"
                    >
                      <div className="w-12 h-12 flex items-center justify-center shrink-0">
                        <span className="text-3xl">{supportedWallet.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0 relative z-10">
                        <div className="font-bold text-ink text-lg truncate">
                          {supportedWallet.name}
                        </div>
                        <div className="text-xs text-ink2/70">
                          Click to install
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Download size={16} className="text-ink2" />
                        <div className="w-2 h-2 rounded-full bg-ink/20"></div>
                      </div>
                    </a>
                  );
                }
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


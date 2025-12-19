/**
 * x402 Payment Server
 * Implements HTTP 402 Payment Required protocol for unlocking content
 * Verifies on-chain USDC payments on Base network
 */

// Load environment variables first
require('dotenv').config();

// Import dependencies with error handling
let express, cors, path, fs, crypto, ethers;

try {
  express = require('express');
  cors = require('cors');
  path = require('path');
  fs = require('fs');
  crypto = require('crypto');
  ethers = require('ethers');
} catch (error) {
  console.error('❌ Failed to load dependencies:', error.message);
  console.error('❌ Please run: npm install');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from frontend build directory
const frontendBuildPath = path.join(__dirname, 'frontend', 'dist');

// Log frontend build path for debugging
console.log('📁 Frontend build path:', frontendBuildPath);

// CRITICAL: Check file system operations gracefully to avoid blocking startup
// Volume mount may cause file system operations to hang or fail
let frontendBuildExists = false;
try {
  frontendBuildExists = fs.existsSync(frontendBuildPath);
  console.log('📁 Frontend build exists:', frontendBuildExists);
} catch (fsError) {
  console.error('❌ Error checking frontend build path:', fsError);
  console.warn('⚠️ Assuming frontend build does not exist due to file system error');
  frontendBuildExists = false;
}

// Serve static files from frontend build directory
if (frontendBuildExists) {
  try {
    app.use(express.static(frontendBuildPath));
    console.log('✅ Serving static files from:', frontendBuildPath);
  } catch (staticError) {
    console.error('❌ Error setting up static file serving:', staticError);
    console.warn('⚠️ Static file serving disabled due to error');
  }
} else {
  console.warn('⚠️ Frontend build directory not found:', frontendBuildPath);
  console.warn('⚠️ Frontend files will not be served. Please build the frontend first.');
}

// Serve x402-client.js from public directory
// CRITICAL: Handle file system operations gracefully to avoid blocking startup
try {
  const x402ClientPath = path.join(__dirname, 'frontend', 'public', 'x402-client.js');
  if (fs.existsSync(x402ClientPath)) {
    app.use('/x402-client.js', express.static(x402ClientPath));
    console.log('✅ Serving x402-client.js from:', x402ClientPath);
  } else {
    console.warn('⚠️ x402-client.js not found:', x402ClientPath);
  }
} catch (fsError) {
  console.error('❌ Error setting up x402-client.js serving:', fsError);
}

// Serve avatar image
try {
  const assetsPath = path.join(__dirname, 'frontend', 'assets');
  if (fs.existsSync(assetsPath)) {
    app.use('/assets', express.static(assetsPath));
    console.log('✅ Serving assets from:', assetsPath);
  } else {
    console.warn('⚠️ Assets directory not found:', assetsPath);
  }
} catch (fsError) {
  console.error('❌ Error setting up assets serving:', fsError);
}

// Load materials configuration
const materialsConfigPath = path.join(__dirname, 'materials-config.json');
let materialsConfig = { materials: [] };
try {
  if (fs.existsSync(materialsConfigPath)) {
    const configContent = fs.readFileSync(materialsConfigPath, 'utf8');
    materialsConfig = JSON.parse(configContent);
    console.log(`✅ Loaded ${materialsConfig.materials.length} materials from config`);
  } else {
    console.warn('⚠️ materials-config.json not found, using empty config');
  }
} catch (error) {
  console.error('❌ Error loading materials config:', error.message);
  console.error('❌ Using empty config as fallback');
  materialsConfig = { materials: [] };
}

/**
 * Get materials list (public info without file paths)
 */
function getMaterialsList() {
  return materialsConfig.materials.map(material => ({
    id: material.id,
    title: material.title,
    description: material.description,
    type: material.type,
    date: material.date,
    // Only include url for link types
    ...(material.type === 'link' && material.url ? { url: material.url } : {}),
  }));
}

/**
 * Get materials with download paths (for unlocked users)
 */
function getMaterialsWithDownloads() {
  return materialsConfig.materials.map(material => ({
    id: material.id,
    title: material.title,
    description: material.description,
    type: material.type,
    date: material.date,
    ...(material.type === 'link' && material.url ? { url: material.url } : {}),
    ...(material.filename ? { filename: material.filename } : {}),
    ...(material.downloadPath ? { downloadUrl: `/api/download/${material.id}` } : {}),
  }));
}

// In-memory store for payment sessions (in production, use a database)
const paymentSessions = new Map();
const paidAddresses = new Set(); // Track paid wallet addresses

// Payment configuration
const PAYMENT_AMOUNT = '1.00'; // $1.00 USDC (matching frontend config)
const PAYMENT_AMOUNT_WEI = ethers.parseUnits(PAYMENT_AMOUNT, 6); // USDC has 6 decimals
const PAYMENT_CURRENCY = 'USDC';
const PAYMENT_NETWORK = 'base';

// Base network configuration
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const RECEIVER_ADDRESS = process.env.RECEIVER_ADDRESS; // Your wallet address to receive payments

// USDC contract addresses on Base
const USDC_CONTRACT_ADDRESS = {
  'base-mainnet': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Sepolia testnet
};

const network = process.env.NETWORK || 'base-mainnet';
const usdcAddress = USDC_CONTRACT_ADDRESS[network] || USDC_CONTRACT_ADDRESS['base-mainnet'];

// Initialize provider (non-blocking, async initialization)
let provider = null;

// Initialize provider asynchronously to avoid blocking server startup
(async () => {
  try {
    if (RECEIVER_ADDRESS) {
      provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
      // Test connection (non-blocking)
      provider.getNetwork().then(() => {
        console.log('✅ Connected to Base network:', BASE_RPC_URL);
        console.log('✅ Receiver address:', RECEIVER_ADDRESS);
      }).catch((err) => {
        console.warn('⚠️ Provider connection test failed (non-critical):', err.message);
        // Provider still created, just connection test failed
      });
    } else {
      console.warn('⚠️ RECEIVER_ADDRESS not set! Payment verification will fail.');
      console.warn('⚠️ Please set RECEIVER_ADDRESS environment variable in Railway.');
    }
  } catch (error) {
    console.error('❌ Failed to initialize provider:', error.message);
    console.error('❌ Error stack:', error.stack);
    // Don't throw - allow server to start even if provider fails
  }
})();

// USDC ERC20 ABI (minimal - just transfer and balance functions)
const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

/**
 * Generate payment requirements header according to x402 spec
 */
function generatePaymentRequirements() {
  if (!RECEIVER_ADDRESS) {
    console.error('❌ RECEIVER_ADDRESS not configured! Cannot generate payment requirements.');
    throw new Error('RECEIVER_ADDRESS not configured. Please set RECEIVER_ADDRESS environment variable.');
  }

  return {
    amount: PAYMENT_AMOUNT,
    currency: PAYMENT_CURRENCY,
    network: PAYMENT_NETWORK,
    receiver: RECEIVER_ADDRESS,
    usdcContractAddress: usdcAddress,
    chainId: network === 'base-mainnet' ? 8453 : 84532, // Base mainnet: 8453, Base Sepolia: 84532
    expires: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
  };
}

/**
 * Verify payment proof by checking on-chain transaction
 */
async function verifyPayment(paymentProof, walletAddress) {
  try {
    // Parse payment proof
    const proof = typeof paymentProof === 'string' ? JSON.parse(paymentProof) : paymentProof;
    
    console.log('[verifyPayment] Entry:', {
      hasTransactionHash: !!proof?.transactionHash,
      transactionHash: proof?.transactionHash,
      walletAddress: walletAddress
    });
    
    if (!proof || !proof.transactionHash) {
      return { valid: false, reason: 'invalid_proof_format' };
    }

    // Normalize wallet address
    const normalizedAddress = walletAddress.toLowerCase();
    
    // Check if address has already paid (cache check)
    if (paidAddresses.has(normalizedAddress)) {
      return { valid: true, reason: 'already_paid' };
    }

    // Verify transaction on-chain
    try {
      if (!provider) {
        console.error('[verifyPayment] Provider not initialized');
        return { valid: false, reason: 'provider_not_initialized' };
      }
      
      const txReceipt = await provider.getTransactionReceipt(proof.transactionHash);
      
      if (!txReceipt || txReceipt.status !== 1) {
        console.error('[verifyPayment] Transaction failed or not found:', {
          hasReceipt: !!txReceipt,
          status: txReceipt?.status,
          transactionHash: proof.transactionHash
        });
        return { valid: false, reason: 'transaction_failed_or_not_found' };
      }

      // Get transaction details
      const tx = await provider.getTransaction(proof.transactionHash);
      
      // Check if transaction is to USDC contract
      if (tx.to.toLowerCase() !== usdcAddress.toLowerCase()) {
        return { valid: false, reason: 'wrong_contract' };
      }

      // Parse transaction to check it's a USDC transfer
      const usdcContract = new ethers.Contract(usdcAddress, USDC_ABI, provider);
      
      // Get logs from transaction receipt
      const transferInterface = new ethers.Interface(USDC_ABI);
      const transferLogs = txReceipt.logs.filter(log => {
        try {
          const parsedLog = transferInterface.parseLog(log);
          return parsedLog && parsedLog.name === 'Transfer';
        } catch {
          return false;
        }
      });

      if (transferLogs.length === 0) {
        return { valid: false, reason: 'no_transfer_event' };
      }

      // Check each transfer event
      let validTransfer = false;
      for (const log of transferLogs) {
        try {
          const parsedLog = transferInterface.parseLog(log);
          if (parsedLog && parsedLog.name === 'Transfer') {
            const from = parsedLog.args.from.toLowerCase();
            const to = parsedLog.args.to.toLowerCase();
            const amount = parsedLog.args.value;

            // Check if transfer is from user's wallet to receiver address
            if (from === normalizedAddress && 
                to === RECEIVER_ADDRESS.toLowerCase() && 
                amount >= PAYMENT_AMOUNT_WEI) {
              validTransfer = true;
              break;
            }
          }
        } catch (e) {
          console.error('Error parsing transfer log:', e);
        }
      }

      console.log('[verifyPayment] Transfer validation:', {
        validTransfer,
        normalizedAddress,
        receiverAddress: RECEIVER_ADDRESS.toLowerCase(),
        transferLogsCount: transferLogs.length
      });

      if (!validTransfer) {
        return { valid: false, reason: 'transfer_does_not_match' };
      }

      // Verify minimum confirmations (optional - at least 1 block confirmation)
      const currentBlock = await provider.getBlockNumber();
      const confirmations = currentBlock - txReceipt.blockNumber;
      
      if (confirmations < 1) {
        return { valid: false, reason: 'insufficient_confirmations' };
      }

      // Payment verified - mark address as paid
      paidAddresses.add(normalizedAddress);
      
      return { 
        valid: true, 
        reason: 'payment_verified',
        transactionHash: proof.transactionHash,
        confirmations,
      };
    } catch (error) {
      console.error('On-chain verification error:', error);
      return { 
        valid: false, 
        reason: 'verification_error', 
        error: error.message 
      };
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    return { valid: false, reason: 'verification_error', error: error.message };
  }
}

/**
 * Check if user has access (has paid)
 */
function hasAccess(walletAddress) {
  if (!walletAddress) return false;
  return paidAddresses.has(walletAddress.toLowerCase());
}

/**
 * Extract wallet address from X-PAYMENT header or request
 */
function extractWalletAddress(req) {
  // Try to get from X-PAYMENT header
  const paymentHeader = req.headers['x-payment'];
  if (paymentHeader) {
    try {
      const proof = typeof paymentHeader === 'string' ? JSON.parse(paymentHeader) : paymentHeader;
      return proof.walletAddress || proof.from || null;
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  // Try to get from query parameter or body
  return req.query.walletAddress || req.body.walletAddress || null;
}

// Routes

/**
 * Root endpoint - simple response to verify server is running
 * This endpoint must respond quickly for Railway health checks
 */
app.get('/', (req, res) => {
  try {
    // Try to serve frontend, but if it fails, return a simple response
    const indexPath = path.join(frontendBuildPath, 'index.html');
    
    if (fs.existsSync(indexPath)) {
      // Serve frontend file
      return res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('[GET /] Error sending index.html:', err);
          // If error sending file, return simple HTML response
          res.status(200).send(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Server Running</title>
                <meta charset="utf-8">
              </head>
              <body style="font-family: sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
                <h1>✅ Server is Running</h1>
                <p>Frontend file could not be served, but the server is operational.</p>
                <p><strong>Error:</strong> ${err.message}</p>
                <hr>
                <p><a href="/health">Health Check</a> | <a href="/api/unlock">API Unlock</a></p>
              </body>
            </html>
          `);
        }
      });
    }
    
    // Fallback response if frontend not built - return HTML instead of JSON
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Server Running</title>
          <meta charset="utf-8">
        </head>
        <body style="font-family: sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1>✅ Server is Running</h1>
          <p>The server is operational, but the frontend build files are not found.</p>
          <hr>
          <p><strong>Frontend Path:</strong> ${frontendBuildPath}</p>
          <p><strong>Frontend Exists:</strong> ${fs.existsSync(frontendBuildPath)}</p>
          <hr>
          <p><a href="/health">Health Check</a> | <a href="/api/unlock">API Unlock</a></p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('[GET /] Error:', error);
    // Return HTML error page instead of JSON
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Server Error</title>
          <meta charset="utf-8">
        </head>
        <body style="font-family: sans-serif; padding: 40px;">
          <h1>❌ Server Error</h1>
          <p>${error.message}</p>
        </body>
      </html>
    `);
  }
});

/**
 * Health check endpoint
 * Railway uses this to check if the app is healthy
 */
app.get('/health', (req, res) => {
  try {
    const healthData = { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      network,
      receiverAddress: RECEIVER_ADDRESS || 'Not configured',
      provider: provider ? 'initialized' : 'not initialized',
      frontendPath: frontendBuildPath,
      frontendExists: fs.existsSync(frontendBuildPath),
    };
    console.log('[GET /health] Health check:', healthData);
    res.json(healthData);
  } catch (error) {
    console.error('[GET /health] Error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * Unlock endpoint - implements x402 protocol
 * GET /api/unlock - Check access or return 402 with payment requirements
 */
app.get('/api/unlock', (req, res) => {
  try {
    // CRITICAL: Check RECEIVER_ADDRESS first before any operations
    if (!RECEIVER_ADDRESS) {
      console.error('[GET /api/unlock] RECEIVER_ADDRESS not configured!');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
        message: 'Payment receiver address not configured. Please contact administrator.',
        details: process.env.NODE_ENV === 'production' ? undefined : 'RECEIVER_ADDRESS environment variable is not set in Railway.',
      });
    }

    const walletAddress = extractWalletAddress(req);
    
    // Check if user already has access
    if (walletAddress && hasAccess(walletAddress)) {
      return res.json({
        success: true,
        unlocked: true,
        message: 'Content unlocked',
        materials: getMaterialsWithDownloads(),
      });
    }

    // Return 402 Payment Required with payment requirements
    const paymentReqs = generatePaymentRequirements();
    
    res.status(402).json({
      success: false,
      unlocked: false,
      message: 'Payment required to unlock content',
      paymentRequirements: paymentReqs,
    });
  } catch (error) {
    console.error('[GET /api/unlock] Error:', error);
    console.error('[GET /api/unlock] Error stack:', error.stack);
    
    // Check if error is related to RECEIVER_ADDRESS
    if (error.message && error.message.includes('RECEIVER_ADDRESS')) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
        message: 'Payment receiver address not configured. Please contact administrator.',
        details: process.env.NODE_ENV === 'production' ? undefined : error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'production' ? 'An error occurred. Please check server logs.' : error.message,
    });
  }
});

/**
 * POST /api/unlock - Verify payment and unlock content
 */
app.post('/api/unlock', async (req, res) => {
  try {
    const walletAddress = extractWalletAddress(req);
    const paymentProof = req.headers['x-payment'] || req.body.paymentProof;

    // Log for debugging (console only in production)
    console.log('[POST /api/unlock] Entry:', {
      hasWalletAddress: !!walletAddress,
      walletAddress: walletAddress,
      hasHeaderPayment: !!req.headers['x-payment'],
      hasBodyPayment: !!req.body.paymentProof,
      paymentProofType: typeof paymentProof
    });

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required',
      });
    }

    if (!paymentProof) {
      console.error('[POST /api/unlock] Missing payment proof:', {
        hasHeader: !!req.headers['x-payment'],
        hasBody: !!req.body.paymentProof,
        headersKeys: Object.keys(req.headers).filter(k => k.toLowerCase().includes('payment')),
        bodyKeys: Object.keys(req.body || {})
      });
      return res.status(400).json({
        success: false,
        error: 'Payment proof is required',
        paymentRequirements: generatePaymentRequirements(),
      });
    }

    // Parse payment proof if it's a string
    let parsedProof = paymentProof;
    if (typeof paymentProof === 'string') {
      try {
        parsedProof = JSON.parse(paymentProof);
      } catch (parseError) {
        console.error('[POST /api/unlock] Payment proof parse error:', parseError.message);
        return res.status(400).json({
          success: false,
          error: 'Invalid payment proof format',
          paymentRequirements: generatePaymentRequirements(),
        });
      }
    }

    // Verify payment
    console.log('[POST /api/unlock] Verifying payment for:', walletAddress);
    const verification = await verifyPayment(parsedProof, walletAddress);

    console.log('[POST /api/unlock] Verification result:', {
      valid: verification.valid,
      reason: verification.reason,
      transactionHash: verification.transactionHash
    });

    if (!verification.valid) {
      console.error('[POST /api/unlock] Payment verification failed:', verification.reason);
      return res.status(402).json({
        success: false,
        error: 'Payment verification failed',
        reason: verification.reason,
        paymentRequirements: generatePaymentRequirements(),
      });
    }

    // Payment verified - grant access
    res.json({
      success: true,
      unlocked: true,
      message: 'Payment verified. Content unlocked!',
      transactionHash: verification.transactionHash,
      materials: getMaterialsWithDownloads(),
    });
  } catch (error) {
    console.error('Unlock POST error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * Check payment status
 */
app.get('/api/payment-status', (req, res) => {
  try {
    const walletAddress = extractWalletAddress(req);
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required',
      });
    }

    const hasPaid = hasAccess(walletAddress);
    
    res.json({
      success: true,
      walletAddress,
      hasPaid,
      unlocked: hasPaid,
    });
  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * Create payment intent (optional - for better UX)
 */
app.post('/api/payment-intent', (req, res) => {
  try {
    const sessionId = crypto.randomUUID();
    const paymentReqs = generatePaymentRequirements();
    
    paymentSessions.set(sessionId, {
      ...paymentReqs,
      createdAt: new Date(),
      status: 'pending',
    });

    res.json({
      success: true,
      sessionId,
      paymentRequirements: paymentReqs,
    });
  } catch (error) {
    console.error('Payment intent error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * File download endpoint - protected by payment verification
 * GET /api/download/:materialId
 */
app.get('/api/download/:materialId', (req, res) => {
  try {
    const { materialId } = req.params;
    const walletAddress = extractWalletAddress(req);

    // Check if user has access
    if (!walletAddress || !hasAccess(walletAddress)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Payment required.',
        paymentRequirements: generatePaymentRequirements(),
      });
    }

    // Find material in config
    const material = materialsConfig.materials.find(m => m.id === materialId);
    if (!material) {
      return res.status(404).json({
        success: false,
        error: 'Material not found',
      });
    }

    // Only allow download for file types (pdf, archive, etc.)
    if (material.type === 'link') {
      return res.status(400).json({
        success: false,
        error: 'This material is a link, not a downloadable file',
        url: material.url,
      });
    }

    if (!material.downloadPath) {
      return res.status(404).json({
        success: false,
        error: 'Download path not configured for this material',
      });
    }

    const filePath = path.join(__dirname, material.downloadPath);

    // Check if file exists
    // CRITICAL: Handle Volume mount gracefully - file may be on Volume
    try {
      if (!fs.existsSync(filePath)) {
        console.error(`[GET /api/download] File not found: ${filePath}`);
        return res.status(404).json({
          success: false,
          error: 'File not found on server. Please contact administrator.',
        });
      }
    } catch (fsError) {
      console.error('[GET /api/download] Error checking file existence:', fsError);
      return res.status(500).json({
        success: false,
        error: 'File system error. Please check server logs.',
      });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const filename = material.filename || path.basename(filePath);

    // Set headers for file download
    res.setHeader('Content-Type', getContentType(material.type));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stats.size);

    // Stream file to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Log download
    console.log(`File downloaded: ${filename} by ${walletAddress}`);
  } catch (error) {
    console.error('[GET /api/download] Error:', error);
    console.error('[GET /api/download] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'production' ? 'An error occurred. Please check server logs.' : error.message,
    });
  }
});

/**
 * Admin: Upload material file
 * POST /api/admin/upload
 * Requires: X-Admin-Key header (set in environment variable ADMIN_KEY)
 */
app.post('/api/admin/upload', express.raw({ type: '*/*', limit: '100mb' }), (req, res) => {
  try {
    // Simple admin authentication (use API key)
    const adminKey = process.env.ADMIN_KEY;
    const providedKey = req.headers['x-admin-key'];
    
    if (!adminKey || providedKey !== adminKey) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized. Admin key required.',
      });
    }

    const materialId = req.headers['x-material-id'] || req.query.materialId;
    const filename = req.headers['x-filename'] || req.query.filename;
    const materialType = req.headers['x-material-type'] || req.query.type || 'pdf';

    if (!materialId || !filename) {
      return res.status(400).json({
        success: false,
        error: 'Material ID and filename are required',
      });
    }

    // Create materials directory if it doesn't exist
    // CRITICAL: Handle Volume mount gracefully - Volume may be mounted at /app/materials
    const materialsDir = path.join(__dirname, 'materials', 'downloads');
    try {
      if (!fs.existsSync(materialsDir)) {
        fs.mkdirSync(materialsDir, { recursive: true });
        console.log('[POST /api/admin/upload] Created materials directory:', materialsDir);
      }
    } catch (dirError) {
      console.error('[POST /api/admin/upload] Error creating materials directory:', dirError);
      // If directory creation fails (e.g., Volume mount issue), continue anyway
      // The file write will fail later if there's a real problem
    }

    // Save file
    const filePath = path.join(materialsDir, filename);
    fs.writeFileSync(filePath, req.body);

    // Update materials-config.json
    const configPath = path.join(__dirname, 'materials-config.json');
    let config = { materials: [] };
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    // Find and update material or create new one
    const materialIndex = config.materials.findIndex(m => m.id === materialId);
    const materialData = {
      id: materialId,
      filename: filename,
      downloadPath: `materials/downloads/${filename}`,
      type: materialType,
      ...(req.headers['x-title'] && { title: req.headers['x-title'] }),
      ...(req.headers['x-description'] && { description: req.headers['x-description'] }),
      ...(req.headers['x-date'] && { date: req.headers['x-date'] }),
    };

    if (materialIndex >= 0) {
      config.materials[materialIndex] = { ...config.materials[materialIndex], ...materialData };
    } else {
      config.materials.push(materialData);
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    res.json({
      success: true,
      message: 'File uploaded successfully',
      materialId,
      filename,
      filePath: `materials/downloads/${filename}`,
    });
  } catch (error) {
    console.error('[POST /api/admin/upload] Error:', error);
    console.error('[POST /api/admin/upload] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'production' ? 'An error occurred. Please check server logs.' : error.message,
    });
  }
});

/**
 * Get content type based on material type
 */
function getContentType(type) {
  const contentTypes = {
    pdf: 'application/pdf',
    archive: 'application/zip',
    zip: 'application/zip',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
    csv: 'text/csv',
  };
  return contentTypes[type] || 'application/octet-stream';
}

// Catch-all handler: send back React's index.html file for client-side routing
// This must be after all API routes
app.get('*', (req, res) => {
  try {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    // Serve index.html for all other routes (React Router)
    const indexPath = path.join(frontendBuildPath, 'index.html');
    
    // Check if file exists before trying to send it
    if (!fs.existsSync(indexPath)) {
      return res.status(404).send(`
        <html>
          <head><title>Frontend Not Built</title></head>
          <body style="font-family: sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
            <h1>Frontend not built</h1>
            <p>The frontend build files are missing. Please build the frontend first:</p>
            <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;">cd frontend && npm install && npm run build</pre>
            <p>Or run in development mode:</p>
            <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;">npm run dev:frontend</pre>
            <hr>
            <p><strong>Server Status:</strong> ✅ Running</p>
            <p><strong>API Endpoints:</strong></p>
            <ul>
              <li><a href="/health">/health</a> - Health check</li>
              <li><a href="/api/unlock">/api/unlock</a> - Unlock endpoint</li>
            </ul>
          </body>
        </html>
      `);
    }
    
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('[GET *] Error sending index.html:', err);
        if (err.code === 'ENOENT') {
          res.status(404).send(`
            <html>
              <head><title>404 - Not Found</title></head>
              <body style="font-family: sans-serif; padding: 40px;">
                <h1>404 - Page Not Found</h1>
                <p>The requested page could not be found.</p>
                <p><a href="/">Go to homepage</a></p>
              </body>
            </html>
          `);
        } else {
          res.status(500).send(`
            <html>
              <head><title>500 - Server Error</title></head>
              <body style="font-family: sans-serif; padding: 40px;">
                <h1>500 - Server Error</h1>
                <p>An error occurred while loading the page.</p>
                <p><a href="/">Go to homepage</a></p>
              </body>
            </html>
          `);
        }
      }
    });
  } catch (error) {
    console.error('[GET *] Unexpected error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Only start server if not in test environment and if this file is run directly
if (process.env.NODE_ENV !== 'test' && require.main === module) {
  console.log('🔧 Starting server...');
  console.log('🔧 PORT:', PORT);
  console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
  
  // CRITICAL: Express app.listen callback does NOT take an error parameter
  // The callback is called when the server starts listening, not on error
  const server = app.listen(PORT, '0.0.0.0', () => {
    const addr = server.address();
    console.log(`🚀 x402 Payment Server running on port ${PORT}`);
    console.log(`📝 Payment: ${PAYMENT_AMOUNT} ${PAYMENT_CURRENCY} on ${PAYMENT_NETWORK}`);
    console.log(`🌐 Network: ${network}`);
    console.log(`💰 Receiver: ${RECEIVER_ADDRESS || 'Not configured'}`);
    console.log(`📍 USDC Contract: ${usdcAddress}`);
    console.log(`🌍 Server listening on: 0.0.0.0:${PORT}`);
    console.log(`🌍 Server address: http://0.0.0.0:${PORT}`);
    console.log(`🌍 Server address details:`, addr);
    
    if (!RECEIVER_ADDRESS) {
      console.warn('⚠️  WARNING: RECEIVER_ADDRESS not configured! Payments will fail.');
    }
    
    if (!provider) {
      console.warn('⚠️  WARNING: Provider not initialized! Payment verification will fail.');
    }
    
    // Log that server is ready
    console.log('✅ Server is ready to accept connections');
    console.log('✅ Server startup completed successfully');
    console.log('✅ Server is ready to accept HTTP requests');
  });
  
  // Handle server errors gracefully
  server.on('error', (error) => {
    console.error('❌ Server error:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Please use a different port.`);
      process.exit(1);
    }
    // For other errors, log but don't exit - server might recover
    console.error('❌ Server error occurred, but continuing...');
  });
  
  // CRITICAL: Set keepAlive timeout to prevent connection issues
  server.keepAliveTimeout = 65000; // 65 seconds (Railway default is 60s)
  server.headersTimeout = 66000; // 66 seconds (must be > keepAliveTimeout)
  
  // Log server configuration
  console.log('🔧 Server keepAliveTimeout:', server.keepAliveTimeout);
  console.log('🔧 Server headersTimeout:', server.headersTimeout);
  
  // Handle uncaught exceptions - log but don't crash
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('❌ Stack:', error.stack);
    // Log but don't exit - keep server running
    console.error('❌ Exception logged, server continues running...');
  });
  
  // Handle unhandled promise rejections - log but don't crash
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('❌ Reason:', reason);
    // Log but don't exit - keep server running
    console.error('❌ Rejection logged, server continues running...');
  });
  
  // Log server startup completion
  console.log('✅ Server startup completed successfully');
  console.log('✅ Server is ready to accept HTTP requests');
}

module.exports = app;

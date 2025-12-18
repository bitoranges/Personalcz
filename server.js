/**
 * x402 Payment Server
 * Implements HTTP 402 Payment Required protocol for unlocking content
 * Verifies on-chain USDC payments on Base network
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { ethers } = require('ethers');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from frontend build directory
const frontendBuildPath = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(frontendBuildPath));

// Serve x402-client.js from public directory
app.use('/x402-client.js', express.static(path.join(__dirname, 'frontend', 'public', 'x402-client.js')));

// Serve avatar image
app.use('/assets', express.static(path.join(__dirname, 'frontend', 'assets')));

// Load materials configuration
const materialsConfigPath = path.join(__dirname, 'materials-config.json');
let materialsConfig = { materials: [] };
try {
  if (fs.existsSync(materialsConfigPath)) {
    materialsConfig = JSON.parse(fs.readFileSync(materialsConfigPath, 'utf8'));
  }
} catch (error) {
  console.error('Error loading materials config:', error);
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

// Initialize provider
let provider = null;
try {
  if (RECEIVER_ADDRESS) {
    provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    console.log('✅ Connected to Base network:', BASE_RPC_URL);
    console.log('✅ Receiver address:', RECEIVER_ADDRESS);
  } else {
    console.error('❌ RECEIVER_ADDRESS not set! Payment verification will fail.');
    console.error('❌ Please set RECEIVER_ADDRESS environment variable in Railway.');
  }
} catch (error) {
  console.error('❌ Failed to initialize provider:', error.message);
  console.error('❌ Error stack:', error.stack);
}

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
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    network,
    receiverAddress: RECEIVER_ADDRESS || 'Not configured',
  });
});

/**
 * Unlock endpoint - implements x402 protocol
 * GET /api/unlock - Check access or return 402 with payment requirements
 */
app.get('/api/unlock', (req, res) => {
  try {
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
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return res.status(404).json({
        success: false,
        error: 'File not found on server. Please contact administrator.',
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
    const materialsDir = path.join(__dirname, 'materials', 'downloads');
    if (!fs.existsSync(materialsDir)) {
      fs.mkdirSync(materialsDir, { recursive: true });
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
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // Serve index.html for all other routes (React Router)
  const indexPath = path.join(frontendBuildPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      // If frontend build doesn't exist, serve a simple message
      if (err.code === 'ENOENT') {
        res.status(404).send(`
          <html>
            <body style="font-family: sans-serif; padding: 40px;">
              <h1>Frontend not built</h1>
              <p>Please build the frontend first:</p>
              <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">cd frontend && npm install && npm run build</pre>
              <p>Or run in development mode:</p>
              <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">npm run dev:frontend</pre>
            </body>
          </html>
        `);
      } else {
        res.status(500).send('Error loading frontend');
      }
    }
  });
});

// Only start server if not in test environment and if this file is run directly
if (process.env.NODE_ENV !== 'test' && require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 x402 Payment Server running on port ${PORT}`);
    console.log(`📝 Payment: ${PAYMENT_AMOUNT} ${PAYMENT_CURRENCY} on ${PAYMENT_NETWORK}`);
    console.log(`🌐 Network: ${network}`);
    console.log(`💰 Receiver: ${RECEIVER_ADDRESS || 'Not configured'}`);
    console.log(`📍 USDC Contract: ${usdcAddress}`);
    
    if (!RECEIVER_ADDRESS) {
      console.warn('⚠️  WARNING: RECEIVER_ADDRESS not configured! Payments will fail.');
    }
  });
}

module.exports = app;

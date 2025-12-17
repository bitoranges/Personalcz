import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MaterialsCard } from '../components/MaterialsCard';

// Mock x402Client constructor
class MockX402Client {
  connectWallet = vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890');
  unlockContent = vi.fn().mockResolvedValue({
    unlocked: true,
    materials: [],
  });
  checkStatus = vi.fn().mockResolvedValue({ unlocked: false });
  fetchWithPayment = vi.fn();
  
  constructor(options: any) {
    // Store options if needed
    this.options = options;
  }
}

beforeEach(() => {
  // Reset mocks
  vi.clearAllMocks();
  
  // Mock window.location for API URL resolution
  Object.defineProperty(window, 'location', {
    value: {
      origin: 'http://localhost:5173',
      href: 'http://localhost:5173',
    },
    writable: true,
  });
  
  // Mock window.x402Client as a constructor
  (global as any).window = {
    ...global.window,
    location: {
      origin: 'http://localhost:5173',
      href: 'http://localhost:5173',
    },
    x402Client: MockX402Client,
    ethers: {},
  };
});

describe('MaterialsCard', () => {
  it('should render the materials card', () => {
    render(<MaterialsCard />);
    
    expect(screen.getByText('Materials')).toBeInTheDocument();
    expect(screen.getByText(/3 Items/)).toBeInTheDocument();
    expect(screen.getByText('Premium Only')).toBeInTheDocument();
  });

  it('should show unlock button when locked', () => {
    render(<MaterialsCard />);
    
    expect(screen.getByText('Unlock All Access')).toBeInTheDocument();
    // Price should be visible somewhere
    expect(screen.getByText(/1\.00|\$1/)).toBeInTheDocument();
  });

  it('should display materials list', () => {
    render(<MaterialsCard />);
    
    expect(screen.getByText('2024 Q4 Crypto Market Outlook')).toBeInTheDocument();
    expect(screen.getByText('High Conviction Alpha List')).toBeInTheDocument();
    expect(screen.getByText('Institutional On-Chain Toolkit')).toBeInTheDocument();
  });

  it('should render unlock button with correct price', () => {
    render(<MaterialsCard />);
    
    const unlockButton = screen.getByText('Unlock All Access');
    expect(unlockButton).toBeInTheDocument();
    
    // Check for price - may be formatted differently
    const priceElement = screen.getByText(/1\.00|\$1/);
    expect(priceElement).toBeInTheDocument();
    
    // Check for BASE chain indicator
    const baseElement = screen.getByText(/BASE/i);
    expect(baseElement).toBeInTheDocument();
  });

  it('should show materials with locked state', () => {
    render(<MaterialsCard />);
    
    // Check that materials are displayed but locked
    const materials = screen.getAllByText(/2024 Q4|High Conviction|Institutional On-Chain/);
    expect(materials.length).toBeGreaterThan(0);
    
    // Should show "Premium Only" badge
    expect(screen.getByText('Premium Only')).toBeInTheDocument();
  });
});





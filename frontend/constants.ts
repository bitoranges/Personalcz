import { SiteConfig, Material } from './types';

export const CONFIG: SiteConfig = {
  // 1. 网站基础信息 (Website Basic Info)
  name: 'Chengzi Space',
  
  // 2. 顶部座右铭 (Top Motto)
  motto: 'Always all in, forever with tears in my eyes!',

  // 3. 个人简介 (Bio/Description)
  tagline: 'Bitcoin Holder | Crypto Investor & Researcher | Hunting Alpha with AI · Daily updates, no breaks · Absolutely no full-position gambling.',
  
  socials: {
    x: 'https://x.com/chengzi_95330',
    telegram: 'https://t.me/zicheng_95330',
  },
  
  // 4. 支付配置 (Payment Config)
  price: {
    amount: 1.00, // 价格
    currency: 'USDC',
    chain: 'BASE',
  },
};

// 5. 学习资料列表 (Materials List)
export const MOCK_MATERIALS: Material[] = [
  {
    id: 'm1',
    title: '2024 Q4 Crypto Market Outlook', 
    description: 'Comprehensive analysis of liquidity cycles and BTC dominance metrics for the upcoming quarter.',
    type: 'pdf',
    date: '2024-12-01',
  },
  {
    id: 'm2',
    title: 'High Conviction Alpha List', 
    description: 'Curated list of altcoin setups with entry/exit targets.',
    type: 'link',
    date: '2024-12-10',
  },
  {
    id: 'm3',
    title: 'Institutional On-Chain Toolkit', 
    description: 'Access to my personal dashboard configurations and data sources.',
    type: 'archive',
    date: '2024-12-14',
  },
];
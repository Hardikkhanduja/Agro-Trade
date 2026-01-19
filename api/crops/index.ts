import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

interface Crop {
  id: string;
  cropName: string;
  quantity: number;
  minPrice: number;
  currentPrice: number;
  location: string;
  farmerId: string;
  farmerName: string;
  status: 'active' | 'closed';
  bids: Array<{
    id: string;
    traderId: string;
    traderName: string;
    amount: number;
    timestamp: string;
  }>;
  createdAt: string;
  highestBidder?: {
    traderId: string;
    traderName: string;
  };
  payment?: {
    traderId: string;
    paymentId: string;
    timestamp: string;
    status: string;
  };
}

const CROPS_KEY = 'agrotrade:crops';

async function getCrops(): Promise<Crop[]> {
  try {
    const crops = await kv.get<Crop[]>(CROPS_KEY);
    return crops || [];
  } catch {
    return [];
  }
}

async function saveCrops(crops: Crop[]): Promise<void> {
  await kv.set(CROPS_KEY, crops);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const crops = await getCrops();
      return res.json({ success: true, crops });
    } catch (err) {
      const error = err as Error;
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

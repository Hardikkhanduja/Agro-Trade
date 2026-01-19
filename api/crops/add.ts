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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { cropName, quantity, minPrice, location, farmerId, farmerName } = req.body;

    if (!cropName || !quantity || !minPrice || !location || !farmerId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const cropId = `crop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newCrop: Crop = {
      id: cropId,
      cropName,
      quantity: parseFloat(String(quantity)),
      minPrice: parseFloat(String(minPrice)),
      currentPrice: parseFloat(String(minPrice)),
      location,
      farmerId,
      farmerName: farmerName || 'Unknown Farmer',
      status: 'active',
      bids: [],
      createdAt: new Date().toISOString()
    };

    const crops = await getCrops();
    crops.push(newCrop);
    await saveCrops(crops);
    
    return res.json({ success: true, crop: newCrop });
  } catch (err) {
    const error = err as Error;
    return res.status(500).json({ success: false, message: error.message });
  }
}

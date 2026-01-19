import type { VercelRequest, VercelResponse } from '@vercel/node';

// Types
interface Bid {
  id: string;
  traderId: string;
  traderName: string;
  amount: number;
  timestamp: string;
}

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
  bids: Bid[];
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

// In-memory storage (persists within serverless function warm instances)
// For production, use a proper database like MongoDB Atlas, Supabase, or PlanetScale
declare global {
  var cropsData: Crop[] | undefined;
}

function getCrops(): Crop[] {
  if (!global.cropsData) {
    global.cropsData = [];
  }
  return global.cropsData;
}

function saveCrops(crops: Crop[]): void {
  global.cropsData = crops;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    // GET /api/crops - Get all crops
    if (req.method === 'GET' && !action) {
      const crops = getCrops();
      return res.json({ success: true, crops });
    }

    // POST /api/crops?action=add - Add new crop
    if (req.method === 'POST' && action === 'add') {
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

      const crops = getCrops();
      crops.push(newCrop);
      saveCrops(crops);
      
      return res.json({ success: true, crop: newCrop });
    }

    // POST /api/crops?action=bid - Place a bid
    if (req.method === 'POST' && action === 'bid') {
      const { cropId, bidAmount, traderId, traderName } = req.body;
      
      if (!cropId || !bidAmount || !traderId) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      const crops = getCrops();
      const cropIndex = crops.findIndex(c => c.id === cropId);
      
      if (cropIndex === -1) {
        return res.status(404).json({ success: false, message: 'Crop not found' });
      }
      
      const crop = crops[cropIndex];
      
      if (crop.status !== 'active') {
        return res.status(400).json({ success: false, message: 'Auction is closed' });
      }
      
      const bidAmountNum = parseFloat(String(bidAmount));
      if (bidAmountNum <= crop.currentPrice) {
        return res.status(400).json({ success: false, message: `Bid must be higher than current price ₹${crop.currentPrice}` });
      }
      
      const newBid: Bid = {
        id: `bid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        traderId,
        traderName: traderName || 'Unknown Trader',
        amount: bidAmountNum,
        timestamp: new Date().toISOString()
      };
      
      crop.bids.push(newBid);
      crop.currentPrice = bidAmountNum;
      crop.highestBidder = { traderId, traderName: newBid.traderName };
      
      crops[cropIndex] = crop;
      saveCrops(crops);
      
      return res.json({ success: true, bid: newBid, crop });
    }

    // POST /api/crops?action=end - End auction
    if (req.method === 'POST' && action === 'end') {
      const { cropId, farmerId } = req.body;
      
      if (!cropId || !farmerId) {
        return res.status(400).json({ success: false, message: 'Missing cropId or farmerId' });
      }

      const crops = getCrops();
      const cropIndex = crops.findIndex(c => c.id === cropId && c.farmerId === farmerId);
      
      if (cropIndex === -1) {
        return res.status(404).json({ success: false, message: 'Crop not found or not owned by farmer' });
      }
      
      crops[cropIndex].status = 'closed';
      saveCrops(crops);
      
      return res.json({ success: true, message: 'Auction ended successfully' });
    }

    // POST /api/crops?action=payment - Record payment
    if (req.method === 'POST' && action === 'payment') {
      const { cropId, traderId, paymentId } = req.body;
      
      if (!cropId || !traderId || !paymentId) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      const crops = getCrops();
      const cropIndex = crops.findIndex(c => c.id === cropId);
      
      if (cropIndex === -1) {
        return res.status(404).json({ success: false, message: 'Crop not found' });
      }
      
      crops[cropIndex].payment = {
        traderId,
        paymentId,
        timestamp: new Date().toISOString(),
        status: 'completed'
      };
      
      saveCrops(crops);
      
      return res.json({ success: true, message: 'Payment recorded successfully' });
    }

    return res.status(404).json({ success: false, message: 'Route not found' });
  } catch (err) {
    const error = err as Error;
    return res.status(500).json({ success: false, message: error.message });
  }
}

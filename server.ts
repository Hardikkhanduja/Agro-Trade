import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
interface Bid {
  id: string;
  traderId: string;
  traderName: string;
  amount: number;
  timestamp: string;
}

interface HighestBidder {
  traderId: string;
  traderName: string;
}

interface Payment {
  traderId: string;
  paymentId: string;
  timestamp: string;
  status: string;
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
  highestBidder?: HighestBidder;
  payment?: Payment;
}

// Request body types
interface AddCropBody {
  cropName: string;
  quantity: number | string;
  minPrice: number | string;
  location: string;
  farmerId: string;
  farmerName?: string;
}

interface BidBody {
  cropId: string;
  bidAmount: number | string;
  traderId: string;
  traderName?: string;
}

interface EndAuctionBody {
  cropId: string;
  farmerId: string;
}

interface PaymentBody {
  cropId: string;
  traderId: string;
  paymentId: string;
}

const app = express();

app.use(cors());
app.use(express.json());

const CROPS_FILE = path.resolve(__dirname, 'src/data/crops.json');

// Helper function to read crops
const readCrops = (): Crop[] => {
  if (!fs.existsSync(CROPS_FILE)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(CROPS_FILE, 'utf8'));
};

// Helper function to write crops
const writeCrops = (crops: Crop[]): void => {
  fs.writeFileSync(CROPS_FILE, JSON.stringify(crops, null, 2));
};

// Add a new crop
app.post('/api/crops/add', (req: Request<{}, {}, AddCropBody>, res: Response) => {
  try {
    const { cropName, quantity, minPrice, location, farmerId, farmerName } = req.body;

    if (!cropName || !quantity || !minPrice || !location || !farmerId) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
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

    const crops = readCrops();
    crops.push(newCrop);
    writeCrops(crops);
    
    res.json({ success: true, crop: newCrop });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all crops
app.get('/api/crops', (_req: Request, res: Response) => {
  try {
    const crops = readCrops();
    res.json({ success: true, crops });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, message: error.message });
  }
});

// Place a bid
app.post('/api/crops/bid', (req: Request<{}, {}, BidBody>, res: Response) => {
  try {
    const { cropId, bidAmount, traderId, traderName } = req.body;
    
    if (!cropId || !bidAmount || !traderId) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    const crops = readCrops();
    
    if (crops.length === 0) {
      res.status(404).json({ success: false, message: 'No crops found' });
      return;
    }
    
    const cropIndex = crops.findIndex(c => c.id === cropId);
    
    if (cropIndex === -1) {
      res.status(404).json({ success: false, message: 'Crop not found' });
      return;
    }
    
    const crop = crops[cropIndex];
    
    if (crop.status !== 'active') {
      res.status(400).json({ success: false, message: 'Auction is closed' });
      return;
    }
    
    const bidAmountNum = parseFloat(String(bidAmount));
    if (bidAmountNum <= crop.currentPrice) {
      res.status(400).json({ success: false, message: `Bid must be higher than current price ₹${crop.currentPrice}` });
      return;
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
    writeCrops(crops);
    
    res.json({ success: true, bid: newBid, crop });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, message: error.message });
  }
});

// End auction
app.post('/api/crops/end', (req: Request<{}, {}, EndAuctionBody>, res: Response) => {
  try {
    const { cropId, farmerId } = req.body;
    
    if (!cropId || !farmerId) {
      res.status(400).json({ success: false, message: 'Missing cropId or farmerId' });
      return;
    }

    const crops = readCrops();
    
    if (crops.length === 0) {
      res.status(404).json({ success: false, message: 'No crops found' });
      return;
    }
    
    const cropIndex = crops.findIndex(c => c.id === cropId && c.farmerId === farmerId);
    
    if (cropIndex === -1) {
      res.status(404).json({ success: false, message: 'Crop not found or not owned by farmer' });
      return;
    }
    
    crops[cropIndex].status = 'closed';
    writeCrops(crops);
    
    res.json({ success: true, message: 'Auction ended successfully' });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, message: error.message });
  }
});

// Record payment
app.post('/api/crops/payment', (req: Request<{}, {}, PaymentBody>, res: Response) => {
  try {
    const { cropId, traderId, paymentId } = req.body;
    
    if (!cropId || !traderId || !paymentId) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    const crops = readCrops();
    
    if (crops.length === 0) {
      res.status(404).json({ success: false, message: 'No crops found' });
      return;
    }
    
    const cropIndex = crops.findIndex(c => c.id === cropId);
    
    if (cropIndex === -1) {
      res.status(404).json({ success: false, message: 'Crop not found' });
      return;
    }
    
    crops[cropIndex].payment = {
      traderId,
      paymentId,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };
    
    writeCrops(crops);
    
    res.json({ success: true, message: 'Payment recorded successfully' });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;

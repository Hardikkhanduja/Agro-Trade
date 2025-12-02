const fs = require('fs');
const path = require('path');

const CROPS_FILE = path.resolve(__dirname, '../data/crops.json');

const readCrops = () => {
  if (!fs.existsSync(CROPS_FILE)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(CROPS_FILE, 'utf8'));
};

const writeCrops = (crops) => {
  fs.writeFileSync(CROPS_FILE, JSON.stringify(crops, null, 2));
};

const addCrop = (cropData) => {
  const crops = readCrops();
  const cropId = `crop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const auctionEndTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
  
  const newCrop = {
    id: cropId,
    ...cropData,
    currentPrice: cropData.minPrice,
    auctionEndTime: auctionEndTime.toISOString(),
    status: 'active',
    bids: [],
    createdAt: new Date().toISOString()
  };
  
  crops.push(newCrop);
  writeCrops(crops);
  return newCrop;
};

const placeBid = (cropId, bidData) => {
  const crops = readCrops();
  const cropIndex = crops.findIndex(c => c.id === cropId);
  
  if (cropIndex === -1) {
    throw new Error('Crop not found');
  }
  
  const crop = crops[cropIndex];
  
  if (crop.status !== 'active' || new Date(crop.auctionEndTime) <= new Date()) {
    throw new Error('Auction is closed');
  }
  
  if (bidData.amount <= crop.currentPrice) {
    throw new Error(`Bid must be higher than current price ₹${crop.currentPrice}`);
  }
  
  const newBid = {
    id: `bid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...bidData,
    timestamp: new Date().toISOString()
  };
  
  crop.bids.push(newBid);
  crop.currentPrice = bidData.amount;
  crop.highestBidder = { traderId: bidData.traderId, traderName: bidData.traderName };
  
  crops[cropIndex] = crop;
  writeCrops(crops);
  return { bid: newBid, crop };
};

const getCrops = () => {
  const crops = readCrops();
  const now = new Date();
  
  // Update expired auctions
  const updatedCrops = crops.map(crop => {
    if (crop.status === 'active' && new Date(crop.auctionEndTime) <= now) {
      crop.status = 'closed';
    }
    return crop;
  });
  
  writeCrops(updatedCrops);
  return updatedCrops;
};

module.exports = { addCrop, placeBid, getCrops };
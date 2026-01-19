import React, { useState } from 'react';
import { Home, Camera, TrendingUp, Sprout, BookOpen, Mic, DollarSign } from 'lucide-react';
import Sidebar from '../shared/Sidebar';
import Navbar from '../shared/Navbar';

import AddCrop from './AddCrop';
import QuickActions from './QuickActions';
import FeaturePage from './FeaturePage';
import { useLanguage } from '../../contexts/LanguageContext';

// In production (Vercel), use same origin. In dev, use localhost:3001
const API_BASE_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001');

const FarmerDashboard = () => {
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [crops, setCrops] = useState([]);
  const [allCrops, setAllCrops] = useState([]);
  const { t } = useLanguage();
  
  const handleCropAdded = (newCrop) => {
    setCrops([...crops, newCrop]);
    fetchMyCrops();
  };
  
  const fetchMyCrops = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/crops`);
      const data = await response.json();
      if (data.success) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const myCrops = data.crops.filter(crop => crop.farmerId === user.id);
        setAllCrops(myCrops);
      }
    } catch (err) {
      console.error('Failed to fetch crops:', err);
    }
  };
  
  const endAuction = async (cropId) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      console.log('Ending auction for crop:', cropId, 'farmer:', user.id);
      
      const response = await fetch(`${API_BASE_URL}/api/crops/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cropId, farmerId: user.id })
      });
      
      console.log('Response status:', response.status);
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Make sure server is running on port 4000.');
      }
      
      const result = await response.json();
      
      if (response.ok) {
        alert('Auction ended successfully!');
        fetchMyCrops();
      } else {
        alert(result.message || 'Failed to end auction');
      }
    } catch (err) {
      console.error('End auction error:', err);
      alert('Error: ' + err.message);
    }
  };
  
  React.useEffect(() => {
    fetchMyCrops();
  }, []);

  const sidebarItems = [
    { icon: Home, label: t('dashboard'), active: selectedFeature === null, onClick: () => setSelectedFeature(null) },
    { icon: DollarSign, label: t('earnings'), active: selectedFeature === 'earnings', onClick: () => setSelectedFeature('earnings') },
    { icon: Camera, label: t('diseasePredictor'), active: selectedFeature === 'disease-predictor', onClick: () => setSelectedFeature('disease-predictor') },
    { icon: TrendingUp, label: t('marketPredictor'), active: selectedFeature === 'market-predictor', onClick: () => setSelectedFeature('market-predictor') },
    { icon: Sprout, label: t('cropRecommendation'), active: selectedFeature === 'crop-recommendation', onClick: () => setSelectedFeature('crop-recommendation') },
    { icon: BookOpen, label: t('cropGuide'), active: selectedFeature === 'crop-guide', onClick: () => setSelectedFeature('crop-guide') },
    { icon: Mic, label: t('voiceVisionAssistant'), active: selectedFeature === 'voice-vision-assistant', onClick: () => setSelectedFeature('voice-vision-assistant') },
  ];







  if (selectedFeature === 'earnings') {
    const wonAuctions = allCrops.filter(crop => crop.status === 'closed' && crop.highestBidder);
    
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar role="farmer" items={sidebarItems} />
        <div className="ml-64">
          <Navbar />
          <main className="p-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-6">{t('earnings')}</h2>
              {wonAuctions.length === 0 ? (
                <p className="text-gray-500">No completed auctions yet.</p>
              ) : (
                <div className="space-y-4">
                  {wonAuctions.map(crop => (
                    <div key={crop.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-semibold text-lg">{crop.cropName}</div>
                          <div className="text-sm text-gray-600">{crop.quantity}kg × ₹{crop.currentPrice}/kg</div>
                          <div className="text-sm text-gray-600">Buyer: {crop.highestBidder.traderName}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">₹{crop.currentPrice * crop.quantity}</div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            crop.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {crop.paymentStatus === 'completed' ? 'Completed' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    );
  }
  
  if (selectedFeature) {
    return (
      <FeaturePage 
        feature={selectedFeature} 
        onBack={() => setSelectedFeature(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="farmer" items={sidebarItems} />
      
      <div className="ml-64">
        <Navbar />
        
        <main className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <AddCrop onCropAdded={handleCropAdded} />
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">{t('myAuctions')}</h3>
              {allCrops.length === 0 ? (
                <p className="text-gray-500">{t('noAuctions')}</p>
              ) : (
                <div className="space-y-4">
                  {allCrops.map(crop => (
                    <div key={crop.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-semibold text-lg">{crop.cropName}</div>
                          <div className="text-sm text-gray-600">{crop.quantity}kg</div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          crop.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {crop.status === 'active' ? t('active') : t('closed')}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <div className="text-xs text-gray-500">{t('minPrice')}</div>
                          <div className="font-medium">₹{crop.minPrice}/kg</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">{t('currentPrice')}</div>
                          <div className="font-medium">₹{crop.currentPrice}/kg</div>
                        </div>
                      </div>
                      
                      {crop.status === 'closed' && crop.highestBidder ? (
                        <div className="bg-blue-50 p-3 rounded mb-3">
                          <div className="text-sm font-medium text-blue-800">{t('auctionWinner')}</div>
                          <div className="text-sm text-blue-600">{crop.highestBidder.traderName}</div>
                          <div className="text-sm text-blue-600">{t('total')}: ₹{crop.currentPrice * crop.quantity}</div>
                          <div className="text-xs text-blue-500 mt-1">{t('status')}: {crop.payment ? 'Payment Completed' : t('pendingDelivery')}</div>
                        </div>
                      ) : crop.status === 'closed' ? (
                        <div className="bg-gray-50 p-3 rounded mb-3">
                          <div className="text-sm text-gray-600">{t('noBids')}</div>
                        </div>
                      ) : null}
                      
                      {crop.status === 'closed' && crop.payment && (
                        <button
                          onClick={() => alert('Packers/Movers service will be available soon!')}
                          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 font-medium"
                        >
                          Order Packers/Movers
                        </button>
                      )}
                      
                      {crop.status === 'active' && (
                        <button
                          onClick={() => endAuction(crop.id)}
                          className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                        >
                          {t('endAuction')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <QuickActions onFeatureSelect={setSelectedFeature} />
        </main>
      </div>
    </div>
  );
};

export default FarmerDashboard;
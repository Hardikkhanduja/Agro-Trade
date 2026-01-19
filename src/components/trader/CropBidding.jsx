import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

// In production (Vercel), use same origin. In dev, use localhost:3001
const API_BASE_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001');

const CropBidding = () => {
  const [crops, setCrops] = useState([]);
  const [bidAmounts, setBidAmounts] = useState({});
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState(null);

  useEffect(() => {
    fetchCrops();
    const interval = setInterval(fetchCrops, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchCrops = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/crops`);
      const data = await response.json();
      if (data.success) {
        setCrops(data.crops); // Show all crops (active and closed)
      }
    } catch (err) {
      console.error('Failed to fetch crops:', err);
    }
  };



  const placeBid = async (cropId) => {
    const bidAmount = bidAmounts[cropId];
    if (!bidAmount) {
      alert('Please enter a bid amount');
      return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/crops/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cropId,
          bidAmount: parseFloat(bidAmount),
          traderId: user.id,
          traderName: user.name
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        alert('Bid placed successfully!');
        setBidAmounts({...bidAmounts, [cropId]: ''});
        fetchCrops();
      } else {
        alert(result.message || 'Failed to place bid');
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  const handlePayClick = (crop) => {
    setSelectedCrop(crop);
    setShowPaymentPopup(true);
  };

  const savePayment = async (cropId, paymentId) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    try {
      const response = await fetch(`${API_BASE_URL}/api/crops/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cropId, traderId: user.id, paymentId })
      });
      const result = await response.json();
      console.log('Payment saved:', result);
      await fetchCrops();
    } catch (err) {
      console.error('Failed to save payment:', err);
    }
  };

  const handlePaymentOption = (option) => {
    const totalAmount = selectedCrop.currentPrice * selectedCrop.quantity;
    
    if (option === 'RazorPay') {
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: totalAmount * 100,
        currency: 'INR',
        name: 'AgroTrade',
        description: `Payment for ${selectedCrop.cropName} - ${selectedCrop.quantity} kg`,
        handler: async function (response) {
          alert(`Payment successful! Payment ID: ${response.razorpay_payment_id}`);
          await savePayment(selectedCrop.id, response.razorpay_payment_id);
          setShowPaymentPopup(false);
          setSelectedCrop(null);
        },
        prefill: {
          name: JSON.parse(localStorage.getItem('user') || '{}').name || 'Trader',
          email: 'trader@agrotrade.com',
          contact: '9999999999'
        },
        theme: {
          color: '#3B82F6'
        },
        modal: {
          ondismiss: function() {
            setShowPaymentPopup(false);
            setSelectedCrop(null);
          }
        }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.open();
      
    } else {
      alert(`Payment of ₹${totalAmount} initiated via ${option}!`);
      setShowPaymentPopup(false);
      setSelectedCrop(null);
    }
  };

  const handleClosePopup = () => {
    alert('No payment method selected');
    setShowPaymentPopup(false);
    setSelectedCrop(null);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Live Crop Auctions</h2>
      
      {crops.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No active auctions at the moment
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {crops.map((crop) => (
            <div key={crop.id} className="bg-white p-6 rounded-lg shadow-md border">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold">{crop.cropName}</h3>
                <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                  Active
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <p><span className="font-medium">Quantity:</span> {crop.quantity} kg</p>
                <p><span className="font-medium">Location:</span> {crop.location}</p>
                <p><span className="font-medium">Farmer:</span> {crop.farmerName}</p>
                <p><span className="font-medium">Min Price:</span> ₹{crop.minPrice}/kg</p>
                <p><span className="font-medium">Current Price:</span> ₹{crop.currentPrice}/kg</p>
                {crop.highestBidder && (
                  <p><span className="font-medium">Highest Bidder:</span> {crop.highestBidder.traderName}</p>
                )}
              </div>
              
              <div className="mb-4 p-2 bg-green-50 rounded text-sm font-medium text-green-800">
                {crop.status === 'active' ? 'Auction Active' : 'Auction Closed'}
              </div>
              
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder={`Bid higher than ₹${crop.currentPrice}`}
                  value={bidAmounts[crop.id] || ''}
                  onChange={(e) => setBidAmounts({...bidAmounts, [crop.id]: e.target.value})}
                  className="w-full p-2 border rounded-md"
                  min={crop.currentPrice + 0.01}
                  step="0.01"
                />
                {crop.status === 'active' ? (
                  <button
                    onClick={() => placeBid(crop.id)}
                    className="w-full bg-blue-500 text-white font-semibold py-2 rounded-md hover:bg-blue-600"
                  >
                    Place Bid
                  </button>
                ) : (
                  <div className="space-y-2">
                    {crop.highestBidder && crop.highestBidder.traderId === JSON.parse(localStorage.getItem('user') || '{}').id ? (
                      crop.payment ? (
                        <div className="flex gap-2">
                          <button className="flex-1 bg-green-500 text-white font-semibold py-2 rounded-md hover:bg-green-600">
                            Confirm Delivery
                          </button>
                          <button className="flex-1 bg-red-500 text-white font-semibold py-2 rounded-md hover:bg-red-600">
                            Help
                          </button>
                        </div>
                      ) : (
                        <button
                          className="w-full bg-green-500 text-white font-semibold py-2 rounded-md hover:bg-green-600"
                          onClick={() => handlePayClick(crop)}
                        >
                          Pay ₹{crop.currentPrice * crop.quantity}
                        </button>
                      )
                    ) : (
                      <div className="w-full bg-gray-400 text-gray-700 font-semibold py-2 rounded-md text-center">
                        {crop.highestBidder ? `Won by ${crop.highestBidder.traderName}` : 'No Bids'}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {crop.bids.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Recent Bids:</p>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {crop.bids.slice(-3).reverse().map((bid) => (
                      <div key={bid.id} className="text-xs text-gray-600">
                        {bid.traderName}: ₹{bid.amount}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {showPaymentPopup && selectedCrop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Select Payment Method</h3>
              <button
                onClick={handleClosePopup}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600">Amount to pay: ₹{selectedCrop.currentPrice * selectedCrop.quantity}</p>
              <p className="text-sm text-gray-500">For {selectedCrop.cropName} - {selectedCrop.quantity} kg</p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => handlePaymentOption('RazorPay')}
                className="w-full bg-blue-500 text-white font-semibold py-3 rounded-md hover:bg-blue-600 transition-colors"
              >
                Pay with RazorPay
              </button>
              
              <button
                onClick={() => handlePaymentOption('Wallet')}
                className="w-full bg-purple-500 text-white font-semibold py-3 rounded-md hover:bg-purple-600 transition-colors"
              >
                Pay with Wallet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CropBidding;
import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

// In production (Vercel), use same origin. In dev, use localhost:3001
const API_BASE_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001');

const AddCrop = ({ onCropAdded }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    cropName: '',
    quantity: '',
    minPrice: '',
    location: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const cropData = {
      cropName: formData.cropName,
      quantity: parseFloat(formData.quantity),
      minPrice: parseFloat(formData.minPrice),
      location: formData.location,
      farmerId: user.id || 'FARMER001',
      farmerName: user.name || 'Unknown Farmer'
    };

    console.log('Submitting crop data:', cropData);

    try {
      const response = await fetch(`${API_BASE_URL}/api/crops/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cropData)
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Crop added:', result);
        onCropAdded(result.crop);
        setFormData({ cropName: '', quantity: '', minPrice: '', location: '' });
        alert('Crop added successfully!');
      } else {
        const error = await response.json();
        console.error('Server error:', error);
        alert(error.message || 'Failed to add crop');
      }
    } catch (err) {
      console.error('Network error:', err);
      alert('Network error: ' + err.message);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-bold mb-4">{t('addNewCropForAuction')}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('cropName')}</label>
          <input
            type="text"
            value={formData.cropName}
            onChange={(e) => setFormData({...formData, cropName: e.target.value})}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('quantity')}</label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({...formData, quantity: e.target.value})}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('minimumPrice')}</label>
          <input
            type="number"
            value={formData.minPrice}
            onChange={(e) => setFormData({...formData, minPrice: e.target.value})}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('location')}</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-yellow-400 text-gray-900 font-semibold py-2 rounded-md hover:bg-yellow-500"
        >
          {t('startAuction')}
        </button>
      </form>
    </div>
  );
};

export default AddCrop;
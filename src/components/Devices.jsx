import { useState, useEffect } from 'react';
import { FiEdit2, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import './Devices.css';

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [editingDevice, setEditingDevice] = useState(null);
  const [formData, setFormData] = useState({
    device_id: '',
    name: '',
    location: '',
    latitude: '',
    longitude: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Fetch devices on mount and every 30 seconds
  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/devices');
      const data = await response.json();
      setDevices(data);
    } catch (error) {
      console.error('Error fetching devices:', error);
      showMessage('error', 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const isDeviceOnline = (lastSeen) => {
    if (!lastSeen) return false;
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMinutes = (now - lastSeenDate) / 1000 / 60;
    return diffMinutes < 2; // Online if seen within last 2 minutes
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleEdit = (device) => {
    setEditingDevice(device.device_id);
    setFormData({
      device_id: device.device_id,
      name: device.name,
      location: device.location,
      latitude: device.latitude.toString(),
      longitude: device.longitude.toString()
    });
  };

  const handleCancel = () => {
    setEditingDevice(null);
    setFormData({
      device_id: '',
      name: '',
      location: '',
      latitude: '',
      longitude: ''
    });
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name || !formData.location || !formData.latitude || !formData.longitude) {
      showMessage('error', 'All fields are required');
      return;
    }

    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      showMessage('error', 'Invalid coordinates');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      showMessage('error', 'Coordinates out of range');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`http://localhost:5000/api/devices/${editingDevice}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          location: formData.location,
          latitude: lat,
          longitude: lng
        })
      });

      if (response.ok) {
        showMessage('success', 'Device updated successfully');
        fetchDevices();
        handleCancel();
      } else {
        const error = await response.json();
        showMessage('error', error.error || 'Failed to update device');
      }
    } catch (error) {
      console.error('Error updating device:', error);
      showMessage('error', 'Failed to update device');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="devices-container">
        <div className="loading-state">Loading devices...</div>
      </div>
    );
  }

  return (
    <div className="devices-container">
      <div className="devices-header">
        <h2>Device Configuration</h2>
        <p className="devices-subtitle">Configure ESP32 sensor locations in Tupi, South Cotabato</p>
      </div>

      {message.text && (
        <div className={`message-banner ${message.type}`}>
          {message.type === 'success' ? <FiCheck size={14} /> : <FiAlertTriangle size={14} />} {message.text}
        </div>
      )}

      <div className="devices-grid">
        {devices.map((device) => {
          const online = isDeviceOnline(device.last_seen);
          
          return (
          <div key={device.device_id} className="device-card">
            <div className="device-card-header">
              <div className="device-header-left">
                <div className={`device-status ${online ? 'online' : 'offline'}`}>
                  <span className="status-dot"></span>
                  <span className="status-text">{online ? 'Online' : 'Offline'}</span>
                </div>
                <div className="device-id-badge">{device.device_id}</div>
              </div>
              {editingDevice !== device.device_id && (
                <button 
                  className="btn-edit"
                  onClick={() => handleEdit(device)}
                  title="Edit device"
                >
                  <FiEdit2 size={14} />
                  Edit
                </button>
              )}
            </div>

            {editingDevice === device.device_id ? (
              <div className="device-edit-form">
                <div className="form-group">
                  <label>Device Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Tupi Public Market Sensor"
                  />
                </div>

                <div className="form-group">
                  <label>Location Description</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="e.g., Tupi Public Market Area"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={formData.latitude}
                      onChange={(e) => handleInputChange('latitude', e.target.value)}
                      placeholder="6.3316"
                    />
                  </div>

                  <div className="form-group">
                    <label>Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={formData.longitude}
                      onChange={(e) => handleInputChange('longitude', e.target.value)}
                      placeholder="124.9515"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button 
                    className="btn-cancel" 
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-save" 
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="device-info">
                <div className="info-item">
                  <span className="info-label">Name</span>
                  <span className="info-value">{device.name}</span>
                </div>

                <div className="info-item">
                  <span className="info-label">Location</span>
                  <span className="info-value">{device.location}</span>
                </div>

                <div className="info-item">
                  <span className="info-label">Coordinates</span>
                  <span className="info-value coordinates">
                    {device.latitude.toFixed(6)}, {device.longitude.toFixed(6)}
                  </span>
                </div>

                <div className="info-item">
                  <span className="info-label">Last Updated</span>
                  <span className="info-value">
                    {new Date(device.updated_at).toLocaleString()}
                  </span>
                </div>

                {device.last_seen && (
                  <div className="info-item">
                    <span className="info-label">Last Seen</span>
                    <span className="info-value">
                      {new Date(device.last_seen).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
        })}
      </div>

      <div className="devices-help">
        <h3>📍 How to find coordinates:</h3>
        <ol>
          <li>Open <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer">Google Maps</a></li>
          <li>Right-click on the location where your ESP32 is installed</li>
          <li>Click on the coordinates to copy them</li>
          <li>Paste them in the Latitude and Longitude fields above</li>
        </ol>
      </div>
    </div>
  );
};

export default Devices;

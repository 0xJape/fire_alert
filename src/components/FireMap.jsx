import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './FireMap.css'

// Fix for default marker icon issue in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Modern marker icons based on status
const getMarkerIcon = (status) => {
  const colors = {
    Active: { bg: '#ef4444', ring: '#fecaca' },
    Responded: { bg: '#f59e0b', ring: '#fde68a' },
    Resolved: { bg: '#22c55e', ring: '#bbf7d0' }
  }
  const { bg, ring } = colors[status] || colors.Active
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-container">
        <div class="marker-pulse" style="background: ${ring}"></div>
        <div class="marker-point" style="background: ${bg}; border-color: white;">
          <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
            <path d="M12 23c-3.866 0-7-3.134-7-7 0-2.5 1.5-4.5 3-6.5s2.5-4 2.5-6.5c0 0 1.5 2.5 1.5 5 1-0.5 2-2.5 2-5 2.5 3 4.5 5 4.5 8 0 1-0.5 2-1 3 0.5-0.5 1.5-1.5 2-3 1 2 1.5 3.5 1.5 5.5 0 3.866-3.134 7-7 7z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  })
}

// Component to fit bounds when alerts change
const FitBounds = ({ alerts }) => {
  const map = useMap()

  useEffect(() => {
    if (alerts.length > 0) {
      const bounds = alerts.map(alert => [alert.latitude, alert.longitude])
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [alerts, map])

  return null
}

const FireMap = ({ alerts }) => {
  const defaultCenter = [6.331609, 124.951508] // Tupi, South Cotabato, Philippines
  const defaultZoom = 13

  const formatDateTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const activeCount = alerts.filter(a => a.status === 'Active').length
  const respondedCount = alerts.filter(a => a.status === 'Responded').length
  const resolvedCount = alerts.filter(a => a.status === 'Resolved').length

  return (
    <div className="map-wrapper">
      <div className="map-header">
        <div className="map-title">
          <h2>Geographic Overview</h2>
          <span>{alerts.length} locations tracked</span>
        </div>
        <div className="map-legend">
          <div className="legend-item">
            <span className="legend-dot active"></span>
            <span>Active ({activeCount})</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot responded"></span>
            <span>Responded ({respondedCount})</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot resolved"></span>
            <span>Resolved ({resolvedCount})</span>
          </div>
        </div>
      </div>
      
      <div className="map-container">
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
          
          {alerts.length > 0 && <FitBounds alerts={alerts} />}
          
          {alerts.map((alert) => (
            <Marker
              key={alert.id}
              position={[alert.latitude, alert.longitude]}
              icon={getMarkerIcon(alert.status)}
            >
              <Popup className="modern-popup">
                <div className="popup-content">
                  <div className="popup-header">
                    <span className="popup-id">Alert #{alert.id}</span>
                    <span className={`popup-status ${alert.status.toLowerCase()}`}>
                      {alert.status}
                    </span>
                  </div>
                  <div className="popup-body">
                    <div className="popup-row">
                      <span className="popup-label">Location</span>
                      <span className="popup-value">{alert.location}</span>
                    </div>
                    <div className="popup-row">
                      <span className="popup-label">Coordinates</span>
                      <span className="popup-value coords">
                        {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                      </span>
                    </div>
                    <div className="popup-row">
                      <span className="popup-label">Detected</span>
                      <span className="popup-value">{formatDateTime(alert.created_at)}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}

export default FireMap

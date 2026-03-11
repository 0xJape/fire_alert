import { useState, useEffect, useRef } from 'react'
import { api, AlertWebSocket } from './apiClient'
import { HiOutlineFire } from 'react-icons/hi2'
import { FiVolumeX, FiX } from 'react-icons/fi'
import Dashboard from './components/Dashboard'
import FireMap from './components/FireMap'
import Devices from './components/Devices'
import './App.css'

function App() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const [alertPopup, setAlertPopup] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false)
  const wsRef = useRef(null)
  const alarmIntervalRef = useRef(null)
  const audioContextRef = useRef(null)

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch all alerts
  const fetchAlerts = async () => {
    try {
      const data = await api.getAllAlerts()
      setAlerts(data || [])
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  // Play alert alarm sound (loops until stopped)
  const playNotificationSound = () => {
    try {
      // Stop any existing alarm first
      stopAlarmSound()
      
      // Create audio context
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      
      const playAlarmCycle = () => {
        if (!audioContextRef.current) return
        
        const audioContext = audioContextRef.current
        const now = audioContext.currentTime
        
        // Create siren sound
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.type = 'square'
        
        // Siren effect - oscillate between two frequencies
        oscillator.frequency.setValueAtTime(800, now)
        oscillator.frequency.linearRampToValueAtTime(1000, now + 0.4)
        oscillator.frequency.linearRampToValueAtTime(800, now + 0.8)
        
        // Volume envelope
        gainNode.gain.setValueAtTime(0, now)
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05)
        gainNode.gain.setValueAtTime(0.3, now + 0.75)
        gainNode.gain.linearRampToValueAtTime(0, now + 0.8)
        
        oscillator.start(now)
        oscillator.stop(now + 0.8)
      }
      
      // Play first cycle immediately
      playAlarmCycle()
      
      // Then loop every 1 second
      alarmIntervalRef.current = setInterval(() => {
        playAlarmCycle()
      }, 1000)
      
    } catch (error) {
      console.error('Error playing alarm sound:', error)
    }
  }

  // Stop the alarm sound
  const stopAlarmSound = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current)
      alarmIntervalRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    setIsAlarmPlaying(false)
  }

  // Show notification
  const showNotification = (title, message) => {
    setNotification({ title, message })
    setTimeout(() => setNotification(null), 5000)
  }

  // Subscribe to real-time changes via WebSocket
  useEffect(() => {
    fetchAlerts()

    wsRef.current = new AlertWebSocket()
    wsRef.current.connect()

    const unsubscribe = wsRef.current.subscribe((message) => {
      console.log('WebSocket message received:', message)

      if (message.event === 'INSERT') {
        setAlerts((current) => [message.data, ...current])
        // Only show popup for Active alerts
        if (message.data.status === 'Active') {
          setAlertPopup(message.data)
        }
        showNotification('New Fire Alert', `Fire detected at ${message.data.location}`)
        playNotificationSound()
      } else if (message.event === 'UPDATE') {
        setAlerts((current) => {
          const updatedAlerts = current.map((alert) =>
            alert.id === message.data.id ? message.data : alert
          )
          
          // Stop alarm if no more active alerts
          const hasActiveAlerts = updatedAlerts.some(a => a.status === 'Active')
          if (!hasActiveAlerts) {
            stopAlarmSound()
          }
          
          return updatedAlerts
        })
        
        // Close popup if this alert was resolved
        if (alertPopup && alertPopup.id === message.data.id && message.data.status === 'Resolved') {
          setAlertPopup(null)
        }
        showNotification('Alert Updated', `Alert #${message.data.id} status changed to ${message.data.status}`)
      } else if (message.event === 'DELETE') {
        setAlerts((current) => {
          const remainingAlerts = current.filter((alert) => alert.id !== message.data.id)
          
          // Stop alarm if no more active alerts
          const hasActiveAlerts = remainingAlerts.some(a => a.status === 'Active')
          if (!hasActiveAlerts) {
            stopAlarmSound()
          }
          
          return remainingAlerts
        })
        
        // Close popup if this alert was deleted
        if (alertPopup && alertPopup.id === message.data.id) {
          setAlertPopup(null)
        }
        showNotification('Alert Removed', `Alert #${message.data.id} has been deleted`)
      }
    })

    return () => {
      unsubscribe()
      stopAlarmSound()
      if (wsRef.current) {
        wsRef.current.disconnect()
      }
    }
  }, [])

  const handleStatusUpdate = () => {
    fetchAlerts()
  }

  const handleResolveAlert = async (alertId) => {
    try {
      await api.updateAlertStatus(alertId, 'Resolved')
      
      // Check if there will be any active alerts remaining after this one is resolved
      const remainingActiveAlerts = alerts.filter(a => a.status === 'Active' && a.id !== alertId)
      if (remainingActiveAlerts.length === 0) {
        stopAlarmSound()
      }
      
      // Update will come through WebSocket, which will close the popup
    } catch (error) {
      console.error('Error resolving alert:', error)
      showNotification('Error', 'Failed to resolve alert')
    }
  }

  const activeAlerts = alerts.filter(a => a.status === 'Active').length

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Initializing monitoring system...</p>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Flashing alert border when modal is closed but alerts are active */}
      {!alertPopup && activeAlerts > 0 && (
        <>
          <div className="alert-border-flash"></div>
          <div className="floating-alert-badge" onClick={() => {
            // Re-open the most recent alert (alarm continues playing)
            const recentAlert = alerts.find(a => a.status === 'Active')
            if (recentAlert) {
              setAlertPopup(recentAlert)
            }
          }}>
            <div className="floating-alert-icon"><HiOutlineFire size={24} /></div>
            <div className="floating-alert-count">{activeAlerts}</div>
            <div className="floating-alert-text">Active Alert{activeAlerts > 1 ? 's' : ''}</div>
          </div>
        </>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-icon"><HiOutlineFire size={24} /></div>
          <div className="brand-text">
            <h1>FlameAlert</h1>
            <span>Fire Monitoring System</span>
          </div>
        </div>
        <div className="header-status">
          {activeAlerts > 0 && (
            <div className="active-alert-indicator">
              <span className="alert-pulse"></span>
              <span className="alert-text">{activeAlerts} Active Alert{activeAlerts > 1 ? 's' : ''}</span>
            </div>
          )}
          {isAlarmPlaying && (
            <button className="header-mute-btn" onClick={stopAlarmSound} title="Mute alarm">
              <FiVolumeX size={18} />
              Mute Alarm
            </button>
          )}
          <div className="connection-status">
            <span className="status-indicator"></span>
            <span>System Online</span>
          </div>
          <span className="current-time">
            {currentTime.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
            })}
          </span>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        <button 
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`nav-tab ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          Alert History
          {activeAlerts > 0 && (
            <span style={{
              marginLeft: '0.375rem',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              fontSize: '0.6875rem',
              padding: '0.125rem 0.5rem',
              borderRadius: '9999px',
              fontWeight: '700',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              {activeAlerts}
            </span>
          )}
        </button>
        <button 
          className={`nav-tab ${activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => setActiveTab('devices')}
        >
          Devices
        </button>
      </nav>

      {/* Main Content */}
      <main className="app-main">
        {activeTab === 'dashboard' && (
          <div className="dashboard-view">
            {/* Stats Row */}
            <div className="stats-row">
              <Dashboard alerts={alerts} onStatusUpdate={handleStatusUpdate} view="stats" />
            </div>
            
            {/* Main Grid: Map + Sidebar */}
            <div className="main-grid">
              <div className="map-panel">
                <FireMap alerts={alerts} />
              </div>
              <div className="sidebar-panel">
                <Dashboard alerts={alerts} onStatusUpdate={handleStatusUpdate} view="sidebar" />
              </div>
            </div>
          </div>
        )}
        {activeTab === 'alerts' && (
          <Dashboard alerts={alerts} onStatusUpdate={handleStatusUpdate} view="table" />
        )}
        {activeTab === 'devices' && (
          <Devices />
        )}
      </main>

      {/* Fire Alert Popup Modal */}
      {alertPopup && (
        <div className="alert-modal-overlay" onClick={(e) => {
          // Don't close when clicking on the modal itself
          if (e.target === e.currentTarget) {
            console.log('Clicked overlay background - modal stays open')
          }
        }}>
          <div className="alert-modal" onClick={(e) => e.stopPropagation()}>
            <div className="alert-modal-header">
              <button 
                className="mute-alarm-btn"
                onClick={stopAlarmSound}
                title="Mute alarm sound"
              >
                <FiVolumeX size={16} /> Mute
              </button>
              <div className="alert-modal-icon">
                <HiOutlineFire size={32} />
              </div>
              <h2>🚨 FIRE DETECTED</h2>
              <p>Immediate attention required</p>
            </div>
            
            <div className="alert-modal-body">
              <div className="alert-modal-info">
                <div className="alert-modal-row">
                  <span className="alert-modal-label">Alert ID</span>
                  <span className="alert-modal-value">#{alertPopup.id}</span>
                </div>
                <div className="alert-modal-row">
                  <span className="alert-modal-label">Location</span>
                  <span className="alert-modal-value">{alertPopup.location}</span>
                </div>
                <div className="alert-modal-row">
                  <span className="alert-modal-label">Device</span>
                  <span className="alert-modal-value">{alertPopup.device_id}</span>
                </div>
                <div className="alert-modal-row">
                  <span className="alert-modal-label">Coordinates</span>
                  <span className="alert-modal-value coords">
                    {alertPopup.latitude.toFixed(6)}, {alertPopup.longitude.toFixed(6)}
                  </span>
                </div>
                <div className="alert-modal-row">
                  <span className="alert-modal-label">Time Detected</span>
                  <span className="alert-modal-value">
                    {new Date(alertPopup.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="alert-modal-footer">
              <button 
                type="button"
                className="btn-modal-view"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('View on Map clicked')
                  setAlertPopup(null)
                  setActiveTab('dashboard')
                }}
              >
                View on Map
              </button>
              <button 
                type="button"
                className="btn-modal-resolve"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('Resolve clicked')
                  handleResolveAlert(alertPopup.id)
                }}
              >
                Mark as Resolved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className="notification">
          <div className="notification-icon"><HiOutlineFire size={20} /></div>
          <div className="notification-content">
            <strong>{notification.title}</strong>
            <span>{notification.message}</span>
          </div>
          <button className="notification-close" onClick={() => setNotification(null)}>
            <FiX size={16} />
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <p>FlameAlert - Fire Monitoring System</p>
        <p>Capstone Demo Project • Real-time IoT Monitoring</p>
      </footer>
    </div>
  )
}

export default App

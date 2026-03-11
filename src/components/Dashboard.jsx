import React from 'react'
import { api } from '../apiClient'
import { HiOutlineFire } from 'react-icons/hi2'
import { FiCheck, FiClock, FiActivity, FiMapPin } from 'react-icons/fi'
import './Dashboard.css'

const Dashboard = ({ alerts, onStatusUpdate, view = 'overview' }) => {
  const activeAlerts = alerts.filter(alert => alert.status === 'Active')
  const respondedAlerts = alerts.filter(alert => alert.status === 'Responded')
  const resolvedAlerts = alerts.filter(alert => alert.status === 'Resolved')

  const handleStatusChange = async (alertId, newStatus) => {
    try {
      await api.updateAlertStatus(alertId, newStatus)
      onStatusUpdate()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update alert status. Please try again.')
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimeSince = (dateString) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'Just now'
  }

  // Stats View - Just the stats cards
  if (view === 'stats') {
    return (
      <div className="stats-grid">
        <div className="stat-card stat-active">
          <div className="stat-icon"><HiOutlineFire size={22} /></div>
          <div className="stat-info">
            <span className="stat-label">Active Alerts</span>
            <span className="stat-value">{activeAlerts.length}</span>
          </div>
          <div className="stat-indicator active"></div>
        </div>

        <div className="stat-card stat-responded">
          <div className="stat-icon"><FiClock size={22} /></div>
          <div className="stat-info">
            <span className="stat-label">Responded</span>
            <span className="stat-value">{respondedAlerts.length}</span>
          </div>
          <div className="stat-indicator responded"></div>
        </div>

        <div className="stat-card stat-resolved">
          <div className="stat-icon"><FiCheck size={22} /></div>
          <div className="stat-info">
            <span className="stat-label">Resolved</span>
            <span className="stat-value">{resolvedAlerts.length}</span>
          </div>
          <div className="stat-indicator resolved"></div>
        </div>

        <div className="stat-card stat-total">
          <div className="stat-icon"><FiActivity size={22} /></div>
          <div className="stat-info">
            <span className="stat-label">Total Alerts</span>
            <span className="stat-value">{alerts.length}</span>
          </div>
        </div>
      </div>
    )
  }

  // Sidebar View - Active Alerts + Recent Activity
  if (view === 'sidebar') {
    return (
      <div className="sidebar-content">
        {/* Active Alerts Section */}
        <div className="section sidebar-section">
          <div className="section-header">
            <h2>Active Alerts</h2>
            {activeAlerts.length > 0 && (
              <span className="badge badge-danger">{activeAlerts.length}</span>
            )}
          </div>
          <div className="sidebar-alerts">
            {activeAlerts.length === 0 ? (
              <div className="empty-state-compact">
                <span className="check-icon"><FiCheck size={18} /></span>
                <p>No active alerts</p>
              </div>
            ) : (
              activeAlerts.map((alert) => (
                <div key={alert.id} className="sidebar-alert-card">
                  <div className="sidebar-alert-header">
                    <span className="alert-id">#{alert.id}</span>
                    <span className="alert-time">{getTimeSince(alert.created_at)}</span>
                  </div>
                  <div className="sidebar-alert-location">
                    <span className="location-icon"><FiMapPin size={14} /></span>
                    <span>{alert.location}</span>
                  </div>
                  <div className="sidebar-alert-actions">
                    <button 
                      className="btn btn-sm btn-warning"
                      onClick={() => handleStatusChange(alert.id, 'Responded')}
                    >
                      Respond
                    </button>
                    <button 
                      className="btn btn-sm btn-success"
                      onClick={() => handleStatusChange(alert.id, 'Resolved')}
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="section sidebar-section">
          <div className="section-header">
            <h2>Recent Activity</h2>
          </div>
          <div className="activity-list">
            {alerts.slice(0, 6).map((alert) => (
              <div key={alert.id} className="activity-item">
                <div className={`activity-indicator ${alert.status.toLowerCase()}`}></div>
                <div className="activity-content">
                  <div className="activity-title">
                    <span className="activity-location">{alert.location}</span>
                    <span className={`status-badge status-${alert.status.toLowerCase()}`}>
                      {alert.status}
                    </span>
                  </div>
                  <div className="activity-meta">
                    <span>{getTimeSince(alert.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="empty-state-compact">
                <p>No activity yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Table View (Alert History)
  return (
    <div className="dashboard">
      <div className="section">
        <div className="section-header">
          <h2>Alert History</h2>
          <span className="badge">{alerts.length} total records</span>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Location</th>
                <th>Coordinates</th>
                <th>Status</th>
                <th>Date & Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">
                      <p>No alerts found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>
                      <span className="table-id">#{alert.id}</span>
                    </td>
                    <td>
                      <div className="table-location">
                        <span className="location-name">{alert.location}</span>
                      </div>
                    </td>
                    <td>
                      <span className="table-coords">
                        {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${alert.status.toLowerCase()}`}>
                        {alert.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-datetime">
                        <span className="date">{formatDate(alert.created_at)}</span>
                        <span className="time">{formatTime(alert.created_at)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="table-actions">
                        {alert.status === 'Active' && (
                          <>
                            <button
                              className="btn btn-sm btn-warning"
                              onClick={() => handleStatusChange(alert.id, 'Responded')}
                            >
                              Respond
                            </button>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleStatusChange(alert.id, 'Resolved')}
                            >
                              Resolve
                            </button>
                          </>
                        )}
                        {alert.status === 'Responded' && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleStatusChange(alert.id, 'Resolved')}
                          >
                            Resolve
                          </button>
                        )}
                        {alert.status === 'Resolved' && (
                          <span className="completed-text">Completed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

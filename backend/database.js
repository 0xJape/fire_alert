const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, 'fire_alerts.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('✅ Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database schema
function initializeDatabase() {
  // Create fire_alerts table
  db.run(`
    CREATE TABLE IF NOT EXISTS fire_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Responded', 'Resolved')),
      device_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating fire_alerts table:', err);
    } else {
      console.log('✅ fire_alerts table ready');
      
      // Check if we have any data, if not add sample data
      db.get('SELECT COUNT(*) as count FROM fire_alerts', (err, row) => {
        if (!err && row.count === 0) {
          console.log('Adding sample fire alert data...');
          insertSampleData();
        }
      });
    }
  });

  // Create devices table
  db.run(`
    CREATE TABLE IF NOT EXISTS devices (
      device_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      last_seen DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating devices table:', err);
    } else {
      console.log('✅ devices table ready');
      
      // Add last_seen column if it doesn't exist (migration)
      db.run(`ALTER TABLE devices ADD COLUMN last_seen DATETIME`, (err) => {
        // Ignore error if column already exists
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding last_seen column:', err);
        }
      });
      
      // Check if we have any devices, if not add defaults
      db.get('SELECT COUNT(*) as count FROM devices', (err, row) => {
        if (!err && row.count === 0) {
          console.log('Adding default device configurations...');
          insertDefaultDevices();
        }
      });
    }
  });
}

// Insert sample data
function insertSampleData() {
  const sampleData = [
    ['Tupi Public Market Area', 6.3316, 124.9515, 'Active', 'DEV001'],
    ['Tupi Municipal Hall', 6.3305, 124.9520, 'Resolved', 'DEV002']
  ];

  const stmt = db.prepare(`
    INSERT INTO fire_alerts (location, latitude, longitude, status, device_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  sampleData.forEach(data => {
    stmt.run(data);
  });

  stmt.finalize(() => {
    console.log('✅ Sample fire alert data inserted');
  });
}

// Insert default device configurations
function insertDefaultDevices() {
  const defaultDevices = [
    ['DEV001', 'Tupi Public Market Sensor', 'Tupi Public Market Area', 6.3316, 124.9515],
    ['DEV002', 'Municipal Hall Sensor', 'Tupi Municipal Hall', 6.3305, 124.9520]
  ];

  const stmt = db.prepare(`
    INSERT INTO devices (device_id, name, location, latitude, longitude)
    VALUES (?, ?, ?, ?, ?)
  `);

  defaultDevices.forEach(data => {
    stmt.run(data);
  });

  stmt.finalize(() => {
    console.log('✅ Default device configurations inserted');
  });
}

// Database query functions
const dbFunctions = {
  // Get all alerts
  getAllAlerts: (callback) => {
    db.all('SELECT * FROM fire_alerts ORDER BY created_at DESC', callback);
  },

  // Get alert by ID
  getAlertById: (id, callback) => {
    db.get('SELECT * FROM fire_alerts WHERE id = ?', [id], callback);
  },

  // Create new alert
  createAlert: (location, latitude, longitude, deviceId, callback) => {
    db.run(
      `INSERT INTO fire_alerts (location, latitude, longitude, device_id, status)
       VALUES (?, ?, ?, ?, 'Active')`,
      [location, latitude, longitude, deviceId],
      function(err) {
        if (callback) {
          callback(err, this);
        }
      }
    );
  },

  // Update alert status
  updateAlertStatus: (id, status, callback) => {
    db.run(
      'UPDATE fire_alerts SET status = ? WHERE id = ?',
      [status, id],
      callback
    );
  },

  // Delete alert
  deleteAlert: (id, callback) => {
    db.run('DELETE FROM fire_alerts WHERE id = ?', [id], callback);
  },

  // Get alerts by device ID
  getAlertsByDevice: (deviceId, callback) => {
    db.all(
      'SELECT * FROM fire_alerts WHERE device_id = ? ORDER BY created_at DESC',
      [deviceId],
      callback
    );
  },

  // Get active alert by device ID
  getActiveAlertByDevice: (deviceId, callback) => {
    db.get(
      `SELECT * FROM fire_alerts 
       WHERE device_id = ? AND status = 'Active' 
       ORDER BY created_at DESC LIMIT 1`,
      [deviceId],
      callback
    );
  },

  // Get statistics
  getStatistics: (callback) => {
    db.get(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'Responded' THEN 1 ELSE 0 END) as responded,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved
       FROM fire_alerts`,
      callback
    );
  },

  // ============== DEVICE MANAGEMENT ==============

  // Get all devices
  getAllDevices: (callback) => {
    db.all('SELECT * FROM devices ORDER BY device_id', callback);
  },

  // Get device by ID
  getDeviceById: (deviceId, callback) => {
    db.get('SELECT * FROM devices WHERE device_id = ?', [deviceId], callback);
  },

  // Create new device
  createDevice: (deviceId, name, location, latitude, longitude, callback) => {
    db.run(
      `INSERT INTO devices (device_id, name, location, latitude, longitude)
       VALUES (?, ?, ?, ?, ?)`,
      [deviceId, name, location, latitude, longitude],
      callback
    );
  },

  // Update device
  updateDevice: (deviceId, name, location, latitude, longitude, callback) => {
    db.run(
      `UPDATE devices 
       SET name = ?, location = ?, latitude = ?, longitude = ?, updated_at = CURRENT_TIMESTAMP
       WHERE device_id = ?`,
      [name, location, latitude, longitude, deviceId],
      callback
    );
  },

  // Delete device
  deleteDevice: (deviceId, callback) => {
    db.run('DELETE FROM devices WHERE device_id = ?', [deviceId], callback);
  },

  // Update device last seen timestamp
  updateDeviceLastSeen: (deviceId, callback) => {
    db.run(
      `UPDATE devices SET last_seen = CURRENT_TIMESTAMP WHERE device_id = ?`,
      [deviceId],
      callback
    );
  }
};

module.exports = { db, dbFunctions };

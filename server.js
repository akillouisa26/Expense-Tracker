const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dns = require('dns');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

// Use reliable public DNS (Google & Cloudflare) to prevent Windows / ISP querySrv ECONNREFUSED
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  console.warn('[DNS Notice] Could not set custom DNS servers:', e.message);
}

const app = express();
const PORT = process.env.PORT || 3000;
const DB_NAME = process.env.DB_NAME || 'expense_tracker';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend assets
app.use(express.static(__dirname));

let mongoClient = null;
let db = null;
let isConnected = false;
let connectionError = null;

// Mask URI for safe UI display (e.g. mongodb+srv://user:****@cluster.mongodb.net)
function maskUri(uri) {
  if (!uri) return '';
  return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.+)/i, '$1••••••••$3');
}

// Connect to MongoDB Atlas
async function connectToMongo(uri) {
  const targetUri = uri || process.env.MONGODB_URI;
  if (!targetUri || !targetUri.trim()) {
    isConnected = false;
    connectionError = 'No MongoDB URI configured';
    return { success: false, message: connectionError };
  }

  try {
    if (mongoClient) {
      try { await mongoClient.close(); } catch (e) {}
    }

    mongoClient = new MongoClient(targetUri.trim(), {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
      },
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    await mongoClient.connect();
    // Ping to verify connection
    await mongoClient.db(DB_NAME).command({ ping: 1 });

    db = mongoClient.db(DB_NAME);
    isConnected = true;
    connectionError = null;

    // Create indexes for efficient querying
    await db.collection('transactions').createIndex({ id: 1 }, { unique: true });
    await db.collection('categories').createIndex({ id: 1 }, { unique: true });
    await db.collection('savings_vault').createIndex({ id: 1 }, { unique: true });
    await db.collection('personal_notes').createIndex({ id: 1 }, { unique: true });

    console.log(`[MongoDB] Connected successfully to database "${DB_NAME}"`);
    return { success: true, message: `Connected to MongoDB database "${DB_NAME}"` };
  } catch (err) {
    console.error('[MongoDB Connection Error]:', err.message);
    isConnected = false;
    db = null;
    connectionError = err.message;
    return { success: false, message: err.message };
  }
}

// Save URI to .env file
function saveUriToEnv(newUri) {
  try {
    const envPath = path.join(__dirname, '.env');
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
      if (/^MONGODB_URI=/m.test(content)) {
        content = content.replace(/^MONGODB_URI=.*$/m, `MONGODB_URI=${newUri}`);
      } else {
        content += `\nMONGODB_URI=${newUri}\n`;
      }
    } else {
      content = `PORT=3000\nDB_NAME=expense_tracker\nMONGODB_URI=${newUri}\n`;
    }
    fs.writeFileSync(envPath, content, 'utf8');
    process.env.MONGODB_URI = newUri;
  } catch (err) {
    console.error('Error saving .env file:', err);
  }
}

// Auto-connect middleware for serverless execution (e.g. Vercel)
app.use(async (req, res, next) => {
  if (!isConnected && process.env.MONGODB_URI) {
    try {
      await connectToMongo(process.env.MONGODB_URI);
    } catch (e) {
      console.warn('[MongoDB Serverless Connect Note]:', e.message);
    }
  }
  next();
});

// ============================================================================
// API ROUTES
// ============================================================================

// 1. Status & Health Check
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    connected: isConnected,
    dbName: DB_NAME,
    maskedUri: maskUri(process.env.MONGODB_URI),
    error: connectionError
  });
});

// 2. Update MongoDB Connection String from UI
app.post('/api/config', async (req, res) => {
  const { uri } = req.body;
  if (!uri || !uri.trim()) {
    return res.status(400).json({ success: false, message: 'Please provide a valid MongoDB connection string' });
  }

  const result = await connectToMongo(uri.trim());
  if (result.success) {
    saveUriToEnv(uri.trim());
    return res.json({ success: true, message: 'Successfully connected to MongoDB Atlas & saved configuration!' });
  } else {
    return res.status(400).json({ success: false, message: `Connection failed: ${result.message}` });
  }
});

// 3. Migrate local/Firestore data directly into MongoDB (Zero Data Loss)
app.post('/api/migrate', async (req, res) => {
  if (!isConnected || !db) {
    return res.status(503).json({ success: false, message: 'MongoDB is not connected. Configure connection first.' });
  }

  try {
    const {
      segregations = [],
      transactions = [],
      savingsVault = [],
      personalNotes = [],
      securitySettings = {},
      deletedIds = []
    } = req.body;

    const results = {
      transactions: 0,
      categories: 0,
      savingsVault: 0,
      personalNotes: 0
    };

    // 1. Migrate Categories
    if (Array.isArray(segregations) && segregations.length > 0) {
      const ops = segregations.map(s => ({
        updateOne: {
          filter: { id: s.id },
          update: { $set: { ...s, _id: s.id, updatedAt: s.updatedAt || Date.now() } },
          upsert: true
        }
      }));
      const r = await db.collection('categories').bulkWrite(ops);
      results.categories = (r.upsertedCount || 0) + (r.modifiedCount || 0);
    }

    // 2. Migrate Transactions
    if (Array.isArray(transactions) && transactions.length > 0) {
      const ops = transactions.map(t => ({
        updateOne: {
          filter: { id: t.id },
          update: { $set: { ...t, _id: t.id, updatedAt: t.updatedAt || Date.now() } },
          upsert: true
        }
      }));
      const r = await db.collection('transactions').bulkWrite(ops);
      results.transactions = (r.upsertedCount || 0) + (r.modifiedCount || 0);
    }

    // 3. Migrate Savings Vault
    if (Array.isArray(savingsVault) && savingsVault.length > 0) {
      const ops = savingsVault.map(s => ({
        updateOne: {
          filter: { id: s.id },
          update: { $set: { ...s, _id: s.id, updatedAt: s.updatedAt || Date.now() } },
          upsert: true
        }
      }));
      const r = await db.collection('savings_vault').bulkWrite(ops);
      results.savingsVault = (r.upsertedCount || 0) + (r.modifiedCount || 0);
    }

    // 4. Migrate Personal Notes
    if (Array.isArray(personalNotes) && personalNotes.length > 0) {
      const ops = personalNotes.map(n => ({
        updateOne: {
          filter: { id: n.id },
          update: { $set: { ...n, _id: n.id, updatedAt: n.updatedAt || Date.now() } },
          upsert: true
        }
      }));
      const r = await db.collection('personal_notes').bulkWrite(ops);
      results.personalNotes = (r.upsertedCount || 0) + (r.modifiedCount || 0);
    }

    // 5. Migrate Metadata (Settings & Tombstones)
    await db.collection('metadata').updateOne(
      { _id: 'app_settings' },
      {
        $set: {
          _id: 'app_settings',
          securitySettings,
          deletedIds: Array.isArray(deletedIds) ? deletedIds : [],
          migratedAt: new Date().toISOString(),
          lastUpdatedTimestamp: Date.now()
        }
      },
      { upsert: true }
    );

    console.log(`[MongoDB Migration] Success: ${results.transactions} txs, ${results.categories} categories migrated.`);
    res.json({
      success: true,
      message: 'All data successfully migrated to MongoDB with zero data loss!',
      counts: results
    });
  } catch (err) {
    console.error('[MongoDB Migration Error]:', err);
    res.status(500).json({ success: false, message: `Migration error: ${err.message}` });
  }
});

// 4. Get Entire Ledger from MongoDB
app.get('/api/ledger', async (req, res) => {
  if (!isConnected || !db) {
    return res.status(503).json({ success: false, message: 'MongoDB not connected' });
  }

  try {
    const [categories, transactions, savingsVault, personalNotes, meta] = await Promise.all([
      db.collection('categories').find({}).toArray(),
      db.collection('transactions').find({}).toArray(),
      db.collection('savings_vault').find({}).toArray(),
      db.collection('personal_notes').find({}).toArray(),
      db.collection('metadata').findOne({ _id: 'app_settings' })
    ]);

    // Clean MongoDB internal _id field
    const clean = arr => arr.map(doc => {
      const { _id, ...rest } = doc;
      return { ...rest, id: rest.id || _id };
    });

    res.json({
      success: true,
      segregations: clean(categories),
      transactions: clean(transactions),
      savingsVault: clean(savingsVault),
      personalNotes: clean(personalNotes),
      securitySettings: meta ? meta.securitySettings : null,
      deletedIds: meta ? (meta.deletedIds || []) : [],
      lastUpdated: meta ? meta.lastUpdatedTimestamp : 0
    });
  } catch (err) {
    console.error('[MongoDB Get Ledger Error]:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Synchronize State to MongoDB
app.post('/api/ledger/sync', async (req, res) => {
  if (!isConnected || !db) {
    return res.status(503).json({ success: false, message: 'MongoDB not connected' });
  }

  try {
    const {
      segregations = [],
      transactions = [],
      savingsVault = [],
      personalNotes = [],
      securitySettings,
      deletedIds = [],
      lastUpdatedTimestamp = Date.now()
    } = req.body;

    const delSet = new Set(Array.isArray(deletedIds) ? deletedIds : []);

    // 1. Update Categories
    if (Array.isArray(segregations)) {
      const activeSegs = segregations.filter(s => !delSet.has(s.id));
      if (activeSegs.length > 0) {
        const ops = activeSegs.map(s => ({
          updateOne: {
            filter: { id: s.id },
            update: { $set: { ...s, _id: s.id, updatedAt: s.updatedAt || Date.now() } },
            upsert: true
          }
        }));
        await db.collection('categories').bulkWrite(ops);
      }
      if (delSet.size > 0) {
        await db.collection('categories').deleteMany({ id: { $in: Array.from(delSet) } });
      }
    }

    // 2. Update Transactions
    if (Array.isArray(transactions)) {
      const activeTxs = transactions.filter(t => !delSet.has(t.id));
      if (activeTxs.length > 0) {
        const ops = activeTxs.map(t => ({
          updateOne: {
            filter: { id: t.id },
            update: { $set: { ...t, _id: t.id, updatedAt: t.updatedAt || Date.now() } },
            upsert: true
          }
        }));
        await db.collection('transactions').bulkWrite(ops);
      }
      if (delSet.size > 0) {
        await db.collection('transactions').deleteMany({ id: { $in: Array.from(delSet) } });
      }
    }

    // 3. Update Savings Vault
    if (Array.isArray(savingsVault)) {
      const activeSav = savingsVault.filter(s => !delSet.has(s.id));
      if (activeSav.length > 0) {
        const ops = activeSav.map(s => ({
          updateOne: {
            filter: { id: s.id },
            update: { $set: { ...s, _id: s.id, updatedAt: s.updatedAt || Date.now() } },
            upsert: true
          }
        }));
        await db.collection('savings_vault').bulkWrite(ops);
      }
      if (delSet.size > 0) {
        await db.collection('savings_vault').deleteMany({ id: { $in: Array.from(delSet) } });
      }
    }

    // 4. Update Personal Notes
    if (Array.isArray(personalNotes)) {
      const activeNotes = personalNotes.filter(n => !delSet.has(n.id));
      if (activeNotes.length > 0) {
        const ops = activeNotes.map(n => ({
          updateOne: {
            filter: { id: n.id },
            update: { $set: { ...n, _id: n.id, updatedAt: n.updatedAt || Date.now() } },
            upsert: true
          }
        }));
        await db.collection('personal_notes').bulkWrite(ops);
      }
      if (delSet.size > 0) {
        await db.collection('personal_notes').deleteMany({ id: { $in: Array.from(delSet) } });
      }
    }

    // 5. Update Metadata
    const metaUpdate = {
      _id: 'app_settings',
      deletedIds: Array.from(delSet),
      lastUpdatedTimestamp,
      lastUpdated: new Date().toISOString()
    };
    if (securitySettings) {
      metaUpdate.securitySettings = securitySettings;
    }

    await db.collection('metadata').updateOne(
      { _id: 'app_settings' },
      { $set: metaUpdate },
      { upsert: true }
    );

    res.json({
      success: true,
      lastUpdated: new Date().toISOString(),
      timestamp: lastUpdatedTimestamp
    });
  } catch (err) {
    console.error('[MongoDB Sync Error]:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Complete JSON Database Backup (Download)
app.get('/api/backup', async (req, res) => {
  if (!isConnected || !db) {
    return res.status(503).json({ success: false, message: 'MongoDB not connected' });
  }

  try {
    const [categories, transactions, savingsVault, personalNotes, meta] = await Promise.all([
      db.collection('categories').find({}).toArray(),
      db.collection('transactions').find({}).toArray(),
      db.collection('savings_vault').find({}).toArray(),
      db.collection('personal_notes').find({}).toArray(),
      db.collection('metadata').findOne({ _id: 'app_settings' })
    ]);

    const backupData = {
      exportDate: new Date().toISOString(),
      database: DB_NAME,
      segregations: categories,
      transactions: transactions,
      savingsVault: savingsVault,
      personalNotes: personalNotes,
      metadata: meta
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=expense_tracker_backup_${Date.now()}.json`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Catch-all route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server (when run directly in Node.js)
if (process.env.VERCEL !== '1' && require.main === module) {
  app.listen(PORT, async () => {
    console.log(`=======================================================`);
    console.log(` Expense Tracker Server running on http://localhost:${PORT}`);
    console.log(`=======================================================`);

    // Attempt initial MongoDB connection if URI is present
    if (process.env.MONGODB_URI) {
      await connectToMongo(process.env.MONGODB_URI);
    } else {
      console.log('[Notice] No MONGODB_URI found in .env yet.');
      console.log('[Notice] You can configure your MongoDB Atlas URI anytime via the web app UI or .env file.');
    }
  });
}

module.exports = app;

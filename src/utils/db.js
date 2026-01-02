import { MongoClient } from 'mongodb';
import { Client } from 'pg';

class DatabaseManager {
  constructor() {
    this.connections = new Map();
    this.dbConfigs = this.loadDbConfigs();
    this.queryCache = new Map();
    this.cacheTTL = 3600000; // 1 hour in milliseconds
  }

  loadDbConfigs() {
    const configs = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith('DB_') && key.endsWith('_URL')) {
        const abbr = key.slice(3, -4).toLowerCase();
        configs[abbr] = {
          url: value,
          type: this.detectDbType(value)
        };
      }
    }
    return configs;
  }

  detectDbType(url) {
    if (url.startsWith('mongodb://') || url.startsWith('mongodb+srv://')) {
      return 'mongodb';
    } else if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
      return 'postgres';
    }
    throw new Error(`Unsupported database type for URL: ${url}`);
  }

  async getConnection(abbr) {
    const config = this.dbConfigs[abbr];
    if (!config) {
      throw new Error(`Database configuration not found for abbreviation: ${abbr}`);
    }

    // Check if we already have a connection and it's valid
    if (this.connections.has(abbr)) {
      const connection = this.connections.get(abbr);
      try {
        // Test connection validity
        if (config.type === 'mongodb') {
          await connection.db().command({ ping: 1 });
        } else if (config.type === 'postgres') {
          await connection.query('SELECT 1');
        }
        return connection;
      } catch (error) {
        console.log(`Connection to ${abbr} is invalid, reconnecting...`);
        // Connection is invalid, remove it and create a new one
        this.connections.delete(abbr);
      }
    }

    let connection;
    if (config.type === 'mongodb') {
      const client = new MongoClient(config.url, {
        maxPoolSize: 10,
        minPoolSize: 2,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 45000
      });
      connection = await client.connect();
      this.connections.set(abbr, connection);
    } else if (config.type === 'postgres') {
      const client = new Client({
        connectionString: config.url,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      });
      await client.connect();
      connection = client;
      this.connections.set(abbr, connection);
    }

    return connection;
  }

  // Get data from cache or database
  getFromCache(key) {
    if (this.queryCache.has(key)) {
      const { data, timestamp } = this.queryCache.get(key);
      // Check if cache is still valid
      if (Date.now() - timestamp < this.cacheTTL) {
        return data;
      } else {
        // Cache expired, remove it
        this.queryCache.delete(key);
      }
    }
    return null;
  }

  // Set data to cache
  setToCache(key, data) {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Clear cache for a specific database
  clearCache(abbr) {
    for (const key of this.queryCache.keys()) {
      if (key.startsWith(abbr)) {
        this.queryCache.delete(key);
      }
    }
  }

  async getRandomData(abbr, limit = 10) {
    // Generate cache key
    const cacheKey = `${abbr}_random_${limit}`;
    
    // Try to get data from cache first
    const cachedData = this.getFromCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const connection = await this.getConnection(abbr);
    const config = this.dbConfigs[abbr];

    // 过滤空值和默认值的函数
    const filterEmptyValues = (item) => {
      const filtered = {};
      for (const [key, value] of Object.entries(item)) {
        // 过滤掉 null、undefined、空字符串
        if (value !== null && value !== undefined && value !== '') {
          filtered[key] = value;
        }
      }
      return filtered;
    };

    let data;

    if (config.type === 'mongodb') {
      const db = connection.db();
      const collections = await db.listCollections().toArray();
      if (collections.length === 0) {
        data = [];
      } else {
        const collection = db.collection(collections[0].name);
        const count = await collection.countDocuments();
          if (count === 0) {
            data = [];
          } else {
            const skip = Math.floor(Math.random() * Math.max(count, 1)) || 0;
            data = await collection.find().skip(skip).limit(limit).toArray();
            data = data.map(filterEmptyValues);
          }
      }
    } else if (config.type === 'postgres') {
      const result = await connection.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      if (result.rows.length === 0) {
        data = [];
      } else {
        const tableName = result.rows[0].table_name;
        const countResult = await connection.query(`SELECT COUNT(*) as total FROM ${tableName}`);
        const count = parseInt(countResult.rows[0].total);
          if (count === 0) {
            data = [];
          } else {
            const offset = Math.floor(Math.random() * Math.max(count, 1)) || 0;
            const queryResult = await connection.query(
              `SELECT * FROM ${tableName} OFFSET $1 LIMIT $2`, 
              [offset, limit]
            );
            data = queryResult.rows.map(filterEmptyValues);
          }
      }
    } else {
      data = [];
    }

    // Cache the result
    this.setToCache(cacheKey, data);
    
    return data;
  }

  async insertData(abbr, data, allowCreateStructure = false) {
    const connection = await this.getConnection(abbr);
    const config = this.dbConfigs[abbr];

    let result;

    if (config.type === 'mongodb') {
      const db = connection.db();
      const collections = await db.listCollections().toArray();
      let collection;
      
      if (collections.length === 0) {
        if (!allowCreateStructure) {
          throw new Error('No collections found in the database');
        }
        // Create a new collection with a default name
        const collectionName = 'default_collection';
        await db.createCollection(collectionName);
        collection = db.collection(collectionName);
      } else {
        collection = db.collection(collections[0].name);
      }
      
      result = await collection.insertOne(data);
      result = { insertedId: result.insertedId };
    } else if (config.type === 'postgres') {
      let tableName;
      
      const tableResult = await connection.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      if (tableResult.rows.length === 0) {
        if (!allowCreateStructure) {
          throw new Error('No tables found in the database');
        }
        // Create a new table with default name and infer columns from data
        tableName = 'default_table';
        const columns = Object.keys(data);
        const columnsDefinition = columns.map(col => {
          const value = data[col];
          let type = 'TEXT';
          
          if (typeof value === 'number') {
            if (Number.isInteger(value)) {
              type = 'INTEGER';
            } else {
              type = 'DOUBLE PRECISION';
            }
          } else if (typeof value === 'boolean') {
            type = 'BOOLEAN';
          } else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
            type = 'TIMESTAMP';
          }
          
          return `${col} ${type}`;
        }).join(', ');
        
        await connection.query(`
          CREATE TABLE ${tableName} (
            id SERIAL PRIMARY KEY,
            ${columnsDefinition}
          )
        `);
      } else {
        tableName = tableResult.rows[0].table_name;
      }
      
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
      
      const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
      const insertResult = await connection.query(query, values);
      
      result = insertResult.rows[0];
    } else {
      throw new Error(`Unsupported database type: ${config.type}`);
    }

    // Clear cache for this database after insert
    this.clearCache(abbr);
    
    return result;
  }

  // Close all connections
  async closeAllConnections() {
    for (const [abbr, connection] of this.connections) {
      try {
        const config = this.dbConfigs[abbr];
        if (config.type === 'mongodb') {
          await connection.close();
          console.log(`Closed connection to ${abbr}`);
        } else if (config.type === 'postgres') {
          await connection.end();
          console.log(`Closed connection to ${abbr}`);
        }
      } catch (error) {
        console.error(`Error closing connection to ${abbr}:`, error);
      }
    }
    this.connections.clear();
  }
}

export const dbManager = new DatabaseManager();
export { DatabaseManager };

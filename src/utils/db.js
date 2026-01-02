import { MongoClient } from 'mongodb';
import { Client } from 'pg';

class DatabaseManager {
  constructor() {
    this.connections = new Map();
    this.dbConfigs = this.loadDbConfigs();
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

    if (this.connections.has(abbr)) {
      return this.connections.get(abbr);
    }

    let connection;
    if (config.type === 'mongodb') {
      const client = new MongoClient(config.url);
      connection = await client.connect();
      this.connections.set(abbr, connection);
    } else if (config.type === 'postgres') {
      const client = new Client({ connectionString: config.url });
      await client.connect();
      connection = client;
      this.connections.set(abbr, connection);
    }

    return connection;
  }

  async getRandomData(abbr, limit = 10) {
    const connection = await this.getConnection(abbr);
    const config = this.dbConfigs[abbr];

    if (config.type === 'mongodb') {
      const db = connection.db();
      const collections = await db.listCollections().toArray();
      if (collections.length === 0) {
        return [];
      }
      const collection = db.collection(collections[0].name);
      const count = await collection.countDocuments();
      if (count === 0) {
        return [];
      }
      const skip = Math.floor(Math.random() * (count - limit + 1)) || 0;
      return await collection.find().skip(skip).limit(limit).toArray();
    } else if (config.type === 'postgres') {
      const result = await connection.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      if (result.rows.length === 0) {
        return [];
      }
      const tableName = result.rows[0].table_name;
      const countResult = await connection.query(`SELECT COUNT(*) as total FROM ${tableName}`);
      const count = parseInt(countResult.rows[0].total);
      if (count === 0) {
        return [];
      }
      const offset = Math.floor(Math.random() * (count - limit + 1)) || 0;
      return (await connection.query(`SELECT * FROM ${tableName} OFFSET $1 LIMIT $2`, [offset, limit])).rows;
    }

    return [];
  }

  async insertData(abbr, data) {
    const connection = await this.getConnection(abbr);
    const config = this.dbConfigs[abbr];

    if (config.type === 'mongodb') {
      const db = connection.db();
      const collections = await db.listCollections().toArray();
      if (collections.length === 0) {
        throw new Error('No collections found in the database');
      }
      const collection = db.collection(collections[0].name);
      const result = await collection.insertOne(data);
      return { insertedId: result.insertedId };
    } else if (config.type === 'postgres') {
      const result = await connection.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      if (result.rows.length === 0) {
        throw new Error('No tables found in the database');
      }
      const tableName = result.rows[0].table_name;
      
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
      
      const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
      const insertResult = await connection.query(query, values);
      
      return insertResult.rows[0];
    }

    throw new Error(`Unsupported database type: ${config.type}`);
  }
}

export const dbManager = new DatabaseManager();

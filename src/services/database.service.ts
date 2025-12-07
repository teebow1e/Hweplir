import Database from 'better-sqlite3';
import path from 'path';
import { CTFData } from '../types';
import logger from '../utils/logger';

const DB_PATH = path.join(process.cwd(), 'ctf.db');

/**
 * Database service for managing CTF data using SQLite3
 */
class DatabaseService {
  private db: Database.Database;

  constructor() {
    this.db = new Database(DB_PATH);
    this.ensureDatabase();
  }

  /**
   * Initialize database schema if not exists
   */
  ensureDatabase(): void {
    try {
      // Create tables
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS metadata (
          key TEXT PRIMARY KEY,
          value INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ctfs (
          id INTEGER PRIMARY KEY,
          ctftimeid INTEGER NOT NULL,
          role TEXT NOT NULL,
          cate TEXT NOT NULL,
          name TEXT NOT NULL,
          infom TEXT NOT NULL,
          channel TEXT NOT NULL,
          endtime INTEGER NOT NULL,
          archived INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );

        CREATE INDEX IF NOT EXISTS idx_ctftimeid ON ctfs(ctftimeid);
        CREATE INDEX IF NOT EXISTS idx_cate ON ctfs(cate);
        CREATE INDEX IF NOT EXISTS idx_archived ON ctfs(archived);
        CREATE INDEX IF NOT EXISTS idx_endtime ON ctfs(endtime);
      `);

      // Initialize counter if not exists
      const counter = this.db.prepare('SELECT value FROM metadata WHERE key = ?').get('counter');
      if (!counter) {
        this.db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)').run('counter', 0);
        logger.info('Database initialized with counter = 0');
      }

      logger.debug('Database schema ensured');
    } catch (error) {
      logger.error('Failed to ensure database schema:', error);
      throw new Error('Database initialization error');
    }
  }

  /**
   * Find CTF by CTFtime ID
   */
  async findByCTFTimeId(ctftimeId: number): Promise<{ key: string; data: CTFData } | null> {
    try {
      const row = this.db
        .prepare('SELECT * FROM ctfs WHERE ctftimeid = ?')
        .get(ctftimeId) as any;

      if (!row) return null;

      return {
        key: row.id.toString(),
        data: this.rowToCTFData(row),
      };
    } catch (error) {
      logger.error('Failed to find CTF by CTFtime ID:', error);
      return null;
    }
  }

  /**
   * Find CTF by category ID
   */
  async findByCategoryId(categoryId: string): Promise<{ key: string; data: CTFData } | null> {
    try {
      const row = this.db.prepare('SELECT * FROM ctfs WHERE cate = ?').get(categoryId) as any;

      if (!row) return null;

      return {
        key: row.id.toString(),
        data: this.rowToCTFData(row),
      };
    } catch (error) {
      logger.error('Failed to find CTF by category ID:', error);
      return null;
    }
  }

  /**
   * Add new CTF to database
   */
  async addCTF(ctfData: Omit<CTFData, 'archived'>): Promise<number> {
    try {
      // Get and increment counter
      const counter = this.db
        .prepare('SELECT value FROM metadata WHERE key = ?')
        .get('counter') as { value: number };
      const newId = counter.value + 1;

      // Update counter
      this.db.prepare('UPDATE metadata SET value = ? WHERE key = ?').run(newId, 'counter');

      // Insert CTF
      this.db
        .prepare(
          `INSERT INTO ctfs (id, ctftimeid, role, cate, name, infom, channel, endtime, archived)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          newId,
          ctfData.ctftimeid,
          ctfData.role.toString(),
          ctfData.cate.toString(),
          ctfData.name,
          ctfData.infom.toString(),
          ctfData.channel.toString(),
          ctfData.endtime,
          0
        );

      logger.info(`CTF added to database: ${ctfData.name} (ID: ${newId})`);
      return newId;
    } catch (error) {
      logger.error('Failed to add CTF:', error);
      throw new Error('Database write error');
    }
  }

  /**
   * Update CTF data
   */
  async updateCTF(key: string, updates: Partial<CTFData>): Promise<void> {
    try {
      const id = parseInt(key);
      const setClauses: string[] = [];
      const values: any[] = [];

      if (updates.ctftimeid !== undefined) {
        setClauses.push('ctftimeid = ?');
        values.push(updates.ctftimeid);
      }
      if (updates.role !== undefined) {
        setClauses.push('role = ?');
        values.push(updates.role.toString());
      }
      if (updates.cate !== undefined) {
        setClauses.push('cate = ?');
        values.push(updates.cate.toString());
      }
      if (updates.name !== undefined) {
        setClauses.push('name = ?');
        values.push(updates.name);
      }
      if (updates.infom !== undefined) {
        setClauses.push('infom = ?');
        values.push(updates.infom.toString());
      }
      if (updates.channel !== undefined) {
        setClauses.push('channel = ?');
        values.push(updates.channel.toString());
      }
      if (updates.endtime !== undefined) {
        setClauses.push('endtime = ?');
        values.push(updates.endtime);
      }
      if (updates.archived !== undefined) {
        setClauses.push('archived = ?');
        values.push(updates.archived ? 1 : 0);
      }

      setClauses.push("updated_at = strftime('%s', 'now')");
      values.push(id);

      const sql = `UPDATE ctfs SET ${setClauses.join(', ')} WHERE id = ?`;
      const result = this.db.prepare(sql).run(...values);

      if (result.changes === 0) {
        throw new Error(`CTF with key ${key} not found`);
      }

      logger.info(`CTF updated in database: ${key}`);
    } catch (error) {
      logger.error('Failed to update CTF:', error);
      throw error;
    }
  }

  /**
   * Delete CTF from database
   */
  async deleteCTF(key: string): Promise<CTFData> {
    try {
      const id = parseInt(key);

      // Get the CTF data before deleting
      const row = this.db.prepare('SELECT * FROM ctfs WHERE id = ?').get(id) as any;

      if (!row) {
        throw new Error(`CTF with key ${key} not found`);
      }

      // Delete the CTF
      this.db.prepare('DELETE FROM ctfs WHERE id = ?').run(id);

      const deletedData = this.rowToCTFData(row);
      logger.info(`CTF deleted from database: ${deletedData.name}`);

      return deletedData;
    } catch (error) {
      logger.error('Failed to delete CTF:', error);
      throw error;
    }
  }

  /**
   * Get all CTFs sorted by index
   */
  async getAllCTFs(
    order: 'oldest' | 'newest' = 'newest'
  ): Promise<Array<{ key: string; data: CTFData }>> {
    try {
      const orderBy = order === 'newest' ? 'DESC' : 'ASC';
      const rows = this.db.prepare(`SELECT * FROM ctfs ORDER BY id ${orderBy}`).all() as any[];

      return rows.map((row) => ({
        key: row.id.toString(),
        data: this.rowToCTFData(row),
      }));
    } catch (error) {
      logger.error('Failed to get all CTFs:', error);
      return [];
    }
  }

  /**
   * Get archived CTFs that need to be hidden
   */
  async getExpiredCTFs(currentTime: number): Promise<Array<{ key: string; data: CTFData }>> {
    try {
      const rows = this.db
        .prepare('SELECT * FROM ctfs WHERE archived = 0 AND endtime < ?')
        .all(currentTime) as any[];

      return rows.map((row) => ({
        key: row.id.toString(),
        data: this.rowToCTFData(row),
      }));
    } catch (error) {
      logger.error('Failed to get expired CTFs:', error);
      return [];
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalCTFs: number;
    archivedCTFs: number;
    activeCTFs: number;
    counter: number;
  }> {
    try {
      const total = this.db.prepare('SELECT COUNT(*) as count FROM ctfs').get() as {
        count: number;
      };
      const archived = this.db.prepare('SELECT COUNT(*) as count FROM ctfs WHERE archived = 1').get() as {
        count: number;
      };
      const counter = this.db.prepare('SELECT value FROM metadata WHERE key = ?').get('counter') as {
        value: number;
      };

      return {
        totalCTFs: total.count,
        archivedCTFs: archived.count,
        activeCTFs: total.count - archived.count,
        counter: counter.value,
      };
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      return { totalCTFs: 0, archivedCTFs: 0, activeCTFs: 0, counter: 0 };
    }
  }

  /**
   * Convert database row to CTFData
   */
  private rowToCTFData(row: any): CTFData {
    return {
      ctftimeid: row.ctftimeid,
      role: row.role,
      cate: row.cate,
      name: row.name,
      infom: row.infom,
      channel: row.channel,
      endtime: row.endtime,
      archived: row.archived === 1,
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

export default new DatabaseService();

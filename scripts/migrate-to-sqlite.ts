#!/usr/bin/env tsx
/**
 * Migration script to convert ctf.json to SQLite3 database
 * Run with: bun run tsx scripts/migrate-to-sqlite.ts
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

interface CTFData {
  ctftimeid: number;
  role: string | number;
  cate: string | number;
  name: string;
  infom: string | number;
  channel: string | number;
  endtime: number;
  archived: boolean;
}

interface CTFDatabase {
  '0': {
    infom: number;
  };
  [key: string]: CTFData | { infom: number };
}

const JSON_PATH = path.join(process.cwd(), 'ctf.json');
const DB_PATH = path.join(process.cwd(), 'ctf.db');
const BACKUP_PATH = path.join(process.cwd(), 'ctf.json.backup');

function main() {
  console.log('🚀 Starting migration from JSON to SQLite3...\n');

  // Step 1: Backup existing JSON file
  if (fs.existsSync(JSON_PATH)) {
    fs.copyFileSync(JSON_PATH, BACKUP_PATH);
    console.log(`✅ Backed up ${JSON_PATH} to ${BACKUP_PATH}`);
  } else {
    console.error('❌ Error: ctf.json not found!');
    process.exit(1);
  }

  // Step 2: Read JSON data
  console.log('\n📖 Reading ctf.json...');
  const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8')) as CTFDatabase;
  const counter = jsonData['0'].infom;
  console.log(`   Counter value: ${counter}`);

  // Step 3: Create SQLite database
  console.log('\n🗄️  Creating SQLite database...');
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log(`   Removed existing ${DB_PATH}`);
  }

  const db = new Database(DB_PATH);
  console.log(`   Created new database at ${DB_PATH}`);

  // Step 4: Create schema
  console.log('\n📝 Creating database schema...');
  db.exec(`
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
  console.log('   ✅ Schema created successfully');

  // Step 5: Insert counter metadata
  const insertMetadata = db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)');
  insertMetadata.run('counter', counter);
  console.log(`   ✅ Inserted counter metadata: ${counter}`);

  // Step 6: Migrate CTF data
  console.log('\n📦 Migrating CTF data...');
  const insertCTF = db.prepare(`
    INSERT INTO ctfs (id, ctftimeid, role, cate, name, infom, channel, endtime, archived)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((ctfs: Array<any>) => {
    for (const ctf of ctfs) {
      insertCTF.run(
        ctf.id,
        ctf.ctftimeid,
        ctf.role.toString(),
        ctf.cate.toString(),
        ctf.name,
        ctf.infom.toString(),
        ctf.channel.toString(),
        ctf.endtime,
        ctf.archived ? 1 : 0
      );
    }
  });

  const ctfsToInsert: Array<any> = [];
  let count = 0;

  for (const [key, value] of Object.entries(jsonData)) {
    if (key === '0') continue;

    const ctfData = value as CTFData;
    ctfsToInsert.push({
      id: parseInt(key),
      ctftimeid: ctfData.ctftimeid,
      role: ctfData.role,
      cate: ctfData.cate,
      name: ctfData.name,
      infom: ctfData.infom,
      channel: ctfData.channel,
      endtime: ctfData.endtime,
      archived: ctfData.archived,
    });
    count++;
  }

  insertMany(ctfsToInsert);
  console.log(`   ✅ Migrated ${count} CTF records`);

  // Step 7: Verify migration
  console.log('\n🔍 Verifying migration...');
  const dbCounter = db.prepare('SELECT value FROM metadata WHERE key = ?').get('counter') as {
    value: number;
  };
  const dbCount = db.prepare('SELECT COUNT(*) as count FROM ctfs').get() as { count: number };

  console.log(`   Counter in DB: ${dbCounter.value} (expected: ${counter})`);
  console.log(`   CTF records in DB: ${dbCount.count} (expected: ${count})`);

  if (dbCounter.value === counter && dbCount.count === count) {
    console.log('   ✅ Verification successful!');
  } else {
    console.log('   ⚠️  Warning: Counts do not match!');
  }

  // Step 8: Sample query
  console.log('\n📊 Sample records:');
  const sampleRecords = db.prepare('SELECT * FROM ctfs ORDER BY id DESC LIMIT 3').all();
  sampleRecords.forEach((record: any) => {
    console.log(`   - ID ${record.id}: ${record.name} (archived: ${record.archived})`);
  });

  db.close();

  console.log('\n✅ Migration completed successfully!');
  console.log(`   Database: ${DB_PATH}`);
  console.log(`   Backup: ${BACKUP_PATH}`);
  console.log('\n💡 Next steps:');
  console.log('   1. Test the new database with your application');
  console.log('   2. If everything works, you can delete the backup file');
  console.log(`   3. Update your code to use the SQLite database\n`);
}

main();

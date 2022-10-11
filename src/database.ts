/**
 * Copyright (C) 2022 voxelhost
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import sqlite from "sqlite3";

const TABLES = [
  `CREATE TABLE IF NOT EXISTS customers (
  discordId TEXT PRIMARY KEY
)`,
  `CREATE TABLE IF NOT EXISTS suggestions (
  messageId    TEXT PRIMARY KEY,
  status       TEXT CHECK(status IN ('REJECTED', 'PENDING', 'APPROVED', 'DONE')),
  authorName   TEXT,
  authorAvatar TEXT,
  timestamp    INTEGER,
  content      TEXT
)`,
];

export class Database {
  db: sqlite.Database;

  constructor(path: string) {
    this.db = new sqlite.Database(path);
    for (const tableSql of TABLES) {
      this.run(tableSql);
    }
  }

  async run(sql: string, params?: any) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, error => {
        if (error) {
          reject(error);
        } else {
          resolve(null);
        }
      });
    });
  }

  async get(sql: string, params?: any) {
    return new Promise<any>((resolve, reject) => {
      this.db.get(sql, params, (error, row) => {
        if (error) {
          reject(error);
        } else {
          resolve(row);
        }
      });
    });
  }

  async addCustomer(id: string) {
    await this.run("INSERT OR IGNORE INTO customers VALUES (?)", [id]);
  }

  async removeCustomer(id: string) {
    await this.run("DELETE FROM customers WHERE discordId = ?", [id]);
  }

  async isCustomer(id: string) {
    const customer = await this.get(
      "SELECT * FROM customers WHERE discordId = ?",
      [id],
    );

    return customer ? true : false;
  }
}

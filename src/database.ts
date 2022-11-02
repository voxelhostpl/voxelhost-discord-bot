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

import knex, { Knex } from "knex";
import sqlite from "sqlite3";

export class Database {
  private readonly db: sqlite.Database;
  public readonly knex: Knex;

  constructor(path: string) {
    this.knex = knex({
      client: "sqlite3",
      connection: {
        filename: path,
      },
      useNullAsDefault: true,
    });
    this.knex.migrate.latest();

    this.db = new sqlite.Database(path);
  }

  async exec(sql: string) {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, error => {
        if (error) {
          reject(error);
        } else {
          resolve(null);
        }
      });
    });
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
}

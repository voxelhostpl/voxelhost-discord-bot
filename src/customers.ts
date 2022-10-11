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

import { Database } from "./database";

export class CustomersRepository {
  constructor(private db: Database) {}

  async create(id: string) {
    await this.db.run("INSERT OR IGNORE INTO customers VALUES (?)", [id]);
  }

  async delete(id: string) {
    await this.db.run("DELETE FROM customers WHERE discordId = ?", [id]);
  }

  async exists(id: string) {
    const customer = await this.db.get(
      "SELECT * FROM customers WHERE discordId = ?",
      [id],
    );

    return customer ? true : false;
  }
}

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

import type { Database } from "./database";

export enum SuggestionStatus {
  Rejected = "REJECTED",
  Pending = "PENDING",
  Approved = "APPROVED",
  Done = "DONE",
}

export type Suggestion = {
  messageId: string;
  status: SuggestionStatus;
  authorName: string;
  authorAvatar: string;
  timestamp: number;
  content: string;
};

export class Suggestions {
  constructor(private db: Database) {}

  async create({
    messageId,
    authorName,
    authorAvatar,
    timestamp,
    content,
  }: Omit<Suggestion, "status">) {
    await this.db.run("INSERT INTO suggestions VALUES (?, ?, ?, ?, ?, ?)", [
      messageId,
      SuggestionStatus.Pending,
      authorName,
      authorAvatar,
      timestamp,
      content,
    ]);
  }

  async setStatus(messageId: string, status: SuggestionStatus) {
    await this.db.run("UPDATE suggestions SET status = ? WHERE messageId = ?", [
      status,
      messageId,
    ]);
  }

  async getByMessageId(messageId: string): Promise<Suggestion | undefined> {
    return await this.db.get("SELECT * FROM suggestions WHERE messageId = ?", [
      messageId,
    ]);
  }
}

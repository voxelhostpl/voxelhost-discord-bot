import * as sqlite from "sqlite3";

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

export enum SuggestionStatus {
  Rejected = "REJECTED",
  Pending = "PENDING",
  Approved = "APPROVED",
  Done = "DONE",
}

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

  async newSuggestion(
    messageId: string,
    authorName: string,
    authorAvatar: string,
    timestamp: number,
    content: string,
  ) {
    await this.run("INSERT INTO suggestions VALUES (?, ?, ?, ?, ?, ?)", [
      messageId,
      SuggestionStatus.Pending,
      authorName,
      authorAvatar,
      timestamp,
      content,
    ]);
  }

  async setSuggestionStatus(messageId: string, status: SuggestionStatus) {
    await this.run("UPDATE suggestions SET status = ? WHERE messageId = ?", [
      status,
      messageId,
    ]);
  }

  async getSuggestion(messageId: string) {
    return await this.get("SELECT * FROM suggestions WHERE messageId = ?", [
      messageId,
    ]);
  }
}

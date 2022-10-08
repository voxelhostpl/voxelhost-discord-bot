const sqlite = require("sqlite3");

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

const SUGGESTION_STATUS = {
  REJECTED: "REJECTED",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  DONE: "DONE",
};

class Database {
  constructor(path) {
    this.db = new sqlite.Database(path);
    for (const tableSql of TABLES) {
      this.run(tableSql);
    }
  }

  async run(sql, params) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, error => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async get(sql, params) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (error, row) => {
        if (error) {
          reject(error);
        } else {
          resolve(row);
        }
      });
    });
  }

  async addCustomer(id) {
    await this.run("INSERT OR IGNORE INTO customers VALUES (?)", [id]);
  }

  async removeCustomer(id) {
    await this.run("DELETE FROM customers WHERE discordId = ?", [id]);
  }

  async isCustomer(id) {
    const customer = await this.get(
      "SELECT * FROM customers WHERE discordId = ?",
      [id],
    );

    return customer ? true : false;
  }

  async newSuggestion(messageId, authorName, authorAvatar, timestamp, content) {
    await this.run("INSERT INTO suggestions VALUES (?, ?, ?, ?, ?, ?)", [
      messageId,
      SUGGESTION_STATUS.PENDING,
      authorName,
      authorAvatar,
      timestamp,
      content,
    ]);
  }

  async setSuggestionStatus(messageId, status) {
    await this.run("UPDATE suggestions SET status = ? WHERE messageId = ?", [
      status,
      messageId,
    ]);
  }

  async getSuggestion(messageId) {
    return await this.get("SELECT * FROM suggestions WHERE messageId = ?", [
      messageId,
    ]);
  }
}

module.exports = Database;
module.exports.SUGGESTION_STATUS = SUGGESTION_STATUS;

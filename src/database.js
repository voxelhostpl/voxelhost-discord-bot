const sqlite = require("sqlite3");

class Database {
  constructor() {
    this.db = new sqlite.Database("./database.db");
    this.db.run(
      "CREATE TABLE IF NOT EXISTS customers (discordId VARCHAR(18) PRIMARY KEY)",
    );
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
}

module.exports = Database;

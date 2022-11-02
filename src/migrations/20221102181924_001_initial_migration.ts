import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS customers (
      discordId TEXT PRIMARY KEY
    );
    
    CREATE TABLE IF NOT EXISTS suggestions (
      messageId    TEXT PRIMARY KEY,
      status       TEXT CHECK(status IN ('REJECTED', 'PENDING', 'APPROVED', 'DONE')),
      authorName   TEXT,
      authorAvatar TEXT,
      timestamp    INTEGER,
      content      TEXT
    );
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TABLE customers;
    DROP TABLE suggestions;
  `);
}

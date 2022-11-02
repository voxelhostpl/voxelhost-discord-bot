import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  knex.schema.createTableIfNotExists("customers", table => {
    table.string("discordId").primary();
  });

  knex.schema.createTableIfNotExists("suggestions", table => {
    table.string("messageId").primary();
    table.string("status").checkIn(["REJECTED", "PENDING", "APPROVED", "DONE"]);
    table.string("authorName");
    table.string("authorAvatar");
    table.integer("timestamp");
    table.string("content");
  });
}

export async function down(knex: Knex): Promise<void> {
  knex.schema.dropTableIfExists("customers");
  knex.schema.dropTableIfExists("suggestions");
}

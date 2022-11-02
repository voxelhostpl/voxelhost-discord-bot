import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("suggestions", table => {
    table
      .string("priority")
      .checkIn(["LOW", "MEDIUM", "HIGH"])
      .defaultTo("MEDIUM");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("suggestions", table => {
    table.dropColumn("priority");
  });
}

import type { Knex } from "knex";
import { env } from "./src/env";

const config: Knex.Config = {
  client: "sqlite3",
  connection: {
    filename: env.DB_PATH,
  },
};

module.exports = config;

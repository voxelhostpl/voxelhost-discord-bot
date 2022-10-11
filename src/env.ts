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

require("dotenv").config({
  path: process.env.NODE_ENV === "production" ? ".env" : ".env.local",
});

import z from "zod";

const envSchema = z.object({
  CLIENT_ID: z.string().min(1),
  TOKEN: z.string().min(1),
  SUGGESTIONS_CHANNEL_ID: z.string().min(1),
  HELP_CHANNEL_ID: z.string().min(1),
  GUILD_ID: z.string().min(1),
  CUSTOMER_ROLE_ID: z.string().min(1),
  DB_PATH: z.string(),
  UTILITY_COMMANDS_PATH: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.toString()}`);
}

export const env = parsed.data;

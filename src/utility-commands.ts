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

import fs from "fs";
import path from "path";
import { SlashCommandBuilder } from "@discordjs/builders";
import type { Interaction } from "discord.js";
import invariant from "tiny-invariant";
import { env } from "./env";

const { UTILITY_COMMANDS_PATH } = env;

export const getUtilityCommands = () => {
  const commandFiles = fs.readdirSync(UTILITY_COMMANDS_PATH);
  return commandFiles.map(file => ({
    name: file,
    content: fs.readFileSync(path.join(UTILITY_COMMANDS_PATH, file)).toString(),
  }));
};

type UtilityCommand = {
  name: string;
  content: string;
};

export const makeSlashCommands = (commands: UtilityCommand[]) =>
  commands.map(({ name }) =>
    new SlashCommandBuilder()
      .setName(name)
      .setDescription("Utility command")
      .toJSON(),
  );

export const makeUtilityCommandHandler = (commands: UtilityCommand[]) => {
  const findCommand = (name: string) =>
    commands.find(({ name: commandName }) => commandName === name);

  const shouldHandle = (interaction: Interaction) =>
    interaction.isCommand() && findCommand(interaction.commandName);

  const handler = (interaction: Interaction) => {
    invariant(interaction.isCommand());
    const cmd = findCommand(interaction.commandName);
    if (!cmd) throw new Error(`Command ${interaction.commandName} not found`);
    const { content } = cmd;
    interaction.reply({
      content,
    });
  };

  return {
    shouldHandle,
    handler,
  };
};

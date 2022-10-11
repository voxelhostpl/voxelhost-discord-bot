import { SlashCommandBuilder } from "@discordjs/builders";
import type { Interaction } from "discord.js";
import fs from "fs";
import path from "path";

const BASE_PATH = "./utility-commands";

export const getUtilityCommands = () => {
  const commandFiles = fs.readdirSync(BASE_PATH);
  return commandFiles.map(file => ({
    name: file,
    content: fs.readFileSync(path.join(BASE_PATH, file)).toString(),
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
    if (!interaction.isCommand()) return;
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

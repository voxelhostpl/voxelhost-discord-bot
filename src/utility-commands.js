const fs = require("fs");
const path = require("path");
const { SlashCommandBuilder } = require("@discordjs/builders");

const BASE_PATH = "./utility-commands";

const getUtilityCommands = () => {
  const commandFiles = fs.readdirSync(BASE_PATH);
  return commandFiles.map(file => ({
    name: file,
    content: fs.readFileSync(path.join(BASE_PATH, file)).toString(),
  }));
};

const makeSlashCommands = commands =>
  commands.map(({ name }) =>
    new SlashCommandBuilder()
      .setName(name)
      .setDescription("Utility command")
      .toJSON(),
  );

const makeUtilityCommandHandler = commands => {
  const findCommand = name =>
    commands.find(({ name: commandName }) => commandName === name);

  const shouldHandle = interaction =>
    interaction.isCommand() && findCommand(interaction.commandName);

  const handler = interaction => {
    const { content } = findCommand(interaction.commandName);
    interaction.reply({
      content,
    });
  };

  return {
    shouldHandle,
    handler,
  };
};

module.exports.getUtilityCommands = getUtilityCommands;
module.exports.makeSlashCommands = makeSlashCommands;
module.exports.makeUtilityCommandHandler = makeUtilityCommandHandler;

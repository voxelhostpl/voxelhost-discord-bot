require("dotenv").config();

const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  Client,
  Intents,
  MessageActionRow,
  MessageButton,
} = require("discord.js");
const dayjs = require("dayjs");

const { CLIENT_ID, TOKEN, SUGGESTIONS_CHANNEL_ID, HELP_CHANNEL_ID } =
  process.env;

const rest = new REST({ version: "9" }).setToken(TOKEN);
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

const slowmodeCommand = new SlashCommandBuilder()
  .setName("slowmode")
  .setDescription("Set slowmode")
  .setDefaultPermission(false)
  .addIntegerOption(option =>
    option
      .setName("delay")
      .setDescription("Delay in seconds")
      .setRequired(false),
  )
  .toJSON();

const commands = [slowmodeCommand];

rest.put(Routes.applicationCommands(CLIENT_ID), {
  body: commands,
});

client.once("ready", () => {
  console.log("Ready!");
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "slowmode") {
    const delay = interaction.options.getInteger("delay") ?? 0;

    await interaction.channel.setRateLimitPerUser(delay);

    await interaction.reply({
      content: `Set slowmode to ${delay} seconds`,
      ephemeral: true,
    });
  }
});

client.on("messageCreate", async message => {
  if (message.channelId !== HELP_CHANNEL_ID) return;
  if (message.hasThread) return;

  const user = message.author;

  const date = dayjs().format("DD-MM-YYYY");
  const name = `${user.username} [${date}]`;

  const thread = await message.channel.threads.create({
    name,
    startMessage: message,
    reason: "Automatic thread creation for support message",
  });

  await thread.send(
    `Hej ${user}! Stworzyłem ten wątek automaycznie z Twojej wiadomości.`,
  );
  await thread.send({
    content:
      "Jeśli uzyskałeś już zadowalającą Cię pomoc użyj przycisku na dole, aby zamknąć wątek.",
    components: [
      new MessageActionRow().addComponents(
        new MessageButton()
          .setStyle("PRIMARY")
          .setLabel("Zamknij wątek")
          .setCustomId("close-support-thread"),
      ),
    ],
  });
});

client.on("messageCreate", async message => {
  if (message.channelId !== SUGGESTIONS_CHANNEL_ID) return;
  if (message.hasThread) return;

  let name = message.content;

  if (name.length > 100) {
    name = `${name.slice(0, 97)}...`;
  }

  message.channel.threads.create({
    name,
    startMessage: message,
    reason: "Automatic thread creation for suggestion",
  });

  message.react("✅");
  message.react("❌");
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  const user = interaction.user;

  if (
    interaction.customId === "close-support-thread" &&
    interaction.channel.isThread()
  ) {
    const starterMessage = await interaction.channel.fetchStarterMessage();
    const ownerId = starterMessage.author.id;

    if (ownerId !== user.id) {
      await interaction.reply({
        content: "Nie jesteś właścicielem tego wątku!",
        ephemeral: true,
      });
      return;
    }

    await interaction.reply(`Wątek zamknięty przez ${user}!`);
    await interaction.channel.setArchived(true);
  }
});

client.login(TOKEN);

require("dotenv").config();

const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  Client,
  Intents,
  MessageActionRow,
  MessageButton,
  Permissions,
} = require("discord.js");
const dayjs = require("dayjs");
const express = require("express");
const bodyParser = require("body-parser");

const {
  CLIENT_ID,
  TOKEN,
  SUGGESTIONS_CHANNEL_ID,
  HELP_CHANNEL_ID,
  GUILD_ID,
  CUSTOMER_ROLE_ID,
  DB_PATH,
} = process.env;

const Database = require("./database");
const db = new Database(DB_PATH);

const rest = new REST().setToken(TOKEN);
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
  ],
});

const slowmodeCommand = new SlashCommandBuilder()
  .setName("slowmode")
  .setDescription("Set slowmode")
  .setDefaultMemberPermissions(Permissions.FLAGS.MANAGE_CHANNELS)
  .setDMPermission(false)
  .addIntegerOption(option =>
    option
      .setName("delay")
      .setDescription("Delay in seconds")
      .setRequired(false),
  )
  .toJSON();

const bungeeCommand = new SlashCommandBuilder()
  .setName("bungee")
  .setDescription("Utility command")
  .toJSON();

const nonpremiumCommand = new SlashCommandBuilder()
  .setName("nonpremium")
  .setDescription("Utility command")
  .toJSON();

rest.put(Routes.applicationCommands(CLIENT_ID), {
  body: [slowmodeCommand, bungeeCommand, nonpremiumCommand],
});

client.once("ready", () => {
  console.log("Ready!");
});

const createSupportThread = async message => {
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
      "Jeśli Twój problem został już rozwiązany użyj przycisku na dole, aby zamknąć wątek.",
    components: [
      new MessageActionRow().addComponents(
        new MessageButton()
          .setStyle("PRIMARY")
          .setLabel("Zamknij wątek")
          .setCustomId("close-support-thread"),
      ),
    ],
  });
};

const createSuggestionThread = async message => {
  let name = message.content;

  if (name.length > 100) {
    name = `${name.slice(0, 97)}...`;
  }

  await Promise.all([
    message.channel.threads.create({
      name,
      startMessage: message,
      reason: "Automatic thread creation for suggestion",
    }),
    message.react("✅"),
    message.react("❌"),
  ]);
};

client.on("messageCreate", async message => {
  if (message.channelId === HELP_CHANNEL_ID && !message.hasThread) {
    createSupportThread(message);
  }

  if (message.channelId === SUGGESTIONS_CHANNEL_ID && !message.hasThread) {
    createSuggestionThread(message);
  }
});

client.on("interactionCreate", async interaction => {
  if (interaction.isCommand() && interaction.commandName === "slowmode") {
    const delay = interaction.options.getInteger("delay") ?? 0;

    await interaction.channel.setRateLimitPerUser(delay);

    await interaction.reply({
      content: `Set slowmode to ${delay} seconds`,
      ephemeral: true,
    });
  }

  if (interaction.isCommand() && interaction.commandName === "bungee") {
    await interaction.reply({
      content:
        "Obecnie nie oferujemy hostingu BungeeCord, ale jeśli masz już serwer Bungee na innym hostingu, możesz skorzystać z naszego poradnika: https://github.com/voxelhostpl/voxelbungee/wiki",
    });
  }

  if (interaction.isCommand() && interaction.commandName("nonpremium")) {
    await interaction.reply({
      content:
        "Ustawienie trybu non-premium (offline mode): https://docs.voxelhost.pl/tutorial/onlinemode",
    });
  }

  if (
    interaction.isButton() &&
    interaction.customId === "close-support-thread" &&
    interaction.channel.isThread()
  ) {
    const { user, member } = interaction;

    const starterMessage = await interaction.channel.fetchStarterMessage();
    const ownerId = starterMessage.author.id;

    const hasPermissionToClose =
      ownerId === user.id ||
      member.permissions.has(Permissions.FLAGS.MANAGE_THREADS);

    if (!hasPermissionToClose) {
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

const addCustomerRole = async userId => {
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(userId);

  if (!member) {
    return;
  }

  await member.roles.add(CUSTOMER_ROLE_ID);
};

const removeCustomerRole = async userId => {
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(userId);

  if (!member) {
    return;
  }

  await member.roles.remove(CUSTOMER_ROLE_ID);
};

client.on("guildMemberAdd", async member => {
  const { id } = member;
  if (await db.isCustomer(id)) {
    addCustomerRole(id);
  }
});

client.login(TOKEN);

const app = express();
app.use(bodyParser.json());

app.post("/api/add-customer", async (req, res) => {
  const id = req.body.discordId;
  await addCustomerRole(id);
  await db.addCustomer(id);

  res.status(204).send();
});

app.post("/api/remove-customer", async (req, res) => {
  const id = req.body.discordId;
  await removeCustomerRole(id);
  await db.removeCustomer(id);

  res.status(204).send();
});

app.listen(80);

require("dotenv").config({
  path: process.env.NODE_ENV === "production" ? ".env" : ".env.local",
});

const { REST } = require("@discordjs/rest");
const {
  Routes,
  GatewayIntentBits,
  PermissionFlagsBits,
  ButtonStyle,
} = require("discord-api-types/v10");
const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  Client,
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
} = require("discord.js");
const dayjs = require("dayjs");
const express = require("express");
const bodyParser = require("body-parser");
const Database = require("./database");
const { SUGGESTION_STATUS } = require("./database");
const {
  getUtilityCommands,
  makeSlashCommands,
  makeUtilityCommandHandler,
} = require("./utility-commands");

const {
  CLIENT_ID,
  TOKEN,
  SUGGESTIONS_CHANNEL_ID,
  HELP_CHANNEL_ID,
  GUILD_ID,
  CUSTOMER_ROLE_ID,
  DB_PATH,
} = process.env;

const db = new Database(DB_PATH);

const rest = new REST().setToken(TOKEN);
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

const slowmodeCommand = new SlashCommandBuilder()
  .setName("slowmode")
  .setDescription("Set slowmode")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .setDMPermission(false)
  .addIntegerOption(option =>
    option
      .setName("delay")
      .setDescription("Delay in seconds")
      .setRequired(false),
  );

const statusCommand = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Sets the suggestion status")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .setDMPermission(false)
  .addStringOption(option =>
    option
      .setName("status")
      .setDescription("The status to set to")
      .setRequired(true)
      .addChoices(
        {
          value: SUGGESTION_STATUS.APPROVED,
          name: "Zaakceptowana",
        },
        {
          value: SUGGESTION_STATUS.REJECTED,
          name: "Odrzucona",
        },
        {
          value: SUGGESTION_STATUS.PENDING,
          name: "Oczekująca",
        },
        {
          value: SUGGESTION_STATUS.DONE,
          name: "Gotowa",
        },
      ),
  );

const utilityCommands = getUtilityCommands();
const utilitySlashCommands = makeSlashCommands(utilityCommands);

rest.put(Routes.applicationCommands(CLIENT_ID), {
  body: [
    slowmodeCommand.toJSON(),
    statusCommand.toJSON(),
    ...utilitySlashCommands,
  ],
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
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setLabel("Zamknij wątek")
          .setCustomId("close-support-thread"),
      ),
    ],
  });
};

client.on("messageCreate", async message => {
  if (message.guildId !== GUILD_ID || message.author.bot) {
    return;
  }

  if (message.channelId === HELP_CHANNEL_ID && !message.hasThread) {
    createSupportThread(message);
  }

  if (message.channelId === SUGGESTIONS_CHANNEL_ID && !message.hasThread) {
    const botMessage = await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x0046ff)
          .setAuthor({
            name: message.author.username,
            iconURL: message.author.avatarURL(),
          })
          .addFields([
            {
              name: "Status",
              value: "Oczekująca",
            },
            {
              name: "Treść",
              value: message.content,
            },
          ])
          .setTimestamp(),
      ],
    });

    let threadName = message.content;

    if (threadName.length > 100) {
      threadName = `${threadName.slice(0, 97)}...`;
    }

    await Promise.all([
      message.delete(),
      db.newSuggestion(
        botMessage.id,
        message.author.username,
        message.author.avatarURL(),
        Date.now(),
        message.content,
      ),
      botMessage.channel.threads.create({
        name: threadName,
        startMessage: botMessage,
        reason: "Automatic thread creation for suggestion",
      }),
      botMessage.react("✅"),
      botMessage.react("❌"),
    ]);
  }
});

const { shouldHandle, handler } = makeUtilityCommandHandler(utilityCommands);

client.on("interactionCreate", async interaction => {
  if (interaction.guildId !== GUILD_ID) {
    return;
  }

  if (shouldHandle(interaction)) {
    handler(interaction);
    return;
  }

  if (
    interaction.isCommand() &&
    interaction.commandName === slowmodeCommand.name
  ) {
    const delay = interaction.options.getInteger("delay") ?? 0;

    await interaction.channel.setRateLimitPerUser(delay);

    await interaction.reply({
      content: `Set slowmode to ${delay} seconds`,
      ephemeral: true,
    });
  }

  if (
    interaction.isCommand() &&
    interaction.commandName === statusCommand.name &&
    interaction.channel.isThread() &&
    interaction.channel.parentId === SUGGESTIONS_CHANNEL_ID
  ) {
    const status = interaction.options.getString("status", true);
    const starterMessage = await interaction.channel.fetchStarterMessage();
    const suggestion = await db.getSuggestion(starterMessage.id);
    if (!suggestion) {
      interaction.reply({
        content: "Nie znaleziono takiej sugestii!",
        ephemeral: true,
      });
      return;
    }

    const statuses = {
      [SUGGESTION_STATUS.APPROVED]: "Zaakceptowana",
      [SUGGESTION_STATUS.REJECTED]: "Odrzucona",
      [SUGGESTION_STATUS.PENDING]: "Oczekująca",
      [SUGGESTION_STATUS.DONE]: "Gotowa",
    };

    db.setSuggestionStatus(starterMessage.id, status);

    await starterMessage.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(0x0046ff)
          .setAuthor({
            name: suggestion.authorName,
            iconURL: suggestion.authorAvatar,
          })
          .addFields([
            {
              name: "Status",
              value: statuses[status],
              inline: true,
            },
            {
              name: "Treść",
              value: suggestion.content,
            },
          ])
          .setTimestamp(suggestion.timestamp),
      ],
    });

    await interaction.reply({
      content: `${interaction.user} ustawił status sugestii na **${statuses[status]}**`,
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

    const isThreadOwner = user.id === ownerId;

    const hasPermissionToClose =
      isThreadOwner ||
      member.permissions.has(PermissionFlagsBits.ManageThreads);

    if (!hasPermissionToClose) {
      await interaction.reply({
        content: "Nie jesteś właścicielem tego wątku!",
        ephemeral: true,
      });
      return;
    }

    await interaction.reply(`Wątek zamknięty przez ${user}!`);
    await interaction.channel.setLocked(true);
    await interaction.channel.setArchived(
      true,
      isThreadOwner ? "Thread closed by user" : "Thread closed by moderator",
    );
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

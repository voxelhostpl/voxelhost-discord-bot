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

import { SlashCommandBuilder } from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import bodyParser from "body-parser";
import dayjs from "dayjs";
import {
  ButtonStyle,
  GatewayIntentBits,
  PermissionFlagsBits,
  Routes,
} from "discord-api-types/v10";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ChatInputCommandInteraction,
  Client,
  Message,
  MessageActionRowComponentBuilder,
  TextChannel,
} from "discord.js";
import express from "express";
import invariant from "tiny-invariant";
import { CustomersRepository } from "./customers";
import { Database } from "./database";
import { env } from "./env";
import {
  registerHandlers as registerSuggestionsHandlers,
  SuggestionsRepository,
  suggestionStatusCommand,
} from "./suggestions";
import {
  getSlashCommands,
  getUtilityCommands,
  registerHandler as registerUtilityCommandsHandler,
} from "./utility-commands";

const {
  CLIENT_ID,
  TOKEN,
  HELP_CHANNEL_ID,
  GUILD_ID,
  CUSTOMER_ROLE_ID,
  DB_PATH,
} = env;

const db = new Database(DB_PATH);
const suggestionsRepository = new SuggestionsRepository(db);
const customersRepository = new CustomersRepository(db);

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

registerSuggestionsHandlers(client, suggestionsRepository);

const utilityCommands = getUtilityCommands();
registerUtilityCommandsHandler(client, utilityCommands);

rest.put(Routes.applicationCommands(CLIENT_ID), {
  body: [
    slowmodeCommand.toJSON(),
    suggestionStatusCommand.toJSON(),
    ...getSlashCommands(utilityCommands),
  ],
});

client.once("ready", () => {
  console.log("Ready!");
});

const createSupportThread = async (message: Message) => {
  const user = message.author;

  const date = dayjs().format("DD-MM-YYYY");
  const name = `${user.username} [${date}]`;

  invariant(message.channel instanceof TextChannel);

  const thread = await message.channel.threads.create({
    name,
    startMessage: message,
    reason: "Automatic thread creation for support message",
  });

  await thread.send(
    `Hej ${user}! Stworzyłem ten wątek automaycznie z Twojej wiadomości.`,
  );

  const row =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Primary)
        .setLabel("Zamknij wątek")
        .setCustomId("close-support-thread"),
    );

  await thread.send({
    content:
      "Jeśli Twój problem został już rozwiązany użyj przycisku na dole, aby zamknąć wątek.",
    components: [row],
  });
};

client.on("messageCreate", async message => {
  if (message.guildId !== GUILD_ID || message.author.bot) {
    return;
  }

  if (message.channelId === HELP_CHANNEL_ID && !message.hasThread) {
    createSupportThread(message);
  }
});

const handleSlowmodeCommand = async (
  interaction: ChatInputCommandInteraction,
) => {
  const delay = interaction.options.getInteger("delay") ?? 0;

  invariant(interaction.channel);
  invariant("setRateLimitPerUser" in interaction.channel);

  await interaction.channel.setRateLimitPerUser(delay);

  await interaction.reply({
    content: `Set slowmode to ${delay} seconds`,
    ephemeral: true,
  });
};

client.on("interactionCreate", async interaction => {
  if (interaction.guildId !== GUILD_ID) {
    return;
  }

  if (
    interaction.isChatInputCommand() &&
    interaction.commandName === slowmodeCommand.name
  ) {
    handleSlowmodeCommand(interaction);
  }

  if (
    interaction.isButton() &&
    interaction.customId === "close-support-thread" &&
    interaction.channel?.isThread()
  ) {
    const { user, member, memberPermissions } = interaction;
    invariant(member);
    invariant(memberPermissions);

    const starterMessage = await interaction.channel.fetchStarterMessage();
    if (!starterMessage) {
      await interaction.reply({
        content:
          "Nie znaleziono początkowej wiadomości, być może została usunięta.",
        ephemeral: true,
      });
      return;
    }

    const ownerId = starterMessage.author.id;

    const isThreadOwner = user.id === ownerId;

    const hasPermissionToClose =
      isThreadOwner || memberPermissions.has(PermissionFlagsBits.ManageThreads);

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

const addCustomerRole = async (userId: string) => {
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(userId);

  if (!member) {
    return;
  }

  await member.roles.add(CUSTOMER_ROLE_ID);
};

const removeCustomerRole = async (userId: string) => {
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(userId);

  if (!member) {
    return;
  }

  await member.roles.remove(CUSTOMER_ROLE_ID);
};

client.on("guildMemberAdd", async member => {
  const id = member.id;
  if (await customersRepository.exists(id)) {
    addCustomerRole(id);
  }
});

client.login(TOKEN);

const app = express();
app.use(bodyParser.json());

app.post("/api/add-customer", async (req, res) => {
  const id = req.body.discordId;
  await addCustomerRole(id);
  await customersRepository.create(id);

  res.status(204).send();
});

app.post("/api/remove-customer", async (req, res) => {
  const id = req.body.discordId;
  await removeCustomerRole(id);
  await customersRepository.delete(id);

  res.status(204).send();
});

app.listen(80);

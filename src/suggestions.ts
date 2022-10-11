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
import { PermissionFlagsBits } from "discord-api-types/v10";
import { Client, EmbedBuilder, TextChannel } from "discord.js";
import { Database } from "./database";
import { env } from "./env";
import z from "zod";
import invariant from "tiny-invariant";

const { SUGGESTIONS_CHANNEL_ID } = env;

export enum SuggestionStatus {
  Rejected = "REJECTED",
  Pending = "PENDING",
  Approved = "APPROVED",
  Done = "DONE",
}

export type Suggestion = {
  messageId: string;
  status: SuggestionStatus;
  authorName: string;
  authorAvatar: string;
  timestamp: number;
  content: string;
};

export class SuggestionsRepository {
  constructor(private db: Database) {}

  async create({
    messageId,
    authorName,
    authorAvatar,
    timestamp,
    content,
  }: Omit<Suggestion, "status">) {
    await this.db.run("INSERT INTO suggestions VALUES (?, ?, ?, ?, ?, ?)", [
      messageId,
      SuggestionStatus.Pending,
      authorName,
      authorAvatar,
      timestamp,
      content,
    ]);
  }

  async setStatus(messageId: string, status: SuggestionStatus) {
    await this.db.run("UPDATE suggestions SET status = ? WHERE messageId = ?", [
      status,
      messageId,
    ]);
  }

  async getByMessageId(messageId: string): Promise<Suggestion | undefined> {
    return await this.db.get("SELECT * FROM suggestions WHERE messageId = ?", [
      messageId,
    ]);
  }
}

const statusesToPolish = {
  [SuggestionStatus.Approved]: "Zaakceptowana",
  [SuggestionStatus.Rejected]: "Odrzucona",
  [SuggestionStatus.Pending]: "Oczekująca",
  [SuggestionStatus.Done]: "Gotowa",
};

export const suggestionStatusCommand = new SlashCommandBuilder()
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
        ...Object.entries(statusesToPolish).map(([value, name]) => ({
          value,
          name,
        })),
      ),
  );

export const registerHandlers = (
  client: Client,
  suggestionsRepository: SuggestionsRepository,
) => {
  client.on("interactionCreate", async interaction => {
    if (
      !interaction.isChatInputCommand() ||
      !interaction.channel?.isThread() ||
      interaction.channel.parentId !== SUGGESTIONS_CHANNEL_ID ||
      interaction.commandName !== suggestionStatusCommand.name
    ) {
      return;
    }

    const statusUnsafe = interaction.options.getString("status", true);
    const status = z.nativeEnum(SuggestionStatus).parse(statusUnsafe);

    const starterMessage = await interaction.channel.fetchStarterMessage();
    if (!starterMessage) {
      await interaction.reply({
        content:
          "Nie znaleziono początkowej wiadomości, być może została usunięta.",
        ephemeral: true,
      });
      return;
    }

    const suggestion = await suggestionsRepository.getByMessageId(
      starterMessage.id,
    );
    if (!suggestion) {
      interaction.reply({
        content: "Nie znaleziono sugestii w bazie danych.",
        ephemeral: true,
      });
      return;
    }

    suggestionsRepository.setStatus(starterMessage.id, status);

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
              value: statusesToPolish[status],
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
      content: `${interaction.user} ustawił status sugestii na **${statusesToPolish[status]}**`,
    });
  });

  client.on("messageCreate", async message => {
    if (
      message.channelId !== SUGGESTIONS_CHANNEL_ID ||
      message.hasThread ||
      message.author.bot
    ) {
      return;
    }

    const botMessage = await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x0046ff)
          .setAuthor({
            name: message.author.username,
            iconURL: message.author.avatarURL() ?? undefined,
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

    invariant(botMessage.channel instanceof TextChannel);

    let threadName = message.content;
    if (threadName.length > 100) {
      threadName = `${threadName.slice(0, 97)}...`;
    }

    await Promise.all([
      message.delete(),
      suggestionsRepository.create({
        messageId: botMessage.id,
        authorName: message.author.username,
        authorAvatar: message.author.avatarURL() ?? "",
        timestamp: Date.now(),
        content: message.content,
      }),
      botMessage.channel.threads.create({
        name: threadName,
        startMessage: botMessage,
        reason: "Automatic thread creation for suggestion",
      }),
      botMessage.react("✅"),
      botMessage.react("❌"),
    ]);
  });
};

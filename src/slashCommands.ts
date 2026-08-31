import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionsBitField,
  TextChannel,
  ChannelType
} from 'discord.js';

import { scraperService } from './services/scraper';
import { subscriptionRepository } from './database/repositories/subscriptionRepository';
import { guildRepository } from './database/repositories/guildRepository';
import { config } from './config';
import {
  createNoticeEmbed,
  createErrorEmbed,
  createWarningEmbed,
  createSuccessEmbed,
  createHelpEmbed,
  createSubscriptionsEmbed,
  createSearchEmbed,
  createFacultiesEmbed
} from './utils/embeds';
import {
  SOURCES,
  SOURCE_METADATA,
  isNoticeSource,
  getFacultyMeta,
  SourceQuery,
  NoticeSource
} from './utils/faculties';

// Define the slash commands
export const slashCommandsDefinitions = [
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show help information about TU Notifier'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show help information about TU Notifier'),

  new SlashCommandBuilder()
    .setName('faculties')
    .setDescription('List all supported TU faculties and sources')
];

// Handle Slash Commands
export async function handleSlashCommand(interaction: ChatInputCommandInteraction) {
  const { commandName } = interaction;

  try {
    switch (commandName) {
      case 'help':
        await interaction.reply({ embeds: [createHelpEmbed(config.prefix)] });
        break;

      case 'faculties':
        await interaction.reply({ embeds: [createFacultiesEmbed()] });
        break;
    }
  } catch (error: any) {
    console.error(`[SlashCommand] Error executing ${commandName}:`, error);
    const replyMethod = interaction.deferred || interaction.replied ? 'editReply' : 'reply';
    await interaction[replyMethod]({
      embeds: [createErrorEmbed('Command Error', 'An unexpected error occurred while processing this command.')],
      ephemeral: true
    }).catch(() => {});
  }
}

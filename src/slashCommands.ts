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
    .setDescription('List all supported TU faculties and sources'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show help information about TU Notifier'),

  new SlashCommandBuilder()
    .setName('faculties')
    .setDescription('List all supported TU faculties and sources'),

  new SlashCommandBuilder()
    .setName('latest')
    .setDescription('Fetch the latest notice for a specific faculty')
    .addStringOption(option =>
      option.setName('faculty')
        .setDescription('The faculty to check')
        .setRequired(true)
        .addChoices(
          ...SOURCES.map(s => ({ name: SOURCE_METADATA[s].code, value: s }))
        )
    ),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show help information about TU Notifier'),

  new SlashCommandBuilder()
    .setName('faculties')
    .setDescription('List all supported TU faculties and sources'),

  new SlashCommandBuilder()
    .setName('latest')
    .setDescription('Fetch the latest notice for a specific faculty')
    .addStringOption(option =>
      option.setName('faculty')
        .setDescription('The faculty to check')
        .setRequired(true)
        .addChoices(
          ...SOURCES.map(s => ({ name: SOURCE_METADATA[s].code, value: s }))
        )
    ),

  new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search for notices')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Keyword or notice ID to search for')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('faculty')
        .setDescription('Optional faculty to limit search')
        .setRequired(false)
        .addChoices(
          ...SOURCES.map(s => ({ name: SOURCE_METADATA[s].code, value: s }))
        )
    )
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

      case 'latest': {
        const source = interaction.options.getString('faculty', true) as SourceQuery;
        await interaction.deferReply();
        const notice = await scraperService.getLatest(source);

        if (!notice) {
          const meta = getFacultyMeta(source as string);
          const name = meta ? meta.code : source.toUpperCase();
          await interaction.editReply({
            embeds: [
              createWarningEmbed(
                'No Notices Found',
                `Could not retrieve any recent notices for **${name}** at this moment. Please check again later or visit their official portal.`
              )
            ]
          });
          return;
        }

        const embedPayload = createNoticeEmbed(notice, {
          titlePrefix: `📢 Latest ${getFacultyMeta(notice.source)?.code || notice.source.toUpperCase()} Notice`,
        });

        await interaction.editReply(embedPayload as any);
        break;
      }

      case 'search': {
        const query = interaction.options.getString('query', true);
        const source = (interaction.options.getString('faculty') || 'all') as SourceQuery;
        await interaction.deferReply();

        const isNumericId = /^\d+$/.test(query);
        if (isNumericId && source !== 'all' && isNoticeSource(source as string)) {
          const notice = await scraperService.getNoticeById(source as NoticeSource, query);
          if (notice) {
            const payload = createNoticeEmbed(notice, {
              titlePrefix: `🔍 Found Notice ID: ${notice.id}`,
            });
            await interaction.editReply(payload as any);
            return;
          }
        }

        const results = await scraperService.searchNotices(query, source);
        const embed = createSearchEmbed(
          results,
          query,
          source === 'all' ? undefined : (source as string)
        );

        await interaction.editReply({ embeds: [embed] });
        break;
      }
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

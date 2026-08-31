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
    ),

  new SlashCommandBuilder()
    .setName('subscribe')
    .setDescription('Subscribe this server to TU notices')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addStringOption(option =>
      option.setName('faculty')
        .setDescription('The faculty to subscribe to, or "all"')
        .setRequired(true)
        .addChoices(
          { name: 'All Faculties', value: 'all' },
          ...SOURCES.map(s => ({ name: SOURCE_METADATA[s].code, value: s }))
        )
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Specific channel for these notices (optional)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
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
    ),

  new SlashCommandBuilder()
    .setName('subscribe')
    .setDescription('Subscribe this server to TU notices')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addStringOption(option =>
      option.setName('faculty')
        .setDescription('The faculty to subscribe to, or "all"')
        .setRequired(true)
        .addChoices(
          { name: 'All Faculties', value: 'all' },
          ...SOURCES.map(s => ({ name: SOURCE_METADATA[s].code, value: s }))
        )
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Specific channel for these notices (optional)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('unsubscribe')
    .setDescription('Unsubscribe this server from TU notices')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addStringOption(option =>
      option.setName('faculty')
        .setDescription('The faculty to unsubscribe from, or "all"')
        .setRequired(true)
        .addChoices(
          { name: 'All Faculties', value: 'all' },
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
    ),

  new SlashCommandBuilder()
    .setName('subscribe')
    .setDescription('Subscribe this server to TU notices')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addStringOption(option =>
      option.setName('faculty')
        .setDescription('The faculty to subscribe to, or "all"')
        .setRequired(true)
        .addChoices(
          { name: 'All Faculties', value: 'all' },
          ...SOURCES.map(s => ({ name: SOURCE_METADATA[s].code, value: s }))
        )
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Specific channel for these notices (optional)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('unsubscribe')
    .setDescription('Unsubscribe this server from TU notices')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addStringOption(option =>
      option.setName('faculty')
        .setDescription('The faculty to unsubscribe from, or "all"')
        .setRequired(true)
        .addChoices(
          { name: 'All Faculties', value: 'all' },
          ...SOURCES.map(s => ({ name: SOURCE_METADATA[s].code, value: s }))
        )
    ),

  new SlashCommandBuilder()
    .setName('subscriptions')
    .setDescription('List all active subscriptions for this server'),

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
    ),

  new SlashCommandBuilder()
    .setName('subscribe')
    .setDescription('Subscribe this server to TU notices')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addStringOption(option =>
      option.setName('faculty')
        .setDescription('The faculty to subscribe to, or "all"')
        .setRequired(true)
        .addChoices(
          { name: 'All Faculties', value: 'all' },
          ...SOURCES.map(s => ({ name: SOURCE_METADATA[s].code, value: s }))
        )
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Specific channel for these notices (optional)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
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

      case 'subscribe': {
        if (!interaction.guild) {
          await interaction.reply({ embeds: [createErrorEmbed('Server Only', 'This command can only be used in a server.')], ephemeral: true });
          return;
        }

        const rawInput = interaction.options.getString('faculty', true);
        const channelOpt = interaction.options.getChannel('channel');
        const channelId = channelOpt?.id;

        await interaction.deferReply();

        const guildData = await guildRepository.getGuild(interaction.guild.id);
        const channelReminder = channelId
          ? `\n\n📡 Notifications for this subscription will be delivered to <#${channelId}>.`
          : !guildData?.notification_channel_id
          ? `\n\n⚠️ **Action Required:** No notification channel is set for this server yet. Please run \`/channel\` in your desired announcement channel to receive updates!`
          : `\n\n📡 Notifications will be delivered to the default channel <#${guildData.notification_channel_id}>.`;

        if (rawInput === 'all') {
          const { added, alreadyExisted } = await subscriptionRepository.subscribeAll(interaction.guild.id, channelId);
          if (added.length === 0) {
            await interaction.editReply({
              embeds: [
                createWarningEmbed(
                  'Already Subscribed',
                  `⚠️ This server is already subscribed to all **${alreadyExisted.length}** supported TU faculties.${channelReminder}`
                )
              ]
            });
            return;
          }

          const addedList = added.map((s) => `• **${SOURCE_METADATA[s as keyof typeof SOURCE_METADATA].code}** (${SOURCE_METADATA[s as keyof typeof SOURCE_METADATA].name})`).join('\n');
          await interaction.editReply({
            embeds: [
              createSuccessEmbed(
                'Subscribed to All TU Faculties',
                `🎉 This server has been subscribed to all **${SOURCES.length}** official TU faculties!\n\n**Subscribed Institutes & Faculties:**\n${addedList}${channelReminder}`
              )
            ]
          });
          return;
        }

        const meta = getFacultyMeta(rawInput)!;
        const result = await subscriptionRepository.addSubscription(interaction.guild.id, rawInput, channelId);

        if (result.alreadyExists) {
          await interaction.editReply({
            embeds: [
              createWarningEmbed(
                'Already Subscribed',
                `⚠️ This server is already subscribed to **${meta.code}** (${meta.name}).${channelReminder}`
              )
            ]
          });
          return;
        }

        await interaction.editReply({
          embeds: [
            createSuccessEmbed(
              `Subscribed to ${meta.code}`,
              `✅ Successfully subscribed to **${meta.code} — ${meta.name}**.\n\nNew notices published by ${meta.code} will be posted automatically.${channelReminder}`
            )
          ]
        });
        break;
      }

      case 'unsubscribe': {
        if (!interaction.guild) {
          await interaction.reply({ embeds: [createErrorEmbed('Server Only', 'This command can only be used in a server.')], ephemeral: true });
          return;
        }
        
        const rawInput = interaction.options.getString('faculty', true);
        
        await interaction.deferReply();

        if (rawInput === 'all') {
          const { removedCount } = await subscriptionRepository.unsubscribeAll(interaction.guild.id);
          if (removedCount === 0) {
            await interaction.editReply({
              embeds: [createWarningEmbed('Not Subscribed', '⚠️ This server is not subscribed to any TU faculties.')]
            });
            return;
          }
          await interaction.editReply({
            embeds: [createSuccessEmbed('Unsubscribed from All', `✅ Successfully unsubscribed from all **${removedCount}** TU faculties.`)]
          });
          return;
        }

        const meta = getFacultyMeta(rawInput)!;
        const { removed } = await subscriptionRepository.removeSubscription(interaction.guild.id, rawInput);
        if (!removed) {
          await interaction.editReply({
            embeds: [createWarningEmbed('Not Subscribed', `⚠️ This server is not subscribed to **${meta.code}**.`)]
          });
          return;
        }

        await interaction.editReply({
          embeds: [createSuccessEmbed(`Unsubscribed from ${meta.code}`, `✅ Successfully unsubscribed from **${meta.code}**.`)]
        });
        break;
      }

      case 'subscriptions': {
        if (!interaction.guild) {
          await interaction.reply({ embeds: [createErrorEmbed('Server Only', 'This command can only be used in a server.')], ephemeral: true });
          return;
        }
        
        await interaction.deferReply();

        const subscriptions = await subscriptionRepository.getGuildSubscriptions(interaction.guild.id);
        const guildData = await guildRepository.getGuild(interaction.guild.id);

        let channelText = '⚠️ *Not configured yet* (Run `/channel` to configure)';
        if (guildData?.notification_channel_id) {
          channelText = `<#${guildData.notification_channel_id}>`;
        }

        const embed = createSubscriptionsEmbed(interaction.guild.name, subscriptions, channelText);
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'channel': {
        if (!interaction.guild) {
          await interaction.reply({ embeds: [createErrorEmbed('Server Only', 'This command can only be used in a server.')], ephemeral: true });
          return;
        }
        
        const channelOpt = interaction.options.getChannel('channel', true) as TextChannel;
        const facultyOpt = interaction.options.getString('faculty');
        
        await interaction.deferReply();

        if (interaction.guild.members.me) {
          const perms = channelOpt.permissionsFor(interaction.guild.members.me);
          if (perms && !perms.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks])) {
            await interaction.editReply({
              embeds: [createWarningEmbed('Missing Bot Permissions', `I need **View Channel**, **Send Messages**, and **Embed Links** permissions in ${channelOpt} to post notifications properly.`)]
            });
            return;
          }
        }
        
        const channelName = channelOpt.name ? `#${channelOpt.name}` : channelOpt.id;

        if (facultyOpt) {
          const meta = getFacultyMeta(facultyOpt)!;
          await subscriptionRepository.addSubscription(interaction.guild.id, facultyOpt, channelOpt.id);
          await interaction.editReply({
            embeds: [createSuccessEmbed(`Notification Channel Set for ${meta.code}`, `✅ Notifications for **${meta.code} — ${meta.name}** will now be routed specifically to **${channelName}** (<#${channelOpt.id}>).`)]
          });
          return;
        }

        await guildRepository.setNotificationChannel(interaction.guild.id, channelOpt.id);
        await interaction.editReply({
          embeds: [createSuccessEmbed('Default Notification Channel Configured', `✅ Default TU notifications will now be sent to **${channelName}** (<#${channelOpt.id}>).\n\nMake sure you have subscribed to at least one faculty with \`/subscribe\`!`)]
        });
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

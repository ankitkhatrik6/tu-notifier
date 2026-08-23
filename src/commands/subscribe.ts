import { Message, PermissionsBitField } from 'discord.js';
import { subscriptionRepository } from '../database/repositories/subscriptionRepository';
import { guildRepository } from '../database/repositories/guildRepository';
import { createSuccessEmbed, createWarningEmbed, createErrorEmbed } from '../utils/embeds';
import {
  SOURCES,
  SOURCE_METADATA,
  isNoticeSource,
  normalizeSourceInput,
  getFacultyMeta
} from '../utils/faculties';

export async function handleSubscribeCommand(message: Message, args: string[]): Promise<void> {
  if (!message.guild) {
    await message.reply({
      embeds: [
        createErrorEmbed(
          'Server Only Command',
          'This command can only be used inside a Discord server (guild).'
        ),
      ],
    });
    return;
  }

  // Permission Check: Manage Guild or Administrator
  const member = message.member;
  const hasPermission =
    member?.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
    member?.permissions.has(PermissionsBitField.Flags.Administrator);

  if (!hasPermission) {
    await message.reply({
      embeds: [
        createErrorEmbed(
          'Permission Denied',
          'You need **Manage Server** or **Administrator** permissions to manage TU notice subscriptions.'
        ),
      ],
    });
    return;
  }

  if (!args[0]) {
    const list = SOURCES.map((s) => `\`${s}\``).join(', ');
    await message.reply({
      embeds: [
        createWarningEmbed(
          'Missing Subscription Target',
          `Please specify which faculty to subscribe to, or use \`all\` to subscribe to every faculty.\n\n` +
          `**Usage Examples:**\n` +
          `• \`!tu subscribe iost\`\n` +
          `• \`!tu subscribe ioe\`\n` +
          `• \`!tu subscribe all\`\n\n` +
          `**Available options:** ${list}, \`all\``
        ),
      ],
    });
    return;
  }

  const rawInput = normalizeSourceInput(args[0]);

  // Check channel reminder
  const guildData = await guildRepository.getGuild(message.guild.id);
  const channelReminder = !guildData?.notification_channel_id
    ? `\n\n⚠️ **Action Required:** No notification channel is set for this server yet. Please run \`!tu channel\` in your desired announcement channel to receive updates!`
    : `\n\n📡 Notifications will be delivered to <#${guildData.notification_channel_id}>.`;

  // Case 1: Subscribe ALL
  if (rawInput === 'all') {
    const { added, alreadyExisted } = await subscriptionRepository.subscribeAll(message.guild.id);

    if (added.length === 0) {
      await message.reply({
        embeds: [
          createWarningEmbed(
            'Already Subscribed',
            `⚠️ This server is already subscribed to all **${alreadyExisted.length}** supported TU faculties.${channelReminder}`
          ),
        ],
      });
      return;
    }

    const addedList = added.map((s) => `• **${SOURCE_METADATA[s as keyof typeof SOURCE_METADATA].code}** (${SOURCE_METADATA[s as keyof typeof SOURCE_METADATA].name})`).join('\n');
    await message.reply({
      embeds: [
        createSuccessEmbed(
          'Subscribed to All TU Faculties',
          `🎉 This server has been subscribed to all **${SOURCES.length}** official TU faculties!\n\n` +
          `**Subscribed Institutes & Faculties:**\n${addedList}${channelReminder}`
        ),
      ],
    });
    return;
  }

  // Case 2: Individual Faculty Subscription
  if (!isNoticeSource(rawInput)) {
    const list = SOURCES.map((s) => `\`${s}\``).join(', ');
    await message.reply({
      embeds: [
        createErrorEmbed(
          'Invalid Faculty Identifier',
          `\`${args[0]}\` is not a valid TU faculty source.\n\n` +
          `**Supported options:** ${list}, \`all\`\n` +
          `Run \`!tu faculties\` for a full overview.`
        ),
      ],
    });
    return;
  }

  const meta = getFacultyMeta(rawInput)!;
  const result = await subscriptionRepository.addSubscription(message.guild.id, rawInput);

  if (result.alreadyExists) {
    await message.reply({
      embeds: [
        createWarningEmbed(
          'Already Subscribed',
          `⚠️ This server is already subscribed to **${meta.code}** (${meta.name}).${channelReminder}`
        ),
      ],
    });
    return;
  }

  await message.reply({
    embeds: [
      createSuccessEmbed(
        `Subscribed to ${meta.code}`,
        `✅ Successfully subscribed to **${meta.code} — ${meta.name}**.\n\n` +
        `New notices published by ${meta.code} will be posted automatically.${channelReminder}`
      ),
    ],
  });
}

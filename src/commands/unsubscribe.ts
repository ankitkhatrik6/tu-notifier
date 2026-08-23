import { Message, PermissionsBitField } from 'discord.js';
import { subscriptionRepository } from '../database/repositories/subscriptionRepository';
import { createSuccessEmbed, createWarningEmbed, createErrorEmbed } from '../utils/embeds';
import {
  SOURCES,
  SOURCE_METADATA,
  isNoticeSource,
  normalizeSourceInput,
  getFacultyMeta
} from '../utils/faculties';

export async function handleUnsubscribeCommand(message: Message, args: string[]): Promise<void> {
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
          'You need **Manage Server** or **Administrator** permissions to remove TU notice subscriptions.'
        ),
      ],
    });
    return;
  }

  if (!args[0]) {
    await message.reply({
      embeds: [
        createWarningEmbed(
          'Missing Unsubscribe Target',
          `Please specify which faculty to unsubscribe from, or use \`all\` to remove all subscriptions.\n\n` +
          `**Usage:**\n` +
          `• \`!tu unsubscribe iost\`\n` +
          `• \`!tu unsubscribe all\`\n\n` +
          `Use \`!tu subscriptions\` to check your active subscriptions.`
        ),
      ],
    });
    return;
  }

  const rawInput = normalizeSourceInput(args[0]);
  const currentSubscriptions = await subscriptionRepository.getGuildSubscriptions(message.guild.id);

  // Case 1: Unsubscribe ALL
  if (rawInput === 'all') {
    if (currentSubscriptions.length === 0) {
      await message.reply({
        embeds: [
          createWarningEmbed(
            'No Active Subscriptions',
            `This server is not currently subscribed to any TU faculties.`
          ),
        ],
      });
      return;
    }

    const { removedCount } = await subscriptionRepository.unsubscribeAll(message.guild.id);

    await message.reply({
      embeds: [
        createSuccessEmbed(
          'Unsubscribed from All Faculties',
          `🧹 Successfully removed **${removedCount}** faculty subscriptions. This server will no longer receive automated TU notices.\n\n` +
          `To resubscribe at any time, run \`!tu subscribe <source>\` or \`!tu subscribe all\`.`
        ),
      ],
    });
    return;
  }

  // Case 2: Individual Faculty Unsubscribe
  if (!isNoticeSource(rawInput)) {
    const list = SOURCES.map((s) => `\`${s}\``).join(', ');
    await message.reply({
      embeds: [
        createErrorEmbed(
          'Invalid Faculty Identifier',
          `\`${args[0]}\` is not a valid TU faculty source.\n\n` +
          `**Supported options:** ${list}, \`all\``
        ),
      ],
    });
    return;
  }

  const meta = getFacultyMeta(rawInput)!;

  if (!currentSubscriptions.includes(rawInput)) {
    await message.reply({
      embeds: [
        createWarningEmbed(
          'Not Subscribed',
          `⚠️ This server is not subscribed to **${meta.code}** (${meta.name}).\n\n` +
          `Use \`!tu subscriptions\` to view active subscriptions.`
        ),
      ],
    });
    return;
  }

  await subscriptionRepository.removeSubscription(message.guild.id, rawInput);
  const remaining = await subscriptionRepository.getGuildSubscriptions(message.guild.id);

  await message.reply({
    embeds: [
      createSuccessEmbed(
        `Unsubscribed from ${meta.code}`,
        `✅ Successfully removed **${meta.code} — ${meta.name}** from this server's subscriptions.\n\n` +
        `**Remaining Subscriptions (${remaining.length}):**\n` +
        (remaining.length > 0
          ? remaining.map((s) => `• ${SOURCE_METADATA[s as keyof typeof SOURCE_METADATA]?.code || s.toUpperCase()}`).join(', ')
          : '_None (All subscriptions cleared)_')
      ),
    ],
  });
}

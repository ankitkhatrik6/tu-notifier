import { Message, PermissionsBitField, TextChannel } from 'discord.js';
import { guildRepository } from '../database/repositories/guildRepository';
import { subscriptionRepository } from '../database/repositories/subscriptionRepository';
import { createSuccessEmbed, createErrorEmbed, createWarningEmbed } from '../utils/embeds';
import { isNoticeSource, normalizeSourceInput, getFacultyMeta, SOURCES } from '../utils/faculties';

export async function handleChannelCommand(message: Message, args: string[]): Promise<void> {
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
          'You need **Manage Server** or **Administrator** permissions to set the TU notification channel.'
        ),
      ],
    });
    return;
  }

  const channel = message.channel;
  if (!channel.isTextBased()) {
    await message.reply({
      embeds: [
        createErrorEmbed(
          'Invalid Channel Type',
          'Notifications can only be configured for text channels.'
        ),
      ],
    });
    return;
  }

  const textChannel = channel as TextChannel;

  // Verify bot has permissions to post and embed in this channel
  if (message.guild.members.me) {
    const perms = textChannel.permissionsFor(message.guild.members.me);
    if (perms && !perms.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks])) {
      await message.reply({
        embeds: [
          createWarningEmbed(
            'Missing Bot Permissions',
            `I need **View Channel**, **Send Messages**, and **Embed Links** permissions in ${textChannel} to post notifications properly.`
          ),
        ],
      });
      return;
    }
  }

  const channelName = textChannel.name ? `#${textChannel.name}` : textChannel.id;

  if (args && args[0]) {
    const rawInput = normalizeSourceInput(args[0]);
    if (!isNoticeSource(rawInput)) {
      const list = SOURCES.map((s) => `\`${s}\``).join(', ');
      await message.reply({
        embeds: [
          createErrorEmbed(
            'Invalid Faculty Identifier',
            `\`${args[0]}\` is not a valid TU faculty source.\n\n` +
            `**Supported options:** ${list}`
          ),
        ],
      });
      return;
    }

    const meta = getFacultyMeta(rawInput)!;
    await subscriptionRepository.addSubscription(message.guild.id, rawInput, textChannel.id);

    await message.reply({
      embeds: [
        createSuccessEmbed(
          `Notification Channel Set for ${meta.code}`,
          `✅ Notifications for **${meta.code} — ${meta.name}** will now be routed specifically to **${channelName}** (<#${textChannel.id}>).`
        ),
      ],
    });
    return;
  }

  await guildRepository.setNotificationChannel(message.guild.id, textChannel.id);

  await message.reply({
    embeds: [
      createSuccessEmbed(
        'Default Notification Channel Configured',
        `✅ Default TU notifications will now be sent to **${channelName}** (<#${textChannel.id}>).\n\n` +
        `Make sure you have subscribed to at least one faculty with \`!tu subscribe <source>\` or \`!tu subscribe all\`!\n` +
        `*(You can also set channels for specific faculties via \`!tu channel <source>\`)*`
      ),
    ],
  });
}

import { Message, PermissionsBitField, TextChannel } from 'discord.js';
import { guildRepository } from '../database/repositories/guildRepository';
import { createSuccessEmbed, createErrorEmbed, createWarningEmbed } from '../utils/embeds';

export async function handleChannelCommand(message: Message): Promise<void> {
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

  await guildRepository.setNotificationChannel(message.guild.id, textChannel.id);

  const channelName = textChannel.name ? `#${textChannel.name}` : textChannel.id;

  await message.reply({
    embeds: [
      createSuccessEmbed(
        'Notification Channel Configured',
        `✅ TU notifications will now be sent to **${channelName}** (<#${textChannel.id}>).\n\n` +
        `Make sure you have subscribed to at least one faculty with \`!tu subscribe <source>\` or \`!tu subscribe all\`!`
      ),
    ],
  });
}

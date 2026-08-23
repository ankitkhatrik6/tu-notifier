import { Client, TextChannel, PermissionsBitField } from 'discord.js';
import { Notice, NoticeDetail } from 'tu-scraper';
import { guildRepository } from '../database/repositories/guildRepository';
import { createNoticeEmbed } from '../utils/embeds';
import { getFacultyMeta } from '../utils/faculties';

export class NotifierService {
  /**
   * Dispatches a new notice notification to a list of guild IDs
   */
  async notifyGuilds(client: Client, notice: Notice | NoticeDetail, guildIds: string[]): Promise<number> {
    if (!guildIds || guildIds.length === 0) {
      return 0;
    }

    const meta = getFacultyMeta(notice.source);
    const facultyCode = meta ? meta.code : notice.source.toUpperCase();
    console.log(`[NotifierService] Dispatching new ${facultyCode} notice (ID: ${notice.id}) to ${guildIds.length} subscribed guilds.`);

    let sentCount = 0;
    const messagePayload = createNoticeEmbed(notice, { isNewNotification: true });

    for (const guildId of guildIds) {
      try {
        const guildData = await guildRepository.getGuild(guildId);
        if (!guildData?.notification_channel_id) {
          console.warn(`[NotifierService] Guild ${guildId} is subscribed to ${notice.source} but has no notification channel set.`);
          continue;
        }

        const channel = await client.channels.fetch(guildData.notification_channel_id).catch(() => null);
        if (!channel || !channel.isTextBased()) {
          console.warn(`[NotifierService] Notification channel ${guildData.notification_channel_id} in guild ${guildId} not found or not text-based.`);
          continue;
        }

        const textChannel = channel as TextChannel;

        // Check bot permissions in this channel
        if (textChannel.guild && client.user) {
          const permissions = textChannel.permissionsFor(client.user.id);
          if (permissions && !permissions.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks])) {
            console.warn(`[NotifierService] Bot lacks permission to send messages/embeds in channel #${textChannel.name} (${textChannel.id}) for guild ${guildId}.`);
            continue;
          }
        }

        await textChannel.send(messagePayload);
        sentCount++;
      } catch (err: any) {
        console.error(`[NotifierService] Failed to send notification to guild ${guildId}:`, err.message || err);
      }
    }

    console.log(`[NotifierService] Successfully delivered notice ${notice.id} to ${sentCount}/${guildIds.length} channels.`);
    return sentCount;
  }
}

export const notifierService = new NotifierService();

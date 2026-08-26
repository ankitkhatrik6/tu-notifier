import { Client, TextChannel, PermissionsBitField } from 'discord.js';
import { Notice, NoticeDetail } from 'tu-scraper';
import { guildRepository } from '../database/repositories/guildRepository';
import { createNoticeEmbed } from '../utils/embeds';
import { getFacultyMeta } from '../utils/faculties';

export class NotifierService {
  /**
   * Dispatches a new notice notification to a list of guilds
   */
  async notifyGuilds(client: Client, notice: Notice | NoticeDetail, guilds: { guild_id: string; channel_id: string | null }[]): Promise<number> {
    if (!guilds || guilds.length === 0) {
      return 0;
    }

    const meta = getFacultyMeta(notice.source);
    const facultyCode = meta ? meta.code : notice.source.toUpperCase();
    console.log(`[NotifierService] Dispatching new ${facultyCode} notice (ID: ${notice.id}) to ${guilds.length} subscribed guilds.`);

    let sentCount = 0;
    const messagePayload = createNoticeEmbed(notice, { isNewNotification: true });

    for (const { guild_id, channel_id } of guilds) {
      try {
        let targetChannelId = channel_id;
        
        if (!targetChannelId) {
          const guildData = await guildRepository.getGuild(guild_id);
          targetChannelId = guildData?.notification_channel_id || null;
        }

        if (!targetChannelId) {
          console.warn(`[NotifierService] Guild ${guild_id} is subscribed to ${notice.source} but has no notification channel set.`);
          continue;
        }

        const channel = await client.channels.fetch(targetChannelId).catch(() => null);
        if (!channel || !channel.isTextBased()) {
          console.warn(`[NotifierService] Notification channel ${targetChannelId} in guild ${guild_id} not found or not text-based.`);
          continue;
        }

        const textChannel = channel as TextChannel;

        // Check bot permissions in this channel
        if (textChannel.guild && client.user) {
          const permissions = textChannel.permissionsFor(client.user.id);
          if (permissions && !permissions.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks])) {
            console.warn(`[NotifierService] Bot lacks permission to send messages/embeds in channel #${textChannel.name} (${textChannel.id}) for guild ${guild_id}.`);
            continue;
          }
        }

        await textChannel.send({ content: '@everyone', ...messagePayload });
        sentCount++;
      } catch (err: any) {
        console.error(`[NotifierService] Failed to send notification to guild ${guild_id}:`, err.message || err);
      }
    }

    console.log(`[NotifierService] Successfully delivered notice ${notice.id} to ${sentCount}/${guilds.length} channels.`);
    return sentCount;
  }
}

export const notifierService = new NotifierService();

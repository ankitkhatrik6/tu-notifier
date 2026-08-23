import { getDatabase } from '../database';

export interface GuildEntity {
  guild_id: string;
  notification_channel_id?: string;
  created_at?: string;
  updated_at?: string;
}

export class GuildRepository {
  async getGuild(guildId: string): Promise<GuildEntity | null> {
    const db = await getDatabase();
    const res = await db.query<GuildEntity>(
      'SELECT * FROM guilds WHERE guild_id = $1 LIMIT 1',
      [guildId]
    );
    return res.rows[0] || null;
  }

  async setNotificationChannel(guildId: string, channelId: string): Promise<GuildEntity> {
    const db = await getDatabase();
    const res = await db.query<GuildEntity>(
      `INSERT INTO guilds (guild_id, notification_channel_id, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (guild_id)
       DO UPDATE SET notification_channel_id = EXCLUDED.notification_channel_id, updated_at = CURRENT_TIMESTAMP
       RETURNING *;`,
      [guildId, channelId]
    );
    return res.rows[0];
  }

  async getAllGuilds(): Promise<GuildEntity[]> {
    const db = await getDatabase();
    const res = await db.query<GuildEntity>('SELECT * FROM guilds ORDER BY created_at DESC');
    return res.rows;
  }

  async deleteGuild(guildId: string): Promise<void> {
    const db = await getDatabase();
    await db.query('DELETE FROM guilds WHERE guild_id = $1', [guildId]);
  }
}

export const guildRepository = new GuildRepository();

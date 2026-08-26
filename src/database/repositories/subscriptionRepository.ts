import { getDatabase } from '../database';
import { SOURCES, NoticeSource } from '../../utils/faculties';

export class SubscriptionRepository {
  /**
   * Retrieves all subscribed sources for a specific guild
   */
  async getGuildSubscriptions(guildId: string): Promise<{ source: string; channelId: string | null }[]> {
    const db = await getDatabase();
    const res = await db.query<{ source: string; channel_id: string | null }>(
      'SELECT source, channel_id FROM subscriptions WHERE guild_id = $1 ORDER BY source ASC',
      [guildId]
    );
    return res.rows.map((r) => ({ source: r.source, channelId: r.channel_id }));
  }

  /**
   * Adds a single source subscription for a guild
   */
  async addSubscription(
    guildId: string,
    source: string,
    channelId?: string
  ): Promise<{ added: boolean; alreadyExists: boolean }> {
    const existing = await this.getGuildSubscriptions(guildId);
    if (existing.map(e => e.source).includes(source) && !channelId) {
      return { added: false, alreadyExists: true };
    }

    const db = await getDatabase();
    await db.query(
      `INSERT INTO subscriptions (guild_id, source, channel_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (guild_id, source) DO UPDATE SET channel_id = EXCLUDED.channel_id`,
      [guildId, source, channelId || null]
    );

    return { added: true, alreadyExists: false };
  }

  /**
   * Subscribes a guild to all supported TU sources (iost, fohss, ioe, ac, iaas, iof, foe, fol)
   */
  async subscribeAll(guildId: string, channelId?: string): Promise<{ added: string[]; alreadyExisted: string[] }> {
    const existing = await this.getGuildSubscriptions(guildId);
    const added: string[] = [];
    const alreadyExisted: string[] = [];

    for (const src of SOURCES) {
      if (existing.map(e => e.source).includes(src) && !channelId) {
        alreadyExisted.push(src);
      } else {
        await this.addSubscription(guildId, src, channelId);
        added.push(src);
      }
    }

    return { added, alreadyExisted };
  }

  /**
   * Removes a single source subscription for a guild
   */
  async removeSubscription(guildId: string, source: string): Promise<{ removed: boolean }> {
    const db = await getDatabase();
    await db.query(
      'DELETE FROM subscriptions WHERE guild_id = $1 AND source = $2',
      [guildId, source]
    );
    // If rows had count or was embedded
    const existing = await this.getGuildSubscriptions(guildId);
    const wasRemoved = !existing.map(e => e.source).includes(source);
    return { removed: wasRemoved };
  }

  /**
   * Unsubscribes a guild from all sources
   */
  async unsubscribeAll(guildId: string): Promise<{ removedCount: number }> {
    const existing = await this.getGuildSubscriptions(guildId);
    const count = existing.length;

    const db = await getDatabase();
    await db.query('DELETE FROM subscriptions WHERE guild_id = $1', [guildId]);

    return { removedCount: count };
  }

  /**
   * Returns a distinct list of all faculty sources that have at least one subscriber
   * Used for the global polling optimization (fetch IOST once for all 100 guilds!)
   */
  async getAllSubscribedSources(): Promise<NoticeSource[]> {
    const db = await getDatabase();
    const res = await db.query<{ source: string }>(
      'SELECT DISTINCT source FROM subscriptions'
    );
    const validSources = res.rows
      .map((r) => r.source)
      .filter((s): s is NoticeSource => SOURCES.includes(s as any));
    return validSources;
  }

  /**
   * Returns all guild IDs that are currently subscribed to a specific faculty source
   */
  async getGuildsSubscribedTo(source: string): Promise<{ guild_id: string; channel_id: string | null }[]> {
    const db = await getDatabase();
    const res = await db.query<{ guild_id: string; channel_id: string | null }>(
      'SELECT guild_id, channel_id FROM subscriptions WHERE source = $1',
      [source]
    );
    return res.rows.map((r) => ({ guild_id: r.guild_id, channel_id: r.channel_id }));
  }
}

export const subscriptionRepository = new SubscriptionRepository();

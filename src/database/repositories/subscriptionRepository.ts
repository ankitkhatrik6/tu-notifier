import { getDatabase } from '../database';
import { SOURCES, NoticeSource } from '../../utils/faculties';

export class SubscriptionRepository {
  /**
   * Retrieves all subscribed sources for a specific guild
   */
  async getGuildSubscriptions(guildId: string): Promise<string[]> {
    const db = await getDatabase();
    const res = await db.query<{ source: string }>(
      'SELECT source FROM subscriptions WHERE guild_id = $1 ORDER BY source ASC',
      [guildId]
    );
    return res.rows.map((r) => r.source);
  }

  /**
   * Adds a single source subscription for a guild
   */
  async addSubscription(
    guildId: string,
    source: string
  ): Promise<{ added: boolean; alreadyExists: boolean }> {
    const existing = await this.getGuildSubscriptions(guildId);
    if (existing.includes(source)) {
      return { added: false, alreadyExists: true };
    }

    const db = await getDatabase();
    await db.query(
      `INSERT INTO subscriptions (guild_id, source)
       VALUES ($1, $2)
       ON CONFLICT (guild_id, source) DO NOTHING`,
      [guildId, source]
    );

    return { added: true, alreadyExists: false };
  }

  /**
   * Subscribes a guild to all supported TU sources (iost, fohss, ioe, ac, iaas, iof, foe, fol)
   */
  async subscribeAll(guildId: string): Promise<{ added: string[]; alreadyExisted: string[] }> {
    const existing = await this.getGuildSubscriptions(guildId);
    const added: string[] = [];
    const alreadyExisted: string[] = [];

    for (const src of SOURCES) {
      if (existing.includes(src)) {
        alreadyExisted.push(src);
      } else {
        await this.addSubscription(guildId, src);
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
    const wasRemoved = !existing.includes(source);
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
  async getGuildsSubscribedTo(source: string): Promise<string[]> {
    const db = await getDatabase();
    const res = await db.query<{ guild_id: string }>(
      'SELECT guild_id FROM subscriptions WHERE source = $1',
      [source]
    );
    return res.rows.map((r) => r.guild_id);
  }
}

export const subscriptionRepository = new SubscriptionRepository();

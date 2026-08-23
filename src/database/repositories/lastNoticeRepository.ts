import { getDatabase } from '../database';

export interface LastNoticeEntity {
  source: string;
  notice_id: string;
  checked_at?: string;
}

export class LastNoticeRepository {
  async getLastNoticeId(source: string): Promise<string | null> {
    const db = await getDatabase();
    const res = await db.query<LastNoticeEntity>(
      'SELECT notice_id FROM last_notices WHERE source = $1 LIMIT 1',
      [source]
    );
    return res.rows[0]?.notice_id || null;
  }

  async setLastNoticeId(source: string, noticeId: string): Promise<void> {
    const db = await getDatabase();
    await db.query(
      `INSERT INTO last_notices (source, notice_id, checked_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (source)
       DO UPDATE SET notice_id = EXCLUDED.notice_id, checked_at = CURRENT_TIMESTAMP`,
      [source, noticeId]
    );
  }

  async getAllLastNotices(): Promise<Record<string, { notice_id: string; checked_at?: string }>> {
    const db = await getDatabase();
    const res = await db.query<LastNoticeEntity>('SELECT * FROM last_notices');
    const result: Record<string, { notice_id: string; checked_at?: string }> = {};
    for (const row of res.rows) {
      result[row.source] = {
        notice_id: row.notice_id,
        checked_at: row.checked_at,
      };
    }
    return result;
  }
}

export const lastNoticeRepository = new LastNoticeRepository();

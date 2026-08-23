import { Client } from 'discord.js';
import { subscriptionRepository } from '../database/repositories/subscriptionRepository';
import { lastNoticeRepository } from '../database/repositories/lastNoticeRepository';
import { scraperService } from './scraper';
import { notifierService } from './notifier';
import { getFacultyMeta } from '../utils/faculties';

export interface CheckerCycleResult {
  timestamp: string;
  checkedSources: string[];
  newNoticesFound: Array<{ source: string; noticeId: string; title: string; notifiedGuilds: number }>;
  errors: Array<{ source: string; error: string }>;
}

export class NoticeCheckerService {
  private timer: NodeJS.Timeout | null = null;
  private isChecking = false;
  private lastCycleResult: CheckerCycleResult | null = null;

  getLastCycleResult(): CheckerCycleResult | null {
    return this.lastCycleResult;
  }

  /**
   * Runs a single polling cycle:
   * 1. Finds all distinct sources that currently have at least 1 subscribed guild.
   * 2. Scrapes each unique source once.
   * 3. Compares latest notice ID against database.
   * 4. If new, notifies all subscribed guilds and updates database.
   */
  async checkOnce(client?: Client): Promise<CheckerCycleResult> {
    if (this.isChecking) {
      console.log('[NoticeChecker] A check cycle is already in progress, skipping duplicate tick.');
      return this.lastCycleResult || {
        timestamp: new Date().toISOString(),
        checkedSources: [],
        newNoticesFound: [],
        errors: [{ source: 'all', error: 'Check already in progress' }],
      };
    }

    this.isChecking = true;
    const cycleStart = new Date().toISOString();
    const result: CheckerCycleResult = {
      timestamp: cycleStart,
      checkedSources: [],
      newNoticesFound: [],
      errors: [],
    };

    try {
      // 1. Get unique sources that actually have subscribers
      const activeSources = await subscriptionRepository.getAllSubscribedSources();

      if (activeSources.length === 0) {
        console.log('[NoticeChecker] No active subscriptions found across any guilds. Checking skipped.');
        this.lastCycleResult = result;
        return result;
      }

      console.log(`[NoticeChecker] Starting cycle for ${activeSources.length} subscribed sources: [${activeSources.join(', ')}]`);

      // 2. Iterate each source independently so a failure on one doesn't affect others
      for (const source of activeSources) {
        result.checkedSources.push(source);
        const meta = getFacultyMeta(source);
        const facultyCode = meta ? meta.code : source.toUpperCase();

        try {
          // Fetch latest notice for this source
          const latestNotice = await scraperService.getLatest(source);
          if (!latestNotice || !latestNotice.id) {
            continue;
          }

          // Check against last recorded notice ID in database
          const lastRecordedId = await lastNoticeRepository.getLastNoticeId(source);

          if (!lastRecordedId) {
            // First time seeing this source after startup or fresh DB
            // Seed the current latest notice ID so we don't spam notifications on initial boot
            console.log(`[NoticeChecker] Initializing baseline notice ID for ${facultyCode}: ${latestNotice.id}`);
            await lastNoticeRepository.setLastNoticeId(source, latestNotice.id);
            continue;
          }

          if (latestNotice.id !== lastRecordedId) {
            console.log(`[NoticeChecker] 🔔 NEW NOTICE DETECTED for ${facultyCode}! New ID: ${latestNotice.id} (Previous ID: ${lastRecordedId})`);

            // Find all guilds subscribed to this source
            const subscribedGuilds = await subscriptionRepository.getGuildsSubscribedTo(source);

            let notifiedCount = 0;
            if (client && subscribedGuilds.length > 0) {
              notifiedCount = await notifierService.notifyGuilds(client, latestNotice, subscribedGuilds);
            }

            // Update database with latest notice ID
            await lastNoticeRepository.setLastNoticeId(source, latestNotice.id);

            result.newNoticesFound.push({
              source,
              noticeId: latestNotice.id,
              title: latestNotice.title,
              notifiedGuilds: notifiedCount,
            });
          }
        } catch (err: any) {
          const errMsg = err.message || String(err);
          console.error(`[NoticeChecker] Error checking source ${source}:`, errMsg);
          result.errors.push({ source, error: errMsg });
        }
      }
    } catch (err: any) {
      console.error('[NoticeChecker] Fatal error during notice checker cycle:', err);
      result.errors.push({ source: 'engine', error: err.message || String(err) });
    } finally {
      this.isChecking = false;
      this.lastCycleResult = result;
    }

    return result;
  }

  /**
   * Starts recurring polling
   */
  startPolling(client: Client, intervalMinutes = 5): void {
    if (this.timer) {
      clearInterval(this.timer);
    }

    const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
    console.log(`[NoticeChecker] Notice polling scheduled every ${intervalMinutes} minutes (${intervalMs}ms).`);

    // Run initial check on startup after a small delay
    setTimeout(() => {
      this.checkOnce(client).catch((err) =>
        console.error('[NoticeChecker] Error during initial startup check:', err)
      );
    }, 5000);

    this.timer = setInterval(() => {
      this.checkOnce(client).catch((err) =>
        console.error('[NoticeChecker] Error during recurring check cycle:', err)
      );
    }, intervalMs);
  }

  /**
   * Stops recurring polling
   */
  stopPolling(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[NoticeChecker] Notice polling stopped.');
    }
  }
}

export const noticeCheckerService = new NoticeCheckerService();

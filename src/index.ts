import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActivityType,
  Message
} from 'discord.js';
import http from 'http';
import { config } from './config';
import { getDatabase } from './database/database';
import { noticeCheckerService } from './services/noticeChecker';
import { createErrorEmbed } from './utils/embeds';

// Command handlers
import { handleHelpCommand } from './commands/help';
import { handleFacultiesCommand } from './commands/faculties';
import { handleLatestCommand } from './commands/latest';
import { handleSearchCommand } from './commands/search';
import { handleSubscribeCommand } from './commands/subscribe';
import { handleUnsubscribeCommand } from './commands/unsubscribe';
import { handleSubscriptionsCommand } from './commands/subscriptions';
import { handleChannelCommand } from './commands/channel';

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

/**
 * Message dispatcher for the !tu prefix
 */
export async function handleMessage(message: Message): Promise<void> {
  if (message.author.bot) return;

  const content = message.content.trim();
  const prefix = config.prefix.toLowerCase();

  if (!content.toLowerCase().startsWith(prefix)) return;

  // Extract everything after '!tu'
  const afterPrefix = content.slice(prefix.length).trim();
  if (!afterPrefix) {
    await handleHelpCommand(message);
    return;
  }

  const parts = afterPrefix.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  try {
    switch (command) {
      case 'help':
      case 'commands':
        await handleHelpCommand(message);
        break;

      case 'faculties':
      case 'sources':
      case 'institutes':
        await handleFacultiesCommand(message);
        break;

      case 'latest':
      case 'recent':
        await handleLatestCommand(message, args);
        break;

      case 'search':
      case 'find':
      case 'lookup':
        await handleSearchCommand(message, args);
        break;

      case 'subscribe':
      case 'sub':
        await handleSubscribeCommand(message, args);
        break;

      case 'unsubscribe':
      case 'unsub':
        await handleUnsubscribeCommand(message, args);
        break;

      case 'subscriptions':
      case 'list':
      case 'subs':
        await handleSubscriptionsCommand(message);
        break;

      case 'channel':
      case 'setchannel':
        await handleChannelCommand(message);
        break;

      default:
        await message.reply({
          embeds: [
            createErrorEmbed(
              'Unknown Command',
              `Unknown command: \`${config.prefix} ${command}\`\n\n` +
              `Run \`${config.prefix} help\` to see the list of all available commands.`
            ),
          ],
        });
        break;
    }
  } catch (err: any) {
    console.error(`[CommandRouter] Uncaught error handling "${content}":`, err);
    await message.reply({
      embeds: [
        createErrorEmbed(
          'Command Error',
          'An unexpected error occurred while processing this command. Please try again.'
        ),
      ],
    }).catch(() => {});
  }
}

// Register Discord client events
client.on(Events.MessageCreate, handleMessage);

client.once(Events.ClientReady, (readyClient) => {
  console.log(`[TU Notifier] 🤖 Successfully logged in as ${readyClient.user.tag} (${readyClient.user.id})`);

  // Set bot rich presence
  readyClient.user.setPresence({
    status: 'online',
    activities: [
      {
        name: `${config.prefix} help | TU Notices 🇳🇵`,
        type: ActivityType.Watching,
      },
    ],
  });

  // Start background notice polling
  noticeCheckerService.startPolling(readyClient, config.checkIntervalMinutes);
});

client.on(Events.Error, (error) => {
  console.error('[TU Notifier] Discord client error:', error);
});

/**
 * Main boot function
 */
export async function startBot(): Promise<void> {
  console.log('---------------------------------------------------------');
  console.log('🎓 Tribhuvan University (TU) Notice Discord Bot v1.0.0');
  console.log('---------------------------------------------------------');

  // Start a lightweight HTTP server to satisfy cloud hosting health checks (e.g. Render, Koyeb)
  // MUST run before Discord/DB so Render detects the port immediately!
  const port = process.env.PORT || 8080;
  http.createServer((req, res) => {
    res.writeHead(200);
    res.end('TU Notifier is online and running!');
  }).listen(port, '0.0.0.0', () => {
    console.log(`[TU Notifier] 🌐 Web server listening on port ${port} (Ready for Cloud Hosting)`);
  });

  // Initialize Database
  await getDatabase();

  if (!config.token) {
    console.warn('[TU Notifier] ⚠️ DISCORD_TOKEN is not set in environment variables.');
    console.warn('[TU Notifier] Please configure DISCORD_TOKEN in .env or your hosting platform.');
    return;
  }

  try {
    await client.login(config.token);
  } catch (err: any) {
    console.error('[TU Notifier] ❌ Failed to login to Discord Gateway:', err.message);
  }
}

// Graceful termination handling
process.on('SIGINT', async () => {
  console.log('\n[TU Notifier] Gracefully shutting down...');
  noticeCheckerService.stopPolling();
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[TU Notifier] SIGTERM received, shutting down...');
  noticeCheckerService.stopPolling();
  client.destroy();
  process.exit(0);
});

// Auto-run if executed directly as entrypoint
if (require.main === module) {
  startBot();
}

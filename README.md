<div align="center">
  <img src="banner.png" alt="TU Notifier Banner" width="150" />
</div>

# TU Notifier 🎓

Hey there! 👋 I built **TU Notifier** because I was tired of constantly checking the Tribhuvan University websites for notices. I just wanted my Discord server to ping me when
ever a new result, routine, or notice drops. So, I wrote this bot to do exactly that!

It uses my other project [tu-scraper](https://github.com/ankitkhatrik6/tu-scraper) under the hood to scrape all the faculties and push them to Discord.

## What it does
- **Real-time updates**: It constantly checks 8 different TU faculties (IOE, IOST, IAAS, FOM, etc.) and drops the notice in your discord channel the second it's published.
- **Search**: Need an old notice? Just type `!tu search ioe exam` and it'll find it for you.
- **Read PDFs**: It grabs the PDF links so you don't have to navigate that slow TU portal.

## Setup for yourself

If you want to host this yourself, it's pretty easy:

1. Clone this repo
2. Run `npm install`
3. Create a `.env` file and fill in your info:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   DATABASE_URL=your_postgres_db_url (I use Supabase pooler for free IPv4!)
   CHECK_INTERVAL_MINUTES=5
   ```
4. Run `npm run bot`

That's literally it. The database tables auto-create themselves.

## Commands you can use
- `!tu help` - See all commands
- `!tu channel` - Set the current channel for automatic notifications
- `!tu subscribe iost` - Get pinged for IOST notices
- `!tu search iost` - Find specific IOST notices
- `!tu latest ioe` - Get the newest IOE notice

Built with TypeScript, Discord.js, and a lot of caffeine. Enjoy! ☕

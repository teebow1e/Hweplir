# Hweplir - CTF Discord Bot (discord.js)

A comprehensive Discord bot for managing CTF (Capture The Flag) competitions, rewritten from Python (discord.py) to TypeScript (discord.js v14).

## Features

- 🚩 **CTFtime Integration** - Automatically fetch and display CTF events from CTFtime.org
- 📅 **Event Management** - Create Discord categories, channels, and scheduled events for CTFs
- 🔐 **Role-Based Access** - Automatic role creation and permission management
- 📊 **Team Collaboration** - Dedicated channels for different challenge categories (web, crypto, pwn, etc.)
- 🗃️ **Database Management** - SQLite3-based storage for CTF tracking with migration from JSON
- 🔔 **Auto-Archive** - Automatically hide old CTF channels after they end
- 🎨 **Interactive UI** - Pagination buttons and interactive components
- 📝 **Logging System** - Structured logging with Winston
- 📊 **Bot Statistics** - Rich bot information display with `/whoami` command

## Tech Stack

### Core
- **discord.js v14** - Discord bot framework
- **TypeScript 5.x** - Type-safe development
- **Node.js 18+** - Runtime environment

### Dependencies
- `dotenv` - Environment configuration
- `winston` - Structured logging
- `axios` - HTTP requests to CTFtime API
- `date-fns` - Date manipulation
- `better-sqlite3` - SQLite3 database for CTF storage
- `rss-parser` - RSS feed parsing for CTFtime events

## Installation

### Prerequisites
- Node.js 18 or higher
- A Discord bot token ([Discord Developer Portal](https://discord.com/developers/applications))
- A Discord server with appropriate permissions

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>`
   cd Hweplir
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```env
   SERVER_ID=your_server_id
   BOT_TOKEN=your_bot_token
   VIEW_ALL_CTF_ROLEID=role_id_for_viewing_all_ctfs
   LOG_CHANNELID=channel_id_for_logs (optional)
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Run the bot**
   ```bash
   # Development mode (with auto-reload)
   npm run dev

   # Production mode
   npm start
   ```

## Project Structure

```
src/
├── index.ts                  # Bot entry point
├── config/
│   └── env.ts               # Environment validation
├── commands/
│   ├── ctftime/             # CTFtime commands
│   │   ├── info-find.ts     # Search CTF by ID/name
│   │   ├── info-ongo.ts     # View ongoing CTFs
│   │   ├── info-upco.ts     # View upcoming CTFs
│   │   ├── reg.ts           # Register new CTF
│   │   └── regacc.ts        # Update CTF credentials
│   ├── general/             # General commands
│   │   ├── list.ts          # List registered CTFs
│   │   └── view.ts          # Toggle CTF visibility
│   └── admin/               # Admin commands
│       ├── hide.ts          # Manually hide old CTFs
│       ├── reg-special.ts   # Create manual CTF
│       ├── delete.ts        # Delete CTF
│       └── add.ts           # Add existing category
├── events/
│   └── ready.ts             # Bot ready event
├── services/
│   ├── ctftime.service.ts   # CTFtime API logic
│   ├── database.service.ts  # SQLite3 database handler
│   └── discord.service.ts   # Discord helper functions
├── utils/
│   ├── logger.ts            # Winston logger
│   ├── embed.builder.ts     # Embed creation
│   └── helpers.ts           # Utility functions
├── components/
│   └── buttons.ts           # Button interactions
├── types/
│   └── index.ts             # TypeScript interfaces
├── data/
│   └── statuses.ts          # Bot status messages
└── tests/
    └── ctftime.test.ts      # CTFtime API tests
```

## Commands

### CTFtime Commands

| Command | Description | Parameters |
|---------|-------------|------------|
| `/ct-info_find` | Search for CTF by ID or name | `search-key`: CTFtime ID or name |
| `/ct-info_ongo` | View currently ongoing CTFs | None |
| `/ct-info_upco` | View upcoming CTFs | `page`, `step` (optional) |
| `/ct-reg` | Register new CTF from CTFtime | `ctftime-id`: CTF ID |
| `/ct-regacc` | Update CTF account credentials | `username`, `password`, `cate_id` (optional) |

### General Commands

| Command | Description | Parameters |
|---------|-------------|------------|
| `/c-list` | List all registered CTFs | `order`, `page`, `step` (optional) |
| `/c-view` | Toggle CTF channel visibility | `ctf-name`: Role to toggle |
| `/whoami` | Display bot information and statistics | None |

### Admin Commands

| Command | Description | Parameters |
|---------|-------------|------------|
| `/admin-hide` | Manually hide old CTFs | None |
| `/admin-reg_special` | Create manual CTF (not on CTFtime) | `name`, `hide_after` (days) |
| `/admin-delete` | Delete CTF from server | `search_id`: CTFtime ID or Category ID |
| `/admin-add` | Add existing category to list | `cate_id` (optional) |

## Testing

Run the CTFtime API connection and parsing tests:

```bash
npm test
```

This will:
- Test connection to CTFtime API
- Fetch and parse upcoming CTFs
- Fetch and parse ongoing CTFs
- Search for CTFs by name
- Get specific CTF details
- Demonstrate all CTFtime service functions

## Migration from Python Version

### Database Migration

The TypeScript version now uses **SQLite3** instead of JSON for better performance and reliability:

- Migration script included to convert existing `ctf.json` to SQLite3
- Automatic backup of original JSON file
- All data preserved during migration

### Migration Steps

1. Stop the Python bot
2. Copy `source/ctf.json` to the project root (if it exists)
3. Set up `.env` file with same values
4. Run `npm install && npm run build`
5. **Migrate database**: `bun run tsx scripts/migrate-to-sqlite.ts`
6. Start the TypeScript bot with `npm start`

### Key Improvements

1. **SQLite3 Database** - Better performance, ACID compliance, concurrent access
2. **Commands are the same** - All slash commands work identically
3. **Improved error handling** - Better try-catch blocks and user feedback
4. **Structured logging** - Winston with multiple transports
5. **Type safety** - Full TypeScript definitions prevent runtime errors
6. **RSS Feed Caching** - Faster responses for ongoing/upcoming CTF queries

See [MIGRATION.md](MIGRATION.md) for detailed migration guide.

## Development

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format
```

### Environment Setup

Required environment variables:
- `SERVER_ID` - Discord server ID where bot operates
- `BOT_TOKEN` - Discord bot token
- `VIEW_ALL_CTF_ROLEID` - Role ID for users who can view all CTFs
- `LOG_CHANNELID` - (Optional) Channel ID for bot logs

### Best Practices

1. **Type Safety** - Always define proper TypeScript types
2. **Error Handling** - Use try-catch blocks in all async functions
3. **Logging** - Use the logger utility for all operations
4. **Modularity** - Keep services, commands, and utilities separate

## Features in Detail

### CTFtime Integration

- Fetches live data from CTFtime.org API
- Parses event metadata (dates, format, restrictions)
- Extracts Discord invite links from descriptions
- Handles different CTF formats (Jeopardy, Attack-Defense, etc.)

### Automatic Management

- **Auto-create**: Categories, roles, channels when registering CTF
- **Auto-archive**: Hides CTF channels 1 week after event ends
- **Auto-permissions**: Sets up proper role-based access control

### Interactive Components

- **Pagination**: Navigate through upcoming CTFs and CTF lists
- **Filters**: Show/hide long-duration events
- **Confirmation**: Interactive buttons for dangerous operations

### Logging

Logs are stored in `logs/` directory:
- `discord.log` - All bot operations
- `error.log` - Error-level logs only
- `exceptions.log` - Unhandled exceptions
- `rejections.log` - Unhandled promise rejections

## Git Configuration

To prevent tracking changes to local database and logs:

```bash
git update-index --assume-unchanged source/ctf.json
git update-index --assume-unchanged discord.log
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Bot doesn't respond to commands

1. Ensure bot has proper permissions in Discord
2. Check that SERVER_ID matches your guild
3. Verify bot token is correct
4. Check logs in `logs/discord.log`

### Commands not appearing

1. Wait a few minutes for Discord to sync commands
2. Try kicking and re-inviting the bot
3. Check bot has `applications.commands` scope

### Database errors

1. Ensure `ctf.db` exists (run migration script if needed)
2. Check file permissions
3. Review `logs/error.log`
4. If migrating from JSON, run `bun run tsx scripts/migrate-to-sqlite.ts`

## License

MIT

## Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Built with ❤️ for the CTF community**

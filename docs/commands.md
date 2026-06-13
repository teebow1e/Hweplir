# Bot Commands Reference

**Hweplir** — CTF management bot for CLB BKSEC Discord server.

---

## General Commands

Available to all server members.

| Command | Description | Options |
|---------|-------------|---------|
| `/enroll-htba` | Enroll to get access to BKSEC's HTB Academy account sharing | — |
| `/whoami` | Display bot info: uptime, memory usage, CTF counts | — |
| `/c-list` | List all CTFs registered in the server | `order` (Mới nhất / Cũ nhất), `page`, `step` |
| `/c-view` | Toggle visibility of a CTF's discussion channels (add/remove role) | `ctf-name` *(role, required)* |
| `/invite-repo-wu-gcsb` | Invite a GitHub user as collaborator to the writeup repo | `github_username` *(required)* |

### `/c-list` options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `order` | Choice | Mới nhất | Sort order: newest first or oldest first |
| `page` | Integer | 1 | Page number |
| `step` | Integer | 5 | Results per page |

### `/invite-repo-wu-gcsb` notes

- Sends a GitHub collaborator invitation with `push` access to the configured repo.
- Validates username format (alphanumeric + hyphens, 1–39 chars, cannot start with a hyphen).
- Handles: already a collaborator, user not found (404), permission errors (401/403), and invalid input (422).
- Reply is ephemeral (only visible to the invoker).
- **Note:** role check is temporarily disabled; any server member can use this command.

---

## CTFTime Commands

Pull competition info from CTFTime and manage CTF channels in the server.

| Command | Description | Options |
|---------|-------------|---------|
| `/ct-reg` | Register a new CTF from CTFTime — creates category, role, info channel, and Discord scheduled event | `ctftime-id` *(required)* |
| `/ct-regacc` | Update the CTF account credentials in the pinned info message | `username`, `password` *(required)*; `cate_id` *(optional)* |
| `/ct-info_find` | Look up a CTF by CTFTime ID or name | `search-key` *(required)* |
| `/ct-info_ongo` | Show currently ongoing CTFs from CTFTime | — |
| `/ct-info_upco` | Show upcoming CTFs from CTFTime (paginated) | `page`, `step` |

### `/ct-reg` behavior

1. Fetches CTF info from CTFTime API.
2. Creates a Discord category, role, and info channel.
3. Pins a CTF info embed in the info channel.
4. Creates a Discord scheduled event for the competition window.
5. Auto-hides any CTFs that have passed their end time.
6. Logs the action to the configured log channel.

### `/ct-regacc` options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `username` | String | Yes | CTF account username |
| `password` | String | Yes | CTF account password |
| `cate_id` | String | No | Discord Category ID (auto-detected from current channel if omitted) |

### `/ct-info_upco` options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `page` | Integer | 1 | Page number |
| `step` | Integer | 3 | Results per page |

---

## Admin Commands

Restricted to users with the configured admin role or Discord Administrator permission.

| Command | Description | Options |
|---------|-------------|---------|
| `/admin-add` | Manually register an existing Discord category as a CTF in the database | `cate_id` *(optional, auto-detected)* |
| `/admin-delete` | Delete a CTF — prompts to choose between full delete or keep channels | `search_id` *(CTFTime ID or Category ID, required)* |
| `/admin-hide` | Manually archive all CTFs that have passed their end time | — |
| `/admin-deny-role` | Apply `ViewChannel: false` for `DENY_CTF_ROLEID` across all CTF categories | — |
| `/admin-fix` | Fix info channel permissions for archived CTFs (sets everyone deny) | — |
| `/admin-reg_special` | Register a CTF that is not on CTFTime (manual setup) | `name`, `hide_after` *(days, required)* |
| `/verifyg10` | Verify a user into G10: swap guest role for member role | `user` *(required)* |

### `/admin-delete` flow

Shows a confirmation embed with two buttons:
- **Delete all** — removes category, channels, role, and database record.
- **Keep channels** — removes only the role and database record, preserving discussion channels.

### `/admin-reg_special` options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | String | Yes | CTF name to create |
| `hide_after` | Integer (≥1) | Yes | Days until the category is automatically hidden |

### `/verifyg10` notes

- Restricted to holders of role `1348719400483557386`.
- Removes the "guest" role (`1484250239438164131`) if present.
- Grants the "member" role (`1484249543703924898`).
- Logs the action to the configured log channel.

---

## Task Commands *(disabled — pending environment setup)*

These commands are fully implemented but currently disabled until the required environment variables (`ADMIN_ROLE_ID`, `TASK_ADMIN_CHANNEL_ID`, `TASK_ROLE_PWN/REV/CRYPTO/ALL`) are configured.

| Command | Who | Description |
|---------|-----|-------------|
| `/issue-task` | Admin only | Create a new club task with a name, category, and requirement description (via modal) |
| `/submit` | All members | Submit a writeup/solution for an open task (select-menu flow) |
| `/task-status` | Admin only | View all tasks and their submission lists |
| `/show-all` | Admin (all tasks) / Members (revealed tasks only) | Browse task submissions by task |

### Task categories

| Value | Label |
|-------|-------|
| `pwn` | Pwn |
| `rev` | Reversing |
| `crypto` | Crypto |

### Re-enabling task commands

1. Set the required env vars in `.env`:
   ```
   ADMIN_ROLE_ID=
   TASK_ADMIN_CHANNEL_ID=
   TASK_ROLE_PWN=
   TASK_ROLE_REV=
   TASK_ROLE_CRYPTO=
   TASK_ROLE_ALL=
   ```
2. Uncomment the task imports in `src/index.ts`.
3. Uncomment the task entries in the `commands` array in `src/index.ts`.
4. Restore the `isStringSelectMenu` and `isModalSubmit` handlers in `src/index.ts` (fix brace alignment — see note in that file).
5. Restore the required-vars list in `src/config/env.ts`.

---

## Environment Variables Summary

| Variable | Required | Used by |
|----------|----------|---------|
| `BOT_TOKEN` | Yes | Bot login |
| `GUILD_ID` | Yes | Command deployment |
| `CLIENT_ID` | Yes | Command deployment |
| `VERIFIED_ROLE_ID` | Yes | `invite-repo-wu-gcsb` role check (currently bypassed) |
| `GITHUB_TOKEN` | Yes | GitHub collaborator invite |
| `GH_INVITE_REPO_OWNER` | Yes | GitHub collaborator invite |
| `GH_INVITE_REPO_NAME` | Yes | GitHub collaborator invite |
| `VIEW_ALL_CTF_ROLEID` | Yes | CTF channel visibility |
| `LOG_CHANNELID` | No | Audit log channel |
| `DENY_CTF_ROLEID` | No | `admin-deny-role` command |
| `ADMIN_ROLE_ID` | Task only | Task admin gate |
| `TASK_ADMIN_CHANNEL_ID` | Task only | Task submission notifications |
| `TASK_ROLE_PWN` | Task only | Role granted on pwn task solve |
| `TASK_ROLE_REV` | Task only | Role granted on rev task solve |
| `TASK_ROLE_CRYPTO` | Task only | Role granted on crypto task solve |
| `TASK_ROLE_ALL` | Task only | Role granted when all categories solved |

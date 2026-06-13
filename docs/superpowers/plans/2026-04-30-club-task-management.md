# Club Task Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Discord task issuing, submission, admin status, and revealable submission viewing for club member tasks.

**Architecture:** Extend the existing Discord slash-command bot with a focused task subsystem backed by the current SQLite database service. Use environment-configured admin/category roles, modal and select-menu interactions handled in `interactionCreate`, and small task-specific helpers rather than changing the existing CTF commands.

**Tech Stack:** TypeScript, discord.js v14, better-sqlite3, dotenv, existing command object pattern in `src/commands`.

---

## File Structure

- Modify: `src/types/index.ts`
  - Add task category, task status, command interaction union, and task/submission DTO types.
- Modify: `src/config/env.ts`
  - Require `ADMIN_ROLE_ID`, `TASK_ADMIN_CHANNEL_ID`, `TASK_ROLE_PWN`, `TASK_ROLE_REV`, `TASK_ROLE_CRYPTO`, and `TASK_ROLE_ALL`.
- Modify: `.env.example`
  - Document the new task role/channel environment variables.
- Modify: `src/services/database.service.ts`
  - Add task tables and methods for creating tasks, listing active/revealed tasks, upserting submissions with history, revealing submissions, and status reporting.
- Create: `src/utils/role.guard.ts`
  - Reusable role guard for admin-only commands.
- Create: `src/utils/task.constants.ts`
  - Shared task category list, custom IDs, category label helpers, and env-role lookup.
- Create: `src/commands/tasks/issue-task.ts`
  - Admin-only command that opens a modal for requirements.
- Create: `src/commands/tasks/submit.ts`
  - Member command that opens a task select menu.
- Create: `src/commands/tasks/task-status.ts`
  - Admin-only command that summarizes tasks and latest submissions.
- Create: `src/commands/tasks/show-all.ts`
  - Admin command reveals a task; members can view submissions after reveal.
- Create: `src/components/task-interactions.ts`
  - Handles issue-task modal submission, submit task select menu, submit modal, show-all task select, and show-all rendering.
- Modify: `src/index.ts`
  - Register new commands and route modal/select-menu interactions to task handlers.
- Create: `src/tests/task-database.test.ts`
  - Database service regression tests using an isolated temporary SQLite DB path.

### Task 1: Add task types, env config, constants, and role guard

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/config/env.ts`
- Modify: `.env.example`
- Create: `src/utils/task.constants.ts`
- Create: `src/utils/role.guard.ts`

- [ ] **Step 1: Write the shared task types**

In `src/types/index.ts`, update imports and interfaces so command execution can accept any repliable command interaction, and append task types after `CTFData`.

```ts
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from 'discord.js';

export interface EnvConfig {
  SERVER_ID: string;
  BOT_TOKEN: string;
  VIEW_ALL_CTF_ROLEID: string;
  VERIFIED_ROLE_ID: string;
  ADMIN_ROLE_ID: string;
  TASK_ADMIN_CHANNEL_ID: string;
  TASK_ROLE_PWN: string;
  TASK_ROLE_REV: string;
  TASK_ROLE_CRYPTO: string;
  TASK_ROLE_ALL: string;
  LOG_CHANNELID?: string;
  DENY_CTF_ROLEID?: string;
}

export type TaskCategory = 'pwn' | 'rev' | 'crypto' | 'all';

export interface ClubTask {
  id: number;
  name: string;
  category: TaskCategory;
  requirement: string;
  threadId: string;
  channelId: string;
  roleId: string;
  createdBy: string;
  revealed: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TaskSubmission {
  id: number;
  taskId: number;
  userId: string;
  username: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface TaskSubmissionHistory {
  id: number;
  submissionId: number;
  taskId: number;
  userId: string;
  username: string;
  content: string;
  createdAt: number;
}

export type TaskWithSubmissions = ClubTask & {
  submissions: TaskSubmission[];
};

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}
```

Keep the existing CTF and button types below these additions.

- [ ] **Step 2: Add environment validation**

In `src/config/env.ts`, replace the `requiredVars` declaration and return object with the expanded config.

```ts
const requiredVars = [
  'SERVER_ID',
  'BOT_TOKEN',
  'VIEW_ALL_CTF_ROLEID',
  'VERIFIED_ROLE_ID',
  'ADMIN_ROLE_ID',
  'TASK_ADMIN_CHANNEL_ID',
  'TASK_ROLE_PWN',
  'TASK_ROLE_REV',
  'TASK_ROLE_CRYPTO',
  'TASK_ROLE_ALL',
];
```

```ts
return {
  SERVER_ID: process.env.SERVER_ID!,
  BOT_TOKEN: process.env.BOT_TOKEN!,
  VIEW_ALL_CTF_ROLEID: process.env.VIEW_ALL_CTF_ROLEID!,
  VERIFIED_ROLE_ID: process.env.VERIFIED_ROLE_ID!,
  ADMIN_ROLE_ID: process.env.ADMIN_ROLE_ID!,
  TASK_ADMIN_CHANNEL_ID: process.env.TASK_ADMIN_CHANNEL_ID!,
  TASK_ROLE_PWN: process.env.TASK_ROLE_PWN!,
  TASK_ROLE_REV: process.env.TASK_ROLE_REV!,
  TASK_ROLE_CRYPTO: process.env.TASK_ROLE_CRYPTO!,
  TASK_ROLE_ALL: process.env.TASK_ROLE_ALL!,
  LOG_CHANNELID: process.env.LOG_CHANNELID,
  DENY_CTF_ROLEID: process.env.DENY_CTF_ROLEID,
};
```

- [ ] **Step 3: Document task env vars**

Append to `.env.example`:

```dotenv
ADMIN_ROLE_ID=1000000000000000600
TASK_ADMIN_CHANNEL_ID=1000000000000000600
TASK_ROLE_PWN=1000000000000000600
TASK_ROLE_REV=1000000000000000600
TASK_ROLE_CRYPTO=1000000000000000600
TASK_ROLE_ALL=1000000000000000600

# ADMIN_ROLE_ID: role allowed to issue/reveal tasks and view task status
# TASK_ADMIN_CHANNEL_ID: channel receiving submission notifications
# TASK_ROLE_*: roles mentioned for each task category
```

- [ ] **Step 4: Create task constants**

Create `src/utils/task.constants.ts`:

```ts
import { config } from '../config/env';
import { TaskCategory } from '../types';

export const taskCategories: TaskCategory[] = ['pwn', 'rev', 'crypto', 'all'];

export const taskCategoryLabels: Record<TaskCategory, string> = {
  pwn: 'Pwn',
  rev: 'Reverse Engineering',
  crypto: 'Crypto',
  all: 'All',
};

export const taskCustomIds = {
  issueModal: 'task_issue_modal',
  requirementInput: 'task_requirement',
  submitSelect: 'task_submit_select',
  submitModalPrefix: 'task_submit_modal:',
  submitInput: 'task_submission',
  showAllSelect: 'task_show_all_select',
} as const;

export function roleIdForTaskCategory(category: TaskCategory): string {
  return {
    pwn: config.TASK_ROLE_PWN,
    rev: config.TASK_ROLE_REV,
    crypto: config.TASK_ROLE_CRYPTO,
    all: config.TASK_ROLE_ALL,
  }[category];
}

export function isTaskCategory(value: string): value is TaskCategory {
  return taskCategories.includes(value as TaskCategory);
}
```

- [ ] **Step 5: Create role guard**

Create `src/utils/role.guard.ts`:

```ts
import { ChatInputCommandInteraction, GuildMember, PermissionFlagsBits } from 'discord.js';
import { errorEmbed } from './embed.builder';

export async function requireRole(
  interaction: ChatInputCommandInteraction,
  roleId: string
): Promise<boolean> {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({ embeds: [errorEmbed('This command must be used in a server')], ephemeral: true });
    return false;
  }

  const member = interaction.member as GuildMember;
  const hasRole = member.roles.cache.has(roleId);
  const isAdministrator = member.permissions.has(PermissionFlagsBits.Administrator);

  if (!hasRole && !isAdministrator) {
    await interaction.reply({ embeds: [errorEmbed('You do not have permission to use this command')], ephemeral: true });
    return false;
  }

  return true;
}
```

- [ ] **Step 6: Run typecheck**

Run: `npm run build`

Expected: TypeScript may fail because database and task commands are not implemented yet if imports are not referenced. If it fails only due to unused new files not being referenced, proceed to Task 2. If it fails in existing code, record the error before continuing.

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/config/env.ts .env.example src/utils/task.constants.ts src/utils/role.guard.ts
git commit -m "feat: add task config and role guard"
```

### Task 2: Add database schema and task persistence methods

**Files:**
- Modify: `src/services/database.service.ts`
- Create: `src/tests/task-database.test.ts`

- [ ] **Step 1: Make database path configurable for tests**

In `src/services/database.service.ts`, replace:

```ts
const DB_PATH = path.join(process.cwd(), 'ctf.db');
```

with:

```ts
const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'ctf.db');
```

- [ ] **Step 2: Add task tables to schema**

Inside `ensureDatabase()`, after the existing `ctfs` indexes, add this SQL inside the same `this.db.exec` template string:

```sql

        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          category TEXT NOT NULL CHECK (category IN ('pwn', 'rev', 'crypto', 'all')),
          requirement TEXT NOT NULL,
          thread_id TEXT NOT NULL,
          channel_id TEXT NOT NULL,
          role_id TEXT NOT NULL,
          created_by TEXT NOT NULL,
          revealed INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );

        CREATE TABLE IF NOT EXISTS task_submissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now')),
          UNIQUE(task_id, user_id),
          FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS task_submission_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          submission_id INTEGER NOT NULL,
          task_id INTEGER NOT NULL,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY(submission_id) REFERENCES task_submissions(id) ON DELETE CASCADE,
          FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
        CREATE INDEX IF NOT EXISTS idx_tasks_revealed ON tasks(revealed);
        CREATE INDEX IF NOT EXISTS idx_task_submissions_task_id ON task_submissions(task_id);
        CREATE INDEX IF NOT EXISTS idx_task_submission_history_submission_id ON task_submission_history(submission_id);
```

- [ ] **Step 3: Import task types**

Update the import at the top of `src/services/database.service.ts`:

```ts
import { ClubTask, CTFData, TaskCategory, TaskSubmission, TaskWithSubmissions } from '../types';
```

- [ ] **Step 4: Add row conversion helpers**

Before `close(): void`, add:

```ts
  private rowToTask(row: any): ClubTask {
    return {
      id: row.id,
      name: row.name,
      category: row.category as TaskCategory,
      requirement: row.requirement,
      threadId: row.thread_id,
      channelId: row.channel_id,
      roleId: row.role_id,
      createdBy: row.created_by,
      revealed: row.revealed === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private rowToTaskSubmission(row: any): TaskSubmission {
    return {
      id: row.id,
      taskId: row.task_id,
      userId: row.user_id,
      username: row.username,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
```

- [ ] **Step 5: Add create/list task methods**

Before the helper methods, add:

```ts
  async createTask(input: {
    name: string;
    category: TaskCategory;
    requirement: string;
    threadId: string;
    channelId: string;
    roleId: string;
    createdBy: string;
  }): Promise<ClubTask> {
    try {
      const result = this.db
        .prepare(
          `INSERT INTO tasks (name, category, requirement, thread_id, channel_id, role_id, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          input.name,
          input.category,
          input.requirement,
          input.threadId,
          input.channelId,
          input.roleId,
          input.createdBy
        );

      const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid) as any;
      logger.info(`Task created: ${input.name} (ID: ${result.lastInsertRowid})`);
      return this.rowToTask(row);
    } catch (error) {
      logger.error('Failed to create task:', error);
      throw new Error('Database write error');
    }
  }

  async getTask(taskId: number): Promise<ClubTask | null> {
    try {
      const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as any;
      return row ? this.rowToTask(row) : null;
    } catch (error) {
      logger.error('Failed to get task:', error);
      return null;
    }
  }

  async getAllTasks(): Promise<ClubTask[]> {
    try {
      const rows = this.db.prepare('SELECT * FROM tasks ORDER BY created_at DESC, id DESC').all() as any[];
      return rows.map((row) => this.rowToTask(row));
    } catch (error) {
      logger.error('Failed to get tasks:', error);
      return [];
    }
  }

  async getUnrevealedTasks(): Promise<ClubTask[]> {
    try {
      const rows = this.db
        .prepare('SELECT * FROM tasks WHERE revealed = 0 ORDER BY created_at DESC, id DESC')
        .all() as any[];
      return rows.map((row) => this.rowToTask(row));
    } catch (error) {
      logger.error('Failed to get unrevealed tasks:', error);
      return [];
    }
  }

  async getRevealedTasks(): Promise<ClubTask[]> {
    try {
      const rows = this.db
        .prepare('SELECT * FROM tasks WHERE revealed = 1 ORDER BY created_at DESC, id DESC')
        .all() as any[];
      return rows.map((row) => this.rowToTask(row));
    } catch (error) {
      logger.error('Failed to get revealed tasks:', error);
      return [];
    }
  }
```

- [ ] **Step 6: Add submission methods**

After `getRevealedTasks`, add:

```ts
  async upsertTaskSubmission(input: {
    taskId: number;
    userId: string;
    username: string;
    content: string;
  }): Promise<TaskSubmission> {
    try {
      const existing = this.db
        .prepare('SELECT * FROM task_submissions WHERE task_id = ? AND user_id = ?')
        .get(input.taskId, input.userId) as any;

      if (existing) {
        this.db
          .prepare(
            `INSERT INTO task_submission_history (submission_id, task_id, user_id, username, content)
             VALUES (?, ?, ?, ?, ?)`
          )
          .run(existing.id, existing.task_id, existing.user_id, existing.username, existing.content);

        this.db
          .prepare(
            `UPDATE task_submissions
             SET username = ?, content = ?, updated_at = strftime('%s', 'now')
             WHERE id = ?`
          )
          .run(input.username, input.content, existing.id);

        const row = this.db.prepare('SELECT * FROM task_submissions WHERE id = ?').get(existing.id) as any;
        return this.rowToTaskSubmission(row);
      }

      const result = this.db
        .prepare(
          `INSERT INTO task_submissions (task_id, user_id, username, content)
           VALUES (?, ?, ?, ?)`
        )
        .run(input.taskId, input.userId, input.username, input.content);

      const row = this.db.prepare('SELECT * FROM task_submissions WHERE id = ?').get(result.lastInsertRowid) as any;
      return this.rowToTaskSubmission(row);
    } catch (error) {
      logger.error('Failed to upsert task submission:', error);
      throw new Error('Database write error');
    }
  }

  async getTaskSubmissions(taskId: number): Promise<TaskSubmission[]> {
    try {
      const rows = this.db
        .prepare('SELECT * FROM task_submissions WHERE task_id = ? ORDER BY updated_at DESC, id DESC')
        .all(taskId) as any[];
      return rows.map((row) => this.rowToTaskSubmission(row));
    } catch (error) {
      logger.error('Failed to get task submissions:', error);
      return [];
    }
  }

  async getTaskSubmissionHistory(submissionId: number): Promise<TaskSubmission[]> {
    try {
      const rows = this.db
        .prepare(
          `SELECT id, task_id, user_id, username, content, created_at, created_at AS updated_at
           FROM task_submission_history
           WHERE submission_id = ?
           ORDER BY created_at DESC, id DESC`
        )
        .all(submissionId) as any[];
      return rows.map((row) => this.rowToTaskSubmission(row));
    } catch (error) {
      logger.error('Failed to get task submission history:', error);
      return [];
    }
  }
```

- [ ] **Step 7: Add reveal and status methods**

After the submission methods, add:

```ts
  async revealTask(taskId: number): Promise<ClubTask | null> {
    try {
      this.db
        .prepare("UPDATE tasks SET revealed = 1, updated_at = strftime('%s', 'now') WHERE id = ?")
        .run(taskId);

      return this.getTask(taskId);
    } catch (error) {
      logger.error('Failed to reveal task:', error);
      throw new Error('Database write error');
    }
  }

  async getTasksWithSubmissions(): Promise<TaskWithSubmissions[]> {
    const tasks = await this.getAllTasks();
    const result: TaskWithSubmissions[] = [];

    for (const task of tasks) {
      const submissions = await this.getTaskSubmissions(task.id);
      result.push({ ...task, submissions });
    }

    return result;
  }
```

- [ ] **Step 8: Write database tests**

Create `src/tests/task-database.test.ts`:

```ts
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('task database service', () => {
  let tempDir: string;

  beforeEach(() => {
    jest.resetModules();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hweplir-task-db-'));
    process.env.DB_PATH = path.join(tempDir, 'test.db');
  });

  afterEach(() => {
    delete process.env.DB_PATH;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates tasks and stores latest submission with history', async () => {
    const databaseService = (await import('../services/database.service')).default;

    const task = await databaseService.createTask({
      name: 'ret2win',
      category: 'pwn',
      requirement: 'Solve the binary and explain the exploit.',
      threadId: '111',
      channelId: '222',
      roleId: '333',
      createdBy: '444',
    });

    expect(task.id).toBeGreaterThan(0);
    expect(task.revealed).toBe(false);

    const first = await databaseService.upsertTaskSubmission({
      taskId: task.id,
      userId: '555',
      username: 'alice',
      content: 'first link',
    });

    const second = await databaseService.upsertTaskSubmission({
      taskId: task.id,
      userId: '555',
      username: 'alice',
      content: 'updated link',
    });

    expect(second.id).toBe(first.id);
    expect(second.content).toBe('updated link');

    const submissions = await databaseService.getTaskSubmissions(task.id);
    expect(submissions).toHaveLength(1);
    expect(submissions[0].content).toBe('updated link');

    const history = await databaseService.getTaskSubmissionHistory(first.id);
    expect(history).toHaveLength(1);
    expect(history[0].content).toBe('first link');

    const revealed = await databaseService.revealTask(task.id);
    expect(revealed?.revealed).toBe(true);

    databaseService.close();
  });
});
```

- [ ] **Step 9: Run database test to verify it passes**

Run: `npm test -- --runTestsByPath src/tests/task-database.test.ts`

Expected: PASS.

- [ ] **Step 10: Run typecheck**

Run: `npm run build`

Expected: PASS or only fail due to task command imports not yet added. Fix database/type errors before continuing.

- [ ] **Step 11: Commit**

```bash
git add src/services/database.service.ts src/tests/task-database.test.ts
git commit -m "feat: persist club tasks and submissions"
```

### Task 3: Add issue-task and submit interactions

**Files:**
- Create: `src/commands/tasks/issue-task.ts`
- Create: `src/commands/tasks/submit.ts`
- Create: `src/components/task-interactions.ts`

- [ ] **Step 1: Create issue-task command**

Create `src/commands/tasks/issue-task.ts`:

```ts
import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { Command, TaskCategory } from '../../types';
import { config } from '../../config/env';
import { requireRole } from '../../utils/role.guard';
import { taskCategories, taskCategoryLabels, taskCustomIds } from '../../utils/task.constants';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('issue-task')
    .setDescription('Issue a club task')
    .addStringOption((option) =>
      option.setName('name').setDescription('Task name').setRequired(true).setMaxLength(100)
    )
    .addStringOption((option) =>
      option
        .setName('category')
        .setDescription('Task category')
        .setRequired(true)
        .addChoices(...taskCategories.map((category) => ({ name: taskCategoryLabels[category], value: category })))
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await requireRole(interaction, config.ADMIN_ROLE_ID))) return;

    const name = interaction.options.getString('name', true);
    const category = interaction.options.getString('category', true) as TaskCategory;

    const modal = new ModalBuilder()
      .setCustomId(`${taskCustomIds.issueModal}:${category}:${encodeURIComponent(name)}`)
      .setTitle('Issue Task');

    const requirementInput = new TextInputBuilder()
      .setCustomId(taskCustomIds.requirementInput)
      .setLabel('Task requirement')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(3000);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(requirementInput));

    await interaction.showModal(modal);
  },
};

export default command;
```

- [ ] **Step 2: Create submit command**

Create `src/commands/tasks/submit.ts`:

```ts
import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  StringSelectMenuBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../../types';
import databaseService from '../../services/database.service';
import { errorEmbed } from '../../utils/embed.builder';
import { taskCategoryLabels, taskCustomIds } from '../../utils/task.constants';

const command: Command = {
  data: new SlashCommandBuilder().setName('submit').setDescription('Submit work for a club task'),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command must be used in a server')], ephemeral: true });
      return;
    }

    const tasks = await databaseService.getAllTasks();

    if (tasks.length === 0) {
      await interaction.reply({ embeds: [errorEmbed('No tasks are available for submission')], ephemeral: true });
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(taskCustomIds.submitSelect)
      .setPlaceholder('Select a task')
      .addOptions(
        tasks.slice(0, 25).map((task) => ({
          label: task.name.slice(0, 100),
          description: taskCategoryLabels[task.category],
          value: task.id.toString(),
        }))
      );

    await interaction.reply({
      content: 'Select the task you want to submit for.',
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
      ephemeral: true,
    });
  },
};

export default command;
```

- [ ] **Step 3: Create task interaction handler imports and shell**

Create `src/components/task-interactions.ts` with the imports and entry function:

```ts
import {
  ActionRowBuilder,
  EmbedBuilder,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  TextChannel,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import databaseService from '../services/database.service';
import { config } from '../config/env';
import { TaskCategory } from '../types';
import { errorEmbed, successEmbed } from '../utils/embed.builder';
import {
  isTaskCategory,
  roleIdForTaskCategory,
  taskCategoryLabels,
  taskCustomIds,
} from '../utils/task.constants';
import logger from '../utils/logger';

export async function handleTaskModalInteraction(interaction: ModalSubmitInteraction): Promise<boolean> {
  if (interaction.customId.startsWith(`${taskCustomIds.issueModal}:`)) {
    await handleIssueTaskModal(interaction);
    return true;
  }

  if (interaction.customId.startsWith(taskCustomIds.submitModalPrefix)) {
    await handleSubmitModal(interaction);
    return true;
  }

  return false;
}

export async function handleTaskSelectInteraction(interaction: StringSelectMenuInteraction): Promise<boolean> {
  if (interaction.customId === taskCustomIds.submitSelect) {
    await handleSubmitSelect(interaction);
    return true;
  }

  if (interaction.customId === taskCustomIds.showAllSelect) {
    await handleShowAllSelect(interaction);
    return true;
  }

  return false;
}
```

- [ ] **Step 4: Add issue-task modal handler**

Append to `src/components/task-interactions.ts`:

```ts
async function handleIssueTaskModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.guild || !interaction.channel || !interaction.channel.isTextBased()) {
    await interaction.reply({ embeds: [errorEmbed('This command must be used in a text channel')], ephemeral: true });
    return;
  }

  const [, categoryValue, encodedName] = interaction.customId.split(':');
  if (!isTaskCategory(categoryValue)) {
    await interaction.reply({ embeds: [errorEmbed('Invalid task category')], ephemeral: true });
    return;
  }

  const category = categoryValue as TaskCategory;
  const name = decodeURIComponent(encodedName);
  const requirement = interaction.fields.getTextInputValue(taskCustomIds.requirementInput).trim();
  const roleId = roleIdForTaskCategory(category);
  const sourceChannel = interaction.channel as TextChannel;

  await interaction.deferReply({ ephemeral: true });

  try {
    const thread = await sourceChannel.threads.create({
      name: name.slice(0, 100),
      autoArchiveDuration: 10080,
      reason: `Club task issued by ${interaction.user.tag}`,
    });

    const task = await databaseService.createTask({
      name,
      category,
      requirement,
      threadId: thread.id,
      channelId: sourceChannel.id,
      roleId,
      createdBy: interaction.user.id,
    });

    const embed = new EmbedBuilder()
      .setTitle(`Task: ${task.name}`)
      .setColor(0x3498db)
      .addFields(
        { name: 'Category', value: taskCategoryLabels[task.category], inline: true },
        { name: 'Requirement', value: task.requirement.slice(0, 1024) }
      )
      .setTimestamp();

    await thread.send({ content: `<@&${roleId}>`, embeds: [embed] });

    await interaction.editReply({ embeds: [successEmbed(`Task created in <#${thread.id}>`)] });
  } catch (error) {
    logger.error('Failed to issue task:', error);
    await interaction.editReply({ embeds: [errorEmbed('Failed to create task')] });
  }
}
```

- [ ] **Step 5: Add submit select and modal handlers**

Append to `src/components/task-interactions.ts`:

```ts
async function handleSubmitSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const taskId = Number(interaction.values[0]);
  const task = await databaseService.getTask(taskId);

  if (!task) {
    await interaction.update({ content: 'Task not found.', components: [] });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`${taskCustomIds.submitModalPrefix}${task.id}`)
    .setTitle(`Submit: ${task.name.slice(0, 35)}`);

  const submissionInput = new TextInputBuilder()
    .setCustomId(taskCustomIds.submitInput)
    .setLabel('Submission link or description')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(3000);

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(submissionInput));
  await interaction.showModal(modal);
}

async function handleSubmitModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.guild || !interaction.channel || !interaction.channel.isTextBased()) {
    await interaction.reply({ embeds: [errorEmbed('This command must be used in a text channel')], ephemeral: true });
    return;
  }

  const taskId = Number(interaction.customId.slice(taskCustomIds.submitModalPrefix.length));
  const task = await databaseService.getTask(taskId);

  if (!task) {
    await interaction.reply({ embeds: [errorEmbed('Task not found')], ephemeral: true });
    return;
  }

  const content = interaction.fields.getTextInputValue(taskCustomIds.submitInput).trim();
  await interaction.deferReply({ ephemeral: true });

  try {
    const submission = await databaseService.upsertTaskSubmission({
      taskId: task.id,
      userId: interaction.user.id,
      username: interaction.user.tag,
      content,
    });

    await (interaction.channel as TextChannel).send(
      `${interaction.user} has submitted for task **${task.name}**.`
    );

    const adminChannel = interaction.guild.channels.cache.get(config.TASK_ADMIN_CHANNEL_ID) as TextChannel | undefined;
    if (adminChannel) {
      const embed = new EmbedBuilder()
        .setTitle(`Submission: ${task.name}`)
        .setColor(0x2ecc71)
        .addFields(
          { name: 'Member', value: `${interaction.user} (${interaction.user.tag})`, inline: false },
          { name: 'Category', value: taskCategoryLabels[task.category], inline: true },
          { name: 'Content', value: submission.content.slice(0, 1024), inline: false }
        )
        .setTimestamp();

      await adminChannel.send({ embeds: [embed] });
    }

    await interaction.editReply({ embeds: [successEmbed('Submission received')] });
  } catch (error) {
    logger.error('Failed to submit task:', error);
    await interaction.editReply({ embeds: [errorEmbed('Failed to submit task')] });
  }
}
```

- [ ] **Step 6: Add temporary show-all select stub**

Append to `src/components/task-interactions.ts`:

```ts
async function handleShowAllSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  await interaction.update({ content: 'Show-all is not available yet.', components: [] });
}
```

- [ ] **Step 7: Run typecheck**

Run: `npm run build`

Expected: PASS after fixing any TypeScript import or Discord type errors.

- [ ] **Step 8: Commit**

```bash
git add src/commands/tasks/issue-task.ts src/commands/tasks/submit.ts src/components/task-interactions.ts
git commit -m "feat: add task issue and submission flow"
```

### Task 4: Add task-status and show-all commands

**Files:**
- Create: `src/commands/tasks/task-status.ts`
- Create: `src/commands/tasks/show-all.ts`
- Modify: `src/components/task-interactions.ts`

- [ ] **Step 1: Create task-status command**

Create `src/commands/tasks/task-status.ts`:

```ts
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types';
import { config } from '../../config/env';
import databaseService from '../../services/database.service';
import { requireRole } from '../../utils/role.guard';
import { taskCategoryLabels } from '../../utils/task.constants';
import { errorEmbed } from '../../utils/embed.builder';

const command: Command = {
  data: new SlashCommandBuilder().setName('task-status').setDescription('Show task submission status'),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await requireRole(interaction, config.ADMIN_ROLE_ID))) return;

    const tasks = await databaseService.getTasksWithSubmissions();

    if (tasks.length === 0) {
      await interaction.reply({ embeds: [errorEmbed('No tasks found')], ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder().setTitle('Task Status').setColor(0xf1c40f).setTimestamp();

    for (const task of tasks.slice(0, 20)) {
      const submitters = task.submissions.length
        ? task.submissions.map((submission) => `<@${submission.userId}>`).join(', ')
        : 'No submissions';

      embed.addFields({
        name: `${task.name} (${taskCategoryLabels[task.category]})`,
        value: `Revealed: ${task.revealed ? 'yes' : 'no'}\nSubmissions: ${submitters}`.slice(0, 1024),
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
```

- [ ] **Step 2: Create show-all command**

Create `src/commands/tasks/show-all.ts`:

```ts
import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  StringSelectMenuBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../../types';
import { config } from '../../config/env';
import databaseService from '../../services/database.service';
import { errorEmbed } from '../../utils/embed.builder';
import { taskCategoryLabels, taskCustomIds } from '../../utils/task.constants';

const command: Command = {
  data: new SlashCommandBuilder().setName('show-all').setDescription('Reveal or view all submissions for a task'),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({ embeds: [errorEmbed('This command must be used in a server')], ephemeral: true });
      return;
    }

    const memberRoles = 'roles' in interaction.member ? interaction.member.roles : null;
    const isAdmin = Boolean(memberRoles && 'cache' in memberRoles && memberRoles.cache.has(config.ADMIN_ROLE_ID));
    const tasks = isAdmin ? await databaseService.getAllTasks() : await databaseService.getRevealedTasks();

    if (tasks.length === 0) {
      await interaction.reply({ embeds: [errorEmbed('No visible task submissions are available')], ephemeral: true });
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(taskCustomIds.showAllSelect)
      .setPlaceholder('Select a task')
      .addOptions(
        tasks.slice(0, 25).map((task) => ({
          label: task.name.slice(0, 100),
          description: `${taskCategoryLabels[task.category]}${task.revealed ? '' : ' • reveal'}`,
          value: task.id.toString(),
        }))
      );

    await interaction.reply({
      content: isAdmin
        ? 'Select a task to reveal and show its submissions.'
        : 'Select a revealed task to show its submissions.',
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
      ephemeral: true,
    });
  },
};

export default command;
```

- [ ] **Step 3: Replace show-all select stub with full implementation**

In `src/components/task-interactions.ts`, replace the temporary `handleShowAllSelect` function with:

```ts
async function handleShowAllSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.guild || !interaction.member) {
    await interaction.update({ content: 'This command must be used in a server.', components: [] });
    return;
  }

  const taskId = Number(interaction.values[0]);
  const task = await databaseService.getTask(taskId);

  if (!task) {
    await interaction.update({ content: 'Task not found.', components: [] });
    return;
  }

  const memberRoles = 'roles' in interaction.member ? interaction.member.roles : null;
  const isAdmin = Boolean(memberRoles && 'cache' in memberRoles && memberRoles.cache.has(config.ADMIN_ROLE_ID));

  if (!task.revealed && !isAdmin) {
    await interaction.update({ content: 'Submissions for this task are not revealed yet.', components: [] });
    return;
  }

  const visibleTask = task.revealed ? task : await databaseService.revealTask(task.id);
  const submissions = await databaseService.getTaskSubmissions(task.id);

  const embed = new EmbedBuilder()
    .setTitle(`Submissions: ${visibleTask?.name ?? task.name}`)
    .setColor(0x9b59b6)
    .setDescription(submissions.length ? null : 'No submissions yet.')
    .setTimestamp();

  for (const submission of submissions.slice(0, 20)) {
    embed.addFields({
      name: submission.username,
      value: submission.content.slice(0, 1024),
    });
  }

  await interaction.update({
    content: task.revealed ? 'Submissions are visible.' : 'Task submissions are now revealed.',
    embeds: [embed],
    components: [],
  });
}
```

- [ ] **Step 4: Run typecheck**

Run: `npm run build`

Expected: PASS after fixing any interaction member type issues.

- [ ] **Step 5: Commit**

```bash
git add src/commands/tasks/task-status.ts src/commands/tasks/show-all.ts src/components/task-interactions.ts
git commit -m "feat: add task status and reveal flow"
```

### Task 5: Register commands and interaction routing

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Import task commands and handlers**

In `src/index.ts`, add imports near existing command imports:

```ts
import taskIssue from './commands/tasks/issue-task';
import taskSubmit from './commands/tasks/submit';
import taskStatus from './commands/tasks/task-status';
import taskShowAll from './commands/tasks/show-all';
import { handleTaskModalInteraction, handleTaskSelectInteraction } from './components/task-interactions';
```

- [ ] **Step 2: Register task commands**

In the `commands` array, after `adminFix`, add:

```ts
  taskIssue,
  taskSubmit,
  taskStatus,
  taskShowAll,
```

- [ ] **Step 3: Route modal and select menu interactions**

In the `interactionCreate` handler, after the button branch, add modal and select branches:

```ts
    } else if (interaction.isStringSelectMenu()) {
      await handleTaskSelectInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleTaskModalInteraction(interaction);
```

The final branch order should be command, button, string select, modal submit.

- [ ] **Step 4: Run typecheck**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Run tests**

Run: `npm test -- --runInBand`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/index.ts
git commit -m "feat: register task commands"
```

### Task 6: Manual Discord verification

**Files:**
- Runtime verification only

- [ ] **Step 1: Configure local env**

Ensure `.env` contains real values for:

```dotenv
ADMIN_ROLE_ID=<admin role id>
TASK_ADMIN_CHANNEL_ID=<admin notification channel id>
TASK_ROLE_PWN=<pwn role id>
TASK_ROLE_REV=<rev role id>
TASK_ROLE_CRYPTO=<crypto role id>
TASK_ROLE_ALL=<all-task role id>
```

- [ ] **Step 2: Start bot**

Run: `npm run build && npm start`

Expected: bot logs in and slash commands refresh successfully.

- [ ] **Step 3: Verify admin issue flow**

In Discord as an admin-role user:

1. Run `/issue-task name: ret2win category: pwn`.
2. Enter requirement text in the modal.
3. Confirm a new thread appears under the current channel.
4. Confirm the thread contains a task embed and mentions the pwn task role.

Expected: task is stored and the command responds with success.

- [ ] **Step 4: Verify permission guard**

In Discord as a non-admin user:

1. Run `/issue-task`.
2. Run `/task-status`.

Expected: both commands respond ephemerally with no-permission errors.

- [ ] **Step 5: Verify submission flow**

In Discord as a member:

1. Run `/submit`.
2. Pick the task from the dropdown.
3. Enter a link or description in the modal.

Expected: current channel receives `<user> has submitted for task ...`, user gets an ephemeral success, and `TASK_ADMIN_CHANNEL_ID` receives an embed with the submission content.

- [ ] **Step 6: Verify resubmission history behavior**

In Discord as the same member:

1. Run `/submit` for the same task again.
2. Enter updated content.
3. Run the database test or inspect with a SQLite client.

Expected: `task_submissions` has one latest row for that user/task and `task_submission_history` contains the previous content.

- [ ] **Step 7: Verify status and reveal flow**

In Discord as admin:

1. Run `/task-status`.
2. Confirm the submitted member appears under the task.
3. Run `/show-all` and select the unrevealed task.

Expected: admin sees all submissions and the task is marked revealed.

- [ ] **Step 8: Verify member show-all after reveal**

In Discord as a non-admin member:

1. Run `/show-all`.
2. Select the revealed task.

Expected: member sees all submissions for that task.

- [ ] **Step 9: Final verification**

Run: `git status --short && npm run build && npm test -- --runInBand`

Expected: only intentional files are modified; build and tests pass.

---

## Self-Review

- Spec coverage: The plan covers role guard, issue command with modal, thread creation and role mention, submit command with dropdown and modal, channel/admin notifications, admin-only task status, admin reveal via show-all, member show-all after reveal, SQLite persistence, and resubmission history.
- Placeholder scan: No TBD/TODO placeholders remain. Each code step includes concrete content and paths.
- Type consistency: Task category, task DTO, custom ID, database method, command, and handler names are consistent across tasks.

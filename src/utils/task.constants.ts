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

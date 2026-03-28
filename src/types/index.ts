import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

// Environment configuration types
export interface EnvConfig {
  SERVER_ID: string;
  BOT_TOKEN: string;
  VIEW_ALL_CTF_ROLEID: string;
  VERIFIED_ROLE_ID: string;
  LOG_CHANNELID?: string;
  DENY_CTF_ROLEID?: string;
}

// CTF Database types
export interface CTFData {
  ctftimeid: number;
  role: string;
  cate: string;
  name: string;
  infom: string;
  channel: string;
  endtime: number;
  archived: boolean;
}

// CTFtime API response types
export interface CTFTimeEvent {
  id: number;
  title: string;
  url: string;
  logo: string;
  weight: number;
  format: string;
  ctftime_url: string;
  description: string;
  start: string; // ISO 8601 format
  finish: string; // ISO 8601 format
  duration: {
    hours: number;
    days: number;
  };
  onsite: boolean;
  location: string;
  restrictions: string;
}

export interface CTFTimeEventsResponse extends Array<CTFTimeEvent> {}

// CTF Service return types
export interface CTFInfo {
  title: string;
  startTime: number;
  endTime: number;
  embedData: CTFEmbedData;
}

export interface CTFEmbedData {
  title: string;
  description: string;
  url?: string;
  color: number;
  thumbnail?: string;
  footer?: string;
  fields: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
}

export interface UpcomingCTFsResult {
  embed: CTFEmbedData;
  totalPages: number;
}

export interface OngoingCTFsResult {
  embed: CTFEmbedData;
}

export interface ListCTFsResult {
  embed: CTFEmbedData;
  totalPages: number;
}

// Command types
export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

// Button interaction custom IDs
export enum ButtonAction {
  UPCO_NEXT = 'upco_next',
  UPCO_PREV = 'upco_prev',
  LIST_NEXT = 'list_next',
  LIST_PREV = 'list_prev',
  ONGO_SHOW_ALL = 'ongo_show_all',
  ONGO_HIDE_LONG = 'ongo_hide_long',
  DELETE_ALL = 'delete_all',
  DELETE_KEEP = 'delete_keep',
  DELETE_CANCEL = 'delete_cancel',
}

// Pagination data for button interactions
export interface PaginationData {
  page: number;
  step: number;
  totalPages: number;
  order?: string;
}

// Logger levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

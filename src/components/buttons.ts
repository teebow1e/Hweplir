import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  Guild,
  TextChannel,
} from 'discord.js';
import ctftimeService from '../services/ctftime.service';
import databaseService from '../services/database.service';
import discordService from '../services/discord.service';
import { createEmbed, successEmbed } from '../utils/embed.builder';
import logger from '../utils/logger';
import { config } from '../config/env';

/**
 * Buttons for showing/hiding long ongoing CTFs
 */
export class ShowOngoButtons extends ActionRowBuilder<ButtonBuilder> {
  constructor() {
    super();
    this.addComponents(
      new ButtonBuilder()
        .setCustomId('ongo_show_all')
        .setLabel('Xem tất cả')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('👁')
    );
  }
}

/**
 * Buttons for hiding long ongoing CTFs
 */
export class HideOngoButtons extends ActionRowBuilder<ButtonBuilder> {
  constructor() {
    super();
    this.addComponents(
      new ButtonBuilder()
        .setCustomId('ongo_hide_long')
        .setLabel('Ẩn CTF >5 ngày')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌')
    );
  }
}

/**
 * Pagination buttons for upcoming CTFs
 */
export class UpcomingPaginationButtons extends ActionRowBuilder<ButtonBuilder> {
  constructor(
    private currentPage: number,
    private step: number,
    private totalPages: number
  ) {
    super();

    const prevButton = new ButtonBuilder()
      .setCustomId(`upco_prev_${currentPage}_${step}`)
      .setLabel('<')
      .setStyle(currentPage === 0 ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setDisabled(currentPage === 0);

    const nextButton = new ButtonBuilder()
      .setCustomId(`upco_next_${currentPage}_${step}`)
      .setLabel('>')
      .setStyle(currentPage === totalPages - 1 ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setDisabled(currentPage === totalPages - 1);

    this.addComponents(prevButton, nextButton);
  }
}

/**
 * Pagination buttons for CTF list
 */
export class ListPaginationButtons extends ActionRowBuilder<ButtonBuilder> {
  constructor(
    private order: string,
    private currentPage: number,
    private step: number,
    private totalPages: number
  ) {
    super();

    const prevButton = new ButtonBuilder()
      .setCustomId(`list_prev_${order}_${currentPage}_${step}`)
      .setLabel('<')
      .setStyle(currentPage === 0 ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setDisabled(currentPage === 0);

    const nextButton = new ButtonBuilder()
      .setCustomId(`list_next_${order}_${currentPage}_${step}`)
      .setLabel('>')
      .setStyle(currentPage === totalPages - 1 ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setDisabled(currentPage === totalPages - 1);

    this.addComponents(prevButton, nextButton);
  }
}

/**
 * Confirmation buttons for deleting CTF
 */
export class DeleteConfirmButtons extends ActionRowBuilder<ButtonBuilder> {
  constructor(
    private ctfName: string,
    private ctfKey: string,
    private guild: Guild
  ) {
    super();

    const deleteAllButton = new ButtonBuilder()
      .setCustomId(`delete_all_${ctfKey}`)
      .setLabel('Xoá tất cả')
      .setStyle(ButtonStyle.Primary);

    const keepChannelsButton = new ButtonBuilder()
      .setCustomId(`delete_keep_${ctfKey}`)
      .setLabel('Giữ lại channel')
      .setStyle(ButtonStyle.Primary);

    const cancelButton = new ButtonBuilder()
      .setCustomId(`delete_cancel_${ctfKey}`)
      .setLabel('Huỷ')
      .setStyle(ButtonStyle.Secondary);

    this.addComponents(deleteAllButton, keepChannelsButton, cancelButton);
  }
}

/**
 * Handle button interactions
 */
export async function handleButtonInteraction(interaction: ButtonInteraction) {
  const customId = interaction.customId;

  try {
    // Handle ongoing CTF buttons
    if (customId === 'ongo_show_all') {
      await interaction.deferUpdate();
      const result = await ctftimeService.getOngoingCTF(false);
      if (result) {
        const embed = createEmbed(result.embed);
        await interaction.editReply({ embeds: [embed], components: [new HideOngoButtons()] });
      }
      return;
    }

    if (customId === 'ongo_hide_long') {
      await interaction.deferUpdate();
      const result = await ctftimeService.getOngoingCTF(true);
      if (result) {
        const embed = createEmbed(result.embed);
        await interaction.editReply({ embeds: [embed], components: [new ShowOngoButtons()] });
      }
      return;
    }

    // Handle upcoming CTF pagination
    if (customId.startsWith('upco_prev_') || customId.startsWith('upco_next_')) {
      await interaction.deferUpdate();
      const parts = customId.split('_');
      const currentPage = parseInt(parts[2]);
      const step = parseInt(parts[3]);
      const newPage = customId.startsWith('upco_prev_') ? currentPage - 1 : currentPage + 1;

      const result = await ctftimeService.getUpcomingCTF(newPage, step);
      if (result) {
        const embed = createEmbed(result.embed);
        await interaction.editReply({
          embeds: [embed],
          components: [new UpcomingPaginationButtons(newPage, step, result.totalPages)],
        });
      }
      return;
    }

    // Handle CTF list pagination
    if (customId.startsWith('list_prev_') || customId.startsWith('list_next_')) {
      await interaction.deferUpdate();
      const parts = customId.split('_');
      const order = parts[2] as 'Mới nhất' | 'Cũ nhất';
      const currentPage = parseInt(parts[3]);
      const step = parseInt(parts[4]);
      const newPage = customId.startsWith('list_prev_') ? currentPage - 1 : currentPage + 1;

      const result = await ctftimeService.getListCTF(order, newPage, step);
      if (result) {
        const embed = createEmbed(result.embed);
        await interaction.editReply({
          embeds: [embed],
          components: [new ListPaginationButtons(order, newPage, step, result.totalPages)],
        });
      }
      return;
    }

    // Handle delete confirmation buttons
    if (customId.startsWith('delete_all_') || customId.startsWith('delete_keep_') || customId.startsWith('delete_cancel_')) {
      const parts = customId.split('_');
      const action = parts[1]; // 'all', 'keep', or 'cancel'
      const ctfKey = parts.slice(2).join('_'); // Rejoin in case key contains underscores

      if (action === 'cancel') {
        await interaction.update({
          embeds: [successEmbed('Đã huỷ')],
          components: [],
        });
        return;
      }

      if (!interaction.guild) return;

      const ctfData = await databaseService.deleteCTF(ctfKey);

      // Delete role
      const role = interaction.guild.roles.cache.get(ctfData.role);
      if (role) {
        await role.delete();
      }

      if (action === 'all') {
        // Delete entire category and channels
        await discordService.deleteCTFCategory(interaction.guild, ctfData.cate);
        await interaction.update({
          embeds: [successEmbed(`Toàn bộ dữ liệu của <***${ctfData.name}***> đã bị xoá`)],
          components: [],
        });

        if (config.LOG_CHANNELID) {
          const logChannel = interaction.guild.channels.cache.get(config.LOG_CHANNELID) as TextChannel;
          if (logChannel) {
            await logChannel.send(`${interaction.user.username} has deleted <***${ctfData.name}***>`);
          }
        }

        logger.info(`User ${interaction.user.tag} deleted CTF (all): ${ctfData.name}`);
      } else if (action === 'keep') {
        // Unlist category but keep channels
        await discordService.unlistCTFCategory(interaction.guild, ctfData.cate);
        await interaction.update({
          embeds: [successEmbed(`<***${ctfData.name}***> đã bị bỏ khỏi list`)],
          components: [],
        });

        if (config.LOG_CHANNELID) {
          const logChannel = interaction.guild.channels.cache.get(config.LOG_CHANNELID) as TextChannel;
          if (logChannel) {
            await logChannel.send(
              `${interaction.user.username} has unlinked <***${ctfData.name}***> from the database`
            );
          }
        }

        logger.info(`User ${interaction.user.tag} deleted CTF (keep channels): ${ctfData.name}`);
      }
    }
  } catch (error) {
    logger.error('Error handling button interaction:', error);
  }
}

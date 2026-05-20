import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../types';
import { errorEmbed, successEmbed, warningEmbed } from '../../utils/embed.builder';
import { requireRole } from '../../utils/role.guard';
import { config } from '../../config/env';
import githubService from '../../services/github.service';
import logger from '../../utils/logger';

const GITHUB_LOGIN_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('invite-repo-wu-gcsb')
    .setDescription('Invite a GitHub user as a collaborator to the configured writeup repo')
    .addStringOption((option) =>
      option
        .setName('github_username')
        .setDescription('Your GitHub username (e.g. octocat)')
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        embeds: [errorEmbed('This command must be used in a server')],
        ephemeral: true,
      });
      return;
    }

    if (!(await requireRole(interaction, config.VERIFIED_ROLE_ID))) {
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const username = (interaction.options.getString('github_username', true) ?? '').trim();

    if (!GITHUB_LOGIN_RE.test(username)) {
      await interaction.editReply({
        embeds: [
          errorEmbed(
            'Invalid GitHub username. Logins are alphanumeric + hyphens, up to 39 characters, and cannot start with a hyphen.'
          ),
        ],
      });
      return;
    }

    const repoLabel = `${config.GH_INVITE_REPO_OWNER}/${config.GH_INVITE_REPO_NAME}`;
    const result = await githubService.inviteCollaborator(username, 'push');

    if (result.kind === 'invited') {
      await interaction.editReply({
        embeds: [
          successEmbed(
            `Đã gửi lời mời cộng tác cho **${username}** vào \`${repoLabel}\` (push). Kiểm tra email hoặc https://github.com/notifications để chấp nhận.`
          ),
        ],
      });
      logger.info(
        `User ${interaction.user.tag} invited ${username} to ${repoLabel} (invitation ${result.invitationId})`
      );
      return;
    }

    if (result.kind === 'already_collaborator') {
      await interaction.editReply({
        embeds: [
          warningEmbed(
            'Đã là collaborator',
            `**${username}** đã có quyền truy cập \`${repoLabel}\` rồi.`
          ),
        ],
      });
      logger.info(`User ${interaction.user.tag} re-invited existing collaborator ${username}`);
      return;
    }

    let friendly: string;
    switch (result.status) {
      case 404:
        friendly = `Không tìm thấy GitHub user **${username}** (hoặc bot không có quyền với repo \`${repoLabel}\`).`;
        break;
      case 422:
        friendly = `GitHub từ chối yêu cầu cho **${username}**: ${result.message}`;
        break;
      case 403:
        friendly = `Bot không đủ quyền để mời collaborator vào \`${repoLabel}\`. Kiểm tra lại GITHUB_TOKEN.`;
        break;
      case 401:
        friendly = 'GITHUB_TOKEN không hợp lệ hoặc đã hết hạn.';
        break;
      default:
        friendly = `Lời mời thất bại (HTTP ${result.status}): ${result.message}`;
    }

    await interaction.editReply({ embeds: [errorEmbed(friendly)] });
  },
};

export default command;

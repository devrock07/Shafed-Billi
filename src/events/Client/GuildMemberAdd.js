const { EmbedBuilder } = require("discord.js");
const AutoRole = require("../../schema/autorole");

module.exports = {
  name: "guildMemberAdd",
  run: async (client, member) => {
    if (!member || !member.guild) return;
    
    try {
      const autoRoleData = await AutoRole.findOne({ guildId: member.guild.id });
      if (autoRoleData && autoRoleData.roles.length > 0) {
        for (const roleId of autoRoleData.roles) {
          const role = member.guild.roles.cache.get(roleId);
          if (role) {
            await member.roles.add(role).catch(() => {});
          }
        }
      }
    } catch (error) {
      console.error("Error in guildMemberAdd event:", error);
    }
  },
};

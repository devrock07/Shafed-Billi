const PremiumRole = require("../schema/premiumrole");
const PremiumUser = require("../schema/premiumuser");

/**
 * Checks if a user has premium status (Owner, Global Premium User, or Guild Premium Role).
 * @param {Object} client - The Discord.js client.
 * @param {Object} user - The user object (from message.author or interaction.user).
 * @param {Object} guild - The guild object where the command is being run.
 * @returns {Promise<boolean>} - True if the user has premium status.
 */
async function checkPremium(client, user, guild) {
    // 1. Check if user is an owner
    const isOwner = Array.isArray(client.config.ownerID) && client.config.ownerID.includes(user.id);
    if (isOwner) return true;

    // 2. Check if user is a global premium user
    const globalPremium = await PremiumUser.findOne({
        userId: user.id,
        premium: true,
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
        ]
    }).catch(() => null);
    if (globalPremium) return true;

    // 3. Check if user has the guild's premium role (if in a guild)
    if (guild) {
        const entry = await PremiumRole.findOne({ Guild: guild.id }).catch(() => null);
        if (entry) {
            const member = await guild.members.fetch(user.id).catch(() => null);
            if (member && member.roles.cache.has(entry.RoleId)) {
                return true;
            }
        }
    }

    return false;
}

module.exports = { checkPremium };

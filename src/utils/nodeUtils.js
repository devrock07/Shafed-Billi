/**
 * Waits for at least one Lavalink node to be in CONNECTED state
 * @param {Object} manager - The Kazagumo manager instance
 * @param {number} maxWaitTime - Maximum time to wait in milliseconds (default: 5000)
 * @returns {Promise<boolean>} - True if a node is connected, false otherwise
 */
async function waitForNodeConnection(manager, maxWaitTime = 5000) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
        const connectedNodes = [...manager.shoukaku.nodes.values()].filter(node => node.state === 2);

        if (connectedNodes.length > 0) {
            return true;
        }

        // Wait 100ms before checking again
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return false;
}

/**
 * Checks if any Lavalink nodes are available (connecting or connected)
 * @param {Object} manager - The Kazagumo manager instance
 * @returns {boolean} - True if nodes are available
 */
function hasAvailableNodes(manager) {
    const availableNodes = [...manager.shoukaku.nodes.values()].filter(
        node => node.state === 1 || node.state === 2
    );
    return availableNodes.length > 0;
}

/**
 * Gets the first available Lavalink node
 * @param {Object} manager - The Kazagumo manager instance
 * @returns {Object|null} - The node object or null
 */
function getAvailableNode(manager) {
    const nodes = [...manager.shoukaku.nodes.values()].filter(
        node => node.state === 1 || node.state === 2
    );
    return nodes.length > 0 ? nodes[0] : null;
}

module.exports = {
    waitForNodeConnection,
    hasAvailableNodes,
    getAvailableNode
};

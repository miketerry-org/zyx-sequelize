// closeLog.js:

"use strict";

// load all necessary modules
const system = require("zyx-system");
const winston = require("winston");

/**
 * Gracefully closes a Winston logger connected to PostgreSQL via Sequelize.
 *
 * @param {winston.Logger} logger - The logger instance returned by createLog.
 * @returns {Promise<void>}
 */
async function closeLog(logger) {
  if (!logger || typeof logger.close !== "function") {
    system.log.warn("closeLog: Invalid or missing logger instance.");
    return;
  }

  try {
    const closePromises = [];

    for (const transport of logger.transports) {
      // If custom transport has a close method, use it
      if (typeof transport.close === "function") {
        closePromises.push(
          new Promise((resolve, reject) => {
            transport.close(err => (err ? reject(err) : resolve()));
          })
        );
      }

      // Close Sequelize connection if available
      if (transport.LogModel && transport.LogModel.sequelize) {
        const sequelize = transport.LogModel.sequelize;
        closePromises.push(sequelize.close());
      }
    }

    await Promise.all(closePromises);

    system.log.info("PostgreSQL logger transport(s) closed.");
  } catch (err) {
    system.log.error(`Error closing PostgreSQL logger: ${err.message}`);
  }
}

module.exports = closeLog;

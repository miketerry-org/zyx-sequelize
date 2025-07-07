// closeDB.js

"use strict";

// load all necessary modules
const system = require("zyx-system");

/**
 * Gracefully closes a Sequelize database connection.
 * @param {Sequelize} sequelizeInstance - The Sequelize instance to close.
 * @returns {Promise<void>}
 */
async function closeDB(sequelizeInstance) {
  if (!sequelizeInstance || typeof sequelizeInstance.close !== "function") {
    system.log.warn("closeDB: Invalid or missing Sequelize instance.");
    return;
  }

  try {
    await sequelizeInstance.close();
    system.log.info("Sequelize database connection closed.");
  } catch (err) {
    system.log.error(
      `Error closing Sequelize database connection: ${err.message}`
    );
  }
}

module.exports = closeDB;

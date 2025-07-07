// createDB.js: create DB connection to postgress using sequelize

"use strict";

// load all necessary modules
const { Sequelize } = require("sequelize");
const system = require("zyx-system");
const Schema = require("zyx-schema");

// Destructure schema types needed by validation
const { stringType, integerType } = Schema.types;

/**
 * Drops all tables in the connected PostgreSQL database using Sequelize.
 * Used during testing to ensure a clean database state.
 * @param {Sequelize} sequelize - The Sequelize instance.
 */
async function dropAllTables(sequelize) {
  try {
    await sequelize.drop();
    system.log.info("All tables dropped successfully.");
  } catch (err) {
    system.log.warn(`Failed to drop tables: ${err.message}`);
  }
}

/**
 * Asynchronously creates a PostgreSQL connection using Sequelize.
 * @param {Object} tenant - A tenant object containing connection details:
 *   { host, port, database, username, password }
 * @returns {Promise<Sequelize>} - Resolves with the Sequelize instance.
 * @throws {Error} - Throws if validation fails or connection cannot be established.
 */
async function createDB(tenant) {
  const { validated, errors } = new Schema({
    host: stringType({ min: 1, max: 255, required: true }),
    port: integerType({ min: 1, max: 65535, required: true }),
    database: stringType({ min: 1, max: 255, required: true }),
    username: stringType({ min: 1, max: 255, required: true }),
    password: stringType({ min: 0, max: 255, required: true }), // password can be empty
  }).validate(tenant);

  if (errors.length > 0) {
    throw new Error(errors.map(e => e.message).join(", "));
  }

  // destructure the database connection values
  const { host, port, database, username, password } = validated;

  const sequelize = new Sequelize(database, username, password, {
    host,
    port,
    dialect: "postgres",
    logging: system.isDebugging ? msg => system.log.info(msg) : false,
    dialectOptions: {
      connectTimeout: 10000,
    },
  });

  try {
    await sequelize.authenticate();

    if (system.isDebugging) {
      system.log.info(`Database connected to "${host}:${port}/${database}"`);
    }

    if (system.isTesting) {
      await dropAllTables(sequelize);
    }

    return sequelize;
  } catch (err) {
    if (system.isDebugging) {
      system.log.error(
        `Database connection error: (${host}:${port}/${database}) ${err.message}`
      );
    }
    throw new Error(`Failed to connect to database: ${err.message}`);
  }
}

module.exports = createDB;

// creteLog.js:

"use strict";

const { Sequelize, DataTypes, Op } = require("sequelize");
const winston = require("winston");
const system = require("zyx-system");
const Schema = require("zyx-schema");

const { stringType, integerType, booleanType } = Schema.types;

/**
 * Custom Winston transport that logs to PostgreSQL using Sequelize
 */
class PostgresTransport extends winston.Transport {
  constructor(options) {
    super(options);
    this.LogModel = options.LogModel;
  }

  async log(info, callback) {
    setImmediate(() => this.emit("logged", info));

    try {
      await this.LogModel.create({
        level: info.level,
        message: info.message,
        meta: JSON.stringify(info.meta || {}),
        timestamp: new Date(info.timestamp || Date.now()),
      });
    } catch (err) {
      console.error("Failed to log to PostgreSQL:", err);
    }

    callback();
  }
}

/**
 * Creates and configures a Winston logger that logs to PostgreSQL via Sequelize
 */
async function createLog(tenant) {
  const { validated, errors } = new Schema({
    db_url: stringType({ min: 1, max: 255, required: true }),
    log_collection_name: stringType({ min: 1, max: 255, required: true }),
    log_expiration_days: integerType({ min: 1, max: 365, required: false }),
  }).validate(tenant);

  if (errors.length > 0) {
    throw new Error(errors.map(e => e.message).join(", "));
  }

  const { db_url, log_collection_name, log_expiration_days } = validated;

  try {
    const sequelize = new Sequelize(db_url, {
      logging: false,
    });

    const LogModel = sequelize.define(
      log_collection_name,
      {
        id: {
          type: DataTypes.BIGINT,
          primaryKey: true,
          autoIncrement: true,
        },
        level: {
          type: DataTypes.STRING,
        },
        message: {
          type: DataTypes.TEXT,
        },
        meta: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        timestamp: {
          type: DataTypes.DATE,
          defaultValue: Sequelize.NOW,
        },
      },
      {
        tableName: log_collection_name,
        timestamps: false,
      }
    );

    // Sync the model (create table if not exists)
    await LogModel.sync();

    if (system.isDebugging) {
      system.debug(`Log table "${log_collection_name}" is ready`);
    }

    // TTL behavior (manual - you'd need a cleanup job elsewhere)
    if (log_expiration_days && system.isDebugging) {
      system.debug(
        `NOTE: Expired log cleanup must be handled separately (older than ${log_expiration_days} days)`
      );
    }

    // Create the Winston logger
    const logger = winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
        new PostgresTransport({ LogModel }),
      ],
    });

    if (system.isDebugging) {
      system.log.info(`Logger created for PostgreSQL: "${db_url}"`);
    }

    return logger;
  } catch (err) {
    if (system.isDebugging) {
      system.debug(err.message);
      system.log.error(err.message);
    }
    throw new Error(err.message);
  }
}

module.exports = createLog;

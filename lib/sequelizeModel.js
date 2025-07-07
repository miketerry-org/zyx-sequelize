// SequelizeModel.js:

"use strict";

// load all necessary modules
const { BaseModel } = require("zyx-base");

/**
 * A base model for Sequelize models integrated with tenant-aware databases.
 * Wraps core Sequelize operations (CRUD) in a consistent API.
 *
 * Subclasses must override the `schema()` method to define Sequelize model attributes.
 *
 * @abstract
 * @class
 * @extends BaseModel
 */
class SequelizeModel extends BaseModel {
  /** @type {import('sequelize').Model} */
  #underlyingModel;

  /**
   * Constructs a new tenant-scoped Sequelize model.
   *
   * @param {object} tenant - The tenant object containing a connected Sequelize `db` instance.
   * @throws {Error} If the schema is not implemented in the subclass.
   */
  constructor(tenant) {
    super(tenant);

    const attributes = this.schema();
    const options = this.options?.() || {};

    if (!attributes || typeof attributes !== "object") {
      throw new Error(
        `Missing or invalid schema in "${this.constructor.name}". Subclasses must override schema().`
      );
    }

    const modelName = this.name;

    if (tenant.db.models[modelName]) {
      this.#underlyingModel = tenant.db.models[modelName];
    } else {
      this.#underlyingModel = tenant.db.define(modelName, attributes, options);
    }
  }

  /**
   * Subclasses must override this to define Sequelize model attributes.
   *
   * @abstract
   * @returns {object} - Sequelize model definition (attributes).
   */
  schema() {
    throw new Error(
      `Model schema() not implemented for class "${this.constructor.name}"`
    );
  }

  /**
   * Optional: override this to define Sequelize model options.
   *
   * @returns {object} Sequelize model options
   */
  options() {
    return {};
  }

  /**
   * Returns the raw Sequelize model.
   *
   * @returns {import('sequelize').Model}
   */
  get underlyingModel() {
    return this.#underlyingModel;
  }

  /**
   * Finds records matching a query.
   *
   * @param {object} [query={}] - Sequelize "where" condition.
   * @param {object} [projection={}] - Attributes to select (Sequelize `attributes`).
   * @returns {Promise<Array<object>>}
   */
  async find(query = {}, projection = {}) {
    return this.#underlyingModel.findAll({
      where: query,
      attributes: Object.keys(projection).length ? projection : undefined,
    });
  }

  /**
   * Finds a single record matching a query.
   *
   * @param {object} [query={}] - Sequelize "where" condition.
   * @returns {Promise<object|null>}
   */
  async findOne(query = {}) {
    return this.#underlyingModel.findOne({ where: query });
  }

  /**
   * Finds a record by its ID.
   *
   * @param {string|number} id - The primary key.
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    return this.#underlyingModel.findByPk(id);
  }

  /**
   * Creates a new record.
   *
   * @param {object} data - The data to create the record with.
   * @returns {Promise<object>}
   */
  async create(data) {
    return this.#underlyingModel.create(data);
  }

  /**
   * Updates a record by its ID.
   *
   * @param {string|number} id - The primary key.
   * @param {object} updates - The update values.
   * @returns {Promise<object|null>}
   */
  async updateById(id, updates) {
    const record = await this.findById(id);
    if (!record) return null;

    await record.update(updates);
    return record;
  }

  /**
   * Deletes a record by its ID.
   *
   * @param {string|number} id - The primary key.
   * @returns {Promise<object|null>} - The deleted record.
   */
  async deleteById(id) {
    const record = await this.findById(id);
    if (!record) return null;

    await record.destroy();
    return record;
  }
}

module.exports = SequelizeModel;

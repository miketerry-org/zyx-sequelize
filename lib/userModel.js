// userModel.js:

"use strict";

const { DataTypes, Model, Op } = require("sequelize");
const bcrypt = require("bcrypt");
const system = require("zyx-system");
const SequelizeModel = require("./sequelizeModel");

// Constants
const SALT_ROUNDS = 12;
const CODE_EXPIRATION_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;
const ACCOUNT_LOCK_DURATION_MS = 15 * 60 * 1000;

// Utility: Generate ###-### format code
function generateCode() {
  const part1 = Math.floor(100 + Math.random() * 900).toString();
  const part2 = Math.floor(100 + Math.random() * 900).toString();
  return `${part1}-${part2}`;
}

class User extends Model {
  // Instance methods
  async verifyPassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.passwordHash);
  }

  isAccountLocked() {
    return this.lockUntil && this.lockUntil > new Date();
  }

  resetLock() {
    this.failedLoginAttempts = 0;
    this.lockUntil = null;
  }

  incrementLoginAttempts() {
    this.failedLoginAttempts += 1;
    if (this.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      this.lockUntil = new Date(Date.now() + ACCOUNT_LOCK_DURATION_MS);
    }
  }

  generateVerifyCode() {
    const code = generateCode();
    this.verifyCode = code;
    this.verifyCodeExpiresAt = new Date(
      Date.now() + CODE_EXPIRATION_MINUTES * 60 * 1000
    );
    return code;
  }

  generateResetCode() {
    const code = generateCode();
    this.resetCode = code;
    this.resetCodeExpiresAt = new Date(
      Date.now() + CODE_EXPIRATION_MINUTES * 60 * 1000
    );
    return code;
  }
}

function initUserModel(sequelize) {
  User.init(
    {
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM(...system.userRoles),
        defaultValue: system.userRoles[0],
        allowNull: false,
      },
      firstname: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      lastname: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      // Verification
      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      verifyCode: {
        type: DataTypes.STRING,
        validate: {
          is: /^\d{3}-\d{3}$/,
        },
      },
      verifyCodeExpiresAt: {
        type: DataTypes.DATE,
      },

      // Login tracking
      failedLoginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      lockUntil: {
        type: DataTypes.DATE,
      },

      // Password reset
      resetCode: {
        type: DataTypes.STRING,
        validate: {
          is: /^\d{3}-\d{3}$/,
        },
      },
      resetCodeExpiresAt: {
        type: DataTypes.DATE,
      },

      lastLoginAt: {
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      timestamps: true,
      hooks: {
        beforeSave: async user => {
          if (user.changed("passwordHash")) {
            const salt = await bcrypt.genSalt(SALT_ROUNDS);
            user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
          }
        },
      },
      indexes: [{ fields: ["email"] }, { fields: ["lockUntil"] }],
    }
  );

  return User;
}

// SequelizeModel wrapper class
class UserModel extends SequelizeModel {
  model(sequelize) {
    return initUserModel(sequelize);
  }

  async findByEmail(email) {
    if (typeof email !== "string") {
      throw new TypeError("Email must be a string");
    }

    return this.getModel().findOne({
      where: {
        email: email.trim().toLowerCase(),
      },
    });
  }
}

module.exports = UserModel;

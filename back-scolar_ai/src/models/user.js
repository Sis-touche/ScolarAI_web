const { DataTypes } = require('sequelize'); // ✅ CORRECTION : suppression de l'import inutile 'Op'
const bcrypt = require('bcrypt');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        msg: `L'email saisi est déjà utilisé, veuillez en saisir un autre.`
      },
      validate: {
        isEmail: {
          msg: "Le format de l'adresse email n'est pas valide."
        }
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [6, 100],
          msg: "Le mot de passe doit contenir au moins 6 caractères."
        }
      }
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'secretariat', 'user'),
      defaultValue: 'user'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    verificationToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    verificationTokenExpires: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',

    indexes: [
      {
        unique: true,
        fields: ['email']
      },
      {
        fields: ['role']
      },
      {
        fields: ['is_active']
      }
    ],

    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
        if (user.email) user.email = user.email.toLowerCase().trim();
        if (user.firstName) user.firstName = user.firstName.trim();
        if (user.lastName) user.lastName = user.lastName.trim();
      },

      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
        if (user.changed('email')) user.email = user.email.toLowerCase().trim();
      }
    }
  });

  // ==========================================
  // MÉTHODES STATIQUES
  // ==========================================

  // ✅ CORRECTION : renommage en countActiveUsers pour correspondre au filtre role: 'user'
  User.countActiveUsers = async function () {
    return await this.count({
      where: {
        role: 'user',
        isActive: true
      }
    });
  };

  // Méthode dédiée si vous avez besoin de compter les admins/secrétaires
  User.countByRole = async function (role) {
    return await this.count({
      where: {
        role,
        isActive: true
      }
    });
  };

  User.findByEmail = async function (email) {
    return await this.findOne({
      where: { email: email.toLowerCase().trim() }
    });
  };

  // ==========================================
  // MÉTHODES D'INSTANCE
  // ==========================================

  User.prototype.validatePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
  };

  User.prototype.updateLastLogin = async function () {
    return await this.update({ lastLogin: new Date() });
  };

  User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    return values;
  };

  return User;
};
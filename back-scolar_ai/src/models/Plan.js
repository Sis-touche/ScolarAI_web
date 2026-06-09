const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Plan = sequelize.define('Plan', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: "Le nom de l'offre ne peut pas être vide." }
      }
    },
    // ✅ CORRECTION : suppression de la validation isIn redondante avec ENUM
    type: {
      type: DataTypes.ENUM('TIME_BASED', 'CREDIT_BASED'),
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        isDecimal: true,
        min: { args: [0], msg: "Le prix ne peut pas être négatif." }
      }
    },
    scanLimit: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
      comment: 'Nombre de scans inclus. null = illimité (plans TIME_BASED sans plafond)'
    },
    durationDays: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
      comment: 'Durée de validité en jours. null si le plan est CREDIT_BASED'
    }
  }, {
    tableName: 'plans',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',

    indexes: [
      {
        fields: ['type']
      }
    ],

    hooks: {
      // ✅ CORRECTION : validation de la cohérence métier type / champs associés
      beforeValidate: (plan) => {
        if (plan.type === 'TIME_BASED' && !plan.durationDays) {
          throw new Error("Un plan TIME_BASED doit avoir une durée (durationDays) définie.");
        }
        if (plan.type === 'CREDIT_BASED' && !plan.scanLimit) {
          throw new Error("Un plan CREDIT_BASED doit avoir une limite de scans (scanLimit) définie.");
        }
      }
    }
  });

  return Plan;
};
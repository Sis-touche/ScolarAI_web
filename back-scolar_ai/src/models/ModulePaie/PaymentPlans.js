const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PaymentPlan = sequelize.define('PaymentPlan', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    subscription_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Lien vers la souscription globale'
    },
    invoice_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Facture parente de cette tranche'
    },
    installment_number: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      validate: {
        isInt: { msg: 'Le numero de la tranche doit etre un entier.' },
        min: { args: [1], msg: 'Le numero de tranche commence au minimum a 1.' }
      },
      comment: 'Position de la tranche (ex: 1 sur 3)'
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        isDecimal: true,
        min: { args: [0], msg: 'Montant negatif interdit.' }
      },
      comment: 'Montant de cette tranche'
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Date limite de paiement de cette tranche'
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'overdue'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Etat financier de cette tranche'
    }
  }, {
    tableName: 'payment_plans',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { name: 'idx_pp_subscription_id', fields: ['subscription_id'] },
      { name: 'idx_pp_invoice_id',      fields: ['invoice_id'] },
      { name: 'idx_pp_status',          fields: ['status'] },
      {
        name: 'unique_installment_per_subscription',
        unique: true,
        fields: ['subscription_id', 'installment_number']
      }
    ],
    hooks: {
      // ✅ AJOUT : recalcul automatique du statut de la facture parente après chaque changement de tranche
      afterUpdate: async (paymentPlan) => {
        if (!paymentPlan.changed('status')) return;

        try {
          const invoice = await sequelize.models.Invoice.findByPk(paymentPlan.invoice_id);
          if (!invoice) return;

          // Récupérer toutes les tranches de cette facture
          const allPlans = await sequelize.models.PaymentPlan.findAll({
            where: { invoice_id: paymentPlan.invoice_id }
          });

          const total = allPlans.length;
          const paid  = allPlans.filter(p => p.status === 'paid').length;

          let newInvoiceStatus;
          if (paid === 0) {
            newInvoiceStatus = 'pending';
          } else if (paid < total) {
            newInvoiceStatus = 'partial';  // Au moins une tranche payée, mais pas toutes
          } else {
            newInvoiceStatus = 'paid';     // Toutes les tranches soldées
          }

          // Mettre à jour la facture uniquement si le statut change réellement
          if (invoice.status !== newInvoiceStatus && invoice.status !== 'cancelled') {
            await invoice.update({ status: newInvoiceStatus });
          }
        } catch (err) {
          console.error('Erreur lors du recalcul du statut de la facture:', err);
        }
      }
    }
  });

  return PaymentPlan;
};
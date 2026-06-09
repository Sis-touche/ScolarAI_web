const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    payment_plan_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Lien vers la tranche de paiement que ce versement vient solder'
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Utilisateur ayant effectue ce paiement'
    },
    invoice_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Facture associee a ce paiement'
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        isDecimal: true,
        min: { args: [0], msg: 'Le montant ne doit pas etre negatif' }
      },
      comment: 'Montant de ce versement'
    },
    method: {
      type: DataTypes.ENUM('mobile_money', 'carte_bancaire', 'virement', 'especes'),
      allowNull: false,
      defaultValue: 'mobile_money',
      comment: 'Methode de paiement utilisee'
    },
    transaction_ref: {
      type: DataTypes.STRING(255),
      unique: {
        name: 'transaction_ref_unique',
        msg: 'La reference de la transaction doit etre unique'
      },
      allowNull: true,
      comment: 'Reference de transaction externe (ex: ID MVola / Orange Money)'
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'failed', 'refunded'),
      defaultValue: 'pending',
      allowNull: false
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date/heure de confirmation du paiement'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Remarques ou commentaires libres'
    }
  }, {
    tableName: 'payments',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { name: 'idx_transaction_ref',    fields: ['transaction_ref'] },
      { name: 'idx_payment_status',     fields: ['status'] },
      { name: 'idx_payment_plan_id',    fields: ['payment_plan_id'] },
      { name: 'idx_payment_user_id',    fields: ['user_id'] },
      { name: 'idx_payment_invoice_id', fields: ['invoice_id'] }
    ],
    hooks: {
      // Horodate automatiquement le paiement à la confirmation
      beforeSave: (payment) => {
        if (payment.changed('status') && payment.status === 'confirmed') {
          payment.paid_at = new Date();
        }
      },

      afterUpdate: async (payment) => {
        if (!payment.changed('status') || payment.status !== 'confirmed') return;

        console.log(`Paiement confirme. Generation du recu pour le paiement ID: ${payment.id}`);

        try {
          // ÉTAPE 1 : Marquer la tranche liée comme payée
          // Le hook afterUpdate de PaymentPlan prendra ensuite le relais
          // pour recalculer le statut de la Invoice parente automatiquement.
          const paymentPlan = await sequelize.models.PaymentPlan.findByPk(payment.payment_plan_id);
          if (!paymentPlan) return;

          await paymentPlan.update({ status: 'paid' });

          // ÉTAPE 2 : Activer la Subscription si c'est le premier versement confirmé
          // On récupère la souscription liée via la tranche
          const subscription = await sequelize.models.Subscription.findByPk(paymentPlan.subscription_id);

          if (subscription && subscription.status === 'pending') {
            // Le hook beforeUpdate de Subscription calcule startDate, endDate et remainingScans
            await subscription.update({ status: 'active' });
            console.log(`Souscription ${subscription.id} activee automatiquement.`);
          }

        } catch (err) {
          console.error('Erreur dans le hook afterUpdate de Payment:', err);
        }
      }
    }
  });

  // ==========================================
  // MÉTHODES STATIQUES
  // ==========================================

  Payment.findByStatus = async function (status) {
    return await this.findAll({ where: { status: status.trim() } });
  };

  Payment.getConfirmedPayments = async function () {
    return await this.findAll({ where: { status: 'confirmed' } });
  };

  return Payment;
};
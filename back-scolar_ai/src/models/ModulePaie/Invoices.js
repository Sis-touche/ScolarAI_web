const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Invoice = sequelize.define('Invoice', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    subscription_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Lien vers l\'abonnement global qui a genere cette facture'
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Utilisateur destinataire de la facture'
    },
    invoice_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        name: 'invoice_number_unique',
        msg: 'Le numero de facture doit etre unique'
      },
      validate: {
        notEmpty: { msg: 'Le numero de facture ne doit pas etre vide' }
      },
      comment: 'Numero de facture officiel (ex: INV-2025-06-A3F2)'
    },
    total_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        isDecimal: true,
        min: { args: [0], msg: 'Le montant ne peut pas etre negatif' }
      },
      comment: 'Montant total a payer pour tout l\'abonnement'
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Date limite de paiement'
    },
    status: {
      type: DataTypes.ENUM('pending', 'partial', 'paid', 'overdue', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    }
  }, {
    tableName: 'invoices',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { name: 'idx_invoice_number',       fields: ['invoice_number'] },
      { name: 'idx_invoice_status',       fields: ['status'] },
      { name: 'idx_invoice_subscription', fields: ['subscription_id'] },
      { name: 'idx_invoice_user_id',      fields: ['user_id'] }
    ],
    hooks: {
      // ✅ AJOUT : génération automatique du numéro de facture si absent
      beforeCreate: (invoice) => {
        if (!invoice.invoice_number) {
          const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
          const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
          invoice.invoice_number = `INV-${yearMonth}-${suffix}`;
        }
        if (!invoice.due_date) {
          const date = new Date();
          date.setDate(date.getDate() + 30);
          invoice.due_date = date;
        }
      },
      beforeValidate: (invoice) => {
        if (invoice.invoice_number) {
          invoice.invoice_number = invoice.invoice_number.trim().toUpperCase();
        }
      },
      afterUpdate: async (invoice) => {
        if (invoice.changed('status') && invoice.status === 'paid') {
          console.log(`Generation du PDF pour la facture ${invoice.invoice_number}`);
          // Script de compilation LaTeX/PDF ici
        }
      },
      // À ajouter dans le fichier PaymentPlan.js, dans le bloc `hooks: { ... }`
      afterDestroy: async (paymentPlan) => {
        try {
          const invoice = await sequelize.models.Invoice.findByPk(paymentPlan.invoice_id);
          if (!invoice) return;
          const allPlans = await sequelize.models.PaymentPlan.findAll({
            where: { invoice_id: paymentPlan.invoice_id }
          });
          const total = allPlans.length;
          const paid = allPlans.filter(p => p.status === 'paid').length;
          let newStatus;
          if (paid === 0) newStatus = 'pending';
          else if (paid < total) newStatus = 'partial';
          else newStatus = 'paid';
          if (invoice.status !== newStatus) {
            await invoice.update({ status: newStatus });
          }
        } catch (err) {
          console.error('Erreur dans afterDestroy de PaymentPlan:', err);
        }
      }
    }
  });

  // ==========================================
  // MÉTHODES STATIQUES
  // ==========================================

  Invoice.findByStatus = async function (status) {
    return await this.findAll({
      where: { status: status && status.trim() }
    });
  };

  Invoice.getAll = async function () {
    return await this.findAll({ order: [['invoice_number', 'ASC']] });
  };

  Invoice.searchByNumber = async function (invoice_number) {
    const { Op } = require('sequelize');
    return await this.findAll({
      where: { invoice_number: { [Op.like]: `%${invoice_number}%` } },
      order: [['invoice_number', 'ASC']]
    });
  };

  return Invoice;
};
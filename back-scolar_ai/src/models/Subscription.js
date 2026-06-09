const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Subscription = sequelize.define('Subscription', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Utilisateur proprietaire de cet abonnement'
    },
    plan_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Plan souscrit'
    },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'expired'),
      defaultValue: 'pending',
      allowNull: false
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    remainingScans: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    mobile_activation_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Token unique pour l’activation mobile via QR code (consommé à l’usage)'
    },
  }, {
    tableName: 'subscriptions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['status'] },
      { fields: ['user_id'] },
      { fields: ['plan_id'] }
    ],
    hooks: {
      beforeUpdate: async (subscription) => {
        // Génération automatique du token lors du passage à 'active' (s’il n’existe pas déjà)
        if (subscription.changed('status') && subscription.status === 'active' && !subscription.mobile_activation_token) {
          const crypto = require('crypto');
          subscription.mobile_activation_token = crypto.randomBytes(24).toString('hex');
        }

        // Calcul de startDate, endDate, remainingScans (code existant)
        if (subscription.changed('status') && subscription.status === 'active' && !subscription.startDate) {
          const now = new Date();
          subscription.startDate = now.toISOString().split('T')[0];

          const plan = await sequelize.models.Plan.findByPk(subscription.plan_id);
          if (plan) {
            if (plan.type === 'TIME_BASED' && plan.durationDays) {
              const endDateValue = new Date(now);
              endDateValue.setDate(now.getDate() + plan.durationDays);
              subscription.endDate = endDateValue.toISOString().split('T')[0];
            }
            if (plan.scanLimit) {
              subscription.remainingScans = plan.scanLimit;
            }
          }
        }
      }
    }
  });

  // ==========================================
  // MÉTHODES D'INSTANCE
  // ==========================================

  // Décrémente un crédit de scan et expire si épuisé
  Subscription.prototype.decrementScan = async function () {
    if (this.remainingScans > 0) {
      this.remainingScans -= 1;
      if (this.remainingScans === 0 && !this.endDate) {
        this.status = 'expired';
      }
      return await this.save();
    }
    throw new Error('Credits de scan insuffisants ou epuises.');
  };

  // ✅ AJOUT : vérification d'accès temps réel (sans requête BDD supplémentaire)
  // Utiliser cette méthode dans le scanner mobile pour valider l'accès instantanément.
  Subscription.prototype.isActive = function () {
    if (this.status !== 'active') return false;
    // Vérification de la date d'expiration si le plan est TIME_BASED
    if (this.endDate && new Date(this.endDate) < new Date()) return false;
    // Vérification des crédits si le plan est CREDIT_BASED sans endDate
    if (!this.endDate && this.remainingScans === 0) return false;
    return true;
  };

  // ✅ AJOUT : raison lisible du blocage d'accès (utile pour les messages d'erreur du scanner)
  Subscription.prototype.getAccessDeniedReason = function () {
    if (this.status === 'pending')  return 'Abonnement en attente de paiement.';
    if (this.status === 'expired')  return 'Abonnement expire.';
    if (this.endDate && new Date(this.endDate) < new Date()) return 'Abonnement arrive a echeance.';
    if (!this.endDate && this.remainingScans === 0) return 'Credits de scan epuises.';
    return 'Acces non autorise.';
  };

  return Subscription;
};
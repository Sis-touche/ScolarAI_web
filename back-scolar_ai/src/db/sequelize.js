const { Sequelize } = require("sequelize");

const sequelize = new Sequelize('scolat_ai_bd', 'root', '', {
    host: 'localhost',
    dialect: 'mysql',
    dialectOptions: {
        timezone: process.env.DB_TIMEZONE || '+03:00' // ✅ CORRECTION : timezone via variable d'environnement
    },
    logging: false,
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

// ==========================================
// 1. IMPORTATION ET INITIALISATION DES MODÈLES
// ==========================================
const User        = require('../models/user')(sequelize);
const Plan        = require('../models/Plan')(sequelize);
const Subscription = require('../models/Subscription')(sequelize);
const Invoice     = require('../models/ModulePaie/Invoices')(sequelize);
const Payment     = require('../models/ModulePaie/Payements')(sequelize);       // ✅ CORRECTION : Payment (sans faute)
const PaymentPlan = require('../models/ModulePaie/PaymentPlans')(sequelize);   // ✅ CORRECTION : PaymentPlan (sans faute)

// ==========================================
// 2. ASSOCIATIONS
// ==========================================
const setupAssociations = () => {

    // --- User ↔ Subscription ---
    User.hasMany(Subscription, { foreignKey: 'user_id', as: 'subscriptions' });
    Subscription.belongsTo(User, { foreignKey: 'user_id', as: 'user' });       // ✅ AJOUT miroir

    // --- Plan ↔ Subscription ---
    Plan.hasMany(Subscription, { foreignKey: 'plan_id', as: 'subscriptions' });
    Subscription.belongsTo(Plan, { foreignKey: 'plan_id', as: 'plan' });       // ✅ AJOUT miroir

    // --- Subscription ↔ Invoice ---
    Subscription.hasMany(Invoice, { foreignKey: 'subscription_id', as: 'invoices' });
    Invoice.belongsTo(Subscription, { foreignKey: 'subscription_id', as: 'subscription' }); // ✅ AJOUT miroir

    // --- User ↔ Invoice ---
    User.hasMany(Invoice, { foreignKey: 'user_id', as: 'invoices' });
    Invoice.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

    // --- Invoice ↔ PaymentPlan ---
    Invoice.hasMany(PaymentPlan, { foreignKey: 'invoice_id', as: 'paymentPlans' });
    PaymentPlan.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

    // --- Subscription ↔ PaymentPlan ---
    Subscription.hasMany(PaymentPlan, { foreignKey: 'subscription_id', as: 'paymentPlans' });
    PaymentPlan.belongsTo(Subscription, { foreignKey: 'subscription_id', as: 'subscription' }); // ✅ AJOUT miroir

    // --- Invoice ↔ Payment ---
    Invoice.hasMany(Payment, { foreignKey: 'invoice_id', as: 'payments' });
    Payment.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

    // --- PaymentPlan ↔ Payment ---
    PaymentPlan.hasMany(Payment, { foreignKey: 'payment_plan_id', as: 'payments' });
    Payment.belongsTo(PaymentPlan, { foreignKey: 'payment_plan_id', as: 'paymentPlan' });

    // --- User ↔ Payment ---
    User.hasMany(Payment, { foreignKey: 'user_id', as: 'payments' });
    Payment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
};

// ==========================================
// 3. SEEDING (données de démarrage)
// ==========================================
const createSimpleData = async () => {
    console.log("Création des données d'exemple...");
    try {
        await User.create({
            id: 'a1b2c3d4-1234-5678-9012-abcdef123456',
            email: 'admin@enset.fr',
            password: '123456',
            firstName: 'Admin',
            lastName: 'ENSET',
            role: 'admin',
            isActive: true,
            isVerified: true
        });
        console.log("✅ Administrateur d'exemple créé avec succès.");
    } catch (error) {
        console.error("❌ Erreur lors de la création des données d'exemple:", error);
        throw error;
    }
};

// ==========================================
// 4. INITIALISATION DE LA BASE
// ==========================================
const initDb = async (options = {}) => {
    try {
        await sequelize.authenticate();
        console.log('Connexion à la base de données établie avec succès.');

        setupAssociations();

        const syncOptions = {};
        if (process.env.NODE_ENV === 'development') {
            syncOptions.force = options.force || false;
            // syncOptions.alter = options.alter || true; // 🌟 Ajout ici : true par défaut en dev pour capter les changements de colonnes
            console.log(syncOptions.force
                ? 'Recréation des tables (force: true)...'
                : 'Synchronisation douce des tables...Mise à jour des tables (alter: true)...'
            );
        } else {
            syncOptions.force = false;
            syncOptions.alter = options.alter || false;
            console.log('Mode production - Synchronisation sécurisée active.');
        }

        // ✅ CORRECTION : suppression du sequelize.sync() sans await qui causait une double sync concurrente
        await sequelize.sync(syncOptions);
        console.log('Base de données synchronisée avec succès.');

        if (options.seedData || process.env.NODE_ENV === 'development') {
            const userCount = await User.count();
            if (userCount === 0 || options.forceSeed) {
                await createSimpleData();
            } else {
                console.log("Données existantes en base, saut de l'étape de seeding.");
            }
        }

        console.log('Base de données initialisée avec succès !');
        return true;

    } catch (error) {
        console.error("Erreur critique d'initialisation de la base de données:", error);
        throw error;
    }
};

module.exports = {
    sequelize,
    initDb,
    Invoice,
    Payment,     // ✅ CORRECTION : Payment (sans faute)
    PaymentPlan, // ✅ CORRECTION : PaymentPlan (sans faute)
    Plan,
    Subscription,
    User
};
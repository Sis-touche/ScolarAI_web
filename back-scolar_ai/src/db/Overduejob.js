/**
 * overdueJob.js — Job planifié de détection des retards et expirations
 *
 * Ce job tourne chaque nuit à minuit et met à jour automatiquement :
 *  1. Les tranches PaymentPlan en retard      → status: 'overdue'
 *  2. Les factures Invoice en retard          → status: 'overdue'
 *  3. Les souscriptions Subscription expirées → status: 'expired'
 *
 * Installation : npm install node-cron
 * Lancement    : appelé dans server.js au démarrage (voir exemple en bas)
 */

const cron = require('node-cron');
const { Op } = require('sequelize');

module.exports = (sequelize) => {
  const { PaymentPlan, Invoice, Subscription } = sequelize.models;

  const runOverdueCheck = async () => {
    const now = new Date();
    console.log(`[overdueJob] Démarrage du contrôle des retards — ${now.toISOString()}`);

    // ─────────────────────────────────────────────
    // 1. Tranches de paiement en retard
    // ─────────────────────────────────────────────
    try {
      const [overdueCount] = await PaymentPlan.update(
        { status: 'overdue' },
        {
          where: {
            status: 'pending',
            due_date: { [Op.lt]: now }
          }
        }
      );
      if (overdueCount > 0) {
        console.log(`[overdueJob] ${overdueCount} tranche(s) passée(s) en 'overdue'.`);
      }
    } catch (err) {
      console.error('[overdueJob] Erreur mise à jour PaymentPlan:', err.message);
    }

    // ─────────────────────────────────────────────
    // 2. Factures en retard (aucune tranche payée + due_date dépassée)
    // ─────────────────────────────────────────────
    try {
      const [overdueInvoices] = await Invoice.update(
        { status: 'overdue' },
        {
          where: {
            status: 'pending',
            due_date: { [Op.lt]: now }
          }
        }
      );
      if (overdueInvoices > 0) {
        console.log(`[overdueJob] ${overdueInvoices} facture(s) passée(s) en 'overdue'.`);
      }
    } catch (err) {
      console.error('[overdueJob] Erreur mise à jour Invoice:', err.message);
    }

    // ─────────────────────────────────────────────
    // 3. Souscriptions expirées par dépassement de date
    // ─────────────────────────────────────────────
    try {
      const [expiredCount] = await Subscription.update(
        { status: 'expired' },
        {
          where: {
            status: 'active',
            endDate: { [Op.lt]: now.toISOString().split('T')[0] }
          }
        }
      );
      if (expiredCount > 0) {
        console.log(`[overdueJob] ${expiredCount} souscription(s) expirée(s) par dépassement de date.`);
      }
    } catch (err) {
      console.error('[overdueJob] Erreur mise à jour Subscription:', err.message);
    }

    console.log('[overdueJob] Contrôle terminé.');
  };

  const job = cron.schedule('0 0 * * *', runOverdueCheck, {
    scheduled: false,
    timezone: process.env.TZ || 'Indian/Antananarivo'
  });

  return {
    start: () => {
      job.start();
      console.log('[overdueJob] Job planifié actif — contrôle quotidien à minuit.');
    },
    stop: () => job.stop(),
    runNow: runOverdueCheck
  };
};

/*
 * ─── UTILISATION DANS server.js ───────────────────────────────────────────
 *
 * const { initDb, sequelize } = require('./config/db');
 * const overdueJob = require('./jobs/overdueJob');
 *
 * const startServer = async () => {
 *   await initDb();
 *   const job = overdueJob(sequelize);
 *   job.start();
 *   app.listen(3000, () => console.log('Serveur démarré sur le port 3000'));
 * };
 *
 * startServer();
 */
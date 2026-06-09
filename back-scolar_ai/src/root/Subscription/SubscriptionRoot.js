const { Subscription, User, Plan, Invoice, PaymentPlan } = require("../../db/sequelize");
const { ValidationError, Op } = require("sequelize");

module.exports = (app) => {

    // ─────────────────────────────────────────────
    // Helper : validation d'UUID
    // ─────────────────────────────────────────────
    function isValidUUID(uuid) {
        const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return regex.test(uuid);
    }

    // ─────────────────────────────────────────────
    // POST /api/subscriptions — Créer un abonnement (toujours en 'pending')
    // ─────────────────────────────────────────────
    app.post('/api/subscriptions', async (req, res) => {
        try {
            const { user_id, plan_id,nb_tranches = 3 } = req.body;
            

            if (!user_id || !plan_id) {
                return res.status(400).json({
                    success: false,
                    message: 'user_id et plan_id sont requis'
                });
            }

            if (!isValidUUID(user_id) || !isValidUUID(plan_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Format UUID invalide pour user_id ou plan_id'
                });
            }

            const user = await User.findByPk(user_id);
            if (!user) {
                return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
            }

            const plan = await Plan.findByPk(plan_id);
            if (!plan) {
                return res.status(404).json({ success: false, message: 'Plan introuvable' });
            }
            // suppression des doublons
            const existing = await Subscription.findOne({
                where: {
                    user_id,
                    plan_id,
                    status: 'pending'
                }
            });

            if (existing) {
                // Retourner l\'abonnement existant au lieu d\'en créer un nouveau
                return res.status(200).json({
                    success: true,
                    message: 'Abonnement en attente déjà existant',
                    data: existing
                });
            }

            // Création forcée en statut 'pending' – les autres champs seront gérés par le hook beforeUpdate
            const subscription = await Subscription.create({
                user_id,
                plan_id,
                status: 'pending'
                // startDate, endDate, remainingScans ne sont PAS fournis ici
            });

            // le bloc a ajouter

            // 1. Générer un numéro de facture unique
            const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            // 2. Créer la facture
            // const invoice = await Invoice.create({
            //     subscription_id: subscription.id,
            //     user_id:         user_id,
            //     invoice_number:  invoiceNumber,
            //     amount_ht:       parseFloat(plan.price),
            //     tax_amount:      0,
            //     total_amount:    parseFloat(plan.price),
            //     status:          'pending'
            // });
            const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
            const suffix    = Math.random().toString(36).slice(2, 6).toUpperCase();
            const dueDate   = new Date();
            dueDate.setDate(dueDate.getDate() + 30);

            // 2. Créer la facture avec toutes les valeurs requises
            const invoice = await Invoice.create({
                subscription_id: subscription.id,
                user_id:         user_id,
                invoice_number:  `INV-${yearMonth}-${suffix}`,
                total_amount:    parseFloat(plan.price),
                due_date:        dueDate,
                status:          'pending'
            });

            // 3. Générer les tranches de paiement (1 tranche/mois)
            const NB_TRANCHES = parseInt(nb_tranches);
            const montantParTranche = (parseFloat(plan.price) / NB_TRANCHES).toFixed(2);

            for (let i = 1; i <= NB_TRANCHES; i++) {
                const dueDate = new Date();
                dueDate.setMonth(dueDate.getMonth() + (i - 1));

                await PaymentPlan.create({
                    subscription_id:    subscription.id,
                    invoice_id:         invoice.id,
                    installment_number: i,
                    amount:             montantParTranche,
                    status:             'pending',
                    due_date:           dueDate.toISOString().split('T')[0]
                });
            }

            return res.status(201).json({
                success: true,
                message: 'Abonnement créé (en attente de paiement)',
                data: subscription
            });

        } catch (error) {
            console.error('Erreur POST /api/subscriptions:', error);
            if (error instanceof ValidationError) {
                return res.status(400).json({
                    success: false,
                    message: 'Erreur de validation',
                    details: error.errors.map(e => ({ champ: e.path, message: e.message }))
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Erreur interne lors de la création de l\'abonnement',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    // ─────────────────────────────────────────────
    // GET /api/subscriptions — Liste avec filtres (status, user_id, plan_id)
    // ─────────────────────────────────────────────
    app.get('/api/subscriptions', async (req, res) => {
        try {
            const {
                page = 1,
                limit = 20,
                status,
                user_id,
                plan_id,
                sort = 'created_at',
                order = 'DESC'
            } = req.query;

            const offset = (parseInt(page) - 1) * parseInt(limit);
            const where = {};

            if (status) {
                const valid = ['pending', 'active', 'expired'];
                if (!valid.includes(status)) {
                    return res.status(400).json({ success: false, message: 'Statut invalide' });
                }
                where.status = status;
            }
            if (user_id) {
                if (!isValidUUID(user_id)) {
                    return res.status(400).json({ success: false, message: 'user_id UUID invalide' });
                }
                where.user_id = user_id;
            }
            if (plan_id) {
                if (!isValidUUID(plan_id)) {
                    return res.status(400).json({ success: false, message: 'plan_id UUID invalide' });
                }
                where.plan_id = plan_id;
            }

            const sortableFields = ['created_at', 'updated_at', 'start_date', 'end_date', 'status'];
            const sortField = sortableFields.includes(sort) ? sort : 'created_at';
            const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            const { count, rows } = await Subscription.findAndCountAll({
                where,
                order: [[sortField, sortOrder]],
                limit: parseInt(limit),
                offset,
                include: [
                    { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
                    { model: Plan, as: 'plan' }
                ]
            });

            return res.status(200).json({
                success: true,
                data: rows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / parseInt(limit))
                }
            });
        } catch (error) {
            console.error('Erreur GET /api/subscriptions:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des abonnements'
            });
        }
    });

    // ─────────────────────────────────────────────
    // GET /api/subscriptions/:id — Détail d'un abonnement
    // ─────────────────────────────────────────────
    app.get('/api/subscriptions/:id', async (req, res) => {
        try {
            const { id } = req.params;
            if (!isValidUUID(id)) {
                return res.status(400).json({ success: false, message: 'UUID invalide' });
            }

            const subscription = await Subscription.findByPk(id, {
                include: [
                    { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
                    { model: Plan, as: 'plan' },
                    { model: Invoice, as: 'invoices' },
                    { model: PaymentPlan, as: 'paymentPlans' }
                ]
            });

            if (!subscription) {
                return res.status(404).json({ success: false, message: 'Abonnement non trouvé' });
            }

            return res.status(200).json({ success: true, data: subscription });
        } catch (error) {
            console.error('Erreur GET /api/subscriptions/:id:', error);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    });

    // ─────────────────────────────────────────────
    // PUT /api/subscriptions/:id — Mise à jour limitée (admin)
    // ─────────────────────────────────────────────
    app.put('/api/subscriptions/:id', async (req, res) => {
        try {
            const { id } = req.params;
            if (!isValidUUID(id)) {
                return res.status(400).json({ success: false, message: 'UUID invalide' });
            }

            const subscription = await Subscription.findByPk(id);
            if (!subscription) {
                return res.status(404).json({ success: false, message: 'Abonnement non trouvé' });
            }

            const { status } = req.body;

            // Seul le statut peut être modifié manuellement (et avec restrictions)
            if (status === undefined) {
                return res.status(400).json({ success: false, message: 'Seul le champ status est modifiable' });
            }

            const validStatuses = ['pending', 'active', 'expired'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ success: false, message: 'Statut invalide' });
            }

            // Empêcher de passer directement de 'pending' à 'active' sans paiement
            // (l'activation normale se fait via le hook après un paiement)
            if (subscription.status === 'pending' && status === 'active') {
                return res.status(403).json({
                    success: false,
                    message: 'Activation interdite : utilisez le flux de paiement pour activer un abonnement.'
                });
            }

            // Permettre le passage manuel à 'expired' ou 'pending' (admin)
            await subscription.update({ status });

            return res.status(200).json({
                success: true,
                message: 'Abonnement mis à jour',
                data: subscription
            });
        } catch (error) {
            console.error('Erreur PUT /api/subscriptions/:id:', error);
            if (error instanceof ValidationError) {
                return res.status(400).json({ success: false, message: error.errors[0].message });
            }
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    });

    // ─────────────────────────────────────────────
    // POST /api/subscriptions/:id/scan — Décrémenter un crédit (pour le scanner)
    // ─────────────────────────────────────────────
    app.post('/api/subscriptions/:id/scan', async (req, res) => {
        try {
            const { id } = req.params;
            if (!isValidUUID(id)) {
                return res.status(400).json({ success: false, message: 'UUID invalide' });
            }

            const subscription = await Subscription.findByPk(id);
            if (!subscription) {
                return res.status(404).json({ success: false, message: 'Abonnement introuvable' });
            }

            if (!subscription.isActive()) {
                return res.status(403).json({
                    success: false,
                    message: subscription.getAccessDeniedReason()
                });
            }

            await subscription.decrementScan();

            return res.status(200).json({
                success: true,
                message: 'Scan consommé',
                remainingScans: subscription.remainingScans,
                status: subscription.status
            });
        } catch (error) {
            console.error('Erreur POST /api/subscriptions/:id/scan:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Impossible de consommer un crédit'
            });
        }
    });

    // ─────────────────────────────────────────────
    // DELETE /api/subscriptions/:id — Suppression (uniquement si 'pending' et sans dépendances)
    // ─────────────────────────────────────────────
    app.delete('/api/subscriptions/:id', async (req, res) => {
        try {
            const { id } = req.params;
            if (!isValidUUID(id)) {
                return res.status(400).json({ success: false, message: 'UUID invalide' });
            }

            const subscription = await Subscription.findByPk(id, {
                include: [
                    { model: Invoice, as: 'invoices', required: false },
                    { model: PaymentPlan, as: 'paymentPlans', required: false }
                ]
            });

            if (!subscription) {
                return res.status(404).json({ success: false, message: 'Abonnement non trouvé' });
            }

            if (subscription.status !== 'pending') {
                return res.status(403).json({
                    success: false,
                    message: 'Seul un abonnement en attente (pending) peut être supprimé.'
                });
            }

            if (subscription.invoices && subscription.invoices.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Des factures sont associées à cet abonnement. Supprimez-les d’abord.'
                });
            }
            if (subscription.paymentPlans && subscription.paymentPlans.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Des tranches de paiement sont associées à cet abonnement. Supprimez-les d’abord.'
                });
            }

            await subscription.destroy();
            return res.status(200).json({ success: true, message: 'Abonnement supprimé' });
        } catch (error) {
            console.error('Erreur DELETE /api/subscriptions/:id:', error);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    });
};
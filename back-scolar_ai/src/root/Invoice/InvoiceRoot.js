const { Invoice, Subscription, User, Payment, PaymentPlan } = require("../../db/sequelize");
const { UniqueConstraintError, ValidationError, Op } = require("sequelize");

module.exports = (app) => {

    // ─────────────────────────────────────────────
    // 1. Routes utilitaires (statiques)
    // ─────────────────────────────────────────────

    // GET /api/invoices/status/:status — findByStatus()
    app.get('/api/invoices/status/:status', async (req, res) => {
        try {
            const { status } = req.params;
            const validStatuses = ['pending', 'partial', 'paid', 'overdue', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ success: false, message: 'Statut invalide' });
            }
            const invoices = await Invoice.findByStatus(status);
            return res.status(200).json({ success: true, count: invoices.length, data: invoices });
        } catch (error) {
            console.error('Erreur GET /api/invoices/status/:status:', error);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    });

    // GET /api/invoices/search?q= — searchByNumber()
    app.get('/api/invoices/search', async (req, res) => {
        try {
            const { q } = req.query;
            if (!q || !q.trim()) {
                return res.status(400).json({ success: false, message: 'Paramètre q manquant' });
            }
            const invoices = await Invoice.searchByNumber(q.trim());
            return res.status(200).json({ success: true, count: invoices.length, data: invoices });
        } catch (error) {
            console.error('Erreur GET /api/invoices/search:', error);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    });

    // ─────────────────────────────────────────────
    // 2. POST /api/invoices — Créer une facture
    // ─────────────────────────────────────────────
    app.post('/api/invoices', async (req, res) => {
        try {
            const { subscription_id, user_id, total_amount, due_date, status, invoice_number } = req.body;

            // 🔴 Champs obligatoires (selon modèle)
            if (!subscription_id || !user_id) {
                return res.status(400).json({
                    success: false,
                    message: 'subscription_id et user_id sont obligatoires'
                });
            }

            // Vérifier que la subscription existe et récupérer user_id par sécurité
            const subscription = await Subscription.findByPk(subscription_id);
            if (!subscription) {
                return res.status(404).json({ success: false, message: 'Abonnement introuvable' });
            }
            // Vérification de cohérence : si user_id fourni correspond à celui de la subscription
            if (subscription.user_id !== user_id) {
                return res.status(400).json({
                    success: false,
                    message: 'user_id ne correspond pas à celui de la subscription'
                });
            }

            // Vérifier que l'utilisateur existe
            const user = await User.findByPk(user_id);
            if (!user) {
                return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
            }

            // Validation du montant total
            let parsedAmount = null;
            if (total_amount !== undefined) {
                parsedAmount = parseFloat(total_amount);
                if (isNaN(parsedAmount) || parsedAmount < 0) {
                    return res.status(400).json({ success: false, message: 'total_amount doit être un nombre positif' });
                }
            }

            // Validation de la date (optionnelle, le hook mettra +30 jours par défaut)
            let parsedDueDate = null;
            if (due_date) {
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(due_date) || isNaN(new Date(due_date).getTime())) {
                    return res.status(400).json({ success: false, message: 'due_date format YYYY-MM-DD invalide' });
                }
                parsedDueDate = due_date;
            }

            // Validation statut (optionnel, défaut 'pending')
            let finalStatus = 'pending';
            if (status) {
                const valid = ['pending', 'partial', 'paid', 'overdue', 'cancelled'];
                if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Statut invalide' });
                finalStatus = status;
            }

            // Construction des données (invoice_number optionnel : laissé à la génération auto)
            const invoiceData = {
                subscription_id,
                user_id,
                total_amount: parsedAmount,   // peut être null ? Le modèle require NOT NULL, donc il faut une valeur
                due_date: parsedDueDate,
                status: finalStatus,
                invoice_number: invoice_number ? invoice_number.trim().toUpperCase() : undefined
            };

            // 🔴 total_amount est obligatoire dans le modèle, on doit s'assurer qu'il est présent
            if (invoiceData.total_amount === null || invoiceData.total_amount === undefined) {
                return res.status(400).json({ success: false, message: 'total_amount est requis' });
            }

            const invoice = await Invoice.create(invoiceData);

            return res.status(201).json({
                success: true,
                message: `Facture ${invoice.invoice_number} créée`,
                data: invoice
            });

        } catch (error) {
            console.error('Erreur POST /api/invoices:', error);
            if (error instanceof UniqueConstraintError) {
                return res.status(409).json({ success: false, message: 'Numéro de facture déjà existant' });
            }
            if (error instanceof ValidationError) {
                return res.status(400).json({
                    success: false,
                    message: 'Erreur de validation',
                    details: error.errors.map(e => ({ champ: e.path, message: e.message }))
                });
            }
            return res.status(500).json({ success: false, message: 'Erreur interne' });
        }
    });

    // ─────────────────────────────────────────────
    // 3. GET /api/invoices — Liste paginée avec filtres étendus
    // ─────────────────────────────────────────────
    app.get('/api/invoices', async (req, res) => {
        try {
            const {
                page = 1,
                limit = 20,
                status,
                user_id,
                subscription_id,
                sort = 'created_at',
                order = 'DESC'
            } = req.query;

            const offset = (parseInt(page) - 1) * parseInt(limit);
            const where = {};

            if (status) {
                const valid = ['pending', 'partial', 'paid', 'overdue', 'cancelled'];
                if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Statut invalide' });
                where.status = status;
            }
            if (user_id) {
                if (!isValidUUID(user_id)) return res.status(400).json({ success: false, message: 'user_id UUID invalide' });
                where.user_id = user_id;
            }
            if (subscription_id) {
                if (!isValidUUID(subscription_id)) return res.status(400).json({ success: false, message: 'subscription_id UUID invalide' });
                where.subscription_id = subscription_id;
            }

            const sortable = ['created_at', 'updated_at', 'total_amount', 'due_date', 'invoice_number', 'status'];
            const sortField = sortable.includes(sort) ? sort : 'created_at';
            const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            const { count, rows } = await Invoice.findAndCountAll({
                where,
                order: [[sortField, sortOrder]],
                limit: parseInt(limit),
                offset,
                include: [
                    { association: 'payments', attributes: ['id', 'amount', 'status', 'method', 'paid_at'] },
                    { association: 'paymentPlans', attributes: ['id', 'installment_number', 'amount', 'status', 'due_date'] },
                    { association: 'subscription', attributes: ['id', 'status'] },
                    { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }
                ]
            });

            return res.status(200).json({
                success: true,
                data: rows,
                pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) }
            });
        } catch (error) {
            console.error('Erreur GET /api/invoices:', error);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    });

    // ─────────────────────────────────────────────
    // 4. GET /api/invoices/:id — Détail d’une facture
    // ─────────────────────────────────────────────
    app.get('/api/invoices/:id', async (req, res) => {
        try {
            const { id } = req.params;
            if (!isValidUUID(id)) return res.status(400).json({ success: false, message: 'UUID invalide' });

            const invoice = await Invoice.findByPk(id, {
                include: [
                    { association: 'payments' },
                    { association: 'paymentPlans' },
                    { association: 'subscription' },
                    { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }
                ]
            });
            if (!invoice) return res.status(404).json({ success: false, message: 'Facture non trouvée' });

            return res.status(200).json({ success: true, data: invoice });
        } catch (error) {
            console.error('Erreur GET /api/invoices/:id:', error);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    });

    // ─────────────────────────────────────────────
    // 5. PUT /api/invoices/:id — Mise à jour (sauf si payée/annulée)
    // ─────────────────────────────────────────────
    app.put('/api/invoices/:id', async (req, res) => {
        try {
            const { id } = req.params;
            if (!isValidUUID(id)) return res.status(400).json({ success: false, message: 'UUID invalide' });

            const invoice = await Invoice.findByPk(id);
            if (!invoice) return res.status(404).json({ success: false, message: 'Facture non trouvée' });

            if (['paid', 'cancelled'].includes(invoice.status)) {
                return res.status(403).json({ success: false, message: `Impossible de modifier une facture ${invoice.status}` });
            }

            const { invoice_number, total_amount, due_date, status } = req.body;
            const updateData = {};

            if (invoice_number !== undefined) updateData.invoice_number = invoice_number.trim().toUpperCase();
            if (total_amount !== undefined) {
                const parsed = parseFloat(total_amount);
                if (isNaN(parsed) || parsed < 0) return res.status(400).json({ success: false, message: 'total_amount invalide' });
                updateData.total_amount = parsed;
            }
            if (due_date !== undefined) {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(due_date) || isNaN(new Date(due_date).getTime())) {
                    return res.status(400).json({ success: false, message: 'due_date format YYYY-MM-DD' });
                }
                updateData.due_date = due_date;
            }
            if (status !== undefined) {
                const valid = ['pending', 'partial', 'paid', 'overdue', 'cancelled'];
                if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Statut invalide' });
                if (status === 'paid' && invoice.status !== 'paid') {
                    // Si on force le paiement manuellement, il faudrait peut-être gérer les paymentPlans, mais on laisse faire
                }
                updateData.status = status;
            }

            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({ success: false, message: 'Aucune donnée à mettre à jour' });
            }

            await invoice.update(updateData);
            return res.status(200).json({ success: true, message: 'Facture mise à jour', data: invoice });
        } catch (error) {
            console.error('Erreur PUT /api/invoices/:id:', error);
            if (error instanceof UniqueConstraintError) {
                return res.status(409).json({ success: false, message: 'Numéro de facture déjà utilisé' });
            }
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    });

    // ─────────────────────────────────────────────
    // 6. DELETE /api/invoices/:id — Suppression avec vérification des enfants
    // ─────────────────────────────────────────────
    app.delete('/api/invoices/:id', async (req, res) => {
        try {
            const { id } = req.params;
            if (!isValidUUID(id)) return res.status(400).json({ success: false, message: 'UUID invalide' });

            const invoice = await Invoice.findByPk(id, {
                include: [
                    { association: 'payments', required: false },
                    { association: 'paymentPlans', required: false }
                ]
            });
            if (!invoice) return res.status(404).json({ success: false, message: 'Facture non trouvée' });

            if (invoice.status === 'paid') {
                return res.status(403).json({ success: false, message: 'Impossible de supprimer une facture payée' });
            }

            // Vérifier l'existence de paiements ou tranches associés
            if (invoice.payments && invoice.payments.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Cette facture a des paiements associés. Supprimez-les d’abord ou annulez la facture.'
                });
            }
            if (invoice.paymentPlans && invoice.paymentPlans.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Cette facture a des tranches de paiement associées. Supprimez-les d’abord.'
                });
            }

            await invoice.destroy();
            return res.status(200).json({ success: true, message: 'Facture supprimée' });
        } catch (error) {
            console.error('Erreur DELETE /api/invoices/:id:', error);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    });

    // Helper UUID
    function isValidUUID(uuid) {
        const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return regex.test(uuid);
    }
};
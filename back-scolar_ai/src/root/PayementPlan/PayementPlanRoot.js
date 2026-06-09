const { PaymentPlan, Invoice, Subscription } = require("../../db/sequelize");
const { ValidationError, UniqueConstraintError, Op } = require("sequelize");

module.exports = (app) => {

    // ─────────────────────────────────────────────
    // POST /api/payment-plans — Créer une tranche (échéance)
    // ─────────────────────────────────────────────
    app.post('/api/payment-plans', async (req, res) => {
        try {
            const { subscription_id, invoice_id, installment_number, amount, due_date, status } = req.body;

            // Validation des champs obligatoires (clés étrangères incluses)
            const requiredFields = ['subscription_id', 'invoice_id', 'installment_number', 'amount', 'due_date'];
            const missingFields = requiredFields.filter(field => req.body[field] === undefined || req.body[field] === null);

            if (missingFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Champs obligatoires manquants',
                    details: missingFields.map(field => ({
                        champ: field,
                        message: `Le champ ${field} est obligatoire`
                    }))
                });
            }

            // Validation UUID pour subscription_id et invoice_id
            if (!isValidUUID(subscription_id) || !isValidUUID(invoice_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Format UUID invalide pour subscription_id ou invoice_id'
                });
            }

            // Vérifier que la subscription et l'invoice existent
            const subscription = await Subscription.findByPk(subscription_id);
            if (!subscription) {
                return res.status(404).json({ success: false, message: 'Abonnement (subscription) introuvable' });
            }
            const invoice = await Invoice.findByPk(invoice_id);
            if (!invoice) {
                return res.status(404).json({ success: false, message: 'Facture (invoice) introuvable' });
            }

            // Validation de l'échéance (entier >= 1)
            const parsedInstallment = parseInt(installment_number);
            if (isNaN(parsedInstallment) || parsedInstallment < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Numéro d\'échéance invalide',
                    details: 'Le numéro de la tranche doit être un entier supérieur ou égal à 1'
                });
            }

            // Validation du montant
            const parsedAmount = parseFloat(amount);
            if (isNaN(parsedAmount) || parsedAmount < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Montant invalide',
                    details: 'Le montant doit être un nombre positif'
                });
            }

            // Validation de la date (format YYYY-MM-DD)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(due_date)) {
                return res.status(400).json({
                    success: false,
                    message: 'Date d\'échéance invalide',
                    details: 'Format attendu : YYYY-MM-DD'
                });
            }
            const dueDateObj = new Date(due_date);
            if (isNaN(dueDateObj.getTime())) {
                return res.status(400).json({ success: false, message: 'Date d\'échéance invalide' });
            }

            // Validation du statut si fourni
            const validStatuses = ['pending', 'paid', 'overdue'];
            if (status && !validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Statut de la tranche invalide',
                    details: `Les statuts valides sont : ${validStatuses.join(', ')}`
                });
            }

            const planData = {
                subscription_id: subscription_id,
                invoice_id: invoice_id,
                installment_number: parsedInstallment,
                amount: parsedAmount,
                due_date: due_date, // Sequelize gère le DATEONLY
                status: status || 'pending'
            };

            const paymentPlan = await PaymentPlan.create(planData);

            return res.status(201).json({
                success: true,
                message: 'Tranche de paiement créée avec succès',
                data: paymentPlan
            });

        } catch (error) {
            console.error('Erreur POST /api/payment-plans:', error);

            if (error instanceof UniqueConstraintError) {
                return res.status(409).json({
                    success: false,
                    message: 'Une tranche avec ce numéro existe déjà pour cet abonnement',
                    details: error.errors.map(err => ({ champ: err.path, message: err.message }))
                });
            }
            if (error instanceof ValidationError) {
                return res.status(400).json({
                    success: false,
                    message: 'Erreur de validation Sequelize',
                    details: error.errors.map(err => ({
                        champ: err.path,
                        message: err.message
                    }))
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la création de la tranche de paiement',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    // ─────────────────────────────────────────────
    // GET /api/payment-plans — Récupérer toutes les tranches avec filtres
    // ─────────────────────────────────────────────
    app.get('/api/payment-plans', async (req, res) => {
        try {
            const {
                page = 1,
                limit = 20,
                status,
                subscription_id,
                invoice_id,
                sort = 'installment_number',
                order = 'ASC'
            } = req.query;

            const offset = (parseInt(page) - 1) * parseInt(limit);
            const where = {};

            // Filtrage par statut
            const validStatuses = ['pending', 'paid', 'overdue'];
            if (status) {
                if (!validStatuses.includes(status)) {
                    return res.status(400).json({
                        success: false,
                        message: `Statut invalide. Valeurs acceptées : ${validStatuses.join(', ')}`
                    });
                }
                where.status = status;
            }
            // Filtrage par clés étrangères
            if (subscription_id) {
                if (!isValidUUID(subscription_id)) {
                    return res.status(400).json({ success: false, message: 'subscription_id UUID invalide' });
                }
                where.subscription_id = subscription_id;
            }
            if (invoice_id) {
                if (!isValidUUID(invoice_id)) {
                    return res.status(400).json({ success: false, message: 'invoice_id UUID invalide' });
                }
                where.invoice_id = invoice_id;
            }

            // Colonnes de tri autorisées
            const sortableFields = ['installment_number', 'amount', 'due_date', 'created_at', 'status'];
            const sortField = sortableFields.includes(sort) ? sort : 'installment_number';
            const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

            const { count, rows: plans } = await PaymentPlan.findAndCountAll({
                where,
                order: [[sortField, sortOrder]],
                limit: parseInt(limit),
                offset,
                include: [
                    { model: Subscription, as: 'subscription', attributes: ['id', 'status', 'startDate', 'endDate'] },
                    { model: Invoice, as: 'invoice', attributes: ['id'/*, 'reference'*/, 'total_amount', 'status'] }
                ]
            });

            return res.status(200).json({
                success: true,
                message: 'Plans de paiement récupérés avec succès',
                data: plans,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / parseInt(limit))
                }
            });

        } catch (error) {
            console.error('Erreur GET /api/payment-plans:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des plans de paiement',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    // ─────────────────────────────────────────────
    // GET /api/payment-plans/:id — Récupérer une tranche par UUID
    // ─────────────────────────────────────────────
    app.get('/api/payment-plans/:id', async (req, res) => {
        try {
            const { id } = req.params;
            if (!isValidUUID(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Format d\'identifiant invalide',
                    details: 'L\'identifiant doit être un UUID valide'
                });
            }

            const paymentPlan = await PaymentPlan.findByPk(id, {
                include: [
                    { model: Subscription, as: 'subscription' },
                    { model: Invoice, as: 'invoice' }
                ]
            });

            if (!paymentPlan) {
                return res.status(404).json({
                    success: false,
                    message: `Aucun plan de paiement trouvé avec l'identifiant : ${id}`
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Tranche de paiement récupérée avec succès',
                data: paymentPlan
            });

        } catch (error) {
            console.error('Erreur GET /api/payment-plans/:id:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération de la tranche de paiement',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    // ─────────────────────────────────────────────
    // PUT /api/payment-plans/:id — Mettre à jour une tranche
    // ─────────────────────────────────────────────
    app.put('/api/payment-plans/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { installment_number, amount, due_date, status } = req.body;

            if (!isValidUUID(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Format d\'identifiant invalide'
                });
            }

            const paymentPlan = await PaymentPlan.findByPk(id);
            if (!paymentPlan) {
                return res.status(404).json({
                    success: false,
                    message: `Aucun plan de paiement trouvé avec l'identifiant : ${id}`
                });
            }

            // Règle métier : une tranche payée ou déjà en retard ? Laisser modifier overdue mais pas paid
            if (paymentPlan.status === 'paid') {
                return res.status(403).json({
                    success: false,
                    message: 'Impossible de modifier une tranche déjà payée.'
                });
            }
            // Optionnel : interdire modification si status 'overdue' ? Vous pouvez choisir de l'autoriser (ex: prolongation)
            // Ici on autorise la modification des tranches overdue (ex: changer date ou montant)

            const updateData = {};

            if (installment_number !== undefined) {
                const parsed = parseInt(installment_number);
                if (isNaN(parsed) || parsed < 1) {
                    return res.status(400).json({ success: false, message: 'installment_number doit être >= 1' });
                }
                updateData.installment_number = parsed;
            }

            if (amount !== undefined) {
                const parsed = parseFloat(amount);
                if (isNaN(parsed) || parsed < 0) {
                    return res.status(400).json({ success: false, message: 'Le montant doit être positif' });
                }
                updateData.amount = parsed;
            }

            if (due_date !== undefined) {
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(due_date) || isNaN(new Date(due_date).getTime())) {
                    return res.status(400).json({ success: false, message: 'Date d\'échéance invalide (format YYYY-MM-DD)' });
                }
                updateData.due_date = due_date;
            }

            if (status !== undefined) {
                const valid = ['pending', 'paid', 'overdue'];
                if (!valid.includes(status)) {
                    return res.status(400).json({ success: false, message: 'Statut invalide' });
                }
                // Ne pas laisser repasser une tranche 'paid' en 'pending'
                if (paymentPlan.status === 'paid' && status !== 'paid') {
                    return res.status(403).json({ success: false, message: 'Une tranche payée ne peut pas changer de statut.' });
                }
                updateData.status = status;
            }

            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Aucun champ à mettre à jour fourni'
                });
            }

            await paymentPlan.update(updateData);

            // Le hook afterUpdate de PaymentPlan recalcule automatiquement le statut de l'invoice
            return res.status(200).json({
                success: true,
                message: 'Tranche de paiement mise à jour avec succès',
                data: paymentPlan
            });

        } catch (error) {
            console.error('Erreur PUT /api/payment-plans/:id:', error);

            if (error instanceof UniqueConstraintError) {
                return res.status(409).json({
                    success: false,
                    message: 'Conflit : numéro de tranche déjà existant pour cet abonnement'
                });
            }
            if (error instanceof ValidationError) {
                return res.status(400).json({
                    success: false,
                    message: 'Erreur de validation',
                    details: error.errors.map(err => ({ champ: err.path, message: err.message }))
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour de la tranche de paiement',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    // ─────────────────────────────────────────────
    // DELETE /api/payment-plans/:id — Supprimer une tranche
    // ─────────────────────────────────────────────
    app.delete('/api/payment-plans/:id', async (req, res) => {
        try {
            const { id } = req.params;
            if (!isValidUUID(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Format d\'identifiant invalide'
                });
            }

            const paymentPlan = await PaymentPlan.findByPk(id);
            if (!paymentPlan) {
                return res.status(404).json({
                    success: false,
                    message: `Aucune tranche trouvée avec l'identifiant : ${id}`
                });
            }

            // Interdire suppression si déjà payée
            if (paymentPlan.status === 'paid') {
                return res.status(403).json({
                    success: false,
                    message: 'Impossible de supprimer une tranche déjà payée.'
                });
            }

            // Vérifier que la suppression ne laisse pas une facture sans tranche (sinon l'invoice deviendrait incohérente)
            const remainingPlans = await PaymentPlan.count({
                where: { invoice_id: paymentPlan.invoice_id, id: { [Op.ne]: id } }
            });
            if (remainingPlans === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Impossible de supprimer la dernière tranche d\'une facture. Supprimez plutôt la facture elle-même.'
                });
            }

            await paymentPlan.destroy();

            // Mettre à jour manuellement le statut de l'invoice (car le hook afterUpdate ne s'exécute pas sur destroy)
            const invoice = await Invoice.findByPk(paymentPlan.invoice_id);
            if (invoice) {
                const allPlans = await PaymentPlan.findAll({ where: { invoice_id: invoice.id } });
                const total = allPlans.length;
                const paid = allPlans.filter(p => p.status === 'paid').length;
                let newStatus;
                if (paid === 0) newStatus = 'pending';
                else if (paid < total) newStatus = 'partial';
                else newStatus = 'paid';
                if (invoice.status !== newStatus) {
                    await invoice.update({ status: newStatus });
                }
            }

            return res.status(200).json({
                success: true,
                message: `Tranche de paiement "${id}" supprimée avec succès`
            });

        } catch (error) {
            console.error('Erreur DELETE /api/payment-plans/:id:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la suppression de la tranche de paiement',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    // Helper : validation UUID
    function isValidUUID(uuid) {
        const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return regex.test(uuid);
    }
};
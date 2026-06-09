const { Plan, Subscription } = require("../../db/sequelize");
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
    // POST /api/plans — Créer un plan
    // ─────────────────────────────────────────────
    app.post('/api/plans', async (req, res) => {
        try {
            const { name, type, price, scanLimit, durationDays } = req.body;

            // Champs obligatoires
            if (!name || !type || price === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'name, type et price sont requis'
                });
            }

            const validTypes = ['TIME_BASED', 'CREDIT_BASED'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: `Type invalide. Valeurs acceptées : ${validTypes.join(', ')}`
                });
            }

            const parsedPrice = parseFloat(price);
            if (isNaN(parsedPrice) || parsedPrice < 0) {
                return res.status(400).json({ success: false, message: 'price doit être un nombre positif' });
            }

            // Validation des champs spécifiques au type (le hook du modèle le fait aussi, mais on anticipe)
            if (type === 'TIME_BASED' && (!durationDays || parseInt(durationDays) <= 0)) {
                return res.status(400).json({ success: false, message: 'durationDays requis et doit être > 0 pour un plan TIME_BASED' });
            }
            if (type === 'CREDIT_BASED' && (!scanLimit || parseInt(scanLimit) <= 0)) {
                return res.status(400).json({ success: false, message: 'scanLimit requis et doit être > 0 pour un plan CREDIT_BASED' });
            }

            const cleanScanLimit = scanLimit !== undefined && scanLimit !== null ? parseInt(scanLimit) : null;
            const cleanDurationDays = durationDays !== undefined && durationDays !== null ? parseInt(durationDays) : null;

            const plan = await Plan.create({
                name: name.trim(),
                type,
                price: parsedPrice,
                scanLimit: cleanScanLimit,
                durationDays: cleanDurationDays
            });

            return res.status(201).json({
                success: true,
                message: 'Plan créé avec succès',
                data: plan
            });

        } catch (error) {
            console.error('Erreur POST /api/plans:', error);
            if (error instanceof ValidationError) {
                return res.status(400).json({
                    success: false,
                    message: 'Erreur de validation',
                    details: error.errors.map(e => ({ champ: e.path, message: e.message }))
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Erreur interne lors de la création du plan',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    // ─────────────────────────────────────────────
    // GET /api/plans — Liste paginée et filtres
    // ─────────────────────────────────────────────
    app.get('/api/plans', async (req, res) => {
        try {
            const {
                page = 1,
                limit = 20,
                type,
                search,
                sort = 'price',
                order = 'ASC'
            } = req.query;

            const offset = (parseInt(page) - 1) * parseInt(limit);
            const where = {};

            if (type) {
                const valid = ['TIME_BASED', 'CREDIT_BASED'];
                if (!valid.includes(type)) {
                    return res.status(400).json({ success: false, message: 'Type invalide' });
                }
                where.type = type;
            }
            if (search) {
                where.name = { [Op.like]: `%${search}%` };
            }

            const sortable = ['name', 'price', 'created_at', 'type'];
            const sortField = sortable.includes(sort) ? sort : 'price';
            const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

            const { count, rows } = await Plan.findAndCountAll({
                where,
                order: [[sortField, sortOrder]],
                limit: parseInt(limit),
                offset
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
            console.error('Erreur GET /api/plans:', error);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    });

    // ─────────────────────────────────────────────
    // GET /api/plans/:id — Détail d'un plan
    // ─────────────────────────────────────────────
    app.get('/api/plans/:id', async (req, res) => {
        try {
            const { id } = req.params;
            if (!isValidUUID(id)) {
                return res.status(400).json({ success: false, message: 'UUID invalide' });
            }

            const plan = await Plan.findByPk(id);
            if (!plan) {
                return res.status(404).json({ success: false, message: 'Plan non trouvé' });
            }

            return res.status(200).json({ success: true, data: plan });
        } catch (error) {
            console.error('Erreur GET /api/plans/:id:', error);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    });

    // ─────────────────────────────────────────────
    // PUT /api/plans/:id — Mise à jour d'un plan (avec vérification des souscriptions actives)
    // ─────────────────────────────────────────────
    app.put('/api/plans/:id', async (req, res) => {
        try {
            const { id } = req.params;
            if (!isValidUUID(id)) {
                return res.status(400).json({ success: false, message: 'UUID invalide' });
            }

            const plan = await Plan.findByPk(id);
            if (!plan) {
                return res.status(404).json({ success: false, message: 'Plan non trouvé' });
            }

            const { name, type, price, scanLimit, durationDays } = req.body;
            const updateData = {};

            // Vérifier si des souscriptions actives ou en attente existent
            const activeSubscriptions = await Subscription.count({
                where: {
                    plan_id: id,
                    status: { [Op.in]: ['active', 'pending'] }
                }
            });

            if (activeSubscriptions > 0) {
                // On restreint les modifications possibles : on ne peut plus changer le type ni supprimer des contraintes
                if (type !== undefined && type !== plan.type) {
                    return res.status(403).json({
                        success: false,
                        message: 'Impossible de modifier le type d’un plan qui a déjà des souscriptions actives ou en attente.'
                    });
                }
                // On peut tout de même mettre à jour le nom, le prix, mais pas les champs critiques (durationDays, scanLimit)
                if (durationDays !== undefined && durationDays !== plan.durationDays) {
                    return res.status(403).json({
                        success: false,
                        message: 'Impossible de modifier durationDays pour un plan déjà utilisé.'
                    });
                }
                if (scanLimit !== undefined && scanLimit !== plan.scanLimit) {
                    return res.status(403).json({
                        success: false,
                        message: 'Impossible de modifier scanLimit pour un plan déjà utilisé.'
                    });
                }
            }

            if (name !== undefined) {
                if (name.trim() === '') return res.status(400).json({ success: false, message: 'Le nom ne peut pas être vide' });
                updateData.name = name.trim();
            }
            if (type !== undefined) {
                const valid = ['TIME_BASED', 'CREDIT_BASED'];
                if (!valid.includes(type)) return res.status(400).json({ success: false, message: 'Type invalide' });
                updateData.type = type;
            }
            if (price !== undefined) {
                const p = parseFloat(price);
                if (isNaN(p) || p < 0) return res.status(400).json({ success: false, message: 'price doit être positif' });
                updateData.price = p;
            }
            if (scanLimit !== undefined) {
                const val = scanLimit !== null ? parseInt(scanLimit) : null;
                if (val !== null && (isNaN(val) || val < 0)) {
                    return res.status(400).json({ success: false, message: 'scanLimit doit être un entier positif ou null' });
                }
                updateData.scanLimit = val;
            }
            if (durationDays !== undefined) {
                const val = durationDays !== null ? parseInt(durationDays) : null;
                if (val !== null && (isNaN(val) || val < 0)) {
                    return res.status(400).json({ success: false, message: 'durationDays doit être un entier positif ou null' });
                }
                updateData.durationDays = val;
            }

            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({ success: false, message: 'Aucune donnée à mettre à jour' });
            }

            await plan.update(updateData);
            return res.status(200).json({ success: true, message: 'Plan mis à jour', data: plan });
        } catch (error) {
            console.error('Erreur PUT /api/plans/:id:', error);
            if (error instanceof ValidationError) {
                return res.status(400).json({ success: false, message: error.errors[0].message });
            }
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    });

    // ─────────────────────────────────────────────
    // DELETE /api/plans/:id — Suppression (uniquement si aucune souscription associée)
    // ─────────────────────────────────────────────
    app.delete('/api/plans/:id', async (req, res) => {
        try {
            const { id } = req.params;
            if (!isValidUUID(id)) {
                return res.status(400).json({ success: false, message: 'UUID invalide' });
            }

            const plan = await Plan.findByPk(id);
            if (!plan) {
                return res.status(404).json({ success: false, message: 'Plan non trouvé' });
            }

            const linkedSubscriptions = await Subscription.count({ where: { plan_id: id } });
            if (linkedSubscriptions > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Impossible de supprimer ce plan car des abonnements y sont liés.'
                });
            }

            await plan.destroy();
            return res.status(200).json({ success: true, message: `Plan "${plan.name}" supprimé` });
        } catch (error) {
            console.error('Erreur DELETE /api/plans/:id:', error);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    });
};
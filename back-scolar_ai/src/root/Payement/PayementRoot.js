const { Payment, PaymentPlan, Invoice, Plan, Subscription, User } = require("../../db/sequelize");
const { UniqueConstraintError, ValidationError, Op } = require("sequelize");
const crypto = require("crypto");

module.exports = (app) => {

    // ─────────────────────────────────────────────────────────────────
    // 1. POST /api/payments/initiate — Initier un paiement pour une tranche
    // ─────────────────────────────────────────────────────────────────
    app.post('/api/payments/initiate', async (req, res) => {
        try {
            const { payment_plan_id, user_id, method, notes } = req.body;

            // Validation des champs obligatoires
            if (!payment_plan_id || !user_id || !method) {
                return res.status(400).json({
                    success: false,
                    message: 'payment_plan_id, user_id et method sont requis'
                });
            }

            // Vérifier que la tranche existe et est encore en attente
            const paymentPlan = await PaymentPlan.findByPk(payment_plan_id, {
                include: [{ model: Invoice, as: 'invoice' }]
            });
            if (!paymentPlan) {
                return res.status(404).json({ success: false, message: 'Tranche de paiement introuvable' });
            }
            if (paymentPlan.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: `Cette tranche est déjà ${paymentPlan.status}. Impossible d'initier un paiement.`
                });
            }

            // Vérifier que la facture associée existe et n'est pas déjà soldée
            const invoice = paymentPlan.invoice;
            if (!invoice) {
                return res.status(404).json({ success: false, message: 'Facture associée introuvable' });
            }
            if (invoice.status === 'paid') {
                return res.status(400).json({ success: false, message: 'La facture est déjà entièrement payée.' });
            }

            // Validation de la méthode de paiement
            const validMethods = ['mobile_money', 'carte_bancaire', 'virement', 'especes'];
            if (!validMethods.includes(method)) {
                return res.status(400).json({ success: false, message: 'Méthode de paiement invalide' });
            }

            // Générer une référence unique de transaction
            const transactionRef = `TX_${method.toUpperCase()}_${crypto.randomBytes(6).toString('hex')}`;

            // Créer le paiement (statut 'pending')
            const payment = await Payment.create({
                payment_plan_id: paymentPlan.id,
                user_id: user_id,
                invoice_id: invoice.id,
                amount: paymentPlan.amount,
                method: method,
                transaction_ref: transactionRef,
                status: 'pending',
                notes: notes?.trim() || `Paiement pour la tranche ${paymentPlan.id} (facture ${invoice.id})`
            });

            // Construire l'URL de simulation (peut être personnalisée selon votre gateway)
            const simulationUrl = `${req.protocol}://${req.get('host')}/api/payments/simulate-gate?ref=${transactionRef}`;

            return res.status(201).json({
                success: true,
                message: 'Paiement initialisé avec succès',
                payment_id: payment.id,
                transaction_ref: transactionRef,
                simulation_url: simulationUrl,
                data: payment
            });

        } catch (error) {
            console.error('Erreur POST /api/payments/initiate:', error);
            return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
        }
    });

   // ─────────────────────────────────────────────────────────────────
    // 2. GET /api/payments/simulate-gate — Interface de simulation
    // ─────────────────────────────────────────────────────────────────
    app.get('/api/payments/simulate-gate', async (req, res) => {
        const { ref } = req.query;
        if (!ref) {
            return res.status(400).send('Référence de transaction manquante');
        }

        const payment = await Payment.findOne({ where: { transaction_ref: ref } });
        if (!payment) {
            return res.status(404).send('Paiement introuvable');
        }

        res.send(`
           <!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Paiement sécurisé - Scholar AI</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, sans-serif;
            /* 2. Le Fond de la page : Dégradé subtil gris clair à bleu-gris doux */
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .payment-container {
            /* 1. Disposition en deux colonnes moderne */
            max-width: 900px;
            width: 100%;
        }

        /* 2. La Carte (Conteneur principal) : Arrondi prononcé et ombre douce */
        .payment-card {
            background: #ffffff;
            border-radius: 24px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            overflow: hidden;
            border: 1px solid rgba(226, 232, 240, 0.8);
            display: grid;
            grid-template-columns: 1fr 1.2fr;
        }

        /* 1. À gauche : Résumé élégant de la commande */
        .card-sidebar {
            background-color: #f8fafc;
            padding: 40px;
            border-right: 1px solid #e2e8f0;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .sidebar-header h2 {
            font-size: 1.1rem;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 24px;
        }

        /* 3. Le montant : Plus besoin de fond rose flash. Mis en valeur, sombre et grand */
        .main-amount {
            font-size: 2rem;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 32px;
        }

        .transaction-details {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .detail-item {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .detail-item .label {
            font-size: 0.8rem;
            color: #64748b;
            font-weight: 500;
        }

        .detail-item .value-wrapper {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .detail-item .value {
            font-weight: 600;
            color: #1e293b;
            font-size: 0.95rem;
        }

        /* Bouton copier discret */
        .btn-copy {
            background: none;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            font-size: 0.85rem;
            transition: color 0.15s ease;
            padding: 2px;
        }
        .btn-copy:hover {
            color: #5d5fef;
        }

        .sidebar-footer {
            margin-top: 40px;
        }

        /* Badge de sécurité discret en bas à gauche */
        .secure-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.75rem;
            color: #94a3b8;
            font-weight: 500;
        }

        .secure-badge i {
            color: #10b981;
        }

        /* À droite : Le formulaire de paiement pur */
        .payment-body {
            padding: 40px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        /* 3. L'En-tête : Police grasse et propre */
        .card-header h1 {
            font-size: 1.5rem;
            font-weight: 700;
            color: #0f172a;
            letter-spacing: -0.5px;
            margin-bottom: 24px;
        }

        .form-group {
            margin-bottom: 18px;
        }

        /* Libellés épurés */
        label {
            display: block;
            font-size: 0.85rem;
            font-weight: 500;
            color: #344054;
            margin-bottom: 6px;
        }

        .input-wrapper {
            position: relative;
        }

        /* 3. Icônes fines et discrètes à l'intérieur des champs à gauche */
        .input-icon {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
            font-size: 0.95rem;
            pointer-events: none;
            transition: color 0.2s;
        }

        /* 3. Champs de saisie : fond teinté, pas de bordure lourde par défaut */
        input {
            width: 100%;
            padding: 12px 14px 12px 40px; /* Espace à gauche pour l'icône interne */
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            font-size: 0.95rem;
            font-family: inherit;
            background: #f8fafc;
            color: #0f172a;
            transition: all 0.2s ease;
        }

        /* Focus : Transition fluide vers bordure bleue avec effet lumineux (ring) */
        input:focus {
            outline: none;
            border-color: #5d5fef;
            background: #ffffff;
            box-shadow: 0 0 0 4px rgba(93, 95, 239, 0.15);
        }
        
        input:focus + .input-icon {
            color: #5d5fef;
        }

        .row-2cols {
            display: flex;
            gap: 14px;
        }

        .row-2cols .form-group {
            flex: 1;
        }

        /* 3. Bouton d'action : Largeur complète, dégradé premium violet/bleu roi */
        .btn-pay {
            width: 100%;
            background: linear-gradient(135deg, #5d5fef 0%, #3b82f6 100%);
            border: none;
            padding: 14px;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            font-size: 1rem;
            cursor: pointer;
            margin-top: 10px;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(93, 95, 239, 0.2);
        }

        .btn-pay:hover {
            opacity: 0.95;
            box-shadow: 0 6px 16px rgba(93, 95, 239, 0.3);
        }

        .btn-pay i {
            font-size: 0.95rem;
        }

        /* Lien d'annulation épuré */
        .cancel-link {
            text-align: center;
            margin-top: 16px;
        }

        .cancel-link a {
            color: #64748b;
            font-size: 0.85rem;
            text-decoration: none;
            transition: color 0.15s ease;
        }

        .cancel-link a:hover {
            color: #ef4444;
        }

        /* Version responsive pour tablettes et mobiles */
        @media (max-width: 768px) {
            .payment-card {
                grid-template-columns: 1fr;
            }
            .card-sidebar {
                border-right: none;
                border-bottom: 1px solid #e2e8f0;
                padding: 30px;
            }
            .main-amount {
                margin-bottom: 16px;
            }
            .payment-body {
                padding: 30px;
            }
        }

        @media (max-width: 480px) {
            .row-2cols {
                flex-direction: column;
                gap: 0;
            }
        }
    </style>
</head>
<body>
<div class="payment-container">
    <div class="payment-card">
        
        <div class="card-sidebar">
            <div class="sidebar-header">
                <h2>Résumé du panier</h2>
                <div class="main-amount">${payment.amount} Ar</div>
                
                <div class="transaction-details">
                    <div class="detail-item">
                        <span class="label">Numéro de transaction</span>
                        <div class="value-wrapper">
                            <span class="value" id="txRef">${ref}</span>
                            <button class="btn-copy" onclick="copyTransactionId()" title="Copier l'identifiant">
                                <i class="far fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    <div class="detail-item">
                        <span class="label">Méthode de validation</span>
                        <span class="value">Carte Bancaire (Simulation)</span>
                    </div>
                </div>
            </div>
            
            <div class="sidebar-footer">
                <div class="secure-badge">
                    <i class="fas fa-shield-alt"></i> 
                    <span>Paiement 100% sécurisé • SSL/TLS</span>
                </div>
            </div>
        </div>

        <div class="payment-body">
            <div class="card-header">
                <h1>Paiement sécurisé</h1>
            </div>

            <form action="/api/payments/webhook" method="POST" id="paymentForm">
                <input type="hidden" name="transactionReference" value="${ref}">
                <input type="hidden" name="status" value="confirmed" id="statusField">

                <div class="form-group">
                    <label for="cardholder">Titulaire de la carte</label>
                    <div class="input-wrapper">
                        <input type="text" id="cardholder" placeholder="Jean DUPONT" value="Test Client" required>
                        <i class="far fa-user input-icon"></i>
                    </div>
                </div>

                <div class="form-group">
                    <label for="cardnumber">Numéro de carte</label>
                    <div class="input-wrapper">
                        <input type="text" id="cardnumber" placeholder="4242 4242 4242 4242" value="4242 4242 4242 4242" required>
                        <i class="far fa-credit-card input-icon"></i>
                    </div>
                </div>

                <div class="row-2cols">
                    <div class="form-group">
                        <label for="expiration">Expiration</label>
                        <div class="input-wrapper">
                            <input type="text" id="expiration" placeholder="MM/AA" value="12/28" required>
                            <i class="far fa-calendar-alt input-icon"></i>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="cvv">CVV</label>
                        <div class="input-wrapper">
                            <input type="text" id="cvv" placeholder="123" value="123" required>
                            <i class="fas fa-lock input-icon"></i>
                        </div>
                    </div>
                </div>

                <button type="submit" class="btn-pay">
                    <i class="fas fa-lock"></i> Payer ${payment.amount} Ar
                </button>
            </form>

            <div class="cancel-link">
                <a href="#" id="failLink">Annuler la transaction</a>
            </div>
        </div>
        
    </div>
</div>

<script>
    const failLink = document.getElementById('failLink');
    const paymentForm = document.getElementById('paymentForm');
    const statusField = document.getElementById('statusField');

    // Soumission en cas d'annulation
    failLink.addEventListener('click', (e) => {
        e.preventDefault();
        statusField.value = 'failed';
        paymentForm.submit();
    });

    // Fonction utilitaire pour copier l'ID de transaction
    function copyTransactionId() {
        const refText = document.getElementById('txRef').innerText;
        navigator.clipboard.writeText(refText).then(() => {
            const copyBtn = document.querySelector('.btn-copy i');
            copyBtn.className = 'fas fa-check';
            copyBtn.style.color = '#10b981';
            setTimeout(() => {
                copyBtn.className = 'far fa-copy';
                copyBtn.style.color = '';
            }, 2000);
        });
    }
</script>
</body>
</html>
        `);
    });

    // ─────────────────────────────────────────────────────────────────
    // 3. POST /api/payments/webhook — Confirmation / échec du paiement
    // ─────────────────────────────────────────────────────────────────
    app.post('/api/payments/webhook', async (req, res) => {
        try {
            const { transactionReference, status } = req.body;

            if (!transactionReference || !status) {
                return res.status(400).send('transactionReference et status sont requis');
            }

            const payment = await Payment.findOne({ where: { transaction_ref: transactionReference } });
            if (!payment) {
                return res.status(404).send('Paiement introuvable');
            }

            await payment.update({ status });

            // ✅ Page HTML qui ferme la popup et notifie le frontend via postMessage
            const isSuccess = status === 'confirmed';

            return res.send(`
                <html>
                    <head><title>${isSuccess ? 'Paiement confirmé' : 'Paiement échoué'}</title></head>
                    <body style="font-family:Arial;text-align:center;padding:50px;background:${isSuccess ? '#f0fdf4' : '#fef2f2'};">
                        <h2 style="color:${isSuccess ? '#16a34a' : '#dc2626'};">
                            ${isSuccess ? '✅ Paiement confirmé !' : '❌ Paiement échoué'}
                        </h2>
                        <p>${isSuccess ? 'Votre paiement a été validé.' : 'Le paiement a été annulé.'}</p>
                        <p style="color:#6b7280;font-size:13px;">Cette fenêtre va se fermer automatiquement…</p>
                        <script>
                            // Notifier la fenêtre parente (SubscriptionFlow)
                            if (window.opener && !window.opener.closed) {
                                window.opener.postMessage(
                                    { type: 'PAYMENT_RESULT', status: '${status}' },
                                    'http://localhost:5173'
                                );
                            }
                            // Fermer la popup après 1.5s
                            setTimeout(function() { window.close(); }, 1500);
                        </script>
                    </body>
                </html>
            `);

        } catch (error) {
            console.error('Erreur Webhook Paiement:', error);
            return res.status(500).send('Erreur interne lors de la validation');
        }
    });

    // ─────────────────────────────────────────────
    // 4. GET /api/payments — Liste paginée avec filtres
    // ─────────────────────────────────────────────
    app.get('/api/payments', async (req, res) => {
        try {
            const {
                page = 1,
                limit = 20,
                status,
                method,
                user_id,
                payment_plan_id,
                invoice_id,
                sort = 'created_at',
                order = 'DESC'
            } = req.query;

            const offset = (parseInt(page) - 1) * parseInt(limit);
            const where = {};

            if (status) {
                const valid = ['pending', 'confirmed', 'failed', 'refunded'];
                if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Statut invalide' });
                where.status = status;
            }
            if (method) {
                const valid = ['mobile_money', 'carte_bancaire', 'virement', 'especes'];
                if (!valid.includes(method)) return res.status(400).json({ success: false, message: 'Méthode invalide' });
                where.method = method;
            }
            if (user_id) where.user_id = user_id;
            if (payment_plan_id) where.payment_plan_id = payment_plan_id;
            if (invoice_id) where.invoice_id = invoice_id;

            const sortable = ['created_at', 'updated_at', 'amount', 'paid_at', 'status'];
            const sortField = sortable.includes(sort) ? sort : 'created_at';
            const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            const { count, rows } = await Payment.findAndCountAll({
                where,
                order: [[sortField, sortOrder]],
                limit: parseInt(limit),
                offset,
                include: [
                    { model: PaymentPlan, as: 'paymentPlan', attributes: ['id', 'amount', 'due_date', 'status'] },
                    { model: Invoice, as: 'invoice', attributes: ['id', 'total_amount', 'status'] },
                    { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }
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
            console.error('Erreur GET /api/payments:', error);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    });

    // ─────────────────────────────────────────────
    // 5. GET /api/payments/:id — Détail d'un paiement
    // ─────────────────────────────────────────────
    app.get('/api/payments/:id', async (req, res) => {
        try {
            const { id } = req.params;
            if (!isValidUUID(id)) {
                return res.status(400).json({ success: false, message: 'UUID invalide' });
            }

            const payment = await Payment.findByPk(id, {
                include: [
                    { model: PaymentPlan, as: 'paymentPlan' },
                    { model: Invoice, as: 'invoice' },
                    { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }
                ]
            });

            if (!payment) {
                return res.status(404).json({ success: false, message: 'Paiement non trouvé' });
            }

            return res.status(200).json({ success: true, data: payment });

        } catch (error) {
            console.error('Erreur GET /api/payments/:id:', error);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    });

    // ─────────────────────────────────────────────
    // 6. PUT /api/payments/:id — Mise à jour (admin, hors statuts bloquants)
    // ─────────────────────────────────────────────
    app.put('/api/payments/:id', async (req, res) => {
        try {
            const { id } = req.params;
            if (!isValidUUID(id)) {
                return res.status(400).json({ success: false, message: 'UUID invalide' });
            }

            const payment = await Payment.findByPk(id);
            if (!payment) {
                return res.status(404).json({ success: false, message: 'Paiement non trouvé' });
            }

            if (['confirmed', 'refunded'].includes(payment.status)) {
                return res.status(403).json({ success: false, message: `Impossible de modifier un paiement ${payment.status}` });
            }

            const { amount, method, transaction_ref, status, notes } = req.body;
            const updateData = {};

            if (amount !== undefined) {
                const parsed = parseFloat(amount);
                if (isNaN(parsed) || parsed < 0) return res.status(400).json({ success: false, message: 'Montant invalide' });
                updateData.amount = parsed;
            }
            if (method !== undefined) {
                const valid = ['mobile_money', 'carte_bancaire', 'virement', 'especes'];
                if (!valid.includes(method)) return res.status(400).json({ success: false, message: 'Méthode invalide' });
                updateData.method = method;
            }
            if (transaction_ref !== undefined) updateData.transaction_ref = transaction_ref.trim() || null;
            if (status !== undefined) {
                const valid = ['pending', 'confirmed', 'failed', 'refunded'];
                if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Statut invalide' });
                updateData.status = status;
            }
            if (notes !== undefined) updateData.notes = notes.trim() || null;

            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({ success: false, message: 'Aucune donnée à mettre à jour' });
            }

            await payment.update(updateData);

            return res.status(200).json({ success: true, message: 'Paiement mis à jour', data: payment });

        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                return res.status(409).json({ success: false, message: 'Référence de transaction déjà existante' });
            }
            console.error('Erreur PUT /api/payments/:id:', error);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    });

    // ─────────────────────────────────────────────
    // 7. DELETE /api/payments/:id — Suppression (sauf si confirmé)
    // ─────────────────────────────────────────────
    app.delete('/api/payments/:id', async (req, res) => {
        try {
            const { id } = req.params;
            if (!isValidUUID(id)) {
                return res.status(400).json({ success: false, message: 'UUID invalide' });
            }

            const payment = await Payment.findByPk(id);
            if (!payment) {
                return res.status(404).json({ success: false, message: 'Paiement non trouvé' });
            }

            if (payment.status === 'confirmed') {
                return res.status(403).json({ success: false, message: 'Impossible de supprimer un paiement confirmé' });
            }

            await payment.destroy();
            return res.status(200).json({ success: true, message: 'Paiement supprimé' });

        } catch (error) {
            console.error('Erreur DELETE /api/payments/:id:', error);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    });

    // ─────────────────────────────────────────────
    // 8. GET /api/payments/status/:status — Utilise la méthode statique
    // ─────────────────────────────────────────────
    app.get('/api/payments/status/:status', async (req, res) => {
        try {
            const { status } = req.params;
            const valid = ['pending', 'confirmed', 'failed', 'refunded'];
            if (!valid.includes(status)) {
                return res.status(400).json({ success: false, message: 'Statut invalide' });
            }

            const payments = await Payment.findByStatus(status); // méthode statique existante
            return res.status(200).json({ success: true, count: payments.length, data: payments });

        } catch (error) {
            console.error('Erreur GET /api/payments/status/:status:', error);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    });

    // ─────────────────────────────────────────────
    // 9. GET /api/payments/confirmed — Raccourci
    // ─────────────────────────────────────────────
    app.get('/api/payments/confirmed', async (req, res) => {
        try {
            // Correction du nom de méthode : getConfirmedPayments (avec 's')
            const payments = await Payment.getConfirmedPayments();
            return res.status(200).json({ success: true, count: payments.length, data: payments });

        } catch (error) {
            console.error('Erreur GET /api/payments/confirmed:', error);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    });

    // Helper UUID
    function isValidUUID(uuid) {
        const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return regex.test(uuid);
    }
};
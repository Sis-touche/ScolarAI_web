const { Payment, Subscription, Plan, User } = require("../../db/sequelize");
const crypto = require('crypto');
const QRCode = require('qrcode');
const { Op } = require("sequelize");

module.exports = (app) => {

    // ─────────────────────────────────────────────────────────────────
    // Helper : validation d'UUID
    // ─────────────────────────────────────────────────────────────────
    function isValidUUID(uuid) {
        const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return regex.test(uuid);
    }

    // ─────────────────────────────────────────────────────────────────
    // 1. ROUTE WEB : Générer le QR Code d'activation pour l'écran Web
    // ─────────────────────────────────────────────────────────────────
    app.get('/api/payments/qrcode/:userId', async (req, res) => {
        try {
            const { userId } = req.params;

            if (!isValidUUID(userId)) {
                return res.status(400).json({ success: false, message: "userId invalide (UUID requis)" });
            }

            // Trouver l'abonnement actif le plus récent de l'utilisateur
            const subscription = await Subscription.findOne({
                where: { 
                    user_id: userId,      // ✅ Correction : snake_case
                    status: 'active',
                    mobile_activation_token: { [Op.ne]: null } // Optionnel : token non nul
                },
                order: [['created_at', 'DESC']]  // ✅ utilisation de created_at (underscored)
            });

            if (!subscription || !subscription.mobile_activation_token) {
                return res.status(404).json({ 
                    success: false, 
                    message: "Aucun abonnement actif avec token d'activation disponible." 
                });
            }

            // Données à injecter dans le QR Code
            const qrData = JSON.stringify({
                source: "scholar_ai_web",
                token: subscription.mobile_activation_token
            });

            res.setHeader('Content-Type', 'image/png');
            QRCode.toFileStream(res, qrData, {
                color: { dark: '#1e3a8a', light: '#ffffff' },
                width: 256
            });

        } catch (error) {
            console.error("Erreur génération QR Code:", error);
            return res.status(500).json({ success: false, message: "Erreur serveur" });
        }
    });

    // ─────────────────────────────────────────────────────────────────
    // 2. ROUTE MOBILE : Activation par scan du QR Code
    // ─────────────────────────────────────────────────────────────────
    app.post('/api/auth/mobile/activate', async (req, res) => {
        try {
            const { token, deviceName } = req.body;

            if (!token) {
                return res.status(400).json({ success: false, message: "Token d'activation manquant" });
            }

            // Récupérer l'abonnement avec le token, actif, et non expiré
            const subscription = await Subscription.findOne({
                where: { 
                    mobile_activation_token: token,
                    status: 'active'
                },
                include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }]
            });

            if (!subscription) {
                return res.status(401).json({ 
                    success: false, 
                    message: "QR Code invalide, expiré ou déjà utilisé." 
                });
            }

            // Vérifier la date d'expiration (si le plan est TIME_BASED)
            const now = new Date();
            if (subscription.endDate && new Date(subscription.endDate) < now) {
                await subscription.update({ status: 'expired' });
                return res.status(410).json({ success: false, message: "Cet abonnement a expiré." });
            }

            // Consommer le token (ne peut être utilisé qu'une seule fois)
            await subscription.update({ mobile_activation_token: null });

            // Générer un JWT pour l'application mobile (optionnel)
            // const mobileJwt = jwt.sign(
            //     { id: subscription.user.id, role: subscription.user.role },
            //     process.env.JWT_SECRET,
            //     { expiresIn: '30d' }
            // );

            return res.json({
                success: true,
                message: "Application mobile activée avec succès !",
                user: {
                    firstName: subscription.user.firstName,
                    lastName: subscription.user.lastName,
                    email: subscription.user.email
                },
                subscription: {
                    planId: subscription.plan_id,
                    endDate: subscription.endDate,
                    remainingScans: subscription.remainingScans
                }
                // token: mobileJwt
            });

        } catch (error) {
            console.error("Erreur activation mobile:", error);
            return res.status(500).json({ success: false, message: "Erreur interne lors de l'activation" });
        }
    });
};
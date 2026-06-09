const bcrypt = require('bcrypt');
const privatekey = require('../../Auth/private_key');
const jwt = require('jsonwebtoken');
const { User } = require('../../db/sequelize');

module.exports = (app) => {

    // ─────────────────────────────────────────────────────────────────
    // POST /api/login — Connexion de l'utilisateur
    // ─────────────────────────────────────────────────────────────────
    app.post('/api/login', async (req, res) => {
        try {
            const { email, password } = req.body;
            
            // 1. Recherche de l'utilisateur
            const user = await User.findOne({ where: { email: email ? email.toLowerCase().trim() : '' } });
            console.log("Information de l'utilisateur authentifié :",user);
            
            // 💡 SÉCURITÉ : Message générique unifié pour l'email et le mot de passe
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Email ou mot de passe incorrect.',
                    user:user
                });
            }

            // 2. Vérifier si le compte est actif administrativement
            if (!user.isActive) {
                return res.status(403).json({
                    success: false,
                    message: 'Votre compte est désactivé. Veuillez contacter l\'administrateur.'
                });
            }

            // 3. 💡 NOUVEAU : Vérifier si l'e-mail a été validé
            if (!user.isVerified) {
                return res.status(403).json({
                    success: false,
                    message: 'Votre adresse e-mail n\'a pas encore été vérifiée. Veuillez consulter votre boîte de réception.'
                });
            }

            // 4. Validation du mot de passe
            const passwordCompare = await bcrypt.compare(password, user.password);
            if (!passwordCompare) {
                return res.status(401).json({
                    success: false,
                    message: 'Email ou mot de passe incorrect.' // 💡 Même message pour ne rien divulguer
                });
            }

            // Définir les permissions basées sur le rôle
            const getUserPermissions = (role) => {
                const permissions = {
                    admin: ['users:create', 'users:read', 'users:update', 'users:delete'],
                    secretariat: ['users:create', 'users:read', 'users:update'],
                    user: ['users:create', 'users:read', 'users:update']
                };
                return permissions[role] || [];
            };

            const userPermissions = getUserPermissions(user.role);

            // Payload JWT
            const payload = {
                id: user.id,
                email: user.email,
                role: user.role,
                permissions: userPermissions,
                firstName: user.firstName,
                lastName: user.lastName
            };

            // Génération du token JWT
            const token = jwt.sign(payload, privatekey, { expiresIn: '24h' });

            // Mettre à jour le lastLogin en BDD
            const now = new Date();
            await user.update({ lastLogin: now });

            // Réponse réussie
            return res.json({
                success: true,
                message: `Connexion réussie - Rôle: ${user.role}`,
                data: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    permissions: userPermissions,
                    isActive: user.isActive,
                    isVerified: user.isVerified,
                    lastLogin: now
                },
                token: token
            });

        } catch (error) {
            console.error('Erreur login:', error);
            return res.status(500).json({ 
                success: false,
                message: 'Erreur lors de la connexion', 
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    // ─────────────────────────────────────────────────────────────────
    // GET /api/login/:id — Récupérer l'état de l'utilisateur connecté
    // ─────────────────────────────────────────────────────────────────
    // 💡 Note: Idéalement, cette route devrait utiliser un middleware qui décode le token JWT
    app.get('/api/login/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(parseInt(id))) {
                return res.status(400).json({ success: false, message: "Identifiant invalide." });
            }

            const user = await User.findByPk(id);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "Utilisateur introuvable"
                });
            }

            // Re-générer dynamiquement les permissions pour éviter le crash de `req.user.permissions`
            const getUserPermissions = (role) => {
                const permissions = {
                    admin: ['users:create', 'users:read', 'users:update', 'users:delete'],
                    secretariat: ['users:create', 'users:read', 'users:update'],
                    user: ['users:create', 'users:read', 'users:update']
                };
                return permissions[role] || [];
            };

            return res.json({
                success: true,
                message: "Données de l'utilisateur récupérées",
                data: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    permissions: getUserPermissions(user.role), // 💡 Correction du bug ici
                    isActive: user.isActive,
                    isVerified: user.isVerified,
                    lastLogin: user.lastLogin
                }
            });

        } catch (error) {
            console.error('Erreur GET login:', error);
            return res.status(500).json({
                success: false,
                message: "Erreur lors de la récupération de l'utilisateur"
            });
        }
    });
};
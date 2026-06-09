const { User } = require("../../db/sequelize");
const { UniqueConstraintError, ValidationError } = require("sequelize");
const bcrypt = require('bcrypt');
const crypto = require('crypto'); // 💡 Importation du module natif pour générer le token
const { sendVerificationEmail } = require("../../services/emailService");

module.exports = (app) => {
    app.post('/api/users', async (req, res) => {
        try {
            const { email, password, firstName, lastName, role, isActive } = req.body;

            // Validation des champs obligatoires
            const requiredFields = ['email', 'password', 'firstName', 'lastName'];
            const missingFields = requiredFields.filter(field => !req.body[field]);

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

            // Validation de l'email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Format d\'email invalide',
                    details: 'L\'email doit avoir un format valide (ex: utilisateur@domaine.com)'
                });
            }

            // Validation de la longueur des champs
            if (firstName.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Le prénom doit contenir au moins 2 caractères'
                });
            }

            if (lastName.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Le nom doit contenir au moins 2 caractères'
                });
            }

            // Validation du mot de passe
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Le mot de passe doit contenir au moins 6 caractères'
                });
            }

            if (password.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Le mot de passe est trop long (max 100 caractères)'
                });
            }

            // Validation du rôle
            const validRoles = ['admin', 'secretariat', 'user'];
            if (role && !validRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: `Rôle invalide`,
                    details: `Les rôles valides sont: ${validRoles.join(', ')}`
                });
            }

            // Hachage sécurisé du mot de passe
            // const hashedPassword = await bcrypt.hash(password, 12);

            // 💡 Génération du jeton de vérification unique et de son expiration (+1 heure)
            const token = crypto.randomBytes(32).toString('hex');
            const expires = new Date();
            expires.setHours(expires.getHours() + 1);

            // Préparation des données
            const userData = {
                email: email.toLowerCase().trim(),
                password: password,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                role: role || 'user',
                isActive: isActive !== undefined ? Boolean(isActive) : true,
                // 💡 Ajout des données de validation
                isVerified: false, 
                verificationToken: token,
                verificationTokenExpires: expires
            };

            // Création de l'utilisateur
            const user = await User.create(userData);

            // 💡 Envoi de l'e-mail de confirmation en arrière-plan (non bloquant pour la réponse HTTP)
            sendVerificationEmail(user.email, token).catch(err => {
                console.error("Erreur lors de l'envoi de l'e-mail de validation:", err);
            });

            // Préparation de la réponse sans le mot de passe ni les jetons internes
            const userResponse = {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isActive: user.isActive,
                isVerified: user.isVerified, // Utile pour informer le Front-end React
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            };

            return res.status(201).json({
                success: true,
                message: `Utilisateur "${user.firstName} ${user.lastName}" créé avec succès. Un e-mail de confirmation a été envoyé.`,
                data: userResponse
            });

        } catch (error) {
            console.error('Erreur POST /api/users:', error);

            if (error instanceof ValidationError) {
                return res.status(400).json({
                    success: false,
                    message: 'Erreur de validation des données',
                    details: error.errors.map(err => ({
                        champ: err.path,
                        message: err.message,
                        valeur: err.value
                    }))
                });
            }

            if (error instanceof UniqueConstraintError) {
                const champ = error.fields ? Object.keys(error.fields)[0] : 'email';
                return res.status(409).json({
                    success: false,
                    message: 'Conflit de données',
                    details: `Un utilisateur avec ce ${champ} existe déjà`
                });
            }

            // Erreur de connexion à la base de données
            if (error.name === 'SequelizeConnectionError') {
                return res.status(503).json({
                    success: false,
                    message: 'Service temporairement indisponible',
                    error: 'Problème de connexion à la base de données'
                });
            }

            // Erreur générale
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la création de l\'utilisateur',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });
};
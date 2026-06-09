
const { User } = require("../../db/sequelize");
const { UniqueConstraintError, ValidationError } = require("sequelize");
const bcrypt = require('bcrypt');
const { auth, requireRole, requirePermission } = require("../../Auth/auth");
module.exports = (app) => {
    // PUT /api/users/:id - Mettre à jour un utilisateur
    app.put('/api/users/:id',auth,requireRole('admin','user','secretariat'), async (req, res) => {
        try {
            const id = req.params.id;
            const { email, password, firstName, lastName, role, isActive } = req.body;

            // Validation de l'ID
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "L'identifiant est requis"
                });
            }

            // Validation du format UUID (si applicable)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Format d'identifiant invalide",
                    details: "L'ID doit être au format UUID"
                });
            }

            // Vérification de l'existence de l'utilisateur
            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: `Utilisateur non trouvé avec l'identifiant: ${id}`
                });
            }

            // Vérification qu'au moins un champ est fourni pour la mise à jour
            const hasUpdateData = email || password || firstName || lastName || role || isActive !== undefined;
            if (!hasUpdateData) {
                return res.status(400).json({
                    success: false,
                    message: "Aucune donnée à mettre à jour",
                    details: "Fournissez au moins un champ à modifier (email, password, firstName, lastName, role, isActive)"
                });
            }

            // Préparation des données de mise à jour
            const updateData = {};
            
            // Validation et préparation de l'email
            if (email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Format d\'email invalide',
                        details: 'L\'email doit avoir un format valide (ex: utilisateur@domaine.com)'
                    });
                }
                updateData.email = email.toLowerCase().trim();
            }

            // Validation et hachage du mot de passe
            if (password && password.trim() !== '') {
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
                // updateData.password = await bcrypt.hash(password, 12);
            }

            // Validation des noms
            if (firstName) {
                if (firstName.trim().length < 2) {
                    return res.status(400).json({
                        success: false,
                        message: 'Le prénom doit contenir au moins 2 caractères'
                    });
                }
                updateData.firstName = firstName.trim();
            }

            if (lastName) {
                if (lastName.trim().length < 2) {
                    return res.status(400).json({
                        success: false,
                        message: 'Le nom doit contenir au moins 2 caractères'
                    });
                }
                updateData.lastName = lastName.trim();
            }

            // Validation du rôle
            if (role) {
                const validRoles = ['admin', 'secretariat', 'user'];
                if (!validRoles.includes(role)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Rôle invalide',
                        details: `Les rôles valides sont: ${validRoles.join(', ')}`
                    });
                }
                updateData.role = role;
            }

            // Gestion du statut actif
            if (isActive !== undefined) {
                updateData.isActive = Boolean(isActive);
            }

            // Mise à jour de l'utilisateur
            await user.update(updateData);

            // Rafraîchir les données pour avoir les valeurs actualisées
            await user.reload();

            // CORRECTION: SUPPRIMEZ CETTE LIGNE - Ne pas hacher le mot de passe ici
            // const passwordHased = await bcrypt.hash(password,12); // ← LIGNE À SUPPRIMER

            // Préparation de la réponse sans le mot de passe
            const userResponse = {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isActive: user.isActive,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            };

            return res.json({
                success: true,
                message: `Utilisateur "${user.firstName} ${user.lastName}" mis à jour avec succès`,
                data: userResponse
            });

        } catch (error) {
            console.error(`Erreur PUT /api/users/${req.params.id}:`, error);

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
                return res.status(409).json({
                    success: false,
                    message: 'Conflit de données',
                    details: 'Un utilisateur avec cet email existe déjà'
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
                message: 'Erreur lors de la mise à jour de l\'utilisateur',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });
};
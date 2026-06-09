const { auth } = require("../../Auth/auth");
const { User } = require("../../db/sequelize");

module.exports = (app) => {
    app.get('/api/users/:id',/*auth*/ async (req, res) => {
        try {
            const id = req.params.id;

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

            // Récupération de l'utilisateur
            const user = await User.findByPk(id, {
                attributes: { 
                    exclude: ['password'] // Exclusion sécurisée du mot de passe
                }
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: `Aucun utilisateur trouvé avec l'identifiant: ${id}`,
                    details: "Vérifiez que l'identifiant est correct"
                });
            }

            // Réponse réussie
            return res.json({
                success: true,
                message: `Utilisateur "${user.firstName} ${user.lastName}" récupéré avec succès`,
                data: user
            });

        } catch (error) {
            console.error(`Erreur GET /api/users/${req.params.id}:`, error);

            // Gestion spécifique des erreurs Sequelize
            if (error.name === 'SequelizeDatabaseError') {
                return res.status(500).json({
                    success: false,
                    message: "Erreur de base de données",
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }

            if (error.name === 'SequelizeConnectionError') {
                return res.status(503).json({
                    success: false,
                    message: "Service temporairement indisponible",
                    error: "Problème de connexion à la base de données"
                });
            }

            // Erreur générale
            return res.status(500).json({
                success: false,
                message: "Erreur lors de la récupération de l'utilisateur",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });
};
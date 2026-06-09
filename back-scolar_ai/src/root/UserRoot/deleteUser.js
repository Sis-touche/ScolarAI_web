const { auth, requireRole } = require("../../Auth/auth");
const { User } = require("../../db/sequelize");
    // module.exports=(app)=>{}

module.exports = (app) => {
    app.delete('/api/users/:id',auth,requireRole('admin','secretariat'), async (req, res) => {
        try {
            const id = req.params.id;

            // Validation de l'ID
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "L'identifiant est requis"
                });
            }

            // Vérification du format UUID (si applicable)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Format d'identifiant invalide",
                    details: "L'ID doit être au format UUID"
                });
            }

            // Recherche de l'utilisateur
            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: `Utilisateur non trouvé avec l'identifiant: ${id}`
                });
            }

            // Sauvegarde des données avant suppression
            const userData = { 
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt
            };

            // Suppression de l'utilisateur
            await user.update({isActive:false});

            // Réponse de succès
            return res.json({
                success: true,
                message: `L'utilisateur "${user.firstName} ${user.lastName}" a été supprimé avec succès`,
                data: userData
            });

        } catch (error) {
            console.error(`Erreur DELETE /api/users/${req.params.id}:`, error);

            // Gestion spécifique des erreurs Sequelize
            if (error.name === 'SequelizeDatabaseError') {
                return res.status(500).json({
                    success: false,
                    message: "Erreur de base de données lors de la suppression",
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
                message: "Erreur lors de la suppression de l'utilisateur",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });
};
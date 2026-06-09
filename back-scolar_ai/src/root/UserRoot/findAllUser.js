const { User } = require("../../db/sequelize");
const { ValidationError, UniqueConstraintError } = require("sequelize");
const bcrypt = require('bcrypt'); // Pour le hachage des mots de passe
const { auth, requireRole, requirePermission } = require("../../Auth/auth");

module.exports = (app) => {
    
    // GET /api/users - Récupérer tous les utilisateurs (avec pagination)
    app.get('/api/users',auth,requireRole('admin'),async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 20;
            const page = parseInt(req.query.page) || 1;
            const offset = (page - 1) * limit;

            // Validation pagination
            if (limit < 1 || limit > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Le paramètre limit doit être entre 1 et 100'
                });
            }

            if (page < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Le paramètre page doit être supérieur à 0'
                });
            }

            const { count, rows } = await User.findAndCountAll({
                attributes: { exclude: ['password'] }, // Exclure le mot de passe
                limit,
                offset,
                order: [['created_at', 'DESC']]
            });

            // Gestion des résultats vides
            if (count === 0) {
                return res.json({
                    success: true,
                    message: 'Aucun utilisateur trouvé',
                    data: [],
                    pagination: {
                        page,
                        limit,
                        total: 0,
                        totalPages: 0
                    }
                });
            }

            res.json({
                success: true,
                message: `${count} utilisateur(s) trouvé(s)`,
                data: rows,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            });

        } catch (error) {
            console.error('Erreur GET /api/users:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des utilisateurs',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

};
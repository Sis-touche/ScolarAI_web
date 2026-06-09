    const { User } = require('../../db/sequelize');
    const { Op } = require('sequelize');


module.exports = (app)=>{
app.get('/api/auth/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ success: false, message: "Le jeton de vérification est manquant." });
        }

        // Rechercher l'utilisateur avec ce token ET vérifier qu'il n'est pas expiré
        const user = await User.findOne({
            where: {
                verificationToken: token,
                verificationTokenExpires: {
                    [Op.gt]: new Date() // Doit être supérieur à la date/heure actuelle
                }
            }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Le jeton est invalide ou a expiré."
            });
        }

        // Mettre à jour l'utilisateur : valider le compte et nettoyer les champs de token
        user.isVerified = true;
        user.verificationToken = null;
        user.verificationTokenExpires = null;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Votre compte a été vérifié avec succès ! Vous pouvez maintenant vous connecter."
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Erreur lors de la vérification de l'e-mail." });
    }
});
}
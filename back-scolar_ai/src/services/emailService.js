const nodemailer = require('nodemailer');

// Configuration du transporteur (Exemple avec Gmail ou un service comme Mailtrap pour les tests)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true pour le port 465, false pour les autres ports
  auth: {
    user: process.env.EMAIL_USER, // Ton adresse email
    pass: process.env.EMAIL_PASS, // Ton mot de passe d'application (généré dans ton compte Google)
  },
  tls: {
    rejectUnauthorized: false // 💡 Évite les blocages de certificats en local
  }
});

const sendVerificationEmail = async (email, token) => {
  // Lien pointant vers ton application Front-End React
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  const mailOptions = {
    from: `"Scholar AI" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Vérification de votre compte - Scholar AI",
    html: `
      <h1>Bienvenue sur Scholar AI !</h1>
      <p>Merci de vous être inscrit. Veuillez cliquer sur le lien ci-dessous pour activer votre compte :</p>
      <a href="${verificationLink}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Vérifier mon compte</a>
      <p>Ce lien est valide pendant 1 heure.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationEmail };
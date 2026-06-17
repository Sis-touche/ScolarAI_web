require('dotenv').config();
const cors =require('cors');

const express =require('express');
const { initDb, sequelize } = require('./src/db/sequelize');
const PORT = process.env.PORT || 2026;
const app = express();
// import middlware
const morgan = require("morgan");
const Overduejob = require('./src/db/Overduejob');
// middleware
app
    .use(morgan('dev'))
    .use(express.json())
    .use(express.urlencoded({ extended: true }))
    .use(cors(
        {origin:'http://localhost:5173'}
    ));


    // chaine de Markov 
    require('./src/root/Chaine de Markove/Analyse')(app);
      // root User
    require('./src/root/UserRoot/findAllUser')(app);
    require('./src/root/UserRoot/findByPkUser')(app);
    require('./src/root/UserRoot/deleteUser')(app);
    require('./src/root/UserRoot/postUser')(app);
    require('./src/root/UserRoot/putUser')(app);
    require('./src/root/UserRoot/verifyEmail')(app);
    // root Payement
    require('./src/root/Payement/PayementRoot')(app);
    // route facture
    require('./src/root/Invoice/InvoiceRoot')(app);
    // Payement plan
    require('./src/root/PayementPlan/PayementPlanRoot')(app);
    // Pan
    require('./src/root/Plan/PlanRoot')(app);
    // Subscription
    require('./src/root/Subscription/SubscriptionRoot')(app);
    // Login
    require('./src/root/Login/login')(app);
    // QR Code
    require('./src/root/QRCode/codeQR')(app);
    // gestion des erreur 404
    app.use(({res})=>{
        const message = `impossible de trouver la ressource demander !Vous pouvez esseyez une autre URL.`;
        res.status(404).json({message})
    })

const startServer = async () => {
    try {
        // Initialiser la DB
        await initDb();
        const job = Overduejob(sequelize);
        job.start();
        // Démarrer le serveur
        app.listen(PORT, () => {
            console.log(`Serveur démarré sur le port http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Impossible de démarrer le serveur:', error);
        process.exit(1);
    }
};
startServer();

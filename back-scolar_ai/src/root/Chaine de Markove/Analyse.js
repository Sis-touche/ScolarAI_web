const { analyzeSchoolData } = require("./Analyzeschooldata");
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
module.exports = (app)=>{
    app.post('/api/analyse', upload.single('fichier'), (req, res) => {
    if (!req.file) return res.status(400).json({ erreur: 'Aucun fichier fourni' });
    try {
        const result = analyzeSchoolData(req.file.buffer);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erreur: 'Erreur lors de l’analyse du fichier' });
    }
});

}
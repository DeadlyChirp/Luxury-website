const express = require('express');
const app = express();
const port = 3000;

// Configuration de EJS comme moteur de template
app.set('view engine', 'ejs');

// Middleware pour servir les fichiers statiques
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

// Ajoutez d'autres routes ici

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
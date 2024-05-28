const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();
const port = 3100;
const session = require('express-session');

// Configuration de la base de données PostgreSQL
const pool = new Pool({
 user: 'pain',
 host: 'localhost',
 database: 'pain',
 password: 'pain',
 port: 5432,
});

//middleware pour gérer les fichiers envoyés par les formulaires
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/image/');
    },
    filename: function (req, file, cb) {
        cb(null,file.originalname);
    }
});
const upload = multer({ storage: storage });



app.use(session({
    secret: 'test-test-test-test', // Clé secrète pour signer le cookie de session
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

//Middleware pour analyser le corps des requêtes en URL encodées (notamment pour la connexion/inscription)
app.use(express.urlencoded({ extended: true }));

// Middleware pour servir les fichiers statiques
app.use(express.static('public'));

// Middleware pour analyser le corps des requêtes en JSON
app.use(express.json());

// Configuration de EJS comme moteur de template
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public/views'));

// Route pour la page d'accueil
app.get('/', async (req, res) => {


    console.log("Demande reçue pour la page d'accueil");
    const clientId = req.session.isLoggedIn ? req.session.clientId : null;
    console.log("Client ID:", clientId); 
    if (clientId) {
        const clientQuery = await pool.query('SELECT * FROM client WHERE id = $1', [clientId]);
        console.log("Client Query Result:", clientQuery.rows); 

        const client = clientQuery.rows.length > 0 ? clientQuery.rows[0] : null;
        console.log("Client:", client); 

        res.render('index', { isLoggedIn: req.session.isLoggedIn, clientId: clientId,
            isLoggedInGerant: req.session.isLoggedInGerant, gerantId: null, client: client
        });
    } else {
        res.render('index', { isLoggedIn: false, clientId: null,
            isLoggedInGerant: req.session.isLoggedInGerant, gerantId: null, client: null
        });
    }
});

// Route pour la connexion en tant que client
app.get('/login', (req, res) => {
 res.render('login', { error: undefined });
});

// Route de connexion
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(`Username: ${username}, Password: ${password}`); // Ajout d'un log temporaire pour vérifier les données reçues
  // Vérification de l'email et du mot de passe dans la base de données
  pool.query('SELECT * FROM client WHERE email = $1', [username], async (err, result) => {
      if (err) {
          console.error(err.message);
          return res.status(500).send('Erreur lors de la vérification des identifiants');
      }
      // Si aucun client n'est trouvé ou si le mot de passe ne correspond pas
      if (result.rows.length === 0 || result.rows[0].mot_de_passe !== password) {
          return res.render('login', { error: 'Email ou mot de passe incorrect.' });
      }
      // Si tout est correct, rediriger vers le profil
      req.session.clientId = result.rows[0].id; // Stocker l'ID du client dans la session
      req.session.isLoggedIn = true; 
      req.session.isLoggedInGerant = false;
      // Passer l'ID du client à la vue si l'utilisateur est connecté
      const clientId = req.session.isLoggedIn ? req.session.clientId : null;
      const clientQuery = await pool.query('SELECT * FROM client WHERE id = $1', [clientId]);
      const client = clientQuery.rows.length > 0 ? clientQuery.rows[0] : null;
      // Incrémenter le nombre de connexions
      await pool.query('UPDATE client SET nombre_connexions = nombre_connexions + 1 WHERE id = $1', [clientId]);
      res.render('index', { isLoggedIn: req.session.isLoggedIn, clientId: clientId,
          isLoggedInGerant: req.session.isLoggedInGerant, gerantId: null, client: client
      });
  });
});

// Route pour la connexion en tant que gérant (A FAIRE, PAS ENCORE FAIT !!!!)
app.get('/gerante', (req, res) => {
  res.render('gerante_login',{ error: undefined});
 });

//Route post connexion gérant
app.post('/gerante', async (req, res) => {
  const { username, password } = req.body;
  console.log(`Username: ${username}, Password: ${password}`); 
  const clientId = req.params.id;
  const client = await pool.query('SELECT * FROM client WHERE id = $1', [clientId]);
  pool.query('SELECT * FROM gerant WHERE nom = $1', [username], (err, result) => {
    console.log(result.rows);
    if (err) {
      console.error(err.message);
      return res.status(500).send('Erreur lors de la vérification des identifiants');
    }

    if (result.rows.length === 0 || result.rows[0].mot_de_passe !== password) {
      return res.render('gerante_login', { error: 'Nom ou mot de passe incorrect.' });
    }

    req.session.gerantId = result.rows[0].id; 
    req.session.isLoggedInGerant = true; 
    req.session.isLoggedIn = false;

    const gerantId = req.session.isLoggedInGerant ? req.session.gerantId : null;
    res.render('index', { isLoggedInGerant: req.session.isLoggedInGerant, gerantId: gerantId, 
      isLoggedIn: req.session.isLoggedIn, clientId: null, client: client.rows[0]
    });
  });
});


// Route pour le catalogue des cadeaux
app.get('/catalogue', async (req, res) => {
 
  const client = await pool.query('SELECT * FROM client WHERE id = $1', [req.session.clientId]);
  pool.query('SELECT * FROM cadeaux', (err, result) => {
      if (err) {
        console.error(err.message);
        return res.status(500).send('Erreur lors de la récupération des cadeaux');
      }
      res.render('catalogue', { cadeaux: result.rows , client: client.rows[0], isLoggedInGerant : req.session.isLoggedInGerant});
  });
});

//Route pour la fidelité
app.get('/fidelite', async (req, res) => {
  const clientId = req.session.clientId;
  if (!clientId) {
      return res.redirect('/login');
  }
  const client = await pool.query('SELECT * FROM client WHERE id = $1', [clientId]);
  const birthDate = new Date(client.rows[0].date_naissance);
  const today = new Date();
  const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  const daysUntilBirthday = (thisYearBirthday - today) / (1000 * 60 * 60 * 24);
  const pointsGained = client.rows[0].points + client.rows[0].point_fidelite;
  res.render('fidelite', { client: client.rows[0], daysUntilBirthday, pointsGained });
});


// Route pour le panier
app.get('/panier', async (req, res) => {
  const clientId = req.session.clientId;
  if (!clientId) {
      return res.redirect('/login');
  }
  const client = await pool.query('SELECT * FROM client WHERE id = $1', [clientId]);
  if (client.rows.length === 0) {
      return res.redirect('/login');
  }

  const panier = await pool.query('SELECT * FROM panier WHERE client_id = $1', [clientId]);
  let totalPoints = 0;
  const panierItemsWithCadeau = [];

  for (let item of panier.rows) {
      const cadeau = await pool.query('SELECT * FROM cadeaux WHERE id = $1', [item.cadeau_id]);
      if (cadeau.rows.length > 0) {
          totalPoints += cadeau.rows[0].prix * item.quantite;
          panierItemsWithCadeau.push({
              ...item,
              cadeau: cadeau.rows[0]
          });
      }
  }

  res.render('panier', { client: client.rows[0], panier: panierItemsWithCadeau, totalPoints: totalPoints });
});

// route pour ajouter un cadeau
app.get('/ajouter_cadeau', (req, res) => {
  res.render('ajouter_cadeau');
});

//route pour ajouter un cadeau
app.post('/ajouter_cadeau', upload.single('image'), async (req, res) => {
  const { nom, prix } = req.body;
  const image = '../image/'+path.basename(req.file.path);
  try {
    await pool.query('INSERT INTO cadeaux (nom, prix, image) VALUES ($1, $2, $3)', [nom, prix, image]);
    res.redirect('/catalogue');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur lors de l\'ajout du cadeau');
  }
});

// Route pour supprimer un cadeau
app.get('/supprimer_cadeau/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM cadeaux WHERE id = $1', [id]);
    res.redirect('/catalogue');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur lors de la suppression du cadeau');
  }
});

// Route pour la page d'inscription
app.get('/inscription', (req, res) => {
  res.render('inscription', { error: undefined });
});

// Route pour la recherche
app.post('/recherche', async (req, res) => {
  const recherche = req.body.recherche;
  const client = req.body.client;
  const results = await pool.query('SELECT * FROM cadeaux WHERE nom ILIKE $1', [`%${recherche}%`]);
  res.render('recherche', { results: results.rows , recherche: recherche, client: client, isLoggedInGerant : req.session.isLoggedInGerant});
});

// Route pour afficher le profil
app.get('/profil', async (req, res) => {
  if (!req.session.clientId) {
     // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
     return res.redirect('/login');
  }
  const client = await pool.query('SELECT * FROM client WHERE id = $1', [req.session.clientId]);
  if (client.rows.length === 0) {
     // Si aucun client n'est trouvé, rediriger vers la page de connexion
     return res.redirect('/login');
  }
  // Passer les données du client à la vue
  res.render('profil', { client: client.rows[0] });
 });


// Route pour gérer la soumission du formulaire d'inscription
app.post('/inscription', async (req, res) => {
  const { nom, email, password, date_naissance } = req.body;
  // Vérifiez l'email existe déjà
  pool.query('SELECT * FROM client WHERE email = $1', [email], async (err, result) => {
      if (err) {
          console.error(err.message);
          return res.status(500).send('Erreur lors de la vérification de l\'email');
      }
      // Si l'email existe déjà, renvoyer une erreur
      if (result.rows.length > 0) {
          return res.render('inscription', { error: 'Email déjà utilisé.' });
      }
      // Sinon, insérer le nouveau client dans la base de données
      pool.query('INSERT INTO client (nom, email, mot_de_passe, date_naissance) VALUES ($1, $2, $3, $4)', [nom, email, password, date_naissance]);
      res.redirect('/allconnexion');
  });
});

// Route pour la déconnexion
app.get('/logout', (req, res) => {
  // Détruire la session de l'utilisateur
  req.session.destroy(err => {
      if (err) {
          console.error(err);
          return res.status(500).send('Erreur lors de la déconnexion');
      }
      // Rediriger vers la page de connexion ou la page d'accueil
      res.redirect('/');
  });
});

// Route pour afficher le profil d'un client
app.get('/client/:id', async (req, res) => {
  const clientId = req.params.id;
  const client = await pool.query('SELECT * FROM client WHERE id = $1', [clientId]);
  res.render('client', { client: client.rows[0] });
});

//route pour selectionner un client en particulier
app.post('/modifier_client/:id', async (req, res) => {
  const clientId = req.params.id;
  const client = await pool.query('SELECT * FROM client WHERE id = $1', [clientId]);

  res.render('modifier_client', { client: client.rows[0] });
});

// Route pour mettre à jour les informations d'un client
app.post('/modifier_client/:id/modified', async (req, res) => {
  const clientId = req.params.id;
  const { nom, email, mot_de_passe, points } = req.body;

  await pool.query('UPDATE client SET nom = $1, email = $2, mot_de_passe = $3, points = $4 WHERE id = $5', [nom, email, mot_de_passe, points, clientId]);
  res.redirect('/allconnexion/');
});


// Route pour mettre à jour le mot de passe d'un client
app.post('/client/update-password', async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const clientId = req.session.clientId; 
  const client = await pool.query('SELECT * FROM client WHERE id = $1 AND mot_de_passe = $2', [clientId, oldPassword]);
  if (client.rows.length === 0) {
      return res.redirect('/client/' + clientId + '?error=Ancien mot de passe incorrect');
  }

  await pool.query('UPDATE client SET mot_de_passe = $1 WHERE id = $2', [newPassword, clientId]);

  res.redirect('/client/' + clientId + '?success=Mot de passe mis à jour avec succès');
});



// Route pour afficher tous les clients
app.get('/allconnexion', async (req, res) => {
  try {
      const result = await pool.query('SELECT * FROM client');
      const clients = result.rows;
      res.render('allconnexion', { clients });
  } catch (err) {
      console.error(err);
      res.status(500).send('Erreur lors de la récupération des clients');
  }
});

// Route pour supprimer un cadeau d'un panier
app.post('/panier/ajouter/:cadeauId', async (req, res) => {
  const { cadeauId } = req.params;
  const clientId = req.session.clientId;
  // Vérifier si le cadeau est déjà dans le panier pour le client
  const existingItem = await pool.query('SELECT * FROM panier WHERE client_id = $1 AND cadeau_id = $2', [clientId, cadeauId]);
  if (existingItem.rows.length > 0) {
      // Si le cadeau est déjà dans le panier, augmenter simplement la quantité
      await pool.query('UPDATE panier SET quantite = quantite + 1 WHERE client_id = $1 AND cadeau_id = $2', [clientId, cadeauId]);
  } else {
      // Sinon, ajouter le cadeau au panier
      await pool.query('INSERT INTO panier (client_id, cadeau_id) VALUES ($1, $2)', [clientId, cadeauId]);
  }
  res.redirect('/panier');
});

// Route pour supprimer un cadeau d'un panier
app.post('/panier/supprimer/:cadeauId', async (req, res) => {
  const { cadeauId } = req.params;
  const clientId = req.session.clientId;
  await pool.query('DELETE FROM panier WHERE client_id = $1 AND cadeau_id = $2', [clientId, cadeauId]);
  res.redirect('/panier');
});

// Route pour finaliser le panier
app.post('/panier/finaliser', async (req, res) => {
  const clientId = req.session.clientId;
  const panier = await pool.query('SELECT * FROM panier WHERE client_id = $1', [clientId]);
  let totalPoints = 0;
  panier.rows.forEach(async item => {
      const cadeau = await pool.query('SELECT * FROM cadeaux WHERE id = $1', [item.cadeau_id]);
      totalPoints += cadeau.rows[0].prix * item.quantite;
  });

  const client = await pool.query('SELECT * FROM client WHERE id = $1', [clientId]);
  if (client.rows[0].points >= totalPoints) {
      // Mettre à jour les points du client et vider le panier
      await pool.query('UPDATE client SET points = points - $1 WHERE id = $2', [totalPoints, clientId]);
      await pool.query('DELETE FROM panier WHERE client_id = $1', [clientId]);
      res.redirect('/panier?success=Panier finalisé avec succès');
  } else {
      res.redirect('/panier?error=Pas assez de points');
  }
});


// Démarrer le serveur
app.listen(port, () => {
 console.log(`Server running at http://localhost:${port}`);
});
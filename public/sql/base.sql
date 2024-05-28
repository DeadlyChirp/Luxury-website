-- Création des tables
CREATE TABLE cadeaux (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    prix DECIMAL(10, 2) NOT NULL,
    image VARCHAR(255) NOT NULL
);

CREATE TABLE client (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    points INTEGER DEFAULT 0,
    point_fidelite INTEGER DEFAULT 0,
    cadeau_anniversaire VARCHAR(255),
    date_naissance DATE,
    nombre_connexions INTEGER DEFAULT 0
);

CREATE TABLE gerant (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL
);

CREATE TABLE panier (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES client(id),
    cadeau_id INTEGER REFERENCES cadeaux(id),
    quantite INTEGER DEFAULT 1
);

-- Insertion des données initiales
INSERT INTO client (nom, email, mot_de_passe, points, point_fidelite, cadeau_anniversaire, date_naissance) VALUES
('Client 1', 'jeje@gmail.com', 'jeje', 1000, 0, '../image/cadeau1.png', DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year' + INTERVAL '1 day' * FLOOR(RANDOM() * 365)),
('Client 2', 'coco@gmail.com', 'coco', 1000, 0, '../image/cadeau2.png', DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year' + INTERVAL '1 day' * FLOOR(RANDOM() * 365)),
('Client 3', 'jaja@gmail.com', 'jaja', 1000, 0, '../image/cadeau3.png', DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year' + INTERVAL '1 day' * FLOOR(RANDOM() * 365));

INSERT INTO cadeaux (nom, prix, image) VALUES
('Cadeau 1', 100, '../image/fidelite_image.png'),
('Cadeau 2', 200, '../image/fidelite_image.png'),
('T-shirt Parkside', 1000000 , '../image/tshirtparkside.jpg'),
('Focusrite Scarlett Solo 3rd Gen',1000,'../image/scarlett.jpg'),
('Cricri',2,'../image/cricri.JPG'),
('iPhone 15 Pro',1,'../image/81Wwngkh2OL._AC_UF1000,1000_QL80_.jpg'),
('Date avec Eichiro Oda <3',200000,'../image/avt_eiichiro-oda_5427.jpg'),
('Menu Manga',9999999,'../image/menumanga.jpg'),
('Rolex GMT MASTER II',3,'../image/M126710BLRO-0001_03_front-facing-landscape.png'),
('Licence FL STUDIO',40,'../image/FL-Studio-12-Logo.png'),
('clio2 dci tres bon etat',200,'../image/Vehicule.jpg');

INSERT INTO gerant (nom, mot_de_passe) VALUES
('Admin1', 'admin1'),
('Admin2', 'admin2');
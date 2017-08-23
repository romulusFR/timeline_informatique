# Projet de jeu de carte "Timeline Informatique"

Réalisé pour la fête de la science 2017 au département informatique de l'Université Claude Bernard Lyon 1.

## Modèle de carte LaTeX

Adapté de celui de Arvid

 * https://tex.stackexchange.com/questions/47924/creating-playing-cards-using-tikz
 * https://tex.stackexchange.com/questions/243740/print-double-sided-playing-cards
 
## Contenu et description des cartes
 
 Les cartes sont créées à partir d'un fichier csv au format id,type,title,year,picture,credits,description,credits_color
 
 * *id* : le numéro de la carte, n'apparait pas sur la carte
 * *type* : sont type à choisir dans *pop, hard, soft, lang, theory, game, web, univ* (apparait verticalement sur la gauche de la carte)
 * *tile* : le nom de l'invention, de l'événement, de la personne ...
 * *year* : l'année de découverte (apparait avec le texte de la description au verso de la carte)
 * *picture* : une url vers une image dans un format supporté par pdfLaTeX
 * *credits* : crédits de l'illustration (apparait au recto de la carte uniquement)
 * *description* : court texte (apparait au verso de la carte)
 * *credits_color* : couleur dans laquelle rendre les crédits de l'illustration
 
 
## Génération des cartes

Un script javascript va parser le fichier csv de description pour 
 - télécharger les images
 - les recadrer
 - générer les .tex des cartes individuelles (un .tex pour le recto, un .tex pour le verso)
 - générer le jeu de cartes avec une face par page
 - générer le jeu de cartes avec neuf faces par page
 
## Jeu de test

Le dossier [test_deck](test_deck) comprend quelques cartes de test.

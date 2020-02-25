Projet de jeu de carte "Timeline Informatique"
==============================================

Réalisé pour la fête de la science 2017 au département informatique de l'Université Claude Bernard Lyon 1.

[Le rendu final est accessible ici](http://liris.cnrs.fr/romuald.thion/files/Communication/Timeline/)

Présentation
------------

Le jeu est généré en PDF en utilisant LaTeX à partir de la description des cartes dans un fichier CSV.
Le processus de génération **est entièrement automatisé**, ce qui inclut :

  - le téléchargement des images (option `--download`);
  - le renommage "de courtoisie" des images téléchargées;
  - le recentrage automatique (option `--resize`) des images;
  - la génération des fichiers LaTeX individuels (un verso, un recto) (option `--generate`);
  - la génération des planches LaTeX (soit 1 soit 9 carte par page) avec padding de cartes blanches si le nombre de cartes n'est pas multiple de 9 (options `--nine-by-page` et `--one-by-page`);

La génération de carte dans un autre format que les cartes poker (par défaut) n'est _pas complètement automatisée_, elle nécessite de modifier les bases de cartes LaTeX.

### Dépendances

* Node.js et npm pour gérer les dépendances Node.js;
* la génération des `.pdf` finaux nécessite une chaine `pdflatex` avec TikZ;
* éventuellement, `Makefile` et `rubber` pour la génération.


### Installation et exécution

```bash
git clone https://github.com/romulusFR/timeline_informatique.git
npm install

nodejs build.js -drg19 ./content/computer_history_timeline.csv
make

# one_card_by_page.pdf
# nine_cards_by_page.pdf
```

Licence
-------

### Licence du projet

Le présent projet est en licence Crative Commons BY-NC-SA 3.0, par Romuald THION

Vous devez créditer l'oeuvre, vous n'êtes pas autorisé à faire un usage commercial de cette oeuvre et de tout ou partie du matériel la composant. Dans le cas où vous effectuez un remix, que vous transformez, ou créez à partir du matériel composant l'oeuvre originale, vous devez diffuser l'oeuvre modifiée dans les même conditions.

<https://creativecommons.org/licenses/by-nc-sa/3.0/fr/>

### Modèle de carte LaTeX

Le modèle de carte LaTeX est adapté de celui de Arvid. Il utilise TikZ, voir les fichiers [./latex/tikzcards.tex](./latex/tikzcards.tex) et [./latex/packages.tex](./latex/packages.tex)

* <https://tex.stackexchange.com/questions/47924/creating-playing-cards-using-tikz>
* <https://tex.stackexchange.com/questions/243740/print-double-sided-playing-cards>

### Licences des contenus

* les contenus textuels des cartes sont [sous licence CC BY-SA 3.0 de wikipedia](https://fr.wikipedia.org/wiki/Wikip%C3%A9dia:Citation_et_r%C3%A9utilisation_du_contenu_de_Wikip%C3%A9dia)
* les images des cartes sont créditées individuellement (domaine public, CHM Timeline, Wikipedia etc.) dans les définitions des cartes

Contenu et description des cartes
-----------------------------------

Les cartes sont créées à partir d'un fichier csv au format `id,type,title,year,picture,credits,description,credits_color`.

* *id* : le numéro de la carte, n'apparait pas sur la carte
* *type* : son type à choisir dans *pop, hard, soft, lang, theory, game, web, univ* (apparait verticalement sur la gauche de la carte)
* *tile* : le nom de l'invention, de l'événement, de la personne ...
* *year* : l'année de découverte (apparait avec le texte de la description au verso de la carte)
* *picture* : une url vers une image dans un format supporté par pdfLaTeX
* *credits* : crédits de l'illustration (apparait au recto de la carte uniquement)
* *description* : court texte (apparait au verso de la carte)
* *credits_color* : couleur dans laquelle rendre les crédits de l'illustration

Le fichier [`./content/computer_history_timeline.csv`](./content/computer_history_timeline.csv) contient l'ensemble des cartes du jeu.
La carte des règles est gérée séparément, elle est décrite (en dur) dans le dépôt (fichiers [`./special_cards/0_rules_front.tex`](./special_cards/0_rules_front.tex) et  [`./special_cards/0_rules_back.tex`](./special_cards/0_rules_back.tex)).
Des cartes "blanches", sur le modèle [`./special_cards/00_blank.tex`](./special_cards/00_blank.tex) sont aussi automatiquement ajoutée au jeu si celui-ci n'est pas un multiple de 9 cartes.

Génération des cartes
------------------------
Le script javascript [`build.js`](build.js) va parser le fichier csv de description pour :

* `-d` ou `--download` : télécharger les images dont les urls sont données dans le csv (champ `picture`)
* `-r` ou `--resize` : recadrer des images (marche pour des images déjà téléchargées via `-r`)
* `-g` ou `--generate` : générer les .tex des cartes individuelles (un .tex pour le recto, un .tex pour le verso)
* `-1` ou `--nine-by-page` :  générer le jeu de cartes avec une face par page
* `-2` ou `--one-by-page` : générer le jeu de cartes avec neuf faces par page

Exécuter `nodejs build.js --help` pour l'aide. Pour tout regénérer (c-à-d, télécharger les images, les recadrer, générer les .tex individuels, le jeu une face par page et le jeu 9 faces par page) les commandes sont les suivantes
```bash
# download
nodejs build.js -d  ./content/computer_history_timeline.csv            
# resize des images
nodejs build.js -r  ./content/computer_history_timeline.csv   
# generation des cartes individuelles .tex
nodejs build.js -g -1 -9 ./content/computer_history_timeline.csv             
# génération des planches
nodejs build.js -1 -9 ./content/computer_history_timeline.csv

# les options sont combinables
nodejs build.js -dg19r ./content/computer_history_timeline.csv
```
Pour activer le mode debug, avec la bibliothèque [debug](https://www.npmjs.com/package/debug) il suffit de fixer la variable shell `DEBUG`  comme ceci :
```bash
DEBUG=timeline nodejs build.js [options] <fichiers>
```

Ensuite, il faut compiler les fichiers .tex avec pdfLaTeX, voir le fichier [Makefile](./Makefile). Pour tout regénérer, taper simplement `make`, la cible par défaut générant les pdfs avec une face par page et celui avec 9 faces par page en utilisant [rubber](https://launchpad.net/rubber/). Pour générer à la main, utiliser `pdflatex nine_cards_by_page.tex` ou `pdflatex one_card_by_page.tex`.

Jeu de test
--------------

Le dossier [test_deck](test_deck) comprend quelques cartes de test, telles que générées à partir du csv. Elle servent à mettre au point ou modifier le fichier [./latex/tikzcards.tex](./latex/tikzcards.tex).
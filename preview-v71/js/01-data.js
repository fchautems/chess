
    "use strict";

    const OPENINGS = [
      {
        id: "italian",
        color: "white",
        name: "Partie italienne",
        description: "Développement rapide, pression sur f7 et jeu naturel au centre.",
        variations: [
          {
            id: "giuoco-piano",
            name: "Giuoco Piano",
            summary: "Préparer d4 avec c3, ouvrir le centre au bon moment, puis roquer rapidement.",
            moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d4", "exd4", "cxd4", "Bb4+", "Bd2", "Bxd2+", "Nbxd2", "d5", "exd5", "Nxd5", "O-O", "O-O"],
            notes: {
              0: "Occupe le centre et libère en même temps ton fou et ta dame.",
              2: "Développe une pièce en attaquant immédiatement le pion e5.",
              4: "Place ton fou sur une diagonale active pour viser f7, le point fragile du camp noir.",
              6: "Soutiens ton centre et prépare une poussée en d4 pour l’ouvrir au bon moment.",
              8: "Ouvre le centre maintenant que tes pièces sont mieux développées.",
              10: "Reprends au centre afin de conserver deux pions centraux actifs.",
              12: "Réponds à l’échec en développant une pièce et en proposant l’échange des fous.",
              14: "Reprends avec une pièce qui se développe vers le centre sans exposer ta dame.",
              16: "Récupère le pion central avant que les Noirs ne consolident leur avantage.",
              18: "Mets ton roi à l’abri et active ta tour sur la colonne f."
            }
          }
        ]
      },
      {
        id: "spanish",
        color: "white",
        name: "Partie espagnole",
        description: "Pression positionnelle sur le cavalier c6 et le centre noir.",
        variations: [
          {
            id: "berlin",
            name: "Défense berlinoise",
            summary: "Mettre e5 sous pression, roquer avant d’ouvrir le centre, puis viser une finale favorable.",
            moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "Nf6", "O-O", "Nxe4", "d4", "Nd6", "Bxc6", "dxc6", "dxe5", "Nf5", "Qxd8+", "Kxd8", "Nc3", "Ke8"],
            notes: {
              0: "Occupe le centre et libère ton fou ainsi que ta dame.",
              2: "Développe une pièce en attaquant e5 et rapproche-toi du roque.",
              4: "Cloue le cavalier c6, défenseur du pion e5, afin d’augmenter la pression sur le centre noir.",
              6: "Mets ton roi en sécurité avant que le centre ne s’ouvre.",
              8: "Attaque le cavalier e4 et conteste le centre en gagnant du temps.",
              10: "Échange ton fou contre le cavalier pour détériorer la structure de pions noire.",
              12: "Récupère le pion e5 et établis un pion avancé au centre.",
              14: "Échange les dames pour empêcher le roi noir de roquer et entrer dans la finale berlinoise.",
              16: "Développe ta dernière pièce légère vers le centre et renforce e4 et d5."
            }
          }
        ]
      },
      {
        id: "london",
        color: "white",
        name: "Système de Londres",
        description: "Une structure robuste et facile à retrouver contre de nombreuses réponses.",
        variations: [
          {
            id: "classical-london",
            name: "Développement classique",
            summary: "Installer une structure solide, sortir le fou avant e3 et terminer le développement sans faiblesse.",
            moves: ["d4", "d5", "Nf3", "Nf6", "Bf4", "e6", "e3", "Bd6", "Bg3", "O-O", "Bd3", "c5", "c3", "Nc6", "Nbd2", "Qc7", "O-O", "Bxg3", "hxg3"],
            notes: {
              0: "Occupe le centre et ouvre la diagonale de ton fou de cases noires.",
              2: "Développe ton cavalier sans bloquer le pion c, utile pour soutenir le centre.",
              4: "Sors ton fou actif avant de fermer sa diagonale avec le pion e.",
              6: "Renforce le pion d4 et libère ton fou de cases blanches.",
              8: "Préserve ton fou important tout en maintenant la pression sur la diagonale.",
              10: "Développe ton fou en direction du roi noir et prépare le roque.",
              12: "Stabilise le centre et prépare éventuellement une expansion par e4.",
              14: "Termine le développement de tes pièces légères et soutiens e4.",
              16: "Mets ton roi en sécurité et relie tes tours.",
              18: "Reprends en ouvrant la colonne h, qui pourra servir pour une attaque sur le roi."
            }
          }
        ]
      },
      {
        id: "sicilian",
        color: "black",
        name: "Défense sicilienne",
        description: "Une réponse asymétrique à 1.e4 qui crée immédiatement du contre-jeu.",
        variations: [
          {
            id: "najdorf",
            name: "Variante Najdorf",
            summary: "Créer un jeu asymétrique, contrôler b5 avec ...a6 et préparer l’expansion ...b5.",
            moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6", "Be3", "e5", "Nb3", "Be6", "f3", "Be7", "Qd2", "O-O", "O-O-O"],
            notes: {
              1: "Attaque le centre blanc depuis l’aile et crée immédiatement une position asymétrique.",
              3: "Contrôle e5 et prépare le développement du cavalier ainsi qu’une future poussée centrale.",
              5: "Élimine le pion central blanc pour ouvrir la colonne c et réduire son contrôle du centre.",
              7: "Développe ton cavalier en attaquant e4 et force les Blancs à défendre leur centre.",
              9: "Contrôle b5, empêche une pièce blanche de s’y installer et prépare ton expansion à l’aile dame.",
              11: "Chasse le cavalier central et gagne de l’espace au centre.",
              13: "Développe ton fou vers une diagonale active et renforce le contrôle du centre.",
              15: "Développe ton dernier fou et prépare la sécurité de ton roi.",
              17: "Mets ton roi à l’abri avant le lancement des attaques sur des ailes opposées."
            }
          }
        ]
      },
      {
        id: "french",
        color: "black",
        name: "Défense française",
        description: "Une structure solide où les Noirs attaquent la chaîne de pions blanche.",
        variations: [
          {
            id: "advance",
            name: "Variante d'avance",
            summary: "Attaquer la base de la chaîne blanche avec ...c5, puis accumuler la pression sur d4.",
            moves: ["e4", "e6", "d4", "d5", "e5", "c5", "c3", "Nc6", "Nf3", "Qb6", "Bd3", "cxd4", "cxd4", "Bd7", "O-O", "Nxd4", "Nxd4", "Qxd4", "Nc3", "Qxe5", "Re1"],
            notes: {
              1: "Prépare la poussée ...d5 afin de contester le centre avec une structure solide.",
              3: "Conteste immédiatement le centre blanc et bloque temporairement le pion e4.",
              5: "Attaque la base de la chaîne de pions blanche avant qu’elle ne se consolide.",
              7: "Développe ton cavalier en ajoutant un attaquant sur d4.",
              9: "Place ta dame de façon à attaquer simultanément d4 et b2.",
              11: "Échange en d4 pour fragiliser le centre blanc et ouvrir des lignes.",
              13: "Développe ton fou, protège le cavalier et facilite la coordination de tes tours.",
              15: "Profite de tous les attaquants accumulés pour gagner le pion d4.",
              17: "Reprends la pièce au centre tout en gardant ta dame active.",
              19: "Récupère le pion e5 tout en anticipant l’attaque de la tour blanche sur ta dame."
            }
          }
        ]
      },
      {
        id: "caro-kann",
        color: "black",
        name: "Défense Caro-Kann",
        description: "Une défense fiable contre 1.e4, avec une structure saine et un fou actif.",
        variations: [
          {
            id: "classical-caro",
            name: "Variante classique",
            summary: "Contester le centre avec ...d5, sortir le fou avant ...e6 et conserver une structure saine.",
            moves: ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Bf5", "Ng3", "Bg6", "h4", "h6", "Nf3", "Nd7", "h5", "Bh7", "Bd3", "Bxd3", "Qxd3", "e6"],
            notes: {
              1: "Prépare ...d5 tout en laissant libre ton fou de cases blanches.",
              3: "Conteste immédiatement le centre blanc avec une structure saine.",
              5: "Échange le pion central pour réduire l’espace blanc et libérer ton fou.",
              7: "Développe ton fou hors de la chaîne de pions avant de jouer ...e6.",
              9: "Conserve ton fou actif tout en évitant l’attaque du cavalier.",
              11: "Crée une case de repli pour ton fou et demande au pion blanc de préciser ses intentions.",
              13: "Développe ton cavalier et prépare le soutien du centre ainsi que ...Ngf6.",
              15: "Mets ton fou à l’abri sans abandonner son contrôle des cases importantes.",
              17: "Échange ton fou contre le fou blanc actif afin de réduire son potentiel d’attaque.",
              19: "Consolide le centre et ouvre la diagonale de ton fou de cases noires."
            }
          }
        ]
      }
    ];



    const CAMPAIGN = {
      italian: {
        difficulty: "Débutant", style: "Actif et naturel",
        principle: "Développer rapidement, viser f7, roquer et préparer la poussée d4.",
        concept: "L’Italienne ne cherche pas une attaque immédiate à tout prix. Elle place rapidement le cavalier et le fou sur leurs cases naturelles, oblige les Noirs à défendre le centre, puis choisit le bon moment pour jouer c3 et d4. La sécurité du roi passe avant l’ouverture complète du centre.",
        plans: ["Développer le cavalier et le fou avec tempo", "Mettre le roi à l’abri", "Préparer c3 puis d4"],
        mistakes: ["Attaquer f7 avec trop peu de pièces", "Oublier que ...Cf6 attaque e4", "Ouvrir le centre alors que le roi est encore au milieu"],
        checklist: ["Qu’a changé le dernier coup noir : attaque, défense ou préparation ?", "Mon pion e4 est-il attaqué ?", "Mon roi est-il assez sûr pour ouvrir le centre ?", "La rupture d4 est-elle préparée par c3 ou par le développement ?"],
        branchSignals: [
          ["...Fc5", "Développement symétrique : prépare c3 puis d4, mais ne te précipite pas avant le roque."],
          ["...Cf6", "Le pion e4 est attaqué : choisis un plan calme avec d3, ou une ligne tactique si elle fait partie du répertoire."],
          ["...Fe7", "Les Noirs sont plus passifs : profite-en pour prendre davantage d’espace au centre avec d4."],
          ["...d6", "e5 est solidement défendu mais le fou f8 est gêné : ouvre le centre au bon moment avec d4."]
        ],
        unlock: null
      },
      london: {
        difficulty: "Débutant", style: "Solide",
        principle: "Construire une structure stable et sortir le fou avant de jouer e3.",
        plans: ["Installer d4, Cf3 et Ff4", "Développer sans créer de faiblesse", "Préparer e4 au bon moment"],
        mistakes: ["Jouer automatiquement sans regarder les menaces", "Enfermer le fou de cases noires"],
        unlock: null
      },
      spanish: {
        difficulty: "Intermédiaire", style: "Positionnel",
        principle: "Mettre le centre noir sous pression en clouant le cavalier c6.",
        plans: ["Roquer rapidement", "Préparer c3 et d4", "Maintenir la pression sur e5"],
        mistakes: ["Échanger en c6 sans raison", "Pousser le centre trop tôt"],
        unlock: { opening: "italian", level: 3, text: "Vaincre le boss du niveau 3 de la Partie italienne" }
      },
      french: {
        difficulty: "Débutant", style: "Solide et stratégique",
        principle: "Contester le centre par ...d5 puis attaquer la base de la chaîne blanche avec ...c5.",
        plans: ["Faire pression sur d4", "Développer les pièces derrière la chaîne", "Chercher les bons échanges"],
        mistakes: ["Laisser le fou c8 sans plan", "Attaquer la pointe plutôt que la base de la chaîne"],
        unlock: null
      },
      "caro-kann": {
        difficulty: "Débutant", style: "Fiable",
        principle: "Contester le centre avec ...d5 tout en gardant une structure saine et un fou actif.",
        plans: ["Sortir le fou avant ...e6", "Développer sans faiblesse", "Viser une finale saine"],
        mistakes: ["Enfermer le fou c8", "Jouer trop passivement"],
        unlock: null
      },
      sicilian: {
        difficulty: "Avancé", style: "Tactique et asymétrique",
        principle: "Créer du contre-jeu sur l’aile dame au lieu de copier le centre blanc.",
        plans: ["Ouvrir la colonne c", "Développer avec tempo sur e4", "Préparer ...b5"],
        mistakes: ["Retarder le développement", "Lancer ...b5 sans préparation"],
        unlock: { opening: "caro-kann", level: 2, text: "Maîtriser le niveau 2 de la Caro-Kann" }
      }
    };

    const EXTRA_VARIATIONS = {
      italian: [
        {
          id: "two-knights", level: 2, name: "Défense des Deux Cavaliers",
          summary: "Les Noirs attaquent immédiatement e4 avec ...Cf6. Le répertoire choisit d3, roque, puis c3 pour préparer d4.",
          moves: ["e4","e5","Nf3","Nc6","Bc4","Nf6","d3","Bc5","O-O","d6","c3","O-O","Re1","a6"],
          opponentNotes: {
            5:"...Cf6 développe avec tempo : le cavalier attaque ton pion e4.",
            7:"...Fc5 développe le fou et exerce une pression sur f2.",
            9:"...d6 consolide e5 et prépare le développement du fou c8.",
            11:"Les Noirs roquent : le centre peut maintenant s’ouvrir.",
            13:"...a6 prépare parfois ...b5 et demande au fou de prévoir une case de repli."
          },
          notes: {
            0:"Occupe le centre et libère ton fou ainsi que ta dame.",
            2:"Développe le cavalier en attaquant e5.",
            4:"Développe le fou vers f7, la case la plus sensible du camp noir.",
            6:"Défends e4 sans bloquer ton fou et garde la possibilité de jouer d4 plus tard.",
            8:"Mets ton roi à l’abri avant d’ouvrir le centre.",
            10:"Prépare d4 et donne une case de repli au fou c4.",
            12:"Place la tour derrière e4 pour renforcer le centre."
          }
        },
        {
          id: "hungarian", level: 2, name: "Défense hongroise",
          summary: "Face à ...Fe7, une réponse plus passive, prends davantage d’espace au centre avec d4.",
          moves: ["e4","e5","Nf3","Nc6","Bc4","Be7","d4","d6","O-O","Nf6","Re1","O-O","c3"],
          opponentNotes: {
            5:"...Fe7 est solide mais moins actif que ...Fc5 : les Noirs préparent surtout le roque.",
            7:"...d6 soutient e5 et ferme temporairement le centre.",
            9:"...Cf6 attaque e4 et termine le développement de l’aile roi.",
            11:"Le roi noir est en sécurité : il faut préparer l’ouverture du centre."
          },
          notes: {
            0:"Prends le centre et libère tes pièces.",
            2:"Développe avec tempo sur le pion e5.",
            4:"Place le fou sur une diagonale active vers f7.",
            6:"Profite du développement prudent des Noirs pour occuper immédiatement plus de terrain au centre.",
            8:"Roque avant que le centre ne s’ouvre.",
            10:"Soutiens e4 et prépare les ruptures centrales.",
            12:"Renforce d4 et prépare éventuellement d5."
          }
        },
        {
          id: "classical-d6", level: 2, name: "Défense classique avec ...d6",
          summary: "Les Noirs consolident e5 très tôt. Ouvre le centre par d4 et développe tes pièces avec tempo.",
          moves: ["e4","e5","Nf3","Nc6","Bc4","d6","d4","exd4","Nxd4","Nf6","Nc3","Be7","O-O","O-O"],
          opponentNotes: {
            5:"...d6 défend e5 mais enferme momentanément le fou f8.",
            7:"...exd4 accepte l’échange central et libère la case e5.",
            9:"...Cf6 développe avec tempo sur e4.",
            11:"...Fe7 prépare le roque et termine le développement de l’aile roi.",
            13:"Les deux rois sont à l’abri : la lutte porte maintenant sur le centre."
          },
          notes: {
            0:"Occupe le centre.",
            2:"Développe ton cavalier en attaquant e5.",
            4:"Développe le fou vers f7.",
            6:"Profite de la position un peu passive des Noirs pour ouvrir le centre avec d4.",
            8:"Reprends avec le cavalier : il gagne une case centrale active.",
            10:"Développe le second cavalier et augmente la pression sur d5 et e4.",
            12:"Mets ton roi en sécurité et connecte progressivement tes tours."
          }
        }
      ],
      london: [
        {
          id: "london-qb6", level: 2, name: "Pression rapide sur b2",
          summary: "Réagir à ...Db6 sans abandonner la structure du Londres.",
          moves: ["d4","d5","Nf3","Nf6","Bf4","c5","e3","Nc6","c3","Qb6","Qb3","c4","Qc2","Bf5","Qc1","e6","Nbd2"],
          notes: {0:"Occupe le centre.",2:"Développe le cavalier sans bloquer c.",4:"Sors le fou avant e3.",6:"Soutiens d4.",8:"Stabilise le centre.",10:"Défends b2 tout en proposant l’échange des dames.",12:"Conserve la dame active sans perdre b2.",14:"Évite le tempo sur ta dame et garde ta structure.",16:"Complète le développement."}
        },
        {
          id: "london-bf5", level: 3, name: "Fou noir actif en f5",
          summary: "Échanger le bon fou et garder une structure saine.",
          moves: ["d4","d5","Nf3","Nf6","Bf4","Bf5","e3","e6","Bd3","Bxd3","Qxd3","Bd6","Bg3","O-O","Nbd2"],
          notes: {0:"Prends le centre.",2:"Développe le cavalier.",4:"Installe le fou du Londres.",6:"Soutiens d4.",8:"Propose l’échange du fou actif des Noirs.",10:"Reprends avec la dame sans abîmer les pions.",12:"Préserve ton fou utile.",14:"Termine le développement des pièces légères."}
        }
      ],
      spanish: [
        {
          id: "closed-spanish", level: 2, name: "Espagnole fermée",
          summary: "Conserver la tension puis préparer c3 et d4.",
          moves: ["e4","e5","Nf3","Nc6","Bb5","a6","Ba4","Nf6","O-O","Be7","Re1","b5","Bb3","d6","c3","O-O","h3"],
          notes: {0:"Occupe le centre.",2:"Attaque e5.",4:"Cloue le défenseur du centre.",6:"Préserve le fou et maintiens la pression.",8:"Roque avant d’ouvrir le centre.",10:"Soutiens e4.",12:"Garde le fou sur la diagonale a2-g8.",14:"Prépare d4.",16:"Évite le clouage ...Fg4 et donne une case au roi."}
        }
      ],
      french: [
        {
          id: "winawer", level: 2, name: "Variante Winawer",
          summary: "Clouer le cavalier c3 puis attaquer le centre blanc.",
          moves: ["e4","e6","d4","d5","Nc3","Bb4","e5","c5","a3","Bxc3+","bxc3","Ne7","Nf3","Qa5","Bd2","Qa4"],
          notes: {1:"Prépare ...d5.",3:"Conteste le centre.",5:"Cloue le cavalier qui soutient e4.",7:"Attaque la base d4.",9:"Abîme la structure blanche en échangeant en c3.",11:"Développe le cavalier vers f5 ou g6.",13:"Mets la pression sur c3 et a3.",15:"Conserve une dame active tout en évitant le développement blanc."}
        }
      ],
      "caro-kann": [
        {
          id: "caro-advance", level: 2, name: "Variante d’avance",
          summary: "Sortir le fou avant ...e6 puis attaquer la chaîne blanche.",
          moves: ["e4","c6","d4","d5","e5","Bf5","Nf3","e6","Be2","c5","O-O","Nc6","Be3","cxd4","Nxd4","Nxd4","Bxd4"],
          notes: {1:"Prépare ...d5.",3:"Conteste le centre.",5:"Développe le fou hors de la chaîne.",7:"Consolide d5.",9:"Attaque la base d4.",11:"Ajoute de la pression sur d4 et e5.",13:"Ouvre le centre au bon moment.",15:"Échange le cavalier central actif."}
        }
      ],
      sicilian: [
        {
          id: "classical-sicilian", level: 2, name: "Sicilienne classique",
          summary: "Développer rapidement et exercer une pression sur le centre blanc.",
          moves: ["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","Nc6","Bg5","e6","Qd2","Be7","O-O-O","O-O"],
          notes: {1:"Crée une structure asymétrique.",3:"Contrôle e5.",5:"Échange le pion d4 et ouvre la colonne c.",7:"Développe avec tempo sur e4.",9:"Développe le second cavalier vers le centre.",11:"Prépare le développement du fou et contrôle d5.",13:"Développe le fou avant de roquer.",15:"Mets le roi à l’abri."}
        }
      ]
    };

    const LEVELS = {
      1: { name: "Ligne principale", description: "Apprends la branche de base avec des explications guidées." },
      2: { name: "Réponses principales", description: "L’adversaire choisit entre les variantes les plus importantes." },
      3: { name: "Défi de positions", description: "Dix positions intermédiaires aléatoires : reconnais la structure sans connaître la variante." }
    };


    const italianMainBranch = OPENINGS.find(item => item.id === "italian").variations[0];
    italianMainBranch.opponentNotes = {
      1:"...e5 partage le centre et ouvre les lignes des pièces noires.",
      3:"...Cc6 développe un défenseur de e5 et contrôle d4.",
      5:"...Fc5 développe le fou vers f2 et crée une position symétrique.",
      7:"...Cf6 attaque e4 : ton centre doit être prêt à avancer.",
      9:"...exd4 accepte l’ouverture du centre.",
      11:"...Fb4+ gagne un tempo par un échec et met la pression sur ton développement.",
      13:"...Fxd2+ échange le fou actif et t’oblige à choisir la bonne reprise.",
      15:"...d5 frappe ton centre avant qu’il ne devienne trop puissant.",
      17:"...Cxd5 rétablit le matériel et installe le cavalier au centre.",
      19:"Les Noirs roquent à leur tour : la phase d’ouverture est terminée."
    };

    const V7_QUIZ_SIZE = 10;
    const V7_BOSS_SIZE = 12;
    const V7_BOSS_LIVES = 3;

    const PIECE_NAMES = { p: "pion", n: "cavalier", b: "fou", r: "tour", q: "dame", k: "roi" };
    const PIECE_IMAGES = {};
    Object.assign(PIECE_IMAGES, {"wp":"data:image/webp;base64,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"});
    Object.assign(PIECE_IMAGES, {"wn":"data:image/webp;base64,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"});

'use strict';

const PIECES = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
};

const OPENING_DATA = {
  white: [
    {
      id: 'italian',
      name: 'Partie italienne',
      desc: 'Développement rapide, pression sur f7 et préparation de d4.',
      principles: [
        'Développer vite les pièces légères',
        'Roquer avant d’ouvrir complètement le centre',
        'Préparer d4 avec c3 quand la position le permet',
        'Utiliser la pression sur f7 comme contrainte, pas comme attaque forcée'
      ],
      signals: [
        ['...Fc5', 'Jeu symétrique : prépare c3 puis d4.'],
        ['...Cf6', 'Les Noirs attaquent e4 : protège le centre et surveille les tactiques.'],
        ['...Fe7', 'Développement solide : profite de ton avance d’espace.'],
        ['...d6', 'Centre fermé : construis calmement avant la rupture d4.']
      ],
      branches: [
        { name: 'Giuoco Piano', moves: ['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','Nf6','d4','exd4','cxd4','Bb4+','Bd2','Bxd2+','Nbxd2','d5','exd5','Nxd5','O-O','O-O'] },
        { name: 'Deux Cavaliers', moves: ['e4','e5','Nf3','Nc6','Bc4','Nf6','d3','Bc5','O-O','d6','c3','O-O','Re1','a6'] },
        { name: 'Défense hongroise', moves: ['e4','e5','Nf3','Nc6','Bc4','Be7','d4','d6','O-O','Nf6','Re1','O-O'] },
        { name: 'Structure ...d6', moves: ['e4','e5','Nf3','Nc6','Bc4','d6','d4','exd4','Nxd4','Nf6','Nc3','Be7','O-O','O-O'] }
      ],
      alts: {
        'e4 e5 Nf3 Nc6 Bc4 Bc5': 'O-O|d3',
        'e4 e5 Nf3 Nc6 Bc4 Nf6': 'Ng5',
        'e4 e5 Nf3 Nc6': 'Bb5'
      }
    },
    {
      id: 'london',
      name: 'Système de Londres',
      desc: 'Structure robuste avec Ff4, e3, Cf3 et c3.',
      principles: [
        'Construire une structure stable',
        'Développer le fou avant e3',
        'Choisir le bon moment pour c4 ou e4'
      ],
      signals: [['...d5', 'Structure classique : Ff4 puis e3.']],
      branches: [
        { name: 'Londres classique', moves: ['d4','d5','Nf3','Nf6','Bf4','e6','e3','Bd6','Bg3','O-O','Bd3','c5','c3','Nc6','Nbd2'] }
      ],
      alts: {}
    }
  ],
  black: [
    {
      id: 'caro',
      name: 'Caro-Kann',
      desc: 'Défense solide contre e4 avec ...c6 et ...d5.',
      principles: [
        'Contester le centre sans bloquer le fou c8',
        'Accepter un léger manque d’espace au début',
        'Viser une structure saine en finale'
      ],
      signals: [
        ['e4', 'Prépare ...c6 puis ...d5.'],
        ['e5', 'Développe le fou avant ...e6.']
      ],
      branches: [
        { name: 'Variante d’avance', moves: ['e4','c6','d4','d5','e5','Bf5','Nf3','e6','Be2','c5','O-O','Nc6'] }
      ],
      alts: {}
    },
    {
      id: 'french',
      name: 'Défense française',
      desc: 'Centre solide avec ...e6 et ...d5.',
      principles: [
        'Attaquer la chaîne de pions par sa base',
        'Accepter un fou c8 parfois passif',
        'Créer du contre-jeu à l’aile dame'
      ],
      signals: [['e4', 'Réponds ...e6 pour préparer ...d5.']],
      branches: [
        { name: 'Classique', moves: ['e4','e6','d4','d5','Nc3','Nf6','e5','Nfd7','f4','c5','Nf3','Nc6'] }
      ],
      alts: {}
    }
  ]
};

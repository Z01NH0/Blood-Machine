/*
 * ZOINHO Storage Bridge - configuração do jogo piloto.
 * IMPORTANTE: adicione aqui o domínio EXATO do portal ZOINHO GAMES antes de publicar.
 * Exemplo: 'https://zoinho-games.vercel.app'
 */
window.ZOINHO_STORAGE_CONFIG = Object.freeze({
  gameId: 'blood-machine',
  portalOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  saveKeys: [
    'bloodMachineProgressUpdate12'
  ]
});

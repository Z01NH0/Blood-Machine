/*
 * ZOINHO Storage Bridge v2 - Blood Machine
 *
 * portalOrigins contém origens que entram sem confirmação (útil para localhost e,
 * futuramente, para o domínio de produção estável da ZOINHO GAMES).
 *
 * Se o portal de produção ainda não estiver nesta lista, o jogo mostra uma autorização
 * de uma única vez naquele navegador. A origem aprovada fica salva localmente e o save
 * NÃO é enviado antes da aprovação.
 */
window.ZOINHO_STORAGE_CONFIG = Object.freeze({
  gameId: 'blood-machine',
  bridgeVersion: 2,
  portalOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  allowOriginApproval: true,
  saveKeys: [
    'bloodMachineProgressUpdate12'
  ]
});

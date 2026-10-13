module.exports = {
  devServer: {
    allowedHosts: 'all',
    client: {
      webSocketURL: {
        hostname: process.env.WDS_SOCKET_HOST || 'localhost',
        port: Number(process.env.WDS_SOCKET_PORT) || 3000,
        protocol: 'wss',
      },
    },
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
};

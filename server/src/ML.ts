'use strict';
import { ServerSettings, ServerKit, ServiceContext } from './ext/serverkit/ServerKit';
import { ServerFlights } from './ext/serverkit/ServerFlights';
import { ServerAuth } from './ext/serverkit/ServerAuth';
import { FileIO } from './ext/FileIO';

const conf = FileIO.loadJSONData('./config/conf.json');

const port = process.env.PORT || 2002; 
const webappDir = '../client/dist'
 
const serverAuth = new ServerAuth({
  appName: conf.appName,
  authUrl: conf.url
}); 
  
const serverFlights = new ServerFlights();
 
const serverSettings: ServerSettings = {
  port: port,
  socket: true, 
  allowCors: true,
  services: [
    ...serverAuth.getServicesRoutes(),
    ...serverFlights.getServicesRoutes(),
    {
      // http://localhost:4001/api/demo
      path: '/demo',
      method: 'GET',
      action: (cxt: ServiceContext, res) => {
        const { query, body, token, tokenData, socketId } = cxt;

        // Check if authenticated with valid token
        if (!tokenData) {
          res.status(401, 'Forbidden').send();
          return;
        }

        // Send to client socket
        cxt.socketSend('testMessage', {
          socketId,
          text: 'Response from demo service',
          userToken: token
        });

        // Send json response
        res.json({ text: 'hello service' });
      }
    }
  ],
  staticDirs: [{
    source: `${webappDir}`,
    path: "/"
  },
  {
    source: `./data`,
    path: "/data"
  }],
  webappRoutes: [{
    index: `${webappDir}/index.html`,
    path: "/*"
  }],

  cacheControls: [
    {
      path: '/index.html',
      cachePolicy: 'noCache'
    },
    {
      path: '/api/*',
      cachePolicy: 'noCache'
    }
  ],
  proxies: []
};

async function start() {
  const { app, io, server } = await ServerKit.newServer(serverSettings);
  server.listen(port, () => console.log(`Listening on port ${port}`));
}

start();

'use strict';
import express from 'express';
import bodyParser from "body-parser"
import { createProxyMiddleware } from 'http-proxy-middleware'
import path from 'path'
import http from 'http'
import socketIo from 'socket.io'
import * as jwt from "jsonwebtoken"
import multer from 'multer'

const multer  = require('multer') //use multer to upload blob data
const fs = require('fs'); //use the file system so we can save files


/*export function loadFile(filename)
{
  return fs.readFileSync(filename,'utf8');
}

export function saveFile(filename,content)
{
  fs.writeFileSync(filename, content, function (err) {
  if (err) throw err;
  });
}*/

export type ServiceContext = {
    query?: any;
    body?: any;
    io?: any;
    socketId?: string;
    token: string;
    tokenData: any;
    newToken: (data:any, expiresIn:string | number) => string;
    socketSend: (event:string, data:any) => void;
}

type ServiceHandler = (context: ServiceContext, response: any) => any;

type Service = {
    path: string,
    method: string,
    chain?: any,
    checkAccess?: (tokenData: any) => Promise<boolean>,
    action: ServiceHandler
}
export interface ServerSettings {
    allowCors: boolean,
    port: number | string,
    socket?: boolean,
    jwtSignature?: string,
    staticDirs?: {
        source: string,
        path: string
    }[],
    services: Service[],
    uploads?: {
        path: string,
        dir: string,
        fieldName: string,
        maxFileSize: number,
        deleteOnProcessed: boolean,
        action: (filePath) => Promise<any>;
    }[],
    webappRoutes: {
        index: string,
        path: string
    }[],
    cacheControls?: {
        path: string,
        cachePolicy: 'noCache' | 'default' | 'maxCache'
    }[],
    proxies?: {
        path: string,
        target: string
    }[]
}


export module ServerKit {
    export async function newServer(settings: ServerSettings) {


        const expressApp = express();
        const server = http.createServer(expressApp);
        const io = settings.socket ? socketIo({
            // path: '/test',
        }) : null;
        if (io) {
            io.attach(server);
        }

        // Payload too large
        expressApp.use(bodyParser.json({ limit: '100mb' }));

        expressApp.use((req, res, next) => {
            res.charset = "utf-8";
            next();
        });

        if (settings.allowCors) {
            expressApp.use(applyCORSHeader);
        }

        settings.proxies.forEach(proxyConfig => {
            expressApp.use(proxyConfig.path, createProxyMiddleware({
                target: proxyConfig.target,
                changeOrigin: true,
                onProxyReq: (proxyReq, req: any) => {
                    Object.keys(req.headers).forEach(function (key) {
                        proxyReq.setHeader(key, req.headers[key]);
                    });
                },
                onProxyRes: (proxyRes, req: any, res: any) => {
                    Object.keys(proxyRes.headers).forEach(function (key) {
                        res.append(key, proxyRes.headers[key]);
                    });
                }
            }));
        });

        settings.cacheControls.forEach(cacheControl => {
            expressApp.get(cacheControl.path, function (req, res, next) {
                if (cacheControl.cachePolicy === 'noCache') {
                    applyNoCacheHeader(res);
                }
                if (cacheControl.cachePolicy === 'maxCache') {
                    applyMaxCacheHeader(res)
                }
                next();
            });
        })

        expressApp.get('/*', function (req, res, next) {
            if (req.url.indexOf("/node_modules/") === 0 || req.url.indexOf("/resources/") === 0) {
                applyMaxCacheHeader(res)
            }
            next();
        });

        settings.staticDirs ?
            settings.staticDirs.forEach(staticDir => expressApp.use(staticDir.path, express.static(staticDir.source))) :
            expressApp.use("/", express.static("./"))

        var router = express.Router();
        expressApp.use('/api', router);

        const invokeService = (action: ServiceHandler) => (req, res) => {
            const { query, body } = req;
            const token = getTokenFromHeader(req);

            const tokenData = token ? verifyToken(token, settings.jwtSignature) : null;
            const socketId = getSoketIdFromHeader(req);

            const context = {
                query,
                body,
                io,
                token,
                tokenData,
                socketId,
                newToken : (data, expiresIn) => {
                    return signToken(data, settings.jwtSignature, expiresIn)
                },
                socketSend : (event:string, data:any) => {
                    socketId && io.to(socketId).emit(event, data);
                }
            };
            action(context, res);
        }


        settings.services.forEach((service) => {
            const serviceRoute = router.route(service.path);
            switch (service.method) {
                case 'GET':
                    serviceRoute.get(invokeService(service.action));
                    break;
                case 'POST':
                    // service.chain ???
                    serviceRoute.post(invokeService(service.action));
                    break;
                case 'PUT':
                    serviceRoute.put(invokeService(service.action));
                    break;
                case 'DELETE':
                    serviceRoute.delete(invokeService(service.action));
                    break;
            }
        });

        settings.uploads?.forEach((uploadSettings) => {
            const serviceRoute = router.route(uploadSettings.path);
            const upload = setupMulter(uploadSettings);
            serviceRoute.post(upload, (req, res, next) => {
                const { path } = req.file;
                uploadSettings.action(path)
                    .then(() => {
                        res.status(200)
                            .end();
                    })
                    .catch(() => {
                        res.status(500)
                            .end();
                    })
                    .finally(() => {
                        if (uploadSettings.deleteOnProcessed) {
                            fs.unlinkSync(path);
                        }
                    });

            });

        });



        expressApp.use('/api/*', (req, res) => {
            // TODO : Log access to undefined api path
            res.status(404)
                .end();
        });

        settings.webappRoutes.forEach(route => setupWebappRoute(expressApp, route));
        return {
            app: expressApp,
            server,
            io
        };
    }
    export async function startServer(settings: ServerSettings) {
        const { server } = await newServer(settings);
        server.listen(settings.port, function () {
            console.log('Internal server running @' + settings.port);
        });
    }

    export function getAbsoluteFilePath(relativePath) {
        return path.resolve(process.cwd(), relativePath);
    }

    function setupWebappRoute(app, webappRoute) {
        app.use(webappRoute.path, function (request, response, next) {
            applyNoCacheHeader(response);
            const absolutePath = getAbsoluteFilePath(webappRoute.index);
            response.sendFile(absolutePath);
        });
    }

}

function setupMulter(uploadSettings) {
    fs.mkdirSync(uploadSettings.dir, { recursive: true });
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadSettings.dir)
        },
        filename: function (req, file, cb) {
            console.log(file);
            const { originalname } = file;
            const extension = originalname.substring(originalname.lastIndexOf("."), originalname.length);
            const name = originalname.substring(0, originalname.lastIndexOf("."));
            console.log(extension);

            const uniqueSuffix = Date.now();
            cb(null, originalname);//name + '-' + uniqueSuffix + extension);
        }
    })

    const upload = multer({
        storage: storage,
        limits: { fileSize: uploadSettings.maxFileSize },
    });
    return upload.single(uploadSettings.fieldName);
}

/**
 *
 * @param data
 * @param secretOrPublicKey
 * @param expiresIn "1h",  "120ms", "2 days"
 */
const signToken = (data, secretOrPublicKey: string, expiresIn: string | number) => {
    return jwt.sign(data, secretOrPublicKey, { expiresIn: expiresIn });
}

const verifyToken = (token: string, secretOrPublicKey: string) => {
    try{
        return jwt.verify(token, secretOrPublicKey);
    }catch(e){
        return null;
    }

}

function getSoketIdFromHeader(req) {
    const clientSocketId = req.headers['x-socketid'];
    if (clientSocketId) {
        return clientSocketId;
    }
    return null;
}


function getTokenFromHeader(req) {
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        return req.headers.authorization.split(' ')[1];
    }
    return null;
}



function applyNoCacheHeader(response) {
    response.setHeader("Cache-Control", "public, no-cache, no-store, must-revalidate, max-age=0, s-max-age=0");
    response.header('Expires', '-1');
}



function applyMaxCacheHeader(response) {
    response.setHeader("Cache-Control", "public, max-age=2592000");
    response.setHeader("Expires", new Date(Date.now() + 2592000000).toUTCString());
}


function applyCORSHeader(req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
}

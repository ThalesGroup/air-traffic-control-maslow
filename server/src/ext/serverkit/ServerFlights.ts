/*
 *  ----------------------------------------------------------------------------
 *
 *  Copyright (c) 2021 - THALES LAS/AMS
 *
 *  -----------------------------------------------------------------------------
 *  THALES MAKES NO REPRESENTATIONS OR WARRANTIES ABOUT THE SUITABILITY OF
 *  THE SOFTWARE, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 *  TO THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 *  PARTICULAR PURPOSE, OR NON-INFRINGEMENT. THALES SHALL NOT BE
 *  LIABLE FOR ANY DAMAGES SUFFERED BY LICENSEE AS A RESULT OF USING,
 *  MODIFYING OR DISTRIBUTING THIS SOFTWARE OR ITS DERIVATIVES.
 *
 *  THIS SOFTWARE IS NOT DESIGNED OR INTENDED FOR USE OR RESALE AS ON-LINE
 *  CONTROL EQUIPMENT IN HAZARDOUS ENVIRONMENTS REQUIRING FAIL-SAFE
 *  PERFORMANCE, IN WHICH THE FAILURE OF THE
 *  SOFTWARE COULD LEAD DIRECTLY TO DEATH, PERSONAL INJURY, OR SEVERE
 *  PHYSICAL OR ENVIRONMENTAL DAMAGE ("HIGH RISK ACTIVITIES"). THALES 
 *  SPECIFICALLY DISCLAIMS ANY EXPRESS OR IMPLIED WARRANTY OF FITNESS FOR
 *  HIGH RISK ACTIVITIES.
 *
 *  -----------------------------------------------------------------------------
 */

 'use strict';
import { ServiceContext } from "./ServerKit";
import { FileIO } from "../FileIO";
import os from "os";
import https from "https";
import querystring from "querystring";
const axios = require("axios");


const conf = FileIO.loadJSONData('./config/conf.json');
const hostname = os.hostname();
const DBairports = FileIO.loadJSONData('./data/airports.json');
const DBatypes = FileIO.loadJSONData('./data/atypes.json');

const WITH_HISTO = true;
const MAX_TRAILING_DOTS = 4;
const MAX_DELTA_TIME = 1000 * 60 * 10; //10mn 
const MAX_HISTO_TIME = 1000 * 60 * 30; //30mn 60*24*1; //24H
const MIN_HISTO_PROXIMITY_DEG = 0.01; //0.001° = 100m

const DEFAULT_OPTIONS: ServerAuthOptions = {
  path: './flight-db',
  appName: conf.appName,
  authUrl: conf.url
}

export type ServerAuthOptions = {
  path?: string,
  appName: string,
  authUrl: string
}


/*class Track {
  gufi:string;
  timestamp:number;
  callsign:string;
  icaoAddress: string;
  adep:string;
  adep_lat:number;
  adep_lng:number;
  ades:string;
  ades_lat:number;
  ades_lng:number;
  ssrCode: string;
  aircraftType:string;
  wtc:string;
  kind:string;
  updateType:string;
  altFMS:number;
  altMCP:number;
  airborne:boolean;
  temperature:number;
  mach:number;
  gpsAltitude:number;
  windSpeed:number;
  windDirection:string;
  trackMS:string;
  rateOfClimbDescent: number;
  groundSpeed:number;
  heading:number;
  tas:number;
  ias:number;
  qnh:number;
  altitude:number;
  latitude:number;
  longitude:number;
  dots:Array<Pos>;

  {"gufi":"277d09ec","timestamp":1619163913000,"latitude":35.90704,"longitude":126.95062,"altitude":27900,
     "groundSpeed":406,"heading":5.0,"updateType":null,"trackMS":null,"callsign":"KAL660","icaoAddress":"71BD25",
     "adep":"VTBS","ades":"RKSI","ssrCode":"6113","aircraftType":"A333","gpsAltitude":28600,
     "rateOfClimbDescent":-1024,"windSpeed":78de":1.36355,"altitude":1875,"groundSpeed":153,"heading":183.0,
     "updateType":null,"trackMS":null,"callsign":"N3035W","icaoAddress":"A32D93","adep":"LFPN","ades":null,
     "ssrCode":"7000","aircraftType":"BT36","gpsAltitude":null,"rateOfClimbDescent":-192,"windSpeed":null,
     "windDirection":null,"altFMS":null,"altMCP":null,"tas":null,"ias":null,"mach":null,"qnh":null,
     "temperature":null,"airborne":true},

}*/


export class ServerFlights {

  token: any;
  tracks: Array<any>;
  histo: Array<any>;

  cleanFlights () {
    this.tracks = Object.assign(this.tracks.filter(item => ((new Date()).getTime() - item.timestamp) < MAX_DELTA_TIME));
  }

  cleanHisto() {
    this.histo = Object.assign(this.histo.filter(item => ((new Date()).getTime() - item.timestamp) < MAX_HISTO_TIME));
  }

  constructor() {
    const { path } = DEFAULT_OPTIONS;
    const basePath = path ? path : DEFAULT_OPTIONS.path;

    this.token = null;
    this.tracks = [];
    this.histo = [];

    console.log(hostname);

    setInterval(this.cleanFlights.bind(this), MAX_DELTA_TIME);

    if (WITH_HISTO) {
      setInterval(this.cleanHisto.bind(this), MAX_HISTO_TIME);
    }

    import('@titelmedia/node-fetch').then(
      fetch => {
        globalThis.fetch = fetch.default;
        globalThis.Response = fetch.default.Response;
        import('event-source-polyfill').then(
          x => {

            var es = new x.default.EventSourcePolyfill('http://localhost:2002/api/tracks');
            //es.onerror = es.onopen = es.onmessage = function (event) {
            var self = this;

            es.onmessage = function (this, event) {
              try {
                if (event.data) {
                  const p = JSON.parse(event.data.toString());
                  if (p && typeof p === "object") {
                    var track = p.track;
                    track.xTime = -1;
                   
                    if (p.correlatedGufis && p.correlatedGufis.nmpreops) {
                      track.gufi = p.correlatedGufis.nmpreops;
                    }

                    if (track.altitude > 1000) //Feet
                    {

                      //Enrich WTC
                      if (DBatypes)
                      {
                        var wIndex = DBatypes.findIndex(aircraft => aircraft.type === track.aircraftType);
                        if (wIndex > -1) {
                          track.wtc = DBatypes[wIndex].wtc;
                          track.kind = DBatypes[wIndex].kind;
                        }
                      }

                      // Enrich Airport Coordinates
                      if (DBairports)
                      {
                        var aIndex = DBairports.findIndex(airport => airport.name === track.adep);
                        if (aIndex > -1) {
                          track.adep_lat = DBairports[aIndex].lat;
                          track.adep_lng = DBairports[aIndex].lng;
                        }
                      

                        aIndex = DBairports.findIndex(airport => airport.name === track.ades);
                        if (aIndex > -1) {
                          track.ades_lat = DBairports[aIndex].lat;
                          track.ades_lng = DBairports[aIndex].lng;
                        }
                      }
                      track.timestamp = (new Date()).getTime();

                      //Tracks
                      var index = self.tracks.findIndex(item => (track.icaoAddress === item.icaoAddress));
                      var dots = new Array();

                      if (index > -1) {
                        if (track.altitude > 5000) //Feet
                        {
                          dots = self.tracks[index].dots ? self.tracks[index].dots : [];
                          if (dots.length === 0 || self.tracks[index].latitude !== dots[dots.length - 1].latitude || self.tracks[index].longitude !== dots[dots.length - 1].longitude)
                            dots.push({ longitude: track.longitude, latitude: track.latitude });
                          if (dots.length > MAX_TRAILING_DOTS)
                            dots.splice(0, 1);
                          track.dots = dots;
                        }
                        else
                          track.dots = [];
                        self.tracks[index] = track;
                      }
                      else {
                        if (track.altitude > 5000) //Feet
                          dots.push({ longitude: track.longitude, latitude: track.latitude });
                        track.dots = dots;
                        self.tracks.push(track);
                      }

                      //Histo
                      if (WITH_HISTO) {
                        var idH = self.histo.findIndex(item => (track.icaoAddress === item.icaoAddress && track.adep === item.adep && track.ades === item.ades));
                       
                        if (idH > -1) {
                          var lastTrack = self.histo[idH].tracks[self.histo[idH].tracks.length - 1];
                          if (Math.abs(track.latitude - lastTrack[1]) >= MIN_HISTO_PROXIMITY_DEG || Math.abs(track.longitude - lastTrack[0]) >= MIN_HISTO_PROXIMITY_DEG) {
                            self.histo[idH].timestamp = track.timestamp;
                            self.histo[idH].tracks.push([track.longitude, track.latitude, track.altitude]);
                          }
                    
                        }
                        else if (track.icaoAddress && track.adep && track.ades) {
                          self.histo.push(
                            {
                              icaoAddress: track.icaoAddress,
                              adep: track.adep,
                              ades: track.ades,
                              timestamp: track.timestamp,
                              tracks: [[track.longitude, track.latitude, track.altitude]]
                            })
                        }
           
                      }

                    }
                  }
                }
              }
              catch (e) {
                //Not well formatted JSON...
                console.log(e);
              }
            };
          });
        //}
      })
  }


  async getToken() {
    console.log("Get New AVD Token");

    var options = {
      method: 'POST',
      url: conf.avdTokenPath,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      data: querystring.stringify({
        grant_type: 'client_credentials',
        client_id: conf.avdClientId,
        client_secret: conf.avdClientSecret
      })
    };

    const getClientCredentials = await axios.request(options);
    return await getClientCredentials.data.access_token;
  }




  async getFR24Flights(cxt: ServiceContext, res) {
    const { body } = cxt;
    const { bounds } = body;
    try {

      axios.get(`https://opensky-network.org/api/states/all?lamin=` + Math.floor(bounds.swLat) + `&lomin=` + Math.floor(bounds.swLon) + `&lamax=` + Math.ceil(bounds.neLat) + `&lomax=` + Math.ceil(bounds.neLon)).then(
        (response) => {
           res.status(200).json({ flights: response.data.states }).send();
          return;
        },
        (error) => {
          console.log(error);
          res.status(401, 'getFlights Error').send();
        });

    }
    catch (e) {
      console.log("getFlights Exception: " + e);
      res.status(401, 'getFlights Exception').send();
    }
  }


  getServicesRoutes() {
    return [
      {
        // http://localhost:2002/api/get-leads
        path: '/get-fr24-flights',
        method: 'POST',
        action: (cxt: ServiceContext, res) => {
          this.getFR24Flights(cxt, res);
        }
      },
      {
        // http://localhost:4001/api/flights
        path: '/flights',
        method: 'GET',
        action: async (cxt: ServiceContext, res) => {
          const { io, query } = cxt;
          var boundingBox = {
            lamin: query.lamin,
            lomin: query.lomin,
            lamax: query.lamax,
            lomax: query.lomax,
          }

          var result = Object.assign(this.tracks.filter(track => !boundingBox ||
            (boundingBox.lamin <= track.latitude &&
              boundingBox.lamax >= track.latitude &&
              boundingBox.lomin <= track.longitude &&
              boundingBox.lomax >= track.longitude)));

          console.log("GET "+result.length+" Flights", JSON.stringify(boundingBox));
          res.json(result);
        }
      },
      {
        // http://localhost:4001/api/histo?icaoAddress=XXX&adep=YYY&ades=ZZZ
        path: '/histo',
        method: 'GET',
        action: async (cxt: ServiceContext, res) => {
          const { io, query } = cxt;
          if (this.histo.findIndex(d => d.icaoAddress === query.icaoAddress && d.adep === query.adep && d.ades === query.ades) > -1)
            res.json(this.histo.filter(d => d.icaoAddress === query.icaoAddress && d.adep === query.adep && d.ades === query.ades));
          else
            res.json([]);
        }
      },
      {
        // http://localhost:4001/api/airports
        path: '/airports',
        method: 'GET',
        action: async (cxt: ServiceContext, res) => {
          const { io, query } = cxt;
          var boundingBox = {
            lamin: query.lamin,
            lomin: query.lomin,
            lamax: query.lamax,
            lomax: query.lomax,
          };

          var airports = [];

          var t0 = Object.assign(this.tracks.filter(track => (!boundingBox || !query.lamin ||
            (boundingBox.lamin <= track.latitude &&
              boundingBox.lamax >= track.latitude &&
              boundingBox.lomin <= track.longitude &&
              boundingBox.lomax >= track.longitude))));

        
          //ADEP
          var t = t0.filter(track => track.adep_lat);
          for (var i = 0; i < t.length; i++) {
            var indexA = airports.findIndex(item => item.name === t[i].adep);
            if (indexA === -1)
              airports.push(
                {
                  name: t[i].adep,
                  lat: t[i].adep_lat,
                  lng: t[i].adep_lng,
                  countADEP: 1,
                  countADES: 0
                }
              )
            else
              airports[indexA].countADEP++;
          }

          //ADES
          t = Object.assign(t0.filter(track => track.ades_lat));
          for (var i = 0; i < t.length; i++) {
            var indexA = airports.findIndex(item => item.name === t[i].ades);
            if (indexA === -1)
              airports.push(
                {
                  name: t[i].ades,
                  lat: t[i].ades_lat,
                  lng: t[i].ades_lng,
                  countADEP: 0,
                  countADES: 1
                }
              )
            else
              airports[indexA].countADES++;
          }

        
          res.json(airports);
        }
      },
      {
        // http://localhost:4001/api/tracks/:source
        path: '/tracks',
        method: 'GET',
        action: async (cxt: ServiceContext, res) => {
          const { io } = cxt;

          if (!this.token)
            this.token = await this.getToken();

          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Transfer-Encoding': 'identity'
          });
          res.write('\n');

          const postData = JSON.stringify({ "circleOfInterests": [] });

          const options = {
            host: conf.avdHost,
            port: 443,
            path: conf.avdTracksPath,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
              'Authorization': 'Bearer ' + this.token
            }
          }
 
          const sseReq = https.request(options, (sseRes) => {
            console.log('SSE response status: ' + sseRes.statusCode);

            //Expired Token
            if (sseRes.statusCode === 401)
              this.token = this.getToken();

            sseRes.on('data', (d) => {
              res.write(d);
            });
            sseRes.on('end', () => {
              console.log("END");
              res.end();
            })
          });
          sseReq.setTimeout(10000000);
          sseReq.write(postData);

          sseReq.on('error', (e) => {
            console.log('{"message":"Error during API request: ' + e.message + '"}');
            res.end('{"message":"Error during API request: ' + e.message + '"}');
          });
        }
      },
      {
        // http://localhost:4001/api/tracks/:source
        path: '/flight',
        method: 'GET',
        action: async (cxt: ServiceContext, res) => {
          const { io, query } = cxt;

          if (!this.token)
            this.token = await this.getToken();

          //flights (FPL)
          //actype: "A320"
          //  adep: "LFMN"
          //  ades: "LFQQ"
          //  airborne: "YES"
          //  atot: 1622534820000
          //  callsign: "EJU187J"
          //  eobt: 1622535300000
          //  eta: 1622541300000
          //  etot: 1622536080000
          //  gufi: "ab832644147d655c2ed4b293a80c61bca0788dc6"
          //  icaoAddress: "44083B"
          //  icaoRoute: "N0433F340 BADOD UZ12 BULOL UM733 LAULY/N0407F300 UM733 UTELA/N0388F260 UM733 KOPOR UN874 CMB CMB5C"
          //  status: "ACTIVE"

          //Trajectory (TP)
          //  endTime: 1622540018000
          //  gufi: "ab832644147d655c2ed4b293a80c61bca0788dc6"
          //  points: [
          //    { eto: 1622536080000
          //      fl: 0
          //      lat: 43.665278
          //      lng: 7.215
          //      mass: 64000
          //      name: "LFMN"}
          //    , …]
          //  startTime: 1622536080000

          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Transfer-Encoding': 'identity'
          });
          res.write('\n');

          console.log("Get FPL: " + query.gufi);

          const postData = JSON.stringify({});
          const options = {
            host: conf.avdHost,
            port: 443,
            path: conf.avdFPLPath + query.service + '/' + query.gufi,
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
              'Authorization': 'Bearer ' + this.token
            }
          }

          const sseReq = https.request(options, (sseRes) => {
            console.log('SSE response status: ' + sseRes.statusCode);

            //Expired Token
            if (sseRes.statusCode === 401)
            {
              console.log('-> Expired AVD TOKEN');
              this.token = this.getToken();
            }
            
            sseRes.on('data', (d) => {
              res.write(d);
            });
            sseRes.on('end', () => {
              console.log("END");
              res.end();
            })
          });
          sseReq.setTimeout(10000000);
          sseReq.write(postData);

          sseReq.on('error', (e) => {
            console.log('{"message":"Error during API request: ' + e.message + '"}');
            res.end('{"message":"Error during API request: ' + e.message + '"}');
          });
        }
      }
    ]
  }
}


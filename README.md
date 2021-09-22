# The MasLow Project
The idea of getting everyone talking and building an Air Traffic Control platform from the ground up by and for air traffic controllers (ATCO) could be game changing in aviation industry. 

<img src="client/resources/Thumbnail.jpg"
     alt="Markdown Monster icon"
     style="float: left; margin-right: 10px;" />
     
**MasLow** is the foundation on which https://air-traffic-control.io is built. An Open Source platform intending to build the future of ATC, and this can only happen starting from scratch, jointly with most open-minded and motivated people. 

Join the movement.

This repository contains the basic features used by an air traffic controller. 

## Repository structure
Client Side:
- /client: this directory contains the react client side (front-end)
- /client/src/App/conf.json: this file contains parameters to update including MapBox Token (Get it for free from https://account.mapbox.com/)

Server Side:
- /server: this directory contains the nodejs server side (back-end)
- /server/config/conf.json: this file contains the path and credentials to access Aviation Data Services (Real Time Aircraft Tracks and Flight Plans)
"avdClientId": "<THALES_AVIATION_DATA_CLIENT_ID>",
"avdClientSecret": "<THALES_AVIATION_DATA_CLIENT_SECRET>"

Please contact: areski.hadjaz@thalesdigital.io to get data access.

## Installation
- Clone the repository
- Run `yarn install` in client and server folder (`./install.sh`)
- Fill the credentials (MapBox Token (/client/src/App/conf.json) and Tracks and Flight Plans AVD Feeder (/server/config/conf.json)
- Launch `./start-dev.sh`

## Questions?
In case of MasLow related questions:
- Have a look at the live ATC Platform https://air-traffic-control.io
- Contact me
  - Email: [areski.hadjaz@thalesdigital.io](mailto:areski.hadjaz@thalesdigital.io)
  - LinkedIn: https://www.linkedin.com/in/areskihadjaz/ 


import * as React from 'react';
import styled from 'styled-components';
import { Login } from './Login';
import { Map } from './Map';
import { Colors } from '../lib/style';
import { Brand } from './Brand';
import axios from 'axios';
import { ReactiveCoreClient } from '../ext/rx-core-client/ReactiveCoreClient';
import { BACK_DOMAIN  } from '../lib/utils';
import { Signature } from './Signature';

const rxClient = new ReactiveCoreClient('/', {
  data: ['Auth']
});

const rxClientFlights = new ReactiveCoreClient('/', {
  data: ['Flights']
});

type MainProps = {
}


export const Main: React.FunctionComponent<MainProps> = (props) => {

  let { } = props;
 
  const [redrawFlights, setRedrawFlights] = React.useState(1);
  const redrawFlightsRef = React.useRef(redrawFlights);
  redrawFlightsRef.current = redrawFlights;

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isNotLogged, showLogin] = React.useState(true);
  const isNotLoggedRef = React.useRef(isNotLogged);
  isNotLoggedRef.current = isNotLogged;

  
  const [getAVDInProgress, setGetAVDInProgress] = React.useState(false);
  const getAVDInProgressRef = React.useRef(getAVDInProgress);
  getAVDInProgressRef.current = getAVDInProgress;

  const [airports, setAirports] = React.useState([]);
  const [waypoints, setWaypoints] = React.useState(null);
  const [triggerSelection, setTriggerSelection] = React.useState({id:"",state:false});

  const [flightsAVD, setFlightsAVD] = React.useState([]);
  const flightsAVDRef = React.useRef(flightsAVD); 
  flightsAVDRef.current = flightsAVD;

  const [bounds, setBounds] = React.useState(null);
  const boundsRef = React.useRef(bounds);
  boundsRef.current = bounds;

  const [currentHover, setCurrentHover] = React.useState(null);
  
  React.useEffect(() => {

    async function fetchDataset() {
      let response = await fetch("/data/waypoints.json");
      let result = await response.json()
      setWaypoints(result);
    }

    console.log("Init ");
    fetchDataset();
    
    //Tracks
    setInterval(function () { getAVDTracks("Recurrent"); }, 8000);
     
    //Airports
    setTimeout(function () { getAVDAirports(); }, 12000);
    setInterval(function () { getAVDAirports(); }, 60000);

   return () => {};
  }, []);

  

  const getAVDAirports = async () => {
    if (boundsRef.current)
    {
    axios.get(BACK_DOMAIN+`/api/airports`).then(
        (response) => {
        setAirports(response.data);
      },
      (error) => { console.log("getAVDAirports Error: "+error) });
    }
  }

  const getAVDTracks = async (when) => {
    if (boundsRef.current && !getAVDInProgressRef.current)
    {
      setGetAVDInProgress(true);
      axios.get(BACK_DOMAIN+`/api/flights?lamin=` + Math.floor(boundsRef.current.swLat) + `&lomin=` + Math.floor(boundsRef.current.swLon) + `&lamax=` + Math.ceil(boundsRef.current.neLat) + `&lomax=` + Math.ceil(boundsRef.current.neLon)).then(
      (response) => {
        let sel = flightsAVDRef.current.filter(d=> d.selected);
        let f = response.data;
        if (f.length > 0)
        {
        for (let i=0;i<sel.length;i++)
        {
          let index = f.findIndex(item => (item.icaoAddress === sel[i].icaoAddress));
          if (index>-1)
          {
            f[index].selected = true;

            if (!f[index].callsign || f[index].callsign === "")
              f[index].callsign = sel[i].callsign;
            //icaoAddress
            if (!f[index].icaoAddress || f[index].icaoAddress === "")
              f[index].icaoAddress = sel[i].icaoAddress;
            //ADEP
            if (!f[index].adep || f[index].adep === "")
              f[index].adep = sel[i].adep;
            //ADES
            if (!f[index].ades || f[index].ades === "")
              f[index].ades = sel[i].ades;

            f[index].eobt = sel[i].eobt;
            f[index].etot = sel[i].etot;
            f[index].atot = sel[i].atot;
            f[index].eta = sel[i].eta;
            f[index].icaoRoute = sel[i].icaoRoute;
            f[index].traj = sel[i].traj;
           
            f[index].histo = sel[i].histo;
            getHisto(f[index].icaoAddress,f[index].adep,f[index].ades);
          }

        }

        let selC = flightsAVDRef.current.filter(d=> (d.conflict || d.windeffect || d.internal || d.inbound ||d.xTime > 0));
        for (let i=0;i<selC.length;i++)
        {
          let index = f.findIndex(item => (item.icaoAddress === selC[i].icaoAddress));
          if (index>-1)
          {
            f[index].conflict = selC[i].conflict;
            f[index].windeffect = selC[i].windeffect;    
            f[index].internal = selC[i].internal;    
            f[index].inbound = selC[i].inbound;    
            f[index].xTime = selC[i].xTime;    
          }
        }

        let lab = flightsAVDRef.current.filter(d=> d.labelOffset);
        for (let i=0;i<lab.length;i++)
        {
          let index = f.findIndex(item => (item.icaoAddress === lab[i].icaoAddress));
          if (index>-1)
          {
            f[index].labelOffset = lab[i].labelOffset;
          }
        }

        setFlightsAVD(f);
        setRedrawFlights((redrawFlightsRef.current+1)%2);
        }
        setGetAVDInProgress(false);
      },
      (error) => { setGetAVDInProgress(false);console.log("getAVDTracks Error: "+error) });
    }

  }

  const getHisto = async (icaoAddress,adep,ades) => {
     axios.get(BACK_DOMAIN+'/api/histo?icaoAddress='+icaoAddress+'&adep='+adep+'&ades='+ades).then(
      (response) => {
        let f = [...flightsAVDRef.current];
        let index = f.findIndex(d=> (d.icaoAddress === icaoAddress && d.adep === adep && d.ades === ades));
        if (index>-1 && response.data.length>0)
        {
          f[index].histo = response.data[0].tracks;
          setFlightsAVD(f);
        }
      },
      (error) => { console.log("getHisto Error: "+error) });
  }
  
  const onLogin = async (state) => {
    showLogin(state);
  }


  return (<Container>
    <Frame>
      <MapPane>
        <Map Logged={!isNotLogged}  redrawFlights={redrawFlights} airports={airports} waypoints={waypoints} flightsAVD={flightsAVD}  setFlightsAVD={setFlightsAVD} bounds={bounds} setBounds={setBounds} getHisto={getHisto} triggerSelection={triggerSelection} currentHover={currentHover} setCurrentHover={setCurrentHover} />
          <BrandContainer><Brand/></BrandContainer>
          <Signature />
      </MapPane>
    </Frame>
    <Login email={email} setEmail={setEmail} password={password} setPassword={setPassword} setOpen={onLogin} open={isNotLogged}></Login>  
  </Container>)
};
 
const Container = styled.div`
  height: 100vh;
  width:100%;
`

const Frame = styled.div`
  flex: 1;
  display: flex;
  position:relative;
  overflow: hidden;
  flex-direction: row;
  margin:5px; 
  height:100%;
`

const ChatPane = styled.div`
  border-right: 1px solid ${Colors.back};
  overflow: hidden;
`

const MapPane = styled.div`
  flex: 1;
  display: flex;
  position:relative;
  overflow: hidden;
  flex-direction: column;
`

const BrandContainer = styled.div`
  position:absolute;
  top:0px;
  left:10px;
  margin-top:10px;
  font-size:1.2em;
  color:rgba(255,255,255,1);
  z-index:1000;
`

const Credits = styled.div`
  color:white;
  position:absolute;
  bottom:20px;
  left:20px;
  font-size:0.6em;
  z-index:1000;
`

export default Main; 
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

 import * as React from 'react'
import styled from 'styled-components';;
import '../lib/effect.css';
import axios from 'axios';
import { isMobile } from 'react-device-detect';
import Bearing3DIcon from '@material-ui/icons/ThreeSixty';
import { DeckGL } from '@deck.gl/react';
import { InputBase } from '@material-ui/core';
import { _MapContext as MapContext, Marker, StaticMap } from 'react-map-gl';
import { BitmapLayer, PathLayer, PolygonLayer, ScatterplotLayer, LineLayer } from '@deck.gl/layers';
import { GreatCircleLayer, TileLayer } from '@deck.gl/geo-layers';
import { getRhumbLineBearing, computeDestinationPoint, getDistance, decimalToSexagesimal } from 'geolib';
import { WebMercatorViewport } from '@deck.gl/core';
import { PathStyleExtension } from '@deck.gl/extensions';
import { RowRight, Green, Red, MyRadio, MySlider, MyBlueSlider, ColumnLeft, Toggle, RowCenter, RowLeft, RowSpace, Colors, Bold } from '../lib/style';
import { BACK_DOMAIN, } from '../lib/utils';
import MapIcon from '@material-ui/icons/Layers';
import CloudIcon from '@material-ui/icons/Cloud';
import FlightIcon from '@material-ui/icons/Flight';
import AlertIcon from '@material-ui/icons/Error';
import CheckIcon from '@material-ui/icons/Check';
import CheckCircleIcon from '@material-ui/icons/CheckCircleOutline';
import SearchIcon from '@material-ui/icons/Search';
import HeightIcon from '@material-ui/icons/Height';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import WaitIcon from '@material-ui/icons/Loop';
import ClimbIcon from '@material-ui/icons/CallMade';
import { ReactiveCoreClient } from '../ext/rx-core-client/ReactiveCoreClient';
import { MAPBOX_TOKEN, MAPBOX_STYLE } from './Conf';

//Weather (Tomorrow.io)
const precipitationsZoom = 3;
const MIN_ROCD = 150;
const LOW_MIN_ZOOM_TO_DISPLAY_LABELS = 8;
const MEDIUM_MIN_ZOOM_TO_DISPLAY_LABELS = 6;
const HIGH_MIN_ZOOM_TO_DISPLAY_LABELS = 4;
const MIN_ZOOM_TO_DISPLAY_DOTS = 7;
const MIN_ZOOM_TO_DISPLAY_WAYPOINTS = 7;
const MIN_ALTITUDE_TO_DISPLAY_LABELS = 5000;
const MAX_FLIGHTS_TO_DISPLAY_LABELS = 500;
const MAX_FLIGHTS_FOR_STCA = 500;
const DEFAULT_LATERAL_SEP = 5; // in NM
const MAX_LATERAL_SEP = 30; //in NM
const DEFAULT_VERTICAL_SEP = 1000; // in Feet
const MAX_VERTICAL_SEP = 5000; //in NM
const SPEED_VECTOR_DURATION = 60; //in seconds
const DEFAULT_WIND_SUF = 50; //in knots
const MAX_WIND_SUF = 200; //in knots

const INITIAL_VIEW_STATE = {
  longitude: 3,
  latitude: 49.5,
  zoom: 6,
  maxZoom: 12,
  minZoom: 2,
  pitch: 0, // pitch in degrees
  bearing: 0, // bearing in degrees
};

const rxClient = new ReactiveCoreClient('/', {
  data: ['Auth']
});

type MapProps = {
  airports: any[],
  waypoints: any[],
  flightsAVD?: any[],
  setFlightsAVD?: (items: any) => void,
  bounds?: any,
  setBounds?: (items: any) => void,
  Logged: boolean,
  redrawFlights?: number,
  getHisto?: (item1: any, item2: any, item3: any) => void,
  triggerSelection: any,
  currentHover: any,
  setCurrentHover: (val: any) => void
}

export const Map: React.FunctionComponent<MapProps> = (props) => {
  const { airports, waypoints, flightsAVD, setFlightsAVD, bounds, setBounds, Logged, redrawFlights, getHisto, triggerSelection, currentHover, setCurrentHover } = props;

  const [viewState, setViewState] = React.useState(INITIAL_VIEW_STATE);
  const viewStateRef = React.useRef(viewState);
  viewStateRef.current = viewState;

  const [error, setError] = React.useState("");
  
  const [redraw, forceRedraw] = React.useState(1);
  const redrawRef = React.useRef(redraw);
  redrawRef.current = redraw;

  const [viewChangeTimer, setViewChangeTimer] = React.useState(null);
  const viewChangeTimerRef = React.useRef(viewChangeTimer);
  viewChangeTimerRef.current = viewChangeTimer;

  const [zoom, setZoom] = React.useState(INITIAL_VIEW_STATE.zoom);
  const zoomRef = React.useRef(zoom);
  zoomRef.current = zoom;

  const [freeze, setFreeze] = React.useState(false);
  const freezeRef = React.useRef(freeze);
  freezeRef.current = freeze;

  const [freezeTimer, setFreezeTimer] = React.useState(null);
  const freezeTimerRef = React.useRef(freezeTimer);
  freezeTimerRef.current = freezeTimer;


  const [mode, setMode] = React.useState("");
  const modeRef = React.useRef(mode);
  modeRef.current = mode;

  const [posOnMap, setPosOnMap] = React.useState([0, 0]);
  const posOnMapRef = React.useRef(posOnMap);

  const [FIRs, setFIRs] = React.useState(null);
  const FIRsRef = React.useRef(FIRs);
  FIRsRef.current = FIRs;

  const airportsRef = React.useRef(airports);
  airportsRef.current = airports;

  const waypointsRef = React.useRef(waypoints);
  waypointsRef.current = waypoints;

  const [FIRVisible, setFIRVisible] = React.useState(null);
  const FIRVisibleRef = React.useRef(FIRVisible);
  FIRVisibleRef.current = FIRVisible;

  const [AirportsVisible, setAirportsVisible] = React.useState(true);
  const AirportsVisibleRef = React.useRef(AirportsVisible);
  AirportsVisibleRef.current = AirportsVisible;

  const [WaypointsVisible, setWaypointsVisible] = React.useState(true);
  const WaypointsVisibleRef = React.useRef(WaypointsVisible);
  WaypointsVisibleRef.current = WaypointsVisible;

  const [RoutesVisible, setRoutesVisible] = React.useState(true);
  const RoutesVisibleRef = React.useRef(RoutesVisible);
  RoutesVisibleRef.current = RoutesVisible;

  const [TrailingDotsVisible, setTrailingDotsVisible] = React.useState(true);
  const TrailingDotsVisibleRef = React.useRef(TrailingDotsVisible);
  TrailingDotsVisibleRef.current = TrailingDotsVisible;

  const [LabelsVisible, setLabelsVisible] = React.useState(true);
  const LabelsVisibleRef = React.useRef(LabelsVisible);
  LabelsVisibleRef.current = LabelsVisible;

  const [LabelsVisibilityLevel, setLabelsVisibilityLevel] = React.useState(LOW_MIN_ZOOM_TO_DISPLAY_LABELS);
  const LabelsVisibilityLevelRef = React.useRef(LabelsVisibilityLevel);
  LabelsVisibilityLevelRef.current = LabelsVisibilityLevel;

  const [SpeedVectorsVisible, setSpeedVectorsVisible] = React.useState(true);
  const SpeedVectorsVisibleRef = React.useRef(SpeedVectorsVisible);
  SpeedVectorsVisibleRef.current = SpeedVectorsVisible;

  const [TracksVisible, setTracksVisible] = React.useState(true);
  const TracksVisibleRef = React.useRef(TracksVisible);
  TracksVisibleRef.current = TracksVisible;

  const [STCAVisible, setSTCAVisible] = React.useState(true);
  const STCAVisibleRef = React.useRef(STCAVisible);
  STCAVisibleRef.current = STCAVisible;

  const [WindAdvisoryVisible, setWindAdvisoryVisible] = React.useState(false);
  const WindAdvisoryVisibleRef = React.useRef(WindAdvisoryVisible);
  WindAdvisoryVisibleRef.current = WindAdvisoryVisible;

  const [CSVisible, setCSVisible] = React.useState(true);
  const CSVisibleRef = React.useRef(CSVisible);
  CSVisibleRef.current = CSVisible;

  const [ALTVisible, setALTVisible] = React.useState(true);
  const ALTVisibleRef = React.useRef(ALTVisible);
  ALTVisibleRef.current = ALTVisible;

  const [TYPVisible, setTYPVisible] = React.useState(true);
  const TYPVisibleRef = React.useRef(TYPVisible);
  TYPVisibleRef.current = TYPVisible;

  const [HDGVisible, setHDGVisible] = React.useState(true);
  const HDGVisibleRef = React.useRef(HDGVisible);
  HDGVisibleRef.current = HDGVisible;

  const [SSRVisible, setSSRVisible] = React.useState(true);
  const SSRVisibleRef = React.useRef(SSRVisible);
  SSRVisibleRef.current = SSRVisible;

  const [ADRVisible, setADRVisible] = React.useState(true);
  const ADRVisibleRef = React.useRef(ADRVisible);
  ADRVisibleRef.current = ADRVisible;

  const [GSVisible, setGSVisible] = React.useState(true);
  const GSVisibleRef = React.useRef(GSVisible);
  GSVisibleRef.current = GSVisible;

  const [IASVisible, setIASVisible] = React.useState(true);
  const IASVisibleRef = React.useRef(IASVisible);
  IASVisibleRef.current = IASVisible;

  const [ROCVisible, setROCVisible] = React.useState(true);
  const ROCVisibleRef = React.useRef(ROCVisible);
  ROCVisibleRef.current = ROCVisible;

  const [ADEPVisible, setADEPVisible] = React.useState(true);
  const ADEPVisibleRef = React.useRef(ADEPVisible);
  ADEPVisibleRef.current = ADEPVisible;

  const [ADESVisible, setADESVisible] = React.useState(true);
  const ADESVisibleRef = React.useRef(ADESVisible);
  ADESVisibleRef.current = ADESVisible;

  const [QNHVisible, setQNHVisible] = React.useState(true);
  const QNHVisibleRef = React.useRef(QNHVisible);
  QNHVisibleRef.current = QNHVisible;

  const [latSep, setLatSep] = React.useState(DEFAULT_LATERAL_SEP);
  const latSepRef = React.useRef(latSep);
  latSepRef.current = latSep;

  const [vertSep, setVertSep] = React.useState(DEFAULT_VERTICAL_SEP);
  const vertSepRef = React.useRef(vertSep);
  vertSepRef.current = vertSep;

  const [windSuf, setWindSuf] = React.useState(DEFAULT_WIND_SUF);
  const windSufRef = React.useRef(windSuf);
  windSufRef.current = windSuf;

  const [levelFilter, setLevelFilter] = React.useState([0, 900]);
  const levelFilterRef = React.useRef(levelFilter);
  levelFilterRef.current = levelFilter;

  const [filter, setFilter] = React.useState("");
  const filterRef = React.useRef(filter);
  filterRef.current = filter;

  const [searchItem, setSearchItem] = React.useState("");
  const searchItemRef = React.useRef(searchItem);
  searchItemRef.current = searchItem;

  const [FPLLoading, setFPLLoading] = React.useState(false);
  const FPLLoadingRef = React.useRef(FPLLoading);
  FPLLoadingRef.current = FPLLoading;

  const [TrajLoading, setTrajLoading] = React.useState(false);
  const TrajLoadingRef = React.useRef(TrajLoading);
  TrajLoadingRef.current = TrajLoading;

  const [filterKind, setFilterKind] = React.useState("callsign");
  const filterKindRef = React.useRef(filterKind);
  filterKindRef.current = filterKind;

  const flightsAVDRef = React.useRef(flightsAVD);
  flightsAVDRef.current = flightsAVD;
  posOnMapRef.current = posOnMap;

  const [weather, setWeather] = React.useState(true);
  const weatherRef = React.useRef(weather);
  weatherRef.current = weather;

  const [rule, setRule] = React.useState(false);
  const ruleRef = React.useRef(rule);
  ruleRef.current = rule;

  const [D3, setD3] = React.useState(false);
  const D3Ref = React.useRef(D3);
  D3Ref.current = D3;

  const [BRL, setBRL] = React.useState([]);
  const BRLRef = React.useRef(BRL);
  BRLRef.current = BRL;

  const [startLabelDragPos, setStartLabelDragPos] = React.useState([]);
  const startLabelDragPosRef = React.useRef(startLabelDragPos);
  startLabelDragPosRef.current = startLabelDragPos;

  const [currentAirportWPHover, setCurrentAirportWPHover] = React.useState(null);
  const [FIRsLayer, setFIRsLayer] = React.useState([]);
  const [WeatherLayer, setWeatherLayer] = React.useState([]);
  const [FlightsLayer, setFlightsLayer] = React.useState([]);
  const [layers, setLayers] = React.useState([]);

  React.useEffect(() => {

    async function fetchDataset(showFIR) {
      let response = await fetch("/data/fir_world.geojson");
      let result = await response.json();
      setFIRs(result);

      if (showFIR)
        setFIRVisible(true);
    }

    console.log("Init Map");

    if ('view' in localStorage) {
      let vs = JSON.parse(localStorage.getItem('view'));
      setViewState({
        longitude: vs.longitude,
        latitude: vs.latitude,
        zoom: vs.zoom,
        pitch: INITIAL_VIEW_STATE.pitch,//vs.pitch,
        bearing: INITIAL_VIEW_STATE.bearing,//vs.bearing,
        minZoom: INITIAL_VIEW_STATE.minZoom,
        maxZoom: INITIAL_VIEW_STATE.maxZoom,
      })
      updateBounds(vs);
    }
    else
      updateBounds({ swLat: 35, swLon: -8, neLat: 55, neLon: 10 });


    let showFIR = false;
    if ('filters' in localStorage) {
      let ftr = JSON.parse(localStorage.getItem('filters'));
      showFIR = ftr.FIRVisible;
      setAirportsVisible(ftr.AirportsVisible);
      setWaypointsVisible(ftr.WaypointsVisible);
      setRoutesVisible(ftr.RoutesVisible);
      setWeather(ftr.Weather);
      setTrailingDotsVisible(ftr.TrailingDotsVisible);
      setLabelsVisible(ftr.LabelsVisible);
      setLabelsVisibilityLevel(ftr.LabelsVisibilityLevel);
      setSpeedVectorsVisible(ftr.SpeedVectorsVisible);
      setTracksVisible(ftr.TracksVisible);
      setSTCAVisible(ftr.STCAVisible);
      setWindAdvisoryVisible(ftr.WindAdvisoryVisible);
      setCSVisible(ftr.CSVisible);
      setALTVisible(ftr.ALTVisible);
      setTYPVisible(ftr.TYPVisible);
      setHDGVisible(ftr.HDGVisible);
      setSSRVisible(ftr.SSRVisible);
      setADRVisible(ftr.ADRVisible);
      setGSVisible(ftr.GSVisible);
      setIASVisible(ftr.IASVisible);
      setROCVisible(ftr.ROCVisible);
      setADEPVisible(ftr.ADEPVisible);
      setADESVisible(ftr.ADESVisible);
      setQNHVisible(ftr.QNHVisible);
      setLatSep(ftr.latSep);
      setVertSep(ftr.vertSep);
      setWindSuf(ftr.windSuf);
      setLevelFilter(ftr.levelFilter);
      setFilter(ftr.filter);
      setFilterKind(ftr.filterKind);
    }

    fetchDataset(showFIR);
    setInterval(function () { createWeatherLayer(); }, 1000 * 60 * 30);
    setInterval(function () { periodicTrafficUpdate(); }, 10000);

  }, []);


  React.useEffect(() => {
    if (triggerSelection.id && triggerSelection.id.length > 0) {
      onClickObjectAVD({ index: flightsAVDRef.current.filter(d => getFilters(d)).findIndex(item => item.icaoAddress === triggerSelection.id), force: false });
    }
  }, [triggerSelection]);


  const storeFilters = () => {
    let ftr =
    {
      FIRVisible: FIRVisibleRef.current,
      AirportsVisible: AirportsVisibleRef.current,
      WaypointsVisible: WaypointsVisibleRef.current,
      RoutesVisible: RoutesVisibleRef.current,
      Weather: weatherRef.current,
      TrailingDotsVisible: TrailingDotsVisibleRef.current,
      LabelsVisible: LabelsVisibleRef.current,
      LabelsVisibilityLevel: LabelsVisibilityLevelRef.current,
      SpeedVectorsVisible: SpeedVectorsVisibleRef.current,
      TracksVisible: TracksVisibleRef.current,
      STCAVisible: STCAVisibleRef.current,
      WindAdvisoryVisible: WindAdvisoryVisibleRef.current,
      CSVisible: CSVisibleRef.current,
      ALTVisible: ALTVisibleRef.current,
      TYPVisible: TYPVisibleRef.current,
      HDGVisible: HDGVisibleRef.current,
      SSRVisible: SSRVisibleRef.current,
      ADRVisible: ADRVisibleRef.current,
      GSVisible: GSVisibleRef.current,
      IASVisible: IASVisibleRef.current,
      ROCVisible: ROCVisibleRef.current,
      ADEPVisible: ADEPVisibleRef.current,
      ADESVisible: ADESVisibleRef.current,
      QNHVisible: QNHVisibleRef.current,
      latSep: latSepRef.current,
      vertSep: vertSepRef.current,
      windSuf: windSufRef.current,
      levelFilter: levelFilterRef.current,
      filter: filterRef.current,
      filterKind: filterKindRef.current
    }

    localStorage.setItem('filters', JSON.stringify(ftr));
  }


  async function computeConflictsAndGreen() {
    let f = flightsAVDRef.current;

    if ((STCAVisibleRef.current || WindAdvisoryVisibleRef.current)&& flightsAVDRef.current.filter(flight => flight.internal && flight.altitude > MIN_ALTITUDE_TO_DISPLAY_LABELS && flight.altitude <= 100 * levelFilterRef.current[1] && flight.altitude >= 100 * levelFilterRef.current[0]).length <= MAX_FLIGHTS_FOR_STCA) {
      console.log("Compute Conflicts");

      for (let i = 0; i < f.length - 1; i++) {
        if (freezeRef.current)
          break;

        if (f[i].internal && f[i].altitude > MIN_ALTITUDE_TO_DISPLAY_LABELS && f[i].altitude <= 100 * levelFilterRef.current[1] && f[i].altitude >= 100 * levelFilterRef.current[0]) {

          if (WindAdvisoryVisibleRef.current) {
            if (f[i].groundSpeed && f[i].groundSpeed > 0 &&
              ((f[i].tas && f[i].tas > 0 && f[i].tas > f[i].groundSpeed + windSufRef.current) ||
                (f[i].ias && f[i].ias > 0 && f[i].ias > f[i].groundSpeed + windSufRef.current)))
              f[i].windeffect = true;
          }

          if (STCAVisibleRef.current) {
            for (let j = i + 1; j < f.length; j++) {
              if (freezeRef.current)
                break;

              if (f[j].altitude > MIN_ALTITUDE_TO_DISPLAY_LABELS && f[j].altitude <= 100 * levelFilterRef.current[1] && f[j].altitude >= 100 * levelFilterRef.current[0]) {
                let d = getDistance({ latitude: f[i].latitude, longitude: f[i].longitude }, { latitude: f[j].latitude, longitude: f[j].longitude });
                let l = Math.abs(f[i].altitude - f[j].altitude);

                if (d < latSepRef.current * 1852 &&
                  l < vertSepRef.current) {
                  f[i].conflict = [f[j].longitude, f[j].latitude, f[j].altitude];
                  if (!f[j].conflict)
                    f[j].conflict = [];
                }
              }
            }
          }
        }
      }

      setFlightsAVD(f);
      return true;
    }
    return false;
  }

  async function periodicTrafficUpdate() {
    if (await computeConflictsAndGreen())
      forceRedraw((redrawRef.current + 1) % 2);
  }


  const onHoverObject = ({ object, x, y }) => {
    const hovered = object ? {
      object,
      x,
      y
    } : null;
    setCurrentHover(hovered);
    forceRedraw(redrawRef.current + 1);
  }

  const onHoverAirportWPObject = ({ object, x, y }) => {
    const hovered = object ? {
      object,
      x,
      y
    } : null;
    setCurrentAirportWPHover(hovered);
  }

  const onClickAirportObject = ({ object }) => {
    if (ruleRef.current) {
      buildRules("", object.name, "", "");
    }
  }

  const onClickWPObject = ({ object }) => {
    if (ruleRef.current) {
      buildRules("", "", object.name, "");
    }
  }


  const buildRules = (icaoAddress, airport, waypoint, map) => {
    let ruleElt = {
      icaoAddress,
      airport,
      waypoint,
      map,
      pos: null
    };

    let b = [...BRLRef.current];

    if (b.length === 0 || b[b.length - 1][1].icaoAddress !== "" || b[b.length - 1][1].airport !== "" || b[b.length - 1][1].waypoint !== "" || b[b.length - 1][1].map !== "") {
      b.push([ruleElt, { icaoAddress: "", airport: "", waypoint: "", map: "", pos: null }]);
    }
    else {
      b[b.length - 1][1] = ruleElt;
    }

    setBRL(b);
  }



  const search = (id) => {
    setSearchItem(id.toUpperCase());
    let index = flightsAVDRef.current.findIndex(item => item.callsign === searchItemRef.current || item.icaoAddress == searchItemRef.current);

    if (index >= 0 && id !== "") {
      onClickObjectAVD({ index, force: true });
    }
  }

  const getFlightPlan = (flight, waiting) => {
    if (waiting)
      setFPLLoading(true);

    axios.get(BACK_DOMAIN + '/api/flight?service=flights&gufi=' + flight.gufi).then(
      (response) => {
        if (searchItemRef.current === flight.callsign || searchItemRef.current === flight.icaoAddress) {
          //Callsign
          if (!flight.callsign || flight.callsign === "")
            flight.callsign = response.data.callsign;
          //icaoAddress
          if (!flight.icaoAddress || flight.icaoAddress === "")
            flight.icaoAddress = response.data.icaoAddress;
          //ADEP
          if (!flight.adep || flight.adep === "")
            flight.adep = response.data.adep;
          //ADES
          if (!flight.ades || flight.ades === "")
            flight.ades = response.data.ades;

          flight.eobt = response.data.eobt;
          flight.etot = response.data.etot;
          flight.atot = response.data.atot;
          flight.eta = response.data.eta;
          flight.icaoRoute = response.data.icaoRoute;

          getHisto(flight.icaoAddress, flight.adep, flight.ades);
          setFlightsAVD(flightsAVDRef.current.map(f => f.icaoAddress === flight.icaoAddress && f.callsign === flight.callsign ? flight : f));
          forceRedraw((redrawRef.current + 1) % 2);
        }
        if (waiting)
          setFPLLoading(false);

      },
      (error) => { if (waiting) setFPLLoading(false); console.log(error) });
  }

  const getTP = (flight, waiting) => {
    if (waiting)
      setTrajLoading(true);
    axios.get(BACK_DOMAIN + '/api/flight?service=trajectories&gufi=' + flight.gufi).then(
      (response) => {
        if (response.data.points && searchItemRef.current === flight.callsign || searchItemRef.current === flight.icaoAddress) {
          let m = response.data.points.map(item => [item.lng, item.lat, 100 * item.fl]);
          console.log("GET TP: ", m);
          flight.traj = [{ path: m }];
        }
        if (waiting)
          setTrajLoading(false);
      },
      (error) => { if (waiting) setTrajLoading(false); console.log(error) });
  }

  const onClickObjectAVD = ({ index, force }) => {
    let f = flightsAVDRef.current.filter(d => getFilters(d));

    if (ruleRef.current) {
      buildRules(f[index].icaoAddress, "", "", "");
    }
    else {
      if (force) {
        f[index].selected = true;
      }
      else {
        f[index].selected = !f[index].selected ? true : !f[index].selected;

        if (f[index].selected)
          setSearchItem(f[index].callsign ? f[index].callsign : f[index].icaoAddress);
        else
          setSearchItem("");
      }

      if (f[index].gufi && f[index].selected) {
        if (!f[index].icaoRoute || f[index].icaoRoute === "")
          getFlightPlan(f[index], true);
        if (!f[index].traj || f[index].traj.length === 0)
          getTP(f[index], true);
      }
      else {
        setTrajLoading(false);
        setFPLLoading(false);
        getHisto(f[index].icaoAddress, f[index].adep, f[index].ades);
        setFlightsAVD(f);
        forceRedraw((redrawRef.current + 1) % 2);
      }
    }
  }

  const initSelection = () => {
      setPosOnMap([0, 0]);
  }

  const onFirClickObject = (name, event) => {
    console.log("FIR Click: " + name);
  }


  const updateBounds = (vs) => {
    const viewport = new WebMercatorViewport(vs);
    const nw = viewport.unproject([0, 0]);
    const se = viewport.unproject([viewport.width, viewport.height]);
    let bounds = { swLat: se[1], swLon: nw[0], neLat: nw[1], neLon: se[0] }
    setBounds(bounds);

    if (zoomRef.current !== vs.zoom) {

      if (freezeTimerRef.current)
        clearTimeout(freezeTimerRef.current);
      setFreezeTimer(setTimeout(function () { setFreeze(false); setFreezeTimer(null); }, 4000));
      setZoom(vs.zoom);
    }
  }

  const onViewChange = ({ viewState }) => {
    if (viewChangeTimer)
      clearTimeout(viewChangeTimer);

    if (zoomRef.current !== viewState.zoom)
      setFreeze(true);

    setViewChangeTimer(setTimeout(function () {
      updateBounds(viewState);
      localStorage.setItem('view', JSON.stringify(viewState));
      setViewChangeTimer(null);
    }, 500));
  }

  React.useEffect(() => {
    createFlightsLayer(
      { onHover: onHoverObject },
      { onHoverAirportWP: onHoverAirportWPObject },
      { onClickAVD: onClickObjectAVD },
      { onClickAirport: onClickAirportObject },
      { onClickWP: onClickWPObject }
    );
  }, [mode, redraw, redrawFlights, zoom,
    WaypointsVisible, AirportsVisible, RoutesVisible,
    TrailingDotsVisible, LabelsVisible, SpeedVectorsVisible, TracksVisible,
    levelFilter, filter, filterKind])

  React.useEffect(() => {
    storeFilters();
  }, [
    FIRVisible,
    AirportsVisible,
    WaypointsVisible,
    RoutesVisible,
    TrailingDotsVisible,
    LabelsVisible,
    LabelsVisibilityLevel,
    SpeedVectorsVisible,
    TracksVisible,
    STCAVisible,
    WindAdvisoryVisible,
    CSVisible,
    ALTVisible,
    TYPVisible,
    HDGVisible,
    SSRVisible,
    ADRVisible,
    GSVisible,
    IASVisible,
    ROCVisible,
    ADEPVisible,
    ADESVisible,
    QNHVisible,
    latSep,
    vertSep,
    windSuf,
    levelFilter,
    filter,
    filterKind]);

  React.useEffect(() => {
    createFIRsLayer({ onFirClick: onFirClickObject });
  }, [FIRVisible])

  React.useEffect(() => {
    createWeatherLayer();
  }, [weather])

  React.useEffect(() => {
    if (filterKindRef.current === "fir")
      createFIRsLayer({ onFirClick: onFirClickObject });
  }, [filterKind, filter])


  const switchBRL = () => {
    setRule(!ruleRef.current);
  }

  const switchWeather = () => {
    setWeather(!weatherRef.current);
  }


  const switch3D = () => {
    console.log("Switch 3D");
    let state = !D3Ref.current;
    setD3(state);

    let vs = JSON.parse(localStorage.getItem('view'));
    setViewState({
      ...vs,
      pitch: state ? 60 : INITIAL_VIEW_STATE.pitch,
      bearing: 0,
    })
    forceRedraw((redrawRef.current + 1) % 2);
  }

  const switchMenu = (type, state) => () => {
    setError("");
    initSelection();
    setMode(state);
  }

  const stepBearing = () => {
    setViewState({
      ...viewStateRef.current,
      bearing: (viewStateRef.current.bearing + 5) % 360,
    })
    forceRedraw((redrawRef.current + 1) % 2);
  }





  const onMapOver = ({ coordinate }) => {
    if (coordinate && coordinate.length > 1 && ruleRef.current) {
      setPosOnMap(coordinate);
      forceRedraw((redrawRef.current + 1) % 2);
    }
  }

  const onMapClick = ({ coordinate }) => {

  }

  const createFIRsLayer = ({ onFirClick }) => {
    var map = [];
    if (FIRsRef.current && FIRVisibleRef.current) {
      let UIRItem = FIRsRef.current.features.filter(item => item.properties.kind === "FIR" && item.geometry.coordinates.length > 0);

      for (let idx = 0; idx < UIRItem.length; idx++) {
        let name = UIRItem[idx].properties.icaocode;

        //UIR
        map.push(new PolygonLayer({
          id: 'FIR-' + name + '-' + idx,
          data: UIRItem[idx].geometry.coordinates,
          pickable: false,
          stroked: true,
          filled: false,
          lineWidthMinPixels: 1,
          getPolygon: d => d,
          getFillColor: [255, 255, 0, 0],
          getDashArray: [8, 8],
          dashJustified: true,
          extensions: [new PathStyleExtension({ dash: true })],
          getLineColor: [255, 255, 0, 40],
          getLineWidth: 1,
        }));
      }

    }


    setFIRsLayer(map);
    let f = [...map];
    let k = f.concat(WeatherLayer);
    let l = k.concat(FlightsLayer);
    setLayers(l);
  }

  const createWeatherLayer = () => {
    var map = [];

    if (weatherRef.current) {
      map.push(
        new TileLayer({
          id: 'WeatherPrecipitations',
          data: `https://air-traffic-control.io/data/precipitations_{z}_{x}_{y}.png`,//https://api.tomorrow.io/v4/map/tile/{z}/{x}/{y}/${DATA_FIELD}/${TIMESTAMP}.png?apikey=${API_KEY}`,
          minZoom: precipitationsZoom,
          maxZoom: precipitationsZoom,
          tileSize: 256,
          opacity: 0.2,
          renderSubLayers: props => {
            const {
              bbox: { west, south, east, north }
            } = props.tile;

          return new BitmapLayer(props, {
              id: 'BM_' + props.id,
              data: null,
              image: props.data,
              bounds: [west, south, east, north]
            });
          }
        }));
    }

    setWeatherLayer(map);
    let f = [...FIRsLayer];
    let k = f.concat(map);
    let l = k.concat(FlightsLayer);
    setLayers(l);
  }

  
  const getFilters = (d) => {
    return inBounds(d.lat ? d.lat : (d.latitude ? d.latitude : -1), d.lng ? d.lng : (d.longitude ? d.longitude : -1)) && d.altitude <= 100 * levelFilterRef.current[1] && d.altitude >= 100 * levelFilterRef.current[0] && (filterKindRef.current !== "airport" || (d.adep && d.adep.indexOf(filterRef.current.toUpperCase()) >= 0) || (d.ades && d.ades.indexOf(filterRef.current.toUpperCase()) >= 0)) && (filterKindRef.current !== "callsign" || (d.callsign && d.callsign.indexOf(filterRef.current.toUpperCase()) >= 0 || (d.icaoAddress && d.icaoAddress.indexOf(filterRef.current.toUpperCase()) >= 0)))
  }


  const getBRLPos = (d) => {

    let lng = posOnMap[0];
    let lat = posOnMap[1];

    if (d.icaoAddress !== "") {
      let index = flightsAVDRef.current.findIndex(f => f.icaoAddress === d.icaoAddress);
      if (index >= 0) {
        lng = flightsAVDRef.current[index].longitude;
        lat = flightsAVDRef.current[index].latitude;
      }
    }
    else if (d.airport !== "") {
      let index = airportsRef.current.findIndex(f => f.name === d.airport);
      if (index >= 0) {
        lng = airportsRef.current[index].lng;
        lat = airportsRef.current[index].lat;
      }
    }
    else if (d.waypoint !== "") {
      let index = waypointsRef.current.findIndex(f => f.name === d.waypoint);
      if (index >= 0) {
        lng = waypointsRef.current[index].lng;
        lat = waypointsRef.current[index].lat;
      }
    }
    else if (d.map.indexOf("/") > 0) {
      lng = parseFloat(d.map.split("/")[0]);
      lat = parseFloat(d.map.split("/")[1]);
    }

    let result = [lng, lat];

    return result;
  }

  const updateBRLPos = () => {
    let b = [...BRLRef.current];
    for (let i = 0; i < b.length; i++) {
      let item = b[i];
      item[0].pos = getBRLPos(item[0]);
      item[1].pos = getBRLPos(item[1]);
      item[1].hdg = Math.floor(getRhumbLineBearing(
        { latitude: item[0].pos[1], longitude: item[0].pos[0] },
        { latitude: item[1].pos[1], longitude: item[1].pos[0] }));
      b[i] = item;
    }
    setBRL(b);
  }

  const createFlightsLayer = ({ onHover }, { onHoverAirportWP }, { onClickAVD }, { onClickAirport }, { onClickWP }) => {

    let modeR = modeRef.current;
    var map = [];

    if (airportsRef.current) {
      map.push(new ScatterplotLayer({
        id: 'Airports',
        data: airportsRef.current.filter(d => inBounds(d.lat, d.lng) && (AirportsVisibleRef.current)),
        pickable: true,
        stroked: false,
        filled: true,
        radiusScale: 0.2,
        lineWidthMinPixels: 1,
        getPosition: d => [d.lng, d.lat],
        getRadius: d => (zoomRef.current > MIN_ZOOM_TO_DISPLAY_WAYPOINTS) ? 10 : (10 + ((d.countADEP + d.countADES))),
        radiusUnits: 'pixels',
        getFillColor: d => [255, 255, 0, (d.name.toUpperCase() === searchItemRef.current.toUpperCase()) ? 255 : 50],
        getLineColor: [255, 255, 0, 255],
        onHover: onHoverAirportWP,
        onClick: onClickAirport
      }));
    }


    if (waypointsRef.current) {
      map.push(new ScatterplotLayer({
        id: 'Waypoints',
        data: waypointsRef.current.filter(d => inBounds(d.lat, d.lng) && ((WaypointsVisibleRef.current && zoomRef.current > MIN_ZOOM_TO_DISPLAY_WAYPOINTS))),
        pickable: true,
        stroked: false,
        filled: true,
        radiusScale: 1,
        radiusMinPixels: 2,
        lineWidthMinPixels: 1,
        getPosition: d => [d.lng, d.lat],
        radiusUnits: 'pixels',
        getFillColor: d => [0, 255, 255, (d.name.toUpperCase() === searchItemRef.current.toUpperCase()) ? 255 : 50],//zoomRef.current > LabelsVisibilityLevel?100:60],
        onHover: onHoverAirportWP,
        onClick: onClickWP
      }));
    }


    if (modeR !== "sector") {
      //BRL
      updateBRLPos();
      map.push(new LineLayer({
        id: 'BRL',
        data: BRLRef.current,
        pickable: false,
        getWidth: 2,
        getSourcePosition: d => d[0].pos,
        getTargetPosition: d => d[1].pos,
        getColor: d => [255, 255, 0, 255]
      }));

      //Selection
      map.push(new ScatterplotLayer({
        id: 'BRLSelection1',
        data: BRLRef.current,
        pickable: false,
        stroked: true,
        filled: false,
        radiusScale: 6,
        radiusMaxPixels: 10,
        lineWidthUnits: 'pixels',
        getPosition: d => d[0].pos,
        getRadius: d => 200,
        getLineColor: d => [255, 255, 0, 255],
        getLineWidth: d => 2,
      }));

      map.push(new ScatterplotLayer({
        id: 'BRLSelection2',
        data: BRLRef.current,
        pickable: false,
        stroked: true,
        filled: false,
        radiusScale: 6,
        radiusMaxPixels: 10,
        lineWidthUnits: 'pixels',
        getPosition: d => d[1].pos,
        getRadius: d => d.icaoAddress && d.icaoAddress.length > 0 ? 200 : 20,
        getLineColor: d => [255, 255, 0, 255],
        getLineWidth: d => 2,
      }));

      //Flight AVD
      if (flightsAVDRef.current) {
        //Traj
        map.push(new GreatCircleLayer({
          id: 'FlightAVDDctAdes',
          data: RoutesVisibleRef.current ?
            flightsAVDRef.current.filter(d => d.ades_lat && getFilters(d)) :
            flightsAVDRef.current.filter(d => d.ades_lat && (d.selected || (currentHover && d.icaoAddress === currentHover.object.icaoAddress)) && getFilters(d)),
          getStrokeWidth: d => 1,
          getSourcePosition: d => [d.longitude, d.latitude, D3Ref.current ? d.altitude : 0],
          getTargetPosition: d => [parseFloat(d.ades_lng), parseFloat(d.ades_lat)],
          getSourceColor: d => [d.selected ? 0 : 73, d.selected ? 255 : 214, d.selected ? 0 : 249, (TracksVisibleRef.current && (d.selected || (currentHover && d.icaoAddress === currentHover.object.icaoAddress))) ? 255 : 50],//(zoom > MIN_ZOOM_TO_DISPLAY_ROUTES?20:50)],
          getTargetColor: d => [d.selected ? 0 : 73, d.selected ? 255 : 214, d.selected ? 0 : 249, (TracksVisibleRef.current && (d.selected || (currentHover && d.icaoAddress === currentHover.object.icaoAddress))) ? 255 : 50],//(zoom > MIN_ZOOM_TO_DISPLAY_ROUTES?20:50)],//[Math.sqrt(d.outbound), 140, 0],
        }));

        if (searchItemRef.current.length > 0) {
          let idTP = flightsAVDRef.current.findIndex(item => item.callsign === searchItemRef.current || item.icaoAddress === searchItemRef.current);
          if (idTP > -1 && flightsAVDRef.current[idTP].traj) {
            map.push(new PathLayer({
              id: 'FlightAVDTraj',
              data: flightsAVDRef.current[idTP].traj,
              pickable: false,
              widthScale: 20,
              widthMinPixels: 3,
              getPath: d => d.path,
              getColor: [73, 214, 249, 255]
            }));
          }
        }

        if (TracksVisibleRef.current) {

          if (D3Ref.current) {
            //Projected Position
            map.push(new LineLayer({
              id: 'ProjectedPosition',
              data: flightsAVDRef.current.filter(d => getFilters(d)),
              pickable: false,
              getWidth: 1,
              getSourcePosition: d => [d.longitude, d.latitude],
              getTargetPosition: d => [d.longitude, d.latitude, d.altitude],
              getColor: [255, 255, 255, 150]
            }));
          }

          //Position
          map.push(new ScatterplotLayer({
            id: 'FlightAVDPosition',
            data: flightsAVDRef.current.filter(d => getFilters(d)),
            pickable: true,
            stroked: false,
            filled: true,
            radiusScale: 6,
            radiusMaxPixels: 5,
            lineWidthUnits: 'pixels',
            getPosition: d => [d.longitude, d.latitude, D3Ref.current ? d.altitude : 0],
            getRadius: d => 20 + d.altitude / 50,
            getFillColor: d => [255, 255, 255, 255],
            onHover: onHover,
            onClick: onClickAVD
          }));

          //FPL Available Flag
          map.push(new ScatterplotLayer({
            id: 'FlightAVDFPLFlag',
            data: flightsAVDRef.current.filter(d => getFilters(d) && d.gufi),
            pickable: false,
            stroked: true,
            filled: false,
            radiusScale: 4,
            radiusMaxPixels: 8,
            lineWidthUnits: 'pixels',
            getPosition: d => [d.longitude, d.latitude, D3Ref.current ? d.altitude : 0],
            getRadius: d => 10 + d.altitude / 20,
            getLineColor: d => [73, 214, 249, 80],
            getLineWidth: d => 5,
          }));


          //Selection
          map.push(new ScatterplotLayer({
            id: 'FlightAVDSelection',
            data: flightsAVDRef.current.filter(d => (d.selected || (STCAVisibleRef.current && d.conflict) || (WindAdvisoryVisibleRef.current && d.windeffect) || (currentHover && d.icaoAddress === currentHover.object.icaoAddress)) && getFilters(d)),
            pickable: false,
            stroked: true,
            filled: false,
            radiusScale: 6,
            radiusMaxPixels: 10,
            lineWidthUnits: 'pixels',
            getPosition: d => [d.longitude, d.latitude, D3Ref.current ? d.altitude : 0],
            getRadius: d => 20 + d.altitude / 20,
            getLineColor: d => (STCAVisibleRef.current && d.conflict) ? [255, 0, 0, 255] : ((WindAdvisoryVisibleRef.current && d.windeffect) ? [0, 255, 0, 255] : ((ruleRef.current && currentHover && d.icaoAddress === currentHover.object.icaoAddress) ? [255, 255, 0, 255] : [73, 214, 249, 255])),//[COLOR[0],COLOR[1],COLOR[2],150],
            getLineWidth: d => 2,
          }));

          //Speed Vector
          if (SpeedVectorsVisibleRef.current) {
            map.push(new LineLayer({
              id: 'SpeedVectorAVD',
              data: flightsAVDRef.current.filter(d => getFilters(d)),
              pickable: false,
              getWidth: 2,
              getSourcePosition: d => [d.longitude, d.latitude, D3Ref.current ? d.altitude : 0],
              getTargetPosition: d => getDestination(d.longitude, d.latitude, d.heading, d.groundSpeed ? d.groundSpeed : (d.ias ? d.ias : d.tas), D3Ref.current ? d.altitude : 0),
              getColor: d => [255, 255, 255, 255]
            }));
          }

          //Leader Line
          if (TracksVisibleRef.current && LabelsVisibleRef.current && flightsAVDRef.current && (flightsAVDRef.current.filter(d => getFilters(d)).length < MAX_FLIGHTS_TO_DISPLAY_LABELS)) {
            map.push(new LineLayer({
              id: 'LeaderLine',
              data: flightsAVDRef.current.filter(d => getFilters(d) && (zoomRef.current > LabelsVisibilityLevel || d.selected) && d.altitude > MIN_ALTITUDE_TO_DISPLAY_LABELS),
              pickable: false,
              getWidth: 1,
              getSourcePosition: d => [d.longitude, d.latitude],
              getTargetPosition: d => getLabelPos(d),
              getColor: d => [255, 255, 255, 100]
            }));
          }

          //Conflict Pair
          if (STCAVisibleRef.current) {
            map.push(new LineLayer({
              id: 'ConflictPairAVD',
              data: flightsAVDRef.current.filter(d => d.longitude && d.latitude && d.altitude && d.conflict && d.conflict.length > 1 && getFilters(d)),
              pickable: false,
              getWidth: 2,
              getSourcePosition: d => [d.longitude, d.latitude, d.altitude],
              getTargetPosition: d => [d.conflict[0], d.conflict[1], d.altitude],
              getColor: d => [255, 0, 0, 255]
            }));
          }

          map.push(new PathLayer({
            id: 'histo1',
            data: flightsAVDRef.current.filter(d => d.selected && d.histo),
            pickable: false,
            widthScale: 20,
            getPath: d => d.histo.map(d => [d[0], d[1]]),
            getColor: [73, 214, 249, 255],
            getWidth: d => 5
          }));

          if (D3Ref.current) {

            for (let i = 0; i < flightsAVDRef.current.filter(d => d.selected && d.histo).length; i++) {
              let h = (flightsAVDRef.current.filter(d => d.selected && d.histo)[i]).histo;

              map.push(new LineLayer({
                id: 'Histo-' + i,
                data: h,
                pickable: false,
                getWidth: 1,
                getSourcePosition: d => [d[0], d[1]],
                getTargetPosition: d => [d[0], d[1], d[2]],
                getColor: [73, 214, 249, 100]
              }));
            }

            map.push(new PathLayer({
              id: 'histo2',
              data: flightsAVDRef.current.filter(d => d.selected && d.histo),
              pickable: false,
              widthScale: 20,
              getPath: d => d.histo,
              getColor: [73, 214, 249, 150],
              getWidth: d => 8
            }));
          }


          if (TrailingDotsVisibleRef.current && zoomRef.current > MIN_ZOOM_TO_DISPLAY_DOTS) {
            let flightDots = flightsAVDRef.current.filter(d => d.dots && getFilters(d));

            for (let i = 0; i < flightDots.length; i++) {
              //Trailing Dots
              map.push(new ScatterplotLayer({
                id: 'FlightAVDDots-' + i,
                data: flightDots[i].dots,
                pickable: false,
                stroked: false,
                filled: true,
                radiusScale: 6,
                radiusMaxPixels: 5,
                lineWidthUnits: 'pixels',
                getPosition: d => [d.longitude, d.latitude, D3Ref.current ? flightDots[i].altitude : 0],
                getRadius: d => d.wtc ? getDotsRadius(d.wtc) : 200,
                getFillColor: d => [255, 255, 255, 60],
                opacity: Math.min(1, Math.pow(zoomRef.current, 2) / 50),
              }));
            }
          }
        }
      }
    }

    setFlightsLayer(map);
    let f = [...FIRsLayer];
    let k = f.concat(WeatherLayer);
    let l = k.concat(map);
    setLayers(l);
  }



  const setMapCursor = ({ isHovering, isDragging }) => {
    let result = 'grab';
    if (FPLLoading || TrajLoading)
      result = "wait";
    else if (isDragging)
      result = 'grabbing';

    return result;
  }


  const setSliderLatSep = (e, val) => {
    setLatSep(val);
    periodicTrafficUpdate();
  }

  const setSliderVertSep = (e, val) => {
    setVertSep(val);
    periodicTrafficUpdate();
  }

  const setSliderWindSuf = (e, val) => {
    setWindSuf(val);
    periodicTrafficUpdate();
  }

  const setSliderLevelFilter = (e, val) => {
    setLevelFilter(val);
  }

  const buildWaypointLabel = (color, selected, name, lat, lng) => {
    return (
      <Marker
        longitude={lng}
        latitude={lat}>
        <div style={{ backgroundColor: selected ? color : 'none', color: selected ? 'black' : color, fontSize: '0.5em', position: 'absolute', borderRadius: '2px', padding: '2px', marginTop: '0px', opacity: selected ? 1 : 0.4, fontWeight: selected ? 900 : 400 }}>{name}</div>
      </Marker>
    )
  };

  const handleCloseBRL = (icaoAddress1, icaoAddress2) => {
    console.log("BRL Click: " + icaoAddress1 + "/" + icaoAddress2);
    if (icaoAddress1.length > 0 && icaoAddress2.length > 0) {
      let brl = BRLRef.current;
      let index = brl.findIndex(item => item.length > 0 && item[0].icaoAddress && item[0].icaoAddress === icaoAddress1 && item[1].icaoAddress && item[1].icaoAddress === icaoAddress2);
      if (index > -1) {
        brl.splice(index, 1);
        setBRL(brl);
        forceRedraw((redrawRef.current + 1) % 2);
      }
    }
  }


  const buildBRLLabel = (icaoAddress1, icaoAddress2, backcolor, color, zIndex, lat1, lng1, alt1, lat2, lng2, alt2, bearing) => {
    return (
      <Marker
        longitude={(lng1 + lng2) / 2}
        latitude={(lat1 + lat2) / 2}>
        <Label onClick={(e) => { handleCloseBRL(icaoAddress1, icaoAddress2) }}
          style={{
            position: 'absolute',
            marginTop: '20px',
            fontWeight: 900,
            backgroundColor: backcolor,
            color: color
          }}>

          <div>
            {Math.floor(100 * getDistance(
              { latitude: lat1, longitude: lng1 },
              { latitude: lat2, longitude: lng2 }) / 1852) / 100}NM
          </div>
          {(alt1 !== 0 || alt2 !== 0) && <div>{Math.floor(Math.abs(alt1 - alt2))}Feet</div>}
          {bearing && <div>{bearing}°</div>}
        </Label>
      </Marker>
    )
  };

  const handleLabelDragStart = (e) => {
    setStartLabelDragPos(e.lngLat);
  }

  const handleLabelDragEnd = (e, icaoAddress, callsign) => {
    handleLabelDragging(e, icaoAddress, callsign);
    setStartLabelDragPos(null);
    forceRedraw((redrawRef.current + 1) % 2);
  }

  const handleLabelDragging = (e, icaoAddress, callsign) => {
    let index = flightsAVDRef.current.findIndex(item => item.callsign === callsign && item.icaoAddress == icaoAddress);

    if (index >= 0 && startLabelDragPos) {
      let deltaLng = e.lngLat[0] - startLabelDragPos[0];
      let deltaLat = e.lngLat[1] - startLabelDragPos[1];

      flightsAVDRef.current[index].labelOffset = flightsAVDRef.current[index].labelOffset ?
        [flightsAVDRef.current[index].labelOffset[0] + deltaLng, flightsAVDRef.current[index].labelOffset[1] + deltaLat] :
        [deltaLng, deltaLat];
    }
    setStartLabelDragPos(e.lngLat);
  }

  const inBounds = (lat, lng) => {
    return (lat === -1 && lng === -1) || (bounds && lat >= bounds.swLat && lat <= bounds.neLat && lng >= bounds.swLon && lng <= bounds.neLon);
  }

  const buildLabel = (flight, selected) => {
    return (
      <Marker
        longitude={flight.longitude + (flight.labelOffset ? flight.labelOffset[0] : 0)}
        latitude={flight.latitude + (flight.labelOffset ? flight.labelOffset[1] : 0)}
        draggable
        onDragStart={handleLabelDragStart}
        onDrag={(e) => handleLabelDragging(e, flight.icaoAddress, flight.callsign)}
        onDragEnd={(e) => handleLabelDragEnd(e, flight.icaoAddress, flight.callsign)}>

        <Label hdg={flight.heading}
          style={{
            position: 'absolute',
            fontWeight: selected ? 'bold' : 'normal'
          }}>

          <RowCenter>
            {(CSVisible || ALTVisible || ROCVisible || SSRVisible) &&
              <ColumnLeft>
                {(CSVisible || ADRVisible || TYPVisible) && <div>{flight.callsign && flight.callsign !== "" && CSVisible && <span><b>{flight.callsign}</b></span>}</div>}
                {(ALTVisible || HDGVisible || IASVisible) && <div>{flight.altitude && ALTVisible && <span>FL{Math.floor(flight.altitude / 100).toString().padStart(3, "0")}</span>}</div>}
                {(ROCVisible || QNHVisible || GSVisible) && <div>{(flight.rateOfClimbDescent && Math.abs(flight.rateOfClimbDescent) > MIN_ROCD && ROCVisible) && <RowLeft>{flight.rateOfClimbDescent > 0 ? <ClimbIcon style={{ fontSize: 12 }} /> : <ClimbIcon style={{ fontSize: 12 }} className='rotate90' />}<div>{Math.abs(flight.rateOfClimbDescent)}</div></RowLeft>}</div>}
                {(SSRVisible || ADEPVisible || ADESVisible) && <div>{flight.ssrCode && flight.ssrCode !== "" && SSRVisible && <span>A{flight.ssrCode}</span>}</div>}
              </ColumnLeft>}
                &nbsp;
                {(ADRVisible || HDGVisible || QNHVisible || ADEPVisible) && <ColumnLeft>
              {(CSVisible || ADRVisible || TYPVisible) && <div>{flight.icaoAddress && flight.icaoAddress !== "" && ADRVisible && <span>{flight.icaoAddress}</span>}</div>}
              {(ALTVisible || HDGVisible || IASVisible) && <div>{flight.heading && flight.heading !== "" && HDGVisible && <span>H{flight.heading.toString().padStart(3, "0")}</span>}</div>}
              {(ROCVisible || QNHVisible || GSVisible) && <div>{flight.qnh && flight.qnh > 0 && QNHVisible && <span>{flight.qnh}</span>}</div>}
              {(SSRVisible || ADEPVisible || ADESVisible) && <div>{flight.adep && flight.adep !== "" && ADEPVisible && <span>{flight.adep}</span>}</div>}
            </ColumnLeft>}
                &nbsp;
                {(TYPVisible || IASVisible || GSVisible || ADESVisible) && <ColumnLeft>
              {(CSVisible || ADRVisible || TYPVisible) && <div>{flight.aircraftType && flight.aircraftType !== "" && TYPVisible && <span>{flight.aircraftType}&nbsp;{flight.wtc}</span>}</div>}
              {(ALTVisible || HDGVisible || IASVisible) && <div>{(flight.ias && flight.ias > 0) && IASVisible && <span>I{flight.ias.toString().padStart(3, "0")}</span>}{(flight.mach && flight.mach > 0) && IASVisible && <><span>&nbsp;</span><span>M{Math.floor(100 * flight.mach)}</span></>}</div>}
              {(ROCVisible || QNHVisible || GSVisible) && <div>{flight.groundSpeed && flight.groundSpeed > 0 && GSVisible && <span>G{flight.groundSpeed.toString().padStart(3, "0")}</span>}</div>}
              {(SSRVisible || ADEPVisible || ADESVisible) && <div>{flight.ades && flight.ades !== "" && ADESVisible && <span>{flight.ades}</span>}</div>}
            </ColumnLeft>}
          </RowCenter>
        </Label>

      </Marker>)
  }

  return <Container>

    <DeckGL
      initialViewState={viewState}
      controller
      onViewStateChange={onViewChange}
      layers={layers}
      getCursor={setMapCursor}
      ContextProvider={MapContext.Provider}
      onHover={onMapOver}
      onClick={onMapClick}
    >

      <StaticMap
        //reuseMaps
        mapStyle={MAPBOX_STYLE}
        //preventStyleDiffing={false}
        mapboxApiAccessToken={MAPBOX_TOKEN}
      />


      {!freeze && WaypointsVisibleRef.current && zoomRef.current > MIN_ZOOM_TO_DISPLAY_WAYPOINTS && waypoints && waypoints.filter(d => inBounds(d.lat, d.lng)).map((item) => {
        return buildWaypointLabel(Colors.theme, false, item.name, item.lat, item.lng);
      })}

      {waypoints && waypoints.filter(d => searchItemRef.current.toUpperCase().indexOf(d.name.toUpperCase()) > -1).map((item) => {
        return buildWaypointLabel(Colors.theme, true, item.name, item.lat, item.lng);
      })}

      {!freeze && AirportsVisibleRef.current && zoomRef.current > MIN_ZOOM_TO_DISPLAY_WAYPOINTS && airports && airports.filter(d => inBounds(d.lat, d.lng)).map((item) => {
        return buildWaypointLabel("rgb(255,255,0)", false, item.name, item.lat, item.lng);
      })}

      {airports && airports.filter(d => searchItemRef.current.toUpperCase().indexOf(d.name.toUpperCase()) > -1).map((item) => {
        return buildWaypointLabel("rgb(255,255,0)", true, item.name, item.lat, item.lng);
      })}

      {TracksVisibleRef.current && LabelsVisibleRef.current && flightsAVDRef.current && (flightsAVDRef.current.filter(d => getFilters(d)).length < MAX_FLIGHTS_TO_DISPLAY_LABELS) && flightsAVDRef.current.filter(d => getFilters(d)).map((flight) => {
        if (flight.selected || (flight.altitude > MIN_ALTITUDE_TO_DISPLAY_LABELS && zoomRef.current > LabelsVisibilityLevel))
          return buildLabel(flight, flight.selected || (currentHover && currentHover.object && currentHover.object.icaoAddress === flight.icaoAddress && currentHover.object.selected));
      })}

      {currentHover && currentHover.object && !currentHover.object.selected &&
        (zoomRef.current <= LabelsVisibilityLevel || currentHover.object.altitude <= MIN_ALTITUDE_TO_DISPLAY_LABELS) &&
        currentHover.object.icaoAddress.length > 0 && buildLabel(currentHover.object, false)}


      {TracksVisibleRef.current && STCAVisibleRef.current && flightsAVDRef.current && flightsAVDRef.current.filter(d => getFilters(d) && d.conflict && d.conflict.length === 3).map((flight) => {
        return buildBRLLabel("", "", "red", "white", 2, flight.latitude, flight.longitude, flight.altitude, flight.conflict[1], flight.conflict[0], flight.conflict[2], null);
      })}

      {TracksVisibleRef.current && BRLRef.current.map((brl) => {
        let brl1 = brl[0];
        let brl2 = brl[1];
        if (brl1.pos && brl2.pos)
          return buildBRLLabel(brl1.icaoAddress, brl2.icaoAddress, "yellow", "black", 1, brl1.pos[1], brl1.pos[0], 0, brl2.pos[1], brl2.pos[0], 0, brl2.hdg);
      })}

    </DeckGL>


    {currentAirportWPHover && currentAirportWPHover.object && <Tooltip style={{ position: 'absolute', zIndex: 1, pointerEvents: 'none', left: currentAirportWPHover.x + 20, top: currentAirportWPHover.y - 20 }}>
      <div><b><span>{currentAirportWPHover.object.name}</span></b></div>
      <div>
        {currentAirportWPHover.object.countADEP && currentAirportWPHover.object.countADEP > 0 && <div>{currentAirportWPHover.object.countADEP} taking-off flights</div>}
        {currentAirportWPHover.object.countADES && currentAirportWPHover.object.countADES > 0 && <div>{currentAirportWPHover.object.countADES} landing flights</div>}
      </div>
    </Tooltip>}

    {Logged && !isMobile &&
      <>

        <FlightPanel open={searchItemRef.current.length > 0 && flightsAVDRef.current.findIndex(item => item.callsign === searchItemRef.current || item.icaoAddress === searchItemRef.current) > -1}>
          {false && <RadioGroup row aria-label="filter" name="filter" value={filterKind} onChange={(e) => setFilterKind(e.target.value)}>
            <FormControlLabel value="callsign" control={<MyRadio />} label={<span style={{ fontSize: '0.8em' }}>Callsign</span>} />
            <FormControlLabel value="airport" control={<MyRadio />} label={<span style={{ fontSize: '0.8em' }}>Airport</span>} />
            <FormControlLabel value="fir" control={<MyRadio />} label={<span style={{ fontSize: '0.8em' }}>FIR</span>} />
          </RadioGroup>}
          <SearchInput><RowCenter>{(FPLLoading || TrajLoading) ? <WaitIcon className="rotating" /> : <SearchIcon />}<InputBase
            placeholder={"Callsign/ICAO Address/Airport/Waypoint ..."}
            inputProps={{ 'aria-label': 'Tags', style: { fontSize: `0.7em`, color: `white`, lineHeight: `1.5em`, width: `100%`, padding: '10px 5px 10px 5px', borderRadius: `8px` } }}
            value={searchItemRef.current}
            onChange={(e) => search(e.target.value)}
            fullWidth={true}
            autoFocus
          /></RowCenter>
          </SearchInput>

          {searchItemRef.current.length > 0 && flightsAVDRef.current.filter(item => item.callsign === searchItemRef.current || item.icaoAddress === searchItemRef.current).map((item) => {
            return (
              <FPLWindow>
                <FPLItem><b>CALLSIGN</b> {item.callsign}</FPLItem>
                <FPLItem><b>ICAO ADDRESS</b> {item.icaoAddress}</FPLItem>
                <FPLItem><b>AIRCRAFT TYPE</b> {item.aircraftType}</FPLItem>
                <FPLItem><b>WTC</b> {item.wtc}</FPLItem>
                <FPLItem><b>SSR CODE</b> {item.ssrCode}</FPLItem>
                <FPLItem><b>ADEP</b> {item.adep}</FPLItem>
                <FPLItem><b>ADES</b> {item.ades}</FPLItem>
                <FPLItem><b>EOBT</b> {item.eobt ? new Date(parseInt(item.eobt)).toLocaleTimeString() : ""}</FPLItem>
                <FPLItem><b>ETOT</b> {item.etot ? new Date(parseInt(item.etot)).toLocaleTimeString() : ""}</FPLItem>
                <FPLItem><b>ATOT</b> {item.atot ? new Date(parseInt(item.atot)).toLocaleTimeString() : ""}</FPLItem>
                <FPLItem><b>ETA</b> {item.eta ? new Date(parseInt(item.eta)).toLocaleTimeString() : ""}</FPLItem>
                <FPLItem><b>ROUTE</b> {item.icaoRoute}</FPLItem>
              </FPLWindow>)
          })}
        </FlightPanel>


        <Title>
          {mode === "map" && <RowCenter>SHOW/HIDE YOUR MAP LAYERS</RowCenter>}
          {mode === "flight" && <RowCenter>SHOW/HIDE YOUR AIRCRAFT ATTRIBUTES</RowCenter>}
          {mode === "advisory" && <RowCenter>CONFIGURE YOUR ADVISORIES</RowCenter>}
          {ruleRef.current && <RowCenter>BRL ACTIVATED - SELECT A TRACK, AIRPORT OR WAYPOINT</RowCenter>}
          {D3Ref.current && <RowCenter>3D VIEW</RowCenter>}
          {mode === "sector" && <RowCenter>DEFINE YOUR SECTORS OF CONTROL</RowCenter>}
        </Title>

        {<Menu extended={mode.length > 0}>

          <RowRight>
            <SubMenu selected={mode !== ""}>
              <RowSpace>
            
                {mode === "map" &&
                  <ColumnLeft>
                    <Toggle selected={FIRVisible} onClick={(e) => { setFIRVisible(!FIRVisibleRef.current) }}><RowCenter><CheckIcon fontSize='small' />&nbsp;FIRs&nbsp;</RowCenter></Toggle>
                    <Toggle selected={AirportsVisible} onClick={(e) => { setAirportsVisible(!AirportsVisibleRef.current) }}><RowCenter><CheckIcon fontSize='small' />&nbsp;Airports&nbsp;</RowCenter></Toggle>
                    <Toggle selected={WaypointsVisible} onClick={(e) => { setWaypointsVisible(!WaypointsVisibleRef.current) }}><RowCenter><CheckIcon fontSize='small' />&nbsp;Waypoints&nbsp;</RowCenter></Toggle>
                    <Toggle selected={RoutesVisible} onClick={(e) => { setRoutesVisible(!RoutesVisibleRef.current) }}><RowCenter><CheckIcon fontSize='small' />&nbsp;Routes&nbsp;</RowCenter></Toggle>
                  </ColumnLeft>
                }

                {mode === "flight" &&
                  <ColumnLeft>
                    <Toggle selected={TrailingDotsVisible} onClick={(e) => { setTrailingDotsVisible(!TrailingDotsVisibleRef.current) }}><RowCenter><CheckIcon fontSize='small' />&nbsp;Trailing dots&nbsp;</RowCenter></Toggle>
                    <Toggle selected={LabelsVisible} onClick={(e) => { setLabelsVisible(!LabelsVisibleRef.current) }}><RowCenter><CheckIcon fontSize='small' />&nbsp;Labels&nbsp;</RowCenter></Toggle>
                    <div>Labels Display Zoom Level</div>
                    <RowCenter>
                      <Toggle selected={LabelsVisibilityLevel === LOW_MIN_ZOOM_TO_DISPLAY_LABELS} onClick={(e) => { setLabelsVisibilityLevel(LOW_MIN_ZOOM_TO_DISPLAY_LABELS) }}><RowCenter><CheckIcon fontSize='small' />&nbsp;Low&nbsp;</RowCenter></Toggle>
                      <Toggle selected={LabelsVisibilityLevel === MEDIUM_MIN_ZOOM_TO_DISPLAY_LABELS} onClick={(e) => { setLabelsVisibilityLevel(MEDIUM_MIN_ZOOM_TO_DISPLAY_LABELS) }}><RowCenter><CheckIcon fontSize='small' />&nbsp;Medium&nbsp;</RowCenter></Toggle>
                      <Toggle selected={LabelsVisibilityLevel === HIGH_MIN_ZOOM_TO_DISPLAY_LABELS} onClick={(e) => { setLabelsVisibilityLevel(HIGH_MIN_ZOOM_TO_DISPLAY_LABELS) }}><RowCenter><CheckIcon fontSize='small' />&nbsp;High&nbsp;</RowCenter></Toggle>
                    </RowCenter>
                    {LabelsVisible &&
                      <LabelConf>
                        <RowCenter>
                          <ColumnLeft>
                            <Toggle selected={CSVisible} onClick={(e) => { setCSVisible(!CSVisibleRef.current) }}>CALLSIGN</Toggle>
                            <Toggle selected={ALTVisible} onClick={(e) => { setALTVisible(!ALTVisibleRef.current) }}>LEVEL</Toggle>
                            <Toggle selected={ROCVisible} onClick={(e) => { setROCVisible(!ROCVisibleRef.current) }}>ROCD</Toggle>
                            <Toggle selected={SSRVisible} onClick={(e) => { setSSRVisible(!SSRVisibleRef.current) }}>SSRCODE</Toggle>
                          </ColumnLeft>
                  &nbsp;
                  <ColumnLeft>
                            <Toggle selected={ADRVisible} onClick={(e) => { setADRVisible(!ADRVisibleRef.current) }}>ADDRESS</Toggle>
                            <Toggle selected={HDGVisible} onClick={(e) => { setHDGVisible(!HDGVisibleRef.current) }}>HEADING</Toggle>
                            <Toggle selected={QNHVisible} onClick={(e) => { setQNHVisible(!QNHVisibleRef.current) }}>QNH</Toggle>
                            <Toggle selected={ADEPVisible} onClick={(e) => { setADEPVisible(!ADEPVisibleRef.current) }}>ADEP</Toggle>
                          </ColumnLeft>
                  &nbsp;
                  <ColumnLeft>
                            <Toggle selected={TYPVisible} onClick={(e) => { setTYPVisible(!TYPVisibleRef.current) }}><span>ATYPE</span>&nbsp;<span>WTC</span></Toggle>
                            <Toggle selected={IASVisible} onClick={(e) => { setIASVisible(!IASVisibleRef.current) }}><span>IAS</span>&nbsp;<span>MACH</span></Toggle>
                            <Toggle selected={GSVisible} onClick={(e) => { setGSVisible(!GSVisibleRef.current) }}>GS</Toggle>
                            <Toggle selected={ADESVisible} onClick={(e) => { setADESVisible(!ADESVisibleRef.current) }}>ADES</Toggle>
                          </ColumnLeft>
                        </RowCenter>
                      </LabelConf>
                    }

                    <Toggle selected={SpeedVectorsVisible} onClick={(e) => { setSpeedVectorsVisible(!SpeedVectorsVisibleRef.current) }}><RowCenter><CheckIcon fontSize='small' />&nbsp;Speed vectors&nbsp;</RowCenter></Toggle>
                    <Toggle selected={TracksVisible} onClick={(e) => { setTracksVisible(!TracksVisibleRef.current) }}><RowCenter><CheckIcon fontSize='small' />&nbsp;Tracks&nbsp;</RowCenter></Toggle>
                  </ColumnLeft>
                }

                {mode === "advisory" && <>
                  {flightsAVDRef.current.filter(flight => flight.altitude > MIN_ALTITUDE_TO_DISPLAY_LABELS).length > MAX_FLIGHTS_FOR_STCA ?
                    <ColumnLeft>
                      <div><b>STCA & Wind Effect disabled</b></div>
                      <div><b>Too many flights</b></div>
                    </ColumnLeft> :
                    <ColumnLeft>

                      <Toggle selected={STCAVisible} onClick={(e) => { setSTCAVisible(!STCAVisibleRef.current); periodicTrafficUpdate() }}><Red><RowCenter><CheckCircleIcon fontSize='small' />&nbsp;<div>STCA</div>&nbsp;</RowCenter></Red></Toggle>
                      {STCAVisible && <SliderContainer>
                        <div>  Lateral Separation</div>
                        <RowCenter>
                          <div><b>{latSep.toString().padStart(2, "0")}NM</b>&nbsp;&nbsp;&nbsp;</div>
                          <MySlider
                            step={1}
                            min={0}
                            max={MAX_LATERAL_SEP}
                            value={latSep}
                            onChange={setSliderLatSep} />
                        </RowCenter>
                        <div>  Vertical Separation</div>
                        <RowCenter>
                          <div><b>{vertSep.toString().padStart(4, "0")}Feet</b>&nbsp;&nbsp;&nbsp;</div>
                          <MySlider
                            step={100}
                            min={0}
                            max={MAX_VERTICAL_SEP}
                            value={vertSep} onChange={setSliderVertSep} />
                        </RowCenter>
                      </SliderContainer>}
                      <Toggle selected={WindAdvisoryVisible} onClick={(e) => { setWindAdvisoryVisible(!WindAdvisoryVisibleRef.current); periodicTrafficUpdate() }}>
                        <Green><RowCenter><CheckCircleIcon fontSize='small' />&nbsp;Wind Suffering&nbsp;</RowCenter></Green>
                      </Toggle>
                      {WindAdvisoryVisible && <SliderContainer>
                        <div>  Adverse Wind</div>
                        <RowCenter>
                          <div><b>{windSuf.toString().padStart(3, "0")}KTS</b>&nbsp;&nbsp;&nbsp;</div>
                          <MySlider
                            step={1}
                            min={0}
                            max={MAX_WIND_SUF}
                            value={windSuf} onChange={setSliderWindSuf} />
                        </RowCenter>
                      </SliderContainer>}
                    </ColumnLeft>}</>
                }
                <div>
                  <MenuSector onClick={switchMenu("map", modeRef.current === "map" ? "" : "map")}><MapIcon style={{ color: modeRef.current === "map" ? `rgba(255,255,255,1)` : "rgba(255,255,255,0.5)" }}></MapIcon></MenuSector>
                  <MenuSector onClick={switchWeather}><CloudIcon style={{ color: weatherRef.current ? `rgba(255,255,255,1)` : "rgba(255,255,255,0.5)" }}></CloudIcon></MenuSector>
                  <MenuSector onClick={switchMenu("flight", modeRef.current === "flight" ? "" : "flight")}><FlightIcon style={{ color: modeRef.current === "flight" ? `rgba(255,255,255,1)` : "rgba(255,255,255,0.5)" }}></FlightIcon></MenuSector>
                  <MenuSector onClick={switchMenu("advisory", modeRef.current === "advisory" ? "" : "advisory")}><AlertIcon style={{ color: flightsAVDRef.current.filter(flight => flight.altitude > MIN_ALTITUDE_TO_DISPLAY_LABELS).length > MAX_FLIGHTS_FOR_STCA ? 'red' : (modeRef.current === "advisory" ? `rgba(255,255,255,1)` : "rgba(255,255,255,0.5)") }}></AlertIcon></MenuSector>
                  <MenuSector onClick={switchBRL}><HeightIcon style={{ color: ruleRef.current ? `rgba(255,255,0,1)` : "rgba(255,255,0,0.5)" }}></HeightIcon></MenuSector>
                  <MenuSector onClick={switch3D}><div style={{ color: D3Ref.current ? `rgba(255,255,255,1)` : "rgba(255,255,255,0.5)" }}><b>3D</b></div></MenuSector>
                  {D3Ref.current && <MenuSector onClick={stepBearing}><Bearing3DIcon /></MenuSector>}
                </div>

              </RowSpace>
            </SubMenu>

            <VertSliderContainer>
              <MyBlueSlider
                value={levelFilter}
                valueLabelFormat={value => <div>{value}FL</div>}
                orientation="vertical"
                min={0}
                max={900}
                step={10}
                valueLabelDisplay="on"
                onChange={setSliderLevelFilter}
                onChangeCommitted={periodicTrafficUpdate} />
            </VertSliderContainer>

          </RowRight>
        </Menu>}

        <Footer>
          {posOnMap !== [0, 0] && ruleRef.current && <RowCenter>{decimalToSexagesimal(posOnMap[1]).split(".")[0] + "\""} - {decimalToSexagesimal(posOnMap[0]).split(".")[0] + "\""}</RowCenter>}
        </Footer>

        {flightsAVDRef.current.filter(d => getFilters(d)).length > 0 &&
          <Legend>
            <LegendTitle><Bold>{flightsAVDRef.current.filter(d => getFilters(d)).length} Flights</Bold></LegendTitle>
          </Legend>}

      </>
    }
  </Container>
}

function getColor(d) {
  const r = d[2] / 10000;
  return [255 * (1 - r * 2), 128 * r, 255 * r, 255 * (1 - r)];
}

function getColorSky(z, border) {
  let r = z ? Math.max(0.2, Math.min(1, z / 500)) : 0.2;
  if (border)
    r += 0.3;
  return [255 * r, 0, 0, 255 * r];
}

function getDotsRadius(wtc) {
  if (wtc.indexOf("H") >= 0)
    return 400;
  else if (wtc.indexOf("M") >= 0)
    return 200;
  else if (wtc.indexOf("L") >= 0)
    return 100;
  else if (wtc.indexOf("J") >= 0)
    return 50;
  else
    return 200;
}

function getDestination(lng, lat, hdg, spd, altitude) {
  let result = computeDestinationPoint(
    [lng, lat],
    (SPEED_VECTOR_DURATION / 3600) * spd * 1.852 * 1000,
    hdg);
  return [result.longitude, result.latitude, altitude];
}

function getLabelPos(flight) {
  let result = flight.labelOffset ?
    [flight.longitude + flight.labelOffset[0], flight.latitude + flight.labelOffset[1]] :
    [flight.longitude, flight.latitude];
  return result;
}

const Container = styled.div`
    position: relative;
    height: 100%;
    .mapboxgl-ctrl {
        visibility: hidden;
    }
`

const Label = styled.div`
            position: absolute;
            background: rgba(33,33,33,0.8);
            color: rgb(255,255,255);
            padding: 5px;
            font-size:0.6em;
            cursor: pointer;
            text-align: left;
            border-radius: 4px;
            left:${props => props.hdg && (props.hdg >= 180) ? "6px" : ""};
            right:${props => props.hdg && (props.hdg < 180) ? "6px" : ""};
            bottom:${props => props.hdg && (props.hdg < 90 || props.hdg > 270) ? "6px" : ""};
            top:${props => props.hdg && (props.hdg >= 90 && props.hdg <= 270) ? "6px" : ""};
            width: auto;
            height: auto;
`


const Tooltip = styled.div`
  background: rgba(33,33,33,1);
  color: rgb(255,255,255);
  padding: 5px;
  font-size:0.8em;
  text-align: left;
  border-radius: 4px;
`

const LabelConf = styled.div`
  background: rgba(0,0,0,0.5);
  color: rgb(255,255,255);
  padding: 10px;
  margin: 5px;
  text-align: left;
  border:1px solid rgba(255,255,255,0.5);
  border-radius: 4px;
`

const Menu = styled.div`
    position: fixed;
    right:0px;
    top:40px;
    min-height: 200px;
    color: ${Colors.front};
`
const SubMenu = styled.div`
    position: relative;
    background-color:rgba(0,0,0,0.5);
    padding: 25px 5px 25px 5px;
    border-radius: 4px 0px 0px 4px;
    overflow:auto;
    margin-top:25px;
    font-size:0.8em;
    min-width: ${props => props.selected ? "250px" : "auto"};
`

const FlightPanel = styled.div`
    position: absolute;
    left:20px;
    top:80px;
    background-color:rgba(0,0,0,0.6);
    padding: 0px;
    border-radius: ${props => props.open ? "24px 24px 4px 4px;" : "24px 24px"};
    width: 260px;
`

const SearchInput = styled.div`
    color: rgb(100,100,100);
    position: relative;
    background-color:rgba(0,0,0,0.8);
    color: 'white';
    border-radius: 24px;
    padding:5px;
`

const FPLWindow = styled.div`
    position: relative;
    margin:10px;
    font-size: 0.6em;
`

const FPLItem = styled.div`
    position: relative;
    margin:4px
`

const MenuSector = styled.div`
    cursor:pointer;
    margin: 0px;
    padding:0px;
    left:20px;
`

const Title = styled.div`
    position: fixed;
    left:0px;
    top:20px;
    width:100%;
    font-weight: 900;
    color: ${Colors.theme};
    opacity: 0.3;
    font-size: 2em;
`

const LegendTitle = styled.div`
    color: white;
    opacity: 0.5;
    font-size: 1.5em;
`


const Footer = styled.div`
    color: ${Colors.front};
    position: fixed;
    left:0px;
    bottom:10px;
    width:100%;
`

const Legend = styled.div`
    color: white;
    position: absolute;
    left:10px;
    bottom:10px;
    font-size:1em;
`

const SliderContainer = styled.div`
    width: 90%;
`

const VertSliderContainer = styled.div`
    height:200px;
  margin-top:25px;
`


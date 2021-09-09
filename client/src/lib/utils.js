import {  MY_URL } from '../App/Conf';

export const IS_LOCALHOST = Boolean(
    window.location.hostname === 'localhost' ||
      // [::1] is the IPv6 localhost address.
      window.location.hostname === '[::1]' ||
      // 127.0.0.1/8 is considered localhost for IPv4.
      window.location.hostname.match(
        /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
      )
  );

export const BACK_DOMAIN = IS_LOCALHOST ? "http://localhost:2002" : MY_URL;


export const toHHMMSS = function (sec_num) {
    sec_num = parseInt(sec_num);
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return hours+':'+minutes+':'+seconds;
}

export const toMMSS = function (sec_num) {
    sec_num = parseInt(sec_num);
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}

    if (hours === "00")
        return minutes+':'+seconds;
    else
        return hours+':'+minutes+':'+seconds;
}

export const toSexa = (coordinate) =>
{
      //Lat
      let latSex = removeSpaces(decimalToSexagesimal(coordinate[1]).split(".")[0]);
      let latDeg = latSex.split("°")[0];
      if (latDeg.length === 1)
        latDeg = "0"+latDeg;
      let latMin = (latSex.split("°")[1]).split("'")[0];
      if (latMin.length === 1)
       latMin = "0"+latMin;
      let latSec = latSex.split("'")[1];
      if (latSec.length === 1)
        latSec = "0"+latSec;

      //Lng
      let lngSex = removeSpaces(decimalToSexagesimal(coordinate[0]).split(".")[0]);
      let lngDeg = lngSex.split("°")[0];
      if (lngDeg.length === 1)
        lngDeg = "00"+lngDeg;
      else if (lngDeg.length === 2)
        lngDeg = "0"+lngDeg;
      let lngMin = (lngSex.split("°")[1]).split("'")[0];
      if (lngMin.length === 1)
      lngMin = "0"+lngMin;
      let lngSec = lngSex.split("'")[1];
      if (lngSec.length === 1)
      lngSec = "0"+lngSec;

      return latDeg+latMin+latSec+(coordinate[1]>0?"N":"S")+" "+lngDeg+lngMin+lngSec+(coordinate[1]>0?"E":"W");
  }


export const generateUUID = function () {
  function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);
  };
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
}

export const removeSpaces = function (message) {
    return message.replace(/\s+/g, '').replace(/&nbsp;/g, '');
}

export function capitalize(name)
{
    return name.charAt(0).toUpperCase() + name.toLowerCase().slice(1);
}

export function capitalizeAll(sentence)
{
    let words = sentence.split(" ");
    let result = "";
    for (let i=0;i<words.length;i++)
    {
        result+=capitalize(words[i]+" ");
    }
    return result.trim();
}

export const computePos = (fixes) =>
{
    let pos=[];
    for (let i=0;i<fixes.length;i++)
    {
        let rawLat = fixes[i].split(" ")[0];
        let rawLong = fixes[i].split(" ")[1];
        let lat = 0;
        let long = 0;
        if (rawLat.length === 7)
            lat = toDecimal(rawLat.slice(0,2)+"°"+rawLat.slice(2,4)+"'"+rawLat.slice(4,6)+"\""+rawLat.slice(6,7));
        else if (rawLat.length === 5)
            lat = toDecimal(rawLat.slice(0,2)+"°"+rawLat.slice(2,4)+"'00\""+rawLat.slice(4,5));
       
        if (rawLong.length === 8)
            long = toDecimal(rawLong.slice(0,3)+"°"+rawLong.slice(3,5)+"'"+rawLong.slice(5,7)+"\""+rawLong.slice(7,8));
        else if (rawLong.length === 6)
            long = toDecimal(rawLong.slice(0,3)+"°"+rawLong.slice(3,5)+"'00\""+rawLong.slice(5,6));
        pos.push([long,lat]);
    }
    return pos;
}
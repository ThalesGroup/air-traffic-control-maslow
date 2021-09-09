import axios from 'axios';
import moment from 'moment';

export const fetchAirportArrivedInfo = ({ icao, minutes }) => {
    const endDate = moment().unix();
    const startDate = endDate - 60 * minutes * 24; // todo (for more data)
    return axios.get(`https://opensky-network.org/api/flights/arrival?airport=${icao}&begin=${startDate}&end=${endDate}`)
        .then((response) => ({
            arrival: response.data,
        }));
};

export const fetchAirportDepartureInfo = ({ icao, minutes }) => {
    const endDate = moment().unix();
    const startDate = endDate - 60 * minutes * 24; // todo (for more data)
    return axios.get(`https://opensky-network.org/api/flights/departure?airport=${icao}&begin=${startDate}&end=${endDate}`)
        .then((response) => ({
           departure: response.data,
        }));
};



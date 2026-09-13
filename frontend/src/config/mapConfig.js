/**
 * Centralized Map Configuration for Leaflet / React-Leaflet
 * Uses public OpenStreetMap tiles without requiring any API keys.
 */
export const MAP_CONFIG = {
  tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  chicagoCenter: [41.8781, -87.6298],
  defaultZoom: 11,
};

export default MAP_CONFIG;

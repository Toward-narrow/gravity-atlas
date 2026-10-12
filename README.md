# Gravity Atlas

An offline interactive Earth gravity and geomagnetism explorer.

The new default Magnetic Time Machine integrates the 1980/2010 assignment,
annual IGRF-14 models from 1900, official SV forecasts through 2030, and clearly
marked trend scenarios through 2100. It includes a close-up Arctic map with
the geographic pole, latitude circles, coastlines and smoothly moving true
geomagnetic pole positions and subtle dipole surface-direction curves,
clickable polar and D–I tracks, a moment chart, editable
observation coordinates, and SVG/PNG/CSV exports. The original gravity explorer
is available through the top navigation or `index.html#gravity`.

The assignment uses the supplied coefficients, separately from revised IGRF-14.
Local D/I fields use spherical harmonics through degree 13 in WGS-84 geodetic
coordinates; geomagnetic poles use the degree-1 axis and geocentric latitude.
There is no built-in pre-1900 historical model. The coefficient sandbox accepts
user-provided coefficients for other years. See 使用说明.md for details.

Open `index.html` in a modern browser to run it offline. The repository
includes tiled NOAA ETOPO 2022 elevation data. Original GeoTIFF source
files are excluded because of their size.
---

<sub>mj...mj❤Peter/EL</sub>


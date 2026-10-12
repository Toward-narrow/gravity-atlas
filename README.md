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

<<<<<<< HEAD
The field menu includes EIGEN-6C4 ellipsoidal gravity disturbance and geoid maps,
a visually exaggerated geoid (inspired by the Potsdam gravity potato), and a
linked terrain/field comparison. These offline field maps use spherical harmonics
through degree 179. The local calculator keeps its separate WGS-84 normal-gravity
and height model; it does not automatically add terrain mass or the global field.

Field model: GFZ EIGEN-6C4, Foerste et al. (2014), DOI: 10.5880/icgem.2015.1,
CC BY 4.0. The derived map can be rebuilt with `scripts/build-global-field.py`
after installing pyshtools, numpy, Pillow, and boule. The script downloads the
source model into the ignored `data/source/` folder.
=======
The terrain sets observation height; the app does not calculate a full
measured gravity anomaly field or automatically integrate terrain mass.

---

<sub>mj...mj❤Peter/EL</sub>
>>>>>>> c4de652747327120c46c3dc756a53cf3c8ff1a84

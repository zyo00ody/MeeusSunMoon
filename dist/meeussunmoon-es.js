/**
 * @license MeeusSunMoon v2.0.0
 * (c) 2018 Jan Greis
 * licensed under MIT
 */

/**
 * Converts angles in degrees to radians.
 * @param {number} deg Angle in degrees.
 * @returns {number} Angle in radians.
 */
const deg2rad = function (deg) {
  return deg * 0.017453292519943295;
};

/**
 * Converts angles in radians to degrees.
 * @param {number} rad Angle in radians.
 * @returns {number} Angle in degrees.
 */
const rad2deg = function (rad) {
  return rad * 57.29577951308232;
};

/**
 * Calculates the sine of an angle given in degrees.
 * @param {number} deg Angle in degrees.
 * @returns {number} Sine of the angle.
 */
const sind = function (deg) {
  return Math.sin(deg2rad(deg));
};

/**
 * Calculates the cosine of an angle given in degrees.
 * @param {number} deg Angle in degrees.
 * @returns {number} Cosine of the angle.
 */
const cosd = function (deg) {
  return Math.cos(deg2rad(deg));
};

/**
 * Reduces an angle to the interval 0-360°.
 * @param {number} angle Angle in degrees.
 * @returns {number} Reduced angle in degrees.
 */
const reduceAngle = function (angle) {
  return angle - (360 * Math.floor(angle / 360));
};

/**
 * Evaluates a polynomial in the form A + Bx + Cx^2...
 * @param {number} variable Value of x in the polynomial.
 * @param {array} coeffs Array of coefficients [A, B, C...].
 * @returns {number} Sum of the polynomial.
 */
const polynomial = function (variable, coeffs) {
  let varPower = 1;
  let sum = 0.0;
  const numCoeffs = coeffs.length;
  for (let i = 0; i < numCoeffs; i++) {
    sum += varPower * coeffs[i];
    varPower *= variable;
  }
  return sum;
};

/**
 * Interpolates a value from 3 known values (see AA p24 Eq3.3).
 * @param {number} y1 Start value of the interval.
 * @param {number} y2 Middle value of the interval.
 * @param {number} y3 End value of the interval.
 * @param {number} n Location (-0.5 >= n >= 0.5) of result in the interval.
 * @param {bool} normalize Whether the final result should be normalized.
 * @returns {number} Interpolated result.
 */
const interpolateFromThree = function (y1, y2, y3, n, normalize) {
  let a = y2 - y1;
  let b = y3 - y2;
  if (typeof normalize !== 'undefined' && normalize) {
    if (a < 0) { a += 360; }
    if (b < 0) { b += 360; }
  }
  const c = b - a;
  const y = y2 + (n / 2) * (a + b + n * c);
  return y;
};

/**
 * Converts a datetime in UTC to the corresponding Julian Date (see AA p60f).
 * @param {moment} datetime Datetime to be converted.
 * @returns {number} Julian date (fractional number of days since 1 January
 *     4713BC according to the proleptic Julian calendar.
 */
const datetimeToJD = function (datetime) {
  let Y = datetime.year();
  // Months are zero-indexed
  let M = datetime.month() + 1;
  const D = datetime.date() + (datetime.hour() + (datetime.minute() +
                               datetime.second() / 60) / 60) / 24;
  if (M < 3) {
    Y -= 1;
    M += 12;
  }
  const A = Math.floor(Y / 100);
  // Need a different B if we are before introduction of the Gregorian Calendar
  const gregorianCutoff = moment('1582-10-15T12:00:00Z');
  let B = 0;
  if (datetime.isAfter(gregorianCutoff)) {
    B = 2 - A + Math.floor(A / 4);
  }
  const JD = Math.floor(365.25 * (Y + 4716)) +
             Math.floor(30.6001 * (M + 1)) + D + B - 1524.5;
  return JD;
};

/**
 * Converts a Julian Date to the corresponding datetime in UTC (see AA p63).
 * @param {number} JD Julian date to be converted
 * @returns {moment} Datetime corresponding to the given Julian date.
 */
const JDToDatetime = function (JD) {
  JD += 0.5;
  const Z = Math.floor(JD);
  const F = JD - Z;
  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A += 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const fracDay = B - D - Math.floor(30.6001 * E) + F;
  const day = Math.floor(fracDay);
  const hours = Math.floor((fracDay - day) * 24);
  const minutes = Math.floor(((fracDay - day) * 24 - hours) * 60);
  const seconds =
    Math.floor((((fracDay - day) * 24 - hours) * 60 - minutes) * 60);
  let month = E - 1;
  if (E > 13) {
    month -= 12;
  }
  let year = C - 4715;
  if (month > 2) {
    year -= 1;
  }
  const datetime = moment.tz('2000-01-01T12:00:00', 'UTC');
  datetime.year(year);
  // Months are zero-indexed
  datetime.month(month - 1);
  datetime.date(day);
  datetime.hour(hours);
  datetime.minute(minutes);
  datetime.second(seconds);
  return datetime;
};

/**
 * Converts a Julian date to the number of Julian centuries since
 * 2000-01-01T12:00:00Z (see AA p87 Eq12.1).
 * @param {number} JD Julian date.
 * @returns {number} T.
 */
const JDToT = function (JD) {
  return (JD - 2451545) / 36525;
};

/**
 * Converts a datetime in UTC to the number of Julian centuries since
 * 2000-01-01T12:00:00Z.
 * @param {moment} datetime Datetime to be converted.
 * @returns {number} T.
 */
const datetimeToT = function (datetime) {
  return JDToT(datetimeToJD(datetime));
};

/* eslint-disable complexity */
/**
 * Calculates the value of ΔT=TT−UT (see
 * http://eclipse.gsfc.nasa.gov/SEcat5/deltatpoly.htm).
 * @param {moment} datetime Datetime for which ΔT should be calculated.
 * @returns {number} ΔT.
 */
const DeltaT = function (datetime) {
  let y = datetime.year();
  // Months are zero-indexed
  y += (datetime.month() + 0.5) / 12;
  let u;
  let t;
  let DeltaT;
  switch (true) {
    case y < -1999:
      DeltaT = false;
      break;
    case y < -500:
      u = (y - 1820) / 100;
      DeltaT = -20 + 32 * u * u;
      break;
    case y < 500:
      u = y / 100;
      DeltaT = 10583.6 - 1014.41 * u + 33.78311 * u * u - 5.952053 * u * u * u -
               0.1798452 * u * u * u * u + 0.022174192 * u * u * u * u * u +
               0.0090316521 * u * u * u * u * u * u;
      break;
    case y < 1600:
      u = (y - 1000) / 100;
      DeltaT = 1574.2 - 556.01 * u + 71.23472 * u * u + 0.319781 * u * u * u -
               0.8503463 * u * u * u * u - 0.005050998 * u * u * u * u * u +
               0.0083572073 * u * u * u * u * u * u;
      break;
    case y < 1700:
      t = y - 1600;
      DeltaT = 120 - 0.9808 * t - 0.01532 * t * t + t * t * t / 7129;
      break;
    case y < 1800:
      t = y - 1700;
      DeltaT = 8.83 + 0.1603 * t - 0.0059285 * t * t + 0.00013336 * t * t * t -
               t * t * t * t / 1174000;
      break;
    case y < 1860:
      t = y - 1800;
      DeltaT = 13.72 - 0.332447 * t + 0.0068612 * t * t +
               0.0041116 * t * t * t - 0.00037436 * t * t * t * t +
               0.0000121272 * t * t * t * t * t -
               0.0000001699 * t * t * t * t * t * t +
               0.000000000875 * t * t * t * t * t * t * t;
      break;
    case y < 1900:
      t = y - 1860;
      DeltaT = 7.62 + 0.5737 * t - 0.251754 * t * t + 0.01680668 * t * t * t -
               0.0004473624 * t * t * t * t + t * t * t * t * t / 233174;
      break;
    case y < 1920:
      t = y - 1900;
      DeltaT = -2.79 + 1.494119 * t - 0.0598939 * t * t +
                0.0061966 * t * t * t - 0.000197 * t * t * t * t;
      break;
    case y < 1941:
      t = y - 1920;
      DeltaT = 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t * t * t;
      break;
    case y < 1961:
      t = y - 1950;
      DeltaT = 29.07 + 0.407 * t - t * t / 233 + t * t * t / 2547;
      break;
    case y < 1986:
      t = y - 1975;
      DeltaT = 45.45 + 1.067 * t - t * t / 260 - t * t * t / 718;
      break;
    case y < 2005:
      t = y - 2000;
      DeltaT = 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t * t * t +
               0.000651814 * t * t * t * t + 0.00002373599 * t * t * t * t * t;
      break;
    case y < 2050:
      t = y - 2000;
      DeltaT = 62.92 + 0.32217 * t + 0.005589 * t * t;
      break;
    case y < 2150:
      DeltaT = -20 + 32 * ((y - 1820) / 100) * ((y - 1820) / 100) -
        0.5628 * (2150 - y);
      break;
    default:
      u = (y - 1820) / 100;
      DeltaT = -20 + 32 * u * u;
  }
  return DeltaT;
};
/* eslint-enable complexity */

/**
 * Calculates an approximate value for k (the fractional number of new moons
 * since 2000-01-06).
 * @param {moment} datetime Datetime for which k is calculated.
 * @returns {number} k.
 */
const approxK = function (datetime) {
  const year = datetime.year() + (datetime.month() + 1) / 12 +
    datetime.date() / 365.25;
  return (year - 2000) * 12.3685;
};

/**
 * Calculates T from k.
 * @param {number} k Fractional number of new moons since 2000-01-06.
 * @returns {number} T Fractional num. of centuries since 2000-01-01:12:00:00Z.
 */
const kToT = function (k) {
  return k / 1236.85;
};

/**
 * Calculates the Julian date in ephemeris time of the moon near the date
 * corresponding to k (see AA p350ff).
 * @param {number} k The approximate fractional number of new moons since
 *     2000-01-06.
 * @param {int} phase 0 -> new moon, 1 -> first quarter,
 *                    2 -> full moon, 3 -> last quarter.
 * @returns {number} Julian date in ephemeris time of the moon of given phase.
 */
const truePhase = function (k, phase) {
  k += phase / 4;
  const T = kToT(k);
  const E = eccentricityCorrection(T);
  let JDE = meanPhase(T, k);
  const M = sunMeanAnomaly(T, k);
  const MPrime = moonMeanAnomaly(T, k);
  const F = moonArgumentOfLatitude(T, k);
  const Omega = moonAscendingNodeLongitude(T, k);
  const A = planetaryArguments(T, k);
  let DeltaJDE = 0;
  if (phase === 0 || phase === 2) {
    DeltaJDE += newMoonFullMoonCorrections(E, M, MPrime, F, Omega, phase);
  } else if (phase === 1 || phase === 3) {
    DeltaJDE += quarterCorrections(E, M, MPrime, F, Omega, phase);
  }
  DeltaJDE += commonCorrections(A);
  JDE += DeltaJDE;
  return JDE;
};

/**
 * Calculates the mean phase of the moon as Julian date in ephemeris time (see
 * AA p349 Eq49.1).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @param {number} k The approximate fractional number of new moons since
 *     2000-01-06.
 * @returns {number} Julian date in ephemeris time of the moon of given mean
 *     phase.
 */
const meanPhase = function (T, k) {
  const JDE = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T -
              0.000000150 * T * T * T + 0.00000000073 * T * T * T * T;
  return JDE;
};

/**
 * Calculates the mean anomaly of the sun (see AA p350 Eq49.4).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @param {number} k The approximate fractional number of new moons since
 *     2000-01-06.
 * @returns {number} Mean anomaly of the sun at the given time.
 */
const sunMeanAnomaly = function (T, k) {
  const M = 2.5534 + 29.10535670 * k - 0.0000014 * T * T -
            0.00000011 * T * T * T;
  return M;
};

/**
 * Calculates the mean anomaly of the moon (see AA p350 Eq49.5).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @param {number} k The approximate fractional number of new moons since
 *     2000-01-06.
 * @returns {number} Mean anomaly of the moon at the given time.
 */
const moonMeanAnomaly = function (T, k) {
  const MPrime = 201.5643 + 385.81693528 * k + 0.0107582 * T * T +
                 0.00001238 * T * T * T - 0.000000058 * T * T * T * T;
  return MPrime;
};

/**
 * Calculates the argument of latitude of the moon (see AA p350 Eq49.6).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @param {number} k The approximate fractional number of new moons since
 *     2000-01-06.
 * @returns {number} Argument of latitude of the moon at the given time.
 */
const moonArgumentOfLatitude = function (T, k) {
  const F = 160.7108 + 390.67050284 * k - 0.0016118 * T * T -
            0.00000227 * T * T * T + 0.000000011 * T * T * T * T;
  return F;
};

/**
 * Calculates the longitude of the ascending node of the lunar orbit (see AA
 * p350 Eq49.7).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @param {number} k The approximate fractional number of new moons since
 *     2000-01-06.
 * @returns {number} Longitude of the ascending node of the lunar orbit at the
 *     given time.
 */
const moonAscendingNodeLongitude = function (T, k) {
  const Omega = 124.7746 - 1.56375588 * k + 0.0020672 * T * T +
                0.00000215 * T * T * T;
  return Omega;
};

/**
 * Calculates the correction for the eccentricity of the earth's orbit.
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @returns {number} Eccentricity correction.
 */
const eccentricityCorrection = function (T) {
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  return E;
};

/**
 * Calculates the planetary arguments for the moon phases (see AA p351).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @param {number} k The approximate fractional number of new moons since
 *     2000-01-06.
 * @returns {array} Planetary arguments for the moon phases.
 */
const planetaryArguments = function (T, k) {
  const A = [];
  /* eslint-disable no-multi-spaces */
  // Want to follow the numbering conventions from AA
  A[0]  = 0;
  A[1]  = 299.77 +  0.107408 * k - 0.009173 * T * T;
  A[2]  = 251.88 +  0.016321 * k;
  A[3]  = 251.83 + 26.651886 * k;
  A[4]  = 349.42 + 36.412478 * k;
  A[5]  =  84.66 + 18.206239 * k;
  A[6]  = 141.74 + 53.303771 * k;
  A[7]  = 207.14 +  2.453732 * k;
  A[8]  = 154.84 +  7.306860 * k;
  A[9]  =  34.52 + 27.261239 * k;
  A[10] = 207.19 +  0.121824 * k;
  A[11] = 291.34 +  1.844379 * k;
  A[12] = 161.72 + 24.198154 * k;
  A[13] = 239.56 + 25.513099 * k;
  A[14] = 331.55 +  3.592518 * k;
  /* eslint-enable no-multi-spaces */
  return A;
};

/**
 * Calculates the corrections to the planetary arguments for the moon phases
 * that are common to all phases (see AA p352).
 * @param {array} A Array of planetary arguments
 * @returns {number} Correction to the Julian date in ephemeris time for the
 *     moon phase.
 */
const commonCorrections = function (A) {
  const DeltaJDE = 0.000325 * sind(A[1]) +
                   0.000165 * sind(A[2]) +
                   0.000164 * sind(A[3]) +
                   0.000126 * sind(A[4]) +
                   0.000110 * sind(A[5]) +
                   0.000062 * sind(A[6]) +
                   0.000060 * sind(A[7]) +
                   0.000056 * sind(A[8]) +
                   0.000047 * sind(A[9]) +
                   0.000042 * sind(A[10]) +
                   0.000040 * sind(A[11]) +
                   0.000037 * sind(A[12]) +
                   0.000035 * sind(A[13]) +
                   0.000023 * sind(A[14]);
  return DeltaJDE;
};

/**
 * Calculates the corrections to the planetary arguments for the moon phases
 * for full and new moons (see AA p351).
 * @param {number} E Correction for the eccentricity of the earth's orbit.
 * @param {number} M Mean anomaly of the sun.
 * @param {number} MPrime Mean anomaly of the moon.
 * @param {number} F Argument of latitude of the moon.
 * @param {number} Omega Longitude of the ascending node of the lunar orbit.
 * @param {int} phase 0 -> new moon, 1 -> first quarter,
 *                    2 -> full moon, 3 -> last quarter.
 * @returns {number} Correction to the Julian date in ephemeris time for the
 *     moon phase.
 */
const newMoonFullMoonCorrections = function (E, M, MPrime, F, Omega, phase) {
  let DeltaJDE = -0.00111 * sind(MPrime - 2 * F) -
                  0.00057 * sind(MPrime + 2 * F) +
                  0.00056 * E * sind(2 * MPrime + M) -
                  0.00042 * sind(3 * MPrime) +
                  0.00042 * E * sind(M + 2 * F) +
                  0.00038 * E * sind(M - 2 * F) -
                  0.00024 * E * sind(2 * MPrime - M) -
                  0.00017 * sind(Omega) -
                  0.00007 * sind(MPrime + 2 * M) +
                  0.00004 * sind(2 * MPrime - 2 * F) +
                  0.00004 * sind(3 * M) +
                  0.00003 * sind(MPrime + M - 2 * F) +
                  0.00003 * sind(2 * MPrime + 2 * F) -
                  0.00003 * sind(MPrime + M + 2 * F) +
                  0.00003 * sind(MPrime - M + 2 * F) -
                  0.00002 * sind(MPrime - M - 2 * F) -
                  0.00002 * sind(3 * MPrime + M) +
                  0.00002 * sind(4 * MPrime);
  if (phase === 0) {
    DeltaJDE += -0.40720 * sind(MPrime) +
                 0.17241 * E * sind(M) +
                 0.01608 * sind(2 * MPrime) +
                 0.01039 * sind(2 * F) +
                 0.00739 * E * sind(MPrime - M) -
                 0.00514 * E * sind(MPrime + M) +
                 0.00208 * E * E * sind(2 * M);
  } else if (phase === 2) {
    DeltaJDE += -0.40614 * sind(MPrime) +
                 0.17302 * E * sind(M) +
                 0.01614 * sind(2 * MPrime) +
                 0.01043 * sind(2 * F) +
                 0.00734 * E * sind(MPrime - M) -
                 0.00515 * E * sind(MPrime + M) +
                 0.00209 * E * E * sind(2 * M);
  }
  return DeltaJDE;
};

/**
 * Calculates the corrections to the planetary arguments for the moon phases
 * for first and last quarters (see AA p352).
 * @param {number} E Correction for the eccentricity of the earth's orbit.
 * @param {number} M Mean anomaly of the sun.
 * @param {number} MPrime Mean anomaly of the moon.
 * @param {number} F Argument of latitude of the moon.
 * @param {number} Omega Longitude of the ascending node of the lunar orbit.
 * @param {int} phase 0 -> new moon, 1 -> first quarter,
 *                    2 -> full moon, 3 -> last quarter.
 * @returns {number} Correction to the Julian date in ephemeris time for the
 *     moon phase.
 */
const quarterCorrections = function (E, M, MPrime, F, Omega, phase) {
  let DeltaJDE = -0.62801 * sind(MPrime) +
                  0.17172 * E * sind(M) -
                  0.01183 * E * sind(MPrime + M) +
                  0.00862 * sind(2 * MPrime) +
                  0.00804 * sind(2 * F) +
                  0.00454 * E * sind(MPrime - M) +
                  0.00204 * E * E * sind(2 * M) -
                  0.00180 * sind(MPrime - 2 * F) -
                  0.00070 * sind(MPrime + 2 * F) -
                  0.00040 * sind(3 * MPrime) -
                  0.00034 * E * sind(2 * MPrime - M) +
                  0.00032 * E * sind(M + 2 * F) +
                  0.00032 * E * sind(M - 2 * F) -
                  0.00028 * E * E * sind(MPrime + 2 * M) +
                  0.00027 * E * sind(2 * MPrime + M) -
                  0.00017 * sind(Omega) -
                  0.00005 * sind(MPrime - M - 2 * F) +
                  0.00004 * sind(2 * MPrime + 2 * F) -
                  0.00004 * sind(MPrime + M + 2 * F) +
                  0.00004 * sind(MPrime - 2 * M) +
                  0.00003 * sind(MPrime + M - 2 * F) +
                  0.00003 * sind(3 * M) +
                  0.00002 * sind(2 * MPrime - 2 * F) +
                  0.00002 * sind(MPrime - M + 2 * F) -
                  0.00002 * sind(3 * MPrime + M);
  const W = 0.00306 -
            0.00038 * E * cosd(M) +
            0.00026 * cosd(MPrime) -
            0.00002 * cosd(MPrime - M) +
            0.00002 * cosd(MPrime + M) +
            0.00002 * cosd(2 * F);
  if (phase === 1) {
    DeltaJDE += W;
  } else if (phase === 3) {
    DeltaJDE -= W;
  }
  return DeltaJDE;
};

/* eslint array-bracket-spacing: "off", indent: "off", no-multi-spaces: "off", standard/array-bracket-even-spacing: "off" */

/** See AA p144 */
const sunMeanAnomaly$1 = [357.52772, 35999.050340, -0.0001603, -1 / 300000];

/** See AA p163 Eq 25.2 */
const sunMeanLongitude = [280.46646, 36000.76983, 0.0003032];

/** See AA p147 Eq22.3 */
const meanObliquityOfEcliptic =
  [84381.448 / 3600, -4680.93 / 3600, -1.55 / 3600, 1999.25 / 3600,
   -51.38 / 3600, -249.67 / 3600, -39.05 / 3600, 7.12 / 3600, 27.87 / 3600,
   5.79 / 3600, 2.45 / 3600];

/** See AA p144 */
const moonArgumentOfLatitude$1 =
  [93.27191, 483202.017538, -0.0036825, 1 / 327270];

/** See AA p144 */
const moonAscendingNodeLongitude$1 =
  [125.04452, -1934.136261, 0.0020708, 1 / 450000];

/** See AA p144 */
const moonMeanAnomaly$1 = [134.96298, 477198.867398, 0.0086972, 1 / 56250];

/** See AA p144 */
const moonMeanElongation = [297.85036, 445267.111480, -0.0019142, 1 / 189474];

/**
 * Nutations in longitude and obliquity
 * See AA p145f
 */
const nutations =
  [[ 0,  0,  0,  0, 1, -171996, -174.2, 92025,  8.9],
   [-2,  0,  0,  2, 2,  -13187,   -1.6,  5736, -3.1],
   [ 0,  0,  0,  2, 2,   -2274,   -0.2,   977, -0.5],
   [ 0,  0,  0,  0, 2,    2062,    0.2,  -895,  0.5],
   [ 0,  1,  0,  0, 0,    1426,   -3.4,    54, -0.1],
   [ 0,  0,  1,  0, 0,     712,    0.1,    -7,    0],
   [-2,  1,  0,  2, 2,    -517,    1.2,   224, -0.6],
   [ 0,  0,  0,  2, 1,    -386,   -0.4,   200,    0],
   [ 0,  0,  1,  2, 2,    -301,      0,   129, -0.1],
   [-2, -1,  0,  2, 2,     217,   -0.5,   -95,  0.3],
   [-2,  0,  1,  0, 0,    -158,      0,     0,    0],
   [-2,  0,  0,  2, 1,     129,    0.1,   -70,    0],
   [ 0,  0, -1,  2, 2,     123,      0,   -53,    0],
   [ 2,  0,  0,  0, 0,      63,      0,     0,    0],
   [ 0,  0,  1,  0, 1,      63,    0.1,   -33,    0],
   [ 2,  0, -1,  2, 2,     -59,      0,    26,    0],
   [ 0,  0, -1,  0, 1,     -58,   -0.1,    32,    0],
   [ 0,  0,  1,  2, 1,     -51,      0,    27,    0],
   [-2,  0,  2,  0, 0,      48,      0,     0,    0],
   [ 0,  0, -2,  2, 1,      46,      0,   -24,    0],
   [ 2,  0,  0,  2, 2,     -38,      0,    16,    0],
   [ 0,  0,  2,  2, 2,     -31,      0,    13,    0],
   [ 0,  0,  2,  0, 0,      29,      0,     0,    0],
   [-2,  0,  1,  2, 2,      29,      0,   -12,    0],
   [ 0,  0,  0,  2, 0,      26,      0,     0,    0],
   [-2,  0,  0,  2, 0,     -22,      0,     0,    0],
   [ 0,  0, -1,  2, 1,      21,      0,   -10,    0],
   [ 0,  2,  0,  0, 0,      17,   -0.1,     0,    0],
   [ 2,  0, -1,  0, 1,      16,      0,    -8,    0],
   [-2,  2,  0,  2, 2,     -16,    0.1,     7,    0],
   [ 0,  1,  0,  0, 1,     -15,      0,     9,    0],
   [-2,  0,  1,  0, 1,     -13,      0,     7,    0],
   [ 0, -1,  0,  0, 1,     -12,      0,     6,    0],
   [ 0,  0,  2, -2, 0,      11,      0,     0,    0],
   [ 2,  0, -1,  2, 1,     -10,      0,     5,    0],
   [ 2,  0,  1,  2, 2,     -8,       0,     3,    0],
   [ 0,  1,  0,  2, 2,      7,       0,    -3,    0],
   [-2,  1,  1,  0, 0,     -7,       0,     0,    0],
   [ 0, -1,  0,  2, 2,     -7,       0,     3,    0],
   [ 2,  0,  0,  2, 1,     -7,       0,     3,    0],
   [ 2,  0,  1,  0, 0,      6,       0,     0,    0],
   [-2,  0,  2,  2, 2,      6,       0,    -3,    0],
   [-2,  0,  1,  2, 1,      6,       0,    -3,    0],
   [ 2,  0, -2,  0, 1,     -6,       0,     3,    0],
   [ 2,  0,  0,  0, 1,     -6,       0,     3,    0],
   [ 0, -1,  1,  0, 0,      5,       0,     0,    0],
   [-2, -1,  0,  2, 1,     -5,       0,     3,    0],
   [-2,  0,  0,  0, 1,     -5,       0,     3,    0],
   [ 0,  0,  2,  2, 1,     -5,       0,     3,    0],
   [-2,  0,  2,  0, 1,      4,       0,     0,    0],
   [-2,  1,  0,  2, 1,      4,       0,     0,    0],
   [ 0,  0,  1, -2, 0,      4,       0,     0,    0],
   [-1,  0,  1,  0, 0,     -4,       0,     0,    0],
   [-2,  1,  0,  0, 0,     -4,       0,     0,    0],
   [ 1,  0,  0,  0, 0,     -4,       0,     0,    0],
   [ 0,  0,  1,  2, 0,      3,       0,     0,    0],
   [ 0,  0, -2,  2, 2,     -3,       0,     0,    0],
   [-1, -1,  1,  0, 0,     -3,       0,     0,    0],
   [ 0,  1,  1,  0, 0,     -3,       0,     0,    0],
   [ 0, -1,  1,  2, 2,     -3,       0,     0,    0],
   [ 2, -1, -1,  2, 2,     -3,       0,     0,    0],
   [ 0,  0,  3,  2, 2,      3,       0,     0,    0],
   [ 2, -1,  0,  2, 2,     -3,       0,     0,    0]];

/**
 * Calculates the solar transit time on a date at a given longitude (see AA
 * p102f).
 * @param {moment} datetime Date for which transit is calculated.
 * @param {number} L Longitude.
 * @returns {moment} Solar transit time.
 */
const sunTransit = function (datetime, L) {
  const timezone = datetime.tz();
  const transit = moment.tz(
    [datetime.year(), datetime.month(), datetime.date(), 0, 0, 0], 'UTC');
  const DeltaT$$1 = DeltaT(transit);
  const T = datetimeToT(transit);
  const Theta0 = apparentSiderealTimeGreenwhich(T);
  // Want 0h TD for this, not UT
  const TD = T - (DeltaT$$1 / (3600 * 24 * 36525));
  const alpha = sunApparentRightAscension(TD);
  // Sign flip for longitude from AA as we take East as positive
  let m = (alpha - L - Theta0) / 360;
  m = normalizeM(m, datetime.utcOffset());
  const DeltaM = sunTransitCorrection(T, Theta0, DeltaT$$1, L, m);
  m += DeltaM;
  transit.add(Math.floor(m * 3600 * 24 + 0.5), 'seconds');
  if (roundToNearestMinute) {
    transit.add(30, 'seconds');
    transit.second(0);
  }
  transit.tz(timezone);
  return transit;
};

/**
 * Calculates the sunrise or sunset time on a date at a given latitude and
 * longitude (see AA p102f).
 * @param {moment} datetime Date for which sunrise or sunset is calculated.
 * @param {number} phi Latitude.
 * @param {number} L Longitude.
 * @param {string} flag 'RISE' or 'SET' depending on which event should be
 *     calculated.
 * @returns {moment} Sunrise or sunset time.
 */
const sunRiseSet = function (datetime, phi, L, flag) {
  const timezone = datetime.tz();
  const suntime = moment.tz(
    [datetime.year(), datetime.month(), datetime.date(), 0, 0, 0], 'UTC');
  const DeltaT$$1 = DeltaT(suntime);
  const T = datetimeToT(suntime);
  const Theta0 = apparentSiderealTimeGreenwhich(T);
  // Want 0h TD for this, not UT
  const TD = T - (DeltaT$$1 / (3600 * 24 * 36525));
  const alpha = sunApparentRightAscension(TD);
  const delta = sunApparentDeclination(TD);
  const H0 = approxLocalHourAngle(phi, delta);
  // Sign flip for longitude from AA as we take East as positive
  let m0 = (alpha - L - Theta0) / 360;
  m0 = normalizeM(m0, datetime.utcOffset());
  let m;
  if (flag === 'RISE') {
    m = m0 - H0 / 360;
  } else if (flag === 'SET') {
    m = m0 + H0 / 360;
  } else {
    return false;
  }
  let counter = 0;
  let DeltaM = 1;
  // Repeat if correction is larger than ~9s
  while ((Math.abs(DeltaM) > 0.0001) && (counter < 3)) {
    DeltaM = sunRiseSetCorrection(T, Theta0, DeltaT$$1, phi, L, m);
    m += DeltaM;
    counter++;
  }
  if (m > 0) {
    suntime.add(Math.floor(m * 3600 * 24 + 0.5), 'seconds');
  } else {
    suntime.subtract(Math.floor(Math.abs(m) * 3600 * 24 + 0.5), 'seconds');
  }
  if (roundToNearestMinute) {
    suntime.add(30, 'seconds');
    suntime.second(0);
  }
  suntime.tz(timezone);
  return suntime;
};

/**
 * Returns 06:00/18:00 (07:00/19:00 during DST) if there is no sunrise or sunset
 * on the date. If returnTimeForPNMS is true, otherwise return whether there is
 * Polar Night or Midnight Sun.
 * @param {moment} returnDate The calculated time for sunrise or sunset.
 * @param {moment} date The original date from which the event was calculated.
 * @param {int} hour Hour to which the returned datetime should be set.
 * @returns {(moment|string)} Time given by parameter 'hour' (+ correction for
 *     DST if applicable) or a string indicating that the location experiences
 *     midnight sun ('MS') or polar night ('PN') on that date.
 */
const returnPNMS = function (returnDate, date, hour) {
  if (returnTimeForPNMS) {
    if (date.isDST()) {
      hour += 1;
    }
    returnDate.tz(date.tz())
      .year(date.year())
      .month(date.month())
      .date(date.date())
      .hour(hour)
      .minute(0)
      .second(0);
  }
  return returnDate;
};

/**
 * Calculates the approximate local hour angle of the sun at sunrise or sunset.
 * @param {number} phi Latitude (see AA p102 Eq15.1).
 * @param {number} delta Apparent declination of the sun.
 * @returns {number} Approximate local hour angle.
 */
const approxLocalHourAngle = function (phi, delta) {
  const cosH0 = (sind(-50 / 60) -
                sind(phi) * sind(delta)) /
                (cosd(phi) * cosd(delta));
  if (cosH0 < -1) {
    if (returnTimeForPNMS) {
      throw moment.tz('**2000-01-01 12:00:00', 'YYYY-MM-DD HH:mm:ss',
        'Europe/London');
    } else {
      throw 'MS';
    }
  } else if (cosH0 > 1) {
    if (returnTimeForPNMS) {
      throw moment.tz('--2000-01-01 12:00:00', 'YYYY-MM-DD HH:mm:ss',
        'Europe/London');
    } else {
      throw 'PN';
    }
  }
  const H0 = rad2deg(Math.acos(cosH0));
  return H0;
};

/**
 * Normalizes a fractional time of day to be on the correct date.
 * @param {number} m Fractional time of day
 * @param {int} utcOffset Offset in minutes from UTC.
 * @returns {number} m Normalized m.
 */
const normalizeM = function (m, utcOffset) {
  const localM = m + utcOffset / 1440;
  if (localM < 0) {
    return m + 1;
  } else if (localM > 1) {
    return m - 1;
  }
  return m;
};

/**
 * Calculates the correction for the solar transit time (see AA p103).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @param {number} Theta0 Apparent sidereal time at Greenwhich.
 * @param {number} DeltaT ΔT = TT − UT.
 * @param {number} L Longitude.
 * @param {number} m Fractional time of day of the event.
 * @returns {number} Currection for the solar transit time.
 */
const sunTransitCorrection = function (T, Theta0, DeltaT$$1, L, m) {
  const theta0 = Theta0 + 360.985647 * m;
  const n = m + DeltaT$$1 / 864000;
  const alpha = interpolatedRa(T, n);
  const H = localHourAngle(theta0, L, alpha);
  const DeltaM = -H / 360;
  return DeltaM;
};

/**
 * Calculates the correction for the sunrise/sunset time (see AA p103).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @param {number} Theta0 Apparent sidereal time at Greenwhich.
 * @param {number} DeltaT ΔT = TT − UT.
 * @param {number} phi Latitude.
 * @param {number} L Longitude.
 * @param {number} m Fractional time of day of the event.
 * @returns {number} Currection for the sunrise/sunset time.
 */
const sunRiseSetCorrection = function (T, Theta0, DeltaT$$1, phi, L, m) {
  const theta0 = Theta0 + 360.985647 * m;
  const n = m + DeltaT$$1 / 864000;
  const alpha = interpolatedRa(T, n);
  const delta = interpolatedDec(T, n);
  const H = localHourAngle(theta0, L, alpha);
  const h = altitude(phi, delta, H);
  const DeltaM = (h + 50 / 60) /
    (360 * cosd(delta) * cosd(phi) * sind(H));
  return DeltaM;
};

/**
 * Calculates the local hour angle of the sun (see AA p103).
 * @param {number} theta0 Sidereal time at Greenwhich in degrees.
 * @param {number} L Longitude.
 * @param {number} alpha Apparent right ascension of the sun.
 * @returns {number} Local hour angle of the sun.
 */
const localHourAngle = function (theta0, L, alpha) {
  // Signflip for longitude
  let H = reduceAngle(theta0 + L - alpha);
  if (H > 180) { H -= 360; }
  return H;
};

/**
 * Calculates the altitude of the sun above the horizon (see AA P93 Eq13.6).
 * @param {number} phi Latitude.
 * @param {number} delta Apparent declination of the sun.
 * @param {number} H Local hour angle of the sun.
 * @returns {number} Altitude of the sun above the horizon.
 */
const altitude = function (phi, delta, H) {
  const h = rad2deg(Math.asin(
    sind(phi) * sind(delta) +
    cosd(phi) * cosd(delta) * cosd(H)));
  return h;
};

/**
 * Interpolates the sun's right ascension (see AA p103).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @param {number} n Fractional time of day of the event corrected by ΔT.
 * @returns {number} Interpolated right ascension.
 */
const interpolatedRa = function (T, n) {
  const alpha1 = sunApparentRightAscension(T - (1 / 36525));
  const alpha2 = sunApparentRightAscension(T);
  const alpha3 = sunApparentRightAscension(T + (1 / 36525));
  // I don't understand why the RA has to be interpolated with normalization
  // but the Dec without, but the returned values are wrong otherwise...
  const alpha = interpolateFromThree(alpha1, alpha2, alpha3, n, true);
  return reduceAngle(alpha);
};

/**
 * Interpolates the sun's declination (see AA p103).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @param {number} n Fractional time of day of the event corrected by ΔT.
 * @returns {number} Interpolated declination.
 */
const interpolatedDec = function (T, n) {
  const delta1 = sunApparentDeclination(T - (1 / 36525));
  const delta2 = sunApparentDeclination(T);
  const delta3 = sunApparentDeclination(T + (1 / 36525));
  const delta = interpolateFromThree(delta1, delta2, delta3, n);
  return reduceAngle(delta);
};

/**
 * Calculates the apparent right ascension of the sun (see AA p165 Eq25.6).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @returns {number} Apparent right ascension of the sun.
 */
const sunApparentRightAscension = function (T) {
  const Omega = moonAscendingNodeLongitude$2(T);
  const epsilon = trueObliquityOfEcliptic(T) +
                  0.00256 * cosd(Omega);
  const lambda = sunApparentLongitude(T);
  const alpha = rad2deg(Math.atan2(
    cosd(epsilon) * sind(lambda), cosd(lambda)));
  return reduceAngle(alpha);
};

/**
 * Calculates the apparent declination of the sun (see AA p165 Eq25.7).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @returns {number} Apparent declination of the sun.
 */
const sunApparentDeclination = function (T) {
  const Omega = moonAscendingNodeLongitude$2(T);
  const epsilon = trueObliquityOfEcliptic(T) +
                  0.00256 * cosd(Omega);
  const lambda = sunApparentLongitude(T);
  const delta = rad2deg(Math.asin(
    sind(epsilon) * sind(lambda)));
  return delta;
};

/**
 * Calculates the apparent sidereal time at Greenwhich (see AA p88).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @returns {number} Apparent sidereal time at Greenwhich
 */
const apparentSiderealTimeGreenwhich = function (T) {
  const theta0 = meanSiderealTimeGreenwhich(T);
  const epsilon = trueObliquityOfEcliptic(T);
  const DeltaPsi = nutationInLongitude(T);
  const theta = theta0 + DeltaPsi * cosd(epsilon);
  return reduceAngle(theta);
};

/**
 * Calculates the mean sidereal time at Greenwhich (see AA p88 Eq12.4).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @returns {number} Mean sidereal time at Greenwhich
 */
const meanSiderealTimeGreenwhich = function (T) {
  const JD2000 = T * 36525;
  const theta0 = 280.46061837 + 360.98564736629 * JD2000 + 0.000387933 * T * T -
                 T * T * T / 38710000;
  return theta0;
};

/**
 * Calculates the true obliquity of the ecliptic (see AA p147).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @returns {number} True obliquity of the ecliptic.
 */
const trueObliquityOfEcliptic = function (T) {
  const epsilon0 = meanObliquityOfEcliptic$1(T);
  const DeltaEpsilon = nutationInObliquity(T);
  const epsilon = epsilon0 + DeltaEpsilon;
  return epsilon;
};

/**
 * Calculates the mean obliquity of the ecliptic (see AA p147 Eq 22.3).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @returns {number} Mean obliquity of the ecliptic.
 */
const meanObliquityOfEcliptic$1 = function (T) {
  const U = T / 100;
  const epsilon0 = polynomial(U, meanObliquityOfEcliptic);
  return epsilon0;
};

/**
 * Calculates the apparent longitude of the sun (see AA p164).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @returns {number} Apparent longitude of the sun.
 */
const sunApparentLongitude = function (T) {
  const Sol = sunTrueLongitude(T);
  const Omega = moonAscendingNodeLongitude$2(T);
  const lambda = Sol - 0.00569 - 0.00478 * sind(Omega);
  return lambda;
};

/**
 * Calculates the true longitude of the sun (see AA p164).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @returns {number} True longitude of the sun.
 */
const sunTrueLongitude = function (T) {
  const L0 = sunMeanLongitude$1(T);
  const C = sunEquationOfCenter(T);
  const Sol = L0 + C;
  return Sol;
};

/**
 * Calculates the equation of center of the sun (see AA p164).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @returns {number} Equation of center of the sun.
 */
const sunEquationOfCenter = function (T) {
  const M = sunMeanAnomaly$2(T);
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sind(M) +
            (0.019993 - 0.000101 * T) * sind(2 * M) +
            0.000290 * sind(3 * M);
  return C;
};

/**
 * Calculates the nutation in longitude of the sun (see AA p144ff).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @returns {number} Nutation in longitude of the sun.
 */
const nutationInLongitude = function (T) {
  const D = moonMeanElongation$1(T);
  const M = sunMeanAnomaly$2(T);
  const MPrime = moonMeanAnomaly$2(T);
  const F = moonArgumentOfLatitude$2(T);
  const Omega = moonAscendingNodeLongitude$2(T);
  let DeltaPsi = 0;
  let sineArg;
  for (let i = 0; i < 63; i++) {
    sineArg = nutations[i][0] * D +
              nutations[i][1] * M +
              nutations[i][2] * MPrime +
              nutations[i][3] * F +
              nutations[i][4] * Omega;
    DeltaPsi += (nutations[i][5] +
                 nutations[i][6] * T) * sind(sineArg);
  }
  DeltaPsi /= 36000000;
  return DeltaPsi;
};

/**
 * Calculates the nutation in obliquity of the sun (see AA p144ff).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @returns {number} Nutation in obliquity of the sun.
 */
const nutationInObliquity = function (T) {
  const D = moonMeanElongation$1(T);
  const M = sunMeanAnomaly$2(T);
  const MPrime = moonMeanAnomaly$2(T);
  const F = moonArgumentOfLatitude$2(T);
  const Omega = moonAscendingNodeLongitude$2(T);
  let DeltaEpsilon = 0;
  let cosArg;
  for (let i = 0; i < 63; i++) {
    cosArg = nutations[i][0] * D +
             nutations[i][1] * M +
             nutations[i][2] * MPrime +
             nutations[i][3] * F +
             nutations[i][4] * Omega;
    DeltaEpsilon += (nutations[i][7] +
                     nutations[i][8] * T) * cosd(cosArg);
  }
  DeltaEpsilon /= 36000000;
  return DeltaEpsilon;
};

/**
 * Calculates the argument of latitude of the moon (see AA p144).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @returns {number} Argument of latitude of the moon.
 */
const moonArgumentOfLatitude$2 = function (T) {
  const F = polynomial(T, moonArgumentOfLatitude$1);
  return reduceAngle(F);
};

/**
 * Calculates the longitude of the ascending node of the Moon's mean orbit on
 * the ecliptic, measured from the mean equinox of the datea (see AA p144).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @returns {number} Longitude of the asc. node of the moon's mean orbit.
 */
const moonAscendingNodeLongitude$2 = function (T) {
  const Omega = polynomial(T, moonAscendingNodeLongitude$1);
  return reduceAngle(Omega);
};

/**
 * Calculates the mean anomaly of the moon (see AA p144).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @returns {number} Mean anomaly of the moon.
 */
const moonMeanAnomaly$2 = function (T) {
  const MPrime = polynomial(T, moonMeanAnomaly$1);
  return reduceAngle(MPrime);
};

/**
 * Calculates the mean elongation of the moon from the sun (see AA p144).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @returns {number} Mean elongation of the moon from the sun.
 */
const moonMeanElongation$1 = function (T) {
  const D = polynomial(T, moonMeanElongation);
  return reduceAngle(D);
};

/**
 * Calculates the mean anomaly of the sun (see AA p144).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @returns {number} Mean anomaly of the sun.
 */
const sunMeanAnomaly$2 = function (T) {
  const M = polynomial(T, sunMeanAnomaly$1);
  return reduceAngle(M);
};

/**
 * Calculates the mean longitude of the sun referred to the mean equinox of the
 * date (see AA p163).
 * @param {number} T Fractional number of Julian centuries since
 *     2000-01-01T12:00:00Z.
 * @returns {number} Mean longitude of the sun referred to the mean equinox of
 *     the date.
 */
const sunMeanLongitude$1 = function (T) {
  const L0 = polynomial(T, sunMeanLongitude);
  return reduceAngle(L0);
};

let roundToNearestMinute = false;
let returnTimeForPNMS = false;
let dateFormatKeys = {'**': '‡', '--': '†'};

/**
 * Sets options (roundToNearestMinute, returnTimeForPNMS, dateFormatKey) for the
 * module.
 * @param {object} options Options to be set.
 */
const options = function (options) {
  if (typeof options.roundToNearestMinute === 'boolean') {
    roundToNearestMinute = options.roundToNearestMinute;
  }
  if (typeof options.returnTimeForPNMS === 'boolean') {
    returnTimeForPNMS = options.returnTimeForPNMS;
  }
  if (typeof options.dateFormatKeys === 'object') {
    dateFormatKeys = options.dateFormatKeys;
  }
};

/**
 * Uses the extra information encoded into the moment object for dates without
 * a sunrise or sunset if returnTimeForPNMS is true to mark the output string.
 * @param {moment} datetime Input datetime.
 * @param {string} formatString Valid moment format string.
 * @returns {string} Formatted string with marker appended.
 */
const formatCI = function (datetime, formatString) {
  const customKey = datetime.creationData().input.slice(0, 2);
  let datestring = datetime.format(formatString);
  if (dateFormatKeys[customKey]) {
    datestring += dateFormatKeys[customKey];
  }
  return datestring;
};

/**
 * Calculates sunrise on the provided date.
 * @param {moment} datetime Datetime for which sunrise is calculated. Should
 *     always contain a timezone or be in UTC, lone UTC offsets might lead to
 *     unexpected behaviour.
 * @param {number} phi Latitude of target location.
 * @param {number} L longitude of target location.
 * @returns {(moment|string)} Time of sunrise or a string indicating that the
 *     location experiences midnight sun ('MS') or polar night ('PN') on that
 *     date (unless returnTimeForPNMS is true).
 */
const sunrise = function (datetime, phi, L) {
  let sunrise;
  try {
    sunrise = sunRiseSet(datetime, phi, L, 'RISE');
  } catch (err) {
    return returnPNMS(err, datetime, 6);
  }
  return sunrise;
};

/**
 * Calculates sunset on the provided date.
 * @param {moment} datetime Datetime for which sunset is calculated. Should
 *     always contain a timezone or be in UTC, lone UTC offsets might lead to
 *     unexpected behaviour.
 * @param {number} phi Latitude of target location.
 * @param {number} L longitude of target location.
 * @returns {(moment|string)} Time of sunset or a string indicating that the
 *     location experiences midnight sun ('MS') or polar night ('PN') on that
 *     date (unless returnTimeForPNMS is true).
 */
const sunset = function (datetime, phi, L) {
  let sunset;
  try {
    sunset = sunRiseSet(datetime, phi, L, 'SET');
  } catch (err) {
    return returnPNMS(err, datetime, 18);
  }
  return sunset;
};

/**
 * Calculates solar noon on the provided date.
 * @param {moment} datetime Datetime for which solar noon is calculated. Should
 *     always contain a timezone or be in UTC, lone UTC offsets might lead to
 *     unexpected behaviour.
 * @param {number} L longitude of target location.
 * @returns {moment} Time of solar noon at the given longitude.
 */
const solarNoon = function (datetime, L) {
  const transit = sunTransit(datetime, L);
  return transit;
};

/**
 * Calculates all moons of the given phase that occur within the given
 * Gregorian calendar year.
 * @param {int} year Year for which moon phases should be calculated.
 * @param {int} phase 0 -> new moon, 1 -> first quarter,
 *                    2 -> full moon, 3 -> last quarter.
 * @param {string} timezone Optional: IANA timezone string.
 * @returns {array} Array of moment objects for moons of the given phase.
 */
const yearMoonPhases = function (year, phase, timezone) {
  const yearBegin = moment([year]);
  const yearEnd = moment([year + 1]);
  // this will give us k for the first new moon of the year or earlier
  let k = Math.floor(approxK(yearBegin)) - 1;
  // taking 15 events will make sure we catch every event in the year
  const phaseTimes = [];
  let JDE;
  let moonDatetime;
  let DeltaT$$1;
  for (let i = 0; i < 15; i++) {
    JDE = truePhase(k, phase);
    // we pretend it's JD and not JDE
    moonDatetime = JDToDatetime(JDE);
    // now use that to calculate deltaT
    DeltaT$$1 = DeltaT(moonDatetime);
    if (DeltaT$$1 > 0) {
      moonDatetime.subtract(Math.abs(DeltaT$$1), 'seconds');
    } else {
      moonDatetime.add(Math.abs(DeltaT$$1), 'seconds');
    }
    if (roundToNearestMinute) {
      moonDatetime.add(30, 'seconds');
      moonDatetime.second(0);
    }
    if (typeof timezone === 'undefined') {
      timezone = 'UTC';
    }
    moonDatetime.tz(timezone);
    if ((moonDatetime.isAfter(yearBegin)) && (moonDatetime.isBefore(yearEnd))) {
      phaseTimes.push(moonDatetime);
    }
    k++;
  }
  return phaseTimes;
};

export { options, formatCI, sunrise, sunset, solarNoon, yearMoonPhases, roundToNearestMinute, returnTimeForPNMS };

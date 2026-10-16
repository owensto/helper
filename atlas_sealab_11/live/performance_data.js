/* Factual sea-trial rows; sources and limitations are retained. */
(function(g){'use strict';const data={
  "id": "yamaha-sportsman-masters247-f300xsb2-20230628",
  "title": "Sportsman Masters 247 / single Yamaha F300XSB2",
  "testDate": "2023-06-28",
  "publisher": "Yamaha Outboards",
  "bulletinId": "PB_SPT_Masters 247_F300XSB2_6-28-2023_BAY",
  "sourceUrl": "https://yamahaoutboards.com/outboards/350-150-hp/v6-4-2l/f300-(4-2l)/pb_spt_masters-247_f300xsb2_6-28-2023_bay",
  "pdfUrl": "https://yamahaoutboards.com/getmedia/b47b894e-b079-4573-a400-638fbaa1910c/pb_spt_masters%20247_f300xsb2_6-28-2023_bay",
  "crosscheckUrl": "https://sportsmanboatsmfg.com/masters/247-bay-boat/performance/yamaha-f300xsb2-single",
  "boat": "Sportsman Masters 247",
  "engine": "Yamaha F300XSB2",
  "engineCount": 1,
  "horsepower": 300,
  "testWeightLb": 4591,
  "lengthFt": 24.333333333333332,
  "beamFt": 8.416666666666666,
  "fuelCapacityUsGal": 65,
  "testFuelUsGal": 35,
  "people": 2,
  "engineWeightEstimatedLb": 611,
  "gearRatio": 1.75,
  "propeller": {
    "series": "Saltwater Series II",
    "diameterIn": 15.25,
    "pitchIn": 18,
    "part": "6CE-45934-20-00"
  },
  "conditions": {
    "airF": 89,
    "waterF": 85,
    "windMph": [
      10,
      15
    ],
    "elevationFt": 0,
    "seaState": null,
    "waterCurrent": null,
    "trimByRpm": null
  },
  "equipment": "Five batteries, 10-inch hydraulic jack plate, twin Power Pole shallow-water anchors, 36 V bow trolling motor, safety and test equipment.",
  "acceleration": {
    "timeToPlaneSeconds": 3.5,
    "zeroTo30MphSeconds": 7.7,
    "fullTimeSeriesAvailable": false
  },
  "rows": [
    {
      "rpm": 1000,
      "mph": 5.3,
      "gph": 1.4,
      "publishedMpg": 3.79
    },
    {
      "rpm": 1500,
      "mph": 7.3,
      "gph": 2.3,
      "publishedMpg": 3.17
    },
    {
      "rpm": 2000,
      "mph": 8.5,
      "gph": 3.9,
      "publishedMpg": 2.18
    },
    {
      "rpm": 2500,
      "mph": 11.1,
      "gph": 5.5,
      "publishedMpg": 2.02
    },
    {
      "rpm": 3000,
      "mph": 17.5,
      "gph": 6.6,
      "publishedMpg": 2.65
    },
    {
      "rpm": 3500,
      "mph": 29.6,
      "gph": 8.5,
      "publishedMpg": 3.5
    },
    {
      "rpm": 4000,
      "mph": 34.8,
      "gph": 11.8,
      "publishedMpg": 2.96
    },
    {
      "rpm": 4500,
      "mph": 39.7,
      "gph": 15.3,
      "publishedMpg": 2.59
    },
    {
      "rpm": 5000,
      "mph": 44.2,
      "gph": 20.2,
      "publishedMpg": 2.19
    },
    {
      "rpm": 5500,
      "mph": 49.2,
      "gph": 25.9,
      "publishedMpg": 1.9
    },
    {
      "rpm": 5800,
      "mph": 50.9,
      "gph": 26.4,
      "publishedMpg": 1.93
    }
  ],
  "limitations": [
    "Measurements belong to the reference boat, NOT ATLAS Bay.",
    "Publisher reports approximate results dependent on loading, conditions, rigging and operator.",
    "Only forward, steady RPM/speed/fuel points are tabulated. Idle, neutral, reverse and transient fuel are not measured here.",
    "No ATLAS draft, stability, load, structural or handling validation.",
    "No 450 hp curve is inferred."
  ],
  "method": {
    "interpolation": "Piecewise linear speed and US gallons/hour, only within 1000\u20135800 RPM. No extrapolation.",
    "sourceMpg": "Preserve the published MPG column. Derived economy uses speed divided by fuel; rounded source columns need not divide exactly.",
    "range": "Constant-speed no-current scenario, usable fuel after an explicit user reserve; not a measured or safe passage range.",
    "drive": "Reference-curve empirical surge response; other axes and transient behavior are modeled.",
    "acceleration": "One response constant fitted to the published 0\u201330 mph endpoint; not independent validation and not a full measured acceleration trace."
  }
}
;g.BAY_REFERENCE_DATA=data;if(typeof module!=='undefined')module.exports=data;})(typeof window!=='undefined'?window:globalThis);

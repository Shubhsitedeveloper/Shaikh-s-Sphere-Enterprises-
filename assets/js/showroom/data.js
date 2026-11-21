/* ============================================================
   SHOWROOM CONTENT — edit names, descriptions and specs here.
   Capacities are typical guidance, not a quote. No prices are shown
   on purpose: the enquiry slip asks the team for a quote instead.
   ============================================================ */

// Each display face in the showroom. Aisle 01 is on the left as you walk in.
export const FACES = [
  { id: "split",    aisle: "01", name: "Split ACs",           sub: "Inverter · hot & cold · window",       x: -9.0,  dir: 1 },
  { id: "cassette", aisle: "01", name: "Cassette & ducted",   sub: "False-ceiling and floor units",        x: -3.6,  dir: -1 },
  { id: "vrf",      aisle: "02", name: "VRF / VRV systems",   sub: "One outdoor unit, many rooms",         x: -2.4,  dir: 1 },
  { id: "vent",     aisle: "02", name: "Ventilation",         sub: "Exhaust, fresh air, kitchen hoods",    x: 2.4,   dir: -1 },
  { id: "duct",     aisle: "03", name: "Ducting & grilles",   sub: "GI ducts, insulation, dampers",        x: 3.6,   dir: 1 },
  { id: "cold",     aisle: "03", name: "Cold rooms",          sub: "Walk-in storage from +5 to −25 °C",    x: 9.0,   dir: -1 }
];

export const AISLES = [
  { n: "01", title: "Split & cassette", x: -6 },
  { n: "02", title: "VRF & ventilation", x: 0 },
  { n: "03", title: "Ducting & cold rooms", x: 6 }
];

// slot: position along the face in metres (negative = nearer the entrance once placed)
export const PRODUCTS = [
  // ---- 01 Split ACs
  { id: "split-1", face: "split", slot: -4.2, kind: "split", w: 0.82, tr: 1,
    name: "Inverter split AC, 1 TR", short: "Small bedrooms, cabins and study rooms.",
    specs: [["Room size", "up to ~120 sq ft"], ["Compressor", "Inverter, R32 gas"], ["Noise", "Whisper-quiet sleep mode"]] },
  { id: "split-15", face: "split", slot: -2.1, kind: "split", w: 0.92, tr: 1.5,
    name: "Inverter split AC, 1.5 TR", short: "The everyday size for bedrooms and small living rooms.",
    specs: [["Room size", "120 to 180 sq ft"], ["Compressor", "Inverter, R32 gas"], ["Install", "Concealed copper piping"]] },
  { id: "split-2", face: "split", slot: 0, kind: "split", w: 1.04, tr: 2,
    name: "Inverter split AC, 2 TR", short: "Large bedrooms, living rooms and shop counters.",
    specs: [["Room size", "180 to 260 sq ft"], ["Compressor", "Inverter, R32 gas"], ["Airflow", "4-way swing"]] },
  { id: "split-hc", face: "split", slot: 2.1, kind: "split", w: 0.96, tr: 1.5, warm: true,
    name: "Hot & cold split AC, 1.5 TR", short: "Cools in summer, heats in winter with a heat pump.",
    specs: [["Room size", "120 to 180 sq ft"], ["Modes", "Cooling and heat pump"], ["Best for", "North India winters"]] },
  { id: "window", face: "split", slot: 4.2, kind: "window", tr: 1.5,
    name: "Window AC, 1.5 TR", short: "One box in a wall opening. No outdoor unit to mount.",
    specs: [["Room size", "120 to 180 sq ft"], ["Install", "Wall or window cut-out"], ["Best for", "Rented rooms, shops"]] },

  // ---- 01 Cassette & ducted
  { id: "cassette-4", face: "cassette", slot: -4.2, kind: "cassette", tr: 3,
    name: "4-way cassette AC", short: "Sits flush in a false ceiling and throws air four ways.",
    specs: [["Capacity", "2 to 4 TR"], ["Fits", "600 × 600 ceiling grid"], ["Best for", "Offices, clinics, shops"]] },
  { id: "cassette-1", face: "cassette", slot: -2.1, kind: "cassette1", tr: 1.5,
    name: "1-way cassette AC", short: "A slim ceiling unit for corridors and narrow rooms.",
    specs: [["Capacity", "1 to 2 TR"], ["Throw", "One direction"], ["Best for", "Corridors, cabins"]] },
  { id: "ductable", face: "cassette", slot: 0, kind: "ductable", tr: 8.5,
    name: "Ductable (concealed) AC", short: "Hidden above the ceiling; ducts carry air to every corner.",
    specs: [["Capacity", "3 to 17 TR"], ["Air out", "Through grilles and diffusers"], ["Best for", "Open offices, halls"]] },
  { id: "tower", face: "cassette", slot: 2.1, kind: "tower", tr: 3,
    name: "Tower AC", short: "Floor-standing unit with a long, powerful air throw.",
    specs: [["Capacity", "2 to 4 TR"], ["Install", "No ceiling work"], ["Best for", "Showrooms, banquet halls"]] },
  { id: "floorceil", face: "cassette", slot: 4.2, kind: "floorceil", tr: 3,
    name: "Floor-ceiling AC", short: "Mount it low on a wall or under the ceiling.",
    specs: [["Capacity", "2 to 5 TR"], ["Mounting", "Floor or ceiling"], ["Best for", "Restaurants, retail"]] },

  // ---- 02 VRF / VRV
  { id: "vrf-odu", face: "vrf", slot: -3.9, kind: "vrf", tr: 12,
    name: "VRF outdoor unit", short: "One modular outdoor unit runs up to dozens of indoor units.",
    specs: [["Capacity", "8 to 60 HP, modular"], ["Pipes", "Two copper lines for the building"], ["Best for", "Offices, villas, hotels"]] },
  { id: "vrf-wall", face: "vrf", slot: -1.4, kind: "split", w: 0.88, tr: 1.5,
    name: "VRF indoor unit, wall type", short: "Each room gets its own unit and its own temperature.",
    specs: [["Capacity", "0.6 to 2.5 TR"], ["Control", "Per room"], ["Connects to", "VRF outdoor unit"]] },
  { id: "vrf-ducted", face: "vrf", slot: 0.9, kind: "slimduct", tr: 2,
    name: "VRF slim ducted indoor unit", short: "A 200 mm slim body hides above the ceiling.",
    specs: [["Capacity", "1 to 4 TR"], ["Height", "About 200 mm"], ["Best for", "Bedrooms, cabins"]] },
  { id: "refnet", face: "vrf", slot: 2.9, kind: "refnet", tr: null,
    name: "Refnet joints & copper piping", short: "Branch joints split refrigerant evenly to every indoor unit.",
    specs: [["Material", "Copper, brazed joints"], ["Insulation", "Nitrile, 13 to 19 mm"], ["Tested at", "Pressure test before handover"]] },
  { id: "vrf-control", face: "vrf", slot: 4.6, kind: "controller", tr: null,
    name: "Central touch controller", short: "Every zone on one screen: schedules, limits and energy use.",
    specs: [["Zones", "Up to 64 indoor units"], ["Features", "Schedules, lock, energy"], ["Mount", "Wall or desk"]] },

  // ---- 02 Ventilation
  { id: "exhaust", face: "vent", slot: -4.2, kind: "exhaust", tr: null,
    name: "Wall exhaust fan", short: "Pulls out heat, smell and moisture from toilets and kitchens.",
    specs: [["Sizes", "150 to 450 mm"], ["Shutter", "Gravity back-draft"], ["Best for", "Toilets, pantries"]] },
  { id: "inline", face: "vent", slot: -2.0, kind: "inline", tr: null,
    name: "Inline duct fan", short: "Fits inside the duct run, quiet and out of sight.",
    specs: [["Sizes", "100 to 315 mm"], ["Noise", "Low, mixed-flow"], ["Best for", "Toilet and basement exhaust"]] },
  { id: "hood", face: "vent", slot: 0.4, kind: "hood", tr: null,
    name: "Commercial kitchen hood", short: "Baffle filters catch grease; the fan takes fumes up and out.",
    specs: [["Build", "SS 304 with baffle filters"], ["Fan", "Centrifugal, roof outlet"], ["Best for", "Restaurants, hotels"]] },
  { id: "erv", face: "vent", slot: 2.6, kind: "erv", tr: null,
    name: "Fresh air unit with heat recovery", short: "Brings in filtered fresh air and keeps the cooling inside.",
    specs: [["Recovery", "Up to ~70% energy"], ["Filter", "Fine dust filter"], ["Best for", "Closed offices, clinics"]] },
  { id: "axial", face: "vent", slot: 4.6, kind: "axial", tr: null,
    name: "Industrial axial fan", short: "Big air volume for car parks, factories and basements.",
    specs: [["Sizes", "450 to 1000 mm"], ["Drive", "Direct, 3-phase"], ["Best for", "Basements, workshops"]] },

  // ---- 03 Ducting
  { id: "gi-duct", face: "duct", slot: -3.8, kind: "giduct", tr: null,
    name: "Rectangular GI duct", short: "Made to measure in galvanised steel with flanged joints.",
    specs: [["Gauge", "24 to 18 G by size"], ["Joints", "TDC / slip-on flanges"], ["Best for", "Ducted and VRF systems"]] },
  { id: "spiral", face: "duct", slot: -1.4, kind: "spiral", tr: null,
    name: "Round spiral duct", short: "Neat exposed look for cafés, studios and open ceilings.",
    specs: [["Diameter", "100 to 1000 mm"], ["Finish", "GI or powder-coated"], ["Best for", "Exposed ceilings"]] },
  { id: "grilles", face: "duct", slot: 0.9, kind: "grilles", tr: null,
    name: "Grilles & diffusers", short: "Square, round and linear slot outlets that spread air evenly.",
    specs: [["Material", "Powder-coated aluminium"], ["Types", "Square, slot, jet"], ["Finish", "Any RAL colour"]] },
  { id: "insulation", face: "duct", slot: 2.9, kind: "insulation", tr: null,
    name: "Duct & pipe insulation", short: "Stops condensation drips and keeps cold air cold.",
    specs: [["Material", "Nitrile rubber / XLPE"], ["Thickness", "9 to 25 mm"], ["Best for", "Supply ducts, copper pipes"]] },
  { id: "damper", face: "duct", slot: 4.6, kind: "damper", tr: null,
    name: "Fire & volume dampers", short: "Balance the airflow and close off a duct in a fire.",
    specs: [["Types", "Volume, fire, motorised"], ["Build", "GI with blade linkage"], ["Best for", "Every ducted system"]] },

  // ---- 03 Cold rooms
  { id: "coldroom", face: "cold", slot: -3.0, kind: "coldroom", tr: null,
    name: "Walk-in cold room", short: "PUF panel rooms built to size for food, flowers and medicine.",
    specs: [["Range", "+5 to −25 °C"], ["Panels", "80 to 150 mm PUF"], ["Best for", "Restaurants, pharma, dairy"]] },
  { id: "condensing", face: "cold", slot: 0.6, kind: "condensing", tr: null,
    name: "Condensing unit", short: "The outdoor heart of a cold room, sized to the load.",
    specs: [["Compressor", "Hermetic / scroll"], ["Refrigerant", "R404A / R449A"], ["Best for", "Cold rooms, chillers"]] },
  { id: "evaporator", face: "cold", slot: 2.6, kind: "evaporator", tr: null,
    name: "Cold room evaporator", short: "Ceiling unit inside the room that circulates the cold air.",
    specs: [["Fans", "1 to 4"], ["Defrost", "Electric or hot gas"], ["Fits", "Any cold room size"]] },
  { id: "coldctrl", face: "cold", slot: 4.5, kind: "thermo", tr: null,
    name: "Temperature controller & alarm", short: "Holds the set point and alerts you if the door is left open.",
    specs: [["Display", "Digital, °C"], ["Alarms", "High temp, door open"], ["Logging", "Optional"]] },

  // ---- Back hall: services
  { id: "survey", face: "amc", kind: "board", tr: null, title: "Free site survey", line: "We measure, calculate the heat load and recommend the system.",
    name: "Free site survey", short: "We visit, measure the space and calculate the heat load before recommending anything.",
    specs: [["Includes", "Heat-load calculation"], ["Output", "System and layout plan"], ["Cost", "Free"]] },
  { id: "amc-non", face: "amc", kind: "board", tr: null, title: "Non-comprehensive AMC", line: "Scheduled services. Parts billed when needed.",
    name: "Non-comprehensive AMC", short: "Scheduled preventive services each year; spare parts billed only when needed.",
    specs: [["Visits", "Scheduled through the year"], ["Covers", "Cleaning, gas check, tuning"], ["Parts", "Billed separately"]] },
  { id: "amc-comp", face: "amc", kind: "board", tr: null, title: "Comprehensive AMC", line: "Services and most spare parts, one yearly fee.",
    name: "Comprehensive AMC", short: "Scheduled services plus most spare parts and breakdown calls, for one yearly fee.",
    specs: [["Visits", "Scheduled + breakdowns"], ["Covers", "Labour and most parts"], ["Best for", "Offices and shops"]] }
];

export const BY_ID = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
export const FACE_BY_ID = Object.fromEntries(FACES.map(f => [f.id, f]));

// Tour: where the camera stands and what it shows. Ends at the enquiry desk.
export const TOUR = [
  { face: "split",    focus: ["split-15", "split-hc"] },
  { face: "cassette", focus: ["cassette-4", "tower"] },
  { face: "vrf",      focus: ["vrf-odu", "vrf-control"] },
  { face: "vent",     focus: ["hood", "exhaust"] },
  { face: "duct",     focus: ["grilles", "gi-duct"] },
  { face: "cold",     focus: ["coldroom"] },
  { face: "desk",     focus: [] }
];

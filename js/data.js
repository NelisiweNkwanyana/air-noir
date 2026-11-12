/* AIR NOIR — reference data: airports, aircraft categories, amenities, services, seed records.
   All operators, people and records below are fictional demo data. */
(function () {
  const A = (iata, icao, name, city, country, lat, lon) => ({ iata, icao, name, city, country, lat, lon });
  const AIRPORTS = [
    A('JNB','FAOR','O. R. Tambo International','Johannesburg','South Africa',-26.139,28.246),
    A('HLA','FALA','Lanseria International','Johannesburg','South Africa',-25.938,27.926),
    A('CPT','FACT','Cape Town International','Cape Town','South Africa',-33.969,18.597),
    A('DUR','FALE','King Shaka International','Durban','South Africa',-29.614,31.119),
    A('PLZ','FAPE','Chief Dawid Stuurman International','Gqeberha','South Africa',-33.985,25.617),
    A('MQP','FAKN','Kruger Mpumalanga International','Mbombela','South Africa',-25.383,31.106),
    A('GRJ','FAGG','George Airport','George','South Africa',-34.005,22.379),
    A('BFN','FABL','Bram Fischer International','Bloemfontein','South Africa',-29.093,26.302),
    A('WDH','FYWH','Hosea Kutako International','Windhoek','Namibia',-22.480,17.471),
    A('GBE','FBSK','Sir Seretse Khama International','Gaborone','Botswana',-24.555,25.918),
    A('MUB','FBMN','Maun Airport','Maun','Botswana',-19.973,23.431),
    A('VFA','FVFA','Victoria Falls Airport','Victoria Falls','Zimbabwe',-18.096,25.839),
    A('MPM','FQMA','Maputo International','Maputo','Mozambique',-25.921,32.573),
    A('MRU','FIMP','Sir Seewoosagur Ramgoolam International','Mauritius','Mauritius',-20.430,57.683),
    A('SEZ','FSIA','Seychelles International','Mahé','Seychelles',-4.674,55.522),
    A('ZNZ','HTZA','Abeid Amani Karume International','Zanzibar','Tanzania',-6.222,39.225),
    A('NBO','HKJK','Jomo Kenyatta International','Nairobi','Kenya',-1.319,36.928),
    A('LOS','DNMM','Murtala Muhammed International','Lagos','Nigeria',6.577,3.321),
    A('ACC','DGAA','Kotoka International','Accra','Ghana',5.605,-0.167),
    A('CAI','HECA','Cairo International','Cairo','Egypt',30.122,31.406),
    A('RAK','GMMX','Marrakesh Menara','Marrakesh','Morocco',31.607,-8.036),
    A('DXB','OMDB','Dubai International','Dubai','United Arab Emirates',25.253,55.364),
    A('DWC','OMDW','Al Maktoum International','Dubai','United Arab Emirates',24.896,55.161),
    A('DOH','OTHH','Hamad International','Doha','Qatar',25.273,51.608),
    A('RUH','OERK','King Khalid International','Riyadh','Saudi Arabia',24.958,46.699),
    A('IST','LTFM','Istanbul Airport','Istanbul','Türkiye',41.275,28.752),
    A('FAB','EGLF','Farnborough Airport','London','United Kingdom',51.276,-0.776),
    A('LTN','EGGW','London Luton','London','United Kingdom',51.875,-0.368),
    A('LBG','LFPB','Paris–Le Bourget','Paris','France',48.969,2.441),
    A('NCE','LFMN','Nice Côte d’Azur','Nice','France',43.658,7.216),
    A('GVA','LSGG','Geneva Airport','Geneva','Switzerland',46.238,6.109),
    A('ZRH','LSZH','Zurich Airport','Zurich','Switzerland',47.458,8.548),
    A('MXP','LIMC','Milan Malpensa','Milan','Italy',45.630,8.723),
    A('CIA','LIRA','Rome Ciampino','Rome','Italy',41.799,12.595),
    A('MAD','LEMD','Adolfo Suárez Madrid–Barajas','Madrid','Spain',40.472,-3.561),
    A('IBZ','LEIB','Ibiza Airport','Ibiza','Spain',38.873,1.373),
    A('ATH','LGAV','Athens International','Athens','Greece',37.936,23.947),
    A('JMK','LGMK','Mykonos Airport','Mykonos','Greece',37.435,25.348),
    A('TEB','KTEB','Teterboro Airport','New York','United States',40.850,-74.061),
    A('VNY','KVNY','Van Nuys Airport','Los Angeles','United States',34.210,-118.490),
    A('OPF','KOPF','Miami-Opa Locka Executive','Miami','United States',25.907,-80.278),
    A('ASE','KASE','Aspen/Pitkin County','Aspen','United States',39.223,-106.869),
    A('LAS','KLAS','Harry Reid International','Las Vegas','United States',36.084,-115.154),
    A('MEX','MMMX','Mexico City International','Mexico City','Mexico',19.436,-99.072),
    A('GRU','SBGR','São Paulo/Guarulhos','São Paulo','Brazil',-23.432,-46.469),
    A('SIN','WSSS','Singapore Changi','Singapore','Singapore',1.364,103.991),
    A('HKG','VHHH','Hong Kong International','Hong Kong','Hong Kong',22.308,113.918),
    A('HND','RJTT','Tokyo Haneda','Tokyo','Japan',35.549,139.780),
    A('MLE','VRMM','Velana International','Malé','Maldives',4.192,73.529),
    A('BOM','VABB','Chhatrapati Shivaji Maharaj International','Mumbai','India',19.089,72.868),
    A('SYD','YSSY','Sydney Kingsford Smith','Sydney','Australia',-33.946,151.177)
  ];

  const CATEGORIES = [
    { id: 'light', label: 'Light jet', note: 'Up to 7 guests · short regional hops' },
    { id: 'midsize', label: 'Midsize jet', note: 'Up to 9 guests · stand-up cabin' },
    { id: 'super-midsize', label: 'Super-midsize jet', note: 'Up to 10 guests · transcontinental' },
    { id: 'heavy', label: 'Heavy jet', note: 'Up to 14 guests · intercontinental' },
    { id: 'ultra-long-range', label: 'Ultra-long-range', note: 'Up to 19 guests · nonstop across oceans' }
  ];

  const AMENITIES = ['Wi-Fi', 'Full galley', 'Flat-bed seating', 'Private suite', 'Shower', 'Enclosed lavatory', 'Satellite phone', 'Entertainment system', 'Pet friendly', 'Cabin attendant'];

  const SERVICES = [
    { id: 'transfer', label: 'Airport transfer', note: 'Chauffeured sedan to and from the FBO' },
    { id: 'ground', label: 'Private ground transport', note: 'Vehicle and driver at destination' },
    { id: 'catering', label: 'Catering', note: 'Menu designed with our chefs' },
    { id: 'accommodation', label: 'Accommodation coordination', note: 'Hotel or villa reservations' },
    { id: 'assistance', label: 'Special assistance', note: 'Mobility, medical or minor escort' },
    { id: 'pet', label: 'Pet travel', note: 'Import permits, vet papers, in-cabin comfort' },
    { id: 'luggage', label: 'Additional luggage', note: 'Oversized items, sports equipment' },
    { id: 'corporate', label: 'Corporate travel', note: 'Invoicing to company, cost centres' }
  ];

  const OPERATORS = [
    { id: 'op-cape', name: 'Cape Executive Air', base: 'CPT', aoc: 'ZA-AOC-0417', verified: true, since: 2009 },
    { id: 'op-highveld', name: 'Highveld Jet Charter', base: 'HLA', aoc: 'ZA-AOC-0288', verified: true, since: 2013 },
    { id: 'op-atlas', name: 'Atlas Global Aviation', base: 'DWC', aoc: 'AE-AOC-1102', verified: true, since: 2011 }
  ];

  // Specs are representative of each type; prices are demo estimates.
  const ac = (o) => Object.assign({ status: 'verified', active: true, photos: [], docs: [], unavailable: [] }, o);
  const AIRCRAFT = [
    ac({ id: 'zs-noa', reg: 'ZS-NOA', name: 'Noir One', manufacturer: 'Gulfstream', model: 'G650ER', category: 'ultra-long-range', operator: 'op-atlas', base: 'DWC', year: 2021,
      pax: 16, rangeNm: 7500, cruiseKt: 488, cabin: { length: 14.1, width: 2.49, height: 1.92 }, luggageM3: 5.52, hourlyUSD: 11200,
      amenities: ['Wi-Fi','Full galley','Flat-bed seating','Private suite','Enclosed lavatory','Satellite phone','Entertainment system','Pet friendly','Cabin attendant'],
      blurb: 'Our flagship. Johannesburg to London, New York or Tokyo with a single stop or none at all, in a four-zone cabin finished in black leather and champagne gold.' }),
    ac({ id: 'zs-gbl', reg: 'ZS-GBL', name: 'Meridian', manufacturer: 'Bombardier', model: 'Global 7500', category: 'ultra-long-range', operator: 'op-atlas', base: 'DWC', year: 2022,
      pax: 17, rangeNm: 7700, cruiseKt: 488, cabin: { length: 16.6, width: 2.44, height: 1.88 }, luggageM3: 5.4, hourlyUSD: 12400,
      amenities: ['Wi-Fi','Full galley','Flat-bed seating','Private suite','Shower','Enclosed lavatory','Satellite phone','Entertainment system','Cabin attendant'],
      blurb: 'Four true living spaces and a permanent bedroom. The longest range in our fleet.' }),
    ac({ id: 'zs-fsx', reg: 'ZS-FSX', name: 'Sirocco', manufacturer: 'Dassault', model: 'Falcon 7X', category: 'heavy', operator: 'op-cape', base: 'CPT', year: 2018,
      pax: 14, rangeNm: 5950, cruiseKt: 459, cabin: { length: 11.9, width: 2.34, height: 1.88 }, luggageM3: 4.0, hourlyUSD: 8600,
      amenities: ['Wi-Fi','Full galley','Flat-bed seating','Enclosed lavatory','Satellite phone','Entertainment system','Pet friendly','Cabin attendant'],
      blurb: 'Three engines, steep-approach certified and remarkably quiet. Cape Town to Europe nonstop.' }),
    ac({ id: 'zs-cl6', reg: 'ZS-CL6', name: 'Karoo', manufacturer: 'Bombardier', model: 'Challenger 650', category: 'heavy', operator: 'op-highveld', base: 'HLA', year: 2017,
      pax: 12, rangeNm: 4000, cruiseKt: 459, cabin: { length: 7.8, width: 2.49, height: 1.85 }, luggageM3: 3.2, hourlyUSD: 7400,
      amenities: ['Wi-Fi','Full galley','Flat-bed seating','Enclosed lavatory','Entertainment system','Cabin attendant'],
      blurb: 'The widest cabin in its class. Ideal for Lanseria to the Gulf or West Africa.' }),
    ac({ id: 'zs-c35', reg: 'ZS-C35', name: 'Highveld', manufacturer: 'Bombardier', model: 'Challenger 350', category: 'super-midsize', operator: 'op-highveld', base: 'HLA', year: 2020,
      pax: 9, rangeNm: 3200, cruiseKt: 448, cabin: { length: 7.7, width: 2.19, height: 1.83 }, luggageM3: 3.0, hourlyUSD: 5600,
      amenities: ['Wi-Fi','Full galley','Enclosed lavatory','Entertainment system','Pet friendly'],
      blurb: 'Flat-floor cabin, quiet and quick. Johannesburg to Mauritius in under five hours.' }),
    ac({ id: 'zs-p60', reg: 'ZS-P60', name: 'Fynbos', manufacturer: 'Embraer', model: 'Praetor 600', category: 'super-midsize', operator: 'op-cape', base: 'CPT', year: 2022,
      pax: 9, rangeNm: 4018, cruiseKt: 466, cabin: { length: 8.3, width: 2.08, height: 1.83 }, luggageM3: 4.5, hourlyUSD: 5900,
      amenities: ['Wi-Fi','Full galley','Enclosed lavatory','Entertainment system','Satellite phone'],
      blurb: 'Fly-by-wire turbulence reduction and the range of a heavy jet in a super-midsize cabin.' }),
    ac({ id: 'zs-lat', reg: 'ZS-LAT', name: 'Lowveld', manufacturer: 'Cessna', model: 'Citation Latitude', category: 'midsize', operator: 'op-highveld', base: 'HLA', year: 2019,
      pax: 9, rangeNm: 2700, cruiseKt: 446, cabin: { length: 6.6, width: 1.96, height: 1.83 }, luggageM3: 3.2, hourlyUSD: 4300,
      amenities: ['Wi-Fi','Full galley','Enclosed lavatory','Pet friendly'],
      blurb: 'Stand-up cabin and a flat floor. A favourite for lodge transfers and regional business.' }),
    ac({ id: 'zs-l75', reg: 'ZS-L75', name: 'Atlantic', manufacturer: 'Learjet', model: 'Learjet 75 Liberty', category: 'midsize', operator: 'op-cape', base: 'CPT', year: 2020,
      pax: 8, rangeNm: 2080, cruiseKt: 465, cabin: { length: 5.4, width: 1.56, height: 1.50 }, luggageM3: 1.8, hourlyUSD: 3700,
      amenities: ['Wi-Fi','Enclosed lavatory','Entertainment system'],
      blurb: 'Fast and nimble. Cape Town to Johannesburg in under two hours.' }),
    ac({ id: 'zs-p3e', reg: 'ZS-P3E', name: 'Protea', manufacturer: 'Embraer', model: 'Phenom 300E', category: 'light', operator: 'op-cape', base: 'CPT', year: 2021,
      pax: 7, rangeNm: 2010, cruiseKt: 453, cabin: { length: 5.2, width: 1.55, height: 1.50 }, luggageM3: 2.2, hourlyUSD: 2900,
      amenities: ['Wi-Fi','Enclosed lavatory','Pet friendly'],
      blurb: 'The best-selling light jet for a reason: short runways, low cost, big baggage hold.' }),
    ac({ id: 'zs-cj4', reg: 'ZS-CJ4', name: 'Marula', manufacturer: 'Cessna', model: 'Citation CJ4 Gen2', category: 'light', operator: 'op-highveld', base: 'HLA', year: 2023,
      pax: 7, rangeNm: 2165, cruiseKt: 451, cabin: { length: 5.3, width: 1.48, height: 1.45 }, luggageM3: 2.3, hourlyUSD: 3100,
      amenities: ['Wi-Fi','Pet friendly'],
      blurb: 'Single-pilot certified light jet with an airy cabin. Ideal for safari airstrips with paved runways.' })
  ];

  window.AN_DATA = { AIRPORTS, CATEGORIES, AMENITIES, SERVICES, OPERATORS, AIRCRAFT };
})();

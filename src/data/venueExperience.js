export const venueImages = {
      'metlife-stadium':      'https://upload.wikimedia.org/wikipedia/commons/9/97/Metlife_stadium.jpg',
      'att-stadium':          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Arlington_June_2020_4_%28AT%26T_Stadium%29.jpg/1280px-Arlington_June_2020_4_%28AT%26T_Stadium%29.jpg',
      'sofi-stadium':         'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/SoFi_Stadium_2023.jpg/1280px-SoFi_Stadium_2023.jpg',
      'mercedes-benz-stadium':'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Mercedes_Benz_Stadium_time_lapse_capture_2017-08-13.jpg/1280px-Mercedes_Benz_Stadium_time_lapse_capture_2017-08-13.jpg',
      'nrg-stadium':          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Nrg_stadium.jpg/1280px-Nrg_stadium.jpg',
      'gillette-stadium':     'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Gillette_Stadium_%28Top_View%29.jpg/1280px-Gillette_Stadium_%28Top_View%29.jpg',
      'lincoln-financial':    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Lincoln_Financial_Field_%28Aerial_view%29.jpg/1280px-Lincoln_Financial_Field_%28Aerial_view%29.jpg',
      'levis-stadium':        'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Levi%27s_Stadium_in_February_2016_prior_to_Super_Bowl_50_%2824398261729%29.jpg/1280px-Levi%27s_Stadium_in_February_2016_prior_to_Super_Bowl_50_%2824398261729%29.jpg',
      'lumen-field':          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/2026_FIFA_World_Cup_-_Belgium_v._Egypt_in_Seattle_-_04.jpg/1280px-2026_FIFA_World_Cup_-_Belgium_v._Egypt_in_Seattle_-_04.jpg',
      'arrowhead-stadium':    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Aerial_view_of_Arrowhead_Stadium_08-31-2013.jpg/1280px-Aerial_view_of_Arrowhead_Stadium_08-31-2013.jpg',
      'hard-rock-stadium':    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Hard_Rock_Stadium_for_Super_Bowl_LIV_%2849606710103%29.jpg/1280px-Hard_Rock_Stadium_for_Super_Bowl_LIV_%2849606710103%29.jpg',
      'bmo-field':            'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Toronto_BMO_Field_in_2024.jpg/1280px-Toronto_BMO_Field_in_2024.jpg',
      'bc-place':             'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/BC_Place_2015_Women%27s_FIFA_World_Cup.jpg/1280px-BC_Place_2015_Women%27s_FIFA_World_Cup.jpg',
      'estadio-azteca':       'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Vista_a%C3%A9rea_del_Estadio_Azteca_-_2026_-_02.jpg/1280px-Vista_a%C3%A9rea_del_Estadio_Azteca_-_2026_-_02.jpg',
      'estadio-akron':        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Estadio_Akron_02-07-2022_cabecera_sur_lado_derecho_%283%29.jpg/1280px-Estadio_Akron_02-07-2022_cabecera_sur_lado_derecho_%283%29.jpg',
      'estadio-bbva':         'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Mexico_Guadalupe_Monterrey_Estadio_BBVA_Bancomer_fifa_world_cup_2026_6.JPG/1280px-Mexico_Guadalupe_Monterrey_Estadio_BBVA_Bancomer_fifa_world_cup_2026_6.JPG',
      'salt-lake-stadium':    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Yuva_Bharati_Krirangan.png/1280px-Yuva_Bharati_Krirangan.png',
      'camp-nou':             'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Camp_Nou_aerial.jpg/1280px-Camp_Nou_aerial.jpg',
      'lusail-stadium':       'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Br%C3%A9sil_vs_Serbie.jpg/1280px-Br%C3%A9sil_vs_Serbie.jpg',
      'wembley-stadium':      'https://upload.wikimedia.org/wikipedia/commons/1/16/Wembley_Stadium_interior.jpg',
    };

export const transportRoutes = {
        'metlife-stadium': [
          { icon: '🚇', name: 'NJ Transit Rail', desc: 'Secaucus Junction → MetLife Stadium Station', time: '12 min' },
          { icon: '🚌', name: 'Fan Shuttle Bus', desc: 'From Port Authority Bus Terminal every 10 min', time: '25 min' },
          { icon: '🚗', name: 'Parking Lots E/F/G', desc: 'Pre-book required · $60 matchday', time: '5 min walk' },
          { icon: '🚕', name: 'Rideshare Zone', desc: 'Designated Uber/Lyft pickup at Lot K', time: '8 min walk' },
        ],
        'att-stadium': [
          { icon: '🚇', name: 'TEXRail', desc: 'Fort Worth T&P → AT&T Stadium Station', time: '18 min' },
          { icon: '🚌', name: 'Dallas Express Shuttle', desc: 'From Downtown Dallas every 15 min', time: '30 min' },
          { icon: '🚗', name: 'Rangers Lot A/B', desc: 'Pre-book required · $50 matchday', time: '5 min walk' },
          { icon: '🚕', name: 'Rideshare Pickup', desc: 'Designated area at Lot 10', time: '6 min walk' },
        ],
        'sofi-stadium': [
          { icon: '🚇', name: 'LA Metro C Line', desc: 'Aviation/96th Station → SoFi Shuttle', time: '15 min' },
          { icon: '🚌', name: 'Inglewood Transit', desc: 'City shuttle from Downtown Inglewood', time: '10 min' },
          { icon: '🚗', name: 'SoFi Parking Structure', desc: 'Pre-book required · $80 matchday', time: '3 min walk' },
          { icon: '🚕', name: 'Rideshare Hub', desc: 'Prairie Ave & Arbor Vitae St', time: '5 min walk' },
        ],
        'mercedes-benz-stadium': [
          { icon: '🚇', name: 'MARTA Rail', desc: 'Five Points Station → GWCC/Philips Arena', time: '5 min' },
          { icon: '🚌', name: 'Atlanta Streetcar', desc: 'From Centennial Olympic Park', time: '8 min' },
          { icon: '🚗', name: 'Mercedes-Benz Parking', desc: 'Blue Lot / Yellow Lot · $40 matchday', time: '4 min walk' },
          { icon: '🚕', name: 'Rideshare Zone', desc: 'Designated pickup at Northside Dr', time: '5 min walk' },
        ],
        'nrg-stadium': [
          { icon: '🚇', name: 'METRORail Red Line', desc: 'Fannin South → NRG Park Station', time: '8 min' },
          { icon: '🚌', name: 'METRO Bus 800', desc: 'Downtown Transit Center → NRG', time: '20 min' },
          { icon: '🚗', name: 'NRG Park Lots', desc: 'Yellow/Orange/Red lots · $40 matchday', time: '5 min walk' },
          { icon: '🚕', name: 'Rideshare Pickup', desc: 'Kirby Dr & McNee Rd', time: '6 min walk' },
        ],
        'gillette-stadium': [
          { icon: '🚇', name: 'MBTA Commuter Rail', desc: 'South Station → Foxboro (special event service)', time: '50 min' },
          { icon: '🚌', name: 'Patriot Place Shuttle', desc: 'From Patriot Place parking', time: '5 min' },
          { icon: '🚗', name: 'Stadium Lots', desc: 'Lots 1-4 · $60 matchday', time: '5 min walk' },
          { icon: '🚕', name: 'Rideshare Zone', desc: 'Designated area at Lot 6', time: '7 min walk' },
        ],
        'lincoln-financial': [
          { icon: '🚇', name: 'SEPTA Broad Street Line', desc: 'NRG Station (formerly AT&T)', time: '10 min' },
          { icon: '🚌', name: 'SEPTA Bus 17/45', desc: 'From Center City to stadium district', time: '20 min' },
          { icon: '🚗', name: 'Stadium Complex Lots', desc: 'Lots K/L/M · $45 matchday', time: '5 min walk' },
          { icon: '🚕', name: 'Rideshare Pickup', desc: 'Designated area at Lot P', time: '5 min walk' },
        ],
        'levis-stadium': [
          { icon: '🚇', name: 'VTA Light Rail', desc: 'Great America Station → Stadium', time: '3 min walk' },
          { icon: '🚌', name: 'VTA Bus 55', desc: 'From Downtown San Jose', time: '25 min' },
          { icon: '🚗', name: 'Green/Red Lot', desc: 'Pre-book required · $60 matchday', time: '5 min walk' },
          { icon: '🚕', name: 'Rideshare Hub', desc: 'Tasman Dr & Great America Pkwy', time: '4 min walk' },
        ],
        'lumen-field': [
          { icon: '🚇', name: 'Link Light Rail', desc: 'Stadium Station (1 min walk)', time: '1 min' },
          { icon: '🚌', name: 'Metro Bus RapidRide', desc: 'Multiple routes to SODO district', time: '15 min' },
          { icon: '🚗', name: 'Stadium Lots / Garage', desc: 'First Ave S Garage · $50 matchday', time: '5 min walk' },
          { icon: '🚕', name: 'Rideshare Zone', desc: 'Occidental Ave S', time: '3 min walk' },
        ],
        'arrowhead-stadium': [
          { icon: '🚇', name: 'KC Streetcar (future)', desc: 'Currently bus-based transit only', time: 'N/A' },
          { icon: '🚌', name: 'KCATA Bus 47', desc: 'From Downtown KC to Truman Sports Complex', time: '30 min' },
          { icon: '🚗', name: 'Stadium Lots', desc: 'General & Reserved lots · $40 matchday', time: '5 min walk' },
          { icon: '🚕', name: 'Rideshare Pickup', desc: 'Blue Ridge Cutoff entrance', time: '7 min walk' },
        ],
        'hard-rock-stadium': [
          { icon: '🚇', name: 'Brightline Train', desc: 'Miami Central → Aventura Station + shuttle', time: '35 min' },
          { icon: '🚌', name: 'Metrobus Route 297', desc: 'From Downtown Miami', time: '45 min' },
          { icon: '🚗', name: 'Stadium Lots', desc: 'Lots 1-14 · $50 matchday', time: '5 min walk' },
          { icon: '🚕', name: 'Rideshare Hub', desc: 'Designated NW 199th St entrance', time: '5 min walk' },
        ],
        'bmo-field': [
          { icon: '🚇', name: 'TTC Streetcar 509/510', desc: 'Union Station → Exhibition Place', time: '15 min' },
          { icon: '🚌', name: 'GO Transit Lakeshore', desc: 'Exhibition GO Station', time: '5 min walk' },
          { icon: '🚗', name: 'Exhibition Place Lots', desc: 'Lots at Ontario Place · $30 matchday', time: '5 min walk' },
          { icon: '🚕', name: 'Rideshare Zone', desc: 'Lakeshore Blvd entrance', time: '4 min walk' },
        ],
        'bc-place': [
          { icon: '🚇', name: 'SkyTrain Expo Line', desc: 'Stadium–Chinatown Station', time: '2 min walk' },
          { icon: '🚌', name: 'TransLink Bus', desc: 'Multiple routes to downtown', time: '10 min' },
          { icon: '🚗', name: 'BC Place Parking', desc: 'Underground garage · $35 matchday', time: '2 min walk' },
          { icon: '🚕', name: 'Rideshare Pickup', desc: 'Pacific Blvd entrance', time: '3 min walk' },
        ],
        'estadio-azteca': [
          { icon: '🚇', name: 'Metro Line 2', desc: 'Estadio Azteca Station (direct)', time: '2 min walk' },
          { icon: '🚌', name: 'Metrobús Line 1', desc: 'From Insurgentes to Azteca', time: '25 min' },
          { icon: '🚗', name: 'Estadio Parking', desc: 'On-site lots · 200 MXN matchday', time: '5 min walk' },
          { icon: '🚕', name: 'Rideshare Zone', desc: 'Calzada de Tlalpan entrance', time: '5 min walk' },
        ],
        'estadio-akron': [
          { icon: '🚇', name: 'Mi Macro Periférico', desc: 'Estadio Akron Station', time: '3 min walk' },
          { icon: '🚌', name: 'SITEUR Light Rail', desc: 'From Centro Histórico', time: '30 min' },
          { icon: '🚗', name: 'Estadio Parking', desc: 'On-site lots · 150 MXN matchday', time: '5 min walk' },
          { icon: '🚕', name: 'Rideshare Pickup', desc: 'Av. Patria entrance', time: '4 min walk' },
        ],
        'estadio-bbva': [
          { icon: '🚇', name: 'Metrorrey Line 1', desc: 'Estadio Station', time: '5 min walk' },
          { icon: '🚌', name: 'TransMetro', desc: 'From Centro to stadium', time: '20 min' },
          { icon: '🚗', name: 'Estadio Parking', desc: 'On-site lots · 100 MXN matchday', time: '5 min walk' },
          { icon: '🚕', name: 'Rideshare Zone', desc: 'Av. Pablo Livas entrance', time: '4 min walk' },
        ],
      };

export const venueSchedule = {
        'metlife-stadium': [
          { match: 'Final', date: 'Sat, Jul 19 · 12:00 PM EDT', teams: 'TBD vs TBD' },
        ],
        'att-stadium': [
          { match: 'Semifinal 1', date: 'Tue, Jul 14 · 3:00 PM CDT', teams: 'TBD vs TBD' },
        ],
        'sofi-stadium': [
          { match: 'Semifinal 2', date: 'Wed, Jul 15 · 3:00 PM PDT', teams: 'TBD vs TBD' },
        ],
        'mercedes-benz-stadium': [
          { match: 'R16 Match 5', date: 'Tue, Jul 7 · 12:00 PM EDT', teams: 'Argentina vs Egypt' },
          { match: 'Quarterfinal 2', date: 'Fri, Jul 10 · 3:00 PM EDT', teams: 'TBD vs TBD' },
        ],
        'nrg-stadium': [
          { match: 'R16 Match 7', date: 'Wed, Jul 8 · 12:00 PM CDT', teams: 'TBD vs TBD' },
        ],
        'gillette-stadium': [
          { match: 'R16 Match 6', date: 'Tue, Jul 7 · 5:00 PM EDT', teams: 'TBD vs TBD' },
        ],
        'lincoln-financial': [
          { match: 'R16 Match 8', date: 'Wed, Jul 8 · 5:00 PM EDT', teams: 'TBD vs TBD' },
        ],
        'levis-stadium': [
          { match: 'Quarterfinal 3', date: 'Sat, Jul 11 · 12:00 PM PDT', teams: 'TBD vs TBD' },
        ],
        'lumen-field': [
          { match: 'R16 Match 4', date: 'Mon, Jul 7 · 12:00 PM PDT', teams: 'TBD vs TBD' },
        ],
        'arrowhead-stadium': [
          { match: 'Quarterfinal 1', date: 'Thu, Jul 9 · 3:00 PM CDT', teams: 'TBD vs TBD' },
        ],
        'hard-rock-stadium': [
          { match: 'Third Place Match', date: 'Sat, Jul 18 · 12:00 PM EDT', teams: 'TBD vs TBD' },
        ],
        'bmo-field': [
          { match: 'Group Stage', date: 'Completed', teams: 'Various group matches' },
        ],
        'bc-place': [
          { match: 'R16 Match 3', date: 'Tue, Jul 7 · 1:00 PM PDT', teams: 'Colombia vs Switzerland' },
        ],
        'estadio-azteca': [
          { match: 'Opening Match', date: 'Thu, Jun 11 · 12:00 PM CDT', teams: 'Mexico vs (A2)' },
          { match: 'Group Stage', date: 'Completed', teams: 'Various group matches' },
        ],
        'estadio-akron': [
          { match: 'Group Stage', date: 'Completed', teams: 'Various group matches' },
        ],
        'estadio-bbva': [
          { match: 'Group Stage', date: 'Completed', teams: 'Various group matches' },
        ],
      };

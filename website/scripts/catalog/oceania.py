from .core import source,trip,records
R='Oceania'
def s(k,c,url,title,ref,status='search-excerpt-inspected',kind='first-party-operator'):
 source(k,c,R,url,title,ref,status=status,kind=kind)
s('fiji-savusavu','Fiji','https://www.fijiresort.com/blogs/post/fishing-charters-in-fiji','Jean-Michel Cousteau Resort — Savusavu fishing charters','turn868393search8')
records('fiji-savusavu','''
Savusavu||offshore|Resort-based fishing charter|The resort describes fishing charters from Savusavu.|Decide whether the outing is a dedicated fishing charter or a mixed family excursion. Ask about target fish, fishing time and the supplied tackle before allocating suitcase space to rods.
''')
s('fiji-hidden','Fiji','https://hiddengemfiji.com/','Hidden Gem Fiji — island fishing charters','turn868393search28')
records('fiji-hidden','''
Mamanuca Islands||reef|Island-group fishing charter|Hidden Gem lists the Mamanuca Islands in its charter coverage.|Give the skipper your actual island or resort, not just Fiji. Confirm where the fishing boat collects you and whether the proposed trip is reef fishing or offshore trolling; those are different equipment decisions.
Yasawa Islands||reef|Remote-island fishing-day planning|The operator also lists the Yasawa Islands in its service area.|Agree on the transfer and fishing grounds before treating the listing as an easy day trip. A long transfer can change the useful fishing time; ask for a weather alternative that returns to your accommodation.
''')
s('fiji-taveuni','Fiji','https://www.fijibeachfrontatmakaira.com/index.php/activities/fishing-with-makaira/','Makaira Resort — Taveuni fishing','turn868393search24')
records('fiji-taveuni','''
Taveuni — Makaira||offshore|Custom island sportfishing charter|Makaira offers fishing arrangements on Taveuni.|Request the target and technique for your dates directly from the operator. Keep this island program separate from Viti Levu departures, and check transfer arrangements and tackle provision before making purchases.
''')
s('fiji-coral','Fiji','https://www.fiji.travel/things-to-do/charters/fiji-s-best-fishing-charters','Tourism Fiji — Coral Coast Fishing Charters','turn868393search32',kind='official-tourism')
records('fiji-coral','''
Coral Coast — Cuvu Beach||offshore|Choose a family or game-fishing charter|Tourism Fiji describes several trip durations and family, game-fishing and sunset options with Coral Coast Fishing Charters.|Select the fishing objective before selecting a duration. For mixed-experience groups, ask how much time is spent traveling, whether everyone can fish and what shade and seating the boat provides.
''')
s('vanuatu-santo','Vanuatu','https://www.vanuatu.travel/en/island-fishing-santo','Vanuatu Tourism — Island Fishing Santo','turn868393search13',kind='official-tourism')
records('vanuatu-santo','''
Luganville — Espiritu Santo||reef|Local guided island fishing|Vanuatu Tourism lists Island Fishing Santo in Luganville.|Keep this booking separate from Port Vila services. Confirm the proposed method, current target and departure point, then choose footwear and waterproof storage for the actual boat rather than a generic beach outing.
''')
s('vanuatu-oceanblue','Vanuatu','https://www.oceanbluefishing.com/fishing-adventures/vanuatu/join-a-scheduled-5-night-vanuatu-blue-water-sport-fishing-adventure/','Ocean Blue — Vanuatu bluewater lodge program','turn868393search33')
records('vanuatu-oceanblue','''
Trees and Fishes — Vanuatu|Marlin;Tuna;Giant trevally|offshore|Multi-day bluewater fishing program|Ocean Blue describes a Trees and Fishes program targeting marlin, tuna and giant trevally.|Choose which target drives your own tackle. Popping and offshore trolling require different outfits; ask which boats and supplied setups are allocated each day before bringing expensive duplicate equipment.
''')
s('solomons-papatura','Solomon Islands','https://www.papatura.com/fish','Papatura — reef and river fishing','turn868393search34')
records('solomons-papatura','''
Papatura — reef waters||reef|Lodge-based reef fishing|Papatura describes trolling, popping and bottom fishing around its island base.|Select a primary method with the lodge and ask which equipment is available. A popping outfit should not silently become the default for deep bottom fishing; use the lodge’s intended lure and weight specifications.
Papatura — nearby rivers|Spot-tail bass;Mangrove jack|tropicalriver|Tropical river fishing from an island lodge|Papatura identifies spot-tail bass and mangrove jack in nearby river fishing.|Confirm the actual river access and whether you remain in a boat. Keep this short-range casting kit separate from the lodge’s reef program, and organize compact tackle for changing water rather than carrying every offshore lure.
''')
s('solomons-agnes','Solomon Islands','https://www.divediscovery.com/solomons/dive-resorts/agnes-lodge.php','Dive Discovery — Agnes Lodge fishing','turn868393search10',kind='first-party-trip-seller')
records('solomons-agnes','''
Munda — Roviana Lagoon||reef|Lagoon fishing based at Agnes Lodge|The lodge program description includes sportfishing within Roviana Lagoon.|Confirm that a dedicated fishing boat and guide are available for your dates, rather than assuming a dive-lodge package includes angling. Request the current target list before selecting a rod and line system.
''')
s('tonga','Tonga','https://www.kiwimagictonga.com/','Kiwi Magic — Vava’u game fishing','turn868393search31')
records('tonga','''
Vava’u|Blue marlin|offshore|Skipper-led blue-marlin charter|Kiwi Magic offers game-fishing charters in Vava’u, including blue marlin.|Ask how the charter is configured for your experience and party size. Confirm trolling tackle, fighting equipment and the trip’s weather plan; pack personal deck items before considering any specialist rod purchase.
''')
s('samoa','Samoa','https://www.fishsamoa.com/options','Fish Samoa — fishing options','turn868393search11')
records('samoa','''
Apia|Blue marlin;Sailfish;Yellowfin tuna;Wahoo;Mahi-mahi|offshore|Select a trolling-focused charter|Fish Samoa lists offshore trolling targets and several other fishing methods from Apia.|Choose a primary objective rather than expecting every listed species on one outing. Ask the skipper which target suits the dates, how shared anglers rotate and which tackle is provided for that specific plan.
''')
s('palau','Palau','https://swingspalautours.com/','Swings Palau — fishing charters','turn642236search4')
records('palau','''
Palau — Swings trolling charter||offshore|Offshore trolling program inquiry|Swings advertises a Palau trolling charter.|Ask for the launch point and proposed offshore target before finalizing a trip. Do not apply a sightseeing route through the Rock Islands as fishing access; get a dedicated fishing itinerary and supplied-equipment list.
Palau — Swings bottom-fishing charter||reef|Guided bottom fishing and casting|The operator separately advertises bottom-fishing and casting charters.|Confirm the intended depth, hook system and tackle provision. This is a different trip type from offshore trolling even though the operator and island destination are shared; pack for the chosen boat and method.
''')
s('marshall','Marshall Islands','https://www.hotelrobertreimers.com/','Hotel Robert Reimers — Majuro and Arno fishing','turn642236search22')
records('marshall','''
Majuro|Marlin;Wahoo;Yellowfin tuna|offshore|Hotel-arranged offshore fishing|Hotel Robert Reimers describes sportfishing around Majuro and Arno, including offshore targets.|Ask which of the operator’s listed species is the actual target for your dates. Confirm the charter boat and its gear inventory before bringing an offshore outfit; a hotel stay alone does not establish fishing availability.
Arno Atoll||reef|Atoll fishing with confirmed transfer|The same operator includes Arno in its fishing offering.|Agree on an Arno-specific transfer and fishing program rather than assuming the standard Majuro departure reaches it. Keep target fish unresolved until the operator confirms whether the plan is lagoon, reef or bluewater fishing.
''')
s('pohnpei','Federated States of Micronesia','https://www.pohnpeisurfclub.com/','Pohnpei Surf Club — fishing tours','turn642236search16')
records('pohnpei','''
Pohnpei||reef|Island fishing-charter inquiry|Pohnpei Surf Club includes fishing among its island activities.|Request a fishing-specific itinerary with named grounds and a target, not a general surf or atoll tour. Check how the boat is equipped for your chosen method and what personal equipment is genuinely missing.
''')
s('yap','Federated States of Micronesia','https://mantaray.com/experiences/fishing-charters/','Manta Ray Bay — Yap fishing charters','turn642236search26')
records('yap','''
Yap||offshore|Half- or full-day equipped charter|Manta Ray Bay describes fishing charters with rods and lures supplied.|Confirm the target and boat arrangement before buying any tackle. Decide whether a shorter trip meets the group’s fishing objective, and separate the personal day bag from any specialist equipment the crew already provides.
''')
s('aitutaki','Cook Islands','https://www.pacificresort.com/','Pacific Resort — Aitutaki bonefishing','turn642236search13')
records('aitutaki','''
Aitutaki|Bonefish|flats|Guide-arranged bonefishing day|Pacific Resort identifies E2 Bonefishing among its Aitutaki activities.|Ask whether the session uses a skiff, wading or both. Match footwear to the guide’s actual plan, confirm the fly-line and leader recommendation, and avoid treating every island beach as an independent fishing location.
''')
s('niue','Niue','https://www.niueisland.com/','Niue Tourism — island fishing charters','turn941966search6',kind='official-tourism')
records('niue','''
Niue — ocean fishing charter|Yellowfin tuna;Mahi-mahi|offshore|Island-based offshore fishing inquiry|Niue Tourism describes charter fishing with yellowfin tuna and mahi-mahi among the targets.|Confirm the departure arrangement, boat capacity and weather alternative before fitting the outing into a short island stay. Ask which tackle the skipper supplies and bring only the personal items missing from that list.
''')
s('kiritimati','Kiribati','https://www.sportquestholidays.com/destinations/christmas-island-fishing/','Sportquest — Kiritimati fishing programs','turn774856view4',status='page-text-inspected',kind='first-party-trip-seller')
records('kiritimati','''
Kiritimati — saltwater flats|Bonefish;Giant trevally;Triggerfish|flats|Atoll fly-fishing program|Sportquest describes bonefish and other saltwater fly targets at Kiritimati.|This is Kiritimati in Kiribati, not Australia’s Christmas Island. Select the primary target with your guide and confirm whether the day combines skiff travel and wading; bonefish and trevally systems should not be interchangeable.
Kiritimati — offshore waters|Wahoo|offshore|Offshore extension to an atoll trip|The same destination program describes offshore fishing, including wahoo.|Treat offshore fishing as a separately confirmed boat day rather than an automatic inclusion in a flats package. Check the trolling tackle and sea-state contingency before adding heavy equipment to an inter-island baggage allowance.
''')
s('tabuaeran','Kiribati','https://www.sportquestholidays.com/destinations/fanning-island/','Sportquest — Fanning Island fishing','turn774856view5',status='page-text-inspected',kind='first-party-trip-seller')
records('tabuaeran','''
Tabuaeran — Fanning Island|Bonefish;Giant trevally|flats|Remote-atoll fly-fishing expedition|Sportquest describes bonefish and giant trevally fishing at Fanning Island.|Confirm the complete transfer chain and current program operation before fixing the rest of the journey. Get a target-specific tackle list and clarify repair supplies and baggage limits; remoteness makes unnecessary bulk costly.
''')
s('png','Papua New Guinea','https://www.sportquestholidays.com/destinations/papua-new-guinea-fishing/','Sportquest — Papua New Guinea reef fishing','turn774856view2',status='page-text-inspected',kind='first-party-trip-seller')
records('png','''
Wari Long Reef — Milne Bay|Giant trevally;Dogtooth tuna|reef|Remote popping and jigging program|Sportquest describes Wari Long Reef fishing for giant trevally and dogtooth tuna.|Ask the outfitter to specify separate popping and jigging systems, including lure weights and connections. Confirm replacement tackle availability and how rods travel; this is not a generic light-tackle tropical charter.
''')
s('australia-snowy','Australia','https://www.thetroutfitguiding.com/guided-fishing-tour-locations/lake-eucumbene-guided-fishing-trip','The Troutfit — Snowy Mountains lake fishing','turn941966search12')
records('australia-snowy','''
Lake Eucumbene|Trout|lake|Guided highland lake fishing|The Troutfit describes guided fishing on Eucumbene and Jindabyne.|Choose between boat-based fishing and a shore or fly session before selecting tackle. Ask about current launch arrangements and the water level; pack layers for a lake outing without assuming chest waders are needed.
Lake Jindabyne|Trout|lake|Lake trout fishing with a guide|The guiding operator also lists Jindabyne among its lake destinations.|Confirm the exact technique and boat provision rather than copying a river checklist. A compact personal kit may be enough if the guide supplies the fishing system; ask how the day changes when wind affects the chosen shore.
''')
s('nz-tongariro','New Zealand','https://www.newzealand.com/us/feature/central-plateau-fly-fishing/','Tourism New Zealand — Central Plateau fly fishing','turn847179search11',kind='official-tourism')
records('nz-tongariro','''
Tongariro River — lodge-based fishing|Trout|river|Central Plateau guided fly fishing|Tourism New Zealand identifies Tongariro Lodge and river-based trout fishing in the Central Plateau.|Decide whether you want casting instruction, a specific river day or a multi-day lodge program. Confirm beat choice and wading expectations, then use the guide’s fly and line advice rather than a generic New Zealand kit.
''')
s('nz-raft','New Zealand','https://www.newzealand.com/us/plan/business/tongariro-whitewater-raft-fishing/','Tourism New Zealand — Upper Tongariro raft fishing','turn847179search14',kind='official-tourism-operator-listing')
records('nz-raft','''
Upper Tongariro River — raft access||riverboat|Raft-supported fly-fishing day|The operator listing describes rafting combined with fly fishing on the Upper Tongariro.|Ask how fishing sessions alternate with rafting and how equipment is secured during rapids. The outfitter should specify footwear, buoyancy equipment and dry-storage needs; do not treat this as an ordinary independent bank outing.
''')
s('nz-taupo','New Zealand','https://www.doc.govt.nz/parks-and-recreation/places-to-go/central-north-island/places/taupo-trout-fishery/other-pages/rules-and-regulation---what-you-need-to-know/','Department of Conservation — Taupō fishing methods','turn847179search24',kind='fisheries-authority')
records('nz-taupo','''
Lake Taupō|Trout|lake|Method-specific lake fishing|New Zealand’s Department of Conservation describes trolling, jigging and fly-fishing methods within the Taupō fishery.|Choose a lake method and confirm the relevant fishing area before purchasing tackle. A boat-trolling setup and a tributary fly-fishing outfit serve different tasks; a guided first outing can establish what equipment you actually need.
''')

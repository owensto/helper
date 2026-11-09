from .core import source,trip,records
R='Asia'
def s(k,c,url,title,ref,status='search-excerpt-inspected',kind='first-party-operator'):
 source(k,c,R,url,title,ref,status=status,kind=kind)
s('nepal','Nepal','https://himalayanriverfun.com/','Himalayan River Fun — fishing expeditions','turn404634search15')
records('nepal','''
Babai River|Golden mahseer|riverboat|Guided mahseer river expedition|Himalayan River Fun offers a Babai River mahseer fishing program.|Separate fishing days from any wildlife extension. Ask how camp access, river travel and bank sessions work before selecting dry bags and footwear; the outfitter’s current tackle list should drive purchases.
Seti–Karnali river system|Golden mahseer|riverboat|Multi-day Himalayan river fishing|The operator lists Seti–Karnali mahseer fishing expeditions.|Confirm the route and actual time devoted to angling rather than assuming a rafting itinerary is a fishing trip. Pack to the boat transfer allowance and agree on rod protection before departure.
Trishuli River|Golden mahseer;Goonch catfish|riverboat|River fishing with guide-selected targets|The operator lists fishing on the Trishuli and identifies mahseer and goonch within its fishing offering.|Ask which of those targets applies to your exact reach and dates. A general operator species list is not proof of equal opportunity everywhere; decide the method before buying leaders, weights or hooks.
''')
s('haa','Bhutan','https://haatourism.com/','Haa Tourism — guided fly fishing','turn404634search13',kind='local-tourism')
records('haa','''
Haa River||river|Guided valley fly fishing|Haa Tourism identifies Divine Fly Fishing as a guide operator on the Haa River.|Arrange a specific guided beat and ask about current target fish before choosing tackle. Keep the fishing schedule compatible with travel through the valley, and use local gear if your own outfit is unsuitable.
''')
s('bhutan-valleys','Bhutan','https://www.drukasia.com/','Druk Asia — Bhutan fly-fishing regions','turn404634search20')
records('bhutan-valleys','''
Paro Valley||river|Valley-based fishing day|Druk Asia identifies Paro among Bhutan’s fly-fishing regions.|Ask for a fishing itinerary rather than a general valley tour. Confirm the river, target and guide arrangement; a warmwater expedition’s equipment list should not automatically be applied to a short highland session.
Bumthang Valley||river|Highland fishing itinerary inquiry|The tour operator names Bumthang among its fishing regions.|Use this brief to request a specific water and daily plan. Keep the target unresolved until a guide confirms it, then adapt a compact kit to the chosen fishing method and anticipated walking.
''')
s('manas','Bhutan','https://himalayanflyfishing.com/','Himalayan Flyfishing Adventures — Manas River Lodge','turn404634search23')
records('manas','''
Manas River Lodge|Golden mahseer;Chocolate mahseer|riverboat|Lodge-based mahseer fly fishing|Himalayan Flyfishing Adventures describes a mahseer-specific lodge in Royal Manas National Park.|Confirm the guided waters, target mix and transfers with the lodge. This expedition needs its own tackle specification and should not inherit the checklist for a half-day Bhutan trout outing.
''')
s('bolgoda','Sri Lanka','https://www.cctsrilanka.com/product/bolgoda-lake-full-day-fishing-tour/','CCT Sri Lanka — Bolgoda fishing','turn404634search10')
records('bolgoda','''
Bolgoda Lake||estuary|Guided casting and trolling day|The operator describes a Bolgoda boat-fishing tour using casting and trolling, with equipment supplied.|Ask which part of the lake system and target apply to your outing. Confirm the gear provision before buying a travel rod, and plan a small waterproof day kit rather than an offshore loadout.
''')
s('malaysia','Malaysia','https://sportfishin.asia/','Sport Fishing Asia — Malaysian destinations','turn404634search3')
records('malaysia','''
Kuala Rompin|Sailfish|offshore|Sailfish-focused boat charter|Sport Fishing Asia lists Kuala Rompin and sailfish among its fishing programs.|Tell the operator whether you want conventional tackle or a fly-fishing attempt. Ask how the crew rigs and presents bait and what equipment is included, then buy only the missing personal preparation items.
Royal Belum–Temenggor||lake|Rainforest reservoir and houseboat fishing|The operator describes Royal Belum fishing with a houseboat stay.|Clarify whether the price includes a dedicated fishing skiff and guide, not just the houseboat. Confirm target fish and lure requirements, and organize tackle for quick transfers between accommodation and fishing boat.
Sabah — Borneo program||tropicalriver|Borneo fishing-program selection|Sport Fishing Asia lists Sabah Borneo as a fishing destination.|This regional brief requires a specific river or sea itinerary before becoming a complete gear plan. Ask the operator to identify the water, species and daily access rather than assuming all Borneo fishing is the same.
''')
s('komodo','Indonesia','https://www.komodowisata.com/','Komodo Wisata — fishing charter program','turn353876search10')
records('komodo','''
Komodo region||reef|Guided boat fishing inquiry|Komodo Wisata advertises a fishing trip with supplied fishing equipment.|Confirm the exact fishing grounds and distinguish them from sightseeing or protected dive sites. Establish the target, method and departure port before selecting personal equipment or assuming independent access.
''')
s('bali','Indonesia','https://sailtix.com/','Sailtix — Bali and Lombok fishing charters','turn353876search3',kind='marketplace-program-description')
records('bali','''
Bali||offshore|Method-specific fishing charter selection|The charter platform describes Bali trips using trolling, jigging, popping and reef fishing.|Select one primary method rather than booking a vague all-technique trip. Ask where the boat departs, which target it proposes and whether its equipment matches that plan.
Lombok and Gili area||reef|Island fishing charter planning|The same charter platform includes Lombok and the Gili Islands in its fishing coverage.|Request a dedicated fishing offer with a named departure and proposed grounds. A scenic island cruise with occasional fishing is not equivalent to a full jigging or popping day.
''')
s('siargao','Philippines','https://www.sailfishbaysurfandfishing.com/','Sailfish Bay — Pilar fishing boats','turn353876search4')
records('siargao','''
Pilar — Siargao|Tuna|offshore|Trolling, drift or night fishing|Sailfish Bay describes boats based in Pilar and offers trolling, drift and night fishing for tuna.|Choose the actual session type before deciding on clothing and equipment. A night program needs clear return timing and deck lighting arrangements; confirm whether all tackle is supplied.
''')
s('subic','Philippines','https://fishingbooker.com/charters/view/51750','Subic Fishing and Yacht Charter — owner listing','turn353876search18',kind='first-party-listing')
records('subic','''
Subic Bay offshore||offshore|Dedicated deeper-water charter|The charter’s own listing describes offshore fishing departures from Subic Bay.|Ask whether the quoted duration includes the full outbound and return run. Confirm the proposed target and supplied tackle rather than buying a deepwater setup from the distance description alone.
''')
s('phuquoc','Vietnam','https://www.kimiphuquoc.com/deep-sea','Kimi Phu Quoc — deep-sea fishing','turn353876search25')
records('phuquoc','''
Phú Quốc offshore||offshore|Local-fisherman offshore experience|Kimi describes shared offshore fishing with sunrise or night options from Phú Quốc.|Clarify whether you want a dedicated fishing day or a cultural boat experience. Ask for the fishing hours, method, equipment and night-return arrangements before comparing it with cheaper sightseeing trips.
''')
s('singapore','Singapore','https://wadventures.com.sg/','W Adventures — Singapore fishing charter','turn353876search23')
records('singapore','''
Singapore charter waters||coast|Private fishing and onboard-cooking outing|W Adventures advertises a Singapore fishing-charter experience with onboard catch preparation.|Request the actual marina and intended waters before finalizing travel. Ask how much time is allocated to fishing versus dining and cruising, and confirm gear provision before buying equipment for a short outing.
''')
s('japan','Japan','https://www.troutandking.com/eng/','Trout & King — Japanese fishing programs','turn394072search0')
records('japan','''
Tokyo Bay|Japanese sea bass|estuary|Urban boat-based sea-bass fishing|Trout & King offers sea-bass boat fishing in Tokyo Bay.|Ask which marina and start time fit your transit plans, and choose fly or spinning in advance. Compact tackle transport is useful, but the guide may already provide a suitable outfit.
Lake Akan||lake|Hokkaido lake-fishing inquiry|Trout & King lists Lake Akan among its Japan programs.|Confirm the target species, exact season and whether the day is shore-based or afloat. Do not apply a generic Hokkaido river-char checklist to a lake outing without that information.
Takayama-area guided waters||river|Mountain-region fly-fishing day|The operator advertises guided fishing trips from Takayama.|Ask for the actual river and access plan before packing. Keep this a region-level planning brief until the guide confirms the water, fish and appropriate equipment.
''')
s('biwa','Japan','https://fishing-japan.jp/','Fishing Japan — Lake Biwa bass guides','turn394072search28')
records('biwa','''
Lake Biwa|Largemouth bass|lake|Guided bass-boat fishing|The guide service offers bass fishing on Lake Biwa with English-guided trip options.|Ask whether your chosen technique and equipment are provided. Confirm launch location and rod transport before combining the trip with rail travel; buying another bass combo is not automatically necessary.
''')
s('jeju','South Korea','https://discover-en.imweb.me/sunsetfishing','Discover Jeju — sunset boat fishing','turn394072search1')
records('jeju','''
Jeju coastal sunset trip||coast|Short evening boat-fishing experience|The operator describes a two-hour sunset fishing trip in Jeju waters.|Confirm departure port, target and supplied equipment. Keep warm and rain layers accessible for the return ride rather than assuming a short evening outing needs only beach clothing.
''')
s('uae','United Arab Emirates','https://fishinguae.com/','ABSEA — UAE charter destinations','turn394072search31')
records('uae','''
Dubai||offshore|City-marina charter fishing|ABSEA lists Dubai as one of its fishing-charter bases.|Choose a fishing-first departure rather than a general yacht rental. Ask whether the crew plans trolling, jigging or bottom fishing, and match trip length to the intended grounds.
Abu Dhabi||coast|Guided coastal boat fishing|ABSEA operates fishing charters from Abu Dhabi.|Request the actual marina and proposed fishing method before deciding on gear. Compare shade, seating and equipment inclusions as well as the headline charter duration.
Ras Al Khaimah||coast|Northern-emirate fishing charter|The operator lists Ras Al Khaimah among its charter destinations.|Confirm the boat’s departure point and intended fishing area. Do not automatically reuse a Dubai transfer plan or assume the same sea conditions and running time.
Fujairah||offshore|East-coast fishing charter|ABSEA identifies Fujairah as a fishing-charter base.|Book an east-coast departure explicitly and ask for the target and equipment list. Separate the overland transfer from the time fishing, especially when staying in another emirate.
''')
s('qatar','Qatar','https://www.discoverqatar.qa/','Discover Qatar — adventure fishing','turn321658search3')
records('qatar','''
Doha charter program||coast|Private fishing excursion|Discover Qatar advertises a private adventure-fishing excursion with Doha pickup arrangements.|Confirm the harbor, duration on the water and included tackle directly. Do not rely on the source’s broad sea label to infer the fishing grounds; ask for the actual route and target.
''')
s('jordan','Jordan','https://castawaysportfishing.com/','Castaway Sport Fishing — Aqaba','turn321658search8')
records('jordan','''
Aqaba|Tuna;Barracuda;Grouper|reef|Red Sea trolling, jigging or bottom fishing|Castaway advertises Aqaba trips using trolling, jigging and bottom fishing for these target groups.|Agree on the main method and intended fishing area rather than expecting every advertised target in one session. Ask for supplied tackle and the total trip length before purchasing specialist equipment.
''')
s('jeddah','Saudi Arabia','https://www.visitsaudi.com/','Visit Saudi — fishing in Jeddah','turn321658search12',kind='official-tourism')
records('jeddah','''
Jeddah||coast|Red Sea guided fishing inquiry|Visit Saudi describes individual and group fishing trips with Captain Mako in Jeddah.|Use the named operator as a starting point and confirm the current departure, target and method. Keep the preparation list modest until you have the actual boat and equipment inclusions.
''')
s('andamans','India','https://www.sportquestholidays.com/destinations/andaman-islands-fishing/','Sportquest — Andaman Islands','turn712144view0',status='text-inspected')
records('andamans','''
South Andaman fishing grounds|Giant trevally;Dogtooth tuna|reef|Popping and jigging expedition|The outfitter describes South Andaman boat fishing for giant trevally and dogtooth tuna.|Ask which species and technique dominate your program before carrying two heavy outfits. Confirm exact lure weights, terminal connections and transport arrangements, and do not confuse the destination with other Indian Ocean island groups.
''')
s('maldives','Maldives','https://www.sportquestholidays.com/destinations/maldives-fishing/','Sportquest — Maldives fishing programs','turn774856view0',status='text-inspected')
records('maldives','''
Kaafu Atoll||flats|Atoll flats-fishing program selection|The operator identifies Kaafu among Maldives flats-fishing areas.|Confirm which island and fishing water the guide can actually use. Ask about wading versus boat casting and footwear; do not assume a resort beach is an independent fishing location.
Baa Atoll||flats|Guide-led atoll fishing inquiry|The Maldives guide names Baa Atoll within its flats coverage.|Request a target-specific itinerary and current access arrangement. The source establishes an area, not a complete local catch calendar or a recommendation to fish every reef.
Noonu Atoll||flats|Remote-atoll fishing preparation|The operator lists Noonu as a Maldives flats-fishing area.|Clarify the transfer and boat program before selecting specialist gear. Verify whether the guide provides suitable tackle and what luggage restrictions apply to the chosen island transfer.
Laamu Atoll|Marlin;Tuna;Sailfish|offshore|Southern-atoll offshore program|The outfitter describes Laamu offshore fishing for billfish and tuna.|Keep the offshore charter distinct from a shallow-flat day. Ask about the boat’s range, heavy-tackle provision and possible weather alternatives before comparing packages.
''')
s('oman-local','Oman','https://www.aardvarkmcleod.com/destinations/','Aardvark McLeod — Oman destinations','turn702116view0',status='text-inspected')
records('oman-local','''
Hallaniyat Islands|Giant trevally|reef|Specialist giant-trevally boat fishing|The outfitter’s directory identifies Hallaniyat Island fishing as a giant-trevally program.|Confirm the exact departure base and operator-recommended casting system. Rod, reel, line and terminal hardware need to work together; a powerful rod alone does not make a complete GT outfit.
Hasik||coast|Southern Oman fishing-base inquiry|The directory lists a Hasik fishing destination in southern Oman.|Ask which target and technique the advertised program actually emphasizes. Do not automatically copy the Hallaniyat heavy-GT list simply because both trips are in Oman.
''')
s('thailand','Thailand','https://www.sportquestholidays.com/destinations/thailand-fishing/','Sportquest — Thailand fishing programs','turn774856view3',status='text-inspected')
records('thailand','''
Gillhams — Krabi|Arapaima;Mekong catfish;Siamese carp|managed|Managed multi-species fishing lake|The operator describes Gillhams as a managed Thailand fishing destination with these stocked target species.|This is a stocked fishery, not evidence that Amazon species are native to Thai rivers. Ask which tackle, bait and fish-handling assistance the venue supplies before buying an oversized freshwater outfit.
Bangkok managed-lake circuit||managed|Guided stocked-fishery itinerary|The Thailand program describes managed fishing venues including IT Lake and Predator Lake.|Request the exact venues and targets for your dates. Stocking and venue methods determine the equipment; a multi-lake package should not imply that every species appears in every pond.
''')

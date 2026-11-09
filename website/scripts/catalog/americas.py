from .core import source,trip,records,ROWS
NA='North America';SA='South America'
def sq(k,c,r,ref,path=None):
 source(k,c,r,'https://www.sportquestholidays.com/destinations/'+(path or k)+'-fishing/','Sportquest — '+c+' fishing',ref,status='text-inspected')
sq('argentina','Argentina',SA,'turn370599view0')
records('argentina','''
Rio Grande — Tierra del Fuego|Sea trout|river|Sea-run trout fly expedition|The operator identifies the Rio Grande as an Argentine sea-trout river.|Specify the lodge and beat before choosing a two-handed or single-handed outfit. Ask for wind-ready casting practice and the line system the guide expects, rather than treating all Patagonia trout fishing as interchangeable.
Rio Gallegos|Sea trout|river|Southern river sea-trout program|The outfitter lists Rio Gallegos among its sea-trout destinations.|Confirm whether the itinerary focuses on lower or upper beats and how you move between them. Plan compact fly storage, layered clothing and a backup leader system selected with the lodge.
Rio Irigoyen|Sea trout|river|Small-river sea-trout expedition|Rio Irigoyen is named in the operator’s Argentina sea-trout guide.|Ask about casting room, bank access and the recommended rod before bringing a large-river outfit. Travel-rod convenience is useful only if its line system fits this specific lodge’s fishing.
Iberá wetlands — Pirá Lodge|Golden dorado|floodplain|Wetland dorado fly fishing|The Argentina page describes golden dorado fishing in the wetlands around Pirá Lodge.|Request the skiff and channel itinerary, and clarify whether all sessions are afloat. Organize snag-resistant tackle storage and keep clothing suited to a boat day distinct from the heavier clothing for a southern Argentina extension.
Paraná River — Argentine program|Golden dorado|riverboat|Large-river dorado boat fishing|The operator identifies the Paraná as an Argentine golden-dorado destination.|A river this large requires an actual launch and lodge, not just a river name. Confirm casting method, leader material and daily boat range before selecting gear or arranging overland transfers.
''')
sq('bolivia','Bolivia',SA,'turn370599view1')
records('bolivia','''
Agua Negra River|Golden dorado|tropicalriver|Jungle dorado fly expedition|The outfitter names Agua Negra among Bolivia’s golden-dorado fly-fishing rivers.|Ask which river reaches are in the itinerary and how much walking is expected. Confirm footwear and baggage restrictions before buying a remote-travel rod tube or a large tackle bag.
Sécure River|Golden dorado|tropicalriver|Guided tropical river casting|The Bolivia guide lists the Sécure as a golden-dorado fishing river.|Separate boat travel equipment from the small kit carried during a fishing session. Have the operator review your line and bite-resistant connections rather than reusing a light freshwater leader system.
Pluma River|Golden dorado|tropicalriver|River-based jungle fly fishing|The operator includes the Pluma River in its Bolivia fly-fishing program.|Choose the lodge and daily access arrangement first. Ask whether the planned reaches favor close or longer presentations, then practice with the actual flies and line before departure.
''')
sq('chile','Chile',SA,'turn370599view3')
records('chile','''
Futaleufú River|Brown trout;Rainbow trout|glacial|Glacier-influenced trout expedition|The Chile guide describes brown and rainbow trout fishing in the glacier-fed Futaleufú system.|Ask which reaches are floated and which are bank-fished; the main river name does not establish safe wading. Keep a rain layer and protected day bag accessible during boat transfers.
''')
sq('colombia','Colombia',SA,'turn370599view4')
records('colombia','''
Tomo River|Peacock bass;Payara|tropicalriver|Colombian lowland river expedition|The operator’s Colombia guide describes peacock bass and payara in the Tomo–Orinoco river systems.|Confirm the camp, transfer route and target-specific method rather than assuming all jungle species use one setup. Ask which lures the local crew actually wants and how replacement tackle is handled.
Orinoco — Colombian program|Peacock bass;Payara|riverboat|Large-river predator fishing|The outfitter identifies an Orinoco fishing program on its Colombia destination page.|Get a precise Colombian-side departure and intended water before buying transport. Treat the regional species list as a starting point and ask the guide which target is realistic for your chosen dates.
''')
source('amazon-programs','Brazil',SA,'https://www.amazonxtremefishing.com/','Amazon Xtreme — fishing lodge directory','turn550502search19')
records('amazon-programs','''
Juruena–Teles Pires confluence| |riverboat|Confluence lodge fishing|The operator lists EcoLodge da Barra at the Juruena and Teles Pires confluence.|Confirm target species and which river reaches the lodge uses before selecting an outfit. Do not infer the fishing method from photographs of a neighboring Amazon program.
Xingu reservation program|Peacock bass|tropicalriver|Guide-led Xingu fishing expedition|The operator’s directory advertises a Xingu reservation peacock-bass program.|Use the named operator to arrange access and local guiding. Ask about the current itinerary and community arrangements, and treat the published program as a lead rather than independent access instructions.
Acari River — Pinima Lodge||tropicalriver|Remote river lodge preparation|The lodge directory connects Pinima Lodge with the Acari River.|Request the current species and lure list before buying specialist equipment. Flight weight limits, spare tackle and a small waterproof fishing bag are planning questions to resolve with the lodge.
Sucunduri River||tropicalriver|Jungle lodge fishing inquiry|Amazon Xtreme lists a Sucunduri River fishing lodge.|Clarify the target and boat plan directly rather than inheriting a Rio Negro peacock-bass checklist. Establish included equipment and charging options, then adapt your existing travel gear.
''')
source('agua-boa','Brazil',SA,'https://www.sweetwatertravel.com/our-lodges/brazil-agua-boa-amazon-lodge.html','Sweetwater Travel — Agua Boa Amazon Lodge','turn559297search17')
records('agua-boa','''
Agua Boa River|Peacock bass;Arowana;Pacu|tropicalriver|Clear-water Amazon fly fishing|Sweetwater describes fly fishing for peacock bass and other gamefish on the Agua Boa River.|Ask whether your dates favor sight fishing, blind casting or a mixture. Request exact fly sizes and line types, and test casts with that system instead of assuming a trout travel outfit will transfer.
''')
source('rewa','Guyana',SA,'https://www.rewaecolodge.com/activities','Rewa Eco-Lodge — fishing activities','turn559297search24',status='text-inspected')
records('rewa','''
Rewa arapaima waters|Arapaima|floodplain|Specialist arapaima fly expedition|Rewa offers a dedicated arapaima fly-fishing program distinct from its conventional fishing trips.|Book the specialist program explicitly and ask for its complete tackle and handling requirements. Do not substitute a peacock-bass itinerary or ordinary spinning outfit simply because both leave from the same lodge.
Rewa River lodge waters|Peacock bass;Piranha|tropicalriver|Short conventional fishing stay|The lodge describes short spin-fishing visits for peacock bass and piranha from its base.|This is a lighter commitment than the lodge’s long expedition. Confirm day-boat arrangements and supplied tackle, then pack a small set of personal items rather than buying an expedition loadout.
Corona Falls expedition|Tiger catfish;Wolf fish|tropicalriver|Extended upriver camping itinerary|Rewa describes an extended journey upriver to Corona Falls within its fishing activities.|Ask which target species apply to each planned reach; the lodge’s overall species list is not a catch promise at the falls. Camping equipment, dry storage and baggage allowance must be settled before departure.
''')
source('kabalebo','Suriname',SA,'https://kabalebo.com/packages/fishing-package/','Kabalebo Nature Hotel — fishing package','turn559297search8')
records('kabalebo','''
Kabalebo River|Redtail catfish;Wolf fish;Pacu;Peacock bass|tropicalriver|Multi-species rainforest lodge fishing|Kabalebo Nature Hotel lists these fish in its river fishing package.|Choose the primary target before packing; casting for peacock bass and targeting large catfish are different sessions. Ask which tackle is provided and whether transfers restrict hard-sided luggage.
''')
source('wonotobo','Suriname',SA,'https://www.worldsbestfishingtrips.com/surinamese-jungle','World’s Best Fishing Trips — Suriname jungle expedition','turn559297search11')
records('wonotobo','''
Wonotobo Falls|Wolf fish;Peacock bass|tropicalriver|Remote river-camp fishing|The operator describes a fishing itinerary with a stay near Wonotobo Falls and regional predator targets.|Confirm the accessible fishing reaches and whether the itinerary remains active. Pack for the actual boat and camp transfer, not merely the international flight; have the outfitter approve dry bags and spare tackle.
Amatopo||tropicalriver|Extended Suriname jungle itinerary|The same outfitter’s longer Suriname expedition includes Amatopo.|This is an expedition-planning brief, not a verified local species calendar. Request a day-by-day fishing plan and equipment list before committing to multiple remote transfers.
''')
source('galapagos','Ecuador',SA,'https://tesorogalapagos.com/','Tesoro Galapagos — fishing charters','turn550502search4')
records('galapagos','''
Galápagos — Tesoro charter|Marlin;Yellowfin tuna|offshore|Crew-equipped bluewater charter|Tesoro advertises Galápagos sport-fishing charters for marlin and yellowfin tuna.|Confirm the departure island and whether the booking is a fishing charter or a mixed wildlife tour. Ask which heavy tackle is included; personal comfort and dry storage are more useful purchases than an unapproved trolling outfit.
''')
source('peru-anglers','Peru',SA,'https://www.peruanglers.com/','Peru Anglers — Sacred Valley and Amazon programs','turn550502search5')
records('peru-anglers','''
Cusco Sacred Valley lakes|Rainbow trout|alpine|Andean lake fly-fishing day|Peru Anglers describes guided Sacred Valley outings to Andean lakes with rainbow trout.|Ask for the actual lake and travel time before comparing half-day and full-day options. Plan walking effort and weather layers around that itinerary, and use included equipment when suitable.
Cusco Sacred Valley streams|Rainbow trout|river|Mountain-stream fly-fishing day|The same operator separately includes mountain streams in its Sacred Valley trout program.|Specify a stream-focused day so the preparation list is not copied from a boat lake outing. Ask about bank access and recommended rod length before bringing an oversized travel setup.
Iquitos — Paiche/Tucunare project|Arapaima;Peacock bass|tropicalriver|Amazon fishing-program inquiry|Peru Anglers lists an Iquitos Paiche/Tucunare fishing project.|Ask whether the published project is running and what waters are actually visited. Confirm the distinction between a specialist arapaima session and peacock-bass fishing before buying line, leaders or hooks.
''')
source('apurimac','Peru',SA,'https://www.ericadventures.com/en/cusco/cusco-peru-fishing/','Eric Adventures — Apurimac trout fishing','turn550502search9')
records('apurimac','''
Apurímac River — Cusco program|Rainbow trout|river|Guided highland trout outing|Eric Adventures offers an Apurímac River rainbow-trout fishing tour from Cusco.|Request the specific upper-river reach and road-transfer plan; a whole-river label does not identify fishable access. Confirm supplied tackle and pace before combining this with a demanding sightseeing schedule.
''')
source('punta-sal','Peru',SA,'https://www.perunorth.com/fishing','Peru North — sport fishing','turn550502search23')
records('punta-sal','''
Punta Sal||offshore|Northern Peru charter preparation|Peru North describes a charter fishing boat associated with Punta Sal resort.|Contact the current operator to establish target species, method and departure availability. Keep it separate from the Andean trout portion of a Peru trip; shore-based trout gear does not solve an offshore charter’s needs.
''')
source('uruguay','Uruguay',SA,'https://www.fishingwithlarry.com/uruguay-golden-dorado.html','Fishing With Larry — Uruguay golden dorado','turn550502search6',status='text-inspected')
records('uruguay','''
Salto Grande — Uruguay side|Golden dorado|riverboat|Tailwater dorado fishing|The outfitter describes boat-based golden-dorado fishing below Salto Grande from the Uruguay side.|Confirm the exact fishing allocation and distinguish supplied conventional equipment from any fly gear you must bring. Plan around the assigned fishing sessions rather than assuming unrestricted all-day access.
''')
# North America and Central America
source('jacktrout','United States',NA,'https://www.jacktrout.com/','Jack Trout — guided river programs','turn634483search8')
records('jacktrout','''
Lower Sacramento River|Rainbow trout|riverboat|Guided tailwater trout float|Jack Trout lists Lower Sacramento guided rainbow-trout fishing.|Request the exact boat itinerary and clarify whether any wading is planned. Keep rain protection and day storage accessible, but do not buy waders solely because the trip is freshwater fly fishing.
McCloud River|Rainbow trout;Brown trout|river|Mountain-river fly fishing|The operator lists McCloud River rainbow- and brown-trout fishing.|Ask about the selected reach, walking distance and river access before choosing footwear. Carry a compact fly selection approved by the guide rather than importing a drift-boat day bag.
Hat Creek|Rainbow trout;Brown trout|spring|Spring-fed trout presentation|The guide service includes Hat Creek spring-fed trout fishing.|Ask which section and approach suit your dates; one creek name can cover different fishing experiences. Prioritize presentation practice and a manageable leader system over accumulating more fly patterns.
Fall River — California|Trout|spring|Spring-fed river fly-fishing plan|Jack Trout includes California’s Fall River among its spring-fed fishing programs.|Confirm whether the guided day is boat-based and what line system is preferred. Do not assume the access resembles a small walk-and-wade creek just because both are spring-fed.
Rogue River|Salmon;Steelhead|riverboat|Season-selected river fishing|The guide service lists Rogue River salmon and steelhead programs.|Choose one target and date range with the guide instead of assuming both are available together. Ask about current river conditions, the launch and equipment supplied for that specific program.
Smith River — California|Salmon;Steelhead|riverboat|Guided migratory-fish river outing|The operator advertises Smith River salmon and steelhead guiding.|The date and river state should determine the trip, not a fixed year-round catch claim. Confirm the actual booking window and cancellation alternatives before purchasing specialist equipment.
''')
source('belize-locations','Belize',NA,'https://www.travelbelize.org/','Belize Tourism Board — fishing locations','turn198277search4',kind='official-tourism')
records('belize-locations','''
Ambergris Caye||flats|Island-based flats planning|Belize’s tourism source names Ambergris Caye among its fishing destinations.|Ask a local guide which target is appropriate for your dates and which side of the island the day uses. Match footwear to confirmed wading, not photographs of a different Belize flat.
Turneffe Atoll||flats|Atoll lodge and skiff fishing|The tourism source identifies Turneffe Atoll as a fishing destination.|Choose a lodge and clarify skiff versus wading sessions before selecting equipment. Ask about transfer luggage and what happens to fishing time on arrival and departure days.
Placencia||flats|Southern Belize guide-base selection|Belize Tourism identifies Placencia as a fishing base.|Compare the intended fishing water rather than just hotel location. Ask how far the skiff travels, which species is the main target and whether the operator supplies compatible equipment.
Punta Gorda — Belize||flats|Guide-led southern flats itinerary|The official tourism material includes Punta Gorda among fishing destinations.|Confirm the actual guide, daily boat range and target before buying flats gear. Keep this distinct from a generic reef snorkeling excursion with a fishing stop.
''')
source('costa-pacific','Costa Rica',NA,'https://www.visitcostarica.com/things-to-do/adventure/fishing','Costa Rica Tourism — fishing','turn198277search23',kind='official-tourism')
records('costa-pacific','''
Playas del Coco||offshore|Guanacaste charter planning|Costa Rica’s tourism fishing guide lists Playas del Coco among Pacific fishing bases.|Ask the captain to name the target and trip duration before choosing a charter. Verify fuel range and tackle inclusions, and keep a shorter family outing separate from a full bluewater program.
Ocotal||coast|Coastal fishing departure planning|The official fishing guide names Ocotal as a Pacific fishing destination.|Establish whether the offer is nearshore or offshore. Your preparation list should follow the actual method and time at sea, not the beach-resort label.
Tamarindo||offshore|Pacific sport-fishing charter|The tourism source includes Tamarindo among Guanacaste fishing bases.|Request a method-specific itinerary and weather alternative, and ask which equipment is supplied. A charter-first trip usually does not require buying the same heavy gear already on the boat.
Sámara||coast|Short coastal charter comparison|Sámara appears in Costa Rica’s official fishing destination list.|Confirm the embarkation method and personal mobility requirements before booking. Choose clothing and bag storage for that launch arrangement, and ask which target the crew proposes for your dates.
Carrillo||offshore|Charter-based Pacific fishing|The official guide lists Carrillo as a fishing base.|Separate fishing hours from travel time when comparing offers. Ask about the intended offshore grounds, crew-provided tackle and conditions that would change the itinerary.
''')
source('arenal','Costa Rica',NA,'https://costarica.org/vacations/fishing/','CostaRica.org — fishing vacation programs','turn198277search19')
records('arenal','''
Lake Arenal|Rainbow bass|lake|Freshwater guapote boat fishing|The travel operator describes rainbow-bass fishing on Lake Arenal.|Ask whether the day centers on casting or trolling and what the guide supplies. Treat this as a freshwater lake trip, not an extension of the offshore tackle list; wind and boat arrangements still matter.
''')
source('los-suenos','Costa Rica',NA,'https://fishcostarica.com/','Fish Costa Rica — charter bases','turn198277search13')
records('los-suenos','''
Los Sueños|Sailfish;Marlin;Tuna|offshore|Marina-based sport-fishing charter|The operator advertises sailfish, marlin and tuna fishing from Los Sueños.|Tell the booking team which target matters most rather than expecting all three in one day. Confirm the departure marina, crew-supplied outfits and total time on the water.
''')
sq('panama','Panama',NA,'turn370599view7')
records('panama','''
Hannibal Bank|Marlin;Yellowfin tuna|offshore|Longer-range offshore fishing|The Panama guide identifies Hannibal Bank as a fishing ground within the Gulf of Chiriquí program.|Ask whether the boat and trip duration actually allow the run to the bank. Fuel, sea conditions and return time should be explicit before you compare this with a nearer island outing.
Isla Montuosa||offshore|Island-associated offshore itinerary|The operator names Isla Montuosa among its Gulf of Chiriquí fishing grounds.|Require the captain to identify the target and route; an island name does not specify the method. Clarify whether the trip is a day charter or part of a lodge package.
''')
source('gatun','Panama',NA,'https://pescaya.com/','Pescaya — Gatun Lake fishing','turn198277search10')
records('gatun','''
Gatún Lake — Gamboa|Peacock bass|lake|Canal-region freshwater casting|Pescaya advertises peacock-bass fishing around Gatún Lake and Gamboa.|Choose a dedicated fishing departure rather than assuming a canal sightseeing boat can be converted. Confirm tackle, pickup and time actually fishing, then use a compact personal day kit.
''')
source('bahamas-local','Bahamas',NA,'https://www.bahamas.com/','Bahamas Tourism — island fishing destinations','turn198277search3',kind='official-tourism')
records('bahamas-local','''
Acklins flats|Bonefish|flats|Bonefish island-trip planning|The tourism source connects Acklins and the Bight of Acklins with bonefishing.|Request the exact island base and transfer plan, then ask how much of the day involves wading. Do not choose footwear or buy multiple fly rods until that program is clear.
Crooked Island flats|Bonefish|flats|Remote flats guide selection|The Bahamas tourism material identifies Crooked Island in its bonefishing coverage.|Confirm the guide’s fishing area and travel arrangements separately from neighboring Acklins. Build a compact fly and leader kit around the operator’s requirements, with suitable spares rather than bulk duplicates.
Bimini|Blue marlin|offshore|Island-based billfish charter|The tourism source connects Bimini with offshore blue-marlin fishing.|Ask which charter is actually targeting billfish and what equipment is aboard. A short reef outing is a different product even when it leaves from the same marina.
Ragged Island|Bonefish|flats|Remote island flats preparation|The Bahamas tourism material mentions bonefishing around Ragged Island.|Confirm that a current guide and transfer arrangement exist before buying specialist travel gear. Pack to the actual transport allowance and ask which personal equipment is unavailable locally.
Chub Cay — Berry Islands||offshore|Marina-based offshore planning|The official tourism source names Chub Cay in its fishing coverage.|Establish a specific boat and target before comparing package prices. Clarify whether lodging, dock transfer and fishing equipment are included or separate.
''')
source('bahamas-flies','Bahamas',NA,'https://www.bahamasflyfishingguide.com/','Bahamas Fly Fishing Guide — destinations','turn198277search20')
records('bahamas-flies','''
Abaco|Bonefish|flats|Guide-led bonefish flats day|The operator lists Abaco in its Bahamas fly-fishing destinations.|Ask which settlement the guide departs from and whether the plan uses skiffs, wading or both. A generic Abaco hotel address is not enough to arrange the fishing pickup.
Exuma|Bonefish|flats|Island flats itinerary|The operator identifies Exuma among its fly-fishing destinations.|Specify the island and departure point before setting the itinerary. Use the guide’s advice to decide whether to pack wading boots or stay with deck footwear.
Long Island — Bahamas|Bonefish|flats|Bonefish guide and gear planning|The outfitter includes Long Island in its Bahamas fly-fishing coverage.|Confirm the guide’s operating area and preferred fly selection. Keep the shopping list small until your own rod, reel and line have been checked for suitability.
''')
sq('mexico-fly','Mexico',NA,'turn370599view6',path='mexico-fly')
records('mexico-fly','''
Ascension Bay|Bonefish;Permit;Tarpon|flats|Saltwater fly-fishing program|The operator describes Ascension Bay as a saltwater fly-fishing destination with multiple flats targets.|Choose the main species with the guide rather than promising a grand slam. Ask whether your dates emphasize smaller resident fish or another target, and adapt rod and leader requirements accordingly.
''')
source('espiritu','Mexico',NA,'https://www.aardvarkmcleod.com/destinations/','Aardvark McLeod — Beh Kay Lodge','turn702116view0',status='text-inspected')
records('espiritu','''
Espíritu Santo Bay|Permit|flats|Lodge-based permit fly fishing|The outfitter lists Beh Kay Lodge as an Espíritu Santo Bay permit program.|Keep this separate from a generic Ascension Bay package. Confirm the transfer, skiff allocation and fly system, and prioritize casting practice with the actual weighted fly over buying more untested patterns.
''')
source('guatemala','Guatemala',NA,'https://www.buenavistasportfishing.com/','Buena Vista Sportfishing — Iztapa','turn559297search3')
records('guatemala','''
Iztapa|Sailfish;Marlin;Tuna|offshore|Pacific billfish charter and lodge|Buena Vista advertises Iztapa offshore trips for sailfish, marlin and tuna.|Choose conventional or fly fishing in advance so the crew can prepare the right system. Ask which tackle and transfers are included; bringing your own heavy offshore outfit is usually a decision to discuss, not an automatic requirement.
''')
# Published research coverage, not a current travel recommendation.
sq('cuba','Cuba',NA,'turn370599view5')
for p in ['Jardines de la Reina','Cayo Largo','Cayo Romano','Zapata','Cayo Santa María']:
 trip('cuba',p,'Bonefish;Tarpon;Permit','flats','Flats program — operation needs reconfirmation',f'The operator lists {p} among Cuba’s saltwater fly-fishing areas.','The same source reports substantial transport and infrastructure disruption. Treat this as reference coverage, not an active booking offer. Confirm current operation, transfers and contingency arrangements before selecting dates or purchasing destination-specific tackle.')
 ROWS[-1]['availabilityNote']='Reference only: the operator reports infrastructure and transport disruption; no trip operation or travel suitability is confirmed.'

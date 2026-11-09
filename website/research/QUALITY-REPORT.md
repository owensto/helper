# Fishing Atlas Global Edition 003 — content and quality audit

Build date: 2026-09-13

## Delivered content

- **309 trip profiles**: 29 retained detailed guides and 280 new source-linked briefs.
- **116 countries**, plus **Cook Islands and Niue**, giving 118 country/jurisdiction collections.
- **472 static pages total**. This count includes navigation, tools and research pages; it is not a count of researched articles.
- **12 environment guides** and **6 retained preparation articles**.
- **202 source records**, of which 201 are cited in the trip/environment library.

## Research depth — important distinction

All 29 longer source-checked guides from the prior edition remain. The 280 additions are structured trip briefs, not an assertion that 280 complete local guides have been deeply vetted.

Of the new briefs, **54** are supported by inspected source page text and **226** by inspected search-result excerpts. The site discloses this on each brief and in the source register. Most profiles cite one source; **8** profiles have multiple sources. No independent local expert has reviewed this release.

**114** profiles leave the target fish unconfirmed rather than assigning a species from the country or habitat. **13** profiles have explicit documented month windows. Other pages retain qualitative discussion or state that dates still need confirmation.

The country count is not universal coverage. Missing countries remain research gaps, not evidence that fishing is absent. A profile can describe a regional or operator program; multiple trip scenarios can share an island or broader waterbody. The 309 distinct displayed place labels should not be interpreted as 309 independent waterbodies.

## Original content versus shared preparation

Each new brief includes an attributed source statement and an original local planning decision. Those original decisions total **10,419 words**. Preparation modules, seasonal-uncertainty language and requirement patterns are intentionally reusable; they are not counted as additional original local research.

The QA pass identified repeated decisions in several regional batches. Those were revised in `scripts/catalog/quality_edits.py`, and the resulting decision paragraphs pass exact-duplicate and high-similarity checks. This establishes text integrity, not factual correctness.

## Regional coverage

| Region | Trip profiles |
|---|---:|
| North America | 63 |
| South America | 31 |
| Europe | 102 |
| Africa | 34 |
| Asia | 44 |
| Oceania | 35 |

## Functionality

Country and regional collections, species browsing, water/environment/method filters, an evidence-depth filter, documented-month filtering and paginated trip results are wired into the working site. All 309 trip profiles open their own planner requirements. The three original broad planner profiles are retained in addition, so the planner contains 312 selectable entries.

Each trip has four equipment decisions. Shopping links are category-level Amazon searches, not exact-model reviews. No Associates tag is configured. Confirm-before-buying requirements do not invent a compatible product variant. No booking availability, prices, payments, escrow or operator partnership is fabricated.

## Checks actually completed

- Catalog integrity: stable unique IDs, unique titles and original decision text, valid source references, complete four-item requirement sets, related links and qualified seasons.
- Static HTML: **472 routes** passed one-H1, nonempty-description and internal-link checks.
- Planning engine: **26 tests passed**, including per-trip requirements, owned/provided gear, climate/access separation, quantities and cross-trip state isolation.
- Browser: **944 route/viewport checks** across 472 routes at 1440px and 390px, plus search, pagination, combined filters, country navigation, depth notices and planner interaction.
- No JavaScript runtime errors or horizontal overflow was observed in that browser run.

**Browser harness limitation:** direct file-origin navigation is blocked by the execution environment. Tests used an in-memory rendered document and a localStorage shim. Storage serialization and remount were tested; real hosted persistence, external retailer navigation, email, payments and production hosting were not.

## Publishing status

The standalone HTML is a browser preview, not a publicly hosted website. The source includes all rendered pages and the rebuild tools. The default configuration intentionally omits a canonical production origin and does not claim the preview is indexed. Set a real site origin to generate production canonical URLs, a sitemap and indexing directives.

## Rebuild and test

```sh
python3 scripts/compile_catalog.py
python3 scripts/build.py
python3 scripts/global_quality_audit.py
python3 tests/static_test.py
node --test tests/engine.test.cjs tests/world-engine.test.cjs
python3 tests/global_browser_test.py
```

## Country and jurisdiction register

| Collection | Profiles |
|---|---:|
| Andorra | 1 |
| Angola | 2 |
| Argentina | 6 |
| Australia | 4 |
| Austria | 5 |
| Bahamas | 9 |
| Barbados | 1 |
| Belgium | 4 |
| Belize | 6 |
| Bhutan | 4 |
| Bolivia | 3 |
| Bosnia and Herzegovina | 2 |
| Botswana | 1 |
| Brazil | 6 |
| Bulgaria | 3 |
| Cameroon | 1 |
| Canada | 6 |
| Chile | 1 |
| Colombia | 2 |
| Cook Islands | 1 |
| Costa Rica | 9 |
| Croatia | 3 |
| Cuba | 5 |
| Cyprus | 1 |
| Czechia | 3 |
| Denmark | 3 |
| Dominican Republic | 1 |
| Ecuador | 1 |
| Egypt | 1 |
| Estonia | 2 |
| Federated States of Micronesia | 2 |
| Fiji | 5 |
| Finland | 3 |
| France | 2 |
| Gabon | 2 |
| Gambia | 1 |
| Germany | 1 |
| Greece | 2 |
| Grenada | 1 |
| Guatemala | 1 |
| Guinea-Bissau | 1 |
| Guyana | 3 |
| Honduras | 1 |
| Hungary | 3 |
| Iceland | 5 |
| India | 1 |
| Indonesia | 3 |
| Ireland | 5 |
| Italy | 6 |
| Jamaica | 1 |
| Japan | 5 |
| Jordan | 1 |
| Kenya | 1 |
| Kiribati | 3 |
| Latvia | 3 |
| Lesotho | 1 |
| Lithuania | 2 |
| Luxembourg | 3 |
| Madagascar | 1 |
| Malaysia | 3 |
| Maldives | 4 |
| Malta | 1 |
| Marshall Islands | 2 |
| Mauritius | 1 |
| Mexico | 2 |
| Monaco | 2 |
| Mongolia | 1 |
| Montenegro | 3 |
| Morocco | 1 |
| Mozambique | 4 |
| Namibia | 1 |
| Nepal | 3 |
| Netherlands | 2 |
| New Zealand | 7 |
| Nicaragua | 1 |
| Niue | 1 |
| Norway | 6 |
| Oman | 2 |
| Palau | 2 |
| Panama | 3 |
| Papua New Guinea | 1 |
| Peru | 5 |
| Philippines | 2 |
| Poland | 3 |
| Portugal | 1 |
| Qatar | 1 |
| Romania | 1 |
| Saint Lucia | 1 |
| Samoa | 1 |
| Saudi Arabia | 1 |
| Senegal | 1 |
| Serbia | 2 |
| Seychelles | 1 |
| Singapore | 1 |
| Slovakia | 3 |
| Slovenia | 4 |
| Solomon Islands | 3 |
| South Africa | 1 |
| South Korea | 2 |
| Spain | 2 |
| Sri Lanka | 1 |
| Suriname | 3 |
| Sweden | 3 |
| Switzerland | 2 |
| Tanzania | 3 |
| Thailand | 2 |
| Tonga | 1 |
| Tunisia | 1 |
| Turkey | 1 |
| Uganda | 4 |
| United Arab Emirates | 4 |
| United Kingdom | 6 |
| United States | 15 |
| Uruguay | 1 |
| Vanuatu | 2 |
| Vietnam | 1 |
| Zambia | 2 |
| Zimbabwe | 2 |

## Trip register

| Country / jurisdiction | Place / program | Depth |
|---|---|---|
| Andorra | Tristaina lakes / Ordino | Brief — inspected search excerpt |
| Angola | Kwanza River mouth | Brief — inspected source text |
| Angola | Kwanza coast offshore | Brief — inspected source text |
| Argentina | Iberá wetlands — Pirá Lodge | Brief — inspected source text |
| Argentina | Northern Patagonia, Argentina | Detailed guide |
| Argentina | Paraná River — Argentine program | Brief — inspected source text |
| Argentina | Rio Gallegos | Brief — inspected source text |
| Argentina | Rio Grande — Tierra del Fuego | Brief — inspected source text |
| Argentina | Rio Irigoyen | Brief — inspected source text |
| Australia | Lake Eucumbene | Brief — inspected search excerpt |
| Australia | Lake Jindabyne | Brief — inspected search excerpt |
| Australia | Northern Territory Top End | Detailed guide |
| Australia | Yingina / Great Lake, Tasmania | Detailed guide |
| Austria | Formarinsee / Arlberg | Brief — inspected search excerpt |
| Austria | Goiserer Traun | Brief — inspected search excerpt |
| Austria | Grundlsee | Brief — inspected search excerpt |
| Austria | Lünersee / Rätikon | Brief — inspected search excerpt |
| Austria | Ybbs / Mostviertel | Brief — inspected search excerpt |
| Bahamas | Abaco | Brief — inspected search excerpt |
| Bahamas | Acklins flats | Brief — inspected search excerpt |
| Bahamas | Andros, The Bahamas | Detailed guide |
| Bahamas | Bimini | Brief — inspected search excerpt |
| Bahamas | Chub Cay — Berry Islands | Brief — inspected search excerpt |
| Bahamas | Crooked Island flats | Brief — inspected search excerpt |
| Bahamas | Exuma | Brief — inspected search excerpt |
| Bahamas | Long Island — Bahamas | Brief — inspected search excerpt |
| Bahamas | Ragged Island | Brief — inspected search excerpt |
| Barbados | Barbados — Cannon Charters | Brief — inspected search excerpt |
| Belgium | Eau d’Heure Lakes | Brief — inspected search excerpt |
| Belgium | Nisramont Lake | Brief — inspected search excerpt |
| Belgium | Ourthe Valley / RIVEO | Brief — inspected search excerpt |
| Belgium | Semois / Herbeumont | Brief — inspected search excerpt |
| Belize | Ambergris Caye | Brief — inspected search excerpt |
| Belize | Belize Barrier Reef area | Detailed guide |
| Belize | Placencia | Brief — inspected search excerpt |
| Belize | Placencia, Punta Gorda and Belize flats | Detailed guide |
| Belize | Punta Gorda — Belize | Brief — inspected search excerpt |
| Belize | Turneffe Atoll | Brief — inspected search excerpt |
| Bhutan | Bumthang Valley | Brief — inspected search excerpt |
| Bhutan | Haa River | Brief — inspected search excerpt |
| Bhutan | Manas River Lodge | Brief — inspected search excerpt |
| Bhutan | Paro Valley | Brief — inspected search excerpt |
| Bolivia | Agua Negra River | Brief — inspected source text |
| Bolivia | Pluma River | Brief — inspected source text |
| Bolivia | Sécure River | Brief — inspected source text |
| Bosnia and Herzegovina | Pliva | Brief — inspected search excerpt |
| Bosnia and Herzegovina | Ribnik | Brief — inspected search excerpt |
| Botswana | Nxamaseri — Okavango | Brief — inspected search excerpt |
| Brazil | Acari River — Pinima Lodge | Brief — inspected search excerpt |
| Brazil | Agua Boa River | Brief — inspected search excerpt |
| Brazil | Juruena–Teles Pires confluence | Brief — inspected search excerpt |
| Brazil | Rio Negro programs, Brazilian Amazon | Detailed guide |
| Brazil | Sucunduri River | Brief — inspected search excerpt |
| Brazil | Xingu reservation program | Brief — inspected search excerpt |
| Bulgaria | Arda River | Brief — inspected search excerpt |
| Bulgaria | Iugovska River | Brief — inspected search excerpt |
| Bulgaria | Kanina River | Brief — inspected search excerpt |
| Cameroon | Faro River — Gassa Camp | Brief — inspected source text |
| Canada | Campbell River — freshwater | Brief — inspected search excerpt |
| Canada | Ford Bay — Smith Arm | Brief — inspected search excerpt |
| Canada | Great Bear Lake | Brief — inspected search excerpt |
| Canada | Great Slave Lake | Brief — inspected search excerpt |
| Canada | Haida Gwaii — coastal fishing | Brief — inspected search excerpt |
| Canada | Tree River Lodge | Brief — inspected search excerpt |
| Chile | Futaleufú River | Brief — inspected source text |
| Colombia | Orinoco — Colombian program | Brief — inspected source text |
| Colombia | Tomo River | Brief — inspected source text |
| Cook Islands | Aitutaki | Brief — inspected search excerpt |
| Costa Rica | Carrillo | Brief — inspected search excerpt |
| Costa Rica | Lake Arenal | Brief — inspected search excerpt |
| Costa Rica | Los Sueños | Brief — inspected search excerpt |
| Costa Rica | Ocotal | Brief — inspected search excerpt |
| Costa Rica | Playas del Coco | Brief — inspected search excerpt |
| Costa Rica | Quepos, Central Pacific coast | Detailed guide |
| Costa Rica | Sámara | Brief — inspected search excerpt |
| Costa Rica | Tamarindo | Brief — inspected search excerpt |
| Costa Rica | Tortuguero and Barra del Colorado area | Detailed guide |
| Croatia | Gacka | Brief — inspected search excerpt |
| Croatia | Kupa / Gorski Kotar | Brief — inspected search excerpt |
| Croatia | Kupica / Gorski Kotar | Brief — inspected search excerpt |
| Cuba | Cayo Largo | Brief — inspected source text |
| Cuba | Cayo Romano | Brief — inspected source text |
| Cuba | Cayo Santa María | Brief — inspected source text |
| Cuba | Jardines de la Reina | Brief — inspected source text |
| Cuba | Zapata | Brief — inspected source text |
| Cyprus | Ayia Napa harbour | Brief — inspected search excerpt |
| Czechia | Jizera | Brief — inspected search excerpt |
| Czechia | Otava / Šumava | Brief — inspected search excerpt |
| Czechia | Vltava | Brief — inspected search excerpt |
| Denmark | Helnæs / Fyn | Brief — inspected search excerpt |
| Denmark | Little Belt | Brief — inspected search excerpt |
| Denmark | Mariager Fjord | Brief — inspected search excerpt |
| Dominican Republic | Punta Cana — Mike’s Marina | Brief — inspected search excerpt |
| Ecuador | Galápagos — Tesoro charter | Brief — inspected search excerpt |
| Egypt | Lake Nasser — Abu Simbel | Brief — inspected search excerpt |
| Estonia | Lake Peipsi / Varnja open water | Brief — inspected search excerpt |
| Estonia | Lake Peipsi / Varnja winter | Brief — inspected search excerpt |
| Federated States of Micronesia | Pohnpei | Brief — inspected search excerpt |
| Federated States of Micronesia | Yap | Brief — inspected search excerpt |
| Fiji | Coral Coast — Cuvu Beach | Brief — inspected search excerpt |
| Fiji | Mamanuca Islands | Brief — inspected search excerpt |
| Fiji | Savusavu | Brief — inspected search excerpt |
| Fiji | Taveuni — Makaira | Brief — inspected search excerpt |
| Fiji | Yasawa Islands | Brief — inspected search excerpt |
| Finland | Lake Inari | Brief — inspected search excerpt |
| Finland | Lake Iso-Virmas experience, Finland | Detailed guide |
| Finland | Lake Saimaa | Brief — inspected search excerpt |
| France | Var coast | Brief — inspected search excerpt |
| France | Île de Ré | Brief — inspected search excerpt |
| Gabon | Port Gentil | Brief — inspected search excerpt |
| Gabon | Sette Cama | Brief — inspected source text |
| Gambia | Barracuda Lodge jetty | Brief — inspected search excerpt |
| Germany | Lake Müritz | Brief — inspected search excerpt |
| Greece | Chania Bay / Crete | Brief — inspected search excerpt |
| Greece | Kissamos Bay / Crete | Brief — inspected search excerpt |
| Grenada | St. George’s Harbour | Brief — inspected search excerpt |
| Guatemala | Iztapa | Brief — inspected search excerpt |
| Guinea-Bissau | Bijagós archipelago | Brief — inspected source text |
| Guyana | Corona Falls expedition | Brief — inspected source text |
| Guyana | Rewa River lodge waters | Brief — inspected source text |
| Guyana | Rewa arapaima waters | Brief — inspected source text |
| Honduras | West End — Roatán | Brief — inspected search excerpt |
| Hungary | Lake Balaton | Brief — inspected search excerpt |
| Hungary | Paradise Lake / Hungary | Brief — inspected search excerpt |
| Hungary | Valley Lake / Hungary | Brief — inspected search excerpt |
| Iceland | Lónsá / Langanes | Brief — inspected search excerpt |
| Iceland | Mýrarkvísl | Brief — inspected search excerpt |
| Iceland | Reykjadalsá | Brief — inspected search excerpt |
| Iceland | Vatnsdalsá | Brief — inspected search excerpt |
| Iceland | West Rangá | Brief — inspected search excerpt |
| India | South Andaman fishing grounds | Brief — inspected source text |
| Indonesia | Bali | Brief — inspected search excerpt |
| Indonesia | Komodo region | Brief — inspected search excerpt |
| Indonesia | Lombok and Gili area | Brief — inspected search excerpt |
| Ireland | Lough Carra | Brief — inspected search excerpt |
| Ireland | Lough Conn | Brief — inspected search excerpt |
| Ireland | Lough Corrib | Brief — inspected search excerpt |
| Ireland | Lough Mask | Brief — inspected search excerpt |
| Ireland | River Shannon | Brief — inspected search excerpt |
| Italy | Adige / NKC reach | Brief — inspected search excerpt |
| Italy | Avisio / CK reach | Brief — inspected search excerpt |
| Italy | Chiese / Val di Fumo | Brief — inspected search excerpt |
| Italy | Sarca / Regorie | Brief — inspected search excerpt |
| Italy | Sesia / Alagna | Brief — inspected search excerpt |
| Italy | Sesia / Varallo | Brief — inspected search excerpt |
| Jamaica | Montego Bay | Brief — inspected search excerpt |
| Japan | Lake Akan | Brief — inspected search excerpt |
| Japan | Lake Biwa | Brief — inspected search excerpt |
| Japan | Northern Hokkaido | Detailed guide |
| Japan | Takayama-area guided waters | Brief — inspected search excerpt |
| Japan | Tokyo Bay | Brief — inspected search excerpt |
| Jordan | Aqaba | Brief — inspected search excerpt |
| Kenya | Malindi — Kingfisher | Brief — inspected search excerpt |
| Kiribati | Kiritimati — offshore waters | Brief — inspected source text |
| Kiribati | Kiritimati — saltwater flats | Brief — inspected source text |
| Kiribati | Tabuaeran — Fanning Island | Brief — inspected source text |
| Latvia | Lake Burtnieks | Brief — inspected search excerpt |
| Latvia | Lake Lubāns | Brief — inspected search excerpt |
| Latvia | Lake Usma | Brief — inspected search excerpt |
| Lesotho | Bokong River — Makhangoa | Brief — inspected search excerpt |
| Lithuania | Curonian Lagoon / Lithuanian side | Brief — inspected search excerpt |
| Lithuania | Lithuanian Baltic coast | Brief — inspected search excerpt |
| Luxembourg | Moselle / Wasserbillig | Brief — inspected search excerpt |
| Luxembourg | Sûre River | Brief — inspected search excerpt |
| Luxembourg | Vianden reservoir / Our | Brief — inspected search excerpt |
| Madagascar | Nosy Be | Brief — inspected source text |
| Malaysia | Kuala Rompin | Brief — inspected search excerpt |
| Malaysia | Royal Belum–Temenggor | Brief — inspected search excerpt |
| Malaysia | Sabah — Borneo program | Brief — inspected search excerpt |
| Maldives | Baa Atoll | Brief — inspected source text |
| Maldives | Kaafu Atoll | Brief — inspected source text |
| Maldives | Laamu Atoll | Brief — inspected source text |
| Maldives | Noonu Atoll | Brief — inspected source text |
| Malta | Gozo offshore | Brief — inspected search excerpt |
| Marshall Islands | Arno Atoll | Brief — inspected search excerpt |
| Marshall Islands | Majuro | Brief — inspected search excerpt |
| Mauritius | St. Brandon | Brief — inspected source text |
| Mexico | Ascension Bay | Brief — inspected source text |
| Mexico | Espíritu Santo Bay | Brief — inspected source text |
| Monaco | Monaco coastal night fishing | Brief — inspected search excerpt |
| Monaco | Monaco offshore | Brief — inspected search excerpt |
| Mongolia | Fish Mongolia river programs | Detailed guide |
| Montenegro | Biograd Lake | Brief — inspected search excerpt |
| Montenegro | Lim River | Brief — inspected search excerpt |
| Montenegro | Tara River | Brief — inspected search excerpt |
| Morocco | Bin el Ouidane | Brief — inspected search excerpt |
| Mozambique | Bazaruto archipelago | Brief — inspected source text |
| Mozambique | Inhaca Island | Brief — inspected source text |
| Mozambique | Pomene | Brief — inspected source text |
| Mozambique | Quirimbas archipelago | Brief — inspected source text |
| Namibia | Skeleton Coast | Brief — inspected source text |
| Nepal | Babai River | Brief — inspected search excerpt |
| Nepal | Seti–Karnali river system | Brief — inspected search excerpt |
| Nepal | Trishuli River | Brief — inspected search excerpt |
| Netherlands | Amsterdam canals and IJ | Brief — inspected search excerpt |
| Netherlands | Sneekermeer / Friesland | Brief — inspected search excerpt |
| New Zealand | Eglinton River, Fiordland | Detailed guide |
| New Zealand | Lake Brunner Eco Lodge | Brief — inspected search excerpt |
| New Zealand | Lake Taupō | Brief — inspected search excerpt |
| New Zealand | Mataura River, Southland | Detailed guide |
| New Zealand | Owen River Lodge | Brief — inspected search excerpt |
| New Zealand | Tongariro River — lodge-based fishing | Brief — inspected search excerpt |
| New Zealand | Upper Tongariro River — raft access | Brief — inspected search excerpt |
| Nicaragua | San Juan del Sur | Brief — inspected search excerpt |
| Niue | Niue — ocean fishing charter | Brief — inspected search excerpt |
| Norway | Gaula | Brief — inspected search excerpt |
| Norway | Namsen | Brief — inspected search excerpt |
| Norway | Northern Norway coast | Detailed guide |
| Norway | Norwegian coastal fishing camps | Detailed guide |
| Norway | Orkla | Brief — inspected search excerpt |
| Norway | Otra / Kristiansand | Brief — inspected search excerpt |
| Oman | Hallaniyat Islands | Brief — inspected source text |
| Oman | Hasik | Brief — inspected source text |
| Palau | Palau — Swings bottom-fishing charter | Brief — inspected search excerpt |
| Palau | Palau — Swings trolling charter | Brief — inspected search excerpt |
| Panama | Gatún Lake — Gamboa | Brief — inspected search excerpt |
| Panama | Hannibal Bank | Brief — inspected source text |
| Panama | Isla Montuosa | Brief — inspected source text |
| Papua New Guinea | Wari Long Reef — Milne Bay | Brief — inspected source text |
| Peru | Apurímac River — Cusco program | Brief — inspected search excerpt |
| Peru | Cusco Sacred Valley lakes | Brief — inspected search excerpt |
| Peru | Cusco Sacred Valley streams | Brief — inspected search excerpt |
| Peru | Iquitos — Paiche/Tucunare project | Brief — inspected search excerpt |
| Peru | Punta Sal | Brief — inspected search excerpt |
| Philippines | Pilar — Siargao | Brief — inspected search excerpt |
| Philippines | Subic Bay offshore | Brief — inspected search excerpt |
| Poland | Lake Mamry | Brief — inspected search excerpt |
| Poland | Lake Niegocin | Brief — inspected search excerpt |
| Poland | Lake Śniardwy | Brief — inspected search excerpt |
| Portugal | Ponta Delgada / São Miguel | Brief — inspected search excerpt |
| Qatar | Doha charter program | Brief — inspected search excerpt |
| Romania | Holbina / Danube Delta | Brief — inspected search excerpt |
| Saint Lucia | Marigot — Caribbean-side fishing | Brief — inspected search excerpt |
| Samoa | Apia | Brief — inspected search excerpt |
| Saudi Arabia | Jeddah | Brief — inspected search excerpt |
| Senegal | Saly marina | Brief — inspected search excerpt |
| Serbia | Drina / Serbian bank | Brief — inspected search excerpt |
| Serbia | Stari Slankamen / Tisa–Danube confluence | Brief — inspected search excerpt |
| Seychelles | Cosmoledo Atoll | Detailed guide |
| Singapore | Singapore charter waters | Brief — inspected search excerpt |
| Slovakia | Belá | Brief — inspected search excerpt |
| Slovakia | Poprad | Brief — inspected search excerpt |
| Slovakia | Váh | Brief — inspected search excerpt |
| Slovenia | Idrijca | Brief — inspected search excerpt |
| Slovenia | Krka | Brief — inspected search excerpt |
| Slovenia | Soča Valley | Detailed guide |
| Slovenia | Unec | Brief — inspected search excerpt |
| Solomon Islands | Munda — Roviana Lagoon | Brief — inspected search excerpt |
| Solomon Islands | Papatura — nearby rivers | Brief — inspected search excerpt |
| Solomon Islands | Papatura — reef waters | Brief — inspected search excerpt |
| South Africa | Sterkfontein Dam | Brief — inspected search excerpt |
| South Korea | Gangwon stream programs | Detailed guide |
| South Korea | Jeju coastal sunset trip | Brief — inspected search excerpt |
| Spain | Cistierna / León | Brief — inspected source text |
| Spain | River Ebro / Caspe | Brief — inspected search excerpt |
| Sri Lanka | Bolgoda Lake | Brief — inspected search excerpt |
| Suriname | Amatopo | Brief — inspected search excerpt |
| Suriname | Kabalebo River | Brief — inspected search excerpt |
| Suriname | Wonotobo Falls | Brief — inspected search excerpt |
| Sweden | High Coast | Brief — inspected search excerpt |
| Sweden | Lake Vättern | Brief — inspected search excerpt |
| Sweden | Swedish Lapland | Brief — inspected search excerpt |
| Switzerland | Lake Lungern | Brief — inspected search excerpt |
| Switzerland | Oeschinensee | Brief — inspected search excerpt |
| Tanzania | Mnyera River | Brief — inspected source text |
| Tanzania | Nyerere Dam — Shangaa Camp | Brief — inspected source text |
| Tanzania | Ruhudji River | Brief — inspected source text |
| Thailand | Bangkok managed-lake circuit | Brief — inspected source text |
| Thailand | Gillhams — Krabi | Brief — inspected source text |
| Tonga | Vava’u | Brief — inspected search excerpt |
| Tunisia | Djerba | Brief — inspected search excerpt |
| Turkey | Antalya — Mediterranean boat fishing | Brief — inspected search excerpt |
| Uganda | Bulago Island — Lake Victoria | Brief — inspected search excerpt |
| Uganda | Kalangala islands — Lake Victoria | Brief — inspected search excerpt |
| Uganda | Ngamba Island — Lake Victoria | Brief — inspected search excerpt |
| Uganda | Victoria Nile — Murchison Falls | Brief — inspected search excerpt |
| United Arab Emirates | Abu Dhabi | Brief — inspected search excerpt |
| United Arab Emirates | Dubai | Brief — inspected search excerpt |
| United Arab Emirates | Fujairah | Brief — inspected search excerpt |
| United Arab Emirates | Ras Al Khaimah | Brief — inspected search excerpt |
| United Kingdom | Barton Court / River Kennet | Brief — inspected source text |
| United Kingdom | Llyn Y Gors / Anglesey | Brief — inspected search excerpt |
| United Kingdom | River Dee | Brief — inspected search excerpt |
| United Kingdom | River Spey | Brief — inspected search excerpt |
| United Kingdom | River Tay | Brief — inspected search excerpt |
| United Kingdom | River Tweed | Brief — inspected search excerpt |
| United States | Cape Hatteras, North Carolina | Detailed guide |
| United States | Delta Clearwater River, Alaska | Detailed guide |
| United States | Fall River — California | Brief — inspected search excerpt |
| United States | Florida Keys flats and backcountry | Detailed guide |
| United States | Florida Keys offshore waters | Detailed guide |
| United States | Hat Creek | Brief — inspected search excerpt |
| United States | Lower Sacramento River | Brief — inspected search excerpt |
| United States | McCloud River | Brief — inspected search excerpt |
| United States | Rocky Mountain National Park, Colorado | Detailed guide |
| United States | Rogue River | Brief — inspected search excerpt |
| United States | Smith River — California | Brief — inspected search excerpt |
| United States | Tanana drainage, Interior Alaska | Detailed guide |
| United States | Texas coastal bays | Detailed guide |
| United States | Yakutat / Situk River | Detailed guide |
| United States | Yakutat Bay and adjacent Gulf waters | Detailed guide |
| Uruguay | Salto Grande — Uruguay side | Brief — inspected source text |
| Vanuatu | Luganville — Espiritu Santo | Brief — inspected search excerpt |
| Vanuatu | Trees and Fishes — Vanuatu | Brief — inspected search excerpt |
| Vietnam | Phú Quốc offshore | Brief — inspected search excerpt |
| Zambia | Lower Zambezi | Detailed guide |
| Zambia | Mwandi — Upper Zambezi | Brief — inspected search excerpt |
| Zimbabwe | Lake Kariba | Brief — inspected search excerpt |
| Zimbabwe | Upper Zambezi — Zimbabwe bank | Brief — inspected search excerpt |

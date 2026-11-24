// =====================================================================
// GROSSER PRODUKTKATALOG – das übliche Supermarkt-Sortiment
// ---------------------------------------------------------------------
// Pro Zeile: id | Icon | Name | Einheit (kg/l/stk) | Packung | Preis CHF (ca. Migros-Niveau) | Suchwörter | nicht (optional)
// Die Preise der einzelnen Läden sind BEISPIELWERTE, aus dem Richtpreis
// mit einem typischen Preisniveau pro Laden berechnet. Echte Aktionen
// (aktionen.json, eigene Einträge, Prospekt) werden über die Suchwörter zugeordnet.
// =====================================================================
(function () {
  const CATALOG = {
    "Gemüse": `
broccoli|🥦|Broccoli|kg|0.5|3.20|brokkoli,brocoli
blumenkohl|🥦|Blumenkohl|stk|1|3.50|karfiol
peperoni|🫑|Peperoni|kg|0.5|3.40|paprika,peperoni rot,peperoni gelb,peperoni mix
aubergine|🍆|Aubergine|kg|0.5|2.90|auberginen,melanzane
lauch|🥬|Lauch|kg|0.5|2.40|porree
fenchel|🥬|Fenchel|kg|0.5|2.80|
sellerie|🥬|Sellerie|kg|0.5|2.20|knollensellerie,stangensellerie
kohlrabi|🥬|Kohlrabi|stk|1|1.60|
weisskohl|🥬|Weisskabis|kg|1|2.60|kabis,weisskohl,rotkabis,rotkohl
rosenkohl|🥬|Rosenkohl|kg|0.5|3.90|rosenkohl
spinat|🥬|Spinat|kg|0.25|3.20|blattspinat,babyspinat
nuesslisalat|🥗|Nüsslisalat|kg|0.1|3.50|feldsalat,nüssler,nüsslisalat
rucola|🥗|Rucola|kg|0.1|2.50|rucola,rauke
salatmix|🥗|Salat-Mix|kg|0.2|3.20|salatmischung,mischsalat,schnittsalat
champignons|🍄|Champignons|kg|0.25|2.90|pilze,champignon,steinpilze,austernpilze
knoblauch|🧄|Knoblauch|kg|0.25|2.90|knoblauch
ingwer|🫚|Ingwer|kg|0.2|2.40|
kuerbis|🎃|Kürbis|kg|1|3.90|butternut,kürbis
suesskartoffeln|🍠|Süsskartoffeln|kg|1|4.50|süsskartoffel,batate
randen|🥬|Randen|kg|0.5|2.20|rote bete,randen gekocht
radieschen|🥬|Radieschen|stk|1|1.80|radiesli
spargel|🥬|Spargel|kg|0.5|7.90|
mais|🌽|Maiskolben|stk|2|2.90|maiskolben
fruehlingszwiebeln|🧅|Frühlingszwiebeln|stk|1|1.50|frühlingszwiebel,lauchzwiebeln
kraeuter|🌿|Frische Kräuter|stk|1|2.50|basilikum,petersilie,schnittlauch,koriander,kräuter,thymian,rosmarin
avocado|🥑|Avocado|stk|2|3.50|avocados
cherrytomaten|🍅|Cherrytomaten|kg|0.25|2.95|cherry tomaten,cherry-tomaten
erbsen|🫛|Erbsen tiefgekühlt|kg|0.5|2.90|erbsli,erbsen,erbsen rüebli
bohnen|🫛|Grüne Bohnen|kg|0.5|3.90|bohnen,buschbohnen,kenia bohnen`,
    "Früchte": `
orangen|🍊|Orangen|kg|2|4.50|orange,blutorangen
mandarinen|🍊|Mandarinen|kg|1|3.50|clementinen,mandarine
zitronen|🍋|Zitronen|kg|0.5|2.20|zitrone,limetten
birnen|🍐|Birnen|kg|1|3.90|birne
trauben|🍇|Trauben|kg|0.5|3.50|weintrauben,tafeltrauben
erdbeeren|🍓|Erdbeeren|kg|0.25|3.95|erdbeere
himbeeren|🫐|Himbeeren|kg|0.125|3.50|himbeere
heidelbeeren|🫐|Heidelbeeren|kg|0.125|3.20|blaubeeren,heidelbeere
kiwi|🥝|Kiwi|stk|6|3.20|kiwis
ananas|🍍|Ananas|stk|1|3.50|
mango|🥭|Mango|stk|1|2.20|mangos
melone|🍈|Melone|stk|1|3.90|wassermelone,honigmelone,charentais
pfirsiche|🍑|Pfirsiche|kg|1|4.90|nektarinen,pfirsich
kirschen|🍒|Kirschen|kg|0.5|6.90|
zwetschgen|🍑|Zwetschgen|kg|1|4.90|pflaumen
granatapfel|🍎|Granatapfel|stk|1|1.90|
datteln|🌴|Datteln|kg|0.2|3.50|
trockenfruechte|🍇|Dörrfrüchte|kg|0.2|3.90|rosinen,sultaninen,dörrfrüchte,getrocknete aprikosen`,
    "Fleisch & Wurst": `
pouletschenkel|🍗|Pouletschenkel|kg|1|12.90|pouletflügeli,poulet schenkel,chicken wings,pouletflügel
ganzespoulet|🍗|Ganzes Poulet|kg|1.2|13.90|poulet ganz,brathähnchen
truthahn|🦃|Trutenbrust|kg|0.3|9.50|truthahn,trute,trutenbrust
rindsplätzli|🥩|Rindsplätzli|kg|0.3|13.50|rindsschnitzel,rindssteak,entrecote,rindsfilet,steak
rindsragout|🥩|Rindsragout|kg|0.5|14.50|ragout,gulasch,voressen
schweinsplaetzli|🥩|Schweinsplätzli|kg|0.4|8.90|schweinsschnitzel,schweinssteak,schweinskotelett,kotelett,schweinsfilet
schweinshals|🥩|Schweinshals|kg|0.6|9.90|schweinsbraten,braten
kalbfleisch|🥩|Kalbsplätzli|kg|0.25|13.90|kalb,kalbfleisch,kalbsschnitzel,geschnetzeltes
lamm|🥩|Lammfleisch|kg|0.3|11.90|lammkoteletts,lammrack,lamm
cervelat|🌭|Cervelat|stk|2|2.20|cervelats,klöpfer
wienerli|🌭|Wienerli|kg|0.2|3.90|wiener würstchen,wiener,frankfurter
bratwurst|🌭|Bratwurst|stk|2|4.50|kalbsbratwurst,schweinsbratwurst,olma bratwurst
schinken|🥓|Hinterschinken|kg|0.15|4.50|schinken,kochschinken,beinschinken
salami|🍖|Salami|kg|0.1|3.90|salametti,chorizo
speck|🥓|Speck|kg|0.15|3.50|bacon,speckwürfeli,rohschinken,coppa
fleischkaese|🍖|Fleischkäse|kg|0.2|3.20|fleischkäse,leberkäse
aufschnitt|🍖|Aufschnitt|kg|0.15|3.90|fleischplatte,lyoner,mortadella,trockenfleisch,bündnerfleisch
hackfleischgemischt|🥩|Hackfleisch gemischt|kg|0.5|7.90|gemischtes hackfleisch,schweinshackfleisch
fleischkaese_tofu|🌱|Tofu|kg|0.25|3.20|tofu,seitan,vegi burger,fleischersatz,planted
chicken_nuggets|🍗|Chicken Nuggets|kg|0.4|6.90|nuggets,poulet nuggets,cordon bleu,schnitzel paniert`,
    "Fisch": `
thon|🐟|Thon|kg|0.155|2.20|thunfisch,thon in öl,thon im wasser
crevetten|🦐|Crevetten|kg|0.2|6.90|garnelen,shrimps,crevetten
fischstaebli|🐟|Fischstäbli|kg|0.45|6.50|fischstäbchen,fischstäbli
kabeljau|🐟|Kabeljau|kg|0.3|9.90|dorsch,pangasius,zander,egli,fischfilet,weissfisch
rauchlachs|🐟|Rauchlachs|kg|0.1|5.90|räucherlachs,geräucherter lachs
sardinen|🐟|Sardinen|kg|0.12|1.90|sardellen,makrelen`,
    "Käse": `
emmentaler|🧀|Emmentaler|kg|0.25|4.90|emmentaler,käse,hartkäse
gruyere|🧀|Gruyère|kg|0.25|5.50|greyerzer,gruyere,käse
appenzeller|🧀|Appenzeller|kg|0.2|5.20|appenzeller,käse
tilsiter|🧀|Tilsiter|kg|0.25|4.50|tilsiter,käse
raclette|🧀|Raclettekäse|kg|0.4|8.90|raclette,raclettekäse,käse
fondue|🫕|Fondue-Mischung|kg|0.8|14.90|fondue,fertigfondue,käsefondue
feta|🧀|Feta|kg|0.2|3.50|fetakäse,schafskäse,feta
frischkaese|🧀|Frischkäse|kg|0.2|2.50|philadelphia,frischkäse,cantadou
huettenkaese|🧀|Hüttenkäse|kg|0.2|1.90|cottage cheese,hüttenkäse
mascarpone|🧀|Mascarpone|kg|0.25|2.90|
ricotta|🧀|Ricotta|kg|0.25|2.70|
brie|🧀|Brie|kg|0.2|3.90|camembert,weichkäse,brie
gorgonzola|🧀|Gorgonzola|kg|0.15|3.50|blauschimmel
schmelzkaese|🧀|Schmelzkäse|kg|0.2|2.90|scheibenkäse,toastkäse,käsescheiben
halloumi|🧀|Halloumi|kg|0.2|4.50|grillkäse,halloumi
quark|🥣|Quark|kg|0.5|2.20|magerquark,rahmquark,speisequark
burrata|🧀|Burrata|kg|0.125|3.90|`,
    "Milchprodukte & Eier": `
rahm|🥛|Vollrahm|l|0.5|4.20|rahm,schlagrahm,halbrahm,kochrahm,sahne
saurer_halbrahm|🥛|Saurer Halbrahm|l|0.18|1.60|sauerrahm,crème fraîche,creme fraiche,saurer halbrahm
kaffeerahm|🥛|Kaffeerahm|l|0.5|2.20|kafirahm,kaffeerahm,portionen
milchdrink|🥛|Milch Drink / Halbfett|l|1|1.65|milchdrink,halbfettmilch,magermilch
laktosefrei|🥛|Laktosefreie Milch|l|1|1.95|lactosefrei,laktosefrei
hafermilch|🌾|Haferdrink|l|1|2.30|hafermilch,haferdrink,mandelmilch,sojamilch,oat,pflanzendrink
milchdrink_choco|🥛|Schoggimilch|l|1|2.40|schokomilch,schoggidrink,kakao drink,ice tea milch
griechjoghurt|🥣|Griechischer Joghurt|kg|0.5|3.50|griechisch,skyr,naturjoghurt
pudding|🍮|Pudding / Creme|kg|0.5|2.50|caramelköpfli,flan,creme,dessert,tiramisu
kefir|🥛|Kefir|l|0.5|1.90|kefir,ayran,buttermilch
margarine|🧈|Margarine|kg|0.25|2.50|margarine,streichfett`,
    "Brot & Backwaren": `
zopf|🍞|Zopf|kg|0.5|3.90|butterzopf,züpfe,sonntagszopf
gipfeli|🥐|Gipfeli|stk|4|3.20|croissant,gipfel,buttergipfeli
broetli|🥖|Brötli|stk|6|3.20|semmeln,brötchen,weggli,bürli,brötli
baguette|🥖|Baguette|stk|1|1.90|pariserbrot,baguette
vollkorntoast|🍞|Sandwichbrot|kg|0.5|2.90|sandwichbrot,vollkorntoast
knaeckebrot|🍘|Knäckebrot|kg|0.25|2.20|knäckebrot,darvida,cracker
wraps|🫓|Tortilla Wraps|stk|6|2.90|wraps,tortillas,fladenbrot,pita
blätterteig|🥧|Blätterteig|kg|0.32|2.20|kuchenteig,pizzateig,mürbeteig,teig
kuchen|🍰|Kuchen|stk|1|5.90|cake,torte,cakes,linzertorte,cookies
zwieback|🍞|Zwieback|kg|0.25|2.50|`,
    "Vorrat": `
basmatireis|🍚|Basmatireis|kg|1|3.90|basmati
risotto|🍚|Risottoreis|kg|1|3.20|arborio,carnaroli,risotto
couscous|🍚|Couscous|kg|0.5|2.20|bulgur,quinoa
linsen|🫘|Linsen|kg|0.5|2.50|linsen,kichererbsen,bohnen getrocknet
kidneybohnen|🫘|Kidneybohnen Dose|kg|0.4|1.20|kidney,bohnen dose,kichererbsen dose
mais_dose|🌽|Mais Dose|kg|0.285|1.50|maiskörner,mais dose
haferflocken|🥣|Haferflocken|kg|0.5|1.50|porridge,flocken
muesli|🥣|Müesli|kg|0.75|4.50|birchermüesli,knuspermüesli,granola,müsli
cornflakes|🥣|Cornflakes|kg|0.5|3.50|frühstücksflocken,cerealien,cereals,crunchy
konfituere|🍓|Konfitüre|kg|0.5|3.20|marmelade,konfi,gelée,fruchtaufstrich,confiture
honig|🍯|Honig|kg|0.5|6.90|blütenhonig,waldhonig
nutella|🍫|Nuss-Nougat-Creme|kg|0.4|3.95|nutella,brotaufstrich,schoggicreme
erdnussbutter|🥜|Erdnussbutter|kg|0.35|3.50|peanut butter
ovomaltine|🥤|Ovomaltine|kg|0.5|7.90|ovo,kakao,kakaopulver,schokopulver,caotina
tee|🍵|Tee|stk|20|2.50|schwarztee,grüntee,kräutertee,pfefferminztee,teebeutel,früchtetee
kaffeekapseln|☕|Kaffeekapseln|stk|10|3.90|kapseln,nespresso,delizio,kaffee kapseln
kaffee_gemahlen|☕|Kaffee gemahlen|kg|0.5|6.90|gemahlener kaffee,filterkaffee,instantkaffee,nescafe
rapsoel|🫗|Rapsöl|l|1|4.50|sonnenblumenöl,speiseöl,bratöl,öl
essig|🫗|Essig|l|0.5|2.20|balsamico,apfelessig,weissweinessig
salz|🧂|Salz|kg|1|1.20|speisesalz,meersalz,jodsalz
pfeffer|🧂|Pfeffer|kg|0.05|2.50|gewürz,gewürze,paprikapulver,curry,zimt,oregano|crispy,chips,sfoglie,cracker,snack
bouillon|🥣|Bouillon|kg|0.25|3.90|gemüsebouillon,fleischbouillon,brühe,suppenwürze,aromat
suppe|🥣|Suppe|stk|1|2.20|beutelsuppe,suppen,instant suppe,nudelsuppe
tomatensauce|🍝|Tomatensauce|kg|0.4|2.50|pastasauce,sugo,pesto,bolognese,arrabbiata
ketchup|🍅|Ketchup|kg|0.5|2.50|tomatenketchup
mayonnaise|🥚|Mayonnaise|kg|0.265|2.50|mayo,remoulade
senf|🌭|Senf|kg|0.2|1.80|
sojasauce|🫗|Sojasauce|l|0.25|2.90|sojasosse,teriyaki,sweet chili,currysauce
salatsauce|🥗|Salatsauce|l|0.45|3.50|dressing,french dressing,italian dressing
konserven_gemuese|🥫|Gemüsekonserven|kg|0.4|1.90|erbsen dose,ravioli,konserve,dose
ravioli|🥫|Ravioli Dose|kg|0.87|3.50|ravioli
backpulver|🧁|Backpulver|stk|5|1.90|hefe,vanillezucker,backpulver
puderzucker|🍬|Puderzucker|kg|0.5|1.90|rohrzucker,gelierzucker
schokostuecke|🍫|Backschokolade|kg|0.2|2.90|kuvertüre,schokostreusel,couverture
nuesse|🥜|Nüsse|kg|0.2|3.90|baumnüsse,haselnüsse,mandeln,cashew,cashewkerne,pistazien,nussmischung,studentenfutter
gnocchi|🍝|Gnocchi|kg|0.5|2.90|spätzli,knöpfli
frischpasta|🍝|Frische Teigwaren|kg|0.25|3.50|tortelloni,tortellini,ravioli frisch,lasagne,cannelloni
asianudeln|🍜|Asia-Nudeln|kg|0.25|2.50|reisnudeln,mie nudeln,ramen,glasnudeln
kartoffelstock|🥔|Kartoffelstock Pulver|kg|0.25|2.90|stocki,kartoffelstock,rösti,rösti beutel`,
    "Tiefkühl": `
pizza|🍕|Tiefkühlpizza|stk|1|4.50|pizza,pizza margherita,flammkuchen
pommes|🍟|Pommes frites|kg|1|4.20|pommes frites,frites,kroketten,potato wedges
glace|🍦|Glace|l|1|5.90|eis,eiscreme,glacé,cornet,magnum
tk_gemuese|🥦|Tiefkühlgemüse|kg|0.75|3.50|gemüse tiefgekühlt,wokgemüse,tk gemüse
tk_beeren|🫐|Tiefkühlbeeren|kg|0.5|4.50|beerenmischung,tiefgekühlte beeren
fertiggericht|🍱|Fertiggericht|stk|1|5.50|fertigmenü,lasagne fertig,mikrowelle,menü
fruehlingsrollen|🥟|Frühlingsrollen|kg|0.4|4.90|dumplings,samosa,teigtaschen`,
    "Süsses & Snacks": `
guetzli|🍪|Guetzli|kg|0.25|2.90|kekse,biskuits,cookies,petit beurre,mailänderli,chocolat biscuits
pralinen|🍫|Pralinen|kg|0.2|9.90|pralinés,schoggi pralinen,truffes
gummibaerli|🍬|Gummibärli|kg|0.2|2.20|gummibärchen,haribo,fruchtgummi,süssigkeiten
riegel|🍫|Schokoriegel|stk|5|3.50|riegel,mars,snickers,twix,kitkat,branches
salzstangen|🥨|Salzstangen|kg|0.2|2.20|pretzels,brezeli,apero,salzbrezeln
erdnuesse|🥜|Erdnüsse|kg|0.2|2.50|apéro nüsse,gesalzene nüsse
popcorn|🍿|Popcorn|kg|0.1|1.90|
darkschokolade|🍫|Dunkle Schokolade|kg|0.1|1.90|zartbitter,dunkle schoggi,crémant,noir
kaugummi|🍬|Kaugummi|stk|1|2.20|chewing gum,bonbons,ricola
nachos|🌮|Nachos|kg|0.2|2.50|tortilla chips,nachos,salsa
lebkuchen|🍪|Lebkuchen|kg|0.3|3.90|grittibänz,weihnachtsguetzli,chräbeli,spitzbuben
pommes_chips|🥔|Paprika Chips|kg|0.175|2.95|zweifel,paprika chips`,
    "Getränke": `
mineral_still|💧|Mineralwasser ohne Kohlensäure|l|6|4.20|stilles wasser,ohne kohlensäure,still
cola|🥤|Cola|l|1.5|1.95|coca cola,coke,cola zero,pepsi
eistee|🥤|Eistee|l|1.5|1.60|ice tea,icetea,lipton,eistee
limonade|🥤|Limonade|l|1.5|1.80|rivella,fanta,sprite,citro,süssgetränk,shorley
apfelsaft|🧃|Apfelsaft|l|1|1.80|süssmost,apfelschorle,most,multivitamin,fruchtsaft,traubensaft
sirup|🧃|Sirup|l|1|3.90|holundersirup,himbeersirup,sirup
energy|🥤|Energy Drink|l|0.25|1.50|red bull,energy,monster
kaffee_drink|☕|Eiskaffee|l|0.23|1.95|ice coffee,eiskaffee,emmi caffè latte`,
    "Alkohol": `
bier|🍺|Bier|l|3|9.90|lager,feldschlösschen,quöllfrisch,bier dose,flaschenbier,alkoholfreies bier
rotwein|🍷|Rotwein|l|0.75|8.90|wein,merlot,primitivo,rioja,pinot noir,bordeaux
weisswein|🥂|Weisswein|l|0.75|8.90|chasselas,fendant,sauvignon,chardonnay
prosecco|🍾|Prosecco|l|0.75|7.90|champagner,schaumwein,sekt,cava,crémant
rose|🍷|Rosé|l|0.75|7.90|roséwein
spirituosen|🥃|Spirituosen|l|0.7|19.90|wodka,vodka,gin,whisky,rum,schnaps,likör,aperol`,
    "Haushalt & Putzen": `
haushaltpapier|🧻|Haushaltpapier|stk|4|5.50|küchenpapier,küchenrolle,haushaltpapier
taschentuecher|🤧|Taschentücher|stk|30|3.50|nastücher,tempo,kosmetiktücher
waschmittel|🧺|Waschmittel|l|2|12.90|waschpulver,flüssigwaschmittel,colorwaschmittel,persil,ariel
weichspueler|🧺|Weichspüler|l|1.5|4.50|
geschirrtabs|🍽️|Geschirrspültabs|stk|40|9.90|tabs,geschirrspüler,maschinenspülmittel,finish,klarspüler
allzweckreiniger|🧽|Allzweckreiniger|l|1|3.50|putzmittel,reiniger,badreiniger,küchenreiniger,glasreiniger,entkalker
wc_reiniger|🚽|WC-Reiniger|l|0.75|2.90|wc ente,toilettenreiniger,javel,wc frisch,wc-reiniger,wc reiniger
schwaemme|🧽|Schwämme|stk|5|2.50|putzschwamm,schwamm,putzlappen,mikrofasertuch
abfallsaecke|🗑️|Abfallsäcke|stk|10|4.90|kehrichtsäcke,müllsäcke,gebührensäcke
alufolie|🔲|Alufolie|stk|1|3.20|frischhaltefolie,backpapier,klarsichtfolie
gefrierbeutel|🛍️|Gefrierbeutel|stk|50|2.90|zipbeutel,sandwichbeutel,frischhaltebeutel
batterien|🔋|Batterien|stk|4|5.90|aa,aaa,batterie
kerzen|🕯️|Kerzen|stk|10|4.90|teelichter,teelicht,kerze
gluehbirne|💡|LED-Lampe|stk|1|5.90|glühbirne,leuchtmittel,led
zuendhoelzer|🔥|Zündhölzer|stk|10|1.50|feuerzeug,anzündwürfel
servietten|🧻|Servietten|stk|50|2.50|papierservietten
kaffeefilter|☕|Kaffeefilter|stk|80|2.20|filtertüten
pfannen|🍳|Pfanne|stk|1|19.90|bratpfanne,kochtopf,topf,pfanne
kuechenhelfer|🥄|Küchenhelfer|stk|1|4.90|kochlöffel,schöpfkelle,schneidebrett,messer,schwingbesen,kelle
geschirrtuch|🧺|Geschirrtuch|stk|2|5.90|küchentuch,abtrocknungstuch
grill|🔥|Grillkohle|kg|3|8.90|holzkohle,grillanzünder,briketts`,
    "Hygiene & Körperpflege": `
zahnpasta|🪥|Zahnpasta|stk|1|2.90|zahncreme,colgate,elmex,zahnpasta
zahnbuerste|🪥|Zahnbürste|stk|2|3.50|zahnbürsten,zahnseide,mundspülung
duschgel|🧴|Duschgel|l|0.25|2.50|dusch,duschmittel,flüssigseife,seife
shampoo|🧴|Shampoo|l|0.3|3.90|haarshampoo,spülung,conditioner,haarspülung
deo|🧴|Deo|stk|1|3.50|deodorant,deospray,deoroller
bodylotion|🧴|Bodylotion|l|0.4|5.90|körperlotion,handcreme,gesichtscreme,nivea,creme
rasierer|🪒|Rasierer|stk|4|6.90|rasierklingen,einwegrasierer,rasierschaum
damenhygiene|🩸|Binden & Tampons|stk|20|3.90|tampons,binden,slipeinlagen
wattestaebchen|☁️|Wattestäbchen|stk|200|1.90|wattepads,watte
pflaster|🩹|Pflaster|stk|20|3.50|heftpflaster,verband
sonnencreme|🧴|Sonnencreme|l|0.2|12.90|sonnenschutz,sonnenmilch
haarstyling|💇|Haargel|stk|1|4.50|haarspray,haarwachs,styling
feuchttuecher|🧻|Feuchttücher|stk|60|2.90|feuchtes wc papier,abschminktücher`,
    "Baby & Tier": `
windeln|👶|Windeln|stk|40|14.90|pampers,babywindeln,windel
babynahrung|🍼|Babynahrung|kg|0.19|1.90|babybrei,folgemilch,quetschie,hipp
katzenfutter|🐱|Katzenfutter|kg|0.4|1.90|katzennahrung,whiskas,felix,trockenfutter katze
hundefutter|🐶|Hundefutter|kg|1|4.90|hundenahrung,pedigree,hundesnacks
katzenstreu|🐱|Katzenstreu|l|10|6.90|katzensand`,
  };

  // typisches Preisniveau pro Laden (Beispiel) + kleine, feste Abweichung pro Produkt
  const LEVEL = { migros: 1.0, coop: 1.05, denner: 0.94, lidl: 0.84, aldi: 0.83, spar: 1.1, volg: 1.14 };
  const hash = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const round = (v, s) => (s === "lidl" || s === "aldi") ? Math.max(0.29, Math.ceil(v * 10) / 10 - 0.01) : Math.max(0.3, Math.round(v * 20) / 20);
  // Bisherige Produkte genauer einordnen
  const RECAT = { tomaten: "Gemüse", zucchetti: "Gemüse", gurke: "Gemüse", kartoffeln: "Gemüse", zwiebeln: "Gemüse", rueebli: "Gemüse", salat: "Gemüse",
    aepfel: "Früchte", bananen: "Früchte", pouletbrust: "Fleisch & Wurst", hackfleisch: "Fleisch & Wurst", lachs: "Fisch",
    mozzarella: "Käse", reibkaese: "Käse", eier: "Milchprodukte & Eier", milch: "Milchprodukte & Eier", butter: "Milchprodukte & Eier", joghurt: "Milchprodukte & Eier",
    brot: "Brot & Backwaren", toast: "Brot & Backwaren", wasser: "Getränke", orangensaft: "Getränke", wcpapier: "Haushalt & Putzen", spuelmittel: "Haushalt & Putzen" };
  for (const p of PRODUCTS) if (RECAT[p.id]) p.cat = RECAT[p.id];
  const have = new Set(PRODUCTS.map(p => p.id));
  for (const [cat, block] of Object.entries(CATALOG)) {
    for (const line of block.trim().split("\n")) {
      const [id, icon, label, unit, size, price, syn = "", not = ""] = line.split("|").map(s => s.trim());
      if (!id || have.has(id)) continue; have.add(id);
      const syns = syn ? syn.split(",").map(s => s.trim()).filter(Boolean) : [];
      const offers = Object.keys(LEVEL).map(s => {
        const j = ((hash(id + s) % 1000) / 1000 - 0.5) * 0.12; // ±6 %
        return [s, label, +size, round(+price * LEVEL[s] * (1 + j), s), null];
      });
      PRODUCTS.push({ id, icon, label, cat, unit, syn: syns, offers, gen: true });
      // für echte Aktionen: Name und Suchwörter als Schlüssel (ganze Wörter), "käse" allein ist zu allgemein
      const keys = [label, ...syns].map(k => k.toLowerCase()).filter(k => !["käse", "öl", "dose", "teig", "creme", "menü", "eis", "wein", "bohnen", "still", "energy", "riegel", "kapseln", "pizza"].includes(k) || k === label.toLowerCase());
      window.LIVE_KEYS[id] = { keys, not: not ? not.split(",") : [] };
    }
  }
  // Wörter, bei denen eine Aktion NICHT zur ganzen Kategorie passt (z.B. "Fruchtaufstrich Erdbeeren" ist keine Erdbeere)
  const fresh = ["fruchtaufstrich", "konfitüre", "schokoliert", "schokolierte", "saft", "sirup", "glace", "joghurt", "jogurt", "chips", "tee", "duschgel", "shampoo", "duft", "aroma"];
  window.CAT_NOT = { "Früchte": fresh, "Gemüse": fresh, "*": ["hundesnack", "katzensnack", "hundefutter", "katzenfutter", "hunde", "katzen", "hund", "katze"] };
  // Kategorien + Suchwörter für die Kategorie-Suche (z.B. "Gemüse" zeigt alles Gemüse)
  window.CATEGORIES = {
    "Gemüse": ["gemüse", "gemuese", "salat"], "Früchte": ["früchte", "obst", "frucht", "beeren"],
    "Fleisch & Wurst": ["fleisch", "wurst", "würste", "metzgerei", "grill", "grillieren"], "Fisch": ["fisch", "meeresfrüchte", "seafood"],
    "Käse": ["käse", "kaese", "chäs"], "Milchprodukte & Eier": ["milchprodukte", "milch", "molkerei", "eier", "rahm"],
    "Brot & Backwaren": ["brot", "backwaren", "bäckerei", "gebäck"], "Vorrat": ["vorrat", "grundnahrungsmittel", "konserven", "saucen", "gewürze", "backen", "frühstück", "teigwaren"],
    "Tiefkühl": ["tiefkühl", "tiefgekühlt", "tk", "gefroren"], "Süsses & Snacks": ["süsses", "süssigkeiten", "snacks", "schoggi", "apero", "apéro", "naschen"],
    "Getränke": ["getränke", "trinken", "drinks", "saft", "softdrinks"], "Alkohol": ["alkohol", "wein", "bier", "spirituosen"],
    "Haushalt & Putzen": ["haushalt", "putzen", "putzmittel", "reinigung", "küche", "kochen", "küchenbedarf", "haushaltsartikel"],
    "Hygiene & Körperpflege": ["hygiene", "körperpflege", "drogerie", "kosmetik", "pflege", "bad"],
    "Baby & Tier": ["baby", "tier", "tierfutter", "haustier", "katze", "hund"],
  };
  for (const p of PRODUCTS) if (!CATEGORIES[p.cat]) p.cat = { "Gemüse & Früchte": "Gemüse", "Milch & Eier": "Milchprodukte & Eier", "Brot": "Brot & Backwaren", "Haushalt": "Haushalt & Putzen" }[p.cat] || p.cat;
})();

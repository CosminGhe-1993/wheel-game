# Wheel Game — Flux Multiplayer

## Arhitectura
- Laptop: ecran shared (roata, propozitie, scoruri, animatii, mesaje publice)
- Telefoane: fiecare jucator vede mereu mana proprie de carti + actiunile relevante turei sale
- Comunicare real-time: SignalR (ASP.NET Core)
- Starea jocului: pe server (nu in frontend ca inainte)
- Backend: .NET 8 + SignalR Hub

## Conexiuni
- `display` — laptopul, doar afiseaza, fara rol de jucator
- `player` — fiecare telefon, trimite actiuni, primeste update-uri

## SETUP
1. Un jucator deschide aplicatia pe laptop → seteaza nr. jucatori + nr. runde → apare QR
2. Toti jucatorii (inclusiv cel care a setat) scaneaza QR de pe telefon
3. Fiecare isi introduce numele pe telefon
4. Cand toti s-au conectat si si-au pus numele → jocul porneste automat

## FAZA ZARURILOR (la inceputul fiecarei runde)
1. Laptop: ecran zaruri + clasament in dreapta care se construieste progresiv
   - Clasament: Nume | Zar 1 | Zar 2 | Suma | (dublu marcat)
2. Pe rand, fiecare jucator apasa "Arunca" de pe telefonul lui
3. Laptop animeaza zarurile + adauga randul in clasament
4. Telefoanele celorlalti: dezactivate, se uita pe laptop
5. Daca egalitate → jucatorii la egalitate re-arunca (laptop arata clar cine)
6. Ordinea finala stabilita → jocul incepe

## TURA UNUI JUCATOR
1. Laptop evidentiaza jucatorul curent
2. Telefonul jucatorului curent: tastatura A-Z activa
3. Telefoanele celorlalti: totul dezactivat (vad mana proprie, restul pe laptop)

### Ghicit litera
- **Corecta** → laptop dezvaluie literele + adauga puncte → apare "Invarte" pe telefonul curent
- **Gresita** → laptop arata gresala → tura trece la urmatorul jucator

### Spin
1. Jucatorul apasa "Invarte" pe telefon
2. Laptop animeaza roata — multe rotatii, easing (incetineste treptat la final)
3. Roata se opreste → cardul apare in mana jucatorului (pe telefonul lui, privat)
4. Pe telefon apar: "Joaca cartea" + "Ghiceste o litera"

### Alege:
- **"Ghiceste o litera"** → tastatura reapare, jucatorul continua sa ghiceasca (tura nu se termina)
- **"Joaca cartea"** → picker cu mana proprie pe telefon → alege o carte → efect aplicat → tura se termina

## EFECTELE CARTILOR PE TELEFON vs LAPTOP

### Cu selectie jucator tinta (Fura puncte, Bloc, Anuleaza, Transfer, Magnet, Spioneaza):
- Picker pe telefonul jucatorului curent
- Laptop arata mesaj public dupa selectie

### Fara selectie (Dublu, Inversare, Arunca, Dictator, Protectie):
- Info popup pe telefon
- Mesaj public pe laptop

### Exceptie — Spioneaza:
- Mana tintei apare PRIVAT pe telefonul spionului
- Laptopul nu arata continutul, doar "X il sppioneaza pe Y"

## SFARSITUL TUREI
- Litera gresita SAU carte jucata → urmatorul jucator

## SFARSITUL RUNDEI
- Toate literele dezvaluite → +5 jucatorului care a completat → noua faza de zaruri

## SFARSITUL JOCULUI
- Dupa toate rundele → ecran final pe laptop cu clasamentul

## REGULI TELEFON
- Mereu vizibil: mana proprie de carti (read-only cand nu e tura ta)
- Cand e tura ta: toate butoanele active
- Cand NU e tura ta: totul dezactivat, niciun buton de actiune

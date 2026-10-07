# Wheel Game - Rules & Tech Stack

## Tech Stack
- Frontend: JavaScript (ES Modules)
- Backend: .NET 8 Minimal API cu Controllers
- AI: Groq API (llama-3.3-70b-versatile)
- Starea jocului: in frontend (JS)
- Backend: genereaza doar propozitia

## Setup
- 2-6 participanti (extensibil pe viitor)
- Toti pornesc cu 5 carti random in mana
- Se alege numarul de runde la inceput
- AI genereaza o propozitie random, cu sens, fara diacritice, 40-80 caractere
- Literele mascate cu `_`, spatiile vizibile
- La inceputul fiecarei runde fiecare participant da cu zarul → se stabileste ordinea de ghicit

## Gameplay (loop)
1. Participantul curent ghiceste o litera din A-Z (afisate jos, cele deja ghicite inactive)
2. **Gresit** → trece la urmatorul participant
3. **Corect** → toate aparitiile literei se dezvaluie simultan → puncte = nr aparitii → invarte roata → vede cartea (doar el)
   - **Joaca cartea** → trece la urmatorul participant
   - **Continua** → ghiceste iar (revine la pasul 1)

## Roata
- Pozitiile sunt random la fiecare invaritire — aceeasi pozitie poate da carti diferite
- Cartea obtinuta o vede doar participantul curent
- Poate fi jucata imediat sau pastrata in mana

## Sfarsit runda
- Runda se termina cand toate literele sunt dezvaluite
- Se trece la runda urmatoare

## Sfarsit joc
- Dupa numarul de runde ales → castigator = cel cu cele mai multe puncte

## Carti de actiune (14)
1. **Fura puncte** — la urmatorul tau tur, pentru fiecare litera ghicita scazi 1 punct de la jucatorul ales
2. **Dublu** — la urmatorul tau tur, fiecare litera ghicita valoreaza 2 puncte
3. **Bloc** — alegi un participant care este sarit la urmatorul sau tur
4. **Anuleaza** — anulezi o carte de actiune activa de pe tine sau de pe alt jucator
5. **Dezvaluie** — vezi toate cartile de actiune active ale celorlalti jucatori (in mod normal nu se vad)
6. **Super anulare** — alegi: fie stergi cate o carte activa de la fiecare jucator, fie stergi toate cartile active de pe tine
7. **Inversare** — cartile active de pe tine se muta pe jucatorul care ti le-a pus
8. **Transfer** — muti o carte activa de pe tine pe un alt jucator ales
9. **Protectie** — anulezi o carte activa de pe tine, tu alegi care. Poate fi jucata ca reactie la Dictator
10. **Arunca** — toti jucatorii pierd toate cartile din mana (nefolosite)
11. **Spioneaza** — vezi cartile din mana unui jucator ales
12. **Dictator** — tura decurge normal dar fiecare jucator ghiceste doar o litera si toate punctele obtinute in acea tura merg la tine. Contraatac: un jucator poate juca Protectie pentru a anula Dictator de pe el
13. **Radar** — afli ce carte va primi urmatorul jucator cand invarte roata
14. **Magnet** — furi toate cartile din mana unui jucator ales
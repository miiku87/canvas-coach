# Canvas Coach – testikäytön ohje askel askeleelta

Tällä ohjeella saat Canvas Coachin kokeiluun omalle koneellesi. Teknistä osaamista ei tarvita, eikä yhtään komentoa tarvitse kirjoittaa itse. Käyttöönotto vie noin 30 minuuttia.

Testikäytössä Coach toimii näin:

- **Omalla koneellasi** pyörii pieni ohjelma ("Coach-palvelin"), joka keskustelee tekoälyn kanssa.
- **Chrome-selaimeesi** asennetaan laajennus, joka lisää Canvasiin Coach-painikkeen.
- Coach näkyy vain sinulle, eikä muuta Canvasia mitenkään. Kun suljet ohjelman, Coach lakkaa toimimasta.

---

## Ennen kuin aloitat: tarkistuslista

- [ ] **Tietokone** (Windows tai Mac), jossa on **Google Chrome** tai **Microsoft Edge**.
- [ ] **Testikurssi Canvasissa, jolla olet opettajana.** Älä käytä kurssia, jolla on oikeita opiskelijoita. Jos sinulla ei ole testikurssia, pyydä oppilaitoksesi Canvas-tuelta "sandbox"- eli harjoituskurssi. Lisää kurssille muutama tehtävä ja sivu, jos se on tyhjä.
- [ ] **Maksukortti** tekoälypalvelun käyttöön (ks. vaihe 1). Testaaminen maksaa yleensä muutamia euroja.
- [ ] **Oikeus asentaa ohjelmia koneelle.** Jos kone on työnantajan hallinnoima ja asennus estetään, pyydä apua IT-tuelta.

---

## Vaihe 1: Hanki API-avain (tekoälyn käyttöavain)

API-avain on salasanan kaltainen tunnus, jolla Coach saa käyttää Clauden tekoälyä. Käyttö laskutetaan avaimen tililtä.

> Huom: Claude Pro- tai Team-tilaus **ei** sisällä API-käyttöä. API-käytöllä on oma, erillinen saldonsa.

1. Mene osoitteeseen **https://platform.claude.com** ja luo tili (tai kirjaudu sisään).
2. Lisää tilille saldoa kohdassa **Billing**. Pienin summa (esim. 5 $) riittää testaamiseen hyvin.
3. Avaa kohta **API keys** ja paina **Create key**. Anna avaimelle nimi, esim. `canvas-coach-testi`.
4. **Kopioi avain** ja liitä se hetkeksi talteen, esim. muistioon. Avain alkaa `sk-ant-` ja näytetään vain kerran.

✅ *Onnistui, kun:* sinulla on tallessa pitkä tunnus, joka alkaa `sk-ant-`.

🔒 *Pidä avain salassa.* Kuka tahansa avaimen haltija voi käyttää saldoasi. Älä lähetä avainta sähköpostilla tai viestimellä.

💶 *Kustannusarvio:* yksi sivun tarkistus maksaa arviolta 5–10 senttiä, ja jatkokysymys on samaa luokkaa. 5 dollarin saldolla tekee siis kymmeniä tarkistuksia. Voit seurata kulutusta Consolen kohdasta **Usage**.

---

## Vaihe 2: Asenna Node.js

Node.js on ilmainen ohjelma, jonka varassa Coach-palvelin toimii. Se asennetaan kerran.

1. Mene osoitteeseen **https://nodejs.org**.
2. Lataa vihreästä painikkeesta **LTS**-versio. Sivusto tunnistaa yleensä käyttöjärjestelmäsi itse.
3. Avaa ladattu tiedosto ja hyväksy asennusohjelman oletusvalinnat (**Next / Jatka** loppuun asti).

✅ *Onnistui, kun:* asennusohjelma ilmoittaa asennuksen valmistuneen.

---

## Vaihe 3: Lataa Canvas Coach koneellesi

1. Lataa Coach tästä linkistä (kirjaudu GitHubiin, jos sitä pyydetään):
   **https://github.com/miiku87/canvas-coach/archive/refs/heads/claude/canvas-ui-addon-pk6a8q.zip**
2. **Pura ZIP-tiedosto.**
   - **Windows:** napsauta ladattua tiedostoa hiiren oikealla ja valitse **Pura kaikki…** → **Pura**.
   - **Mac:** tuplaklikkaa ladattua tiedostoa.
3. Purkamisesta syntyy kansio, jolla on pitkä nimi (`canvas-coach-claude-canvas-ui-addon-…`). **Nimeä se uudelleen** muotoon `canvas-coach` ja **siirrä se Tiedostot-/Dokumentit-kansioon**. Kansiota ei pidä siirtää enää myöhemmin, koska selainlaajennus luetaan sieltä.

✅ *Onnistui, kun:* Dokumentit-kansiossa on kansio `canvas-coach`, ja sen sisällä on mm. tiedostot `Asenna` ja `Kaynnista`.

> **Windows:** varmista, että käytät purettua kansiota etkä ZIP-tiedoston sisältöä. ZIP-tiedoston sisältä ajettuna asennus ei toimi.

---

## Vaihe 4: Aja asennus

1. Avaa `canvas-coach`-kansio ja **tuplaklikkaa tiedostoa**:
   - **Windows:** `Asenna.bat` (voi näkyä pelkkänä nimenä `Asenna`)
   - **Mac:** `Asenna.command`
2. Jos kone varoittaa tiedostosta, toimi näin:
   - **Windows** ("Windows suojasi tietokonettasi"): valitse **Lisätietoja** → **Suorita silti**.
   - **Mac** ("…ei voida avata"): napsauta tiedostoa hiiren oikealla (tai Ctrl + klikkaus) → **Avaa** → **Avaa**. Jos sekään ei auta, avaa **Järjestelmäasetukset → Tietosuoja ja turvallisuus**, vieritä alas ja valitse **Avaa silti**.
3. Avautuu musta tai valkoinen tekstiikkuna. Ensin ladataan tarvittavat osat, mikä kestää pari minuuttia.
4. Ikkuna kysyy kaksi asiaa. Kirjoita tai liitä vastaus ja paina **Enter**:
   - **Canvasin osoite**: kopioi selaimen osoiteriviltä minkä tahansa Canvas-sivun osoite ja liitä se. Esim. `https://koulu.instructure.com/courses/123` käy sellaisenaan.
   - **API-avain**: liitä vaiheessa 1 kopioimasi avain. Liittäminen onnistuu Windowsissa hiiren oikealla napilla tai Ctrl + V:llä, Macissa Cmd + V:llä.
5. Asennus tarkistaa, että avain toimii, ja rakentaa selainlaajennuksen.

✅ *Onnistui, kun:* ikkunassa lukee **✅ Asennus valmis!** Voit sulkea ikkunan painamalla Enter.

❗ *Jos ikkunassa lukee "avain ei kelpaa":* kopioi avain uudelleen ja liitä se. Varmista, että mukaan tulee koko avain mutta ei välilyöntejä.

---

## Vaihe 5: Käynnistä Coach

1. Tuplaklikkaa `canvas-coach`-kansiossa tiedostoa:
   - **Windows:** `Kaynnista.bat`
   - **Mac:** `Kaynnista.command`
2. Avautuu ikkuna, jossa hetken päästä lukee **✅ Canvas Coach on käynnissä**.
3. **Jätä ikkuna auki.** Voit pienentää sen, mutta älä sulje sitä. Coach toimii vain niin kauan kuin ikkuna on auki.

✅ *Onnistui, kun:* ikkunassa näkyy vihreä merkki ja teksti "Canvas Coach on käynnissä".

---

## Vaihe 6: Lisää laajennus Chromeen (tehdään kerran)

1. Kirjoita Chromen osoiteriville **`chrome://extensions`** ja paina Enter. Edgessä osoite on **`edge://extensions`**.
2. Laita päälle **Kehittäjätila** (*Developer mode*). Chromessa kytkin on oikeassa yläkulmassa, Edgessä vasemmassa reunassa.
3. Paina ilmestyvää painiketta **Lataa pakkaamaton laajennus** (*Load unpacked*).
4. Valitse kansio **`canvas-coach` → `extension` → `build`** ja paina **Valitse kansio**.
5. Listaan ilmestyy **Canvas Coach**. Varmista, että sen kytkin on päällä.
6. Vapaaehtoinen: kiinnitä laajennus näkyviin työkalupalkin palapelikuvakkeesta.

✅ *Onnistui, kun:* laajennuslistassa näkyy Canvas Coach ilman punaisia virheilmoituksia.

> Chrome saattaa myöhemmin muistuttaa kehittäjätilan laajennuksista. Se on testikäytössä normaalia, ja muistutuksen voi sulkea.

---

## Vaihe 7: Kokeile Canvasissa

1. Avaa Canvasissa **testikurssisi** jokin **tehtävä**. Jos sivu oli jo auki, päivitä se (F5 tai Cmd + R).
2. Oikeaan alakulmaan ilmestyy **✦ Coach** -painike (oppilaitoksesi Canvas-teeman värillä). Paina sitä.
3. Paina paneelissa **Tarkista sivu**.
4. **Ensimmäisellä kerralla** Chrome saattaa kysyä, saako sivu käyttää paikallisen verkon laitteita. Vastaa **Salli**, koska Coach-palvelin pyörii omalla koneellasi.
5. Noin 10–40 sekunnin päästä paneeliin tulee palaute: yhteenveto, huomiot tärkeysjärjestyksessä ja pohdintakysymyksiä.
6. Kokeile jatkokysymystä: klikkaa jotakin pohdintakysymystä tai kirjoita alas oma kysymys, esim. *"Kirjoita minulle arviointikriteerit tähän tehtävään."*

✅ *Onnistui, kun:* saat palautteen paneeliin. Käynnistä-ikkunaan ilmestyy samalla rivi "Tarkistetaan: …".

---

## Vaihe 8: Testaa nämä tilanteet

Kokeile ainakin seuraavat ja kirjaa havaintosi. Ne auttavat Coachin jatkokehityksessä.

| # | Kokeile | Mitä pitäisi tapahtua |
|---|---|---|
| 1 | **Tehtävä, josta puuttuu määräaika tai arviointikriteerit** | Coach nostaa puutteen ensimmäiseksi punaisella **Korjaa**-merkillä. |
| 2 | **Kurssin etusivu** | Coach ehdottaa, mitä linkkejä kannattaa nostaa esiin, ja arvioi "Aloita tästä" -polun. |
| 3 | **Muokkaustila:** avaa tehtävä tai sivu muokattavaksi, muuta tekstiä mutta älä tallenna, ja paina Tarkista sivu | Paneelissa lukee, että palaute koskee tallentamatonta luonnosta, ja palaute huomioi muutoksesi. |
| 4 | **Sisältösivu, jossa on kuva ilman vaihtoehtoista tekstiä** | Coach huomauttaa saavutettavuudesta. |
| 5 | **Keskustelu, moduulit ja syllabus** | Coach antaa sivutyyppiin sopivaa palautetta. |
| 6 | **Opiskelijanäkymä:** kurssin asetukset → *Opiskelijanäkymä* | Coach-painiketta **ei** näy, koska opiskelijat eivät näe Coachia. |
| 7 | **Brandiohje:** avaa tiedosto `canvas-coach/server/config/brand.md` Muistiolla (Windows) tai TextEditillä (Mac), korvaa esimerkkiohje omallanne, tallenna ja tarkista sivu uudelleen | Brändihuomiot perustuvat nyt teidän ohjeeseenne. Uudelleenkäynnistystä ei tarvita. |
| 8 | **Muistaminen:** sulje paneeli ja päivitä sivu | Palaute on yhä tallessa, kun avaat paneelin uudelleen. |

Kirjaa samalla muistiin:
- Oliko palaute **oikeaa** (ei keksittyjä asioita)?
- Oliko se **hyödyllistä**, eli olisitko muuttanut sivua sen perusteella?
- Puuttuiko jotain, mitä olisit odottanut Coachin huomaavan?
- Kauanko palautteen tulo kesti?

---

## Seuraavilla kerroilla

1. Tuplaklikkaa **Kaynnista** ja jätä ikkuna auki.
2. Avaa Canvas. Coach-painike on paikallaan.

Lopetus: sulje Käynnistä-ikkuna.

---

## Ongelmatilanteet

| Ongelma | Ratkaisu |
|---|---|
| **Coach-painiketta ei näy** | 1) Päivitä sivu. 2) Tarkista, että olet kurssilla **opettajana** etkä opiskelijanäkymässä. 3) Tarkista, että laajennus on päällä osoitteessa `chrome://extensions`. 4) Coach näkyy vain tuetuilla sivuilla (etusivu, sisältösivut, tehtävät, keskustelut, tentit, syllabus, moduulit), ei esim. arviointikirjassa. 5) Jos annoit asennuksessa väärän Canvas-osoitteen, aja **Asenna** uudelleen ja paina sen jälkeen laajennuksen ⟳ (päivitä) -painiketta osoitteessa `chrome://extensions`. |
| **"Coach-palvelimeen ei saatu yhteyttä"** | 1) Onko **Käynnistä-ikkuna** auki? Jos ei, tuplaklikkaa Kaynnista. 2) Jos estit paikallisen verkon käytön: napsauta osoiterivin vasemmassa reunassa olevaa kuvaketta → **Sivustoasetukset** → etsi paikallisen verkon käyttöoikeus → **Salli**. Päivitä sitten sivu. |
| **"Palvelimen API-avain puuttuu tai on virheellinen"** | Aja **Asenna** uudelleen ja liitä avain. Käynnistä sen jälkeen Coach uudelleen (sulje Käynnistä-ikkuna ja avaa se uudelleen). |
| **"Tekoälypalvelun virhe (400)"** | Tilin saldo on todennäköisesti loppunut. Tarkista **Billing** osoitteessa platform.claude.com. |
| **"Tekoälypalvelu on ruuhkautunut"** | Odota hetki ja yritä uudelleen. |
| **"Liian monta pyyntöä"** | Odota minuutti. Coach rajoittaa kutsuja 20:een minuutissa. |
| **Käynnistä-ikkunassa lukee "Portti 8787 on jo käytössä"** | Coach on jo käynnissä toisessa ikkunassa. Käytä sitä tai sulje molemmat ja käynnistä uudelleen. |
| **Mac: "Permission denied" tai tiedosto ei käynnisty** | Avaa **Pääte** (Terminal; löytyy Spotlightilla). Kirjoita `bash ` (huomaa välilyönti), raahaa `Asenna.command`-tiedosto Pääte-ikkunaan ja paina Enter. Sama toimii `Kaynnista.command`-tiedostolle. |
| **Asennus pysähtyy "Node.js puuttuu"** | Asenna Node.js (vaihe 2). Jos asensit sen juuri, käynnistä kone uudelleen ja yritä uudelleen. |
| **Muu virhe** | Ota kuvakaappaus Coach-paneelista ja Käynnistä-ikkunasta ja lähetä ne kehittäjälle. Älä lähetä API-avainta. |

---

## Tietosuoja testin aikana

- Coach lähettää tekoälylle sen sivun sisällön, jolla painat **Tarkista sivu**. Mitään ei lähetetä ennen sitä.
- Opiskelijoiden palautuksia tai keskusteluvastauksia ei lueta.
- **Käytä testissä testikurssia äläkä kirjoita sivuille henkilötietoja.**
- API-avain on tallessa vain omalla koneellasi tiedostossa `canvas-coach/server/.env`. Älä jaa `canvas-coach`-kansiota muille.

## Kokeilun lopettaminen

1. Sulje Käynnistä-ikkuna.
2. Poista laajennus osoitteessa `chrome://extensions` (**Poista**).
3. Poista `canvas-coach`-kansio.
4. Poista API-avain osoitteessa platform.claude.com kohdassa **API keys**, jos et enää tarvitse sitä.

# Padpuzzel Generator

Kleurpad-puzzels voor kinderen — maak en print puzzels in de browser.

**Live:** https://jeffgort.github.io/padpuzzel-app/

## Lokaal openen

Open `index.html` in je browser, of start een eenvoudige server:

```powershell
cd padpuzzel-app
python -m http.server 8080
```

Ga naar http://localhost:8080

## Functies

- Leeftijd: Makkelijk / Middel / Moeilijk
- Regels: één kleur volgen, vermijd één kleur
- Thema's: bloementuin, dierentuin, ruimte, onder water, sprookje, seizoenen
- Iconen: bloem, bal, hart, wiel
- Download PNG, print
- DFS-padgeneratie (geen vertakkingen)

## Tests

```powershell
node --test test_maze.js
```

## GitHub Pages

Repo root → Settings → Pages → branch `main`, folder `/ (root)`.

## Roadmap (binnenkort)

- Meerdere kleuren, afwisselen, vaste volgorde, vorm-regels
- PDF-download

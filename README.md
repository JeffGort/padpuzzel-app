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
- Download PNG, PDF, print
- DFS-padgeneratie (geen vertakkingen)

## Tests

**Node** (als geïnstalleerd):

```powershell
node --test test_maze.js
```

**Browser QA:** open `test_maze.html` in je browser (200 seeds × 3 moeilijkheden × 2 regels).

## GitHub Pages setup

1. Maak een **lege** repo op GitHub: [github.com/new](https://github.com/new) → naam `padpuzzel-app` (public, geen README)
2. Push vanaf deze map:
   ```powershell
   cd padpuzzel-app
   git push -u origin main
   ```
3. Repo **Settings → Pages → branch `main`, folder `/ (root)`**
4. Live op https://jeffgort.github.io/padpuzzel-app/ (na ~1 minuut)

> GitHub CLI (`gh auth login`) is optioneel — `git push` werkt met dezelfde login als `math-app`.

## Roadmap (binnenkort)

- Meerdere kleuren, afwisselen, vaste volgorde, vorm-regels

# Baseline Fitte Engine v1

## Identyfikacja wersji

- Tag Git: `baseline-v1`
- Commit: `2f0bc5a`
- Charakter algorytmu: deterministyczny system regułowo-rankingowy
- Liczba zwracanych propozycji: maksymalnie 3

## Sposób tworzenia zestawów

Algorytm generuje wszystkie możliwe kombinacje:

- góra + dół + obuwie,
- sukienka + obuwie,
- bez obuwia: góra + dół albo sama sukienka.

Bielizna, stroje kąpielowe i ubrania domowe wskazane przez słowa
kluczowe są pomijane.

## Parametry punktacji

Punktacja początkowa zestawu: `100`.

### Dopasowanie do okazji

- zgodny styl ubrania: `+40`,
- niezgodny styl: `-25`,
- zgodne słowo kluczowe w nazwie: `+10`,
- brak choć jednego zgodnego stylu w całym zestawie: `-70`.

### Dopasowanie kolorystyczne

- harmonia dwóch pierwszych elementów: `+25`,
- kolor obuwia zgodny z innym elementem: `+15`.

### Preferencje użytkownika

- waga preferowanego stylu: `waga × 12`,
- waga preferowanego koloru: `waga × 8`.

### Formalność wydarzenia

- styl Classic lub Minimalizm dla formalnego wydarzenia: `+20`,
- Streetwear dla formalnego wydarzenia: `-40`.

### Pogoda

- niedozwolona kategoria, kolor lub słowo kluczowe: wynik `-999`,
- styl niedopasowany do pogody: `-45` za element.

## Wybór wyniku

Wszystkie zestawy są sortowane malejąco według punktacji. Algorytm zwraca
trzy najwyżej ocenione zestawy, a Fitte Engine prezentuje użytkownikowi
pierwszy z nich.

## Ograniczenia baseline

- brak losowania i kontrolowanej rotacji,
- brak kary za niedawno wykorzystane ubrania,
- brak uwzględnienia historii rekomendacji,
- identyczne dane wejściowe zawsze dają identyczną propozycję,
- punktacja kolorów nie jest zapisana jako osobny składnik,
- część reguł pogodowych opiera się na nazwie ubrania,
- brak informacji o materiale, sezonie, grubości i wodoodporności.
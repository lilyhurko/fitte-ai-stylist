# Backup i odtwarzanie MongoDB

## Cel

Fitte używa MongoDB Atlas. Ponieważ aktualny plan klastra nie obejmuje
snapshotów Atlas, aplikacja tworzy lokalne, skompresowane archiwa `mongodump`.
Każde archiwum ma manifest z sumą SHA-256, a kopie starsze niż 14 dni są
usuwane automatycznie. Archiwum i manifest mają lokalne uprawnienia `600`;
trzymaj je na dysku chronionym przez FileVault albo ustaw `BACKUP_DIRECTORY`
na inną zaszyfrowaną lokalizację.

## Tworzenie backupu

Z katalogu głównego projektu uruchom:

```bash
npm run backup:mongodb
```

Wymagania:

- `server/.env` zawiera `DATABASE_URL` z nazwą produkcyjnej bazy;
- zainstalowane są MongoDB Database Tools: `mongodump` i `mongorestore`;
- katalog `backups/mongodb/` nie jest wersjonowany przez Git.

Skrypt tworzy pliki:

```text
backups/mongodb/fitte-db-YYYY-MM-DDTHH-MM-SS-msZ.archive.gz
backups/mongodb/fitte-db-YYYY-MM-DDTHH-MM-SS-msZ.archive.gz.json
```

Plik JSON zawiera datę, rozmiar oraz sumę SHA-256. Nie zawiera danych
logowania ani URI bazy.

Opcjonalne ustawienia w `server/.env`:

```text
BACKUP_DIRECTORY=/bezpieczna/sciezka/poza/repozytorium
BACKUP_RETENTION_DAYS=14
```

## Codzienny harmonogram na macOS

Po uprzednim ręcznym potwierdzeniu poprawnego backupu możesz jednorazowo
zainstalować lokalny harmonogram `launchd`:

```bash
npm run backup:mongodb:schedule
```

Domyślnie uruchamia kopię codziennie o 03:15. Aby wybrać inną godzinę, dodaj
do `server/.env` wartości `BACKUP_SCHEDULE_HOUR` (0–23) oraz
`BACKUP_SCHEDULE_MINUTE` (0–59) i uruchom powyższą komendę ponownie.

Harmonogram działa wyłącznie na tym Macu, a jego logi zapisują się w
`backups/mongodb/logs/`. Nie jest to usługa chmurowa i nie wysyła bazy do GitHub.

## Bezpieczne odtworzenie testowe

1. Wybierz archiwum z `backups/mongodb/`.
2. Sprawdź, że `server/.env.test.local` zawiera `TEST_DATABASE_URL` wskazujący
   na **inną** bazę niż `DATABASE_URL`.
3. Uruchom z katalogu głównego projektu:

```bash
npm run restore:mongodb:test -- backups/mongodb/<nazwa-archiwum>.archive.gz
```

Skrypt odmawia działania, jeśli adres testowej i produkcyjnej bazy jest
identyczny. Przed odtworzeniem porównuje również SHA-256 archiwum z manifestem.
Polecenie `--drop` usuwa wyłącznie kolekcje **testowej** bazy docelowej.

4. Zweryfikuj w Atlas Data Explorer, że w bazie testowej znajdują się
   kolekcje `User`, `Cloth`, `Event`, `Analysis` i `OutfitRecommendation`.
5. Zaloguj liczbę dokumentów przed i po odtworzeniu w raporcie z testu.

## Procedura awaryjna dla produkcji

Nie przywracaj backupu bezpośrednio na produkcję. Najpierw odtwórz go do
testowej bazy, sprawdź kompletność danych i dopiero wtedy podejmij decyzję o
odtworzeniu produkcji. Odtworzenie produkcyjne wymaga osobnej, świadomej
decyzji właściciela systemu, ponieważ może nadpisać aktualne dane.

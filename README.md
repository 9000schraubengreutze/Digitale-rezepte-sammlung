# Digitale Rezepte Sammlung

Eine kleine Web-App zum Sammeln, Suchen und Favorisieren eingescannter Rezepte.

## Funktionen

- Rezepte mit Titel, Kategorie, Dauer, Zutaten und Notizen speichern
- Rezeptscans oder Fotos hochladen
- Automatische OCR-Texterkennung fuer Fotos und PDFs
- Volltextsuche ueber gespeicherte Rezepte
- Favoriten markieren
- Lokaler Rezept-Assistent fuer passende Rezeptvorschlaege

## Lokal starten

```powershell
node server.js
```

Danach im Browser oeffnen:

```text
http://127.0.0.1:8123/
```

Die App speichert Rezeptdaten im Browser per `localStorage`.

## OCR-Hinweis

Beim Auslesen von Fotos oder PDFs laedt die App PDF.js und Tesseract.js aus dem Browser. Dafuer ist beim ersten OCR-Lauf eine Internetverbindung noetig.

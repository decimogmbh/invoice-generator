# invoice-generator
External invoice generator


## HTML - index.html

```
<script type="text/javascript" src="assets/invoice_generator.js"></script>
<body class=“decimo-generator”>
<div id=“generator” class=“generator-style”>
```

* Das Body Element muss die CSS Klasse “decimo-generator” enthalten.
* Am Generator Container muss die CSS Klasse “generator-style” gesetzt sein.
* invoice_generator.js Script muss eingebunden werden.

## Javascript

Objekt “options” hat die Attribute 
* “container” -> container ID (im Beispiel “generator”)
* “token” -> API Token
* “source” -> Quelle
* “data”
    * “user”
        * “token” -> User ID
    * “form_data” -> Daten zur Vorauswahl via Javascript übergeben
        * “from” -> Rechnungssteller
        * “to” -> Rechnungsempfänger
    * “from” -> Rechnungsstellerdaten zur Vorauswahl via Server übergeben
    * “to” -> Rechnungsempfängerdaten zur Vorauswahl via Server übergeben


Funktion “init” mit dem Options Objekt wie einem möglichen Callback aufrufen, welcher ein JSON Response Objekt enthält. 

Response Objekt:

Rechnung speichern und Nutzer anlegen
```javascript
{“status”: “created”, “user_token”: “123123123”}
```

Validierungsfehler
```javascript
{“status”: “error”, “message”: {
"10": "RS-Name fehlt”’,
"11": "RS-Email fehlt”,
"12": "RS-Adresszeile 1 fehlt”,
"13": "RS-PLZ fehlt”,
"14": "RS-Stadt fehlt”,
"15": "RS-Land fehlt”,
"16": "RS-Steuernummer fehlt”,
"17": "RS-Telefonnummer fehlt",
"20": "RE-Name fehlt”,
"21": "RE-Adresszeile fehlt”,
"22": "RE-PLZ fehlt”,
"23": "RE-Stadt fehlt”,
"30": "Rechnungsnummer fehlt”,
"31": "Start des Leistungszeitraums fehlt”,
"32": "Ende des Leistungszeitraums fehlt”,
"40": "IBAN ist ungültig”}, “Time”: “aktuelle Zeit”}
```

Rechnung per PDF versandt
```javascript
{“status”: “success”}
```
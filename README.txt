FÖRARMENY – INSTALLATION

1. Lägg ZIP-filen i projektets huvudmapp.

2. Kör:
   unzip -o forarmeny-paket.zip

3. Starta:
   npm run dev

4. Öppna:
   http://localhost:3000/admin/forare

FUNKTIONER
- Visar leveranser för valt datum.
- Sorterar efter sparad route_position.
- Knapp för hela rutten i Google Maps.
- Navigera till en enskild kund.
- Ring kunden.
- Markera ordern som Klar.
- Markera ordern som Levererad.
- Levererade order kan döljas eller visas.
- Mobilanpassad layout.

Databasen behöver inte ändras. Sidan använder befintliga fält i orders-tabellen.

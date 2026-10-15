/* ============================================================
   CONFIGURACIÓ LOCAL — NO SE SUBSTITUEIX MAI
   ------------------------------------------------------------
   Aquest fitxer conté el token de seguretat de l'app.
   El poses UN COP i no l'has de tornar a tocar mai més:
   quan actualitzis la resta del codi, aquest fitxer es queda igual.

   · APP_TOKEN ha de coincidir amb el token de les propietats del
     Code.gs (clau APP_TOKEN). És una cadena que TU inventes, no és
     cap credencial de Google.

   IMPORTANT: quan et passin una versió nova de l'app, substitueix
   tots els fitxers MENYS aquest. Així el token es manté.
   ============================================================ */

window.APP_TOKEN = 'vedruna-escorial-vic-35d1e8e1bd7c0faafa4e59b5522084c7';

/* ============================================================
   LA CONNEXIÓ D'AQUESTA APP
   ------------------------------------------------------------
   L'adreça del seu servidor. Abans només vivia dins del navegador
   de cada aparell, i per això s'havia d'enganxar a cada mòbil i a
   cada ordinador, i es perdia en esborrar les dades del navegador.
   Aquí hi és per sempre i li arriba a tots els aparells alhora.

   ⚠ El que ella ja tingui desat al navegador MANA per sobre d'això.
   O sigui que avui no li canvia res: només entra en joc el dia que
   se li esborri el navegador o estreni aparell.

   Si un dia se li n'ha de posar una altra, es canvia aquí i es
   torna a publicar: no s'ha de tocar cap dels seus aparells.
   ============================================================ */
window.APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw9VNM65yQHb-P51P819aId1EpAJhGfaMv6Bx0c22JjiLbAIawgO5AkmW7D2n7RfRfw/exec";

/* ============================================================
   ENTRAR AMB GOOGLE
   ------------------------------------------------------------
   Un sol cop a cada aparell, i a partir d'aquí entra sola.

   ⚠ Això sol NO protegeix res: només pinta la pantalla d'entrada.
   Qui comprova de debò que siguis de l'escola és el servidor, amb
   la propietat LOGIN_DOMINI de la biblioteca.

   Per apagar-ho a aquesta mestra: esborra aquestes dues línies.
   ============================================================ */
window.LOGIN_GOOGLE = "290684261462-o07ktlf7ikrvmvv0pmbli28560dqqmj1.apps.googleusercontent.com";
window.LOGIN_DOMINI = 'escorialvic.cat';

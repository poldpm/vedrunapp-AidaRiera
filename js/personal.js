/* ============================================================
   PERSONALITZACIONS D'AQUESTA MESTRA — personal.js
   ------------------------------------------------------------
   A l'app MARE aquest fitxer és BUIT a posta. A l'app de cada
   mestra hi va tot el que és seu i només seu.

   Es carrega l'ÚLTIM de tots, quan la resta de l'app ja hi és,
   i `sync-filla.js` no el trepitja mai: així una mestra es pot
   personalitzar tant com calgui sense que cap fitxer del base
   divergeixi, i continua rebent tots els arranjaments.

   ⚠ La regla que ho fa sostenible: **el que sigui per a ella, aquí.**
   Si es toca `app.js`, `perfil.js` o `notes.js` dins de la seva
   carpeta, aquell fitxer deixa de rebre arranjaments per sempre.

   Veure FILLES.md.
   ============================================================ */

/* ============================================================
   EINES ENCESES PER A ELLA
   ------------------------------------------------------------
   El codi d'aquestes eines arriba a totes les apps amb el sync, però
   neix apagat: cada mestra només veu les que ha demanat. Aquí és on
   s'encenen les seves.

   ARA MATEIX NO EN TÉ CAP D'ENCESA, i és a posta.

   ⚠ Les RÚBRIQUES D'AVALUACIÓ es van encendre el 29/9/2026 i es van tornar
   a apagar el mateix dia. En Pol: «jo vull que la tingui com a actualització
   disponible, no com a eina ja instal·lada». O sigui que la vegi a
   «Possibles actualitzacions», la llegeixi i la demani ella si li fa
   servei, com qualsevol altra mestra. Encendre-la per endavant se salta
   justament el pas que fa que el catàleg serveixi de res.

   Per encendre-la el dia que la demani, n'hi ha prou amb treure el comentari
   d'aquesta línia (i res més: la resta ja està feta i provada, inclòs com
   conviu amb el registre per categories d'aquí sota).

       // window.EINES_RUBAVAL = true;
   ============================================================ */

/* ============================================================
   EL REGISTRE DE NOTES PER CATEGORIES
   ------------------------------------------------------------
   L'Aida no puntua amb una llista d'activitats soltes: fa servir el
   quadern de l'escola, que té CATEGORIES amb un % que suma 100
   («C. Lectora 40%», «E. Escrita 30%», «Actitud 10%»…) i, dins de cada
   categoria, les activitats que calguin («fitxa conte», «prova llibre»…).

   Com surt la nota:
     · dins d'una categoria, les activitats fan mitjana entre elles;
     · la nota és la mitjana de les categories, ponderada pel seu %.

   Una categoria que encara no té cap nota no compta ni resta: el seu %
   es reparteix entre les que sí que en tenen. Si no fos així, al
   novembre tothom aniria suspès.

   Què hi ha a l'app base (i per tant arriba sol, sense tocar res aquí):
     · el servidor ja sap calcular per categories, o sigui que la columna
       Mitjana del full de càlcul diu el mateix que la pantalla;
     · `getNotes` torna les categories i de quina és cada activitat.
   El que hi ha AQUÍ és només la pantalla: la fila de categories, la
   columna de total de cada una, el quadre per gestionar-les i el
   selector del quadre de «Nou ítem».
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Les categories del full que hi ha obert ---------- */

  // Clau de context: assignatura + trimestre + grup. És la mateixa idea que
  // el cache de notes del base.
  function _clau(materia, trimestre, grup) {
    return String(materia) + '|' + String(trimestre) + '|' + (grup || '');
  }
  function _clauActual() {
    if (typeof notesContext === 'undefined' || !notesContext.materia) return null;
    return _clau(notesContext.materia, notesContext.trimestre, notesContext.grup);
  }

  var _memoria = {};   // clau -> { cats:[{id,nom,pes}], actitudCat:'' }

  function _desaMemoria(clau, dades) {
    _memoria[clau] = dades;
    try { localStorage.setItem('aidacats_' + clau, JSON.stringify(dades)); } catch (e) {}
  }
  /* Amb `clau` es demanen les categories d'UNA ALTRA assignatura, no de la
     que hi ha oberta. Cal per al quadre de les rúbriques: quan s'obre, el
     registre de notes encara no s'ha obert i `notesContext` no diu res. */
  function _dades(clau) {
    var k = clau || _clauActual();
    if (!k) return { cats: [], actitudCat: '' };
    if (!_memoria[k]) {
      try {
        var raw = localStorage.getItem('aidacats_' + k);
        if (raw) _memoria[k] = JSON.parse(raw);
      } catch (e) {}
    }
    var d = _memoria[k];
    if (!d || !Array.isArray(d.cats)) return { cats: [], actitudCat: '' };
    return d;
  }
  function _cats(clau)  { return _dades(clau).cats; }
  function _actiu(clau) { return _cats(clau).length > 0; }

  // De quina categoria és una activitat. L'actitud no és una columna com les
  // altres (la puntuació viu al navegador) i per això va a part.
  function _catDe(item) {
    if (!item) return '';
    if (item.id === 'actitud_ref') return _dades().actitudCat || '';
    return item.cat || '';
  }
  function _catPerId(id, clau) {
    var c = _cats(clau);
    for (var i = 0; i < c.length; i++) if (c[i].id === id) return c[i];
    return null;
  }
  function _sumaPercentatges() {
    return _cats().reduce(function (a, c) { return a + (parseFloat(c.pes) || 0); }, 0);
  }

  /* ---------- 1. Recollir les categories quan arriben les notes ---------- */
  /* No es pot tocar `_loadNotesBackground` sense copiar-lo sencer: s'escolta
     la resposta del servidor al pas, que és una línia i no es desincronitza
     mai del base. */
  var _getOrig = window.appsScriptGet;
  window.appsScriptGet = function (params) {
    var promesa = _getOrig.apply(this, arguments);
    if (!params || params.action !== 'getNotes') return promesa;
    var clau = _clau(params.materia, params.trimestre, params.grup);
    return promesa.then(function (r) {
      if (r && r.ok && Array.isArray(r.cats)) {
        _desaMemoria(clau, { cats: r.cats, actitudCat: r.actitudCat || '' });
      }
      return r;
    });
  };

  /* ---------- 2. Les columnes, agrupades per categoria ---------- */
  var _sortOrig = window.sortCarpetaLast;
  window.sortCarpetaLast = function (items) {
    var base = _sortOrig(items);
    if (!_actiu()) return base;
    var ordre = {};
    _cats().forEach(function (c, i) { ordre[c.id] = i; });
    return base
      .map(function (it, i) { return { it: it, i: i }; })
      .sort(function (a, b) {
        var pa = ordre[_catDe(a.it)], pb = ordre[_catDe(b.it)];
        if (pa === undefined) pa = 999;
        if (pb === undefined) pb = 999;
        if (pa !== pb) return pa - pb;
        return a.i - b.i;   // dins d'una categoria, l'ordre que ja tenien
      })
      .map(function (x) { return x.it; });
  };

  /* ---------- 3. El càlcul ---------- */

  // La nota d'un alumne en UNA activitat, sobre 10. És el mateix criteri que
  // fa servir la taula del base (i el servidor).
  function _notaItem(item, sid) {
    var p = (notesValors[item.id] || {})[sid];
    if (p === '' || p === null || p === undefined) return null;
    var n = item.readonly ? parseFloat(p) : sobre10(p, item.maxPunts);
    return (n === null || isNaN(n)) ? null : n;
  }

  // La mitjana d'una categoria: les seves activitats, entre elles.
  function _mitjanaCategoria(catId, sid) {
    var v = 0, p = 0;
    notesItems.forEach(function (item) {
      if (_catDe(item) !== catId) return;
      var n = _notaItem(item, sid);
      if (n === null) return;
      var pes = parseFloat(item.pes) > 0 ? parseFloat(item.pes) : 1;
      v += n * pes; p += pes;
    });
    return p > 0 ? Math.round(v / p * 100) / 100 : null;
  }

  /* La nota final. Ha de donar EXACTAMENT el mateix que `_mitjanaPerCats_`
     del servidor: si la pantalla i el full diguessin números diferents, la
     mestra no sabria a quin fer cas. */
  var _mitjOrig = window.calcMitjana;
  window.calcMitjana = function (sid) {
    if (!_actiu()) return _mitjOrig(sid);

    var pesDe = {}, suma = 0;
    _cats().forEach(function (c) { pesDe[c.id] = parseFloat(c.pes) || 0; suma += parseFloat(c.pes) || 0; });
    pesDe[''] = Math.max(0, 100 - suma);   // el calaix de les que no en tenen

    var acum = {};
    notesItems.forEach(function (item) {
      var n = _notaItem(item, sid);
      if (n === null) return;
      var k = pesDe[_catDe(item)] === undefined ? '' : _catDe(item);
      if (!acum[k]) acum[k] = { v: 0, p: 0 };
      var pes = parseFloat(item.pes) > 0 ? parseFloat(item.pes) : 1;
      acum[k].v += n * pes; acum[k].p += pes;
    });

    var sumV = 0, sumP = 0;
    Object.keys(acum).forEach(function (k) {
      if (acum[k].p <= 0) return;
      var pesCat = pesDe[k] || 0;
      if (pesCat <= 0) return;
      sumV += (acum[k].v / acum[k].p) * pesCat;
      sumP += pesCat;
    });
    return sumP > 0 ? Math.round(sumV / sumP * 100) / 100 : null;
  };

  /* ---------- 4. La taula: fila de categories i total de cada una ---------- */

  // Els grups de columnes seguides que són de la mateixa categoria.
  function _grups() {
    var g = [], actual = null;
    notesItems.forEach(function (item, i) {
      var c = _catDe(item);
      if (!_catPerId(c)) c = '';
      if (!actual || actual.cat !== c) { actual = { cat: c, ini: i, fi: i }; g.push(actual); }
      else actual.fi = i;
    });
    return g;
  }

  function _insereix(fila, idx, cel) {
    if (idx >= fila.children.length) fila.appendChild(cel);
    else fila.insertBefore(cel, fila.children[idx]);
  }

  function _pintaTotalCat(cel, catId, sid) {
    var m = _mitjanaCategoria(catId, sid);
    var q = m !== null ? getQual(m) : null;
    cel.innerHTML = m !== null
      ? '<span class="nota10-chip" style="background:' + (q ? q.bg : 'var(--surface-alt)') +
        ';color:' + (q ? q.color : 'var(--text-sub)') + ';font-weight:700">' + m.toFixed(2) + '</span>'
      : '<span style="color:var(--text-muted)">—</span>';
  }

  var _renderOrig = window.renderNotesTable;
  window.renderNotesTable = function () {
    _renderOrig.apply(this, arguments);
    /* ⚠ LA LLEGENDA S'HA D'ARREGLAR TAMBÉ QUAN NO HI HA CATEGORIES.
       Provat el 29/9/2026: passant d'una assignatura amb categories a una
       que no en té, la llegenda dels pesos es quedava amagada i al seu lloc
       hi seguia la de les categories, que allà no volia dir res. Per això
       es crida ABANS de plegar. */
    _arreglaLlegenda();
    if (!_actiu()) return;

    var thead = document.getElementById('notesTableHead');
    var tbody = document.getElementById('notesTableBody');
    if (!thead || !thead.rows.length || !tbody) return;

    var filaItems = thead.rows[thead.rows.length - 1];
    var grups = _grups();

    /* Les columnes de total s'insereixen de DRETA a ESQUERRA: així cap índex
       que encara no s'ha fet servir no es mou de lloc. */
    for (var gi = grups.length - 1; gi >= 0; gi--) {
      var g = grups[gi];
      var idx = g.fi + 2;                        // 1 columna de nom + l'última del grup
      var cat = _catPerId(g.cat);

      var th = document.createElement('th');
      th.className = 'notes-th-item aida-th-total';
      th.innerHTML = '<div class="notes-th-item-nom">Total</div>' +
                     '<div class="notes-th-item-meta">' + (cat ? escapeHtml(cat.nom) : 'sense categoria') + '</div>';
      _insereix(filaItems, idx, th);

      for (var r = 0; r < tbody.rows.length; r++) {
        var alumne = students[r];
        var td = document.createElement('td');
        td.className = 'notes-td-mitj notes-td-item-readonly aida-td-total';
        var dv = document.createElement('div');
        dv.className = 'mitj-cell';
        dv.id = 'aidatot_' + gi + '_' + (alumne ? alumne.id : r);
        if (alumne) _pintaTotalCat(dv, g.cat, alumne.id);
        td.appendChild(dv);
        _insereix(tbody.rows[r], idx, td);
      }
    }

    /* I a sobre de tot, la fila de les categories amb el seu %. */
    var filaCats = document.createElement('tr');
    filaCats.className = 'aida-fila-cats';

    var thNom = document.createElement('th');
    thNom.className = 'notes-th-name aida-th-cats-nom';
    var suma = _sumaPercentatges();
    thNom.innerHTML = '<button type="button" class="aida-btn-cats" onclick="aidaObreCategories()">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" aria-hidden="true">' +
      '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>' +
      '<rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>' +
      'Categories <span class="aida-suma' + (Math.round(suma) === 100 ? '' : ' malament') + '">' +
      _num(suma) + '%</span></button>';
    filaCats.appendChild(thNom);

    grups.forEach(function (g) {
      var cat = _catPerId(g.cat);
      var th = document.createElement('th');
      th.className = 'aida-th-cat' + (cat ? '' : ' sense');
      th.colSpan = (g.fi - g.ini + 1) + 1;   // les activitats + el seu total
      th.innerHTML = cat
        ? '<button type="button" class="aida-cat-cap" onclick="aidaObreCategories()" ' +
          'title="Clica per canviar les categories i els percentatges">' +
          '<span class="aida-cat-nom">' + escapeHtml(cat.nom) + '</span>' +
          '<span class="aida-cat-pes">' + _num(cat.pes) + '%</span></button>'
        : '<button type="button" class="aida-cat-cap" onclick="aidaObreCategories()" ' +
          'title="Aquestes activitats no compten per a la nota: posa-les en una categoria">' +
          '<span class="aida-cat-nom">Sense categoria</span>' +
          '<span class="aida-cat-pes">' + _num(Math.max(0, 100 - _sumaPercentatges())) + '%</span></button>';
      filaCats.appendChild(th);
    });

    var thFi = document.createElement('th');
    thFi.className = 'aida-th-cat buida';
    thFi.colSpan = 2;                          // Mitjana i Nota
    filaCats.appendChild(thFi);

    thead.insertBefore(filaCats, thead.rows[0]);
  };

  /* ⚠ LA LLEGENDA DELS PESOS DEIA UNA COSA QUE JA NO ÉS VERITAT.

     Sota els rètols de colors hi ha una llegenda que acaba dient «la nota
     final és la mitjana ponderada pel pes de cada ítem». Amb categories no
     ho és: el que reparteix la nota és el % de la categoria, i el pes només
     ordena les activitats DINS d'una. Deixar-la hauria fet buscar un número
     que no vol dir el que sembla. */
  function _arreglaLlegenda() {
    var totes = document.querySelectorAll('#page-notes .qual-legend');
    var meu = document.getElementById('aidaLlegendaCats');
    for (var i = 0; i < totes.length; i++) {
      if (totes[i].id === 'aidaLlegendaCats') continue;
      if ((totes[i].textContent || '').trim().indexOf('Pes:') !== 0) continue;

      if (!_actiu()) {
        totes[i].style.display = '';
        if (meu) meu.style.display = 'none';
        return;
      }
      totes[i].style.display = 'none';
      if (!meu) {
        meu = document.createElement('div');
        meu.className = 'qual-legend';
        meu.id = 'aidaLlegendaCats';
        meu.style.marginBottom = '20px';
        meu.innerHTML = '<span class="aida-llegenda">La nota surt del <strong>%</strong> de cada ' +
          'categoria. Dins d\'una categoria, les activitats fan mitjana entre elles; el pes només ' +
          'les ordena entre si.</span>';
        totes[i].parentNode.insertBefore(meu, totes[i]);
      }
      meu.style.display = '';
      return;
    }
  }

  // Quan canvia una nota, el total de la seva categoria també ha de canviar.
  var _refreshOrig = window.refreshStudentRow;
  window.refreshStudentRow = function (sid) {
    _refreshOrig.apply(this, arguments);
    if (!_actiu()) return;
    _grups().forEach(function (g, gi) {
      var dv = document.getElementById('aidatot_' + gi + '_' + sid);
      if (dv) _pintaTotalCat(dv, g.cat, sid);
    });
  };

  /* ---------- 5. El quadre de «Nou ítem»: de quina categoria és ---------- */

  var _obreNouOrig = window.openNewNotaModal;
  window.openNewNotaModal = function () {
    _obreNouOrig.apply(this, arguments);
    var cos = document.querySelector('#newNotaOverlay .modal-body');
    if (!cos) return;

    var camp = document.getElementById('aidaCampCat');
    if (!_actiu()) { if (camp) camp.style.display = 'none'; return; }

    if (!camp) {
      camp = document.createElement('div');
      camp.className = 'modal-field';
      camp.id = 'aidaCampCat';
      camp.innerHTML = '<label class="modal-label" for="aidaNotaCat">Categoria</label>' +
        '<select class="modal-input" id="aidaNotaCat"></select>' +
        '<div class="modal-hint">Dins de la categoria, les activitats fan mitjana entre elles. ' +
        'El % que compta per a la nota és el de la categoria.</div>';
      cos.insertBefore(camp, cos.firstChild.nextSibling);
    }
    camp.style.display = '';
    var sel = document.getElementById('aidaNotaCat');
    sel.innerHTML = _cats().map(function (c) {
      return '<option value="' + escapeHtml(c.id) + '">' + escapeHtml(c.nom) + ' · ' + _num(c.pes) + '%</option>';
    }).join('');
  };

  /* L'activitat nova se'n va al servidor per la cua de caselles del base. En
     comptes de copiar `addNotaItem` sencer —que deixaria de rebre'n els
     arranjaments— s'hi enganxa la categoria just quan hi passa. L'objecte és
     el mateix que ja és a la taula, o sigui que amb repintar n'hi ha prou. */
  /* D'on surt la categoria d'una columna que acaba de néixer:
       1. el selector del quadre de «Nou ítem», si el quadre és obert;
       2. el selector que aquest fitxer afegeix al quadre de «Passar les
          notes al registre» de les rúbriques (veure l'apartat 6 bis);
       3. l'última que va fer servir en aquesta assignatura;
       4. la primera de la llista.
     L'1 i el 2 són el que tria ella. El 3 i el 4 són la xarxa de sota, per
     si mai naixia una columna per un camí que encara no existeix: val més
     posar-la en una categoria i dir-li-ho que no pas deixar-la fora de la
     nota sense que ho sàpiga. */
  function _ultimaCatClau(clau) { return 'aidaultimacat_' + (clau || _clauActual() || ''); }
  function _recordaCat(id, clau) { try { localStorage.setItem(_ultimaCatClau(clau), id); } catch (e) {} }
  function _catPerDefecte(clau) {
    var ultima = null;
    try { ultima = localStorage.getItem(_ultimaCatClau(clau)); } catch (e) {}
    if (ultima && _catPerId(ultima, clau)) return ultima;
    return _cats(clau)[0] ? _cats(clau)[0].id : '';
  }

  var _catRubricaTriada = null;   // el que ha dit al quadre de la rúbrica

  var _posaOrig = window._casellesPosa;
  window._casellesPosa = function (tipus, ctx, clau, canvi) {
    if (tipus === 'notesItem' && _actiu() && canvi && canvi.item && !canvi.item.cat) {
      var quadreObert = !!document.querySelector('#newNotaOverlay.open');
      var sel = document.getElementById('aidaNotaCat');
      var tria = '', triada = false;
      if (quadreObert && sel && sel.value) { tria = sel.value; triada = true; }
      else if (_catRubricaTriada && _catPerId(_catRubricaTriada)) { tria = _catRubricaTriada; triada = true; }
      else tria = _catPerDefecte();
      _catRubricaTriada = null;
      if (triada && tria) _recordaCat(tria);
      /* Si la columna ha nascut sense que ningú n'hagi triat la categoria,
         se li'n posa una i se li DIU quina. Una columna sense categoria no
         comptaria per a la nota i no hi hauria res a la pantalla que ho
         expliqués. */
      if (tria && !triada) {
        var c = _catPerId(tria);
        if (c && typeof showToast === 'function') {
          setTimeout(function () {
            showToast('«' + canvi.item.nom + '» ha anat a la categoria «' + c.nom +
                      '». Canvia-la des de Categories si no toca.', 'info');
          }, 900);
        }
      }
      /* ⚠ LA COLUMNA NOVA QUEDAVA FORA DEL SEU BLOC (provat el 29/9/2026).
         El base ordena les columnes ABANS que aquí se sàpiga de quina
         categoria és, i la nova anava a parar al final de tot: a la fila de
         dalt hi sortia «E. Escrita» dues vegades, una amb les seves columnes
         i l'altra amb la que acabava de néixer. Per això aquí es torna a
         ordenar amb la categoria ja posada. */
      if (tria) {
        canvi.item.cat = tria;
        setTimeout(function () { notesItems = sortCarpetaLast(notesItems); renderNotesTable(); }, 0);
      }
    }
    return _posaOrig.apply(this, arguments);
  };

  /* ---------- 6 bis. Triar la categoria en passar una rúbrica al registre ----------

     L'eina de rúbriques crea la columna del registre ella sola, sense passar
     pel quadre de «Nou ítem». Aquí les categories manen, o sigui que ha de
     poder dir a quina va, i el lloc on toca és el mateix quadre on ja diu
     quant compta l'activitat.

     Aquell quadre és del base (`#ravPassaOverlay`) i no es toca: el camp s'hi
     afegeix quan s'obre, que és quan el base ja n'ha repintat el cos. Si un
     dia el quadre canvia, això deixa de posar-hi el camp i prou: la columna
     seguirà anant a una categoria (l'última que hagi fet servir) i un avís
     li dirà a quina. No es pot quedar sense. */

  /* De quina assignatura, trimestre i grup és la rúbrica que s'està passant.
     NO es pot mirar `notesContext`: el registre encara no s'ha obert (l'obre
     l'eina després, ella mateixa). Se sap del selector de la pàgina de
     rúbriques i del trimestre que hi tingui marcat, que és exactament el que
     l'eina li passarà a `openNotes`. */
  function _clauDeLaRubrica() {
    var sel = document.getElementById('rubavalAssig');
    if (!sel || !sel.value) return null;
    var b = document.querySelector('#rubavalPicker .trim-sel-btn.active');
    var trim = (b && b.dataset && b.dataset.trim) ? b.dataset.trim : '';
    if (!trim) return null;
    var e = null;
    if (typeof _perfilEntradesAmbGrup === 'function') {
      e = _perfilEntradesAmbGrup().filter(function (x) { return x.key === sel.value; })[0];
    }
    if (!e) return null;
    return _clau(e.key, trim, e.grup || null);
  }

  function _posaTriaCatRubrica() {
    var ov = document.getElementById('ravPassaOverlay');
    if (!ov || !ov.classList.contains('open')) return;
    var cos = document.getElementById('ravPassaBody');
    if (!cos) return;

    // El cos es repinta a cada obertura: el camp d'abans ja no hi és o sobra.
    var vell = document.getElementById('aidaPassaCamp');
    if (vell && vell.parentNode) vell.parentNode.removeChild(vell);
    _catRubricaTriada = null;

    /* Si d'aquella assignatura no se'n saben les categories (encara no l'ha
       oberta mai en aquest navegador), no s'inventa cap desplegable: la
       columna anirà a la primera i un avís li dirà a quina. */
    var clau = _clauDeLaRubrica();
    if (!clau || !_actiu(clau)) return;

    /* La columna ja existeix quan el pes surt bloquejat: llavors no se'n crea
       cap de nova i la categoria que tingui no es toca. Val més dir-ho que no
       pas ensenyar-li un desplegable que no faria res. */
    var pes = document.getElementById('ravPassaPes');
    var jaHiEra = !!(pes && pes.disabled);

    var camp = document.createElement(jaHiEra ? 'p' : 'label');
    camp.id = 'aidaPassaCamp';
    if (jaHiEra) {
      camp.className = 'modal-hint';
      camp.style.margin = '-4px 0 12px';
      camp.textContent = 'La columna ja és al registre: es queda a la categoria que tingui. ' +
                         'Es canvia des de Categories.';
    } else {
      camp.className = 'rav-camp';
      camp.style.marginBottom = '12px';
      var perDefecte = _catPerDefecte(clau);
      camp.innerHTML = '<span class="rav-camp-nom">A quina categoria va</span>' +
        '<select class="modal-input" id="aidaPassaCat" aria-label="A quina categoria va la nota">' +
        _cats(clau).map(function (c) {
          return '<option value="' + escapeHtml(c.id) + '"' +
                 (c.id === perDefecte ? ' selected' : '') + '>' +
                 escapeHtml(c.nom) + ' · ' + _num(c.pes) + '%</option>';
        }).join('') + '</select>';
    }

    /* Just a sota de «Quant compta dins del trimestre». Si el base ja hi ha
       posat la seva nota al peu («el pes es canvia des del registre»), es va
       a sota d'aquella: si no, quedaria entre la casella i la seva pròpia
       explicació. */
    var ancora = pes ? pes.closest('.rav-camp') : null;
    if (ancora && ancora.nextElementSibling &&
        ancora.nextElementSibling.classList.contains('modal-hint')) {
      ancora = ancora.nextElementSibling;
    }
    if (ancora && ancora.parentNode === cos) {
      if (ancora.nextSibling) cos.insertBefore(camp, ancora.nextSibling);
      else cos.appendChild(camp);
    } else {
      cos.insertBefore(camp, cos.firstChild);
    }
  }

  /* El que tria es recull al botó de «Passar-hi les notes», i des de
     l'OVERLAY: així s'executa abans que el `onclick` del base, que és qui
     tanca el quadre i engega tot el procés. */
  function _escoltaQuadreRubrica(ov) {
    if (!ov || ov._aidaEscoltat) return;
    ov._aidaEscoltat = true;
    ov.addEventListener('click', function (ev) {
      var fes = ev.target && ev.target.closest ? ev.target.closest('#ravPassaFes') : null;
      if (!fes) return;
      var sel = document.getElementById('aidaPassaCat');
      _catRubricaTriada = (sel && sel.value) ? sel.value : null;
    }, true);
    new MutationObserver(function () { _posaTriaCatRubrica(); })
      .observe(ov, { attributes: true, attributeFilter: ['class'] });
    _posaTriaCatRubrica();
  }

  function _vigilaQuadreRubrica() {
    var ov = document.getElementById('ravPassaOverlay');
    if (ov) { _escoltaQuadreRubrica(ov); return; }
    // Encara no existeix: el base el fabrica el primer cop que s'obre.
    new MutationObserver(function (_, obs) {
      var o = document.getElementById('ravPassaOverlay');
      if (!o) return;
      obs.disconnect();
      _escoltaQuadreRubrica(o);
    }).observe(document.body, { childList: true });
  }

  /* ---------- 6. El quadre de les categories ---------- */

  var _esborrany = [];      // el que s'està editant: [{id,nom,pes}]
  var _assigna   = {};      // itemId -> catId

  function _idNou() { return 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1000); }
  function _num(n) {
    var v = Math.round((parseFloat(n) || 0) * 10) / 10;
    return String(v).replace('.', ',');
  }

  window.aidaObreCategories = function () {
    if (typeof notesContext === 'undefined' || !notesContext.materia) {
      showToast('Obre primer una assignatura', 'error'); return;
    }
    _esborrany = _cats().map(function (c) { return { id: c.id, nom: c.nom, pes: parseFloat(c.pes) || 0 }; });
    _assigna = {};
    notesItems.forEach(function (it) { _assigna[String(it.id)] = _catDe(it); });
    _montaQuadre();
    document.getElementById('aidaCatsOverlay').classList.add('open');
    _pintaQuadre();
  };

  window.aidaTancaCategories = function () {
    var o = document.getElementById('aidaCatsOverlay');
    if (o) o.classList.remove('open');
  };

  function _montaQuadre() {
    if (document.getElementById('aidaCatsOverlay')) return;
    var o = document.createElement('div');
    o.className = 'modal-overlay';
    o.id = 'aidaCatsOverlay';
    o.addEventListener('click', function (ev) { if (ev.target === o) aidaTancaCategories(); });
    o.innerHTML =
      '<div class="modal aida-cats-modal" role="dialog" aria-modal="true" aria-labelledby="aidaCatsTitol">' +
        '<div class="modal-header">' +
          '<div>' +
            '<div class="modal-header-title" id="aidaCatsTitol">Categories de la nota</div>' +
            '<div class="modal-header-sub" id="aidaCatsSub"></div>' +
          '</div>' +
          '<button class="modal-close" aria-label="Tancar" title="Tancar" onclick="aidaTancaCategories()">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>' +
        '</div>' +
        '<div class="modal-body" id="aidaCatsCos"></div>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-secondary" onclick="aidaTancaCategories()">Cancel·lar</button>' +
          '<button class="btn btn-primary" id="aidaCatsDesa" onclick="aidaDesaCategories()">Desar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(o);
  }

  function _pintaQuadre() {
    var sub = document.getElementById('aidaCatsSub');
    if (sub) {
      sub.textContent = (MATERIES[notesContext.materia] || notesContext.materia) + ' · ' +
                        getTrimLabel(parseInt(notesContext.trimestre));
    }
    var cos = document.getElementById('aidaCatsCos');
    if (!cos) return;

    var suma = _esborrany.reduce(function (a, c) { return a + (parseFloat(c.pes) || 0); }, 0);
    var h = '';

    h += '<p class="aida-ajuda">Cada categoria té un <strong>%</strong> del total. Dins de cada una ' +
         'hi poses les activitats que vulguis, i entre elles fan mitjana. Una categoria que encara no ' +
         'tingui cap nota no compta: el seu % es reparteix entre les altres.</p>';

    h += '<div class="aida-cats-llista">';
    if (!_esborrany.length) {
      h += '<p class="aida-buit">Encara no hi ha cap categoria. Afegeix-ne una per començar.</p>';
    }
    _esborrany.forEach(function (c, i) {
      h += '<div class="aida-cat-fila">' +
             '<input class="modal-input" type="text" maxlength="40" value="' + escapeHtml(c.nom) + '" ' +
               'aria-label="Nom de la categoria ' + (i + 1) + '" placeholder="Ex: C. Lectora" ' +
               'oninput="aidaCanviaCat(' + i + ',\'nom\',this.value)">' +
             '<div class="aida-cat-pes-camp">' +
               '<input class="modal-input" type="number" min="0" max="100" step="1" value="' + (parseFloat(c.pes) || 0) + '" ' +
                 'aria-label="Percentatge de ' + escapeHtml(c.nom || ('la categoria ' + (i + 1))) + '" ' +
                 'oninput="aidaCanviaCat(' + i + ',\'pes\',this.value)"><span>%</span>' +
             '</div>' +
             '<button type="button" class="aida-cat-fora" title="Treure aquesta categoria" ' +
               'aria-label="Treure la categoria ' + escapeHtml(c.nom || String(i + 1)) + '" ' +
               'onclick="aidaTreuCat(' + i + ')">' +
               '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
             '</button>' +
           '</div>';
    });
    h += '</div>';

    h += '<div class="aida-cats-peu">' +
           '<button type="button" class="btn btn-ghost" onclick="aidaAfegeixCat()">' +
             '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M12 5v14M5 12h14"/></svg>' +
             'Afegir categoria</button>' +
           '<div class="aida-suma-gran' + (Math.round(suma) === 100 ? ' be' : ' malament') + '">' +
             'Suma: ' + _num(suma) + '%' +
             (Math.round(suma) === 100 ? '' : ' · hauria de sumar 100') +
           '</div>' +
         '</div>';

    if (_esborrany.length && notesItems.length) {
      h += '<div class="aida-assig">' +
             '<div class="modal-label">De quina categoria és cada activitat</div>';
      notesItems.forEach(function (it) {
        var actual = _assigna[String(it.id)] || '';
        h += '<div class="aida-assig-fila">' +
               '<span class="aida-assig-nom">' + escapeHtml(it.nom) + '</span>' +
               '<select class="modal-input" aria-label="Categoria de ' + escapeHtml(it.nom) + '" ' +
                 'onchange="aidaAssigna(\'' + escapeHtml(String(it.id)) + '\',this.value)">' +
                 '<option value=""' + (actual ? '' : ' selected') + '>— sense categoria —</option>' +
                 _esborrany.map(function (c) {
                   return '<option value="' + escapeHtml(c.id) + '"' + (actual === c.id ? ' selected' : '') + '>' +
                          escapeHtml(c.nom || 'sense nom') + '</option>';
                 }).join('') +
               '</select>' +
             '</div>';
      });
      h += '<p class="aida-ajuda petita">Una activitat sense categoria <strong>no compta</strong> per a la ' +
           'nota, tret que les categories sumin menys de 100: llavors s\'emporta el que queda.</p>' +
           '</div>';
    }

    cos.innerHTML = h;
  }

  window.aidaCanviaCat = function (i, camp, valor) {
    if (!_esborrany[i]) return;
    _esborrany[i][camp] = camp === 'pes' ? (parseFloat(valor) || 0) : valor;
    // Només es repinta el marcador de la suma: repintar-ho tot li trauria el
    // cursor de la casella mentre escriu.
    var suma = _esborrany.reduce(function (a, c) { return a + (parseFloat(c.pes) || 0); }, 0);
    var m = document.querySelector('#aidaCatsCos .aida-suma-gran');
    if (m) {
      m.textContent = 'Suma: ' + _num(suma) + '%' + (Math.round(suma) === 100 ? '' : ' · hauria de sumar 100');
      m.className = 'aida-suma-gran' + (Math.round(suma) === 100 ? ' be' : ' malament');
    }
  };

  window.aidaAfegeixCat = function () {
    _esborrany.push({ id: _idNou(), nom: '', pes: 0 });
    _pintaQuadre();
    var caselles = document.querySelectorAll('#aidaCatsCos .aida-cat-fila input[type=text]');
    if (caselles.length) caselles[caselles.length - 1].focus();
  };

  window.aidaTreuCat = function (i) {
    var c = _esborrany[i];
    if (!c) return;
    var quantes = 0;
    Object.keys(_assigna).forEach(function (k) { if (_assigna[k] === c.id) quantes++; });
    var avis = quantes
      ? 'Treure «' + (c.nom || 'sense nom') + '»? Les ' + quantes + ' activitats que hi ha a dins ' +
        'no s\'esborren, però es quedaran sense categoria fins que les posis en una altra.'
      : 'Treure «' + (c.nom || 'sense nom') + '»?';
    if (!confirm(avis)) return;
    Object.keys(_assigna).forEach(function (k) { if (_assigna[k] === c.id) _assigna[k] = ''; });
    _esborrany.splice(i, 1);
    _pintaQuadre();
  };

  window.aidaAssigna = function (itemId, catId) { _assigna[String(itemId)] = catId || ''; };

  window.aidaDesaCategories = async function () {
    var btn = document.getElementById('aidaCatsDesa');

    for (var i = 0; i < _esborrany.length; i++) {
      if (!(_esborrany[i].nom || '').trim()) {
        showToast('Totes les categories han de tenir un nom', 'error'); return;
      }
      var p = parseFloat(_esborrany[i].pes);
      if (isNaN(p) || p < 0) { showToast('El % d\'una categoria no pot ser negatiu', 'error'); return; }
    }
    var noms = _esborrany.map(function (c) { return c.nom.trim().toLowerCase(); });
    for (var j = 0; j < noms.length; j++) {
      if (noms.indexOf(noms[j]) !== j) {
        showToast('Hi ha dues categories que es diuen «' + _esborrany[j].nom.trim() + '»', 'error'); return;
      }
    }

    var cats = _esborrany.map(function (c) {
      return { id: c.id, nom: c.nom.trim(), pes: parseFloat(c.pes) || 0 };
    });
    var suma = cats.reduce(function (a, c) { return a + c.pes; }, 0);

    if (!config.scriptUrl) { showToast('Connecta l\'app abans de desar les categories', 'error'); return; }

    if (btn) { btn.disabled = true; btn.textContent = 'Desant…'; }
    try {
      var ctx = notesContext;
      var r = await appsScriptPost({
        action: 'saveNotaCats',
        materia: ctx.materia,
        trimestre: String(ctx.trimestre),
        grup: ctx.grup || null,
        cats: cats,
        assign: _assigna,
      });
      if (!r || !r.ok) throw new Error((r && r.error) || 'El servidor no ho ha pogut desar');

      _desaMemoria(_clau(ctx.materia, ctx.trimestre, ctx.grup),
                   { cats: cats, actitudCat: _assigna['actitud_ref'] || '' });
      notesItems.forEach(function (it) {
        if (it.id !== 'actitud_ref') it.cat = _assigna[String(it.id)] || '';
      });
      notesItems = sortCarpetaLast(notesItems);

      aidaTancaCategories();
      renderNotesTable();
      showToast(suma === 100 ? 'Categories desades' :
                'Categories desades, però sumen ' + _num(suma) + '% i no 100', suma === 100 ? 'success' : 'info');
      // El full ha recalculat totes les mitjanes: que el cache no digui el contrari.
      if (typeof syncNotes === 'function') syncNotes();
    } catch (e) {
      showToast('No s\'han pogut desar: ' +
                (typeof errorHuma === 'function' ? errorHuma(e) : (e && e.message) || ''), 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Desar'; }
    }
  };

  /* ---------- 7. El botó, per si encara no hi ha cap categoria ---------- */
  /* Quan no n'hi ha cap, la fila de categories no es pinta i no hi hauria per
     on començar. El botó va al costat de «Nou ítem» i hi és sempre. */
  function _posaBoto() {
    var zona = document.querySelector('#page-notes .notes-header-actions');
    if (!zona || document.getElementById('aidaBtnCats')) return;
    var b = document.createElement('button');
    b.className = 'btn btn-ghost';
    b.id = 'aidaBtnCats';
    b.type = 'button';
    b.title = 'Repartir la nota en categories amb un % (com el quadern)';
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' +
      '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>' +
      '<rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>Categories';
    b.onclick = function () { aidaObreCategories(); };
    var primari = zona.querySelector('.btn-primary');
    if (primari) zona.insertBefore(b, primari); else zona.appendChild(b);
  }

  /* ---------- 8. Estils ---------- */
  function _posaEstils() {
    if (document.getElementById('aidaCatsEstils')) return;
    var s = document.createElement('style');
    s.id = 'aidaCatsEstils';
    s.textContent = [
      /* Fila de categories, a sobre de la d'activitats */
      '.notes-table thead tr.aida-fila-cats th { border-bottom: 1px solid var(--border); }',
      '.aida-th-cats-nom { z-index: 4; padding: 6px 14px; }',
      '.aida-th-cat { padding: 0; text-align: center; background: var(--surface-tint, var(--surface-alt)); }',
      '.aida-th-cat.buida { background: var(--surface-alt); }',
      '.aida-cat-cap { width: 100%; border: 0; background: none; cursor: pointer; font: inherit;',
      '  display: flex; align-items: center; justify-content: center; gap: 8px; padding: 9px 10px; }',
      '.aida-cat-cap:hover .aida-cat-nom { text-decoration: underline; }',
      '.aida-cat-cap:focus-visible { outline: 2px solid var(--garnet, #7A1E2E); outline-offset: -2px; }',
      '.aida-cat-nom { font-size: 12px; font-weight: 700; color: var(--text-main);',
      '  letter-spacing: 0.02em; text-transform: uppercase; }',
      '.aida-cat-pes { font-size: 11px; font-weight: 700; color: #7A1E2E; background: #FBEAED;',
      '  border-radius: 999px; padding: 1px 8px; }',
      '.aida-th-cat.sense .aida-cat-nom { color: var(--text-muted); font-style: italic; text-transform: none; }',
      '.aida-th-cat.sense .aida-cat-pes { color: #92400E; background: #FEF3C7; }',
      '.aida-btn-cats { border: 0; background: none; cursor: pointer; font: inherit; color: var(--text-sub);',
      '  display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600;',
      '  letter-spacing: 0.05em; text-transform: uppercase; padding: 4px 0; }',
      '.aida-btn-cats:hover { color: var(--text-main); }',
      '.aida-suma { font-size: 11px; font-weight: 700; border-radius: 999px; padding: 1px 7px;',
      '  background: #D1FAE5; color: #065F46; letter-spacing: 0; }',
      '.aida-suma.malament { background: #FEF3C7; color: #92400E; }',
      '.aida-th-total .notes-th-item-nom { font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; }',
      '.aida-llegenda { font-size: 11.5px; color: var(--text-muted); font-style: italic; line-height: 1.5; }',
      '.aida-td-total, .aida-th-total { background: var(--surface-alt); }',
      /* Quadre de categories */
      '.aida-cats-modal { max-width: 620px; }',
      '.aida-ajuda { font-size: 12.5px; color: var(--text-sub); line-height: 1.55; margin: 0 0 14px; }',
      '.aida-ajuda.petita { font-size: 12px; margin: 10px 0 0; }',
      '.aida-buit { font-size: 13px; color: var(--text-muted); font-style: italic; margin: 4px 0 0; }',
      '.aida-cat-fila { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }',
      '.aida-cat-fila > input[type=text] { flex: 1 1 auto; }',
      '.aida-cat-pes-camp { display: flex; align-items: center; gap: 4px; flex: 0 0 96px; }',
      '.aida-cat-pes-camp input { width: 70px; text-align: right; }',
      '.aida-cat-pes-camp span { font-size: 12px; color: var(--text-sub); font-weight: 600; }',
      '.aida-cat-fora { flex: 0 0 auto; width: 34px; height: 34px; border-radius: 9px; cursor: pointer;',
      '  border: 1px solid var(--border); background: var(--surface); color: var(--text-muted);',
      '  display: flex; align-items: center; justify-content: center; }',
      '.aida-cat-fora svg { width: 15px; height: 15px; }',
      '.aida-cat-fora:hover { border-color: #FCA5A5; color: #B91C1C; background: #FEF2F2; }',
      '.aida-cats-peu { display: flex; align-items: center; justify-content: space-between; gap: 12px;',
      '  margin-top: 6px; flex-wrap: wrap; }',
      '.aida-suma-gran { font-size: 12.5px; font-weight: 700; border-radius: 999px; padding: 5px 12px; }',
      '.aida-suma-gran.be { background: #D1FAE5; color: #065F46; }',
      '.aida-suma-gran.malament { background: #FEF3C7; color: #92400E; }',
      '.aida-assig { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border); }',
      '.aida-assig-fila { display: flex; gap: 10px; align-items: center; margin-top: 8px; }',
      '.aida-assig-nom { flex: 1 1 auto; font-size: 13px; color: var(--text-main);',
      '  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
      '.aida-assig-fila select { flex: 0 0 210px; }',
      '@media (max-width: 640px) {',
      '  .aida-cat-fila { flex-wrap: wrap; }',
      '  .aida-cat-fila > input[type=text] { flex: 1 1 100%; }',
      '  .aida-assig-fila { flex-wrap: wrap; }',
      '  .aida-assig-fila select { flex: 1 1 100%; }',
      '}',
      '@media (prefers-reduced-motion: reduce) { .aida-cat-cap, .aida-cat-fora { transition: none; } }',
    ].join('\n');
    document.head.appendChild(s);
  }

  function _arrenca() { _posaEstils(); _posaBoto(); _vigilaQuadreRubrica(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _arrenca);
  else _arrenca();
})();


/* ============================================================
   L'AVÍS DE L'INICI
   ------------------------------------------------------------
   La targeta vermella de sobre «Possibles actualitzacions». El
   text viu a l'index.html; aquí només hi diu QUIN avís toca.

   Aquesta app el té perquè ha fet servir l'assistent i se li ha de
   dir que ja no hi és. Una app nova no neix amb aquesta línia: no
   té sentit donar l'adéu a una eina que no ha tingut mai.

   Quan la mestra el marqui com a llegit, no li tornarà a sortir
   (es desa al seu perfil i per tant també al mòbil). Aquesta línia
   es pot treure d'aquí quan ja faci temps que el va llegir.
   ============================================================ */
window.AVIS_INICI = 'adeu-assistent';

const orden = [1, 2, 3, 4, 5, 6];
const movimientoReducido = matchMedia('(prefers-reduced-motion: reduce)');
const estantes = document.querySelector('[data-shelves]');
const semestres = document.querySelector('[data-semesters]');
const materias = document.querySelector('[data-subject]');
const contador = document.querySelector('[data-count]');

function imagen(libro, pagina = 'portada') {
  return `assets/libros/${libro.id}/${pagina}.webp`;
}

semestres.innerHTML = `<button type="button" data-semester="" aria-pressed="true">Todos</button>` +
  orden.map(n => `<button type="button" data-semester="${n}" aria-label="${n}.º semestre" aria-pressed="false">${n}.º</button>`).join('');

const nombresMaterias = [...new Set(LIBROS.map(libro => libro.materia))].sort((a, b) => a.localeCompare(b, 'es'));
materias.append(...nombresMaterias.map(nombre => new Option(nombre, nombre)));

estantes.innerHTML = orden.map(n => `
  <section class="shelf grid" data-shelf="${n}" aria-labelledby="semestre-${n}">
    <h2 id="semestre-${n}"><span class="num">${n}.º</span><span class="word">semestre</span></h2>
    <ul class="books" hidden>${LIBROS.filter(libro => libro.semestre === n).map(libro => `
      <li data-book="${libro.id}">
        <button type="button" class="book" aria-haspopup="dialog">
          <span class="stage"><span class="page-under" aria-hidden="true"></span>
            <img class="cover" src="${imagen(libro)}" alt="" loading="lazy" decoding="async">
          </span>
          <span class="name">${libro.titulo}</span>
          ${libro.subtitulo ? `<span class="facts">${libro.subtitulo}</span>` : ''}
        </button>
      </li>`).join('')}</ul>
    <p class="empty" hidden></p>
  </section>`).join('');

const repisas = [...estantes.querySelectorAll('[data-shelf]')];
const fichas = new Map(LIBROS.map(libro => [libro.id, libro]));
let semestreElegido = '';

function aplicarFiltros(animar = false) {
  let total = 0;
  for (const repisa of repisas) {
    const lista = repisa.querySelector('ul');
    const vacio = repisa.querySelector('.empty');
    const corresponde = !semestreElegido || repisa.dataset.shelf === semestreElegido;
    let visibles = 0;
    for (const li of lista.children) {
      const libro = fichas.get(li.dataset.book);
      li.hidden = Boolean(materias.value && libro.materia !== materias.value);
      if (!li.hidden) visibles++;
    }
    if (corresponde) total += visibles;
    const antesOculta = repisa.hidden;
    repisa.hidden = !corresponde || (!semestreElegido && Boolean(materias.value) && !visibles);
    repisa.classList.toggle('is-entering', animar && antesOculta && !repisa.hidden);
    lista.hidden = !visibles;
    vacio.hidden = Boolean(visibles);
    vacio.textContent = lista.children.length ? 'No hay muestras de esta materia en este semestre.' : 'Todavía no hay muestras disponibles.';
  }
  contador.textContent = `${total} ${total === 1 ? 'libro' : 'libros'}`;
}

semestres.addEventListener('click', event => {
  const boton = event.target.closest('[data-semester]');
  if (!boton) return;
  semestreElegido = boton.dataset.semester;
  for (const opcion of semestres.children) opcion.setAttribute('aria-pressed', opcion === boton);
  aplicarFiltros(true);
});
materias.addEventListener('change', () => aplicarFiltros(true));
estantes.addEventListener('click', event => {
  const boton = event.target.closest('.book');
  if (boton) abrirLibro(fichas.get(boton.closest('[data-book]').dataset.book), boton);
});
aplicarFiltros();

if (matchMedia('(hover: none)').matches && !movimientoReducido.matches) {
  const vistazo = new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.classList.toggle('is-peek', entry.isIntersecting);
  }, { rootMargin: '-40% 0px -40% 0px' });
  for (const boton of estantes.querySelectorAll('.book')) vistazo.observe(boton);
}

const visor = document.querySelector('[data-overlay]');
const panel = visor.querySelector('.panel');
const cerrar = visor.querySelector('[data-close]');
const hojas = visor.querySelector('[data-pager]');
const hoja = visor.querySelector('[data-page]');
const paginaSelect = visor.querySelector('[data-page-picker]');
const anterior = visor.querySelector('[data-prev]');
const siguiente = visor.querySelector('[data-next]');
const ampliar = visor.querySelector('[data-expand]');
const estado = visor.querySelector('[data-page-status]');
let libroAbierto;
let pagina = 0;
let hashAnterior = '';
let hojaAnimada;

function mostrarPagina(numero) {
  if (numero < 1 || numero > libroAbierto.paginas || numero === pagina) return;
  const avanzar = numero > pagina;
  hojaAnimada?.remove();
  if (pagina && hoja.complete && hoja.naturalWidth && !movimientoReducido.matches) {
    const saliente = hoja.cloneNode();
    saliente.removeAttribute('data-page');
    saliente.setAttribute('aria-hidden', 'true');
    saliente.classList.add('turning');
    saliente.style.transformOrigin = avanzar ? 'left center' : 'right center';
    hojaAnimada = saliente;
    hojas.append(saliente);
    saliente.animate(
      [{ transform: 'rotateY(0deg)' }, { transform: `rotateY(${avanzar ? -135 : 135}deg)` }],
      { duration: 480, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
    ).onfinish = () => saliente.remove();
  }
  pagina = numero;
  const url = imagen(libroAbierto, pagina);
  hoja.alt = pagina === 1 ? `Portada de ${libroAbierto.titulo}` : `Página ${pagina} de la muestra`;
  hoja.src = url;
  ampliar.href = url;
  paginaSelect.value = pagina;
  estado.textContent = `Página ${pagina} de ${libroAbierto.paginas}`;
  // Conserva un destino de teclado cuando se alcanza un extremo.
  if ((pagina === 1 && document.activeElement === anterior) ||
      (pagina === libroAbierto.paginas && document.activeElement === siguiente)) paginaSelect.focus();
  anterior.disabled = pagina === 1;
  siguiente.disabled = pagina === libroAbierto.paginas;
  if (pagina < libroAbierto.paginas) new Image().src = imagen(libroAbierto, pagina + 1);
}

function abrirLibro(libro, desde) {
  const portada = desde?.querySelector('.cover').getBoundingClientRect();
  libroAbierto = libro;
  pagina = 0;
  hojaAnimada?.remove();
  gesto = undefined;
  hashAnterior = location.hash === `#${libro.id}` ? '' : location.hash;
  visor.querySelector('#v-title').textContent = libro.titulo;
  visor.querySelector('[data-v-facts]').textContent = `${libro.semestre}.º semestre · ${libro.paginas} páginas de muestra`;
  visor.querySelector('[data-v-summary]').textContent = libro.resumen;
  const descarga = visor.querySelector('[data-download]');
  descarga.href = `assets/libros/${libro.id}/muestra.pdf`;
  descarga.download = `DT5 - ${libro.titulo} (muestra).pdf`;
  visor.querySelector('[data-total]').textContent = `de ${libro.paginas}`;
  paginaSelect.replaceChildren(...Array.from({ length: libro.paginas }, (_, n) => new Option(n + 1, n + 1)));
  mostrarPagina(1);
  document.body.classList.add('is-locked');
  visor.showModal();
  panel.scrollTop = 0;
  if (portada && !movimientoReducido.matches) {
    const destino = hojas.getBoundingClientRect();
    hojas.animate([
      { transformOrigin: 'top left', transform: `translate(${portada.left - destino.left}px, ${portada.top - destino.top}px) scale(${portada.width / destino.width})` },
      { transformOrigin: 'top left', transform: 'none' },
    ], { duration: 540, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
  }
  history.replaceState(null, '', `#${libro.id}`);
}

function cerrarLibro() {
  if (visor.classList.contains('is-closing')) return;
  if (movimientoReducido.matches) {
    visor.close();
    return;
  }
  visor.classList.add('is-closing');
  Promise.allSettled(panel.getAnimations().map(animacion => animacion.finished)).then(() => visor.close());
}

cerrar.addEventListener('click', cerrarLibro);
visor.addEventListener('cancel', event => {
  event.preventDefault();
  cerrarLibro();
});
visor.addEventListener('close', () => {
  visor.classList.remove('is-closing');
  document.body.classList.remove('is-locked');
  history.replaceState(null, '', hashAnterior || location.pathname + location.search);
});
visor.addEventListener('click', event => {
  if (event.target === visor) cerrarLibro();
});
anterior.addEventListener('click', () => mostrarPagina(pagina - 1));
siguiente.addEventListener('click', () => mostrarPagina(pagina + 1));
paginaSelect.addEventListener('change', () => mostrarPagina(Number(paginaSelect.value)));
hoja.addEventListener('error', () => { estado.textContent = `No se pudo cargar la página ${pagina}.`; });

let gesto;
hojas.addEventListener('pointerdown', event => {
  if (event.isPrimary && event.button === 0) gesto = { x: event.clientX, y: event.clientY, id: event.pointerId };
});
hojas.addEventListener('pointercancel', () => { gesto = undefined; });
hojas.addEventListener('pointerup', event => {
  if (event.pointerId !== gesto?.id) return;
  const dx = event.clientX - gesto.x;
  const dy = event.clientY - gesto.y;
  gesto = undefined;
  if (Math.abs(dx) < Math.abs(dy) && Math.abs(dy) > 12) return;
  mostrarPagina(pagina + (dx > 38 ? -1 : 1));
});

visor.addEventListener('keydown', event => {
  if (event.target === paginaSelect) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    mostrarPagina(pagina + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});

const directo = fichas.get(location.hash.slice(1));
if (directo) abrirLibro(directo);

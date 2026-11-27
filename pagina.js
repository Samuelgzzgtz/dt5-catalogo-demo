const portadas = ['ciencias-naturales-ii', 'pensamiento-matematico-iv', 'temas-selectos-de-matematicas'];

document.querySelector('[data-editions]').innerHTML = portadas.map(id => {
  const libro = LIBROS.find(ficha => ficha.id === id);
  return `<li>
    <a href="catalogo.html#${libro.id}">
      <img class="cover" src="assets/libros/${libro.id}/portada.webp" alt="" loading="lazy" decoding="async">
      <span>${libro.semestre}.º semestre</span>
      <strong>${libro.titulo}</strong>
    </a>
  </li>`;
}).join('');

document.querySelector('[data-rows]').innerHTML = Array.from({ length: 6 }, (_, i) => {
  const semestre = i + 1;
  const cantidad = LIBROS.filter(libro => libro.semestre === semestre).length;
  const texto = cantidad ? `${cantidad} ${cantidad === 1 ? 'muestra' : 'muestras'}` : 'Sin muestras por ahora';
  return `<li><a href="catalogo.html#semestre-${semestre}">
    <strong>${semestre}.º semestre</strong><span>${texto} <span aria-hidden="true">↗</span></span>
  </a></li>`;
}).join('');

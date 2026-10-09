/* Corre antes da primeira pintura: decide se há introdução e estados iniciais das animações.
   Com «reduzir movimento» (ou sem JavaScript) o site aparece logo, completo e sem animações de entrada. */
(function () {
  var d = document.documentElement, reduce = false, seen = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  try { seen = sessionStorage.getItem('sb-intro-visto') === '1'; } catch (e) {}
  d.classList.add('js');
  if (reduce) return;
  d.classList.add('anim');
  if (!seen) d.classList.add('intro-on');
  /* Rede de segurança: se o módulo principal falhar, o conteúdo nunca fica escondido. */
  setTimeout(function () {
    d.classList.remove('anim');
    d.classList.remove('intro-on');
    d.style.overflow = '';
  }, 9000);
})();

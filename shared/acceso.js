// Acceso con correo y contraseña. El enlace por correo solo se usa para crear o recuperar la contraseña,
// así la app instalada en la pantalla de inicio funciona igual que en el navegador.
import { $, aviso, datosForm } from '/shared/ui.js';

export const pideCrearClave = () => new URLSearchParams(location.search).has('clave');

export function formAcceso(cont, db, ruta, { etiqueta = 'Tu correo' } = {}) {
  const entrar = () => {
    cont.innerHTML = `
      <form class="form" id="f-entrar">
        <label>${etiqueta}<input type="email" name="correo" required autocomplete="email" placeholder="tu@correo.com"></label>
        <label>Contraseña<input type="password" name="clave" required autocomplete="current-password" minlength="8"></label>
        <button class="btn btn-full btn-pill" type="submit">Entrar</button>
      </form>
      <button class="link acceso-alt" type="button" id="ir-clave">¿Primera vez o se te olvidó la contraseña?</button>`;
    $('#ir-clave', cont).onclick = crear;
    $('#f-entrar', cont).onsubmit = async e => {
      e.preventDefault(); const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = 'Entrando…';
      const d = datosForm(e.target);
      try { await db.entrarConClave(d.correo.trim(), d.clave); }
      catch { btn.disabled = false; btn.textContent = 'Entrar'; aviso('Correo o contraseña incorrectos. Si es tu primera vez, crea tu contraseña abajo.', 'error'); }
    };
  };
  const crear = () => {
    cont.innerHTML = `
      <div class="tarjeta acceso-paso">
        <p class="h3" style="margin:0 0 6px">Crea tu contraseña</p>
        <p class="suave" style="margin:0 0 16px">Te enviamos un enlace a tu correo. Lo abres, eliges tu contraseña y desde ahí entras siempre con ella, también desde la app instalada.</p>
        <form class="form" id="f-clave">
          <label>${etiqueta}<input type="email" name="correo" required autocomplete="email" placeholder="tu@correo.com"></label>
          <button class="btn btn-full btn-pill" type="submit">Enviarme el enlace</button>
        </form>
      </div>
      <button class="link acceso-alt" type="button" id="ir-entrar">Ya tengo contraseña</button>`;
    $('#ir-entrar', cont).onclick = entrar;
    $('#f-clave', cont).onsubmit = async e => {
      e.preventDefault(); const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = 'Enviando…';
      try {
        await db.enviarEnlace(datosForm(e.target).correo.trim(), ruta + '?clave=1');
        $('.acceso-paso', cont).innerHTML = `<p class="h3" style="margin:0 0 6px">Revisa tu correo</p>
          <p class="suave" style="margin:0">Abre el enlace que te enviamos. Se abrirá en el navegador: ahí creas tu contraseña y luego vuelves a la app para entrar con ella.</p>`;
      } catch { btn.disabled = false; btn.textContent = 'Enviarme el enlace'; aviso('No se pudo enviar. Revisa el correo o espera un minuto e intenta de nuevo.', 'error'); }
    };
  };
  entrar();
}

export function pantallaCrearClave(raiz, db, alTerminar) {
  raiz.innerHTML = `<main class="acceso"><div class="acceso-in">
    <img src="/img/vs-limitless-horizontal-claro.svg" alt="VS Limitless" width="214" height="64">
    <div><p class="eyebrow"><span class="punto"></span>Último paso</p><h1 class="h1">Elige tu<br><span class="tenue">contraseña.</span></h1></div>
    <form class="form" id="f-nueva">
      <label>Contraseña nueva<input type="password" name="clave" required minlength="8" autocomplete="new-password" placeholder="Mínimo 8 caracteres"></label>
      <label>Repítela<input type="password" name="clave2" required minlength="8" autocomplete="new-password"></label>
      <button class="btn btn-full btn-pill" type="submit">Guardar contraseña</button>
    </form>
  </div></main>`;
  $('#f-nueva').onsubmit = async e => {
    e.preventDefault(); const d = datosForm(e.target);
    if (d.clave !== d.clave2) return aviso('Las contraseñas no coinciden.', 'error');
    const btn = e.target.querySelector('button'); btn.disabled = true;
    try {
      await db.crearClave(d.clave);
      history.replaceState(null, '', location.pathname);
      $('.acceso-in').innerHTML = `<img src="/img/vs-limitless-horizontal-claro.svg" alt="VS Limitless" width="214" height="64">
        <div><p class="eyebrow"><span class="punto"></span>Listo</p><h1 class="h1">Contraseña<br><span class="tenue">guardada.</span></h1></div>
        <p class="suave">Si instalaste la app en tu pantalla de inicio, ábrela desde ahí y entra con tu correo y esta contraseña. Si no, puedes seguir aquí.</p>
        <button class="btn btn-full btn-pill" id="seguir">Continuar</button>`;
      $('#seguir').onclick = alTerminar;
    } catch (err) {
      btn.disabled = false;
      aviso(/same|different/i.test(err?.message || '') ? 'Esa ya es tu contraseña. Elige otra o entra con ella.' : 'No se pudo guardar. Intenta de nuevo.', 'error');
    }
  };
}

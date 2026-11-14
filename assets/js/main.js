/* Radhakrishna Lodge — static site behaviour. No dependencies. */
(() => {
  'use strict';

  // ---- Lodge details: edit here if rates or the WhatsApp number change ----
  const RATES = { double: 1700, single: 1500, extraBed: 300 }; // rupees per night
  const WHATSAPP_NUMBER = '919440497097'; // country code + number, digits only
  const LODGE_NAME = 'Radhakrishna Lodge';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const rupees = (n) => '₹' + n.toLocaleString('en-IN');

  $('#year').textContent = String(new Date().getFullYear());

  // ---------- Header: solid once the hero has scrolled away ----------
  const header = $('#site-header');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > window.innerHeight * 0.55);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- Hero: a 3D sea of tide lines drawn with WebGL ----------
  (function sea() {
    const canvas = $('#sea');
    const gl = canvas.getContext('webgl', { antialias: true, alpha: true });
    if (!gl) {
      canvas.classList.add('no-gl');
      return;
    }
    const ROWS = 64;
    const COLS = 110;
    const pts = new Float32Array(ROWS * (COLS + 1) * 2);
    let k = 0;
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i <= COLS; i++) {
        pts[k++] = (i / COLS) * 2 - 1; // across
        pts[k++] = Math.pow(j / (ROWS - 1), 1.35); // depth, denser near the viewer
      }
    }
    const vsSrc = `
      attribute vec2 p;
      uniform float t;
      uniform mat4 m;
      varying float d;
      void main() {
        float x = p.x * 17.0;
        float z = 3.0 - p.y * 30.0;
        float y = sin(x * 0.5 + t * 0.8 + z * 0.3) * 0.38
                + sin(x * 0.19 - t * 0.5 + z * 0.75) * 0.55
                + sin(z * 1.2 + t) * 0.1;
        gl_Position = m * vec4(x, y, z, 1.0);
        d = p.y;
      }`;
    const fsSrc = `
      precision mediump float;
      varying float d;
      void main() {
        vec3 near = vec3(0.86, 0.74, 0.50);
        vec3 far = vec3(0.55, 0.78, 0.70);
        float a = smoothstep(1.0, 0.45, d) * smoothstep(0.0, 0.06, d);
        gl_FragColor = vec4(mix(near, far, d), a * 0.62);
      }`;
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.classList.add('no-gl');
      return;
    }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, pts, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const uT = gl.getUniformLocation(prog, 't');
    const uM = gl.getUniformLocation(prog, 'm');

    const perspective = (fovy, aspect, near, far) => {
      const f = 1 / Math.tan(fovy / 2);
      return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0];
    };
    const norm = (v) => {
      const l = Math.hypot(v[0], v[1], v[2]) || 1;
      return [v[0] / l, v[1] / l, v[2] / l];
    };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const lookAt = (eye, center) => {
      const z = norm([eye[0] - center[0], eye[1] - center[1], eye[2] - center[2]]);
      const x = norm(cross([0, 1, 0], z));
      const y = cross(z, x);
      return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1];
    };
    const mul = (a, b) => {
      const o = new Array(16).fill(0);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) o[c * 4 + r] += a[i * 4 + r] * b[c * 4 + i];
      return o;
    };

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      if (!running) draw(6);
    };
    // The camera drifts slightly toward the pointer.
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    const draw = (t) => {
      cx += (tx - cx) * 0.04;
      cy += (ty - cy) * 0.04;
      const proj = perspective(0.9, w / h, 0.1, 80);
      const view = lookAt([cx * 2.2, 3.4 - cy * 0.8, 6.5], [cx * 0.6, 0.2, -9]);
      gl.uniformMatrix4fv(uM, false, new Float32Array(mul(proj, view)));
      gl.uniform1f(uT, t);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      for (let j = 0; j < ROWS; j++) gl.drawArrays(gl.LINE_STRIP, j * (COLS + 1), COLS + 1);
    };
    let running = false;
    let visible = true;
    let raf = 0;
    const loop = (ms) => {
      draw(ms / 1000);
      raf = requestAnimationFrame(loop);
    };
    const update = () => {
      const should = visible && !document.hidden && !reduceMotion;
      if (should && !running) {
        running = true;
        raf = requestAnimationFrame(loop);
      } else if (!should && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver((e) => {
      visible = e[0].isIntersecting;
      update();
    }).observe(canvas);
    document.addEventListener('visibilitychange', update);
    if (finePointer && !reduceMotion) {
      window.addEventListener(
        'pointermove',
        (e) => {
          tx = e.clientX / window.innerWidth - 0.5;
          ty = e.clientY / window.innerHeight - 0.5;
        },
        { passive: true },
      );
    }
    resize();
    update();
  })();

  // ---------- Hero photo stack: tilts toward the pointer ----------
  (function stack() {
    const tilt = $('.stack-tilt');
    const hero = $('.hero');
    if (!tilt || !finePointer || reduceMotion) return;
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.setProperty('--ry', (-12 + px * 22).toFixed(2) + 'deg');
      tilt.style.setProperty('--rx', (4 - py * 14).toFixed(2) + 'deg');
    });
    hero.addEventListener('pointerleave', () => {
      tilt.style.removeProperty('--ry');
      tilt.style.removeProperty('--rx');
    });
  })();

  // ---------- Tariff cards: 3D tilt under the pointer ----------
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.tilt').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.classList.add('is-active');
        card.style.setProperty('--ry', ((px - 0.5) * 14).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((0.5 - py) * 12).toFixed(2) + 'deg');
        card.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('is-active');
        card.style.removeProperty('--ry');
        card.style.removeProperty('--rx');
      });
    });
  }

  // ---------- Gallery: a ring of photos you can spin ----------
  (function ring() {
    const scene = $('#scene');
    const ringEl = $('#ring');
    const panels = [...ringEl.children];
    const n = panels.length;
    if (!n || !CSS.supports('transform-style', 'preserve-3d')) return;
    const step = 360 / n;
    let angle = 0; // degrees; the photo at index round(angle / step) faces the viewer
    let radius = 0;
    scene.classList.add('is-3d');
    $('#ring-controls').hidden = false;

    const current = () => ((Math.round(angle / step) % n) + n) % n;
    const render = () => {
      ringEl.style.transform = `translateZ(${-radius}px) rotateY(${-angle}deg)`;
      panels.forEach((p, i) => {
        let diff = Math.abs(((((i * step - angle) % 360) + 540) % 360) - 180);
        diff = Math.min(diff, 90);
        p.style.filter = `brightness(${(1 - (diff / 90) * 0.62).toFixed(3)})`;
        p.setAttribute('aria-hidden', i === current() ? 'false' : 'true');
      });
      const i = current();
      $('#ring-caption').textContent = panels[i].querySelector('figcaption').textContent;
      $('#ring-count').textContent = `Photo ${i + 1} of ${n}`;
    };
    const layout = () => {
      const w = ringEl.offsetWidth;
      radius = Math.round(w / 2 / Math.tan(Math.PI / n)) + Math.round(w * 0.07);
      panels.forEach((p, i) => {
        p.style.transform = `rotateY(${i * step}deg) translateZ(${radius}px)`;
      });
      render();
    };
    const go = (dir) => {
      angle = (Math.round(angle / step) + dir) * step;
      render();
    };
    $('#ring-prev').addEventListener('click', () => go(-1));
    $('#ring-next').addEventListener('click', () => go(1));
    $('#gallery').addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    });

    // Drag or swipe to spin; snaps to the nearest photo on release.
    let startX = 0;
    let startAngle = 0;
    let dragging = false;
    scene.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      startAngle = angle;
      scene.classList.add('dragging');
      scene.setPointerCapture(e.pointerId);
    });
    scene.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const perPx = step / (ringEl.offsetWidth * 0.75);
      angle = startAngle - (e.clientX - startX) * perPx;
      render();
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      scene.classList.remove('dragging');
      angle = Math.round(angle / step) * step;
      render();
    };
    scene.addEventListener('pointerup', end);
    scene.addEventListener('pointercancel', end);
    new ResizeObserver(layout).observe(ringEl);
    layout();
  })();

  // ---------- Availability slip: estimate + WhatsApp message ----------
  (function enquiry() {
    const form = $('#enquiry');
    const fIn = $('#f-in');
    const fOut = $('#f-out');
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const addDays = (iso, d) => new Date(Date.parse(iso + 'T00:00:00Z') + d * 86400000).toISOString().slice(0, 10);
    const nightsBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
    const pretty = (iso) =>
      new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
        new Date(iso + 'T00:00:00Z'),
      );
    const num = (id) => Math.max(0, Math.min(20, parseInt($(id).value, 10) || 0));
    fIn.min = today;
    fOut.min = addDays(today, 1);

    const read = () => {
      const doubles = num('#f-double');
      const singles = num('#f-single');
      const beds = num('#f-beds');
      const valid = fIn.value && fOut.value && nightsBetween(fIn.value, fOut.value) >= 1;
      const nights = valid ? nightsBetween(fIn.value, fOut.value) : 0;
      const perNight = doubles * RATES.double + singles * RATES.single + beds * RATES.extraBed;
      return { doubles, singles, beds, nights, perNight, total: perNight * nights };
    };
    const line = (label, amount) => `<p><span>${label}</span><span>${rupees(amount)}</span></p>`;
    const renderEstimate = () => {
      const s = read();
      const lines = $('#estimate-lines');
      if (!s.nights) {
        lines.innerHTML = '<p class="muted">Choose your dates to see an estimate.</p>';
        $('#estimate-total').textContent = rupees(0);
        return;
      }
      const nn = `${s.nights} night${s.nights > 1 ? 's' : ''}`;
      let html = '';
      if (s.doubles) html += line(`${s.doubles} room${s.doubles > 1 ? 's' : ''} for two × ${nn}`, s.doubles * RATES.double * s.nights);
      if (s.singles) html += line(`${s.singles} single room${s.singles > 1 ? 's' : ''} × ${nn}`, s.singles * RATES.single * s.nights);
      if (s.beds) html += line(`${s.beds} extra bed${s.beds > 1 ? 's' : ''} × ${nn}`, s.beds * RATES.extraBed * s.nights);
      lines.innerHTML = html || '<p class="muted">Add at least one room.</p>';
      $('#estimate-total').textContent = rupees(s.total);
    };

    form.querySelectorAll('.stepper').forEach((st) => {
      const input = st.querySelector('input');
      const [minus, plus] = st.querySelectorAll('button');
      const set = (v) => {
        input.value = String(Math.max(Number(st.dataset.min), Math.min(Number(st.dataset.max), v)));
        renderEstimate();
      };
      minus.addEventListener('click', () => set((parseInt(input.value, 10) || 0) - 1));
      plus.addEventListener('click', () => set((parseInt(input.value, 10) || 0) + 1));
      input.addEventListener('change', () => set(parseInt(input.value, 10) || 0));
    });
    fIn.addEventListener('change', () => {
      if (fIn.value) {
        fOut.min = addDays(fIn.value, 1);
        if (!fOut.value || fOut.value <= fIn.value) fOut.value = addDays(fIn.value, 1);
      }
      renderEstimate();
    });
    fOut.addEventListener('change', renderEstimate);

    const setError = (input, id, msg) => {
      $(id).textContent = msg;
      if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      return Boolean(msg);
    };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const s = read();
      const name = $('#f-name').value.trim();
      let firstBad = null;
      const check = (input, id, msg) => {
        if (setError(input, id, msg) && !firstBad) firstBad = input;
      };
      check(fIn, '#e-in', !fIn.value ? 'Choose a check-in date' : fIn.value < today ? 'Check-in cannot be in the past' : '');
      check(fOut, '#e-out', !fOut.value ? 'Choose a check-out date' : fIn.value && fOut.value <= fIn.value ? 'Check-out must be after check-in' : '');
      check($('#f-double'), '#e-rooms', s.doubles + s.singles < 1 ? 'Add at least one room' : '');
      check($('#f-name'), '#e-name', name.length < 2 ? 'Enter your name' : '');
      if (firstBad) {
        firstBad.focus();
        return;
      }
      const msg = [
        `Hello ${LODGE_NAME}, I would like to check availability.`,
        `Name: ${name}`,
        `Check-in: ${pretty(fIn.value)}`,
        `Check-out: ${pretty(fOut.value)} (${s.nights} night${s.nights > 1 ? 's' : ''})`,
        s.doubles ? `Rooms for two guests: ${s.doubles}` : '',
        s.singles ? `Single rooms: ${s.singles}` : '',
        s.beds ? `Extra beds: ${s.beds}` : '',
        `Estimate shown on website: ${rupees(s.total)}`,
      ]
        .filter(Boolean)
        .join('\n');
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    });
    renderEstimate();
  })();

  // ---------- Mobile bar: step aside while the form is on screen ----------
  const bar = $('.mobile-bar');
  new IntersectionObserver((entries) => bar.classList.toggle('is-hidden', entries[0].isIntersecting), { threshold: 0.15 }).observe($('#enquiry'));
})();

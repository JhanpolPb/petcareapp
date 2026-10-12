// Genera "Manual de usuario - PetCareApp.pdf" a partir de manual.html.
// Uso (desde la raíz del proyecto):  node docs/manual/construir.mjs
// Requiere Microsoft Edge (o Chrome) instalado y las dependencias del frontend (client/node_modules).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aqui, '..', '..');
const require = createRequire(path.join(raiz, 'client', 'package.json'));
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const iconos = require('lucide-react');

// Íconos de la app (lucide-react), en el color del texto que los rodea
const icono = (nombre) => {
  const I = iconos[nombre];
  if (!I) throw new Error(`Ícono desconocido: ${nombre}`);
  return renderToStaticMarkup(React.createElement(I, { size: 13, strokeWidth: 2, 'aria-hidden': true }))
    .replace('<svg', '<svg style="vertical-align:-2px"');
};

// Huella del logo (misma forma que el favicon de la app, con dedos y almohadilla redondeados)
const huella = (color) => `
  <path fill="${color}" d="M32 30.5c-6.3 0-13.2 7.6-13.2 13.4 0 3.9 2.9 5.9 6.6 5.9 2.6 0 4.3-1.2 6.6-1.2s4 1.2 6.6 1.2c3.7 0 6.6-2 6.6-5.9 0-5.8-6.9-13.4-13.2-13.4z"/>
  <ellipse fill="${color}" cx="18.6" cy="27.6" rx="4.7" ry="5.9" transform="rotate(-24 18.6 27.6)"/>
  <ellipse fill="${color}" cx="26.4" cy="18.6" rx="4.8" ry="6.2" transform="rotate(-8 26.4 18.6)"/>
  <ellipse fill="${color}" cx="37.6" cy="18.6" rx="4.8" ry="6.2" transform="rotate(8 37.6 18.6)"/>
  <ellipse fill="${color}" cx="45.4" cy="27.6" rx="4.7" ry="5.9" transform="rotate(24 45.4 27.6)"/>`;

const logo = `
<svg viewBox="0 0 330 72" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="PetCareApp">
  <defs>
    <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#14877e"/><stop offset="1" stop-color="#0b5a54"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="68" height="68" rx="18" fill="url(#lg)"/>
  <g transform="translate(4 3) scale(1)">${huella('#ffffff')}</g>
  <text x="86" y="48" font-family="Nunito, 'Segoe UI', sans-serif" font-size="34" font-weight="800" letter-spacing="-0.5" fill="#1f2a2e">PetCare<tspan fill="#0f766e">App</tspan></text>
</svg>`;

const huellaPortada = `<svg class="portada-huella" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${huella('#ffffff')}</svg>`;

// Diagrama de estados de citas y servicios
const diagrama = (() => {
  const W = 132, H = 34, c1 = 225, c2 = 420, c3 = 615;
  const caja = (cx, cy, txt, pendiente) => `
    <rect x="${cx - W / 2}" y="${cy - H / 2}" width="${W}" height="${H}" rx="9" fill="${pendiente ? '#e3f3f0' : '#ffffff'}" stroke="${pendiente ? '#0f766e' : '#c9c1b3'}" stroke-width="${pendiente ? 1.6 : 1.1}"/>
    <text x="${cx}" y="${cy + 4.5}" text-anchor="middle" font-family="Nunito, sans-serif" font-size="12.5" font-weight="${pendiente ? 800 : 700}" fill="${pendiente ? '#0b5a54' : '#1f2a2e'}">${txt}</text>`;
  const flecha = (d) => `<path d="${d}" fill="none" stroke="#8a9397" stroke-width="1.2" marker-end="url(#fl)"/>`;
  const rotulo = (x, y, t, anchor = 'middle') => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="'Source Sans 3', sans-serif" font-size="10.5" fill="#5f6b70">${t}</text>`;
  return `
<svg viewBox="0 0 700 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Estados de citas y servicios" style="display:block;width:100%;height:auto;background:#fbfaf7;border:0.3mm solid #e3dccf;border-radius:2.5mm">
  <defs><marker id="fl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#8a9397"/></marker></defs>
  <text x="24" y="58" font-family="Nunito, sans-serif" font-size="12.5" font-weight="800" fill="#0f766e">CITA</text>
  <text x="24" y="74" font-family="'Source Sans 3', sans-serif" font-size="10.5" fill="#5f6b70">veterinaria</text>
  ${flecha(`M${c1 + W / 2} 62H${c2 - W / 2}`)}
  ${flecha(`M${c1} ${62 + H / 2}V112H${c2 - W / 2}`)}
  ${caja(c1, 62, 'Programada', true)}${caja(c2, 62, 'Atendida', false)}${caja(c2, 112, 'Cancelada', false)}
  ${rotulo((c1 + c2) / 2, 55, 'se atiende')}${rotulo(c1 + 70, 106, 'se cancela')}
  <line x1="24" x2="676" y1="152" y2="152" stroke="#e3dccf"/>
  <text x="24" y="194" font-family="Nunito, sans-serif" font-size="12.5" font-weight="800" fill="#0f766e">SERVICIO</text>
  <text x="24" y="210" font-family="'Source Sans 3', sans-serif" font-size="10.5" fill="#5f6b70">de peluquería</text>
  ${flecha(`M${c1 + W / 2} 198H${c2 - W / 2}`)}
  ${flecha(`M${c2 + W / 2} 198H${c3 - W / 2}`)}
  ${flecha(`M${c1} ${198 + H / 2}V250H${c2 - W / 2}`)}
  ${flecha(`M${c2} ${198 + H / 2}V${250 - H / 2}`)}
  ${caja(c1, 198, 'Solicitado', true)}${caja(c2, 198, 'Confirmado', true)}${caja(c3, 198, 'Realizado', false)}${caja(c2, 250, 'Cancelado', false)}
  ${rotulo((c1 + c2) / 2, 191, 'se confirma')}${rotulo((c2 + c3) / 2, 191, 'se realiza')}${rotulo(c1 + 70, 244, 'se cancela')}${rotulo(c2 + 8, 228, 'se cancela', 'start')}
  <rect x="24" y="274" width="12" height="12" rx="3" fill="#e3f3f0" stroke="#0f766e" stroke-width="1.4"/>
  ${rotulo(42, 284, 'Estado pendiente: todavía se puede reprogramar, modificar o cancelar', 'start')}
</svg>`;
})();

let html = fs.readFileSync(path.join(aqui, 'manual.html'), 'utf8')
  .replace('{{logo}}', logo)
  .replace('{{huella}}', huellaPortada)
  .replace('{{diagrama}}', diagrama)
  .replace(/\{\{icon:(\w+)\}\}/g, (_, n) => icono(n));
if (html.includes('{{')) throw new Error('Quedó un marcador sin reemplazar');

const final = path.join(aqui, 'manual-final.html');
fs.writeFileSync(final, html);

const navegadores = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
];
const nav = navegadores.find((p) => fs.existsSync(p));
if (!nav) throw new Error('No se encontró Edge ni Chrome');

const pdf = path.join(raiz, 'docs', 'Manual de usuario - PetCareApp.pdf');
execFileSync(nav, [
  '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=15000',
  `--user-data-dir=${path.join(aqui, '.perfil-edge')}`,
  `--print-to-pdf=${pdf}`, pathToFileURL(final).href,
], { stdio: 'inherit' });
fs.rmSync(path.join(aqui, '.perfil-edge'), { recursive: true, force: true });
console.log('PDF generado:', pdf);

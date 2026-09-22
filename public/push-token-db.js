// Pequeña base de datos IndexedDB compartida entre la página y el service
// worker, solo para guardar el token permanente de re-suscripción push (ver
// GET /api/notificaciones/push/token-resuscripcion en el backend). Hace
// falta IndexedDB en vez de localStorage porque el service worker NO tiene
// acceso a localStorage, pero sí a IndexedDB — así puede recuperar los
// avisos en segundo plano (periodicsync, en service-worker.js) sin sesión
// activa si la suscripción se pierde sola con el tiempo.
//
// Script clásico (no módulo ES) a propósito: se carga tanto con <script> en
// index.html (queda en window, lo usa SocioPerfil.jsx) como con
// importScripts() desde service-worker.js (queda en self) — un módulo ES no
// se puede compartir así de simple entre ambos contextos.

const PUSH_TOKEN_DB = "vikings-push-token-db";
const PUSH_TOKEN_STORE = "tokens";
const PUSH_TOKEN_KEY = "resuscripcion";

function abrirPushTokenDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PUSH_TOKEN_DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(PUSH_TOKEN_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function guardarTokenResuscripcionPush(token) {
  const db = await abrirPushTokenDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PUSH_TOKEN_STORE, "readwrite");
    tx.objectStore(PUSH_TOKEN_STORE).put(token, PUSH_TOKEN_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function leerTokenResuscripcionPush() {
  const db = await abrirPushTokenDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PUSH_TOKEN_STORE, "readonly");
    const req = tx.objectStore(PUSH_TOKEN_STORE).get(PUSH_TOKEN_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

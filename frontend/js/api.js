/* api.js — Tout passe par Node.js :3000 uniquement */

const API = 'http://localhost:3000/api';

const Api = (() => {
  const getToken  = () => localStorage.getItem('token');
  const setToken  = (t) => localStorage.setItem('token', t);
  const getUser   = () => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } };
  const setUser   = (u) => localStorage.setItem('user', JSON.stringify(u));

  async function http(method, url, body) {
    const h = { 'Content-Type': 'application/json' };
    const t = getToken();
    if (t) h['Authorization'] = 'Bearer ' + t;
    let res;
    try {
      res = await fetch(API + url, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
    } catch {
      throw new Error('Serveur non joignable — vérifiez que Node.js tourne.');
    }
    if (res.status === 401) { localStorage.clear(); location.href = '/index.html'; throw new Error('Session expirée'); }
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.message || 'Erreur ' + res.status);
    return d;
  }

  async function login(username, password) {
    const d = await http('POST', '/auth/login', { username, password });
    setToken(d.access_token);
    setUser(d.user);
    return d;
  }

  async function register(username, password) {
    return await http('POST', '/auth/register', { username, password });
  }

  function logout() { localStorage.clear(); location.href = '/index.html'; }
  function isAuthenticated() { return !!getToken(); }

  const etudiants  = {
    getAll : (p={}) => http('GET',    '/etudiants?' + new URLSearchParams(p)),
    getById: (id)   => http('GET',    '/etudiants/' + id),
    create : (d)    => http('POST',   '/etudiants', d),
    update : (id,d) => http('PUT',    '/etudiants/' + id, d),
    delete : (id)   => http('DELETE', '/etudiants/' + id),
  };
  const encadreurs = {
    getAll : (p={}) => http('GET',    '/encadreurs?' + new URLSearchParams(p)),
    getById: (id)   => http('GET',    '/encadreurs/' + id),
    create : (d)    => http('POST',   '/encadreurs', d),
    update : (id,d) => http('PUT',    '/encadreurs/' + id, d),
    delete : (id)   => http('DELETE', '/encadreurs/' + id),
  };
  const soutenances = {
    getAll   : (p={}) => http('GET',    '/soutenances?' + new URLSearchParams(p)),
    getById  : (id)   => http('GET',    '/soutenances/' + id),
    getByWeek: (s)    => http('GET',    '/soutenances/week/' + s),
    create   : (d)    => http('POST',   '/soutenances', d),
    update   : (id,d) => http('PUT',    '/soutenances/' + id, d),
    delete   : (id)   => http('DELETE', '/soutenances/' + id),
    updateNotes:(id,d)=> http('PUT',    '/soutenances/' + id + '/notes', d),
  };
  const stats = {
    getDashboard: () => http('GET', '/stats/dashboard'),
    getActivity : () => http('GET', '/stats/activity'),
  };
  async function exportCSV(type) {
    const res = await fetch(API + '/export/' + type, { headers: { 'Authorization': 'Bearer ' + getToken() } });
    if (!res.ok) throw new Error('Export échoué');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await res.blob());
    a.download = type + '_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
  }

  return { login, register, logout, isAuthenticated, getToken, getUser, etudiants, encadreurs, soutenances, stats, exportCSV };
})();

if (document.querySelector('.app-page') && !Api.isAuthenticated()) location.href = '/index.html';

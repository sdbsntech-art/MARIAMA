/* dashboard.js */

async function loadDashboard() {
  try {
    const stats = await Api.stats.getDashboard();

    // Stats
    animateNumber('stat-etudiants', stats.total_etudiants);
    animateNumber('stat-encadreurs', stats.total_encadreurs);
    animateNumber('stat-planifiees', stats.soutenances_planifiees);
    animateNumber('stat-aplanifier', stats.a_planifier);

    // Next soutenances
    renderNextSoutenances(stats.prochaines_soutenances || []);

    // Filière chart
    renderFiliereChart(stats.par_filiere || []);


    // Notifications (Rappels)
    const badgeTop = document.getElementById('notif-badge');
    const list = document.getElementById('notif-list');
    
    if (badgeTop && list && stats.prochaines_soutenances) {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const strToday = now.toISOString().slice(0, 10);
      const strTomorrow = tomorrow.toISOString().slice(0, 10);

      const alerts = stats.prochaines_soutenances.filter(s => s.date === strToday || s.date === strTomorrow);
      
      if (alerts.length > 0) {
        badgeTop.textContent = alerts.length;
        badgeTop.style.display = 'inline-block';
        
        list.innerHTML = alerts.map(s => {
          const isToday = s.date === strToday;
          const label = isToday ? "Aujourd'hui" : "Demain";
          return `
            <div style="padding: 12px 16px; border-bottom: 1px solid var(--border); transition: background 0.2s; cursor: pointer;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='none'">
              <div style="font-weight: 600; color: var(--color-primary); font-size: 13px;">${escHtml(s.etudiant_nom)}</div>
              <div style="color: var(--text-faint); font-size: 12px; margin-top: 2px;">
                <strong style="color: ${isToday ? 'var(--red)' : '#B48A18'}">${label} à ${s.heure}</strong> - Salle ${escHtml(s.salle)}
              </div>
            </div>
          `;
        }).join('');
      } else {
        badgeTop.style.display = 'none';
        list.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 12px;">Aucun rappel immédiat</div>';
      }
    }

  } catch (err) {
    console.error('Dashboard load error:', err);
    showToast('Erreur de chargement du tableau de bord', 'error');
  }
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = 0;
  const duration = 800;
  const startTime = performance.now();
  const tick = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * ease);
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderNextSoutenances(items) {
  const container = document.getElementById('next-soutenances');
  if (!container) return;
  if (!items.length) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:16px">Aucune soutenance planifiée</p>';
    return;
  }
  container.innerHTML = items.slice(0, 5).map(s => {
    const d = new Date(s.date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleDateString('fr', { month: 'short' }).toUpperCase();
    return `
      <div class="timeline-item" style="border-left: 2px solid var(--border); padding-left: 12px; margin-bottom: 16px; position: relative;">
        <div style="position: absolute; left: -5px; top: 0; width: 8px; height: 8px; border-radius: 50%; background: var(--color-accent);"></div>
        <div class="timeline-date" style="display: flex; gap: 8px; align-items: baseline; margin-bottom: 4px;">
          <div style="font-weight: 700; font-size: 14px; color: var(--color-primary);">${day} ${month}</div>
          <div style="color: var(--text-faint); font-size: 12px;">à ${s.heure}</div>
        </div>
        <div class="timeline-info">
          <div style="font-weight: 600; font-size: 13px; color: var(--text);">${escHtml(s.etudiant_nom)}</div>
          <div style="font-size: 12px; color: var(--text-muted);">Salle ${escHtml(s.salle)} · ${escHtml(s.filiere || '')}</div>
        </div>
      </div>`;
  }).join('');
}

function renderFiliereChart(data) {
  const canvas = document.getElementById('canvas-filiere');
  if (!canvas || !data.length) return;

  const ctx = canvas.getContext('2d');
  const colors = ['#C6A84B','#1A4FA0','#16a34a','#dc2626','#8b5cf6','#f97316'];
  const total = data.reduce((s, d) => s + d.count, 0);

  // Simple donut chart
  const cx = canvas.width / 2, cy = canvas.height / 2;
  const radius = Math.min(cx, cy) - 30;
  const innerRadius = radius * 0.55;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let startAngle = -Math.PI / 2;
  data.forEach((item, i) => {
    const slice = (item.count / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    startAngle += slice;
  });

  // Inner circle (donut hole) for light theme
  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius, 0, 2 * Math.PI);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Center text
  ctx.fillStyle = '#0B2D6E';
  ctx.font = `bold 24px 'Inter', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(total, cx, cy - 8);
  ctx.font = `11px 'Inter', sans-serif`;
  ctx.fillStyle = '#475569';
  ctx.fillText('étudiants', cx, cy + 12);

  // Legend
  const legend = document.getElementById('filiere-chart');
  const legendHtml = data.map((d, i) => `
    <div style="display:flex;align-items:center;gap:6px;margin-top:6px">
      <span style="width:10px;height:10px;border-radius:2px;background:${colors[i % colors.length]};flex-shrink:0"></span>
      <span style="font-size:12px;color:var(--text-muted)">${escHtml(d.filiere)}</span>
      <span style="font-size:12px;color:var(--text);margin-left:auto;font-weight:600">${d.count}</span>
    </div>`).join('');

  const legendDiv = document.createElement('div');
  legendDiv.style.cssText = 'padding:0 8px;min-width:140px';
  legendDiv.innerHTML = legendHtml;

  legend.style.display = 'flex';
  legend.style.alignItems = 'center';
  legend.style.gap = '20px';
  legend.appendChild(legendDiv);
}



function escHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
window.escHtml = escHtml;

// Load on navigate to dashboard
window.addEventListener('navigate', (e) => {
  if (e.detail.page === 'dashboard') loadDashboard();
});

// Notifications Dropdown Logic
document.addEventListener('DOMContentLoaded', () => {
  const btnNotif = document.getElementById('btn-notif');
  const dropdown = document.getElementById('notif-dropdown');
  
  if (btnNotif && dropdown) {
    btnNotif.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      const wrapper = document.querySelector('.notif-wrapper');
      if (wrapper && !wrapper.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }
});

loadDashboard();

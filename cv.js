'use strict';

const content = window.PORTFOLIO_CONTENT || {};
const cvContent = content.cv || {};

const cvApp = document.getElementById('cv-app');
const headerTime = document.getElementById('header-time');
const headerLocation = document.getElementById('header-location');
const siteBrandMark = document.getElementById('site-brand-mark');
const headerContact = document.getElementById('cv-header-contact');

let cursorMouseX = -200;
let cursorMouseY = -200;
let cursorRingX = -200;
let cursorRingY = -200;
let cursorOverAction = false;
let cursorLabelText = 'Open';

function initCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) {
    return;
  }

  if (document.getElementById('cursor-ring')) {
    return;
  }

  const ring = document.createElement('div');
  ring.id = 'cursor-ring';
  ring.className = 'cursor-ring';

  const dot = document.createElement('div');
  dot.id = 'cursor-dot';
  dot.className = 'cursor-dot';

  const label = document.createElement('div');
  label.id = 'cursor-label';
  label.className = 'cursor-label';
  label.setAttribute('aria-hidden', 'true');

  document.body.appendChild(ring);
  document.body.appendChild(dot);
  document.body.appendChild(label);

  window.addEventListener('mousemove', (e) => {
    cursorMouseX = e.clientX;
    cursorMouseY = e.clientY;
  });

  document.addEventListener('mouseleave', () => {
    cursorMouseX = -200;
    cursorMouseY = -200;
    cursorOverAction = false;
  });

  (function tick() {
    cursorRingX += (cursorMouseX - cursorRingX) * 0.11;
    cursorRingY += (cursorMouseY - cursorRingY) * 0.11;

    dot.style.transform = 'translate(' + cursorMouseX + 'px, ' + cursorMouseY + 'px)';
    ring.style.transform = 'translate(' + cursorRingX + 'px, ' + cursorRingY + 'px)';
    label.style.transform = 'translate(' + (cursorMouseX + 18) + 'px, ' + (cursorMouseY + 18) + 'px)';
    label.textContent = cursorLabelText;

    ring.classList.toggle('is-over-card', cursorOverAction);
    label.classList.toggle('is-visible', cursorOverAction);

    requestAnimationFrame(tick);
  })();
}

function bindCursorTargets() {
  document.querySelectorAll('a, button, .cv-pill, .cv-link').forEach((el) => {
    if (el.dataset.cursorBound === 'true') {
      return;
    }

    el.dataset.cursorBound = 'true';
    el.addEventListener('mouseenter', () => {
      cursorOverAction = true;
      cursorLabelText = el.classList.contains('contact-link') ? 'Mail' : 'Open';
    });
    el.addEventListener('mouseleave', () => {
      cursorOverAction = false;
    });
  });
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function updateClock() {
  if (!headerTime) {
    return;
  }

  headerTime.textContent = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function syncSiteChrome() {
  const contactEmail = cvContent.email || content.site?.contactEmail || 'hello@egeproduction.com';

  if (headerLocation) {
    headerLocation.textContent = content.site?.location || 'IST';
  }

  if (siteBrandMark) {
    siteBrandMark.textContent = content.site?.brandMark || 'prod';
  }

  if (headerContact) {
    headerContact.href = 'mailto:' + contactEmail;
  }
}

function renderList(items, renderItem) {
  return (items || []).map(renderItem).join('');
}

function renderCvPage() {
  const contactEmail = cvContent.email || content.site?.contactEmail || '';
  const highlightsMarkup = '';

  const profileMarkup = renderList(cvContent.profile, (item) => `
    <p class="cv-copy reveal">${escapeHtml(item)}</p>
  `);

  const linksMarkup = renderList(cvContent.links, (item) => `
    <a class="cv-link reveal" href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>
  `);

  const experienceMarkup = renderList(cvContent.experience, (item) => `
    <article class="cv-item reveal">
      <div class="cv-item-head">
        <div class="eyebrow">${escapeHtml(item.period)}</div>
        <div class="cv-item-role">${escapeHtml(item.role)}</div>
        <div class="cv-meta-copy">${escapeHtml(item.company)}</div>
      </div>
      <p class="cv-item-copy">${escapeHtml(item.description)}</p>
    </article>
  `);

  const servicesMarkup = renderList(cvContent.services, (item) => `
    <span class="cv-pill reveal">${escapeHtml(item)}</span>
  `);

  const clientsMarkup = renderList(cvContent.selectedClients, (item) => `
    <article class="cv-list-panel reveal">
      <div class="cv-item-role">${escapeHtml(item)}</div>
    </article>
  `);

  const educationMarkup = renderList(cvContent.education, (item) => `
    <article class="cv-item reveal">
      <div class="cv-item-head">
        <div class="eyebrow">${escapeHtml(item.period)}</div>
        <div class="cv-item-role">${escapeHtml(item.title)}</div>
        <div class="cv-meta-copy">${escapeHtml(item.place)}</div>
      </div>
    </article>
  `);

  const toolsMarkup = renderList(cvContent.tools, (item) => `
    <span class="cv-pill reveal">${escapeHtml(item)}</span>
  `);

  return `
    <section class="page page-cv">
      <section class="cv-hero">
        <div>
          <div class="eyebrow reveal">Curriculum vitae</div>
          <h1 class="cv-title reveal">${escapeHtml(cvContent.title || 'CV / Profile')}</h1>
          <p class="cv-subtitle reveal">${escapeHtml(cvContent.subtitle || '')}</p>
          <p class="cv-copy reveal">${escapeHtml(cvContent.intro || '')}</p>
        </div>
        <div class="cv-grid">
          ${highlightsMarkup}
        </div>
      </section>

      <section class="cv-layout">
        <aside class="cv-aside">
          <div class="cv-panel reveal">
            <div class="footer-label">Details</div>
            <div class="cv-meta-list">
              <div class="cv-meta-row">
                <div class="eyebrow">Location</div>
                <p class="cv-meta-copy">${escapeHtml(cvContent.location || '')}</p>
              </div>
              <div class="cv-meta-row">
                <div class="eyebrow">Availability</div>
                <p class="cv-meta-copy">${escapeHtml(cvContent.availability || '')}</p>
              </div>
              <div class="cv-meta-row">
                <div class="eyebrow">Email</div>
                <a class="contact-link" href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a>
              </div>
            </div>
          </div>

          <div class="cv-panel cv-links">
            ${linksMarkup}
          </div>
        </aside>

        <div class="cv-main">
          <section class="cv-block">
            <div class="section-label reveal">Profile</div>
            <h2 class="cv-section-title reveal">What this page is for.</h2>
            <div class="cv-stack">
              ${profileMarkup}
            </div>
          </section>

          <section class="cv-block">
            <div class="section-label reveal">Experience</div>
            <h2 class="cv-section-title reveal">Selected roles and collaborations.</h2>
            <div class="cv-list">
              ${experienceMarkup}
            </div>
          </section>

          <section class="cv-block">
            <div class="section-label reveal">Services</div>
            <h2 class="cv-section-title reveal">Core production scope.</h2>
            <div class="cv-tags">
              ${servicesMarkup}
            </div>
          </section>

          <section class="cv-block">
            <div class="section-label reveal">Selected clients</div>
            <div class="cv-list-grid">
              ${clientsMarkup}
            </div>
          </section>

          <section class="cv-block">
            <div class="section-label reveal">Education</div>
            <div class="cv-list">
              ${educationMarkup}
            </div>
          </section>

          <section class="cv-block">
            <div class="section-label reveal">Tools</div>
            <div class="cv-tags">
              ${toolsMarkup}
            </div>
          </section>
        </div>
      </section>
    </section>
  `;
}

function setupRevealObserver() {
  const items = cvApp.querySelectorAll('.reveal');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -8% 0px'
    }
  );

  items.forEach((item) => observer.observe(item));
}

function init() {
  syncSiteChrome();
  initCursor();
  updateClock();

  if (cvApp) {
    cvApp.innerHTML = renderCvPage();
    setupRevealObserver();
    bindCursorTargets();
  }

  setInterval(updateClock, 30000);
}

init();
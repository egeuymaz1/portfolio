const content = window.PORTFOLIO_CONTENT || { site: {}, categories: [] };

const state = {
  currentId: null,
  pendingScrollTarget: null,
  revealObserver: null,
  lazyObserver: null,
  homeSelection: null,
  marqueeRaf: null,
  marqueeLastTime: 0,
  stripCleanup: null,
  stripObserver: null,
  homeEyesCleanup: null
};

const app = document.getElementById("app");
const headerTime = document.getElementById("header-time");
const headerLocation = document.getElementById("header-location");
const siteBrandMark = document.getElementById("site-brand-mark");

// Brand-specific static assets (thumbs & backgrounds)
const BRAND_THUMBS = {
  "arkhe-project": ["thumbs/arkhe_thumb.jpg", "thumbs/arkhe_thumb2.jpg"],
  "derschutze": ["thumbs/derschutze_thumb.jpg", "thumbs/derschutze_thumb2.jpg"],
  "kliik": ["thumbs/kliik_thumb.jpg", "thumbs/kliik_thumb2.jpg"],
  "nesin-koyu": ["thumbs/nesin_thumb.jpg", "thumbs/nesin_thumb2.jpg"],
  "personal": ["thumbs/personal_thumb.jpg", "thumbs/personal_thumb2.jpg"],
  "psikanaliz-dernegi": ["thumbs/psikanaliz_thumb.jpg", "thumbs/psikanaliz_thumb2.jpg"]
};

const BRAND_BACKGROUNDS = {
  "arkhe-project": "background/arkhe_bg copy.jpg",
  "derschutze": "background/derschutze_bg copy.jpg",
  "kliik": "background/kliik_bg copy.jpg",
  "nesin-koyu": "background/nesin_bg copy.jpg",
  "personal": "background/personal_bg copy.jpg",
  "psikanaliz-dernegi": "background/psikanaliz_bg copy.jpg"
};

// ── Cursor state ────────────────────────────────────────────────────
let cursorMouseX = -200;
let cursorMouseY = -200;
let cursorRingX = -200;
let cursorRingY = -200;
let cursorOverCard = false;
let cursorLabelEl = null;
let cursorMetaEl = null;
let cursorMetaVisible = false;
let samplePreviewEl = null;

function initCursor() {
  if (document.getElementById("cursor-ring")) {
    return;
  }

  const ring = document.createElement("div");
  ring.id = "cursor-ring";
  ring.className = "cursor-ring";

  const dot = document.createElement("div");
  dot.id = "cursor-dot";
  dot.className = "cursor-dot";

  const label = document.createElement("div");
  label.id = "cursor-label";
  label.className = "cursor-label";
  label.setAttribute("aria-hidden", "true");

  const meta = document.createElement("div");
  meta.id = "cursor-meta";
  meta.className = "cursor-meta";
  meta.setAttribute("aria-hidden", "true");

  document.body.appendChild(ring);
  document.body.appendChild(dot);
  document.body.appendChild(label);
  document.body.appendChild(meta);

  cursorLabelEl = label;
  cursorMetaEl = meta;

  cursorRingX = -200;
  cursorRingY = -200;

  window.addEventListener("mousemove", (e) => {
    cursorMouseX = e.clientX;
    cursorMouseY = e.clientY;
  });

  document.addEventListener("mouseleave", () => {
    cursorMouseX = -200;
    cursorMouseY = -200;
  });

  (function tick() {
    cursorRingX += (cursorMouseX - cursorRingX) * 0.11;
    cursorRingY += (cursorMouseY - cursorRingY) * 0.11;

    dot.style.transform = `translate(${cursorMouseX}px, ${cursorMouseY}px)`;
    ring.style.transform = `translate(${cursorRingX}px, ${cursorRingY}px)`;
    label.style.transform = `translate(${cursorMouseX + 18}px, ${cursorMouseY + 18}px)`;
    meta.style.transform = `translate(${cursorMouseX + 18}px, ${cursorMouseY + 44}px)`;

    ring.classList.toggle("is-over-card", cursorOverCard);
    label.classList.toggle("is-visible", cursorOverCard);
    meta.classList.toggle("is-visible", cursorMetaVisible);

    requestAnimationFrame(tick);
  })();
}

function updateClock() {
  if (!headerTime) {
    return;
  }

  const formatted = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  });

  headerTime.textContent = formatted;
}

function syncSiteChrome() {
  if (headerLocation) {
    headerLocation.textContent = content.site.location || "IST";
  }

  if (siteBrandMark) {
    siteBrandMark.textContent = content.site.brandMark || "prod";
  }
}

function normalizeIdPart(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function humanizeId(value = "") {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferSubCategoryFromRegistryItem(item = {}) {
  const explicit = normalizeIdPart(item.subCategory || "");
  if (explicit) {
    return {
      id: explicit,
      title: humanizeId(explicit)
    };
  }

  const src = normalizeMediaSrc(item.src || "").toLowerCase();
  const file = String(item.file || "").toLowerCase();
  const type = String(item.type || "").toLowerCase();

  if (src.includes("/video") || type === "video") {
    return { id: "videos", title: "Videos" };
  }

  if (src.includes("/static") || src.includes("/statics")) {
    return { id: "statics", title: "Statics" };
  }

  if (src.includes("/printed")) {
    return { id: "printed", title: "Printed" };
  }

  if (src.includes("/newsletter")) {
    return { id: "newsletter", title: "Newsletter" };
  }

  const imageExt = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"];
  if (imageExt.some((ext) => file.endsWith(ext)) || type === "image") {
    return { id: "images", title: "Images" };
  }

  return { id: "other", title: "Other" };
}

function inferBrandFromRegistryItem(item = {}) {
  const explicit = String(item.brand || item.client || item.company || "").trim();
  if (explicit) {
    return {
      id: normalizeIdPart(explicit),
      title: explicit
    };
  }

  const src = normalizeMediaSrc(item.src || "");
  const srcMatch = src.match(/(?:^|\/)media\/([^/]+)/i);
  const topLevelFolder = srcMatch ? String(srcMatch[1] || "").trim() : "";
  if (topLevelFolder) {
    return {
      id: normalizeIdPart(topLevelFolder),
      title: topLevelFolder
    };
  }

  const folder = String(item.folder || "").trim();
  return {
    id: normalizeIdPart(folder),
    title: folder
  };
}

function buildProjectList() {
  const registry = Array.isArray(window.MEDIA_REGISTRY) ? window.MEDIA_REGISTRY : [];
  const configuredBrands = Array.isArray(content.brands) ? content.brands : [];
  const configuredById = new Map(
    configuredBrands.map((brand) => [normalizeIdPart(brand.id || brand.title || ""), brand])
  );

  const buildConfiguredBrand = (brand, index, derivedRow) => {
    const id = normalizeIdPart(brand.id || brand.title || "");
    const row = derivedRow || { brandTitle: brand.title || humanizeId(id), folders: new Set(), subCategories: new Map() };
    const sourceFolders = Array.from(row.folders || []);

    return {
      id,
      index: brand.index || String(index + 1).padStart(2, "0"),
      title: brand.title || row.brandTitle,
      client: brand.client || brand.brand || row.brandTitle,
      brand: brand.brand || brand.title || row.brandTitle,
      tag: brand.tag || "Brand",
      year: brand.year || String(new Date().getFullYear()),
      location: brand.location || content.site.location || "Istanbul",
      summary: brand.summary || `${row.brandTitle} medya arsivi marka ve alt kategori bazinda listeleniyor.`,
      hero: brand.hero,
      services: brand.services || [],
      facts: brand.facts || [
        { label: "Brand", value: row.brandTitle },
        { label: "Folders", value: String(sourceFolders.length) },
        { label: "Model", value: "Brand + Sub category" }
      ],
      sourceFolders: Array.isArray(brand.sourceFolders) && brand.sourceFolders.length > 0 ? brand.sourceFolders : sourceFolders,
      subCategories: Array.isArray(brand.subCategories) && brand.subCategories.length > 0
        ? brand.subCategories
        : Array.from(row.subCategories.values()),
      credits: brand.credits || []
    };
  };

  if (registry.length > 0) {
    const byBrand = new Map();

    registry.forEach((item) => {
      const inferredBrand = inferBrandFromRegistryItem(item);
      const brandId = inferredBrand.id;
      if (!brandId) {
        return;
      }

      if (!byBrand.has(brandId)) {
        byBrand.set(brandId, {
          brandId,
          brandTitle: inferredBrand.title || humanizeId(brandId),
          folders: new Set(),
          subCategories: new Map()
        });
      }

      const row = byBrand.get(brandId);
      row.folders.add(item.folder);

      const sub = inferSubCategoryFromRegistryItem(item);
      if (!row.subCategories.has(sub.id)) {
        row.subCategories.set(sub.id, {
          id: sub.id,
          title: sub.title,
          types: sub.id === "videos" ? ["video"] : sub.id === "images" || sub.id === "statics" ? ["image"] : []
        });
      }
    });

    if (configuredBrands.length > 0) {
      return configuredBrands
        .map((brand, index) => {
          const id = normalizeIdPart(brand.id || brand.title || "");
          if (!id) {
            return null;
          }
          return buildConfiguredBrand(brand, index, byBrand.get(id));
        })
        .filter(Boolean);
    }

    return Array.from(byBrand.values()).map((row, index) => ({
      id: row.brandId,
      index: String(index + 1).padStart(2, "0"),
      title: row.brandTitle,
      client: row.brandTitle,
      brand: row.brandTitle,
      tag: "Brand",
      year: String(new Date().getFullYear()),
      location: content.site.location || "Istanbul",
      summary: `${row.brandTitle} medya arsivi marka ve alt kategori bazinda listeleniyor.`,
      hero: undefined,
      services: [],
      facts: [
        { label: "Brand", value: row.brandTitle },
        { label: "Folders", value: String(row.folders.size) },
        { label: "Model", value: "Brand + Sub category" }
      ],
      sourceFolders: Array.from(row.folders),
      subCategories: Array.from(row.subCategories.values()),
      credits: []
    }));
  }

  if (configuredBrands.length > 0) {
    return configuredBrands
      .map((brand, index) => {
        const id = normalizeIdPart(brand.id || brand.title || "");
        if (!id) {
          return null;
        }
        return buildConfiguredBrand(brand, index);
      })
      .filter(Boolean);
  }

  return [];
}

function getCategoryById(categoryId) {
  return buildProjectList().find((category) => category.id === categoryId) || null;
}

function getParentCategoryId(categoryId = "") {
  const category = getCategoryById(categoryId);
  if (!category) {
    const parts = String(categoryId).split("-").filter(Boolean);
    return parts.length > 1 ? parts[0] : "";
  }

  return normalizeIdPart(category.brand || category.client || category.id);
}

function getSiblingCategories(category) {
  if (!category) {
    return [];
  }

  const parent = getParentCategoryId(category.id);
  return buildProjectList().filter((item) => getParentCategoryId(item.id) === parent);
}

function normalizeMediaSrc(src = "") {
  const raw = String(src || "").replaceAll("\\", "/");
  try {
    return decodeURI(raw);
  } catch {
    return raw;
  }
}

function isBackgroundAsset(item = {}) {
  const name = String(item.file || "").toLowerCase();
  const src = normalizeMediaSrc(item.src || "").toLowerCase();
  return (
    item.use === "background" ||
    name.startsWith("bg_") ||
    name.startsWith("background_") ||
    src.includes("/backgrounds/")
  );
}

function isHomeThumbAsset(item = {}) {
  const name = String(item.file || "").toLowerCase();
  const src = normalizeMediaSrc(item.src || "").toLowerCase();
  return (
    item.home === true ||
    name.startsWith("thumb_") ||
    name.startsWith("home_") ||
    src.includes("/thumbs/")
  );
}

function isSupportAsset(item = {}) {
  return isBackgroundAsset(item) || isHomeThumbAsset(item);
}

// Prefer registry cover (media-registry.js) over content.js cover if available
function getRegistryCover(categoryId) {
  const reg = window.MEDIA_REGISTRY;
  if (!reg || !Array.isArray(reg)) return null;
  const item = reg.find(function (i) { return i.folder === categoryId && i.cover === true; });
  if (!item) return null;
  return {
    type: item.type || "image",
    src: item.src || ("media/" + item.folder + "/" + item.file),
    poster: typeof item.poster === "string" ? item.poster : "",
    alt: item.alt || ""
  };
}

function getRegistryMedia(item) {
  if (!item) {
    return null;
  }

  const src = item.src || ("media/" + item.folder + "/" + item.file);
  let poster = "";

  if (typeof item.poster === "string" && item.poster.length > 0) {
    if (item.poster.startsWith("http") || item.poster.startsWith("/") || item.poster.includes("/")) {
      poster = item.poster;
    } else {
      poster = "media/" + item.folder + "/" + item.poster;
    }
  }

  return {
    type: item.type || "image",
    src,
    poster,
    thumb: normalizeMediaSrc(typeof item.thumb === "string" ? item.thumb : ""),
    alt: item.alt || ""
  };
}

function uniqueWorkList() {
  const projects = buildProjectList();
  const seen = new Set();
  const rawItems = [
    ...projects.map((category) => category.tag),
    ...projects.flatMap((category) => category.services || []),
    "motion graphics",
    "graphic design",
    "video editing",
    "social content",
    "print design"
  ];

  return rawItems
    .map((item) => String(item || "").trim())
    .filter((item) => {
      if (!item) {
        return false;
      }
      const key = item.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function shuffleCopy(items) {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

function getHomeSelection() {
  if (Array.isArray(state.homeSelection)) {
    return state.homeSelection;
  }

  const projects = buildProjectList();
  const registry = Array.isArray(window.MEDIA_REGISTRY) ? window.MEDIA_REGISTRY : [];
  const homeTagged = registry.filter((item) => !item.cover && isHomeThumbAsset(item));
  const sourcePool = homeTagged.length > 0 ? homeTagged : registry.filter((item) => !item.cover);

  // 1) Tüm adayları marka bazında grupla
  const brandCandidates = new Map();
  sourcePool
    .filter((item) => !item.cover)
    .forEach((item) => {
      const inferredBrand = inferBrandFromRegistryItem(item);
      const category = projects.find(
        (entry) => entry.id === inferredBrand.id || (entry.sourceFolders || []).includes(item.folder)
      );
      if (!category) {
        return;
      }

      const media = getRegistryMedia(item);
      if (!media) {
        return;
      }

      const brandId = category.id;
      if (!brandCandidates.has(brandId)) {
        brandCandidates.set(brandId, []);
      }
      brandCandidates.get(brandId).push({ rawItem: item, baseMedia: media, category });
    });

  const results = [];
  const brandCounts = new Map();

  // Yardimci: bir kategori icin kart medyasini olustur
  const buildHomeMedia = (category, entry, variantIndex) => {
    let homeMedia = entry ? entry.baseMedia : null;

    if (homeMedia) {
      if (homeMedia.thumb) {
        homeMedia = {
          type: "image",
          src: homeMedia.thumb,
          poster: "",
          alt: homeMedia.alt || (entry && entry.rawItem.file) || ""
        };
      } else if (homeMedia.type === "video" && homeMedia.poster) {
        homeMedia = {
          type: "image",
          src: homeMedia.poster,
          poster: "",
          alt: homeMedia.alt || (entry && entry.rawItem.file) || ""
        };
      }
    }

    const brandThumbs = BRAND_THUMBS[category.id] || [];
    if (brandThumbs.length > 0) {
      const index = typeof variantIndex === "number" && variantIndex < brandThumbs.length
        ? variantIndex
        : Math.floor(Math.random() * brandThumbs.length);
      const thumbSrc = brandThumbs[index];
      homeMedia = {
        type: "image",
        src: thumbSrc,
        poster: "",
        alt:
          (homeMedia && (homeMedia.alt || (entry && entry.rawItem.file))) ||
          category.title ||
          category.client ||
          ""
      };
    }

    if (!homeMedia) {
      const preview = getCategoryPreviewMedia(category.id);
      if (preview) {
        homeMedia = preview;
      } else {
        const allMedia = getCategoryAllMedia(category) || [];
        if (allMedia.length > 0) {
          homeMedia = allMedia[0];
        } else {
          homeMedia = {
            type: "image",
            src: "",
            poster: "",
            alt: category.title || category.client || ""
          };
        }
      }
    }

    return homeMedia;
  };

  // 2) Her markadan en az 1 kart
  projects.forEach((category) => {
    const brandId = category.id;
    const list = brandCandidates.get(brandId) || [];
    let entry = null;

    if (list.length > 0) {
      const idx = Math.floor(Math.random() * list.length);
      entry = list[idx];
      list.splice(idx, 1);
    }

    const media = buildHomeMedia(category, entry, 0);
    results.push({
      category,
      media,
      mediaCategory: media.type === "video" ? "Video" : "Image",
      companyCategory: category.client,
      itemName: (entry && entry.rawItem.file) || category.title || category.id
    });

    brandCounts.set(brandId, 1);
  });

  // 3) 8 karta tamamlamak icin ekstra kartlar (marka basina max 2)
  if (results.length < 8) {
    const remainingEntries = [];
    brandCandidates.forEach((list) => {
      list.forEach((entry) => remainingEntries.push(entry));
    });

    shuffleCopy(remainingEntries).forEach((entry) => {
      if (results.length >= 8) {
        return;
      }

      const category = entry.category;
      const brandId = category.id;
      const currentCount = brandCounts.get(brandId) || 1;
      if (currentCount >= 2) {
        return;
      }

      const media = buildHomeMedia(category, entry, currentCount);
      results.push({
        category,
        media,
        mediaCategory: entry.baseMedia.type === "video" ? "Video" : "Image",
        companyCategory: category.client,
        itemName: entry.rawItem.file
      });

      brandCounts.set(brandId, currentCount + 1);
    });
  }

  state.homeSelection = results;
  return state.homeSelection;
}

function getHashCategoryId() {
  const hash = window.location.hash || "#/";
  const match = hash.match(/^#\/project\/([a-z0-9-]+)$/i);
  return match ? match[1] : null;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createMediaMarkup(media, options = {}) {
  const className = options.className || "media-frame";
  const autoplay = Boolean(options.autoplay);
  const showControls = options.showControls !== false;
  const flag = options.flag ? `<span class="media-flag">${escapeHtml(options.flag)}</span>` : "";
  const alt = escapeHtml(media.alt || media.caption || "Portfolio media");
  const src = escapeHtml(normalizeMediaSrc(media.src || ""));
  const poster = escapeHtml(normalizeMediaSrc(media.poster || ""));

  if (media.type === "video") {
    return `
      <div class="${className}">
        ${flag}
        <video
          ${autoplay ? "autoplay muted loop playsinline" : `${showControls ? "controls" : "muted loop"} playsinline`}
          preload="none"
          poster="${poster}"
          data-src="${src}"
          aria-label="${alt}"
        ></video>
      </div>
    `;
  }

  return `
    <div class="${className}">
      ${flag}
      <img data-src="${src}" alt="${alt}" />
    </div>
  `;
}

function renderHomePage() {
  const projects = buildProjectList();
  const statsMarkup = (content.site.stats || [])
    .map(
      (stat) => `
        <article class="stat-card reveal">
          <div class="stat-value">${escapeHtml(stat.value)}</div>
          <div class="eyebrow">${escapeHtml(stat.label)}</div>
        </article>
      `
    )
    .join("");

  const cardsMarkup = getHomeSelection()
    .map((card) => `
        <button class="home-card reveal" type="button" data-open-project="${escapeHtml(card.category.id)}">
          <div class="card-top">
            <div>
              <div class="card-client">${escapeHtml(card.companyCategory)}</div>
            </div>
            <div class="card-index">[${escapeHtml(card.category.index)}]</div>
          </div>
          ${createMediaMarkup(card.media, { flag: "", autoplay: false, showControls: false })}
          <div class="card-bottom">
            <div class="card-tag">${escapeHtml(card.companyCategory)}</div>
            <div class="card-tag">${escapeHtml(card.category.year)}</div>
          </div>
        </button>
      `)
    .join("");

  const workItems = uniqueWorkList();
  const marqueeMarkup = workItems
    .map((item, idx) => `<span class="company-pill" data-marquee-item="${idx}">${escapeHtml(item)}</span>`)
    .join("");

  const categoryListMarkup = projects
    .map((category) => {
      const allMedia = getCategoryRegistryMedia(category.id);
      const maxCount = allMedia.length >= 4 ? 4 : Math.min(3, allMedia.length);
      const samples = shuffleCopy(allMedia)
        .slice(0, maxCount)
        .map((media) => {
          if (media.type === "video") {
            return `<video muted loop playsinline preload="none" data-src="${escapeHtml(media.src)}"></video>`;
          }
          return `<img data-src="${escapeHtml(media.src)}" alt="${escapeHtml(category.title)} sample" />`;
        })
        .join("");

      const subCategoryText = (category.subCategories || [])
        .map((item) => item.title || item.id)
        .filter(Boolean)
        .join(" / ");

      return `
        <details class="category-disclosure reveal">
          <summary>
            <span>${escapeHtml(category.title)}</span>
            <span class="disclosure-meta">${escapeHtml(category.client)} / ${escapeHtml(subCategoryText || category.tag || "")}</span>
          </summary>
          <div class="category-disclosure-body">
            <p>${escapeHtml(category.summary || "Placeholder summary")}</p>
            <div class="category-samples">${samples}</div>
            <a class="category-open-link" href="#/project/${escapeHtml(category.id)}">Open brand</a>
          </div>
        </details>
      `;
    })
    .join("");

  return `
    <section class="page page-home">
      <section class="home-intro">
        <div class="reveal">
          <div class="eyebrow">${escapeHtml(content.site.homeEyebrow || "Selected projects")}</div>
          <h1 class="home-title">${escapeHtml(content.site.homeHeadline || "Visual archive for motion and stills.")}</h1>
        </div>
        <div class="home-aside reveal">
          <div class="home-portrait" aria-hidden="true">
            <div class="home-portrait-inner" id="home-eyes-stage">
              <img class="home-eyes-layer home-eyes-bg" src="eyes/eye white bg.png" alt="" />
              <img class="home-eyes-layer home-eyes-face" src="eyes/face and bg.png" alt="Self portrait" />
              <div class="home-eyes-pupil home-eyes-pupil-left"></div>
              <div class="home-eyes-pupil home-eyes-pupil-right"></div>
            </div>
          </div>
          <p class="home-copy">${escapeHtml(content.site.title || "")}</p>
          <p class="home-copy">${escapeHtml(content.site.intro || "")}</p>
          <div class="intro-stats">${statsMarkup}</div>
        </div>
      </section>

      <section class="home-grid" aria-label="Kategori listesi">
        ${cardsMarkup}
      </section>

      <section class="company-marquee reveal" aria-label="Work types ticker">
        <div class="company-marquee-head">What I Do</div>
        <div class="company-marquee-viewport" data-company-marquee>
          <div class="company-marquee-runner" data-company-runner>
            <div class="company-marquee-track" data-company-track>
              ${marqueeMarkup}
            </div>
            <div class="company-marquee-track" aria-hidden="true">
              ${marqueeMarkup}
            </div>
          </div>
        </div>
      </section>

      <section class="category-browser">
        <div class="company-marquee-head">Browse Brands</div>
        <div class="category-list">
          ${categoryListMarkup}
        </div>
      </section>

      <footer class="footer-panel reveal" id="about">
        <div>
          <div class="footer-label">About</div>
          <h2 class="footer-title">${escapeHtml(content.site.aboutTitle || "Built for category-led storytelling.")}</h2>
          <p class="footer-copy">${escapeHtml(content.site.about || "")}</p>
        </div>
        <div id="contact">
          <div class="footer-label">Contact</div>
          <p class="footer-copy">${escapeHtml(content.site.contactLabel || "")}</p>
          <a class="contact-link" href="mailto:${escapeHtml(content.site.contactEmail || "")}">${escapeHtml(
            content.site.contactEmail || ""
          )}</a>
        </div>
      </footer>
    </section>
  `;
}

function getCategoryRegistryMedia(categoryId) {
  const category = getCategoryById(categoryId);
  const folders = category?.sourceFolders || [];
  const folderSet = new Set(folders);
  const reg = Array.isArray(window.MEDIA_REGISTRY) ? window.MEDIA_REGISTRY : [];
  return reg
    .filter((item) => {
      const inferredBrand = inferBrandFromRegistryItem(item);
      const belongsByBrand = inferredBrand.id === category?.id;
      const belongsByFolder = folderSet.has(item.folder);
      return (belongsByBrand || belongsByFolder) && !item.cover && !isSupportAsset(item);
    })
    .map((item) => {
      const inferredSub = inferSubCategoryFromRegistryItem(item);
      return {
        type: item.type || "image",
        src: normalizeMediaSrc(item.src || ("media/" + item.folder + "/" + item.file)),
        poster: normalizeMediaSrc(typeof item.poster === "string" ? item.poster : ""),
        file: item.file || "",
        caption: item.file || "",
        alt: item.alt || item.file || "",
        subCategory: inferredSub.id,
        subCategoryTitle: inferredSub.title
      };
    });
}

function getCategoryBackgroundMedia(category) {
  const folders = category?.sourceFolders || [];
  const folderSet = new Set(folders);
  const reg = Array.isArray(window.MEDIA_REGISTRY) ? window.MEDIA_REGISTRY : [];

  // 0) Explicit brand-level background image from background/ folder
  const brandBg = category?.id ? BRAND_BACKGROUNDS[category.id] : "";
  if (brandBg) {
    return {
      type: "image",
      src: normalizeMediaSrc(brandBg),
      poster: "",
      alt: category.title || ""
    };
  }

  // 1) Try to find a background-flagged asset in the registry
  const item = reg.find((entry) => {
    const inferredBrand = inferBrandFromRegistryItem(entry);
    const belongsByBrand = inferredBrand.id === category?.id;
    const belongsByFolder = folderSet.has(entry.folder);
    return (belongsByBrand || belongsByFolder) && isBackgroundAsset(entry);
  });
  if (item) {
    return {
      type: item.type || "image",
      src: normalizeMediaSrc(item.src || ("media/" + item.folder + "/" + item.file)),
      poster: normalizeMediaSrc(typeof item.poster === "string" ? item.poster : ""),
      alt: item.alt || category.title || ""
    };
  }

  // 2) Fallbacks when there is no explicit background asset configured
  const preview = getCategoryPreviewMedia(category.id);
  if (preview) {
    return preview;
  }

  const allMedia = getCategoryAllMedia(category) || [];
  if (allMedia.length > 0) {
    const first = allMedia[0];
    return {
      type: first.type || "image",
      src: normalizeMediaSrc(first.src || ""),
      poster: normalizeMediaSrc(typeof first.poster === "string" ? first.poster : ""),
      alt: first.alt || category.title || ""
    };
  }

  // 3) Last resort: simple empty image frame so layout still renders
  return {
    type: "image",
    src: "",
    poster: "",
    alt: category?.title || ""
  };
}

function getCategorySubGroups(category) {
  const allMedia = getCategoryAllMedia(category);
  const configured = (category.subCategories || []).map((item) => ({
    id: normalizeIdPart(item.id || item.title || ""),
    title: item.title || item.id || "Sub category",
    types: Array.isArray(item.types) ? item.types.map((t) => String(t || "").toLowerCase()) : []
  }));

  const inferredMap = new Map();
  allMedia.forEach((item) => {
    const id = normalizeIdPart(item.subCategory || "");
    if (!id || inferredMap.has(id)) {
      return;
    }
    inferredMap.set(id, {
      id,
      title: item.subCategoryTitle || humanizeId(id),
      types: []
    });
  });

  const defaultGroups = [
    { id: "videos", title: "Videos", types: ["video"] },
    { id: "images", title: "Images", types: ["image"] }
  ];

  const groupDefs = configured.length > 0 ? [...configured, ...Array.from(inferredMap.values())] : Array.from(inferredMap.values()).length > 0 ? Array.from(inferredMap.values()) : defaultGroups;
  const uniqueGroupDefs = Array.from(
    new Map(groupDefs.map((group) => [group.id, group])).values()
  );
  const groups = uniqueGroupDefs
    .map((group) => {
      const media = allMedia.filter((item) => {
        const mediaSub = normalizeIdPart(item.subCategory || "");
        if (mediaSub && mediaSub !== group.id) {
          return false;
        }
        if (group.types.length === 0) {
          return true;
        }
        return group.types.includes(String(item.type || "").toLowerCase());
      });
      return {
        id: group.id,
        title: group.title,
        media
      };
    })
    .filter((group) => group.media.length > 0);

  if (groups.length > 0) {
    return groups;
  }

  return [{ id: "all-media", title: "All media", media: allMedia }];
}

function getCategoryAllMedia(category) {
  const base = getCategoryRegistryMedia(category.id);
  return base.map((item) => ({
    ...item,
    categoryId: category.id
  }));
}

function getCategoryPreviewMedia(categoryId) {
  const category = getCategoryById(categoryId);
  const folders = category?.sourceFolders || [];
  const folderSet = new Set(folders);
  const reg = Array.isArray(window.MEDIA_REGISTRY) ? window.MEDIA_REGISTRY : [];
  const cover = reg.find((item) => {
    const inferredBrand = inferBrandFromRegistryItem(item);
    const belongsByBrand = inferredBrand.id === category?.id;
    const belongsByFolder = folderSet.has(item.folder);
    return (belongsByBrand || belongsByFolder) && item.cover === true;
  });
  const first = reg.find((item) => {
    const inferredBrand = inferBrandFromRegistryItem(item);
    const belongsByBrand = inferredBrand.id === category?.id;
    const belongsByFolder = folderSet.has(item.folder);
    return (belongsByBrand || belongsByFolder) && !item.cover;
  });
  const media = cover || first;
  if (!media) {
    return null;
  }

  return {
    type: media.type || "image",
    src: normalizeMediaSrc(media.src || ("media/" + media.folder + "/" + media.file)),
    poster: normalizeMediaSrc(typeof media.poster === "string" ? media.poster : ""),
    alt: media.alt || media.file || ""
  };
}

function getMediaHoverText(categoryId, media) {
  const registry = Array.isArray(window.MEDIA_HOVER) ? window.MEDIA_HOVER : [];
  const keyCategory = normalizeIdPart(categoryId || "");
  const keyFile = String(media.file || media.caption || "").toLowerCase();

  if (registry.length > 0 && keyCategory && keyFile) {
    const match = registry.find((entry) => {
      const entryCat = normalizeIdPart(entry.categoryId || entry.brandId || "");
      const entryFile = String(entry.file || "").toLowerCase();
      return entryCat === keyCategory && entryFile === keyFile;
    });

    if (match && match.text) {
      return String(match.text);
    }
  }

  const fallbackCategory = { id: categoryId };
  const meta = getHoverMetaForItem(fallbackCategory);
  return `${meta.discipline} • ${meta.purpose}`;
}

function createStripItemMarkup(media) {
  const subCategory = escapeHtml(normalizeIdPart(media.subCategory || "other"));
  const hoverText = escapeHtml(getMediaHoverText(media.categoryId || "", media));
  return `
    <article class="strip-item" data-strip-item-sub-category="${subCategory}" data-hover-text="${hoverText}">
      ${createMediaMarkup(media, {
        className: "media-frame media-frame-original",
        flag: media.type === "video" ? "Video" : "Image",
        autoplay: media.type === "video",
        showControls: false
      })}
    </article>
  `;
}

function getHoverMetaForItem(category) {
  const disciplines = ["motion graphic", "graphic design", "video edit", "social content", "print layout", "art direction"];
  const purposes = ["teaser cut", "campaign visual", "promo asset", "editorial post", "format adaptation", "short reel"];
  const seed = (category?.id || "").split("").reduce((n, ch) => n + ch.charCodeAt(0), 0);
  return {
    discipline: disciplines[seed % disciplines.length],
    purpose: purposes[(seed * 3) % purposes.length]
  };
}

function attachDetailMediaHoverEvents(category) {
  app.querySelectorAll(".strip-item").forEach((item) => {
    item.addEventListener("mouseenter", () => {
      cursorOverCard = true;
      if (cursorLabelEl) {
        cursorLabelEl.textContent = category?.title || "Preview";
      }

      if (cursorMetaEl) {
        const custom = item.getAttribute("data-hover-text") || "";
        if (custom) {
          cursorMetaEl.textContent = custom;
        } else {
          const meta = getHoverMetaForItem(category);
          cursorMetaEl.textContent = `${meta.discipline} • ${meta.purpose}`;
        }
        cursorMetaVisible = true;
      }

      const video = item.querySelector("video");
      if (video && video.src) {
        video.muted = false;
        video.play().catch(() => {});
      }
    });

    item.addEventListener("mouseleave", () => {
      cursorOverCard = false;
      cursorMetaVisible = false;
      const video = item.querySelector("video");
      if (video && category?.id !== "video-motion") {
        video.pause();
        video.currentTime = 0;
      }
    });
  });
}

function setupCategoryDisclosurePreviews() {
  app.querySelectorAll(".category-disclosure").forEach((panel) => {
    panel.addEventListener("toggle", () => {
      const videos = panel.querySelectorAll(".category-samples video");
      if (panel.open) {
        videos.forEach((video) => {
          if (!video.dataset.loaded && video.dataset.src) {
            video.src = video.dataset.src;
            video.dataset.loaded = "true";
          }
          video.play().catch(() => {});
        });
      } else {
        videos.forEach((video) => {
          video.pause();
          video.currentTime = 0;
        });
      }
    });
  });
}

function initSamplePreview() {
  if (samplePreviewEl || document.getElementById("sample-hover-preview")) {
    samplePreviewEl = document.getElementById("sample-hover-preview");
    return;
  }

  const el = document.createElement("div");
  el.id = "sample-hover-preview";
  el.className = "sample-hover-preview";
  el.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);
  samplePreviewEl = el;
}

function showSamplePreview(media) {
  if (!samplePreviewEl || !media?.src) {
    return;
  }

  const safeSrc = escapeHtml(normalizeMediaSrc(media.src));
  const safePoster = escapeHtml(normalizeMediaSrc(media.poster || ""));

  if (media.type === "video") {
    samplePreviewEl.innerHTML = `
      <div class="sample-hover-inner">
        <video autoplay loop playsinline preload="metadata" ${safePoster ? `poster="${safePoster}"` : ""} src="${safeSrc}"></video>
      </div>
    `;
  } else {
    samplePreviewEl.innerHTML = `
      <div class="sample-hover-inner">
        <img src="${safeSrc}" alt="Preview" />
      </div>
    `;
  }

  samplePreviewEl.classList.add("is-visible");
}

function hideSamplePreview() {
  if (!samplePreviewEl) {
    return;
  }

  const video = samplePreviewEl.querySelector("video");
  if (video) {
    video.pause();
  }

  samplePreviewEl.classList.remove("is-visible");
}

function bindCategorySampleHoverPreview() {
  app.querySelectorAll(".category-samples img, .category-samples video").forEach((node) => {
    if (node.dataset.previewBound === "1") {
      return;
    }

    node.dataset.previewBound = "1";
    node.addEventListener("mouseenter", () => {
      const type = node.tagName === "VIDEO" ? "video" : "image";
      const src = node.dataset.src || node.getAttribute("src") || "";
      const poster = node.getAttribute("poster") || "";
      showSamplePreview({ type, src, poster });
    });

    node.addEventListener("mouseleave", hideSamplePreview);
  });
}

function renderDetailPage(category) {
  if (!category) {
    return `<section class="page page-detail"><p class="empty-state">Marka bulunamadi.</p></section>`;
  }

  const factsMarkup = (category.facts || [])
    .map(
      (fact) => `
        <div class="detail-meta-row">
          <span class="detail-kicker">${escapeHtml(fact.label)}</span>
          <span>${escapeHtml(fact.value)}</span>
        </div>
      `
    )
    .join("");

  const subGroups = getCategorySubGroups(category);
  const detailBgMedia = getCategoryBackgroundMedia(category);
  const siblings = getSiblingCategories(category);
  const allCategories = buildProjectList();
  const otherCategories = allCategories.filter((item) => item.id !== category.id);
  const hasParentHub = siblings.length > 1;
  const parentLabel = getParentCategoryId(category.id);

  const railLinks = subGroups.map(
    (group, index) => `
      <button class="detail-rail-link" type="button" data-media-filter="${escapeHtml(group.id)}">
        <span class="detail-kicker">${String(index + 1).padStart(2, "0")}</span>
        <span>${escapeHtml(group.title)}</span>
      </button>
    `
  );
  const railLinksMarkup = [
    `<button class="detail-rail-link is-active" type="button" data-media-filter="all"><span class="detail-kicker">00</span><span>All</span></button>`,
    ...railLinks
  ].join("");

  const parentHubRailMarkup = hasParentHub
    ? `
      <section class="rail-parent-hub">
        <div class="section-label">${escapeHtml(parentLabel)} brands</div>
        <div class="rail-parent-list">
          ${siblings
            .map((sibling) => {
              const preview = getCategoryPreviewMedia(sibling.id);
              const mediaMarkup = preview
                ? createMediaMarkup(preview, {
                    className: "media-frame rail-parent-media",
                    autoplay: preview.type === "video",
                    showControls: false
                  })
                : `<div class="media-frame rail-parent-media"></div>`;

              return `
                <a class="rail-parent-card" href="#/project/${escapeHtml(sibling.id)}">
                  ${mediaMarkup}
                  <div class="rail-parent-meta">
                    <strong>${escapeHtml(sibling.title)}</strong>
                    <span>${escapeHtml((sibling.subCategories || []).map((item) => item.title || item.id).join(" / ") || sibling.tag || "")}</span>
                  </div>
                </a>
              `;
            })
            .join("")}
        </div>
      </section>
    `
    : "";

  const filterPills = [
    `<button class="pill detail-filter-pill is-active" type="button" data-media-filter="all">All (${getCategoryAllMedia(category).length})</button>`,
    ...subGroups.map(
      (group) => `<button class="pill detail-filter-pill" type="button" data-media-filter="${escapeHtml(group.id)}">${escapeHtml(group.title)} (${group.media.length})</button>`
    )
  ].join("");

  const sectionsMarkup = `
    <section class="story-block reveal" id="media-strip">
      <div>
        <div class="section-label">01</div>
        <h2 class="section-heading">All Media</h2>
      </div>
      <div class="detail-filter-bar" data-media-filters>
        ${filterPills}
      </div>
      <p class="detail-note detail-zoom-note">
        Gorsellerin uzerine tiklayarak buyuk halini ve aciklamasini gorebilirsiniz.
      </p>
      <div class="horizontal-strip" data-horizontal-scroll data-strip-category="${escapeHtml(category.id)}"></div>
    </section>
  `;

  const servicesMarkup = (category.services || [])
    .map((service) => `<span class="pill">${escapeHtml(service)}</span>`)
    .join("");

  const bottomNavMarkup = otherCategories.length
    ? `
      <section class="detail-related reveal">
        <div class="section-label">Other brands</div>
        <div class="detail-related-list">
          ${otherCategories
            .map((other) => {
              const preview = getCategoryPreviewMedia(other.id);
              const mediaMarkup = preview
                ? createMediaMarkup(preview, {
                    className: "media-frame detail-related-media",
                    autoplay: preview.type === "video",
                    showControls: false
                  })
                : `<div class="media-frame detail-related-media"></div>`;

              return `
                <a class="detail-related-card" href="#/project/${escapeHtml(other.id)}">
                  ${mediaMarkup}
                  <div class="detail-related-meta">
                    <strong>${escapeHtml(other.title)}</strong>
                    <span>${escapeHtml((other.subCategories || []).map((item) => item.title || item.id).join(" / ") || other.tag || "")}</span>
                  </div>
                </a>
              `;
            })
            .join("")}
        </div>
      </section>
    `
    : "";

  const infoMarkup = [
    { label: "Brand", value: category.client || category.title },
    { label: "Location", value: category.location },
    { label: "Summary", value: category.summary }
  ]
    .map(
      (item) => `
        <article class="info-card reveal">
          <div class="credit-label">${escapeHtml(item.label)}</div>
          <strong>${escapeHtml(item.value)}</strong>
        </article>
      `
    )
    .join("");

  return `
    <section class="page page-detail">
      <section class="detail-head reveal">
        <div>
          <a class="back-link" href="#/">Back to index</a>
          <div class="detail-kicker">[${escapeHtml(category.index)}] ${escapeHtml(category.client)}</div>
          <h1 class="detail-title">${escapeHtml(category.title)}</h1>
          <p class="detail-summary">${escapeHtml(category.summary)}</p>
        </div>
        <div class="detail-meta">
          ${factsMarkup}
        </div>
      </section>

      <section class="detail-hero reveal">
        ${createMediaMarkup(detailBgMedia, {
          className: "media-frame",
          autoplay: false,
          showControls: true,
          flag: "Brand"
        })}
        <div class="detail-hero-copy">
          <div class="detail-kicker">${escapeHtml(category.location)} / ${escapeHtml(category.year)}</div>
          <p class="detail-note">
            ${escapeHtml(content.site.detailHeroNote || "Her proje kendi alt sayfasında bilgi, medya ve yatay scroll bolumleriyle acilir. Medyalar asagi indikce yuklenir.")}
          </p>
          <div class="detail-services">${servicesMarkup}</div>
        </div>
      </section>

      <section class="story-grid">
        <aside class="story-rail reveal">
          <div>
            <div class="section-label">Project map</div>
            <p class="detail-note">${escapeHtml(
              content.site.projectMapNote || "Yatay seritler mouse wheel veya trackpad ile kaydirilabilir. Mobilde yatay swipe ile calisir."
            )}</p>
          </div>
          <nav class="detail-rail-links" aria-label="Proje bölümleri">
            ${railLinksMarkup}
          </nav>
          ${parentHubRailMarkup}
        </aside>

        <div class="story-sections">
          ${sectionsMarkup}

          <section class="story-block">
            <div class="section-label reveal">Project info</div>
            <div class="info-grid">
              ${infoMarkup}
            </div>
          </section>
        </div>
      </section>

      ${bottomNavMarkup}

      <div class="media-lightbox" data-media-lightbox>
        <div class="media-lightbox-inner">
          <button class="media-lightbox-close" type="button" data-lightbox-close>Close</button>
          <div class="media-lightbox-frame" data-lightbox-frame></div>
          <p class="media-lightbox-caption" data-lightbox-caption></p>
        </div>
      </div>
    </section>
  `;
}

function attachHomeEvents() {
  app.querySelectorAll("[data-open-project]").forEach((button) => {
    button.addEventListener("click", () => {
      const projectId = button.getAttribute("data-open-project");
      if (projectId) {
        window.location.hash = `#/project/${projectId}`;
      }
    });
  });

  // Cursor state + dynamic label + video hover play
  app.querySelectorAll(".home-card").forEach((card) => {
    const projectId = card.getAttribute("data-open-project");
    const cat = getCategoryById(projectId);
    const cardLabel = cat ? cat.title : "View";

    card.addEventListener("mouseenter", () => {
      cursorOverCard = true;
      if (cursorLabelEl) cursorLabelEl.textContent = cardLabel;
      const video = card.querySelector("video");
      if (video && video.src && video.paused) {
        video.muted = false;
        video.play().catch(() => {});
      }
    });

    card.addEventListener("mouseleave", () => {
      cursorOverCard = false;
      const video = card.querySelector("video");
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    });
  });
}

function attachDetailMediaLightbox(category) {
  if (!category) {
    return;
  }

  const lightbox = document.querySelector("[data-media-lightbox]");
  if (!lightbox) {
    return;
  }

  const frame = lightbox.querySelector("[data-lightbox-frame]");
  const captionEl = lightbox.querySelector("[data-lightbox-caption]");
  const closeBtn = lightbox.querySelector("[data-lightbox-close]");

  const close = () => {
    if (frame) {
      const activeVideo = frame.querySelector("video");
      if (activeVideo) {
        activeVideo.pause();
        activeVideo.currentTime = 0;
      }
      while (frame.firstChild) {
        frame.removeChild(frame.firstChild);
      }
    }
    lightbox.classList.remove("is-visible");
    document.removeEventListener("keydown", onKeyDown);
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      close();
    }
  };

  if (closeBtn && !closeBtn.dataset.lightboxBound) {
    closeBtn.dataset.lightboxBound = "1";
    closeBtn.addEventListener("click", close);
  }

  if (!lightbox.dataset.lightboxBound) {
    lightbox.dataset.lightboxBound = "1";
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) {
        close();
      }
    });
  }

  if (frame && !frame.dataset.lightboxBound) {
    frame.dataset.lightboxBound = "1";
    frame.addEventListener("click", (event) => {
      if (event.target === frame) {
        close();
      }
    });
  }

  app.querySelectorAll(".strip-item").forEach((item) => {
    if (item.dataset.lightboxBound === "1") {
      return;
    }

    item.dataset.lightboxBound = "1";
    item.addEventListener("click", () => {
      const img = item.querySelector("img");
      const video = item.querySelector("video");
      const hoverText = item.getAttribute("data-hover-text") || "";

      let type = "image";
      let src = "";
      let poster = "";
      let alt = "";
      let currentTime = 0;

      if (video) {
        type = "video";
        src = video.dataset.src || video.currentSrc || video.src || "";
        poster = video.getAttribute("poster") || "";
        alt = video.getAttribute("aria-label") || "";
        currentTime = video.currentTime || 0;
        video.pause();
        video.muted = true;
      } else if (img) {
        type = "image";
        src = img.dataset.src || img.currentSrc || img.src || "";
        alt = img.getAttribute("alt") || "";
      }

      if (!src || !frame) {
        return;
      }

      while (frame.firstChild) {
        frame.removeChild(frame.firstChild);
      }

      if (type === "video") {
        const el = document.createElement("video");
        el.controls = true;
        el.autoplay = true;
        el.muted = false;
        el.loop = true;
        el.playsInline = true;
        el.src = src;
        if (poster) {
          el.poster = poster;
        }
        if (currentTime > 0) {
          const seekTo = currentTime;
          const applyTime = () => {
            try {
              el.currentTime = seekTo;
            } catch {}
          };
          if (el.readyState >= 1) {
            applyTime();
          } else {
            el.addEventListener("loadedmetadata", applyTime, { once: true });
          }
        }
        frame.appendChild(el);
      } else {
        const el = document.createElement("img");
        el.src = src;
        if (alt) {
          el.alt = alt;
        }
        frame.appendChild(el);
      }

      if (captionEl) {
        captionEl.textContent = hoverText || "";
      }

      lightbox.classList.add("is-visible");
      document.addEventListener("keydown", onKeyDown);
    });
  });
}

function attachInPageScrollEvents() {
  app.querySelectorAll("[data-scroll-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-scroll-target");
      if (!targetId) {
        return;
      }

      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

function attachHeaderNavEvents() {
  document.querySelectorAll("[data-nav-target]").forEach((link) => {
    if (link.dataset.navBound === "true") {
      return;
    }

    link.dataset.navBound = "true";
    link.addEventListener("click", (event) => {
      event.preventDefault();

      const targetId = link.getAttribute("data-nav-target");
      if (!targetId) {
        return;
      }

      state.pendingScrollTarget = targetId;

      if (state.currentId) {
        window.location.hash = "#/";
        return;
      }

      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        state.pendingScrollTarget = null;
      }
    });
  });
}

function setupRevealObserver() {
  state.revealObserver?.disconnect();

  const revealItems = app.querySelectorAll(".reveal");
  state.revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          state.revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -8% 0px"
    }
  );

  revealItems.forEach((item) => state.revealObserver.observe(item));
}

function hydrateMediaNode(node) {
  if (!node || node.dataset.loaded === "true") {
    return;
  }

  const source = node.dataset.src;
  if (!source) {
    return;
  }

  if (node.tagName === "IMG") {
    node.src = source;
  }

  if (node.tagName === "VIDEO") {
    node.src = source;
    node.load();

    if (node.hasAttribute("autoplay")) {
      node.muted = false;
      const playAttempt = node.play();
      if (playAttempt && typeof playAttempt.catch === "function") {
        playAttempt.catch(() => {});
      }
    }
  }

  node.dataset.loaded = "true";
}

function setupLazyMedia() {
  state.lazyObserver?.disconnect();

  const mediaNodes = app.querySelectorAll("img[data-src], video[data-src]");
  state.lazyObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          hydrateMediaNode(entry.target);
          state.lazyObserver.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: "160px 0px"
    }
  );

  mediaNodes.forEach((node) => state.lazyObserver.observe(node));
}

function setupHorizontalScroll() {
  app.querySelectorAll("[data-horizontal-scroll]").forEach((strip) => {
    strip.addEventListener(
      "wheel",
      (event) => {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
          return;
        }

        strip.scrollBy({
          left: event.deltaY,
          behavior: "auto"
        });
        event.preventDefault();
      },
      { passive: false }
    );
  });
}

function setupCompanyMarquee() {
  if (state.marqueeRaf) {
    cancelAnimationFrame(state.marqueeRaf);
    state.marqueeRaf = null;
  }

  const viewport = app.querySelector("[data-company-marquee]");
  const runner = app.querySelector("[data-company-runner]");
  const track = app.querySelector("[data-company-track]");

  if (!viewport || !runner || !track) {
    return;
  }

  let x = 0;
  let speed = 52;
  let targetSpeed = 52;
  state.marqueeLastTime = 0;

  const setSlow = () => {
    targetSpeed = 16;
  };

  const setNormal = () => {
    targetSpeed = 52;
  };

  viewport.addEventListener("mouseenter", setSlow);
  viewport.addEventListener("mouseleave", setNormal);

  const tick = (time) => {
    if (!track.isConnected || !runner.isConnected) {
      return;
    }

    if (state.marqueeLastTime === 0) {
      state.marqueeLastTime = time;
    }

    const dt = (time - state.marqueeLastTime) / 1000;
    state.marqueeLastTime = time;

    speed += (targetSpeed - speed) * 0.08;
    x -= speed * dt;

    const width = track.offsetWidth;
    if (width > 0 && Math.abs(x) >= width) {
      x += width;
    }

    runner.style.transform = `translate3d(${x}px, 0, 0)`;
    state.marqueeRaf = requestAnimationFrame(tick);
  };

  state.marqueeRaf = requestAnimationFrame(tick);
}

function setupCategoryMediaStrip(category) {
  state.stripCleanup?.();
  state.stripCleanup = null;
  state.stripObserver?.disconnect();
  state.stripObserver = null;

  if (!category) {
    return;
  }

  const strip = app.querySelector("[data-strip-category]");
  if (!strip) {
    return;
  }

  const allMedia = getCategoryAllMedia(category);
  const BATCH_SIZE = 18;
  const stripState = {
    strip,
    media: Array.isArray(allMedia) ? allMedia : [],
    cursor: 0,
    loading: false,
    activeFilter: "all"
  };

  const applyFilter = () => {
    stripState.strip.querySelectorAll(".strip-item").forEach((item) => {
      const itemSub = normalizeIdPart(item.getAttribute("data-strip-item-sub-category") || "");
      const shouldShow = stripState.activeFilter === "all" || itemSub === stripState.activeFilter;
      item.style.display = shouldShow ? "" : "none";
    });
  };

  const appendBatch = () => {
    if (stripState.loading || stripState.cursor >= stripState.media.length) {
      return;
    }

    stripState.loading = true;
    const end = Math.min(stripState.cursor + BATCH_SIZE, stripState.media.length);
    const batch = stripState.media.slice(stripState.cursor, end).map(createStripItemMarkup).join("");
    stripState.strip.insertAdjacentHTML("beforeend", batch);
    stripState.cursor = end;
    stripState.loading = false;
    applyFilter();

    stripState.strip.querySelectorAll("img[data-src], video[data-src]").forEach((node) => {
      if (node.dataset.stripObserved === "1") {
        return;
      }
      node.dataset.stripObserved = "1";
      state.stripObserver?.observe(node);
    });
  };

  const onScroll = () => {
    const nearEnd = stripState.strip.scrollLeft + stripState.strip.clientWidth >= stripState.strip.scrollWidth - 800;
    if (nearEnd) {
      appendBatch();
    }
  };

  state.stripObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const node = entry.target;

        if (entry.isIntersecting) {
          hydrateMediaNode(node);
          if (node.tagName === "VIDEO" && category.id === "video-motion") {
            node.play().catch(() => {});
          }
        } else if (node.tagName === "VIDEO") {
          node.pause();
        }
      });
    },
    {
      root: null,
      rootMargin: "160px 320px",
      threshold: 0.01
    }
  );

  appendBatch();
  appendBatch();
  stripState.strip.addEventListener("scroll", onScroll, { passive: true });

  const filterButtons = Array.from(app.querySelectorAll("[data-media-filter]"));
  const onFilterClick = (event) => {
    const button = event.currentTarget;
    const filterValue = normalizeIdPart(button.getAttribute("data-media-filter") || "all") || "all";
    stripState.activeFilter = filterValue;

    filterButtons.forEach((btn) => {
      const btnFilter = normalizeIdPart(btn.getAttribute("data-media-filter") || "all") || "all";
      btn.classList.toggle("is-active", btnFilter === filterValue);
    });

    applyFilter();
  };

  filterButtons.forEach((button) => button.addEventListener("click", onFilterClick));

  state.stripCleanup = () => {
    stripState.strip.removeEventListener("scroll", onScroll);
    filterButtons.forEach((button) => button.removeEventListener("click", onFilterClick));
    state.stripObserver?.disconnect();
    state.stripObserver = null;
  };
}

function initHomeEyes() {
  state.homeEyesCleanup?.();
  state.homeEyesCleanup = null;

  const stage = document.getElementById("home-eyes-stage");
  if (!stage) {
    return;
  }

  const pupils = Array.from(stage.querySelectorAll(".home-eyes-pupil"));
  if (!pupils.length) {
    return;
  }

  const maxOffset = 4; // px, göz bebeğinin hafifçe oynayacağı yarıçap
  let editMode = false;
  let activePupil = null;

  const resetEyes = () => {
    pupils.forEach((eye) => {
      eye.style.transform = "translate(-50%, -50%)";
    });
  };

  const onMouseMove = (event) => {
    if (editMode) {
      // Edit modunda konum sabit, sadece dragging sırasında left/top değişiyor
      if (!activePupil) {
        resetEyes();
      }
      return;
    }

    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const dist = Math.hypot(dx, dy) || 1;

    const nx = (dx / dist) * maxOffset;
    const ny = (dy / dist) * maxOffset;

    pupils.forEach((eye) => {
      eye.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
    });
  };

  const onMouseLeave = () => {
    resetEyes();
  };

  const onKeyDown = (event) => {
    if (event.key === "e" || event.key === "E") {
      editMode = !editMode;
      stage.classList.toggle("is-editing", editMode);
      if (editMode) {
        resetEyes();
        console.log("Home eyes edit mode: ON (gözleri sürükleyerek hizala, konumlar console'a yazılacak)");
      } else {
        console.log("Home eyes edit mode: OFF");
      }
    }
  };

  pupils.forEach((eye) => {
    eye.addEventListener("mousedown", (event) => {
      if (!editMode) return;
      event.preventDefault();
      activePupil = eye;
    });
  });

  const onDragMove = (event) => {
    if (!editMode || !activePupil) return;

    const rect = stage.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const pctX = (x / rect.width) * 100;
    const pctY = (y / rect.height) * 100;

    activePupil.style.left = `${pctX}%`;
    activePupil.style.top = `${pctY}%`;
  };

  const onDragUp = () => {
    if (editMode && activePupil) {
      const which = activePupil.classList.contains("home-eyes-pupil-left") ? "left" : "right";
      console.log(
        `Home pupil ${which} konumu -> left: ${activePupil.style.left}, top: ${activePupil.style.top}`
      );
    }
    activePupil = null;
  };

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseleave", onMouseLeave);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("mousemove", onDragMove);
  window.addEventListener("mouseup", onDragUp);

  state.homeEyesCleanup = () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseleave", onMouseLeave);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("mousemove", onDragMove);
    window.removeEventListener("mouseup", onDragUp);
  };

  resetEyes();
}

function renderApp() {
  const categoryId = getHashCategoryId();
  const category = getCategoryById(categoryId);
  state.currentId = category?.id || null;

  app.innerHTML = category ? renderDetailPage(category) : renderHomePage();

  if (!category) {
    initHomeEyes();
  } else {
    state.homeEyesCleanup?.();
    state.homeEyesCleanup = null;
  }

  attachHomeEvents();
  attachInPageScrollEvents();
  attachHeaderNavEvents();
  setupRevealObserver();
  setupLazyMedia();
  setupHorizontalScroll();
  setupCategoryMediaStrip(category);
  setupCompanyMarquee();
  attachDetailMediaHoverEvents(category);
  attachDetailMediaLightbox(category);
  setupCategoryDisclosurePreviews();
  initSamplePreview();
  bindCategorySampleHoverPreview();

  if (!category) {
    cursorMetaVisible = false;
  }

  if (state.pendingScrollTarget) {
    const target = document.getElementById(state.pendingScrollTarget);
    if (target) {
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      state.pendingScrollTarget = null;
      return;
    }
  }

  window.scrollTo({ top: 0, behavior: "auto" });
}

function init() {
  syncSiteChrome();
  initCursor();
  updateClock();
  renderApp();
  setInterval(updateClock, 30000);

  window.addEventListener("hashchange", renderApp);
}

init();

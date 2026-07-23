/* Disha Tuitions — lightweight interactions (vanilla + GSAP CDN) */
(function () {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* Loader */
  window.addEventListener("load", () => {
    const loader = $(".loader");
    if (loader) loader.classList.add("hide");
  });

  /* Theme */
  const root = document.documentElement;
  const saved = localStorage.getItem("disha-theme");
  if (saved) root.setAttribute("data-theme", saved);
  else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    root.setAttribute("data-theme", "dark");
  }

  $$("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem("disha-theme", next);
    });
  });

  /* Mobile nav */
  const hamburger = $(".hamburger");
  const navLinks = $(".nav-links");
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      const open = navLinks.classList.toggle("open");
      hamburger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    navLinks.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => navLinks.classList.remove("open"));
    });
  }

  /* Active nav on scroll */
  const sections = $$("section[id]");
  const navAnchors = $$('.nav-links a[href^="#"], .nav-links a[href*="/#"]');
  if (sections.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          navAnchors.forEach((a) => {
            const href = a.getAttribute("href") || "";
            const match = href.endsWith("#" + id) || href === "#" + id;
            a.classList.toggle("active", match);
          });
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((s) => io.observe(s));
  }

  /* Ripple */
  $$(".btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      const rect = this.getBoundingClientRect();
      const span = document.createElement("span");
      const size = Math.max(rect.width, rect.height);
      span.className = "ripple";
      span.style.width = span.style.height = size + "px";
      span.style.left = e.clientX - rect.left - size / 2 + "px";
      span.style.top = e.clientY - rect.top - size / 2 + "px";
      this.appendChild(span);
      setTimeout(() => span.remove(), 600);
    });
  });

  /* FAQ */
  $$(".faq-item").forEach((item) => {
    const q = $(".faq-q", item);
    if (!q) return;
    q.addEventListener("click", () => {
      const open = item.classList.contains("open");
      $$(".faq-item.open").forEach((i) => i.classList.remove("open"));
      if (!open) item.classList.add("open");
    });
  });

  /* Year */
  $$("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- Google reviews (static JSON snapshot) ---------- */
  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function initials(name) {
    return String(name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
  }

  function stars(n) {
    const r = Math.max(0, Math.min(5, Math.round(Number(n) || 5)));
    return "★".repeat(r) + "☆".repeat(5 - r);
  }

  function relativeDate(iso) {
    if (!iso) return "Google review";
    const then = new Date(iso + "T00:00:00");
    if (Number.isNaN(then.getTime())) return "Google review";
    const days = Math.floor((Date.now() - then.getTime()) / 86400000);
    if (days < 30) return days <= 1 ? "1 day ago" : days + " days ago";
    const months = Math.floor(days / 30);
    if (months < 12) return months === 1 ? "1 month ago" : months + " months ago";
    const years = Math.floor(months / 12);
    return years === 1 ? "1 year ago" : years + " years ago";
  }

  function avatarHtml(review) {
    if (review.photo) {
      return `<img class="avatar avatar-img" src="${escapeHtml(review.photo)}" alt="" width="44" height="44" loading="lazy" referrerpolicy="no-referrer">`;
    }
    return `<div class="avatar">${escapeHtml(initials(review.name))}</div>`;
  }

  function cardHtml(review, compact) {
    const text = (review.text || "").trim();
    if (!text) return "";
    const quote = compact ? `“${escapeHtml(text)}”` : escapeHtml(text);
    return `<article class="${compact ? "testimonial-card" : "review-card"}">
      <div class="stars" aria-label="${review.rating} stars">${stars(review.rating)}</div>
      <p>${quote}</p>
      <div class="person">${avatarHtml(review)}<div><strong>${escapeHtml(review.name)}</strong><span>Google · ${escapeHtml(relativeDate(review.date))}</span></div></div>
    </article>`;
  }

  function startMarquee(track) {
    if (!track || reduced || typeof gsap === "undefined") return;
    const cards = track.innerHTML;
    track.innerHTML = cards + cards;
    gsap.to(track, {
      xPercent: -50,
      duration: 70,
      ease: "none",
      repeat: -1,
    });
  }

  function applyReviewMeta(data) {
    $$("[data-rating-score]").forEach((el) => {
      el.textContent = String(data.rating);
    });
    $$("[data-rating-total]").forEach((el) => {
      el.textContent = String(data.total);
    });
    $$("[data-google-review-link]").forEach((a) => {
      if (data.writeReviewUrl) a.href = data.writeReviewUrl;
    });
    $$("[data-google-maps-link]").forEach((a) => {
      if (data.mapsUrl) a.href = data.mapsUrl;
    });
    const hl = $("[data-review-highlights]");
    if (hl && data.highlights && data.highlights.length) {
      hl.innerHTML = data.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join("");
    }
  }

  fetch("/data/google-reviews.json")
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((data) => {
      applyReviewMeta(data);
      const withText = (data.reviews || []).filter((x) => x.text && String(x.text).trim());

      const track = $("[data-testimonial-track]");
      if (track) {
        const featured = withText.slice(0, 16);
        track.innerHTML = featured.map((r) => cardHtml(r, true)).join("");
        startMarquee(track);
      }

      const grid = $("[data-reviews-grid]");
      if (grid) {
        grid.innerHTML = withText.map((r) => cardHtml(r, false)).join("") || "<p>No reviews found.</p>";
      }
    })
    .catch(() => {
      const track = $("[data-testimonial-track]");
      if (track) track.innerHTML = "<p class='section-lead' style='padding:1rem'>Reviews unavailable right now.</p>";
      const grid = $("[data-reviews-grid]");
      if (grid) grid.innerHTML = "<p class='section-lead'>Reviews unavailable right now.</p>";
    });

  /* GSAP (optional — site works without it) */
  if (reduced || typeof gsap === "undefined") {
    $$(".reveal").forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    runCountersImmediate();
    return;
  }

  if (typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
  }

  /* Floating math formulas */
  $$(".math-float span").forEach((el, i) => {
    gsap.to(el, {
      y: i % 2 === 0 ? -24 : 24,
      x: i % 3 === 0 ? 12 : -12,
      duration: 3 + (i % 4),
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: i * 0.2,
    });
  });

  /* Hero entrance */
  const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
  heroTl
    .from(".hero-copy > *", { y: 36, opacity: 0, duration: 0.8, stagger: 0.12 })
    .from(".hero-visual", { x: 40, opacity: 0, duration: 0.9 }, "-=0.5");

  /* Scroll reveals */
  $$(".reveal").forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start: "top 88%",
        toggleActions: "play none none none",
      },
    });
  });

  /* Stagger cards */
  [".card-grid .card", ".courses-grid .course-card", ".process-step", ".result-card"].forEach(
    (sel) => {
      const items = $$(sel);
      if (!items.length) return;
      gsap.from(items, {
        opacity: 0,
        y: 28,
        duration: 0.55,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: {
          trigger: items[0].parentElement,
          start: "top 85%",
        },
      });
    }
  );

  /* Animated counters */
  $$("[data-count]").forEach((el) => {
    const target = parseFloat(el.getAttribute("data-count")) || 0;
    const suffix = el.getAttribute("data-suffix") || "";
    const obj = { val: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          val: target,
          duration: 1.6,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = Math.round(obj.val) + suffix;
          },
        });
      },
    });
  });

  function runCountersImmediate() {
    $$("[data-count]").forEach((el) => {
      const target = el.getAttribute("data-count") || "0";
      const suffix = el.getAttribute("data-suffix") || "";
      el.textContent = target + suffix;
    });
  }
})();

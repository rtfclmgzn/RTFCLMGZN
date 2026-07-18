// RTFCLMGZN cover-image usage registry and hard 90-day publication gate.
// Loaded after every article data file and before app.js.
(function () {
  "use strict";

  var COOLDOWN_DAYS = 90;
  var DAY_MS = 86400000;

  function allArticles() {
    return []
      .concat(window.RTFC_ARTICLES || [])
      .concat(window.RTFC_LIVE_ARTICLES || [])
      .concat(window.RTFC_NEWSROOM_ARTICLES || [])
      .concat(window.RTFC_RESEARCH || []);
  }

  // Magazine cover + page images, shaped like article usage records so the 90-day
  // gate spans articles AND magazines: no image (library or generated) may appear on
  // a second article OR magazine cover/page within the cooldown window.
  function allMagazineImageUses() {
    var out = [];
    (window.RTFC_MAGAZINE_ISSUES || []).forEach(function (iss) {
      if (!iss) return;
      var when = (iss.month ? iss.month + "-01T12:00:00Z" : null) ||
        (typeof iss.published === "string" ? iss.published : null) || iss.date;
      if (!when) return;
      var base = "magazine:" + (iss.id || iss.number || "issue");
      var month = iss.month || String(when).slice(0, 7);
      if (iss.cover && iss.cover.image) {
        out.push({ id: base + ":cover", slug: iss.id, image: iss.cover.image, publishedAt: when, month: month });
      }
      (iss.spreads || iss.pages || []).forEach(function (pg, i) {
        if (!pg) return;
        if (pg.image) out.push({ id: base + ":p" + i, slug: iss.id, image: pg.image, publishedAt: when, month: month });
        // one nested level: spread sub-items (acts, panels, etc.) can carry images too
        Object.keys(pg).forEach(function (k) {
          if (!Array.isArray(pg[k])) return;
          pg[k].forEach(function (sub, j) {
            if (sub && typeof sub === "object" && sub.image) {
              out.push({ id: base + ":p" + i + ":" + k + j, slug: iss.id, image: sub.image, publishedAt: when, month: month });
            }
          });
        });
      });
    });
    return out;
  }

  // The full universe of image uses the cooldown reasons about: articles + magazines.
  function allImageUses() {
    return allArticles().concat(allMagazineImageUses());
  }

  function normalizePath(path) {
    return String(path || "").trim().replace(/^\.\//, "");
  }

  function isProductionCover(path) {
    path = normalizePath(path).toLowerCase();
    if (!path) return false;
    if (path.indexOf("data:image/svg") === 0) return false;
    if (/\.svg(?:\?|$)/.test(path)) return false;
    return /\.(?:jpe?g|png|webp|avif)(?:\?|$)/.test(path) || /^data:image\/(?:jpeg|png|webp|avif);/.test(path);
  }

  function buildRegistry(articles) {
    var byPath = {};
    (articles || []).forEach(function (article) {
      var path = normalizePath(article.image);
      if (!path || !article.id || !article.publishedAt) return;
      if (!byPath[path]) {
        byPath[path] = {
          image_id: path.split("/").pop(),
          path: path,
          first_used_at: article.publishedAt,
          last_used_at: article.publishedAt,
          use_count: 0,
          article_ids: [],
          slugs: []
        };
      }
      var row = byPath[path];
      row.use_count += 1;
      if (row.article_ids.indexOf(article.id) < 0) row.article_ids.push(article.id);
      if (article.slug && row.slugs.indexOf(article.slug) < 0) row.slugs.push(article.slug);
      if (new Date(article.publishedAt) < new Date(row.first_used_at)) row.first_used_at = article.publishedAt;
      if (new Date(article.publishedAt) > new Date(row.last_used_at)) row.last_used_at = article.publishedAt;
    });
    return Object.keys(byPath).map(function (key) { return byPath[key]; });
  }

  function withinDays(olderIso, newerIso, days) {
    var older = new Date(olderIso).getTime();
    var newer = new Date(newerIso).getTime();
    if (!isFinite(older) || !isFinite(newer)) return false;
    return newer >= older && (newer - older) < days * DAY_MS;
  }

  function eligible(path, articleId, nowIso, batchPaths) {
    path = normalizePath(path);
    if (!isProductionCover(path)) return false;
    if ((batchPaths || []).indexOf(path) >= 0) return false;

    var rows = buildRegistry(allImageUses()).filter(function (row) { return row.path === path; });
    if (!rows.length) return true;

    var row = rows[0];
    var sameArticleOnly = row.article_ids.length === 1 && row.article_ids[0] === articleId;
    // An article keeps its own cover across updates even after a magazine issue
    // reprinted it (magazine reprint = same editorial object, not a second use).
    var retainedWithReprints = row.article_ids.indexOf(articleId) >= 0 &&
      row.article_ids.every(function (id) {
        return id === articleId || String(id).indexOf("magazine:") === 0;
      });
    if (sameArticleOnly || retainedWithReprints) return true;
    return !withinDays(row.last_used_at, nowIso || new Date().toISOString(), COOLDOWN_DAYS);
  }

  function validate(articles, options) {
    options = options || {};
    var nowIso = options.nowIso || new Date().toISOString();
    var batchIds = options.batchIds || [];
    // Conflicts are checked against the full universe (articles + magazines) so an
    // article can't reuse an image a magazine used inside the cooldown, and vice versa.
    var universe = options.universe || allImageUses();
    var errors = [];
    var seenBatch = {};

    (articles || []).forEach(function (article) {
      var path = normalizePath(article.image);
      if (!path) {
        errors.push({ code: "missing-cover", article_id: article.id, message: "Article has no cover image." });
        return;
      }
      if (!isProductionCover(path)) {
        errors.push({ code: "non-production-cover", article_id: article.id, path: path, message: "Article cover must be raster editorial artwork; SVG and placeholder covers are forbidden." });
      }

      if (batchIds.indexOf(article.id) >= 0) {
        if (seenBatch[path] && seenBatch[path] !== article.id) {
          errors.push({
            code: "same-batch-reuse",
            article_id: article.id,
            other_article_id: seenBatch[path],
            path: path,
            message: "Two articles in the same batch share a cover."
          });
        }
        seenBatch[path] = article.id;
      }

      var conflicts = universe.filter(function (other) {
        if (!other || other.id === article.id) return false;
        if (normalizePath(other.image) !== path) return false;
        // Reprint carve-out: a month-in-review issue deliberately reprints its own
        // month's articles WITH their cover art — same editorial object, not a
        // repeat. Exempt magazine uses when the article's month is <= the issue's
        // month. A LATER article can never take an image a magazine used.
        if (String(other.id).indexOf("magazine:") === 0 && other.month &&
            String(article.publishedAt || "").slice(0, 7) <= other.month) return false;
        return withinDays(other.publishedAt, article.publishedAt || nowIso, COOLDOWN_DAYS) ||
               withinDays(article.publishedAt, other.publishedAt || nowIso, COOLDOWN_DAYS);
      });

      conflicts.forEach(function (other) {
        var key = [article.id, other.id, path].sort().join("|");
        if (errors.some(function (e) { return e.key === key; })) return;
        var otherIsMagazine = String(other.id).indexOf("magazine:") === 0;
        errors.push({
          key: key,
          code: "90-day-cover-reuse",
          article_id: article.id,
          other_article_id: other.id,
          path: path,
          message: otherIsMagazine
            ? "Cover reused from a magazine issue inside the 90-day cooldown."
            : "Cover reused by different articles inside the 90-day cooldown."
        });
      });
    });

    return { ok: errors.length === 0, cooldown_days: COOLDOWN_DAYS, errors: errors };
  }

  function assertPublishable(articles, options) {
    var result = validate(articles, options);
    if (!result.ok) {
      var detail = result.errors.map(function (e) { return e.code + ":" + (e.article_id || "unknown") + (e.path ? "@" + e.path : ""); }).join(", ");
      throw new Error("COVER PUBLICATION BLOCKED — " + detail + ". Select another eligible library image or generate a proper Gemini/Nano Banana cover.");
    }
    return result;
  }

  window.RTFC_IMAGE_USAGE = buildRegistry(allImageUses());
  window.RTFC_IMAGE_USAGE_POLICY = {
    cooldown_days: COOLDOWN_DAYS,
    spans_articles_and_magazines: true,
    no_same_batch_reuse: true,
    same_article_updates_may_retain_cover: true,
    library_first_after_cooldown_filter: true,
    generate_when_no_eligible_library_image: true,
    placeholder_fallback_allowed: false,
    raster_editorial_art_required: true,
    on_conflict: "block publication until an eligible library or Gemini/Nano Banana cover exists"
  };
  window.RTFC_IMAGE_USAGE_API = {
    buildRegistry: buildRegistry,
    eligible: eligible,
    validate: validate,
    assertPublishable: assertPublishable,
    normalizePath: normalizePath,
    isProductionCover: isProductionCover,
    allImageUses: allImageUses,
    allMagazineImageUses: allMagazineImageUses
  };

  var audit = validate(allArticles());
  window.RTFC_IMAGE_USAGE_AUDIT = audit;
  if (!audit.ok && typeof console !== "undefined" && console.error) {
    console.error("RTFCLMGZN cover publication audit failed:", audit.errors);
  }
})();
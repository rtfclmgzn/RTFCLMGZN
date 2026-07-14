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

    var rows = buildRegistry(allArticles()).filter(function (row) { return row.path === path; });
    if (!rows.length) return true;

    var row = rows[0];
    var sameArticleOnly = row.article_ids.length === 1 && row.article_ids[0] === articleId;
    if (sameArticleOnly) return true;
    return !withinDays(row.last_used_at, nowIso || new Date().toISOString(), COOLDOWN_DAYS);
  }

  function validate(articles, options) {
    options = options || {};
    var nowIso = options.nowIso || new Date().toISOString();
    var batchIds = options.batchIds || [];
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

      var conflicts = (articles || []).filter(function (other) {
        if (!other || other.id === article.id) return false;
        if (normalizePath(other.image) !== path) return false;
        return withinDays(other.publishedAt, article.publishedAt || nowIso, COOLDOWN_DAYS) ||
               withinDays(article.publishedAt, other.publishedAt || nowIso, COOLDOWN_DAYS);
      });

      conflicts.forEach(function (other) {
        var key = [article.id, other.id, path].sort().join("|");
        if (errors.some(function (e) { return e.key === key; })) return;
        errors.push({
          key: key,
          code: "90-day-cover-reuse",
          article_id: article.id,
          other_article_id: other.id,
          path: path,
          message: "Cover reused by different articles inside the 90-day cooldown."
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

  window.RTFC_IMAGE_USAGE = buildRegistry(allArticles());
  window.RTFC_IMAGE_USAGE_POLICY = {
    cooldown_days: COOLDOWN_DAYS,
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
    isProductionCover: isProductionCover
  };

  var audit = validate(allArticles());
  window.RTFC_IMAGE_USAGE_AUDIT = audit;
  if (!audit.ok && typeof console !== "undefined" && console.error) {
    console.error("RTFCLMGZN cover publication audit failed:", audit.errors);
  }
})();
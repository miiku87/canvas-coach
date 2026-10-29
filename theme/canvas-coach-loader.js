/*
 * Canvas Coach – Canvas theme JavaScript loader.
 *
 * Paste this into Admin > Themes > (theme) > Upload > JavaScript file
 * (or append it to your existing theme JS). Change serverUrl to your
 * Canvas Coach server. The widget itself only appears to teachers,
 * TAs, course designers and admins on supported course pages.
 */
(function () {
  var config = (window.CANVAS_COACH_CONFIG = window.CANVAS_COACH_CONFIG || {});
  config.serverUrl = config.serverUrl || "https://coach.example.fi";

  if (!/^\/courses\/\d+/.test(window.location.pathname)) return;
  var script = document.createElement("script");
  script.src = config.serverUrl.replace(/\/$/, "") + "/widget.js";
  script.async = true;
  document.head.appendChild(script);
})();

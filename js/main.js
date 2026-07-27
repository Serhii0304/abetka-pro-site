(function () {
  "use strict";

  document.documentElement.classList.add("js-ready");

  var menuButton = document.querySelector("[data-menu-toggle]");
  var menu = document.querySelector("[data-menu]");

  function closeMenu() {
    if (!menuButton || !menu) return;
    menu.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded", "false");
  }

  if (menuButton && menu) {
    menuButton.addEventListener("click", function () {
      var isOpen = menu.classList.toggle("is-open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
    });

    menu.addEventListener("click", function (event) {
      if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
        menuButton.focus();
      }
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      var id = link.getAttribute("href");
      if (!id || id === "#") return;
      var target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      history.pushState(null, "", id);
    });
  });

  document.querySelectorAll("[data-copy-target]").forEach(function (button) {
    button.addEventListener("click", async function () {
      var target = document.querySelector(button.dataset.copyTarget);
      if (!target) return;
      var text = target.value || target.textContent || "";
      var statusSelector = button.dataset.copyStatus;
      var status = statusSelector ? document.querySelector(statusSelector) : null;
      var original = button.textContent;

      try {
        await navigator.clipboard.writeText(text.trim());
        button.textContent = "Скопійовано";
        if (status) status.textContent = "Текст скопійовано в буфер обміну.";
      } catch (error) {
        var range = document.createRange();
        range.selectNodeContents(target);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        if (status) {
          status.textContent =
            "Не вдалося скопіювати автоматично. Текст виділено — натисніть Ctrl+C.";
        }
      }

      window.setTimeout(function () {
        button.textContent = original;
      }, 2200);
    });
  });

  document.querySelectorAll(".screenshot-frame").forEach(function (frame) {
    var image = frame.querySelector(".screenshot-image");
    if (!image) return;

    function reveal() {
      if (image.naturalWidth > 0) frame.classList.add("has-image");
    }

    if (image.complete) reveal();
    image.addEventListener("load", reveal);
  });
})();

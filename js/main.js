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

  /* Копіювання в буфер обміну має три рівні, бо жоден із них не працює всюди:
     сучасний navigator.clipboard недоступний, якщо сторінку відкрито з файлу
     (file://), а старий execCommand прибирають із браузерів. Якщо не спрацював
     жоден — текст лишається виділеним, і людині достатньо натиснути Ctrl+C. */
  function selectContents(element) {
    var range = document.createRange();
    range.selectNodeContents(element);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  document.querySelectorAll("[data-copy-target]").forEach(function (button) {
    var originalLabel = button.textContent;

    button.addEventListener("click", async function () {
      var target = document.querySelector(button.dataset.copyTarget);
      if (!target) return;
      var text = (target.value || target.textContent || "").trim();
      var statusSelector = button.dataset.copyStatus;
      var status = statusSelector ? document.querySelector(statusSelector) : null;
      var copied = false;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          copied = true;
        } catch (error) {
          copied = false;
        }
      }

      if (!copied) {
        selectContents(target);
        try {
          copied = document.execCommand("copy");
        } catch (error) {
          copied = false;
        }
        if (copied) window.getSelection().removeAllRanges();
      }

      if (status) {
        status.classList.toggle("is-manual", !copied);
        status.textContent = copied
          ? "Скопійовано в буфер обміну."
          : "Текст виділено — натисніть Ctrl+C, щоб скопіювати.";
      }
      if (copied) button.textContent = "Скопійовано";

      window.setTimeout(function () {
        button.textContent = originalLabel;
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

  /* ----------------------------------------------------------------------
     Динамічне оформлення. Усе нижче — доповнення: якщо браузер не підтримує
     IntersectionObserver або користувач попросив зменшити анімацію, сторінка
     просто показує весь вміст одразу.
     ---------------------------------------------------------------------- */

  var calmMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canObserve = "IntersectionObserver" in window;

  // Поява блоків під час прокручування.
  var revealables = document.querySelectorAll("[data-reveal]");
  if (!canObserve || calmMotion) {
    revealables.forEach(function (el) {
      el.classList.add("is-visible");
    });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );
    revealables.forEach(function (el) {
      revealObserver.observe(el);
    });

    /* Запобіжник. Спостерігач надійний, але якщо він із будь-якої причини не
       спрацює, вміст не має залишитися невидимим — це гірше за відсутність
       анімації. Тому додатково показуємо все, що вже потрапило в екран, і
       все, повз що людина вже прогорнула. */
    var revealVisibleNow = function () {
      revealables.forEach(function (el) {
        if (el.classList.contains("is-visible")) return;
        var box = el.getBoundingClientRect();
        var reachedByScroll = box.bottom < 0;
        var insideScreen = box.top < window.innerHeight && box.bottom > 0;
        if (reachedByScroll || insideScreen) {
          el.classList.add("is-visible");
          revealObserver.unobserve(el);
        }
      });
    };

    window.addEventListener("load", function () {
      window.setTimeout(revealVisibleNow, 400);
    });
    window.addEventListener("scroll", revealVisibleNow, { passive: true });
    window.addEventListener("resize", revealVisibleNow, { passive: true });
    window.setTimeout(revealVisibleNow, 1200);
  }

  // Показники, що набігають до свого значення.
  function formatNumber(value, style) {
    var text = String(value);
    if (style !== "space") return text;
    return text.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  function runCounter(el) {
    var target = Number(el.dataset.countTo);
    var style = el.dataset.countFormat;
    if (!isFinite(target) || target === 0) return;
    var duration = 1100;
    var started = null;

    function tick(now) {
      if (started === null) started = now;
      var progress = Math.min((now - started) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatNumber(Math.round(target * eased), style);
      if (progress < 1) window.requestAnimationFrame(tick);
    }

    window.requestAnimationFrame(tick);
  }

  var counters = document.querySelectorAll("[data-count-to]");
  if (counters.length && canObserve && !calmMotion) {
    var counterObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          runCounter(entry.target);
          counterObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach(function (el) {
      counterObserver.observe(el);
    });
  }

  /* Відео вантажиться з YouTube лише після натискання кнопки. До цього моменту
     сторінка не робить жодного запиту до сторонніх серверів — це принципово,
     бо приватність є головною обіцянкою програми. Домен youtube-nocookie.com
     не встановлює файли спостереження до початку відтворення. */
  var videoButton = document.querySelector("[data-video-play]");
  if (videoButton) {
    videoButton.addEventListener("click", function () {
      var frame = document.getElementById("video-frame");
      if (!frame) return;
      var id = frame.dataset.videoId;
      var iframe = document.createElement("iframe");
      iframe.src =
        "https://www.youtube-nocookie.com/embed/" +
        encodeURIComponent(id) +
        "?autoplay=1&rel=0&modestbranding=1&hl=uk";
      iframe.title = "Відео про програму «Абетка Pro»";
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allowFullscreen = true;
      frame.innerHTML = "";
      frame.appendChild(iframe);
    });
  }

  // Плаваюча смуга із закликом: з'являється після шапки й ховається біля підвалу.
  var stickyCta = document.querySelector("[data-sticky-cta]");
  var hero = document.querySelector(".hero");
  if (stickyCta && hero && canObserve) {
    stickyCta.hidden = false;
    var footer = document.querySelector(".site-footer");
    var pastHero = false;
    var atFooter = false;

    function syncSticky() {
      stickyCta.classList.toggle("is-visible", pastHero && !atFooter);
    }

    new IntersectionObserver(function (entries) {
      pastHero = !entries[0].isIntersecting;
      syncSticky();
    }).observe(hero);

    if (footer) {
      new IntersectionObserver(
        function (entries) {
          atFooter = entries[0].isIntersecting;
          syncSticky();
        },
        { rootMargin: "120px" }
      ).observe(footer);
    }
  }
})();

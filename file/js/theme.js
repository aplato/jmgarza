(function () {
	var themeKey = "site-theme";
	var root = document.documentElement;
	var savedTheme;

	try {
		savedTheme = localStorage.getItem(themeKey);
	} catch (error) {
		savedTheme = null;
	}

	if (savedTheme === "light" || savedTheme === "dark") {
		root.setAttribute("data-theme", savedTheme);
	}

	function initializeThemeToggle() {
		var toggle = document.getElementById("themeToggle");
		var systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
		if (!toggle) {
			return;
		}

		function currentTheme() {
			return root.getAttribute("data-theme") ||
				(systemTheme.matches ? "dark" : "light");
		}

		function updateToggle() {
			toggle.textContent = currentTheme() === "dark" ? "Use light theme" : "Use dark theme";
		if (systemTheme.addEventListener) {
			systemTheme.addEventListener("change", function () {
				if (!root.hasAttribute("data-theme")) {
					updateToggle();
				}
			});
		}
		}

		toggle.addEventListener("click", function () {
			var theme = currentTheme() === "dark" ? "light" : "dark";
			root.setAttribute("data-theme", theme);
			try {
				localStorage.setItem(themeKey, theme);
			} catch (error) {
				// The current page still changes theme if storage is unavailable.
			}
			updateToggle();
		});

		updateToggle();
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initializeThemeToggle);
	} else {
		initializeThemeToggle();
	}
})();
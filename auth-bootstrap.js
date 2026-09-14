(() => {
  try {
    if (localStorage.getItem("phuc-thinh-current-account-v1")) {
      document.documentElement.classList.add("is-authenticated");
    }
  } catch {
    // Rendering the login page is the safe fallback when storage is unavailable.
  }
})();

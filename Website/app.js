const LISTING_URL = "{{ listingInfo.Url }}";

const PACKAGES = {
{{~ for package in packages ~}}
  "{{ package.Name }}": {
    name: "{{ package.Name }}",
    displayName: "{{ if package.DisplayName; package.DisplayName | string.escape; end; }}",
    description: "{{ if package.Description; package.Description | string.escape; end; }}",
    version: "{{ package.Version }}",
    author: {
      name: "{{ if package.Author.Name; package.Author.Name | string.escape; end; }}",
      url: "{{ if package.Author.Url; package.Author.Url | string.escape; end; }}",
    },
    dependencies: {
      {{~ for dependency in package.Dependencies ~}}
        "{{ dependency.Name }}": "{{ dependency.Version }}",
      {{~ end ~}}
    },
    keywords: [
      {{~ for keyword in package.Keywords ~}}
        "{{ keyword | string.escape }}",
      {{~ end ~}}
    ],
    license: "{{ if package.License; package.License | string.escape; end; }}",
    licensesUrl: "{{ if package.LicensesUrl; package.LicensesUrl | string.escape; end; }}",
  },
{{~ end ~}}
};

(() => {
  const $ = (id) => document.getElementById(id);

  // ---------- Clipboard ----------
  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      // Fallback for browsers without clipboard permission
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) { /* ignore */ }
      area.remove();
      return ok;
    }
  };

  // Briefly changes a button label to give feedback
  const flash = (button, label) => {
    if (!button.dataset.label) button.dataset.label = button.textContent;
    button.textContent = label;
    button.classList.add('is-done');
    clearTimeout(button._flashTimer);
    button._flashTimer = setTimeout(() => {
      button.textContent = button.dataset.label;
      button.classList.remove('is-done');
    }, 1400);
  };

  const wireCopy = (buttonId) => {
    const button = $(buttonId);
    button.addEventListener('click', async () => {
      const ok = await copyText(LISTING_URL);
      flash(button, ok ? 'Copied!' : 'Copy failed');
    });
  };

  wireCopy('copyUrlBtn');
  wireCopy('helpCopyBtn');
  wireCopy('infoCopyBtn');

  // ---------- Add to VCC ----------
  const addToVcc = () => {
    window.location.assign(`vcc://vpm/addRepo?url=${encodeURIComponent(LISTING_URL)}`);
  };

  $('addRepoBtn').addEventListener('click', addToVcc);
  document.querySelectorAll('.js-add').forEach((button) => {
    button.addEventListener('click', addToVcc);
  });

  // ---------- Dialogs ----------
  const openDialog = (dialog) => {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  };

  const closeDialog = (dialog) => {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  };

  document.querySelectorAll('dialog').forEach((dialog) => {
    // Clicking the dimmed backdrop closes the dialog
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) closeDialog(dialog);
    });
    dialog.querySelectorAll('.js-close').forEach((button) => {
      button.addEventListener('click', () => closeDialog(dialog));
    });
  });

  const helpDialog = $('helpDialog');
  $('helpBtn').addEventListener('click', () => openDialog(helpDialog));

  // ---------- Package details ----------
  const infoDialog = $('infoDialog');

  const fillInfo = (id) => {
    const pkg = PACKAGES[id];
    if (!pkg) {
      console.error(`Package ${id} not found. Available:`, PACKAGES);
      return false;
    }

    $('infoName').textContent = pkg.displayName || id;
    $('infoId').textContent = id;
    $('infoVersion').textContent = `v${pkg.version}`;
    $('infoDesc').textContent = pkg.description || 'No description.';

    const author = $('infoAuthor');
    author.textContent = pkg.author.name || 'Unknown';
    if (pkg.author.url) author.href = pkg.author.url;
    else author.removeAttribute('href');

    // Dependencies
    const deps = $('infoDeps');
    deps.textContent = '';
    const depEntries = Object.entries(pkg.dependencies);
    if (depEntries.length === 0) {
      const item = document.createElement('li');
      item.className = 'muted';
      item.textContent = 'None';
      deps.appendChild(item);
    } else {
      depEntries.forEach(([name, version]) => {
        const item = document.createElement('li');
        const label = document.createElement('code');
        label.textContent = name;
        const ver = document.createElement('span');
        ver.className = 'badge badge-soft';
        ver.textContent = version;
        item.append(label, ver);
        deps.appendChild(item);
      });
    }

    // Keywords
    const keywordsBlock = $('infoKeywordsBlock');
    const keywords = $('infoKeywords');
    keywords.textContent = '';
    if (pkg.keywords.length === 0) {
      keywordsBlock.hidden = true;
    } else {
      keywordsBlock.hidden = false;
      pkg.keywords.forEach((keyword) => {
        const badge = document.createElement('span');
        badge.className = 'badge badge-soft';
        badge.textContent = keyword;
        keywords.appendChild(badge);
      });
    }

    // License
    const licenseBlock = $('infoLicenseBlock');
    const license = $('infoLicense');
    if (!pkg.license && !pkg.licensesUrl) {
      licenseBlock.hidden = true;
    } else {
      licenseBlock.hidden = false;
      license.textContent = pkg.license || 'See license';
      if (pkg.licensesUrl) license.href = pkg.licensesUrl;
      else license.removeAttribute('href');
    }

    return true;
  };

  document.querySelectorAll('.js-info').forEach((button) => {
    button.addEventListener('click', () => {
      if (fillInfo(button.dataset.packageId)) openDialog(infoDialog);
    });
  });

  // ---------- Search ----------
  const cards = Array.from(document.querySelectorAll('.pkg'));
  const search = $('searchInput');
  const count = $('resultCount');
  const empty = $('emptyState');

  const applyFilter = () => {
    const query = search.value.trim().toLowerCase();
    let visible = 0;

    cards.forEach((card) => {
      const id = card.dataset.packageId;
      const pkg = PACKAGES[id] || {};
      const haystack = `${pkg.displayName || ''} ${id} ${pkg.description || ''}`.toLowerCase();
      const match = query === '' || haystack.includes(query);
      card.hidden = !match;
      if (match) visible++;
    });

    count.textContent = `${visible} package${visible === 1 ? '' : 's'}`;
    empty.hidden = visible !== 0;
  };

  search.addEventListener('input', applyFilter);
  applyFilter();
})();

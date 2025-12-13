document.addEventListener('DOMContentLoaded', async function () {
    const downloadMenuTemplate = document.getElementById('download-menu-template');
    const articleCardTemplate = document.getElementById('article-card-template');
    const listContainer = document.querySelector('.article-list');

    if (!articleCardTemplate || !listContainer) return;

    const BASE_URLS = {
        pdf: 'https://pdf.rootnodedistillery.eu/',
        doi: 'https://doi.org/',
        ark: 'https://n2t.net/ark:/',
        forum: 'https://forum.rootnodedistillery.eu/',
    };

    const state = {
        expandedCard: null,
        openMenu: null,
    };

    function normalizeText(text) {
        return (text || '').replace(/\s+/g, ' ').trim();
    }

    function setLinkState(linkEl, url) {
        const isMissing = !url;
        linkEl.setAttribute('href', isMissing ? '#' : url);
        linkEl.setAttribute('aria-disabled', isMissing ? 'true' : 'false');
        linkEl.style.pointerEvents = isMissing ? 'none' : '';
        linkEl.style.opacity = isMissing ? '0.45' : '';
        linkEl.style.cursor = isMissing ? 'default' : '';
    }

    function setExpanded(card, expanded) {
        if (!card) return;

        if (!expanded) {
            card.classList.remove('expanded');
            if (state.expandedCard === card) state.expandedCard = null;
            return;
        }

        if (state.expandedCard && state.expandedCard !== card) {
            state.expandedCard.classList.remove('expanded');
        }

        card.classList.add('expanded');
        state.expandedCard = card;
    }

    function closeMenu(menu) {
        if (!menu) return;
        menu.classList.remove('open');
        const btn = menu.querySelector('.download-btn');
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    function closeOpenMenu() {
        if (!state.openMenu) return;
        closeMenu(state.openMenu);
        state.openMenu = null;
    }

    function setOpenMenu(menu, open) {
        if (!menu) return;

        if (!open) {
            closeMenu(menu);
            if (state.openMenu === menu) state.openMenu = null;
            return;
        }

        if (state.openMenu && state.openMenu !== menu) {
            closeMenu(state.openMenu);
        }

        menu.classList.add('open');
        const btn = menu.querySelector('.download-btn');
        if (btn) btn.setAttribute('aria-expanded', 'true');
        state.openMenu = menu;
    }

    function updateMenuLinks(menu) {
        const card = menu.closest('.article-card');
        if (!card) return;

        const pdfId = (card.getAttribute('data-pdf') || '').trim();
        const doiId = (card.getAttribute('data-doi') || '').trim();
        const arkId = (card.getAttribute('data-ark') || '').trim();

        const urls = {
            pdf: pdfId ? BASE_URLS.pdf + pdfId : '',
            doi: doiId ? BASE_URLS.doi + doiId : '',
            ark: arkId ? BASE_URLS.ark + arkId : '',
        };

        menu.querySelectorAll('.download-menu-item').forEach(function (item) {
            const kind = item.getAttribute('data-kind');
            setLinkState(item, urls[kind] || '');
        });
    }

    async function loadArticlesJson() {
        const url = new URL('ARTICLES.json', window.location.href).toString();

        try {
            const res = await fetch(url);
            if (!res.ok) {
                console.warn('ARTICLES.json fetch failed:', res.status, res.statusText, url);
                return [];
            }

            const payload = await res.json();
            return payload && Array.isArray(payload.articles) ? payload.articles : [];
        } catch (err) {
            console.warn('ARTICLES.json fetch error:', url, err);
            return [];
        }
    }

    function renderArticleCardFromJson(articleJson) {
        const cardFragment = articleCardTemplate.content.cloneNode(true);
        const cardEl = cardFragment.querySelector('article.article-card');
        if (!cardEl) return null;

        const id = (articleJson.id || '').trim();
        const pdf = (articleJson.pdf || '').trim();
        const doi = (articleJson.doi || '').trim();
        const ark = (articleJson.ark || '').trim();
        const comment = (articleJson.comment || '').trim();

        if (id) cardEl.setAttribute('data-id', id);
        if (pdf) cardEl.setAttribute('data-pdf', pdf);
        if (doi) cardEl.setAttribute('data-doi', doi);
        if (ark) cardEl.setAttribute('data-ark', ark);
        if (comment) cardEl.setAttribute('data-comment', comment);

        const idCellValue = cardEl.querySelector('.article-id-value');
        if (idCellValue) idCellValue.textContent = id;

        const titleAnchor = cardEl.querySelector('.article-title');
        if (titleAnchor) {
            titleAnchor.textContent = normalizeText(articleJson.title) || id || '[Missing article-title]';
            if (id) titleAnchor.setAttribute('name', id);
        }

        const briefEl = cardEl.querySelector('.article-brief');
        if (briefEl) briefEl.textContent = normalizeText(articleJson.brief);

        const abstractTextEl = cardEl.querySelector('.article-abstract-text');
        if (abstractTextEl) abstractTextEl.textContent = normalizeText(articleJson.abstract);

        const commentBtn = cardEl.querySelector('.comment-btn');
        if (commentBtn) {
            const commentUrl = comment ? (BASE_URLS.forum + comment) : '';
            setLinkState(commentBtn, commentUrl);
        }

        const menuHost = cardEl.querySelector('.download-menu');
        if (menuHost && downloadMenuTemplate) {
            menuHost.appendChild(downloadMenuTemplate.content.cloneNode(true));
            updateMenuLinks(menuHost);
        }

        return cardEl;
    }

    async function renderArticlesFromJson() {
        const articles = await loadArticlesJson();
        if (articles.length === 0) {
            listContainer.innerHTML = '<article class="article-card load-failed" data-id="[No articles]"><table><tr><td class="article-id"><div class="article-id-value">!</div></td><td class="article-content"><h4>No articles</h4><p class="article-brief">Failed to load ARTICLES.json.</p></td></tr></table></article>';
            return;
        }

        const frag = document.createDocumentFragment();
        articles.forEach(function (a) {
            const card = renderArticleCardFromJson(a);
            if (card) frag.appendChild(card);
        });

        listContainer.replaceChildren(frag);
    }

    await renderArticlesFromJson();

    // Event delegation: handle expand/collapse and download menu.
    listContainer.addEventListener('click', function (e) {
        const title = e.target.closest('.article-title');
        if (title && listContainer.contains(title)) {
            e.preventDefault();

            const card = title.closest('.article-card');
            if (!card) return;

            const isExpanded = card.classList.contains('expanded');
            if (isExpanded) {
                setExpanded(card, false);
                return;
            }

            setExpanded(card, true);
            return;
        }

        const downloadBtn = e.target.closest('.download-btn');
        if (downloadBtn && listContainer.contains(downloadBtn)) {
            e.preventDefault();
            e.stopPropagation();

            const menu = downloadBtn.closest('.download-menu');
            const card = downloadBtn.closest('.article-card');
            if (card) setExpanded(card, true);
            if (!menu) return;

            const willOpen = !menu.classList.contains('open');
            if (willOpen) {
                updateMenuLinks(menu);
                setOpenMenu(menu, true);
            } else {
                setOpenMenu(menu, false);
            }

            return;
        }

        const menu = e.target.closest('.download-menu');
        if (menu && listContainer.contains(menu)) {
            // Keep clicks within the menu from closing it.
            e.stopPropagation();
        }
    });

    document.addEventListener('click', function (e) {
        if (!state.openMenu) return;
        if (e.target.closest('.download-menu') === state.openMenu) return;
        closeOpenMenu();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeOpenMenu();
        }
    });
});

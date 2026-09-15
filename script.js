(() => {
    'use strict';
    const root = document.documentElement;
    const $ = (s) => document.querySelector(s);

    /* ================= theme ================= */
    const themeBtn = $('#theme-toggle');
    const mqLight = window.matchMedia('(prefers-color-scheme: light)');
    const systemTheme = () => (mqLight.matches ? 'light' : 'dark');

    function applyTheme(t) {
        root.dataset.theme = t;
        themeBtn.textContent = t === 'light' ? '🌙' : '☀️';
        themeBtn.title = t === 'light' ? 'switch to dark' : 'switch to light';
    }
    const savedTheme = localStorage.getItem('theme');
    applyTheme(savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : systemTheme());

    themeBtn.addEventListener('click', () => {
        const next = root.dataset.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', next);
        applyTheme(next);
    });
    if (mqLight.addEventListener) {
        mqLight.addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) applyTheme(e.matches ? 'light' : 'dark');
        });
    }

    /* ================= language ================= */
    const langBtn = $('#lang-toggle');
    let lang =
        localStorage.getItem('lang') ||
        ((navigator.language || 'en').startsWith('ru') ? 'ru' : 'en');

    function applyLang(l) {
        lang = l;
        root.lang = l;
        langBtn.textContent = l === 'ru' ? 'EN' : 'RU';
        document.title = l === 'ru' ? 'akak1y — бэкенд-инженер' : 'akak1y — backend engineer';
        renderNpm();
    }
    langBtn.addEventListener('click', () => {
        const next = lang === 'ru' ? 'en' : 'ru';
        localStorage.setItem('lang', next);
        applyLang(next);
    });

    /* ================= npm widget (live from registry) ================= */
    const NPM_USER = 'akak1y';
    const npmList = $('#npm-list');
    const npmStatus = $('#npm-status');
    let npmState = { status: 'loading', items: [] };

    const PKG_META = {
        faultguard: { status: { en: 'in development', ru: 'в разработке' } },
        canvasmapper: { demo: 'https://akak1y.github.io/canvasmapper/' },
    };

    const esc = (s) =>
        String(s ?? '').replace(
            /[&<>"']/g,
            (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
        );
    const cleanRepo = (u) => (u ? u.replace(/^git\+/, '').replace(/\.git$/, '') : '');

    function renderNpm() {
        const ru = lang === 'ru';
        if (npmState.status === 'loading') {
            npmStatus.innerHTML = ru ? 'загружаю пакеты…' : 'loading packages…';
            npmList.innerHTML = '';
            return;
        }
        if (npmState.status === 'error') {
            npmStatus.innerHTML =
                (ru
                    ? 'не удалось загрузить список автоматически — смотри профиль: '
                    : 'could not load the list automatically — see the profile: ') +
                `<a href="https://www.npmjs.com/~${NPM_USER}">npmjs.com/~${NPM_USER}</a>`;
            npmList.innerHTML = '';
            return;
        }
        npmStatus.innerHTML = '';
        npmList.innerHTML = npmState.items
            .map((p) => {
                const l = p.links || {};
                const meta = PKG_META[p.name] || {};
                const repo = cleanRepo(l.repository);
                const npmUrl = esc(l.npm || `https://www.npmjs.com/package/${p.name}`);
                const date = p.date
                    ? new Date(p.date).toLocaleDateString(ru ? 'ru-RU' : 'en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                      })
                    : '';

                const statusBadge = meta.status
                    ? `<span class="b orange">${ru ? meta.status.ru : meta.status.en}</span>`
                    : '';
                const demoUrl = meta.demo || l.homepage || '';

                const links = [`<a href="${npmUrl}">npm →</a>`];
                if (demoUrl && !meta.status)
                    links.push(`<a href="${esc(demoUrl)}">${ru ? 'демо' : 'demo'} →</a>`);
                if (repo) links.push(`<a href="${esc(repo)}">${ru ? 'исходники' : 'source'} →</a>`);

                return `
        <div class="project">
          <h3><a href="${npmUrl}">${esc(p.name)}</a>
              <span class="b green">v${esc(p.version)}</span>
              ${statusBadge}</h3>
          ${p.description ? `<p>${esc(p.description)}</p>` : ''}
          <div class="meta">${ru ? 'обновлено' : 'updated'}: ${date}</div>
          <div class="plinks">${links.join('')}</div>
        </div>`;
            })
            .join('');
        prepareReveal(npmList);
    }

    fetch(`https://registry.npmjs.org/-/v1/search?text=maintainer:${NPM_USER}&size=25`)
        .then((r) => {
            if (!r.ok) throw new Error(r.status);
            return r.json();
        })
        .then((data) => {
            npmState = {
                status: 'ok',
                items: (data.objects || [])
                    .map((o) => o.package)
                    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))),
            };
            renderNpm();
        })
        .catch(() => {
            npmState = { status: 'error', items: [] };
            renderNpm();
        });

    /* ================= copy to clipboard + toast ================= */
    const toast = $('#toast');
    let toastTimer;
    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 1600);
    }
    document.querySelectorAll('.js-copy').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const text = btn.dataset.copy;
            try {
                await navigator.clipboard.writeText(text);
            } catch {
                const ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
            }
            showToast((lang === 'ru' ? 'скопировано: ' : 'copied: ') + text);
        });
    });

    /* ================= reveal cards on scroll ================= */
    const io = new IntersectionObserver(
        (entries) => {
            entries.forEach((e) => {
                if (e.isIntersecting) {
                    e.target.style.opacity = 1;
                    e.target.style.transform = 'translateY(0)';
                    io.unobserve(e.target);
                }
            });
        },
        { threshold: 0.1 },
    );

    function prepareReveal(scope) {
        scope.querySelectorAll('.project, .lang-card').forEach((el) => {
            el.style.opacity = 0;
            el.style.transform = 'translateY(8px)';
            el.style.transition = 'opacity .4s ease, transform .4s ease';
            io.observe(el);
        });
    }
    prepareReveal(document);

    /* ================= init ================= */
    applyLang(lang);
})();

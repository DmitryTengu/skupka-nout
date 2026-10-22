document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"], .hero-cta[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    const contactButtons = document.querySelectorAll('.contact-buttons .btn[data-action]');
    contactButtons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            switch(action) {
                case 'email':
                    window.location.href = "mailto:tvoynotebook@gmail.com";
                    break;
                case 'call':
                    window.location.href = "tel:+375295475568";
                    break;
                case 'chat':
                    window.open("https://t.me/tvoynout53", "_blank");
                    break;
            }
        });
    });

    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.addEventListener('click', function() {
            const targetSection = document.querySelector('#contact');
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Gradient effect on hero
    const hero = document.querySelector('.hero');
    if (hero) hero.addEventListener('mousemove', function(e) {
        const rect = hero.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        const angle = (x / width) * 360;
        hero.style.setProperty('--angle', angle + 'deg');
    });
});
/* Мобильное меню (кнопка в правом верхнем углу) */
(function () {
    var nav = document.querySelector('.nav-container');
    var list = nav && nav.querySelector('.nav-links');
    if (!nav || !list) { return; }

    var PHONE_TEL = '+375295475568';
    var PHONE_TEXT = '+375 29 547-55-68';
    var HOURS = 'Пн–Пт 12:00–20:00, Сб 12:00–18:00, Вс — выходной';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-toggle';
    btn.setAttribute('aria-label', 'Меню');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span></span><span></span><span></span>';
    nav.appendChild(btn);

    var extra = document.createElement('li');
    extra.className = 'nav-extra';
    extra.innerHTML =
        '<a class="nav-phone" href="tel:' + PHONE_TEL + '">' + PHONE_TEXT + '</a>' +
        '<span class="nav-hours">' + HOURS + '</span>' +
        '<a class="nav-tg" href="https://t.me/tvoynout53" target="_blank" rel="noopener">Написать в Telegram</a>';
    list.insertBefore(extra, list.firstChild);

    function setOpen(open) {
        document.body.classList.toggle('menu-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (!open) {
            var o = list.querySelector('.has-dropdown.open');
            if (o) { o.classList.remove('open'); }
        }
    }

    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        setOpen(!document.body.classList.contains('menu-open'));
    });

    // «Другие города» раскрываются по нажатию на телефоне
    var dd = list.querySelector('.has-dropdown > a');
    if (dd) {
        dd.addEventListener('click', function (e) {
            if (window.matchMedia('(max-width: 768px)').matches) {
                e.preventDefault();
                e.stopImmediatePropagation();
                dd.parentNode.classList.toggle('open');
            }
        });
    }

    list.addEventListener('click', function (e) {
        var a = e.target.closest ? e.target.closest('a') : null;
        if (!a || a === dd && window.matchMedia('(max-width: 768px)').matches) { return; }
        setOpen(false);
    });
    document.addEventListener('click', function (e) {
        if (document.body.classList.contains('menu-open') && !nav.contains(e.target)) { setOpen(false); }
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { setOpen(false); }
    });
    window.addEventListener('resize', function () {
        if (window.innerWidth > 768) { setOpen(false); }
    });
})();

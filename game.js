const $ = id => document.getElementById(id);
const cv = $('game-canvas'), cx = cv.getContext('2d');
const WW = 2400, WH = 1400, TARGETS = [50, 75, 100, 150, 300];
let W, H, Z = 1, S = 'menu', np = 1, night = 1, kills = 0, target = 50, bannerT = 0, spawnT = 0, camX = 0, camY = 0, hudT = 0, restT = 0;
let P = [], E = [], BL = [], GR = [], FX = [], PK = [], K = {}, PT = [], DN = [], shake = 0, eliteDone = false;
const rnd = Math.random;

/* ---------- Items ---------- */
const G = (i, n, mag, dmg, cd, rl, len, d) => ({ i, n, t: 'gun', mag, dmg, cd, rl, len, d });
const M = (i, n, dmg, cd, rng, col, d) => ({ i, n, t: 'melee', dmg, cd, rng, col, d });
const C = (i, n, d, price) => ({ i, n, t: 'use', st: 1, d, price });
const IT = {
    revolver: G('🔫', 'Revolver', 6, 25, .45, 1.3, 22, '6-shot sidearm. Heavy hits.'),
    ak47: G('🎯', 'AK47', 30, 14, .09, 2, 30, '30-round automatic rifle.'),
    balisong: M('🔪', 'Balisong', 14, .25, 40, '#c9d2d6', 'Fast folding knife.'),
    palakol: M('🪓', 'Palakol', 32, .65, 52, '#9aa5a8', 'Slow, heavy axe.'),
    itak: M('🗡️', 'Itak', 24, .45, 58, '#bfc8c8', 'Long curved blade.'),
    kawali: M('🍳', 'Kawali', 20, .4, 48, '#333', 'Iron wok. Surprisingly deadly.'),
    bullets: C('🔸', 'Bullets', 'Adds 30 reserve bullets.', 25),
    armor: C('🦺', 'Armor', 'Adds 50 armor that absorbs 70% of each hit until it runs out.'),
    bandage: C('🩹', 'Bandage', 'Heals 25 health.'),
    medkit: C('🧰', 'Medkit', 'Heals 60 health.', 35),
    sports: C('🥤', 'Sports Drink', 'Restores 60 energy.'),
    anting: C('📿', 'Anting-anting', 'Force field for 5 seconds.', 80),
    bawang: C('🧄', 'Bawang', 'Thrown grenade (B). 50 damage, 95px blast.', 60),
    unammo: C('♾️', 'Unlimited Ammo', 'Infinite bullets for one night.', 150),
    unen: C('⚡', 'Unlimited Energy', 'Infinite energy for one night.', 120)
};
const SHOP = ['anting', 'bawang', 'unammo', 'unen', 'medkit', 'bullets'];
const DROPS = ['bandage', 'bandage', 'medkit', 'bullets', 'bullets', 'armor', 'sports', 'anting', 'bawang', 'ak47', 'palakol', 'itak', 'kawali'];

/* ---------- Item icons (.ico files in assets/items/). The emoji in IT is the fallback if a file is missing. ---------- */
const ICON_FILES = {
    revolver: 'revolver', ak47: 'ak-47', balisong: 'balisong', palakol: 'palakol', itak: 'itak', kawali: 'kawali',
    bullets: 'bullets', armor: 'armor', bandage: 'bandage', medkit: 'medkit', sports: 'sports-drink',
    anting: 'anting-anting', bawang: 'bawang', unammo: 'unli-ammo', unen: 'unli-energy'
};
const ICONS = {};
for (const id in ICON_FILES) {
    const img = new Image();
    img.src = 'assets/items/' + ICON_FILES[id] + '.ico';
    ICONS[id] = img;
}
const iconReady = id => ICONS[id] && ICONS[id].complete && ICONS[id].naturalWidth > 0;

/* HTML for an item icon (shop, quick slots, backpack). Falls back to the emoji if the file fails to load. */

function iconHTML(id, size) {
    return '<img class="item-icon" src="' + ICONS[id].src + '" width="' + size + '" height="' + size + '" alt="' + IT[id].n +
        '" onerror="this.outerHTML=\'<span class=&quot;item-emoji&quot;>' + IT[id].i + '</span>\'">';
}

/* ---------- Controls ---------- */
const CT = [
    { l: 'KeyA', r: 'KeyD', u: 'KeyW', d: 'KeyS', sh: 'KeyT', me: 'KeyY', rl: 'KeyU', us: 'KeyI', bg: 'KeyO', bw: 'KeyB', sl: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'] },
    { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown', sh: 'Numpad1', me: 'Numpad2', rl: 'Numpad4', us: 'Numpad5', bg: 'Numpad6', bw: 'Numpad7', pv: 'Numpad8', nx: 'Numpad9' }
];

/* ---------- Audio (synthesised, starts after a click) ---------- */
let AC, MG, SG, MU, sfxVol = .6, musVol = .35, noteI = 0, musicTimer = 0;

function ac() {
    if (!AC) {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        MG = AC.createGain();
        MG.gain.value = .6;
        MG.connect(AC.destination);
        SG = AC.createGain();
        MU = AC.createGain();
        SG.connect(MG);
        MU.connect(MG);
        applyVol();
    }
    if (AC.state === 'suspended')
        AC.resume();
}

function applyVol() { if (SG) {
    SG.gain.value = sfxVol * 1.2;
    MU.gain.value = musVol * 2.4;
} }

function tone(f, d, type = 'square', v = .08, to = 0, bus) {
    if (!AC)
        return;
    const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (to)
        o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g);
    g.connect(bus || SG);
    o.start(t);
    o.stop(t + d);
}

function noise(d, v = .2, fl = 1500) {
    if (!AC)
        return;
    const n = AC.sampleRate * d, b = AC.createBuffer(1, n, AC.sampleRate), a = b.getChannelData(0);
    for (let i = 0; i < n; i++)
        a[i] = (rnd() * 2 - 1) * (1 - i / n);
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    f.frequency.value = fl;
    g.gain.value = v;
    s.buffer = b;
    s.connect(f);
    f.connect(g);
    g.connect(SG);
    s.start();
}
const SFX = {
    shot: () => { noise(.12, .3, 2800); tone(140, .12, 'sawtooth', .1, 50); },
    reload: () => { noise(.05, .25, 3500); setTimeout(() => noise(.06, .3, 2000), 350); },
    hit: () => noise(.07, .2, 700),
    whoosh: () => noise(.16, .15, 4000),
    boom: () => { noise(.45, .45, 350); tone(80, .4, 'sawtooth', .12, 30); },
    pick: () => { tone(880, .08, 'square', .05); setTimeout(() => tone(1320, .1, 'square', .05), 70); }
};
const THEME = [220, 262, 330, 262, 196, 247, 294, 247, 175, 220, 262, 220, 165, 196, 247, 196];

function music() {
    clearInterval(musicTimer);
    musicTimer = setInterval(() => {
        if (S !== 'play' && S !== 'trans')
            return;
        const f = THEME[noteI++ % THEME.length];
        tone(f / 2, .6, 'triangle', .07, 0, MU);
        if (noteI % 4 === 0)
            tone(f * 2, .3, 'sine', .025, 0, MU);
    }, 420);
}

/* ---------- World ---------- */
const houses = [], trees = [];
const ground = document.createElement('canvas');
ground.width = WW;
ground.height = WH;

function buildWorld() {
    houses.length = trees.length = 0;
    for (let gx = 0; gx < WW; gx += 240)
        for (let gy = 0; gy < WH; gy += 240) {
            const x = gx + 40 + rnd() * 160, y = gy + 70 + rnd() * 130;
            if (Math.hypot(x - WW / 2, y - WH / 2) < 230)
                continue;
            if (rnd() < .35)
                houses.push({ x, y });
            else if (rnd() < .8) {
                trees.push({ x, y });
                trees.push({ x: x + 30 + rnd() * 40, y: y + rnd() * 40 });
            }
        }
    const g = ground.getContext('2d');
    g.fillStyle = '#0a1d22';
    g.fillRect(0, 0, WW, WH);
    g.fillStyle = '#1b1410';
    g.fillRect(0, WH / 2 - 30, WW, 60);
    g.fillRect(WW / 2 - 30, 0, 60, WH);
    for (let i = 0; i < 5000; i++) {
        g.fillStyle = rnd() < .5 ? '#10303a' : '#0c2a1c';
        g.fillRect(rnd() * WW | 0, rnd() * WH | 0, 3, 3);
    }
}
const blocked = (x, y) => houses.some(h => Math.abs(x - h.x) < 48 && y > h.y - 32 && y < h.y + 22) || trees.some(t => (x - t.x) ** 2 + (y - t.y) ** 2 < 324);
const R = (x, y, w, h, c) => { cx.fillStyle = c; cx.fillRect(Math.round(x), Math.round(y), w, h); };

/* ---------- Players ---------- */

function mkP(i) {
    const p = { id: i, x: WW / 2 + (i ? 50 : -50), y: WH / 2, fx: 1, fy: 0, hp: 100, en: 100, ar: 0, gold: 0, ammo: 60, mag: {}, inv: Array(15).fill(null),
        sel: 0, bag: false, bi: 0, cd: 0, rl: 0, sw: 0, swW: null, field: 0, unAmmo: false, unEn: false, down: false, rv: 0, hit: 0 };
    [['revolver', 1], ['balisong', 1], ['bandage', 2], ['bawang', 1]].forEach(([id, n], j) => p.inv[j] = { id, n });
    return p;
}

/* Fills an existing stack first, otherwise the first empty slot (quick slots 1-5, then the backpack). */

function addItem(p, id, n = 1) {
    const it = IT[id];
    if (it.st) {
        const s = p.inv.find(s => s && s.id === id);
        if (s) {
            s.n += n;
            return true;
        }
    }
    const j = p.inv.findIndex(s => !s);
    if (j < 0)
        return false;
    p.inv[j] = { id, n };
    return true;
}
const selItem = p => p.inv[p.sel] ? IT[p.inv[p.sel].id] : null;

function consume(p, j) { const s = p.inv[j]; if (--s.n <= 0)
    p.inv[j] = null; }

function hurt(p, d) {
    if (p.down || p.field > 0)
        return;
    if (p.ar > 0) {
        const a = Math.min(p.ar, d * .7);
        p.ar -= a;
        d -= a;
    }
    p.hp -= d;
    p.hit = .15;
    shake = Math.max(shake, 6);
    if (p.hp <= 0) {
        p.hp = 0;
        p.down = true;
        if (P.every(q => q.down))
            gameOver();
    }
}

function useItem(p) {
    const s = p.inv[p.sel];
    if (!s)
        return;
    const it = IT[s.id];
    if (it.t !== 'use')
        return;
    if (s.id === 'bawang')
        return throwB(p);
    if (s.id === 'bandage')
        p.hp = Math.min(100, p.hp + 25);
    else if (s.id === 'medkit')
        p.hp = Math.min(100, p.hp + 60);
    else if (s.id === 'sports')
        p.en = Math.min(100, p.en + 60);
    else if (s.id === 'armor')
        p.ar = Math.min(100, p.ar + 50);
    else if (s.id === 'bullets')
        p.ammo += 30;
    else if (s.id === 'anting')
        p.field = 5;
    else if (s.id === 'unammo')
        p.unAmmo = true;
    else if (s.id === 'unen')
        p.unEn = true;
    consume(p, p.sel);
    SFX.pick();
}

function throwB(p) {
    let j = p.inv[p.sel] && p.inv[p.sel].id === 'bawang' ? p.sel : p.inv.findIndex(s => s && s.id === 'bawang');
    if (j < 0)
        return;
    consume(p, j);
    GR.push({ x: p.x, y: p.y - 8, vx: p.fx * 340, vy: p.fy * 340, t: .8 });
    SFX.whoosh();
}

function shoot(p) {
    const w = selItem(p);
    if (!w || w.t === 'use')
        return melee(p);
    if (w.t === 'melee')
        return swing(p, w);
    if (p.cd > 0 || p.rl > 0)
        return;
    const id = p.inv[p.sel].id;
    if (p.mag[id] === undefined)
        p.mag[id] = w.mag;
    if (p.mag[id] <= 0)
        return reload(p);
    if (!p.unAmmo)
        p.mag[id]--;
    p.cd = w.cd;
    const sp = id === 'ak47' ? .07 : .02, base = aimAt(p, p.id ? .8 : .3), a = base + (rnd() - .5) * sp * 2;
    p.fx = Math.cos(base);
    p.fy = Math.sin(base);
    BL.push({ x: p.x + Math.cos(a) * (w.len + 6), y: p.y - 4 + Math.sin(a) * (w.len + 6), vx: Math.cos(a) * 720, vy: Math.sin(a) * 720, d: w.dmg, t: 1 });
    p.kick = .08;
    SFX.shot();
}

/* Aim assist: snaps shots and swings to the nearest enemy inside a cone around the facing direction. Wider for Player 2. */

function aimAt(p, cone) {
    const a = Math.atan2(p.fy, p.fx);
    let best = null, bd = 520;
    E.forEach(e => {
        const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
        let da = Math.abs(Math.atan2(dy, dx) - a);
        if (da > Math.PI)
            da = 2 * Math.PI - da;
        if (da < cone && d < bd) {
            bd = d;
            best = Math.atan2(dy, dx);
        }
    });
    return best === null ? a : best;
}

function reload(p) {
    const w = selItem(p);
    if (!w || w.t !== 'gun' || p.rl > 0)
        return;
    const id = p.inv[p.sel].id;
    if (p.mag[id] === undefined)
        p.mag[id] = w.mag;
    if (p.mag[id] >= w.mag || (p.ammo <= 0 && !p.unAmmo))
        return;
    p.rl = w.rl;
    p.rlId = id;
    SFX.reload();
}

function finishReload(p) {
    const w = IT[p.rlId], need = w.mag - p.mag[p.rlId], take = p.unAmmo ? need : Math.min(need, p.ammo);
    p.mag[p.rlId] += take;
    if (!p.unAmmo)
        p.ammo -= take;
}

function melee(p) {
    let w = selItem(p);
    if (!w || w.t !== 'melee') {
        const s = p.inv.slice(0, 5).find(s => s && IT[s.id].t === 'melee');
        w = s ? IT[s.id] : { i: '', dmg: 6, cd: .4, rng: 34, col: '#e0b08a' };
    }
    swing(p, w);
}

function swing(p, w) {
    if (p.cd > 0 || (!p.unEn && p.en < 6))
        return;
    if (!p.unEn)
        p.en -= 6;
    p.cd = w.cd;
    p.sw = .25;
    p.swW = w;
    SFX.whoosh();
    const a = aimAt(p, p.id ? .9 : .4);
    p.fx = Math.cos(a);
    p.fy = Math.sin(a);
    E.forEach(e => {
        const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
        if (d < w.rng + e.r) {
            let da = Math.abs(Math.atan2(dy, dx) - a);
            if (da > Math.PI)
                da = 2 * Math.PI - da;
            if (da < 1.1 || d < e.r + 12) {
                dmgE(e, w.dmg);
                SFX.hit();
            }
        }
    });
}

/* ---------- Enemies ---------- */
/* w = spawn weight (default 1). Tougher creatures are rarer. */
const ET = [
    { n: 'tiyanak', hp: 20, sp: 75, dmg: 8, r: 11 },
    { n: 'tiktik', hp: 14, sp: 100, dmg: 6, r: 9, fly: 1 },
    { n: 'sigbin', hp: 36, sp: 92, dmg: 10, r: 13, w: .8 },
    { n: 'bampira', hp: 60, sp: 58, dmg: 15, r: 13, w: .6 },
    { n: 'manananggal', hp: 45, sp: 66, dmg: 12, r: 14, fly: 1, w: .8 },
    { n: 'kapre', hp: 130, sp: 38, dmg: 22, r: 20, w: .4 }
];

/* Which creatures can appear on each night (index 0 = Night 1). */
const NIGHT_POOL = [
    ['tiyanak', 'tiktik'],
    ['tiyanak', 'tiktik', 'kapre'],
    ['tiyanak', 'tiktik', 'kapre', 'sigbin'],
    ['tiyanak', 'tiktik', 'kapre', 'sigbin', 'manananggal'],
    ['tiyanak', 'tiktik', 'kapre', 'sigbin', 'manananggal', 'bampira']
];

function spawn() {
    const al = P.filter(p => !p.down);
    if (!al.length)
        return;
    const p = al[rnd() * al.length | 0], a = rnd() * 6.283, d = Math.max(W, H) / Z * .6 + 60;
    const pool = NIGHT_POOL[night - 1].map(n => ET.find(t => t.n === n));
    let r = rnd() * pool.reduce((s, t) => s + (t.w || 1), 0);
    const t = pool.find(t => (r -= (t.w || 1)) < 0) || pool[0];
    const sp = (.55 + night * .08) * t.sp, hp = t.hp * (1 + night * .1), dmg = Math.round(t.dmg * (.55 + night * .1));
    E.push({ ...t, hp, mhp: hp, sp, dmg, x: Math.min(WW - 10, Math.max(10, p.x + Math.cos(a) * d)), y: Math.min(WH - 10, Math.max(10, p.y + Math.sin(a) * d)), cd: 1, fl: 0, ph: rnd() * 9 });
}

function burst(x, y, n, c) { for (let i = 0; i < n; i++) {
    const a = rnd() * 6.283, s = 40 + rnd() * 160;
    PT.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, t: .5 + rnd() * .4, c });
} }

/* Elite: Haring Kapre appears once per night (Night 3 and later) at half the kill target. Big health, big loot. */

function spawnElite() {
    const al = P.filter(p => !p.down);
    if (!al.length)
        return;
    const p = al[rnd() * al.length | 0], t = ET[5], a = rnd() * 6.283, d = Math.max(W, H) / Z * .6 + 60, hp = t.hp * (1 + night * .15) * 2.5;
    E.push({ ...t, hp, mhp: hp, sp: t.sp * (.55 + night * .08) * 1.1, r: 26, dmg: 20, elite: 1,
        x: Math.min(WW - 10, Math.max(10, p.x + Math.cos(a) * d)), y: Math.min(WH - 10, Math.max(10, p.y + Math.sin(a) * d)), cd: 1, fl: 0, ph: 0 });
    DN.push({ x: p.x, y: p.y - 60, v: 'Haring Kapre approaches!', t: 2.5 });
}

function dmgE(e, d) {
    if (e.dead)
        return;
    e.hp -= d;
    e.fl = .1;
    DN.push({ x: e.x + (rnd() - .5) * 14, y: e.y - 30, v: Math.round(d), t: .6 });
    burst(e.x, e.y - 8, e.hp <= 0 ? 14 : 3, e.hp <= 0 ? '#8a1c24' : '#F9B642');
    if (e.hp <= 0) {
        e.dead = true;
        kills++;
        if (rnd() < .75)
            PK.push({ x: e.x, y: e.y, g: 3 + (rnd() * 6 | 0), t: 0 });
        if (rnd() < .07)
            PK.push({ x: e.x + 10, y: e.y, id: DROPS[rnd() * DROPS.length | 0], t: 0 });
        if (e.elite) {
            shake = 12;
            for (let i = 0; i < 3; i++)
                PK.push({ x: e.x + (i - 1) * 30, y: e.y + 10, id: DROPS[rnd() * DROPS.length | 0], t: 0 });
            PK.push({ x: e.x, y: e.y - 10, g: 40, t: 0 });
        }
    }
}

/* ---------- Screens and game flow ---------- */
const OVER_GAME = ['game', 'night', 'pause', 'rest', 'win', 'death'];

/* Show one screen. Screens are <section id="NAME-screen">; the canvas lives in #game-screen. */

function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => {
        if (s.id !== 'exit-screen')
            s.classList.toggle('active', s.id === name + '-screen');
    });
    $('game-screen').classList.toggle('hidden', !OVER_GAME.includes(name));
}

function startGame(n) {
    ac();
    np = n;
    night = 1;
    P = [mkP(0)];
    if (n === 2)
        P.push(mkP(1));
    $('player-two-hud').classList.toggle('hidden', n < 2);
    music();
    beginNight();
}

/* Loot scattered around the village: items near houses and in the open, plus gold piles. Stays until picked up. */

function scatterLoot() {
    const spot = () => {
        for (let n = 0; n < 30; n++) {
            let x, y;
            if (houses.length && rnd() < .5) {
                const h = houses[rnd() * houses.length | 0];
                x = h.x + (rnd() - .5) * 110;
                y = h.y + 34 + rnd() * 26;
            }
            else {
                x = 60 + rnd() * (WW - 120);
                y = 60 + rnd() * (WH - 120);
            }
            if (!blocked(x, y))
                return [x, y];
        }
        return [WW / 2 + 80, WH / 2 + 80];
    };
    for (let i = 0; i < 16 + night * 3; i++) {
        const [x, y] = spot();
        PK.push({ x, y, id: DROPS[rnd() * DROPS.length | 0], t: 0, keep: 1 });
    }
    for (let i = 0; i < 22; i++) {
        const [x, y] = spot();
        PK.push({ x, y, g: 5 + (rnd() * 10 | 0), t: 0, keep: 1 });
    }
}

function beginNight() {
    kills = 0;
    target = TARGETS[night - 1];
    E = [];
    BL = [];
    GR = [];
    FX = [];
    PK = [];
    PT = [];
    DN = [];
    spawnT = 3;              // a few seconds of calm before the first creature
    eliteDone = night < 3;   // no Haring Kapre on Nights 1-2
    scatterLoot();
    P.forEach(p => { p.unAmmo = p.unEn = false; p.bag = false; });
    S = 'trans';
    bannerT = 2.6;
    $('night-title').textContent = 'NIGHT ' + night;
    $('night-subtitle').textContent = 'Defeat ' + target + ' creatures before dawn.';
    showScreen('night');
}

function endNight() {
    E = [];
    BL = [];
    GR = [];
    if (night >= 5) {
        S = 'win';
        $('final-stats').innerHTML = '<p>Nights survived: 5 / 5</p>' +
            P.map((p, i) => '<p>Player ' + (i + 1) + ' gold: ' + p.gold + '</p>').join('');
        showScreen('win');
        return;
    }
    P.forEach(p => {
        p.unAmmo = p.unEn = false;
        p.bag = false;
        p.field = 0;
        if (p.down) {
            p.down = false;
            p.hp = 50;
        }
    });
    S = 'shop';
    restT = 30;
    $('shop-message').textContent = 'Night ' + night + ' survived. Spend your gold in the village shop.';
    renderShop();
    showScreen('rest');
}

function nextNight() {
    night++;
    beginNight();
}

function renderShop() {
    const gold = '<div class="shop-gold">' + P.map((p, i) => 'Player ' + (i + 1) + ': <b>' + p.gold + 'g</b>').join(' &nbsp;|&nbsp; ') + '</div>';
    $('shop-list').innerHTML = gold + SHOP.map(id => {
        const it = IT[id];
        const buttons = P.map((p, i) => '<button data-item="' + id + '" data-player="' + i + '"' + (p.gold < it.price ? ' disabled' : '') + '>P' + (i + 1) + ' BUY</button>').join('');
        return '<div class="shop-card"><div class="shop-icon">' + iconHTML(id, 44) + '</div><b>' + it.n + '</b><small>' + it.d + '</small><div class="shop-price">' + it.price + ' g</div><div class="shop-buy">' + buttons + '</div></div>';
    }).join('');
}

function buyItem(id, playerIndex) {
    const it = IT[id], p = P[playerIndex], msg = $('shop-message'), who = 'Player ' + (playerIndex + 1);
    if (p.gold < it.price) {
        msg.textContent = who + ' needs more gold for ' + it.n + '.';
        return;
    }
    if (!addItem(p, id, 1)) {
        msg.textContent = who + "'s inventory is full.";
        return;
    }
    p.gold -= it.price;
    const j = p.inv.findIndex(s => s && s.id === id);
    msg.textContent = who + ' bought ' + it.n + ' (' + (j < 5 ? 'quick slot ' + (j + 1) : 'backpack') + ').';
    SFX.pick();
    renderShop();
}

function gameOver() {
    S = 'over';
    $('death-description').textContent = 'Night ' + night + ': ' + kills + ' / ' + target + ' creatures defeated.';
    showScreen('death');
}

/* Back to the main menu: stop music and clear every part of the running session. */

function toMenu() {
    S = 'menu';
    clearInterval(musicTimer);
    E = [];
    BL = [];
    GR = [];
    PK = [];
    FX = [];
    PT = [];
    DN = [];
    P = [];
    showScreen('menu');
}

function togglePause() {
    if (S === 'play') {
        S = 'paused';
        showScreen('pause');
    }
    else if (S === 'paused') {
        S = 'play';
        showScreen('game');
    }
}

/* ---------- Update ---------- */

function update(dt) {
    if (S === 'trans') {
        bannerT -= dt;
        if (bannerT <= 0) {
            S = 'play';
            showScreen('game');
        }
        return;
    }
    if (S !== 'play')
        return;
    // players
    P.forEach((p, i) => {
        const c = CT[i];
        p.cd -= dt;
        p.sw -= dt;
        p.hit -= dt;
        p.field -= dt;
        p.kick = Math.max(0, (p.kick || 0) - dt);
        if (p.rl > 0) {
            p.rl -= dt;
            if (p.rl <= 0)
                finishReload(p);
        }
        p.en = p.unEn ? 100 : Math.min(100, p.en + 7 * dt);
        if (p.down) {
            p.rv = K.KeyE && P.some(q => q !== p && !q.down && Math.hypot(q.x - p.x, q.y - p.y) < 70) ? p.rv + dt : 0;
            if (p.rv >= 2) {
                p.down = false;
                p.hp = 40;
                p.rv = 0;
            }
            return;
        }
        if (p.bag)
            return;
        const mx = (K[c.r] ? 1 : 0) - (K[c.l] ? 1 : 0), my = (K[c.d] ? 1 : 0) - (K[c.u] ? 1 : 0);
        if (mx || my) {
            const n = Math.hypot(mx, my);
            p.fx = mx / n;
            p.fy = my / n;
            const nx = Math.min(WW - 20, Math.max(20, p.x + p.fx * 135 * dt)), ny = Math.min(WH - 20, Math.max(20, p.y + p.fy * 135 * dt));
            if (!blocked(nx, p.y))
                p.x = nx;
            if (!blocked(p.x, ny))
                p.y = ny;
        }
        if (K[c.sh])
            shoot(p);
        if (K[c.me])
            melee(p);
    });
    // camera
    const al = P.filter(p => !p.down), ref = al.length ? al : P;
    const mx = ref.reduce((s, p) => s + p.x, 0) / ref.length, my = ref.reduce((s, p) => s + p.y, 0) / ref.length, vw = W / Z, vh = H / Z;
    camX = vw >= WW ? (WW - vw) / 2 : Math.min(WW - vw, Math.max(0, mx - vw / 2));
    camY = vh >= WH ? (WH - vh) / 2 : Math.min(WH - vh, Math.max(0, my - vh / 2));
    P.forEach(p => { p.x = Math.min(camX + vw - 24, Math.max(camX + 24, p.x)); p.y = Math.min(camY + vh - 24, Math.max(camY + 24, p.y)); });
    // spawning (gentler on early nights, ramps up toward Night 5)
    spawnT -= dt;
    if (!eliteDone && kills >= target / 2) {
        eliteDone = true;
        spawnElite();
    }
    if (spawnT <= 0 && kills + E.length < target && E.length < 5 + night * 3) {
        spawn();
        spawnT = Math.max(.5, 2.2 - night * .3);
    }
    // enemies
    E.forEach(e => {
        e.fl -= dt;
        e.cd -= dt;
        const al = P.filter(p => !p.down);
        if (!al.length)
            return;
        let t = al[0], bd = 1e9;
        al.forEach(p => { const d = Math.hypot(p.x - e.x, p.y - e.y); if (d < bd) {
            bd = d;
            t = p;
        } });
        const dx = t.x - e.x, dy = t.y - e.y, d = bd || 1;
        let wob = e.fly ? Math.sin(performance.now() / 200 + e.ph) * .6 : 0;
        const a = Math.atan2(dy, dx) + wob * .5;
        let m = 1;
        if (e.n === 'sigbin') {
            e.ds = (e.ds ?? 2) - dt;
            if (e.ds < 0) {
                e.ds = 3 + rnd() * 2;
                e.bu = .35;
            }
            e.bu = (e.bu || 0) - dt;
            if (e.bu > 0)
                m = 3.4;
        }
        if (d > e.r + 8) {
            e.x += Math.cos(a) * e.sp * m * dt;
            e.y += Math.sin(a) * e.sp * m * dt;
        }
        if (d < e.r + 16 && e.cd <= 0) {
            hurt(t, e.dmg);
            e.cd = 1.2;
            if (e.n === 'bampira')
                e.hp = Math.min(e.mhp, e.hp + 6);
        }
    });
    // bullets
    BL.forEach(b => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.t -= dt;
        const e = E.find(e => !e.dead && Math.hypot(e.x - b.x, e.y - b.y) < e.r + 3);
        if (e) {
            dmgE(e, b.d);
            b.t = 0;
            SFX.hit();
            FX.push({ x: b.x, y: b.y, t: .15, r: 8, c: '#F9B642' });
        }
    });
    BL = BL.filter(b => b.t > 0);
    // grenades
    GR.forEach(g => {
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        g.vx *= 1 - 2 * dt;
        g.vy *= 1 - 2 * dt;
        g.t -= dt;
        if (g.t <= 0) {
            E.forEach(e => { if (Math.hypot(e.x - g.x, e.y - g.y) < 95 + e.r)
                dmgE(e, 50); });
            FX.push({ x: g.x, y: g.y, t: .4, r: 95, c: '#E24B16', big: 1 });
            burst(g.x, g.y, 26, '#E24B16');
            shake = 14;
            SFX.boom();
        }
    });
    GR = GR.filter(g => g.t > 0);
    E = E.filter(e => !e.dead);
    FX.forEach(f => f.t -= dt);
    FX = FX.filter(f => f.t > 0);
    PT.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.t -= dt; });
    PT = PT.filter(p => p.t > 0);
    DN.forEach(d => { d.y -= 30 * dt; d.t -= dt; });
    DN = DN.filter(d => d.t > 0);
    shake = Math.max(0, shake - 40 * dt);
    // pickups
    PK.forEach(k => {
        k.t += dt;
        P.forEach(p => {
            if (k.done || p.down || Math.hypot(p.x - k.x, p.y - k.y) > 30)
                return;
            if (k.g) {
                p.gold += k.g;
                k.done = 1;
                SFX.pick();
            }
            else if (addItem(p, k.id)) {
                k.done = 1;
                SFX.pick();
            }
        });
    });
    PK = PK.filter(k => !k.done && (k.keep || k.t < 30));
    if (kills >= target)
        endNight();
}

/* ---------- Drawing ---------- */

function drawPlayer(p, i) {
    const col = i ? '#3a8fb7' : '#E24B16';
    cx.save();
    cx.translate(Math.round(p.x), Math.round(p.y));
    cx.fillStyle = 'rgba(0,0,0,.4)';
    cx.beginPath();
    cx.ellipse(0, 2, 11, 4, 0, 0, 7);
    cx.fill();
    if (p.down) {
        R(-12, -8, 24, 10, '#777');
        R(-14, -8, 6, 8, '#e0b08a');
        cx.fillStyle = '#F9B642';
        cx.fillRect(-14, -18, 28 * (p.rv / 2), 4);
        cx.restore();
        return;
    }
    R(-6, -20, 12, 16, p.hit > 0 ? '#fff' : col);
    R(-5, -4, 4, 6, '#222');
    R(1, -4, 4, 6, '#222');
    R(-5, -30, 10, 10, '#e0b08a');
    R(-5, -31, 10, 4, '#100406');
    const w = selItem(p), a = Math.atan2(p.fy, p.fx);
    cx.translate(0, -14);
    cx.rotate(a);
    if (p.sw > 0 && p.swW) {
        const w2 = p.swW, k = 1 - p.sw / .25;
        cx.rotate(-1 + 2 * k);
        R(4, -1, 10, 3, '#5a3220');
        R(14, -3, w2.rng * .45, 6, w2.col);
    }
    else if (w && w.t === 'melee') {
        R(4, -1, 10, 3, '#5a3220');
        R(14, -3, w.rng * .35, 6, w.col);
    }
    else if (w && w.t === 'gun') {
        const ak = w.len > 25;
        cx.translate(-p.kick * 40, 0);
        R(2, -2, w.len, 4, '#222');
        R(4, 2, 5, 6, ak ? '#5a3220' : '#333');
        if (ak) {
            R(-6, -2, 8, 4, '#5a3220');
            R(12, 2, 4, 6, '#111');
        }
        if (p.kick > 0)
            R(w.len + 2, -3, 6, 6, '#F9B642');
    }
    cx.restore();
    if (p.field > 0) {
        cx.strokeStyle = `rgba(249,182,66,${.5 + .3 * Math.sin(performance.now() / 80)})`;
        cx.lineWidth = 3;
        cx.beginPath();
        cx.arc(p.x, p.y - 12, 30, 0, 7);
        cx.stroke();
        cx.fillStyle = 'rgba(249,182,66,.12)';
        cx.fill();
    }
}
const LBL = { tiyanak: ['Tiyanak', -24], tiktik: ['Tik-Tik', -21], sigbin: ['Sigbin', -25], bampira: ['Bampira', -34], manananggal: ['Manananggal', -39], kapre: ['Kapre', -53] };

function drawEnemy(e) {
    cx.save();
    cx.translate(Math.round(e.x), Math.round(e.y));
    if (e.elite)
        cx.scale(1.35, 1.35);
    cx.fillStyle = 'rgba(0,0,0,.4)';
    cx.beginPath();
    cx.ellipse(0, 2, e.r, 4, 0, 0, 7);
    cx.fill();
    const f = e.fl > 0, fl = Math.sin(performance.now() / 90 + e.ph) * 3, Y = '#F9B642', O = '#E24B16';
    switch (e.n) {
        case 'tiyanak':
            R(-6, -10, 12, 10, f ? '#fff' : '#d9a98a');
            R(-7, -19, 14, 10, '#e8c0a0');
            R(-4, -15, 3, 3, O);
            R(1, -15, 3, 3, O);
            R(-3, -10, 6, 2, '#391018');
            break;
        case 'tiktik':
            R(-4, -12 + fl, 8, 10, f ? '#fff' : '#1d1214');
            R(-16, -16 + fl, 12, 4, '#391018');
            R(4, -16 + fl, 12, 4, '#391018');
            R(-2, -5 + fl, 4, 8, Y);
            R(-3, -10 + fl, 2, 2, O);
            R(1, -10 + fl, 2, 2, O);
            break;
        case 'kapre':
            R(-14, -36, 28, 40, f ? '#fff' : '#2b1b12');
            R(-9, -48, 18, 13, '#3b2418');
            R(-5, -43, 3, 3, O);
            R(2, -43, 3, 3, O);
            R(4, -36, 10, 3, Y);
            R(14, -37, 3, 3, '#888');
            break;
        case 'sigbin':
            R(-14, -10, 26, 12, f ? '#fff' : '#120a0c');
            R(8, -16, 12, 10, '#1d1114');
            R(10, -20, 3, 5, '#120a0c');
            R(16, -20, 3, 5, '#120a0c');
            R(14, -13, 3, 3, O);
            R(-14, -18, 6, 10, '#120a0c');
            R(-10, 2, 4, 4, '#000');
            R(6, 2, 4, 4, '#000');
            break;
        case 'manananggal':
            R(-20, -26 + fl, 14, 5, '#391018');
            R(6, -26 + fl, 14, 5, '#391018');
            R(-6, -22 + fl, 12, 14, f ? '#fff' : '#c98a8a');
            R(-3, -8 + fl, 2, 12, '#8a1c24');
            R(1, -8 + fl, 2, 9, '#8a1c24');
            R(-6, -32 + fl, 12, 10, '#d7a58c');
            R(-7, -34 + fl, 14, 5, '#100406');
            R(-3, -28 + fl, 2, 2, O);
            R(2, -28 + fl, 2, 2, O);
            break;
        case 'bampira':
            R(-9, -20, 18, 20, f ? '#fff' : '#6b1020');
            R(-6, -20, 12, 18, '#2a0d3a');
            R(-5, -29, 10, 9, '#e8e0e0');
            R(-3, -25, 2, 2, '#f00');
            R(1, -25, 2, 2, '#f00');
            R(-2, -21, 1, 3, '#fff');
            R(1, -21, 1, 3, '#fff');
            break;
    }
    const lb = [e.elite ? 'Haring Kapre' : LBL[e.n][0], LBL[e.n][1]];
    cx.font = 'bold 11px Arial,Helvetica,sans-serif';
    cx.textAlign = 'center';
    cx.lineWidth = 3;
    cx.strokeStyle = '#100406';
    cx.strokeText(lb[0], 0, lb[1]);
    cx.fillStyle = e.elite ? '#fff' : e.n === 'kapre' || e.n === 'bampira' ? '#E24B16' : '#F9B642';
    cx.fillText(lb[0], 0, lb[1]);
    if (e.hp < e.mhp) {
        R(-12, lb[1] - 13, 24, 3, '#000');
        R(-12, lb[1] - 13, 24 * e.hp / e.mhp, 3, O);
    }
    cx.restore();
}

function glow(x, y, r, c) { const g = cx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(249,182,66,0)'); cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, r, 0, 7); cx.fill(); }

/* Draws an item icon centred on (x, y) in world space; uses the emoji if the .ico is not loaded. */

function drawIcon(id, x, y, size) {
    if (iconReady(id)) {
        cx.imageSmoothingEnabled = false;
        cx.drawImage(ICONS[id], Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    }
    else {
        cx.font = Math.round(size * .75) + 'px serif';
        cx.textAlign = 'center';
        cx.fillStyle = '#fff';
        cx.fillText(IT[id].i, x, y + size * .3);
    }
}

function draw() {
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.fillStyle = '#100406';
    cx.fillRect(0, 0, W, H);
    cx.setTransform(Z, 0, 0, Z, -camX * Z + (rnd() - .5) * shake * Z, -camY * Z + (rnd() - .5) * shake * Z);
    cx.imageSmoothingEnabled = false;
    cx.drawImage(ground, 0, 0);
    PK.forEach(k => {
        const bob = Math.sin(k.t * 4) * 2;
        if (k.g) {
            glow(k.x, k.y, 18, 'rgba(249,182,66,.6)');
            cx.fillStyle = '#F9B642';
            cx.beginPath();
            cx.arc(k.x, k.y + bob, 5, 0, 7);
            cx.fill();
            cx.fillStyle = '#E24B16';
            cx.fillRect(k.x - 1, k.y + bob - 2, 2, 4);
        }
        else {
            glow(k.x, k.y, 24, 'rgba(226,75,22,.55)');
            drawIcon(k.id, k.x, k.y + bob, 24);
            cx.font = 'bold 9px Arial,Helvetica,sans-serif';
            cx.textAlign = 'center';
            cx.lineWidth = 3;
            cx.strokeStyle = '#100406';
            cx.strokeText(IT[k.id].n, k.x, k.y + 21);
            cx.fillStyle = '#F9B642';
            cx.fillText(IT[k.id].n, k.x, k.y + 21);
        }
    });
    const L = [];
    houses.forEach(h => L.push([h.y + 22, () => {
            R(h.x - 36, h.y + 10, 6, 16, '#2a160e');
            R(h.x + 30, h.y + 10, 6, 16, '#2a160e');
            R(h.x - 40, h.y - 30, 80, 42, '#5a3220');
            R(h.x - 8, h.y - 6, 16, 18, '#100406');
            glow(h.x + 23, h.y - 16, 46, 'rgba(249,182,66,.3)');
            R(h.x + 16, h.y - 22, 14, 12, '#F9B642');
            R(h.x - 30, h.y - 22, 12, 10, '#391018');
            cx.fillStyle = '#7a5424';
            cx.beginPath();
            cx.moveTo(h.x - 54, h.y - 30);
            cx.lineTo(h.x, h.y - 74);
            cx.lineTo(h.x + 54, h.y - 30);
            cx.fill();
        }]));
    trees.forEach(t => L.push([t.y, () => { R(t.x - 4, t.y - 22, 8, 24, '#2a160e'); cx.fillStyle = '#0e2a1c'; cx.beginPath(); cx.arc(t.x, t.y - 38, 22, 0, 7); cx.fill(); cx.fillStyle = '#143a26'; cx.beginPath(); cx.arc(t.x - 5, t.y - 42, 12, 0, 7); cx.fill(); }]));
    E.forEach(e => L.push([e.y, () => drawEnemy(e)]));
    P.forEach((p, i) => L.push([p.y, () => drawPlayer(p, i)]));
    GR.forEach(g => L.push([g.y, () => drawIcon('bawang', g.x, g.y, 20)]));
    L.sort((a, b) => a[0] - b[0]).forEach(o => o[1]());
    BL.forEach(b => { R(b.x - 2, b.y - 2, 5, 5, '#F9B642'); glow(b.x, b.y, 8, 'rgba(249,182,66,.5)'); });
    FX.forEach(f => {
        const k = f.t / (f.big ? .4 : .15);
        cx.globalAlpha = k;
        cx.fillStyle = f.c;
        cx.beginPath();
        cx.arc(f.x, f.y, f.r * (f.big ? 1.1 - k * .6 : 1), 0, 7);
        cx.fill();
        cx.globalAlpha = 1;
    });
    PT.forEach(p => { cx.globalAlpha = Math.min(1, p.t * 2); R(p.x, p.y, 3, 3, p.c); cx.globalAlpha = 1; });
    cx.font = 'bold 13px Arial,Helvetica,sans-serif';
    cx.textAlign = 'center';
    cx.lineWidth = 3;
    cx.strokeStyle = '#100406';
    DN.forEach(d => { cx.globalAlpha = Math.min(1, d.t * 2); cx.strokeText(d.v, d.x, d.y); cx.fillStyle = typeof d.v === 'string' ? '#E24B16' : '#fff'; cx.fillText(d.v, d.x, d.y); cx.globalAlpha = 1; });
    cx.setTransform(1, 0, 0, 1, 0, 0);
    const g = cx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .25, W / 2, H / 2, Math.max(W, H) * .7);
    g.addColorStop(0, 'rgba(8,39,57,0)');
    g.addColorStop(1, 'rgba(16,4,6,.8)');
    cx.fillStyle = g;
    cx.fillRect(0, 0, W, H);
    /* drifting fog */
    const tt = performance.now() / 9000;
    for (let i = 0; i < 5; i++) {
        const fx = ((tt * (60 + i * 25) + i * 400) % (W + 600)) - 300, fy = H * (.15 + i * .18), fg = cx.createRadialGradient(fx, fy, 0, fx, fy, 175 * Z);
        fg.addColorStop(0, 'rgba(170,190,210,.07)');
        fg.addColorStop(1, 'rgba(170,190,210,0)');
        cx.fillStyle = fg;
        cx.fillRect(0, 0, W, H);
    }
}

/* ---------- HUD ---------- */

function ammoTxt(p) {
    const w = selItem(p);
    const id = p.inv[p.sel].id;
    return (p.mag[id] ?? w.mag) + '/' + (p.unAmmo ? '∞' : p.ammo) + (p.rl > 0 ? ' reloading' : '');
}

function weaponLabel(p) {
    const w = selItem(p);
    if (!w)
        return 'Fists';
    return w.t === 'gun' ? w.n + '  ' + ammoTxt(p) : w.n;
}

function statusLabel(p) {
    if (p.down)
        return 'DOWN - teammate: hold E to revive';
    if (p.field > 0)
        return 'PROTECTED ' + Math.ceil(p.field) + 's';
    const flags = [];
    if (p.unAmmo)
        flags.push('UNLIMITED AMMO');
    if (p.unEn)
        flags.push('UNLIMITED ENERGY');
    return (flags.length ? flags.join(', ') : 'ALIVE') + '  |  ' + p.gold + ' gold';
}

function slotHtml(s, selected, key) {
    return '<div class="slot' + (selected ? ' selected' : '') + '">' + (key ? '<i>' + key + '</i>' : '') +
        (s ? iconHTML(s.id, 30) : '') + (s && s.n > 1 ? '<b>' + s.n + '</b>' : '') + '</div>';
}

function updateHud() {
    $('night-text').textContent = night + ' / 5';
    $('kill-count').textContent = Math.min(kills, target);
    $('kill-target').textContent = target;
    $('enemy-count').textContent = E.length;
    P.forEach((p, i) => {
        const id = 'p' + (i + 1);
        $(id + '-health-bar').style.width = p.hp + '%';
        $(id + '-health-text').textContent = Math.ceil(p.hp);
        $(id + '-energy-bar').style.width = p.en + '%';
        $(id + '-energy-text').textContent = Math.ceil(p.en);
        $(id + '-armor-bar').style.width = p.ar + '%';
        $(id + '-armor-text').textContent = Math.ceil(p.ar);
        $(id + '-weapon').textContent = weaponLabel(p);
        $(id + '-status').textContent = statusLabel(p);
        $(id + '-slots').innerHTML = p.inv.slice(0, 5).map((s, j) => slotHtml(s, j === p.sel, j + 1)).join('');
        $(id + '-bag-panel').classList.toggle('open', p.bag);
        if (p.bag) {
            $(id + '-backpack').innerHTML = p.inv.slice(5).map((s, j) => slotHtml(s, j === p.bi, 0)).join('');
            const s = p.inv[5 + p.bi];
            $(id + '-description').textContent = s ? IT[s.id].n + ': ' + IT[s.id].d : 'Empty slot. The shoot key swaps the highlighted item into quick slot ' + (p.sel + 1) + '.';
        }
    });
}

/* ---------- Loop, input, setup ---------- */

function resize() { const d = devicePixelRatio || 1; W = cv.width = innerWidth * d; H = cv.height = innerHeight * d; Z = Math.max(W, H) / 1000; cx.imageSmoothingEnabled = false; }
let last = performance.now();

function loop(t) {
    const dt = Math.min(.05, (t - last) / 1000);
    last = t;
    if (S === 'shop') {
        restT -= dt;
        $('rest-timer').textContent = Math.max(0, Math.ceil(restT));
        if (restT <= 0)
            nextNight();
    }
    else if (S !== 'menu') {
        update(dt);
        draw();
        if ((hudT += dt) > .08) {
            hudT = 0;
            updateHud();
        }
    }
    requestAnimationFrame(loop);
}

/* Player 2 alternative keys for keyboards without a numpad (mapped onto the numpad actions). */
const ALT = { Period: 'Numpad1', Slash: 'Numpad2', Comma: 'Numpad4', ShiftRight: 'Numpad5', Enter: 'Numpad6', KeyM: 'Numpad7', Semicolon: 'Numpad8', Quote: 'Numpad9' };

function onKey(e) {
    if (e.code.startsWith('Arrow') || e.code === 'Space')
        e.preventDefault();
    const rep = e.repeat;
    K[e.code] = true;
    if (rep)
        return;
    if (e.code === 'Escape' || e.code === 'KeyP') {
        togglePause();
        return;
    }
    if (S !== 'play')
        return;
    P.forEach((p, i) => {
        const c = CT[i];
        if (p.down)
            return;
        if (e.code === c.bg) {
            p.bag = !p.bag;
            return;
        }
        if (p.bag) {
            if (e.code === c.u)
                p.bi = (p.bi + 9) % 10;
            if (e.code === c.d)
                p.bi = (p.bi + 1) % 10;
            if (e.code === c.sh)
                [p.inv[p.sel], p.inv[5 + p.bi]] = [p.inv[5 + p.bi], p.inv[p.sel]];
            return;
        }
        if (e.code === c.rl)
            reload(p);
        if (e.code === c.us)
            useItem(p);
        if (e.code === c.bw)
            throwB(p);
        const si = c.sl ? c.sl.indexOf(e.code) : -1;
        if (si >= 0)
            p.sel = si;
        if (e.code === c.pv)
            p.sel = (p.sel + 4) % 5;
        if (e.code === c.nx)
            p.sel = (p.sel + 1) % 5;
    });
}
addEventListener('keydown', e => {
    const m = ALT[e.code];
    if (m && (S === 'play' || S === 'trans'))
        e.preventDefault();
    onKey({ code: m || e.code, repeat: e.repeat, preventDefault: () => e.preventDefault() });
});
addEventListener('keyup', e => { K[ALT[e.code] || e.code] = false; K[e.code] = false; });
addEventListener('blur', () => { K = {}; if (S === 'play')
    togglePause(); });
addEventListener('resize', resize);

/* ---------- Buttons ---------- */
const click = (id, fn) => $(id).addEventListener('click', fn);
click('start-btn', () => showScreen('player'));
click('menu-btn', () => showScreen('settings'));
click('exit-btn', () => $('exit-screen').classList.add('active'));
click('exit-cancel-btn', () => $('exit-screen').classList.remove('active'));
click('exit-confirm-btn', () => {
    $('exit-screen').classList.remove('active');
    try {
        window.close();
    }
    catch (err) { /* browsers may refuse */ }
    showScreen('goodbye');
});
document.querySelectorAll('.back-menu').forEach(b => b.addEventListener('click', () => showScreen('menu')));
click('solo-btn', () => startGame(1));
click('coop-btn', () => startGame(2));
click('pause-btn', togglePause);
click('resume-btn', togglePause);
click('pause-menu-btn', toMenu);
click('rest-continue-btn', nextNight);
click('retry-btn', () => startGame(np));
click('death-menu-btn', toMenu);
click('win-menu-btn', toMenu);
$('shop-list').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b && !b.disabled)
        buyItem(b.dataset.item, +b.dataset.player);
});

/* ---------- Audio sliders ---------- */
$('sfx-volume').addEventListener('input', e => {
    ac();
    sfxVol = e.target.value / 100;
    applyVol();
    SFX.shot();
});
$('music-volume').addEventListener('input', e => {
    ac();
    musVol = e.target.value / 100;
    applyVol();
    tone(220, .4, 'triangle', .1, 0, MU);
});

/* ---------- Start ---------- */
buildWorld();
resize();
requestAnimationFrame(loop);
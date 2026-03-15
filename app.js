/**
 * القرآن برو v4.2 - النسخة الكاملة (البحث + رمضان + المواقيت + التلوين)
 * تطوير وتصميم: يوسف بوعنيقة
 */

const audio = document.getElementById('main-audio');
const playBtn = document.getElementById('play-btn');
const progressBar = document.getElementById('progress-bar');
const playerBar = document.getElementById('player-bar');
const mainContent = document.getElementById('main-content');
const settingsPanel = document.getElementById('settings-panel');
const settingsOverlay = document.getElementById('settings-overlay');
const searchInput = document.getElementById('search-input'); // عنصر البحث

let currentReciterData = null; 
let currentSurahIndex = -1;
let isFavOnlyView = false;
let favorites = JSON.parse(localStorage.getItem('quran-favs')) || [];
let sleepTimer = null;
let hijriData = null; 

const azkar = ["سُبْحَانَ اللَّهِ", "الْحَمْدُ لِلَّهِ", "لَا إِلَهَ إِلَّا اللَّهُ", "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ"];

window.onload = () => {
    initApp();
    createRamadanEffects();
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if(splash) {
            splash.classList.add('opacity-0');
            setTimeout(() => splash.style.display = 'none', 1000);
        }
    }, 2000);
};

function initApp() {
    applyTheme(localStorage.getItem('app-theme') || '#10b981');
    renderThemes();
    if (typeof recitersData !== 'undefined') renderReciters(recitersData);
    getPrayerTimesAutomated(); 
    startAzkarSystem();
    
    // تفعيل مستمع البحث
    if(searchInput) {
        searchInput.oninput = (e) => handleSearch(e.target.value);
    }
}

// 1. نظام البحث الذكي
function handleSearch(query) {
    const q = query.toLowerCase().trim();
    const isSurahView = !document.getElementById('surahs-view').classList.contains('hidden');

    if (!isSurahView) {
        // بحث عن القراء
        const filtered = recitersData.filter(r => r.name.toLowerCase().includes(q));
        renderReciters(filtered);
    } else {
        // بحث عن السور داخل القارئ الحالي أو المفضلة
        const source = isFavOnlyView ? favorites : currentReciterData.data;
        const filtered = source.filter(s => s.name.toLowerCase().includes(q));
        renderSurahs(filtered);
    }
}

// 2. نظام مواقيت الصلاة والتقويم (IP-API)
async function getPrayerTimesAutomated() {
    const container = document.getElementById('prayer-times');
    try {
        const ipRes = await fetch('http://ip-api.com/json');
        const ipData = await ipRes.json();
        const city = ipData.city;
        const country = ipData.country;

        const adhanUrl = `https://api.aladhan.com/v1/timingsByAddress?address=city=${city}&country=${country}&method=3`;
        const res = await fetch(adhanUrl);
        const adhanData = await res.json();
        const t = adhanData.data.timings;
        hijriData = adhanData.data.date.hijri;

        const prayers = [
            { name: 'الفجر', time: t.Fajr },
            { name: 'الظهر', time: t.Dhuhr },
            { name: 'العصر', time: t.Asr },
            { name: 'المغرب', time: t.Maghrib },
            { name: 'العشاء', time: t.Isha }
        ];

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        let nextPrayerIndex = prayers.findIndex(p => {
            const [h, m] = p.time.split(':').map(Number);
            return (h * 60 + m) > currentMinutes;
        });
        if (nextPrayerIndex === -1) nextPrayerIndex = 0;

        container.innerHTML = prayers.map((p, index) => {
            const isNext = (index === nextPrayerIndex);
            return `
                <div class="px-2 text-center p-1 rounded-xl transition-all ${isNext ? 'shadow-lg scale-110' : 'opacity-60'}" 
                     style="${isNext ? 'background-color: var(--primary-color); color: black;' : ''}">
                    <p class="text-[8px] font-bold uppercase">${p.name}</p>
                    <p class="font-bold text-[11px]">${p.time}</p>
                </div>
            `;
        }).join('');

        const zekrDisplay = document.getElementById('zekr-display');
        if(zekrDisplay) zekrDisplay.innerText = `📍 ${city} | ${hijriData.weekday.ar} ${hijriData.day} ${hijriData.month.ar}`;

    } catch (e) {
        if(container) container.innerHTML = "<span class='text-xs opacity-50 italic'>تعذر جلب المواقيت</span>";
    }
}

// 3. التقويم الهجري
function showHijriCalendar() {
    if(!hijriData) return alert("جاري جلب البيانات...");
    const calHtml = `
        <div id="calendar-modal" class="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
            <div class="glass-card max-w-sm w-full p-8 rounded-[2.5rem] text-center border-b-8 shadow-2xl" style="border-color: var(--primary-color)">
                <h2 class="text-3xl font-bold mb-4 font-quran">التقويم الهجري</h2>
                <div class="bg-white/5 rounded-3xl p-6 mb-6">
                    <p class="text-[var(--primary-color)] text-5xl font-bold mb-2">${hijriData.day}</p>
                    <p class="text-xl font-bold">${hijriData.month.ar}</p>
                    <p class="text-slate-400">${hijriData.year} هـ</p>
                </div>
                <p class="mb-8 text-lg">${hijriData.weekday.ar}</p>
                <button onclick="this.closest('#calendar-modal').remove()" class="w-full py-4 text-black font-bold rounded-2xl transition hover:scale-105" style="background-color: var(--primary-color)">إغلاق</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', calHtml);
}

// 4. تطبيق السمة الشاملة
function applyTheme(c) {
    document.documentElement.style.setProperty('--primary-color', c);
    localStorage.setItem('app-theme', c);
    if(playBtn) playBtn.style.backgroundColor = c;
    if(progressBar) progressBar.style.accentColor = c;

    const styleId = 'custom-theme-styles';
    let styleTag = document.getElementById(styleId);
    if(!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
        .timer-btn:hover { background-color: ${c} !important; color: black !important; }
        .surah-active { background-color: ${c} !important; color: black !important; }
        #ramadan-bg div { color: ${c} !important; }
        @keyframes float { 0%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-20px) rotate(20deg); } }
        input:focus { border-color: ${c} !important; }
    `;
    if(currentReciterData) renderSurahs(isFavOnlyView ? favorites : currentReciterData.data);
}

// 5. تأثيرات رمضان
function createRamadanEffects() {
    const container = document.createElement('div');
    container.id = 'ramadan-bg';
    container.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:-1; overflow:hidden;';
    document.body.appendChild(container);

    for(let i=0; i<15; i++) {
        const star = document.createElement('div');
        star.innerHTML = i % 3 === 0 ? '🌙' : '⭐';
        star.style.cssText = `
            position: absolute;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            font-size: ${10 + Math.random() * 15}px;
            color: var(--primary-color);
            opacity: 0.3;
            filter: blur(1px);
            animation: float ${5 + Math.random() * 10}s infinite ease-in-out;
        `;
        container.appendChild(star);
    }
}

// 6. التحميل (القارئ + السورة)
async function downloadAudio(url, surahName) {
    const reciterName = currentReciterData ? currentReciterData.name : "القرآن الكريم";
    const fullFileName = `${reciterName} - ${surahName}`;
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fullFileName + ".mp3";
        link.click();
    } catch (e) { window.open(url, '_blank'); }
}

// وظائف الواجهة والتحكم
function showAbout() {
    const aboutHtml = `
        <div id="custom-alert" class="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div class="glass-card max-w-sm w-full p-8 rounded-[2.5rem] text-center border-t-4 shadow-2xl" style="border-color: var(--primary-color)">
                <div class="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style="background-color: rgba(255,255,255,0.05); color: var(--primary-color)">
                    <svg class="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                </div>
                <h3 class="text-2xl font-bold mb-2">القرآن الكريم </h3>
                <div class="bg-white/5 rounded-2xl p-4 mb-8">
                    <p class="text-xs text-slate-500 mb-1">تطوير وتصميم</p>
                    <p class="font-bold" style="color: var(--primary-color)">يوسف بوعنيقة</p>
                </div>
                <button onclick="this.closest('#custom-alert').remove()" class="w-full py-4 text-black font-bold rounded-2xl transition hover:scale-105" style="background-color: var(--primary-color)">إغلاق</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', aboutHtml);
}

function renderThemes() {
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16'];
    const container = document.getElementById('theme-colors');
    if(container) {
        container.innerHTML = colors.map(c => `
            <button onclick="applyTheme('${c}')" class="w-full h-10 rounded-xl transition hover:scale-110 shadow-lg" style="background:${c}"></button>
        `).join('');
    }
}

function toggleSettings() {
    const isOpen = settingsPanel.classList.contains('translate-x-0');
    settingsPanel.classList.toggle('translate-x-0', !isOpen);
    settingsPanel.classList.toggle('translate-x-[-100%]', isOpen);
    settingsOverlay.style.display = isOpen ? 'none' : 'block';
}

function showReciters() {
    if(searchInput) searchInput.value = ""; // تصفير البحث عند العودة
    document.getElementById('surahs-view').classList.add('hidden');
    document.getElementById('reciters-view').classList.remove('hidden');
    window.scrollTo(0,0);
}

function closePlayer() {
    audio.pause();
    playerBar.classList.add('translate-y-full');
    currentSurahIndex = -1;
    updateUI(false);
    if(currentReciterData) renderSurahs(isFavOnlyView ? favorites : currentReciterData.data);
}

function renderReciters(data) {
    const list = document.getElementById('reciters-list');
    if(!list) return;
    list.innerHTML = data.map(r => `
        <div onclick='openReciter(${JSON.stringify(r).replace(/'/g, "&apos;")})' class="glass-card p-8 rounded-[2.5rem] text-center cursor-pointer hover:scale-105 transition">
            <img src="${r.image}" class="w-32 h-32 rounded-3xl mx-auto mb-4 object-cover border-2 border-white/5">
            <h3 class="text-xl font-bold">${r.name}</h3>
        </div>
    `).join('');
}

function openReciter(reciter) {
    if(searchInput) searchInput.value = ""; // تصفير البحث عند الدخول
    isFavOnlyView = false;
    currentReciterData = reciter;
    document.getElementById('reciters-view').classList.add('hidden');
    document.getElementById('surahs-view').classList.remove('hidden');
    document.getElementById('current-name').innerText = reciter.name;
    document.getElementById('current-img').src = reciter.image;
    renderSurahs(reciter.data);
}

function renderSurahs(surahs) {
    const list = document.getElementById('surahs-list');
    if(!list) return;
    list.innerHTML = surahs.map((s, idx) => {
        const isFav = favorites.some(f => f.url === s.url);
        const isActive = (currentSurahIndex === idx);
        const pColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        return `
            <div class="glass-card p-5 rounded-2xl flex justify-between items-center ${isActive ? 'surah-active' : ''}" 
                 style="${isActive ? `background-color: ${pColor}; color: black;` : ''}">
                <div class="flex items-center gap-5 cursor-pointer flex-1" onclick="playTrack(${idx}, ${isFavOnlyView})">
                    <span class="w-10 h-10 flex items-center justify-center bg-white/10 rounded-lg font-bold">${isActive ? '▶' : s.id}</span>
                    <span class="text-xl font-quran font-bold">${s.name}</span>
                </div>
                <div class="flex gap-2">
                    <button onclick="downloadAudio('${s.url}', '${s.name}')" class="p-2" style="color: ${isActive ? 'black' : 'var(--primary-color)'}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    </button>
                    <button onclick="toggleFavorite(${JSON.stringify(s).replace(/"/g, '&quot;')})" class="p-2 ${isFav ? 'text-red-500' : 'text-slate-400'}">
                        <svg class="w-5 h-5" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function playTrack(index, fromFavs) {
    currentSurahIndex = index;
    const source = fromFavs ? favorites : currentReciterData.data;
    const surah = source[index];
    audio.src = surah.url;
    audio.play();
    playerBar.classList.remove('translate-y-full');
    document.getElementById('p-surah').innerText = surah.name;
    document.getElementById('p-reciter').innerText = fromFavs ? "المفضلة" : currentReciterData.name;
    document.getElementById('p-img').src = fromFavs ? "https://cdn-icons-png.flaticon.com/512/1828/1828884.png" : currentReciterData.image;
    renderSurahs(source);
    updateUI(true);
}

function toggleFavorite(surah) {
    const idx = favorites.findIndex(f => f.url === surah.url);
    if(idx === -1) favorites.push(surah); else favorites.splice(idx, 1);
    localStorage.setItem('quran-favs', JSON.stringify(favorites));
    renderSurahs(isFavOnlyView ? favorites : currentReciterData.data);
}

function showFavorites() {
    if (favorites.length === 0) return noFav();
    isFavOnlyView = true;
    document.getElementById('reciters-view').classList.add('hidden');
    document.getElementById('surahs-view').classList.remove('hidden');
    document.getElementById('current-name').innerText = "سورك المفضلة";
    document.getElementById('current-img').src = "https://cdn-icons-png.flaticon.com/512/1828/1828884.png";
    renderSurahs(favorites);
}

function setSleepTimer(minutes) {
    if (sleepTimer) clearTimeout(sleepTimer);
    if (minutes === 0) return  ;//alert("تم إلغاء المؤقت");
   // alert(`سيغلق التطبيق بعد ${minutes} دقيقة`);
    sleepTimer = setTimeout(() => { audio.pause(); updateUI(false); }, minutes * 60 * 1000);
}

function startAzkarSystem() {
    const d = document.getElementById('zekr-display');
    if(!d) return;
    let i = 0;
    setInterval(() => {
        d.style.opacity = 0;
        setTimeout(() => { 
            d.innerText = azkar[i]; 
            d.style.opacity = 1; 
            i = (i+1)%azkar.length; 
        }, 1000);
    }, 15000);
}

function updateUI(playing) {
    document.getElementById('play-svg').classList.toggle('hidden', playing);
    document.getElementById('pause-svg').classList.toggle('hidden', !playing);
}

function toggleDarkMode() { document.body.classList.toggle('light-mode'); }

progressBar.addEventListener('input', () => {
    if (audio.duration) {
        const time = (progressBar.value / 100) * audio.duration;
        audio.currentTime = time;
    }
});

audio.ontimeupdate = () => {
    if (audio.duration) {
        progressBar.value = (audio.currentTime / audio.duration) * 100;
        document.getElementById('current-time').innerText = formatTime(audio.currentTime);
        document.getElementById('duration').innerText = formatTime(audio.duration);
    }
};

audio.addEventListener('ended', () => {
    const source = isFavOnlyView ? favorites : currentReciterData.data;
    if (currentSurahIndex < source.length - 1) {
        playTrack(currentSurahIndex + 1, isFavOnlyView);
    }
});

playBtn.onclick = () => { audio.paused ? (audio.play(), updateUI(true)) : (audio.pause(), updateUI(false)); };
function formatTime(s) { const m = Math.floor(s/60), rs = Math.floor(s%60); return `${m}:${rs<10?'0':''}${rs}`; }


function noFav(){
    const aboutHtml = `
        <div id="custom-alert" class="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div class="glass-card max-w-sm w-full p-8 rounded-[2.5rem] text-center border-t-4 shadow-2xl" style="border-color: var(--primary-color)">
                <div class="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style="background-color: rgba(255,255,255,0.05); color: var(--primary-color)">
                    <svg class="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                </div>
                <h3 class="text-2xl font-bold mb-2"> المفضلة </h3>
                <div class="bg-white/5 rounded-2xl p-4 mb-8">
                    <p class="text-xs text-slate-500 mb-1" >  </p>
                    <p class="font-bold" style="color: var(--primary-color)"> لا توجد اي سورة في المفضلة </p>
                </div>
                <button onclick="this.closest('#custom-alert').remove()" class="w-full py-4 text-black font-bold rounded-2xl transition hover:scale-105" style="background-color: var(--primary-color)">إغلاق</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', aboutHtml);

}



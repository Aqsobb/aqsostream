/* ========================================== */
/* AQSO STREAM - LOGIKA BACKEND & FRONTEND    */
/* ========================================== */

// 1. Inisialisasi Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCsUEn7Arp5q1OVCh6jRssfZT31yiaZuag",
    authDomain: "dtabase-80c9a.firebaseapp.com",
    databaseURL: "https://dtabase-80c9a-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "dtabase-80c9a",
    storageBucket: "dtabase-80c9a.firebasestorage.app",
    messagingSenderId: "800365836046",
    appId: "1:800365836046:web:bc8ecc9112f014a6e9095f",
    measurementId: "G-C8HK8YJFRV"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

let allAnime = [];
let currentAnimeId = null;
let currentUser = null;
let currentPage = 1;
const itemsPerPage = 20;

// 2. Sistem Autentikasi & Profil (Auto Relog)
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        // Auto update profil
        db.ref(`users/${user.uid}/profile`).on('value', (snap) => {
            const profile = snap.val();
            const name = profile ? profile.displayName : user.displayName;
            document.getElementById('user-display-name').innerText = name;
            document.getElementById('user-avatar').src = user.photoURL;
            document.getElementById('edit-name').value = name;
            document.getElementById('edit-avatar').src = user.photoURL;
        });

        document.getElementById('btn-login').classList.add('hidden');
        document.getElementById('user-profile').classList.remove('hidden');
        document.getElementById('comment-input-area').classList.remove('hidden');
        document.getElementById('comment-lock').classList.add('hidden');
    } else {
        currentUser = null;
        document.getElementById('btn-login').classList.remove('hidden');
        document.getElementById('user-profile').classList.add('hidden');
        document.getElementById('comment-input-area').classList.add('hidden');
        document.getElementById('comment-lock').classList.remove('hidden');
    }
});

function loginGoogle() { auth.signInWithPopup(provider).catch(err => alert("Gagal Login: " + err.message)); }
function logout() { auth.signOut(); closeSettings(); }

function openSettings() { document.getElementById('settings-modal').classList.remove('hidden'); }
function closeSettings() { document.getElementById('settings-modal').classList.add('hidden'); }
function saveProfile() {
    const newName = document.getElementById('edit-name').value;
    db.ref(`users/${currentUser.uid}/profile`).update({ displayName: newName }).then(() => { closeSettings(); });
}

// 3. Sistem Auto-Update Real-time dari Database
function fetchDatabase() {
    try {
        // 'on' = Real-time listener. Setiap ada scrape baru, web otomatis update.
        db.ref('anichin_database').on('value', (snapshot) => {
            const data = snapshot.val();
            if(data) {
                allAnime = Object.keys(data).map(key => ({ id: key, ...data[key] }))
                    .filter(i => i.title && i.id !== "single_scrapes")
                    .sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
            }
            
            // Hapus loading cinematic setelah dapet data
            const initLoader = document.getElementById('initial-loader');
            if(initLoader) {
                initLoader.classList.add('opacity-0');
                setTimeout(() => initLoader.remove(), 700); 
            }

            renderHero();
            renderGrid();
            document.getElementById('catalog-section').classList.remove('hidden');
            document.getElementById('btn-login').classList.remove('hidden');
        });
    } catch (err) {
        console.error("Gagal terhubung ke Database:", err);
    }
}

// 4. Render UI
function renderHero() {
    const heroSection = document.getElementById('hero-section');
    if (allAnime.length > 0) {
        const topAnime = allAnime[0]; 
        const cover = topAnime.cover || "https://via.placeholder.com/1280x720/050811/e50914";
        document.getElementById('hero-bg').style.backgroundImage = `url('${cover}')`;
        document.getElementById('hero-title').innerText = topAnime.title;
        document.getElementById('hero-synopsis').innerText = topAnime.synopsis || "Saksikan keseruan anime ini hanya di AQSO STREAM.";
        document.getElementById('hero-play-btn').onclick = () => openModal(topAnime);
        heroSection.classList.remove('hidden');
    }
}

function renderGrid() {
    const catalogEl = document.getElementById('catalog');
    const paginationEl = document.getElementById('pagination');
    catalogEl.innerHTML = '';
    
    if (allAnime.length === 0) return;

    const startIdx = (currentPage - 1) * itemsPerPage;
    const paginatedData = allAnime.slice(startIdx, startIdx + itemsPerPage);

    paginatedData.forEach(anime => {
        const card = document.createElement('div');
        card.className = "premium-card rounded-xl overflow-hidden cursor-pointer group";
        const cover = anime.cover || "https://via.placeholder.com/300x450/050811/e50914";
        const totalEps = anime.total_episodes || '?';

        card.innerHTML = `
            <div class="relative aspect-[2/3] overflow-hidden">
                <img src="${cover}" loading="lazy" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
                    <div class="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center bg-[#e50914]/90 text-white shadow-lg">
                        <svg class="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                </div>
                <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#050811] to-transparent p-3 pt-10">
                    <span class="bg-[#e50914] text-white text-[9px] font-black px-2 py-1 rounded tracking-wider shadow">${totalEps} Eps</span>
                </div>
            </div>
            <div class="p-3 bg-[#050811]">
                <h3 class="font-bold text-xs md:text-sm text-gray-300 line-clamp-2 leading-tight group-hover:text-white transition">${anime.title}</h3>
            </div>
        `;
        card.onclick = () => openModal(anime);
        catalogEl.appendChild(card);
    });

    paginationEl.classList.remove('hidden');
    document.getElementById('page-info').innerText = `Hal ${currentPage} dari ${Math.ceil(allAnime.length / itemsPerPage)}`;
    document.getElementById('btn-prev').disabled = currentPage === 1;
    document.getElementById('btn-next').disabled = currentPage >= Math.ceil(allAnime.length / itemsPerPage);
}

function changePage(direction) {
    currentPage += direction;
    document.getElementById('catalog-section').scrollIntoView({ behavior: 'smooth' });
    renderGrid();
}

// 5. Modal Engine
function openModal(anime) {
    document.getElementById('modal-title').innerText = anime.title;
    document.getElementById('modal-cover').src = anime.cover || '';
    document.getElementById('modal-ep-count').innerText = `${anime.total_episodes || 0} Episode Dirilis`;
    const epList = document.getElementById('modal-ep-list');
    epList.innerHTML = '';

    if (anime.episodes) {
        let episodesArray = Object.keys(anime.episodes).map(key => ({ epId: key, ...anime.episodes[key] }));
        episodesArray.sort((a, b) => {
            const numA = parseFloat(a.number.replace(/[^\d.]/g, '')) || 0;
            const numB = parseFloat(b.number.replace(/[^\d.]/g, '')) || 0;
            return numB - numA; 
        });

        if (episodesArray.length > 0) {
            episodesArray.forEach(ep => {
                epList.innerHTML += `
                    <button onclick="playVideo('${anime.id}', '${ep.epId}')" class="w-full text-left px-4 md:px-5 py-4 mb-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#e50914] rounded-xl flex items-center justify-between group transition shadow">
                        <div class="flex items-center gap-4">
                            <div class="text-xl font-black text-gray-600 group-hover:text-[#e50914] transition w-8 text-center">${ep.number.replace(/[^\d]/g, '') || '?'}</div>
                            <div>
                                <span class="block text-sm text-white font-bold mb-1 group-hover:text-red-400 transition">${ep.title || 'Episode ' + ep.number}</span>
                                <span class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Subtitle Indonesia</span>
                            </div>
                        </div>
                        <div class="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-[#e50914] group-hover:bg-[#e50914] transition">
                            <svg class="w-4 h-4 text-gray-400 group-hover:text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                    </button>
                `;
            });
        }
    } else {
        epList.innerHTML = `<div class="p-6 text-center text-gray-500 font-bold border border-dashed border-white/10 rounded-xl">Menunggu sinkronisasi server...</div>`;
    }
    document.getElementById('episode-modal').classList.remove('hidden');
}

function closeModal() { document.getElementById('episode-modal').classList.add('hidden'); }

// 6. Player & In-Player Multi Server Switcher
function switchServer(url, btnElement) {
    document.getElementById('main-iframe').src = url;
    const buttons = document.querySelectorAll('.server-btn');
    buttons.forEach(b => {
        b.classList.remove('bg-[#e50914]', 'text-white', 'border-red-600');
        b.classList.add('bg-white/5', 'text-gray-400', 'border-white/5');
    });
    btnElement.classList.remove('bg-white/5', 'text-gray-400', 'border-white/5');
    btnElement.classList.add('bg-[#e50914]', 'text-white', 'border-red-600');
}

function playVideo(animeId, epId) {
    closeModal();
    document.getElementById('hero-section').classList.add('hidden');
    document.getElementById('catalog-section').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    const anime = allAnime.find(a => a.id === animeId);
    if (!anime || !anime.episodes || !anime.episodes[epId]) return;
    
    const ep = anime.episodes[epId];
    const section = document.getElementById('player-section');
    const frame = document.getElementById('video-frame-container');
    const mirrorList = document.getElementById('mirror-list');
    
    section.classList.remove('hidden');
    document.getElementById('player-title').innerText = `${anime.title} - ${ep.number}`;
    document.getElementById('player-synopsis').innerText = anime.synopsis || "Saksikan keseruan episode ini hanya di AQSO STREAM.";

    loadComments(animeId);
    mirrorList.innerHTML = '';

    if (ep.videoUrl && ep.videoUrl !== "") {
        frame.innerHTML = `<iframe id="main-iframe" src="${ep.videoUrl}" allowfullscreen class="w-full h-full absolute top-0 left-0 border-0"></iframe>`;
        mirrorList.innerHTML += `<button onclick="switchServer('${ep.videoUrl}', this)" class="server-btn bg-[#e50914] text-white border-red-600 border text-xs font-bold px-4 py-2 rounded shadow transition">Server Utama</button>`;

        if (ep.mirrors && ep.mirrors.length > 0) {
            ep.mirrors.forEach((m, idx) => {
                if(m.link && !m.link.includes('javascript')) {
                    mirrorList.innerHTML += `<button onclick="switchServer('${m.link}', this)" class="server-btn bg-white/5 text-gray-400 border border-white/5 hover:text-white hover:bg-white/10 text-xs font-bold px-4 py-2 rounded shadow transition">Mirror ${idx + 1} (${m.server})</button>`;
                }
            });
        }
    } else {
        frame.innerHTML = `<div class="absolute inset-0 flex flex-col items-center justify-center bg-[#111827] text-gray-500 border border-white/5 rounded-xl font-bold"><p>Data video sedang disiapkan backend.</p></div>`;
    }
}

function closePlayer() {
    document.getElementById('player-section').classList.add('hidden');
    document.getElementById('video-frame-container').innerHTML = ''; 
    document.getElementById('hero-section').classList.remove('hidden');
    document.getElementById('catalog-section').classList.remove('hidden');
    currentAnimeId = null;
}

// 7. Sistem Komentar Realtime
function loadComments(animeId) {
    currentAnimeId = animeId;
    db.ref(`comments/${animeId}`).on('value', (snap) => {
        const data = snap.val();
        const container = document.getElementById('comments-display');
        container.innerHTML = '';
        document.getElementById('comment-count').innerText = data ? Object.keys(data).length : 0;
        
        if(data) {
            Object.values(data).reverse().forEach(c => {
                container.innerHTML += `
                    <div class="flex gap-4 group bg-black/20 p-4 rounded-xl border border-white/5">
                        <img src="${c.avatar}" class="w-10 h-10 rounded-full border border-white/10">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-sm font-bold text-white">${c.name}</span>
                                <span class="text-[10px] text-gray-500 uppercase tracking-widest">${new Date(c.time).toLocaleDateString()}</span>
                            </div>
                            <p class="text-sm text-gray-300 leading-relaxed">${c.text}</p>
                        </div>
                    </div>
                `;
            });
        } else {
            container.innerHTML = `<p class="text-sm text-gray-500 italic">Belum ada komentar. Jadilah yang pertama!</p>`;
        }
    });
}

function postComment() {
    const text = document.getElementById('comment-text').value;
    if(!text.trim() || !currentUser || !currentAnimeId) return;
    
    db.ref(`users/${currentUser.uid}/profile`).once('value', (snap) => {
        const profile = snap.val();
        db.ref(`comments/${currentAnimeId}`).push({
            uid: currentUser.uid,
            name: profile ? profile.displayName : currentUser.displayName,
            avatar: currentUser.photoURL,
            text: text,
            time: Date.now()
        }).then(() => { document.getElementById('comment-text').value = ''; });
    });
}

// Kickstart the App
fetchDatabase();
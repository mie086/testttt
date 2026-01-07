// --- CONFIGURATION ---
const SUPABASE_URL = 'https://yqvqtgsbcyudzzvklysk.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxdnF0Z3NiY3l1ZHp6dmtseXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODM2MzQsImV4cCI6MjA4MzI1OTYzNH0.FXH_1ZzesNjuFvwEvMcjqA2MIqWZRhqUegGUGg8pnWI';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elements
const searchInput = document.getElementById('searchInput');
const resultsDiv = document.getElementById('results');
let debounceTimer;
let currentUser = null; // Simpan status login user
let currentEditId = null; // Simpan ID perkataan yang sedang diedit

// --- AUTO CHECK SESSION BILA LOAD ---
window.addEventListener('DOMContentLoaded', () => {
    checkSession(); // Check user login dulu
    if(searchInput) searchInput.focus();
});

// --- BAHAGIAN 1: CARIAN ---

searchInput.addEventListener('input', (e) => {
    const keyword = e.target.value.trim();
    clearTimeout(debounceTimer);
    if (keyword.length === 0) {
        resultsDiv.innerHTML = '<div class="no-result" style="text-align:center; color:#888;">Mula menaip untuk mencari...</div>';
        return;
    }
    debounceTimer = setTimeout(() => { fetchWord(keyword); }, 300);
});

async function fetchWord(keyword) {
    resultsDiv.innerHTML = '<div class="loading" style="text-align:center;">Sedang mencari...</div>';
    try {
        const { data, error } = await _supabase
            .from('dictionary').select('*')
            .ilike('word', `${keyword}%`).limit(5)
            .order('id', { ascending: true }); // Susun ikut ID

        if (error) throw error;
        displayResults(data);
    } catch (err) {
        console.error(err);
        resultsDiv.innerHTML = '<div class="no-result">Ralat sambungan.</div>';
    }
}

function displayResults(data) {
    resultsDiv.innerHTML = '';
    if (!data || data.length === 0) {
        resultsDiv.innerHTML = '<div class="no-result" style="text-align:center; padding:20px;">Tiada hasil dijumpai.</div>';
        return;
    }

    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'word-card';
        // Simpan data penuh dalam elemen supaya butang Edit boleh baca nanti
        card.dataset.json = JSON.stringify(item); 

        const details = item.details || {};
        const arabicText = details.arabic || ''; 
        const tag = details.tag || item.type || 'Umum';

        // Butang Admin (Hanya muncul jika user dah login)
        let adminControls = '';
        if (currentUser) {
            adminControls = `
                <div style="float:right; margin-bottom:10px;">
                    <button onclick='setupEdit(${JSON.stringify(item).replace(/'/g, "&#39;")})' style="background:#f39c12; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;">✏️ Edit</button>
                    <button onclick="deleteWord(${item.id})" style="background:#c0392b; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️ Padam</button>
                </div>
                <div style="clear:both;"></div>
            `;
        }

        // Logic Table Struktur
        let tableRows = '';
        if (details.structure && Array.isArray(details.structure)) {
            details.structure.forEach(row => {
                tableRows += `<tr><td>${row.komponen}</td><td class="arabic-cell">${row.arab}</td><td><i>${row.sebutan}</i></td><td>${row.fungsi}</td></tr>`;
            });
        }

        // Logic Contoh Ayat
        let examplesHTML = '';
        if (details.examples && Array.isArray(details.examples)) {
            examplesHTML += '<h3>2. Contoh Ayat Harian</h3><div class="example-list">';
            details.examples.forEach((ex, index) => {
                examplesHTML += `<div class="example-item"><span class="ex-number">${index + 1}.</span><div class="ex-content"><p class="ex-arabic">${ex.arabic}</p><p class="ex-translation">${ex.translation}</p></div></div>`;
            });
            examplesHTML += '</div>';
        }

        // Logic Conclusion (Info Tambahan)
        let conclusionHTML = '';
        if (details.conclusion) {
            const c = details.conclusion;
            let cRows = '';
            if (c.table && Array.isArray(c.table)) {
                c.table.forEach(r => {
                    cRows += `<tr><td>${r.konteks}</td><td class="arabic-cell">${r.arab}</td><td><i>${r.sebutan}</i></td><td>${r.terjemahan}</td></tr>`;
                });
            }
            conclusionHTML = `
                <div style="margin-top: 30px; background: #e3f2fd; padding: 15px; border-radius: 8px; border: 1px solid #90caf9;">
                    <h3 class="section-title" style="border-color:#1976d2; color:#0d47a1;">3. Info Tambahan & Sinonim</h3>
                    <p style="margin-bottom:15px; line-height:1.6;">${c.intro}</p>
                    ${cRows ? `<table class="custom-table" style="background:white;"><thead><tr style="background:#bbdefb;"><th>Konteks</th><th>Arab</th><th>Sebutan</th><th>Terjemahan</th></tr></thead><tbody>${cRows}</tbody></table>` : ''}
                </div>`;
        }

        card.innerHTML = `
            ${adminControls} <div class="word-header-row"><h1 class="main-word">${item.word}</h1><span class="info-tag">${tag}</span></div>
            <hr class="divider">
            <div class="detail-section">
                ${details.transliteration ? `<div class="transliteration-box"><span class="green-dot"></span><span class="arabic-small">${arabicText}</span><br><i class="latin-text">${details.transliteration}</i></div>` : ''}
                ${details.meaning_extended ? `<p style="margin-top:10px;">${details.meaning_extended}</p>` : ''}
                ${details.grammar_note ? `<p style="background:#fff3e0; padding:8px; border-radius:5px; font-size:0.9em;">💡 ${details.grammar_note}</p>` : ''}
                ${tableRows ? `<h3>1. Struktur & Makna</h3><table class="custom-table"><thead><tr><th>Komponen</th><th>Arab</th><th>Sebutan</th><th>Fungsi/Makna</th></tr></thead><tbody>${tableRows}</tbody></table>` : ''}
                ${examplesHTML}
                ${conclusionHTML}
                ${details.footer_note ? `<div class="footer-note" style="margin-top:15px; font-style:italic; border-left:3px solid #ccc; padding-left:10px; color:#666;">${details.footer_note}</div>` : ''}
            </div>
        `;
        resultsDiv.appendChild(card);
    });
}

// --- BAHAGIAN 2: ADMIN LOGIC ---

const modal = document.getElementById("adminModal");
const btn = document.getElementById("adminBtn");
const span = document.getElementsByClassName("close-btn")[0];
const loginSection = document.getElementById("loginSection");
const dataSection = document.getElementById("dataSection");

// Buka Modal (Mode Tambah Baru)
btn.onclick = function() {
    resetForm(); // Ini dah cukup untuk reset tajuk
    currentEditId = null; 
    // Baris bermasalah tadi dah dibuang
    modal.style.display = "block";
    checkSession();
}

// Tutup Modal
span.onclick = function() { modal.style.display = "none"; }
window.onclick = function(event) { if (event.target == modal) modal.style.display = "none"; }

// Fungsi Setup Edit (Dipanggil bila butang Edit ditekan)
function setupEdit(item) {
    console.log("Editing:", item);
    currentEditId = item.id; // Set ID untuk update nanti
    
    // Buka Modal
    modal.style.display = "block";
    checkSession();

    // Tukar tajuk modal
    const titleEl = document.querySelector("#dataSection h2");
    if(titleEl) titleEl.innerText = `Edit: ${item.word}`;
    else document.getElementById('dataSection').insertAdjacentHTML('afterbegin', `<h2 id="formTitle">Edit: ${item.word}</h2>`);

    // Isi semula borang dengan data dari database
    document.getElementById('newWord').value = item.word;
    document.getElementById('newDef').value = item.definition;
    document.getElementById('newType').value = item.type || (item.details?.tag || '');

    const d = item.details || {};
    document.getElementById('newArab').value = d.arabic || '';
    document.getElementById('newTrans').value = d.transliteration || '';
    document.getElementById('newMeaningExt').value = d.meaning_extended || '';
    document.getElementById('newGrammar').value = d.grammar_note || '';
    document.getElementById('newFooter').value = d.footer_note || '';

    // Isi Struktur (Clear dulu, lepas tu tambah row satu per satu)
    document.getElementById('structContainer').innerHTML = '';
    if (d.structure && Array.isArray(d.structure)) {
        d.structure.forEach(row => {
            addStructRow(row.komponen, row.arab, row.sebutan, row.fungsi);
        });
    }

    // Isi Contoh (Clear dulu, lepas tu tambah)
    document.getElementById('exContainer').innerHTML = '';
    if (d.examples && Array.isArray(d.examples)) {
        d.examples.forEach(ex => {
            addExRow(ex.arabic, ex.translation);
        });
    }
}

// Fungsi Padam
async function deleteWord(id) {
    if(!confirm("Anda pasti mahu memadam perkataan ini?")) return;

    try {
        const { error } = await _supabase.from('dictionary').delete().eq('id', id);
        if (error) throw error;
        alert("Berjaya dipadam!");
        // Refresh carian
        const currentKeyword = searchInput.value.trim();
        if(currentKeyword) fetchWord(currentKeyword);
    } catch (err) {
        alert("Gagal padam: " + err.message);
    }
}

// Helper: Kosongkan Form
function resetForm() {
    currentEditId = null;
    document.querySelectorAll('#dataSection input, #dataSection textarea').forEach(i => i.value = '');
    document.getElementById('structContainer').innerHTML = '';
    document.getElementById('exContainer').innerHTML = '';
    const titleEl = document.querySelector("#dataSection h2");
    if(titleEl) titleEl.innerText = "Tambah Perkataan Baru";
}

// Check Session & Update UI
async function checkSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    currentUser = session; // Simpan dalam global var
    
    if (session) {
        loginSection.style.display = "none";
        dataSection.style.display = "block";
    } else {
        loginSection.style.display = "block";
        dataSection.style.display = "none";
    }
}

// Login & Logout
async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errText = document.getElementById('loginError');
    errText.textContent = "Sedang log masuk...";
    try {
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        checkSession(); 
        errText.textContent = "";
        // Refresh results jika ada carian terpapar supaya butang Edit muncul
        if(searchInput.value.trim()) fetchWord(searchInput.value.trim());
    } catch (err) {
        errText.textContent = "Gagal: " + err.message;
    }
}

async function handleLogout() {
    await _supabase.auth.signOut();
    checkSession();
    resultsDiv.innerHTML = ''; // Clear result untuk keselamatan
}

// Dynamic Rows (Modified untuk terima value)
function addStructRow(k='', a='', s='', f='') {
    const div = document.createElement('div');
    div.className = 'dynamic-row';
    div.innerHTML = `<input placeholder="Komp" class="s-comp" value="${k}"><input placeholder="Arab" class="s-arab arabic-text" value="${a}"><input placeholder="Bunyi" class="s-sound" value="${s}"><input placeholder="Fungsi" class="s-func" value="${f}"><button type="button" onclick="this.parentElement.remove()" style="background:red;color:white;border:none;border-radius:4px;">X</button>`;
    document.getElementById('structContainer').appendChild(div);
}

function addExRow(a='', t='') {
    const div = document.createElement('div');
    div.className = 'dynamic-row';
    div.innerHTML = `<input placeholder="Ayat Arab" class="ex-arab arabic-text" value="${a}"><input placeholder="Terjemahan" class="ex-trans" value="${t}"><button type="button" onclick="this.parentElement.remove()" style="background:red;color:white;border:none;border-radius:4px;">X</button>`;
    document.getElementById('exContainer').appendChild(div);
}

// Handle Submit (INSERT atau UPDATE)
async function submitData() {
    const msg = document.getElementById('statusMsg');
    msg.textContent = "Menyimpan...";
    msg.style.color = "blue";

    // Kumpul Data
    const sRows = document.querySelectorAll('#structContainer .dynamic-row');
    const structData = Array.from(sRows).map(r => ({
        komponen: r.querySelector('.s-comp').value,
        arab: r.querySelector('.s-arab').value,
        sebutan: r.querySelector('.s-sound').value,
        fungsi: r.querySelector('.s-func').value
    }));

    const eRows = document.querySelectorAll('#exContainer .dynamic-row');
    const exData = Array.from(eRows).map(r => ({
        arabic: r.querySelector('.ex-arab').value,
        translation: r.querySelector('.ex-trans').value
    }));

    const detailsJSON = {
        arabic: document.getElementById('newArab').value,
        tag: document.getElementById('newType').value,
        transliteration: document.getElementById('newTrans').value,
        meaning_extended: document.getElementById('newMeaningExt').value,
        grammar_note: document.getElementById('newGrammar').value,
        footer_note: document.getElementById('newFooter').value,
        structure: structData,
        examples: exData
    };

    const payload = {
        word: document.getElementById('newWord').value,
        definition: document.getElementById('newDef').value,
        type: document.getElementById('newType').value,
        details: detailsJSON
    };

    try {
        let error;
        
        if (currentEditId) {
            // MODE UPDATE: Jika ada ID, kita update row tersebut
            const res = await _supabase.from('dictionary').update(payload).eq('id', currentEditId);
            error = res.error;
        } else {
            // MODE INSERT: Jika tiada ID, kita buat baru
            const res = await _supabase.from('dictionary').insert([payload]);
            error = res.error;
        }

        if (error) throw error;
        
        msg.textContent = currentEditId ? "✅ Berjaya dikemaskini!" : "✅ Berjaya ditambah!";
        msg.style.color = "green";
        
        setTimeout(() => { 
            msg.textContent = ""; 
            modal.style.display = "none"; 
            // Refresh carian supaya nampak perubahan
            const key = searchInput.value.trim();
            if(key) fetchWord(key);
        }, 1500);

    } catch (err) {
        msg.textContent = "❌ Error: " + err.message;
        msg.style.color = "red";
    }
}

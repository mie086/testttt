/* =========================================
   1. CONFIGURATION & SETUP
   ========================================= */
const SUPABASE_URL = 'https://yqvqtgsbcyudzzvklysk.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxdnF0Z3NiY3l1ZHp6dmtseXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODM2MzQsImV4cCI6MjA4MzI1OTYzNH0.FXH_1ZzesNjuFvwEvMcjqA2MIqWZRhqUegGUGg8pnWI';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elements
const searchInput = document.getElementById('searchInput');
const resultsDiv = document.getElementById('results');

// State Variables
let debounceTimer;
let currentUser = null;   // Status login
let currentEditId = null; // ID perkataan yang sedang diedit

// Auto Init
window.addEventListener('DOMContentLoaded', () => {
    checkSession();
    if(searchInput) searchInput.focus();
});


/* =========================================
   2. SEARCH LOGIC (AUTOCOMPLETE)
   ========================================= */
const suggestionList = document.getElementById('suggestionList');

searchInput.addEventListener('input', (e) => {
    const keyword = e.target.value.trim();
    clearTimeout(debounceTimer);
    
    if (keyword.length === 0) {
        suggestionList.style.display = 'none';
        searchInput.classList.remove('open');
        resultsDiv.innerHTML = ''; 
        return;
    }
    
    debounceTimer = setTimeout(() => { fetchSuggestions(keyword); }, 300);
});

async function fetchSuggestions(keyword) {
    try {
        const { data, error } = await _supabase
            .from('dictionary')
            .select('*') // Ambil semua supaya bila klik tak perlu fetch lagi
            .ilike('word', `%${keyword}%`) // Cari yang mengandungi keyword
            .limit(10)     // Hadkan senarai dropdown
            .order('word', { ascending: true });

        if (error) throw error;
        renderSuggestions(data);
    } catch (err) {
        console.error(err);
    }
}

function renderSuggestions(data) {
    suggestionList.innerHTML = '';

    if (!data || data.length === 0) {
        suggestionList.style.display = 'none';
        searchInput.classList.remove('open');
        return;
    }

    suggestionList.style.display = 'block';
    searchInput.classList.add('open'); // Tukar bucu input

    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        
        const arabText = item.details?.arabic || ''; 
        
        div.innerHTML = `
            <span>${item.word}</span>
            ${arabText ? `<span class="sugg-arab">${arabText}</span>` : ''}
        `;

        div.onclick = () => {
            selectWord(item);
        };

        suggestionList.appendChild(div);
    });
}

function selectWord(item) {
    // 1. Masukkan perkataan dalam input
    searchInput.value = item.word;
    
    suggestionList.style.display = 'none';
    searchInput.classList.remove('open');
    
    displayResults([item]); 
}

document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !suggestionList.contains(e.target)) {
        suggestionList.style.display = 'none';
        searchInput.classList.remove('open');
    }
});

/* =========================================
   3. DISPLAY LOGIC (PAPARAN)
   ========================================= */
function displayResults(data) {
    resultsDiv.innerHTML = '';
    
    if (!data || data.length === 0) {
        resultsDiv.innerHTML = '<div class="no-result" style="text-align:center; padding:20px;">Tiada hasil dijumpai.</div>';
        return;
    }

    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'word-card';
        card.dataset.json = JSON.stringify(item); // Simpan data untuk butang Edit

        const d = item.details || {};
        const tag = d.tag || item.type || 'Umum';

        // Generate Bahagian-bahagian HTML guna fungsi pembantu
        const adminBtnHTML  = getAdminButtonsHTML(item);
        const structureHTML = getStructureHTML(d.structure);
        const examplesHTML  = getExamplesHTML(d.examples);
        const conclusionHTML= getConclusionHTML(d.conclusion);
        
        // Template Literals (HTML Utama)
        card.innerHTML = `
            ${adminBtnHTML}
            <div class="word-header-row">
                <h1 class="main-word">${item.word}</h1>
                <span class="info-tag">${tag}</span>
            </div>
            <hr class="divider">
            <div class="detail-section">
                
                ${(d.arabic || d.transliteration || d.meaning_extended) ? `
                    <div class="unified-meaning-box">
                        
                        <div class="umb-header">
                            ${d.arabic ? `<span class="arabic-small">${d.arabic}</span>` : ''}
                            ${d.transliteration ? `<i class="latin-text" style="color:#666;">${d.transliteration}</i>` : ''}
                        </div>
            
                        ${d.meaning_extended ? `
                            <div class="umb-body">
                                ${d.meaning_extended}
                            </div>
                        ` : ''}
                        
                    </div>
                ` : ''}

                ${d.grammar_note ? `<p style="background:#fff3e0; padding:10px; border-radius:6px; font-size:0.95em; margin-top:10px;">💡 <b>Info:</b> ${d.grammar_note}</p>` : ''}
                
                ${structureHTML}
                ${examplesHTML}
                ${conclusionHTML}
                
                ${d.footer_note ? `<div class="footer-note" style="margin-top:15px; font-style:italic; border-left:3px solid #ccc; padding-left:10px; color:#666;">${d.footer_note}</div>` : ''}
            </div>
        `;
        resultsDiv.appendChild(card);
    });
}

// --- Display Helpers (Supaya kod utama tak serabut) ---

function getAdminButtonsHTML(item) {
    if (!currentUser) return '';
    // Encode JSON supaya selamat dimasukkan dalam onclick
    const safeItem = JSON.stringify(item).replace(/'/g, "&#39;");
    return `
        <div class="admin-controls" style="float:right; margin-bottom:10px;">
            <button onclick='setupEdit(${safeItem})' style="background:#f39c12; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;">✏️ Edit</button>
            <button onclick="deleteWord(${item.id})" style="background:#c0392b; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️ Padam</button>
        </div>
        <div style="clear:both;"></div>
    `;
}

function getStructureHTML(structure) {
    if (!structure || !Array.isArray(structure) || structure.length === 0) return '';
    
    let rows = structure.map(row => 
        `<tr>
            <td>${row.komponen}</td>
            <td class="arabic-cell">${row.arab}</td>
            <td><i>${row.sebutan}</i></td>
            <td>${row.fungsi}</td>
        </tr>`
    ).join('');

    return `
        <h3>🧩 Struktur & Makna</h3>
        <div class="table-scroll">
            <table class="custom-table">
                <thead>
                    <tr>
                        <th>Komponen</th>
                        <th>Arab</th>
                        <th>Sebutan</th>
                        <th>Fungsi/Makna</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

function getExamplesHTML(examples) {
    if (!examples || !Array.isArray(examples) || examples.length === 0) return '';
    
    let list = examples.map((ex, idx) => 
        `<div class="example-item">
            <span class="ex-number">${idx + 1}.</span>
            <div class="ex-content">
                <p class="ex-arabic">${ex.arabic}</p>
                <p class="ex-translation">${ex.translation}</p>
            </div>
        </div>`
    ).join('');

    return `<h3>💬 Contoh Ayat Harian</h3><div class="example-list">${list}</div>`;
}

function getConclusionHTML(conclusion) {
    if (!conclusion) return '';
    
    let tableRows = '';
    if (conclusion.table && Array.isArray(conclusion.table)) {
        tableRows = conclusion.table.map(r => 
            `<tr>
                <td>${r.konteks}</td>
                <td class="arabic-cell">${r.arab}</td>
                <td><i>${r.sebutan}</i></td>
                <td>${r.terjemahan}</td>
            </tr>`
        ).join('');
    }

    return `
        <h3>💡 Info Tambahan & Kesimpulan</h3>
        
        ${conclusion.intro ? `<p style="margin-bottom:15px; color:#5f6368;">${conclusion.intro}</p>` : ''}
        
        ${tableRows ? `
            <div class="table-scroll">
                <table class="custom-table">
                    <thead>
                        <tr>
                            <th>Konteks</th>
                            <th>Arab</th>
                            <th>Sebutan</th>
                            <th>Catatan/Makna</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
        ` : ''}
    `;
}

/* =========================================
   4. ADMIN MODAL & AUTH LOGIC
   ========================================= */
const modal = document.getElementById("adminModal");
const btn = document.getElementById("adminBtn");
const span = document.querySelector(".close-btn");
const loginSection = document.getElementById("loginSection");
const dataSection = document.getElementById("dataSection");

// Event Listeners Modal
btn.onclick = () => {
    resetForm();
    modal.style.display = "block";
    checkSession();
};
span.onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };

// Auth Functions
async function checkSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    currentUser = session;
    
    if (session) {
        loginSection.style.display = "none";
        dataSection.style.display = "block";
    } else {
        loginSection.style.display = "block";
        dataSection.style.display = "none";
    }
}

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
        // Refresh carian kalau ada
        if(searchInput.value.trim()) fetchWord(searchInput.value.trim());
    } catch (err) {
        errText.textContent = "Gagal: " + err.message;
    }
}

async function handleLogout() {
    await _supabase.auth.signOut();
    checkSession();
    resultsDiv.innerHTML = '';
}


/* =========================================
   5. CRUD OPERATIONS (CREATE, UPDATE, DELETE)
   ========================================= */

// --- A. Setup Form untuk Edit ---
function setupEdit(item) {
    currentEditId = item.id;
    modal.style.display = "block";
    checkSession();

    // UI Updates
    const titleEl = document.querySelector("#dataSection h2");
    if(titleEl) titleEl.innerText = `Edit: ${item.word}`;
    
    // Populate Fields
    document.getElementById('newWord').value = item.word;
    // [BARIS 'newDef' TELAH DIBUANG DI SINI] 
    document.getElementById('newType').value = item.type || (item.details?.tag || '');

    const d = item.details || {};
    document.getElementById('newArab').value = d.arabic || '';
    document.getElementById('newTrans').value = d.transliteration || '';
    document.getElementById('newMeaningExt').value = d.meaning_extended || '';
    document.getElementById('newGrammar').value = d.grammar_note || '';

    // Populate Dynamic Tables (Struktur, Contoh, Conclusion...)
    document.getElementById('structContainer').innerHTML = '';
    if (d.structure) d.structure.forEach(r => addStructRow(r.komponen, r.arab, r.sebutan, r.fungsi));

    document.getElementById('exContainer').innerHTML = '';
    if (d.examples) d.examples.forEach(e => addExRow(e.arabic, e.translation));

    document.getElementById('concContainer').innerHTML = '';
    const c = d.conclusion || {};
    document.getElementById('newConcIntro').value = c.intro || '';
    if (c.table) c.table.forEach(r => addConcRow(r.konteks, r.arab, r.sebutan, r.terjemahan));
}

// --- B. Reset Form ---
function resetForm() {
    currentEditId = null;
    document.querySelectorAll('#dataSection input, #dataSection textarea').forEach(i => i.value = '');
    document.getElementById('structContainer').innerHTML = '';
    document.getElementById('exContainer').innerHTML = '';
    document.getElementById('concContainer').innerHTML = ''; // Reset container baru
    
    const titleEl = document.querySelector("#dataSection h2");
    if(titleEl) titleEl.innerText = "Tambah Perkataan Baru";
}

// --- C. Submit Data (Insert/Update) ---
async function submitData() {
    const wordInput = document.getElementById('newWord');
    const wordValue = wordInput.value.trim();
    const msg = document.getElementById('statusMsg');

    // 1. Validasi Asas: Pastikan tak kosong
    if (!wordValue) {
        alert("Sila masukkan Perkataan Utama!");
        wordInput.focus();
        return;
    }

    msg.textContent = "Sedang memeriksa...";
    msg.style.color = "blue";

    // 2. KOD BARU: CHECK DUPLICATE (HALANG PERKATAAN SAMA)
    try {
        // Cari dalam database jika ada perkataan yang sama (tak kira huruf besar/kecil)
        let query = _supabase
            .from('dictionary')
            .select('id')
            .ilike('word', wordValue);

        if (currentEditId) {
            query = query.neq('id', currentEditId);
        }

        const { data: duplicates, error: checkError } = await query;

        if (checkError) throw checkError;

        if (duplicates && duplicates.length > 0) {
            alert(`⚠️ PERHATIAN:\n\nPerkataan "${wordValue}" sudah wujud dalam kamus!\nSila gunakan perkataan lain atau edit perkataan sedia ada.`);
            
            wordInput.style.border = "2px solid red";
            wordInput.style.background = "#fff0f0";
            wordInput.focus();
            
            msg.textContent = ""; // Padam status loading
            return; // BERHENTI DI SINI (Jangan simpan)
        }

        wordInput.style.border = "1px solid #dadce0";
        wordInput.style.background = "#fff";

    } catch (err) {
        console.error("Ralat check duplicate:", err);
        msg.textContent = "Ralat sistem. Cuba lagi.";
        return;
    }

    msg.textContent = "Menyimpan...";

    const structData = Array.from(document.querySelectorAll('#structContainer .dynamic-row')).map(r => ({
        komponen: r.querySelector('.s-comp').value,
        arab: r.querySelector('.s-arab').value,
        sebutan: r.querySelector('.s-sound').value,
        fungsi: r.querySelector('.s-func').value
    }));

    const exData = Array.from(document.querySelectorAll('#exContainer .dynamic-row')).map(r => ({
        arabic: r.querySelector('.ex-arab').value,
        translation: r.querySelector('.ex-trans').value
    }));

    const concData = Array.from(document.querySelectorAll('#concContainer .dynamic-row')).map(r => ({
        konteks: r.querySelector('.c-context').value,
        arab: r.querySelector('.c-arab').value,
        sebutan: r.querySelector('.c-sound').value,
        terjemahan: r.querySelector('.c-trans').value
    }));

    const detailsJSON = {
        arabic: document.getElementById('newArab').value,
        tag: document.getElementById('newType').value,
        transliteration: document.getElementById('newTrans').value,
        meaning_extended: document.getElementById('newMeaningExt').value,
        grammar_note: document.getElementById('newGrammar').value,
        
        footer_note: "", 

        structure: structData,
        examples: exData,
        conclusion: { 
            intro: document.getElementById('newConcIntro').value,
            table: concData
        }
    };

    const payload = {
        word: wordValue, // Guna nilai yang dah dibersihkan
        definition: "-", 
        type: document.getElementById('newType').value,
        details: detailsJSON
    };

    try {
        let error;
        if (currentEditId) {
            const res = await _supabase.from('dictionary').update(payload).eq('id', currentEditId);
            error = res.error;
        } else {
            const res = await _supabase.from('dictionary').insert([payload]);
            error = res.error;
        }

        if (error) throw error;
        
        msg.textContent = currentEditId ? "✅ Berjaya dikemaskini!" : "✅ Berjaya ditambah!";
        msg.style.color = "green";
        
        wordInput.style.border = "1px solid #dadce0";
        wordInput.style.background = "#fff";
        
        setTimeout(() => { 
            msg.textContent = ""; 
            modal.style.display = "none"; 
            const key = searchInput.value.trim();
            if(key) fetchWord(key); // Refresh hasil carian
        }, 1500);

    } catch (err) {
        msg.textContent = "❌ Error: " + err.message;
        msg.style.color = "red";
    }
}

// --- D. Delete Data ---
async function deleteWord(id) {
    if(!confirm("Anda pasti mahu memadam perkataan ini?")) return;
    try {
        const { error } = await _supabase.from('dictionary').delete().eq('id', id);
        if (error) throw error;
        alert("Berjaya dipadam!");
        const currentKeyword = searchInput.value.trim();
        if(currentKeyword) fetchWord(currentKeyword);
    } catch (err) {
        alert("Gagal padam: " + err.message);
    }
}


/* =========================================
   6. DYNAMIC ROWS FUNCTIONS
   ========================================= */

function addStructRow(k='', a='', s='', f='') {
    createRow('structContainer', `
        <input placeholder="Komp" class="s-comp" value="${k}">
        <input placeholder="Arab" class="s-arab arabic-text" value="${a}">
        <input placeholder="Bunyi" class="s-sound" value="${s}">
        <input placeholder="Fungsi" class="s-func" value="${f}">
    `);
}

function addExRow(a='', t='') {
    createRow('exContainer', `
        <input placeholder="Ayat Arab" class="ex-arab arabic-text" value="${a}">
        <input placeholder="Catatan/Makna" class="ex-trans" value="${t}">
    `);
}

function addConcRow(k='', a='', s='', t='') {
    createRow('concContainer', `
        <input placeholder="Konteks" class="c-context" value="${k}">
        <input placeholder="Arab" class="c-arab arabic-text" value="${a}">
        <input placeholder="Sebutan" class="c-sound" value="${s}">
        <input placeholder="Catatan/Makna" class="c-trans" value="${t}">
    `);
}

// Helper untuk elak tulis kod berulang
function createRow(containerId, innerHTML) {
    const div = document.createElement('div');
    div.className = 'dynamic-row';
    div.innerHTML = innerHTML + `<button type="button" onclick="this.parentElement.remove()" style="background:red;color:white;border:none;border-radius:4px; margin-left:5px;">X</button>`;
    
    const container = document.getElementById(containerId);
    if (container) container.appendChild(div);
}

// --- FUNGSI EDITOR TOOLS ---
function insertTag(elementId, startTag, endTag) {
    const field = document.getElementById(elementId);
    if (!field) return;

    const start = field.selectionStart;
    const end = field.selectionEnd;
    
    const text = field.value;
    const selectedText = text.substring(start, end);
    
    const replacement = startTag + selectedText + endTag;
    
    field.value = text.substring(0, start) + replacement + text.substring(end);
    
    field.focus();
    field.selectionEnd = start + startTag.length + selectedText.length + endTag.length;
}

/* --- FUNGSI AUTO CAPITALIZE --- */
function autoTitleCase(input) {
    const start = input.selectionStart;
    
    input.value = input.value.replace(/\b\w/g, function(char) { 
        return char.toUpperCase(); 
    });

    input.selectionStart = input.selectionEnd = start;
}

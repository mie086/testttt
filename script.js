// --- CONFIGURATION ---
const SUPABASE_URL = 'https://yqvqtgsbcyudzzvklysk.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxdnF0Z3NiY3l1ZHp6dmtseXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODM2MzQsImV4cCI6MjA4MzI1OTYzNH0.FXH_1ZzesNjuFvwEvMcjqA2MIqWZRhqUegGUGg8pnWI';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elements
const searchInput = document.getElementById('searchInput');
const resultsDiv = document.getElementById('results');
let debounceTimer;

// --- BAHAGIAN 1: CARIAN (Search Logic) ---

searchInput.addEventListener('input', (e) => {
    const keyword = e.target.value.trim();
    clearTimeout(debounceTimer);
    if (keyword.length === 0) {
        resultsDiv.innerHTML = '<div class="no-result">Mula menaip untuk mencari...</div>';
        return;
    }
    debounceTimer = setTimeout(() => { fetchWord(keyword); }, 300);
});

// Auto focus bila page load
window.addEventListener('DOMContentLoaded', () => {
    searchInput.focus();
});

async function fetchWord(keyword) {
    resultsDiv.innerHTML = '<div class="loading">Sedang mencari...</div>';
    try {
        const { data, error } = await _supabase
            .from('dictionary').select('*')
            .ilike('word', `${keyword}%`).limit(5);
        
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
        resultsDiv.innerHTML = '<div class="no-result">Tiada hasil dijumpai.</div>';
        return;
    }

    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'word-card';
        const details = item.details || {};
        const arabicText = details.arabic || ''; 
        const tag = details.tag || item.type || 'Umum';

        // Table Rows
        let tableRows = '';
        if (details.structure && Array.isArray(details.structure)) {
            details.structure.forEach(row => {
                tableRows += `<tr><td>${row.komponen}</td><td class="arabic-cell">${row.arab}</td><td><i>${row.sebutan}</i></td><td>${row.fungsi}</td></tr>`;
            });
        }

        // Example List
        let examplesHTML = '';
        if (details.examples && Array.isArray(details.examples)) {
            examplesHTML += '<h3 class="section-title" style="margin-top:40px;">2. Contoh Ayat Harian</h3><div class="example-list">';
            details.examples.forEach((ex, index) => {
                examplesHTML += `<div class="example-item"><span class="ex-number">${index + 1}.</span><div class="ex-content"><p class="ex-arabic">${ex.arabic}</p><p class="ex-translation">${ex.translation}</p></div></div>`;
            });
            examplesHTML += '</div>';
        }

        card.innerHTML = `
            <div class="word-header-row"><h1 class="main-word">${item.word}</h1><span class="info-tag">${tag}</span></div>
            <hr class="divider">
            <div class="detail-section">
                ${details.transliteration ? `<div class="transliteration-box"><span class="green-dot"></span><span class="arabic-small">${arabicText}</span><br><i class="latin-text">${details.transliteration}</i></div>` : ''}
                ${details.meaning_extended ? `<p>${details.meaning_extended}</p>` : ''}
                ${details.grammar_note ? `<p>${details.grammar_note}</p>` : ''}
                ${tableRows ? `<h3>1. Struktur & Makna</h3><table class="custom-table"><thead><tr><th>Komponen</th><th>Arab</th><th>Sebutan</th><th>Fungsi/Makna</th></tr></thead><tbody>${tableRows}</tbody></table>` : ''}
                ${details.footer_note ? `<div class="footer-note" style="margin-top:10px; font-style:italic; border-left:3px solid #ccc; padding-left:10px;">${details.footer_note}</div>` : ''}
                ${examplesHTML}
            </div>
        `;
        resultsDiv.appendChild(card);
    });
}


// --- BAHAGIAN 2: ADMIN POP-UP (Modal Logic) ---

const modal = document.getElementById("adminModal");
const btn = document.getElementById("adminBtn");
const span = document.getElementsByClassName("close-btn")[0];
const loginSection = document.getElementById("loginSection");
const dataSection = document.getElementById("dataSection");

// Buka Modal
btn.onclick = function() {
    modal.style.display = "block";
    checkSession(); // Check kalau user dah login
}

// Tutup Modal
span.onclick = function() { modal.style.display = "none"; }
window.onclick = function(event) { if (event.target == modal) { modal.style.display = "none"; } }

// Check Session Supabase
async function checkSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
        loginSection.style.display = "none";
        dataSection.style.display = "block";
    } else {
        loginSection.style.display = "block";
        dataSection.style.display = "none";
    }
}

// Handle Login
async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errText = document.getElementById('loginError');
    
    try {
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        checkSession(); // Refresh view
    } catch (err) {
        errText.textContent = "Login Gagal: " + err.message;
    }
}

// Handle Logout
async function handleLogout() {
    await _supabase.auth.signOut();
    checkSession();
}

// Fungsi Tambah Baris Form (Dynamic Inputs)
function addStructRow() {
    const div = document.createElement('div');
    div.className = 'dynamic-row';
    div.innerHTML = `<input placeholder="Komponen" class="s-comp"><input placeholder="Arab" class="s-arab arabic-text"><input placeholder="Sebutan" class="s-sound"><input placeholder="Fungsi" class="s-func"><button type="button" onclick="this.parentElement.remove()" style="background:red;color:white;border:none;">X</button>`;
    document.getElementById('structContainer').appendChild(div);
}

function addExRow() {
    const div = document.createElement('div');
    div.className = 'dynamic-row';
    div.innerHTML = `<input placeholder="Ayat Arab" class="ex-arab arabic-text"><input placeholder="Terjemahan" class="ex-trans"><button type="button" onclick="this.parentElement.remove()" style="background:red;color:white;border:none;">X</button>`;
    document.getElementById('exContainer').appendChild(div);
}

// Handle Submit Data
async function submitData() {
    const msg = document.getElementById('statusMsg');
    msg.textContent = "Menyimpan...";
    
    // 1. Kumpul Data Struktur
    const sRows = document.querySelectorAll('#structContainer .dynamic-row');
    const structData = Array.from(sRows).map(r => ({
        komponen: r.querySelector('.s-comp').value,
        arab: r.querySelector('.s-arab').value,
        sebutan: r.querySelector('.s-sound').value,
        fungsi: r.querySelector('.s-func').value
    }));

    // 2. Kumpul Data Contoh
    const eRows = document.querySelectorAll('#exContainer .dynamic-row');
    const exData = Array.from(eRows).map(r => ({
        arabic: r.querySelector('.ex-arab').value,
        translation: r.querySelector('.ex-trans').value
    }));

    // 3. Bina Object JSON
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
        const { error } = await _supabase.from('dictionary').insert([payload]);
        if (error) throw error;
        msg.textContent = "✅ Berjaya!";
        setTimeout(() => { msg.textContent = ""; modal.style.display = "none"; }, 1500);
    } catch (err) {
        msg.textContent = "❌ Error: " + err.message;
    }
}

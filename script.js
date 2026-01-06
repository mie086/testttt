// --- CONFIGURATION ---
const SUPABASE_URL = 'https://yqvqtgsbcyudzzvklysk.supabase.co'; // GANTI DENGAN URL ANDA
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxdnF0Z3NiY3l1ZHp6dmtseXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODM2MzQsImV4cCI6MjA4MzI1OTYzNH0.FXH_1ZzesNjuFvwEvMcjqA2MIqWZRhqUegGUGg8pnWI'; // GANTI DENGAN ANON KEY ANDA

// Initialize Supabase client
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elements
const searchInput = document.getElementById('searchInput');
const resultsDiv = document.getElementById('results');
let debounceTimer;

// --- EVENT LISTENERS ---
searchInput.addEventListener('input', (e) => {
    const keyword = e.target.value.trim();

    // Clear timer lama (Debouncing)
    clearTimeout(debounceTimer);

    if (keyword.length === 0) {
        resultsDiv.innerHTML = '<div class="no-result">Mula menaip untuk mencari...</div>';
        return;
    }

    // Tunggu 300ms baru cari
    debounceTimer = setTimeout(() => {
        fetchWord(keyword);
    }, 300);
});

// --- FUNCTIONS ---
async function fetchWord(keyword) {
    resultsDiv.innerHTML = '<div class="loading">Sedang mencari...</div>';

    try {
        // Pastikan nama table di Supabase ialah 'dictionary'
        const { data, error } = await _supabase
            .from('dictionary') 
            .select('*')
            .ilike('word', `${keyword}%`) // Cari perkataan yang bermula dengan keyword
            .limit(5);

        if (error) throw error;

        displayResults(data);

    } catch (err) {
        console.error('Error fetching data:', err);
        resultsDiv.innerHTML = '<div class="no-result">Ralat sambungan database.</div>';
    }
}

function displayResults(data) {
    resultsDiv.innerHTML = ''; // Kosongkan container

    if (!data || data.length === 0) {
        resultsDiv.innerHTML = '<div class="no-result">Tiada hasil dijumpai.</div>';
        return;
    }

    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'word-card';
        
        // Handle data kosong
        const type = item.type ? item.type : 'Umum';
        const example = item.example ? `"${item.example}"` : '';

        card.innerHTML = `
            <div class="word-header">
                <h3 class="word-title">${item.word}</h3>
                <span class="word-type">${type}</span>
            </div>
            <p class="definition">${item.definition}</p>
            ${example ? `<p class="example">Contoh: ${example}</p>` : ''}
        `;
        
        resultsDiv.appendChild(card);
    });
}

// Estado da aplicação
let allSongs = [];
let selectedSongs = [];

// Elementos do DOM
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const songList = document.getElementById('songList');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadSongs();
    setupEventListeners();
    updateSelectedList();
});

// Carregar dados do JSON
async function loadSongs() {
    try {
        const response = await fetch('coletanea_igrejas.json');
        
        if (!response.ok) {
            throw new Error(`Erro ao carregar o arquivo: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Ignorar o primeiro objeto (cabeçalho) e filtrar apenas louvores válidos
        allSongs = data.slice(1).filter(song => song.numero && song.titulo);
        
        console.log(`${allSongs.length} louvores carregados com sucesso!`);
        
    } catch (error) {
        console.error('Erro ao carregar louvores:', error);
        showError('Erro ao carregar a coletânea de louvores. Verifique se o arquivo está disponível.');
    }
}

// Configurar event listeners
function setupEventListeners() {
    searchInput.addEventListener('input', handleSearch);
}

// Tratar busca
function handleSearch(event) {
    const searchTerm = event.target.value.trim().toLowerCase();
    
    if (searchTerm === '') {
        searchResults.innerHTML = '';
        return;
    }
    
    // Filtrar louvores
    const results = allSongs.filter(song => {
        const numero = song.numero.toLowerCase();
        const titulo = song.titulo.toLowerCase();
        return numero.includes(searchTerm) || titulo.includes(searchTerm);
    });
    
    displaySearchResults(results);
}

// Exibir resultados da busca
function displaySearchResults(results) {
    searchResults.innerHTML = '';
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="empty-message">Nenhum louvor encontrado</div>';
        return;
    }
    
    // Limitar a 50 resultados para melhor performance
    const limitedResults = results.slice(0, 50);
    
    limitedResults.forEach(song => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        resultItem.innerHTML = `
            <span class="song-number">${song.numero}</span>
            <span class="song-title">${song.titulo}</span>
        `;
        
        resultItem.addEventListener('click', () => addSongToList(song));
        searchResults.appendChild(resultItem);
    });
    
    if (results.length > 50) {
        const moreMessage = document.createElement('div');
        moreMessage.className = 'empty-message';
        moreMessage.textContent = `Mostrando 50 de ${results.length} resultados. Refine sua busca.`;
        searchResults.appendChild(moreMessage);
    }
}

// Adicionar louvor à lista
function addSongToList(songData) {
    // Verificar se já está na lista (evitar duplicatas)
    const isDuplicate = selectedSongs.some(song => song.numero === songData.numero);
    
    if (isDuplicate) {
        alert('Este louvor já está na lista!');
        return;
    }
    
    // Adicionar à lista
    selectedSongs.push(songData);
    
    // Atualizar exibição
    updateSelectedList();
    
    // Limpar busca
    searchInput.value = '';
    searchResults.innerHTML = '';
}

// Atualizar lista selecionada
function updateSelectedList() {
    songList.innerHTML = '';
    
    if (selectedSongs.length === 0) {
        songList.innerHTML = '<div class="empty-message">Nenhum louvor selecionado</div>';
        return;
    }
    
    selectedSongs.forEach((song, index) => {
        const listItem = document.createElement('li');
        
        listItem.innerHTML = `
            <div class="song-info">
                <span class="song-number">${song.numero}</span>
                <span class="song-title">${song.titulo}</span>
            </div>
            <button class="remove-btn" data-index="${index}">Remover</button>
        `;
        
        // Event listener para o botão remover
        const removeBtn = listItem.querySelector('.remove-btn');
        removeBtn.addEventListener('click', () => removeSongFromList(index));
        
        songList.appendChild(listItem);
    });
}

// Remover louvor da lista
function removeSongFromList(index) {
    selectedSongs.splice(index, 1);
    updateSelectedList();
}

// Mostrar mensagem de erro
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(errorDiv, container.firstChild);
}

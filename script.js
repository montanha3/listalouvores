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

// Carregar dados dos JSONs
async function loadSongs() {
    try {
        // Carregar os três arquivos em paralelo
        const [igrejaResponse, criancasResponse, avulsosResponse] = await Promise.all([
            fetch('coletanea_igrejas.json'),
            fetch('coletanea_criancas.json'),
            fetch('louvores_avulsos.json')
        ]);
        
        // Verificar se todos os arquivos foram carregados com sucesso
        if (!igrejaResponse.ok) {
            throw new Error(`Erro ao carregar coletanea_igrejas.json: ${igrejaResponse.status}`);
        }
        if (!criancasResponse.ok) {
            throw new Error(`Erro ao carregar coletanea_criancas.json: ${criancasResponse.status}`);
        }
        if (!avulsosResponse.ok) {
            throw new Error(`Erro ao carregar louvores_avulsos.json: ${avulsosResponse.status}`);
        }
        
        // Converter para JSON
        const igrejaData = await igrejaResponse.json();
        const criancasData = await criancasResponse.json();
        const avulsosData = await avulsosResponse.json();
        
        // Processar coletânea da Igreja (ignorar primeiro item - cabeçalho)
        const igrejaSongs = igrejaData.slice(1)
            .filter(song => song.numero && song.titulo)
            .map(song => ({ ...song, origem: 'Igreja' }));
        
        // Processar coletânea de Crianças (ignorar primeiro item - cabeçalho)
        const criancasSongs = criancasData.slice(1)
            .filter(song => song.numero && song.titulo)
            .map(song => ({ ...song, origem: 'CIAS' }));
        
        // Processar louvores avulsos (ignorar primeiro item - cabeçalho)
        const avulsosSongs = avulsosData.slice(1)
            .filter(song => song.numero && song.titulo)
            .map(song => ({ ...song, origem: 'Avulsos' }));
        
        // Combinar todos os louvores
        allSongs = [...igrejaSongs, ...criancasSongs, ...avulsosSongs];
        
        console.log(`Louvores carregados com sucesso!`);
        console.log(`- Igreja: ${igrejaSongs.length} louvores`);
        console.log(`- CIAS: ${criancasSongs.length} louvores`);
        console.log(`- Avulsos: ${avulsosSongs.length} louvores`);
        console.log(`- Total: ${allSongs.length} louvores`);
        
    } catch (error) {
        console.error('Erro ao carregar louvores:', error);
        showError('Erro ao carregar as coletâneas de louvores. Verifique se os arquivos estão disponíveis.');
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
    
    // Obter fonte selecionada
    const selectedSource = document.querySelector('input[name="source"]:checked').value;
    
    // Filtrar louvores por termo de busca
    let results = allSongs.filter(song => {
        const numero = song.numero.toLowerCase();
        const titulo = song.titulo.toLowerCase();
        return numero.includes(searchTerm) || titulo.includes(searchTerm);
    });
    
    // Filtrar por origem se não for "Todas"
    if (selectedSource !== 'Todas') {
        results = results.filter(song => song.origem === selectedSource);
    }
    
    displaySearchResults(results, selectedSource);
}

// Exibir resultados da busca
function displaySearchResults(results, selectedSource) {
    searchResults.innerHTML = '';
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="empty-message">Nenhum louvor encontrado</div>';
        return;
    }
    
    // Limitar a 50 resultados para melhor performance
    const limitedResults = results.slice(0, 50);
    
    // Mostrar origem quando "Todas" estiver selecionado
    const showOrigin = selectedSource === 'Todas';
    
    limitedResults.forEach(song => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        
        if (showOrigin) {
            resultItem.innerHTML = `
                <span class="song-number">${song.numero}</span>
                <span class="song-origin">(${song.origem})</span>
                <span class="song-title"> - ${song.titulo}</span>
            `;
        } else {
            resultItem.innerHTML = `
                <span class="song-number">${song.numero}</span>
                <span class="song-title">${song.titulo}</span>
            `;
        }
        
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

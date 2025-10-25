// Estado da aplicação
let allSongs = [];
let selectedSongs = [];

// Elementos do DOM
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const songList = document.getElementById('songList');
const songCounter = document.getElementById('songCounter');
const listDate = document.getElementById('listDate');
const clearListBtn = document.getElementById('clearListBtn');
const exportSection = document.getElementById('exportSection');
const exportImageBtn = document.getElementById('exportImageBtn');
const exportTextBtn = document.getElementById('exportTextBtn');
const exportLyricsBtn = document.getElementById('exportLyricsBtn');
const saveListBtn = document.getElementById('saveListBtn');
const listNameInput = document.getElementById('listNameInput');
const savedListsContainer = document.getElementById('savedListsContainer');

// Modals
const imageModal = document.getElementById('imageModal');
const lyricsModal = document.getElementById('lyricsModal');
const listCanvas = document.getElementById('listCanvas');
const downloadImageBtn = document.getElementById('downloadImageBtn');
const shareImageBtn = document.getElementById('shareImageBtn');
const lyricsListContainer = document.getElementById('lyricsListContainer');

// Drag and drop
let draggedElement = null;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadSongs();
    setupEventListeners();
    setTodayDate();
    updateSelectedList();
    loadSavedLists();
});

// Definir data de hoje
function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    listDate.value = today;
}

// Carregar dados dos JSONs
async function loadSongs() {
    try {
        const [igrejaResponse, criancasResponse, avulsosResponse] = await Promise.all([
            fetch('coletanea_igrejas.json'),
            fetch('coletanea_criancas.json'),
            fetch('louvores_avulsos.json')
        ]);
        
        if (!igrejaResponse.ok || !criancasResponse.ok || !avulsosResponse.ok) {
            throw new Error('Erro ao carregar arquivos JSON');
        }
        
        const igrejaData = await igrejaResponse.json();
        const criancasData = await criancasResponse.json();
        const avulsosData = await avulsosResponse.json();
        
        const igrejaSongs = igrejaData.slice(1)
            .filter(song => song.numero && song.titulo)
            .map(song => ({ ...song, origem: 'Igreja' }));
        
        const criancasSongs = criancasData.slice(1)
            .filter(song => song.numero && song.titulo)
            .map(song => ({ ...song, origem: 'CIAS' }));
        
        const avulsosSongs = avulsosData.slice(1)
            .filter(song => song.numero && song.titulo)
            .map(song => ({ ...song, origem: 'Avulsos' }));
        
        allSongs = [...igrejaSongs, ...criancasSongs, ...avulsosSongs];
        
        console.log(`Total: ${allSongs.length} louvores carregados`);
        
    } catch (error) {
        console.error('Erro ao carregar louvores:', error);
        showToast('Erro ao carregar as coletâneas de louvores', 'error');
    }
}

// Configurar event listeners
function setupEventListeners() {
    searchInput.addEventListener('input', handleSearch);
    clearListBtn.addEventListener('click', clearList);
    
    // Export listeners
    document.querySelectorAll('input[name="exportType"]').forEach(radio => {
        radio.addEventListener('change', handleExportTypeChange);
    });
    
    exportImageBtn.addEventListener('click', generateImage);
    exportTextBtn.addEventListener('click', copyTextToClipboard);
    exportLyricsBtn.addEventListener('click', showLyricsModal);
    
    // Save/Load lists
    saveListBtn.addEventListener('click', saveList);
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            imageModal.classList.remove('show');
            lyricsModal.classList.remove('show');
        });
    });
    
    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === imageModal) {
            imageModal.classList.remove('show');
        }
        if (e.target === lyricsModal) {
            lyricsModal.classList.remove('show');
        }
    });
    
    downloadImageBtn.addEventListener('click', downloadImage);
    shareImageBtn.addEventListener('click', shareOnWhatsApp);
}

// Tratar mudança no tipo de exportação
function handleExportTypeChange(e) {
    if (e.target.value === 'lyrics') {
        exportLyricsBtn.style.display = 'inline-flex';
    } else {
        exportLyricsBtn.style.display = 'none';
    }
}

// Tratar busca
function handleSearch(event) {
    const searchTerm = event.target.value.trim().toLowerCase();
    
    if (searchTerm === '') {
        searchResults.innerHTML = '';
        return;
    }
    
    const selectedSource = document.querySelector('input[name="source"]:checked').value;
    
    let results = allSongs.filter(song => {
        const numero = song.numero.toLowerCase();
        const titulo = song.titulo.toLowerCase();
        return numero.includes(searchTerm) || titulo.includes(searchTerm);
    });
    
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
    
    const limitedResults = results.slice(0, 50);
    const showOrigin = selectedSource === 'Todas';
    
    limitedResults.forEach(song => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        
        const displayNumber = song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero;
        
        if (showOrigin) {
            resultItem.innerHTML = `
                <span class="song-number">${displayNumber}</span>
                <span class="song-origin">(${song.origem})</span>
                <span class="song-title">${song.titulo}</span>
            `;
        } else {
            resultItem.innerHTML = `
                <span class="song-number">${displayNumber}</span>
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
    // Verificar duplicatas considerando origem
    const uniqueId = `${songData.origem}-${songData.numero}`;
    const isDuplicate = selectedSongs.some(song => 
        `${song.origem}-${song.numero}` === uniqueId
    );
    
    if (isDuplicate) {
        showToast('Este louvor já está na lista!', 'warning');
        return;
    }
    
    selectedSongs.push(songData);
    updateSelectedList();
    
    searchInput.value = '';
    searchResults.innerHTML = '';
    
    showToast('Louvor adicionado!', 'success');
}

// Atualizar lista selecionada
function updateSelectedList() {
    songList.innerHTML = '';
    songCounter.textContent = `${selectedSongs.length} ${selectedSongs.length === 1 ? 'louvor' : 'louvores'}`;
    
    if (selectedSongs.length === 0) {
        songList.innerHTML = '<div class="empty-message">Nenhum louvor selecionado<br>Busque e clique para adicionar</div>';
        exportSection.style.display = 'none';
        return;
    }
    
    exportSection.style.display = 'block';
    
    selectedSongs.forEach((song, index) => {
        const listItem = document.createElement('li');
        listItem.draggable = true;
        listItem.dataset.index = index;
        
        const displayNumber = song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero;
        
        listItem.innerHTML = `
            <div class="song-info">
                <span class="song-number">${displayNumber}</span>
                <span class="song-title">${song.titulo}</span>
            </div>
            <div class="list-actions">
                <button class="btn btn-danger btn-small" data-index="${index}">🗑️</button>
            </div>
        `;
        
        // Drag and drop events
        listItem.addEventListener('dragstart', handleDragStart);
        listItem.addEventListener('dragend', handleDragEnd);
        listItem.addEventListener('dragover', handleDragOver);
        listItem.addEventListener('drop', handleDrop);
        
        const removeBtn = listItem.querySelector('.btn-danger');
        removeBtn.addEventListener('click', () => removeSongFromList(index));
        
        songList.appendChild(listItem);
    });
}

// Drag and drop handlers
function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (draggedElement !== this) {
        const draggedIndex = parseInt(draggedElement.dataset.index);
        const targetIndex = parseInt(this.dataset.index);
        
        const temp = selectedSongs[draggedIndex];
        selectedSongs.splice(draggedIndex, 1);
        selectedSongs.splice(targetIndex, 0, temp);
        
        updateSelectedList();
    }
    
    return false;
}

// Remover louvor da lista
function removeSongFromList(index) {
    selectedSongs.splice(index, 1);
    updateSelectedList();
    showToast('Louvor removido', 'info');
}

// Limpar toda a lista
function clearList() {
    if (selectedSongs.length === 0) return;
    
    if (confirm('Deseja realmente limpar toda a lista?')) {
        selectedSongs = [];
        updateSelectedList();
        showToast('Lista limpa', 'info');
    }
}

// Gerar imagem da lista
function generateImage() {
    const canvas = listCanvas;
    const ctx = canvas.getContext('2d');
    
    // Configurações
    const width = 800;
    const lineHeight = 50;
    const headerHeight = 120;
    const footerHeight = 40;
    const contentHeight = selectedSongs.length * lineHeight;
    const height = headerHeight + contentHeight + footerHeight + 40;
    
    canvas.width = width;
    canvas.height = height;
    
    // Fundo branco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Borda
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, width, height);
    
    // Cabeçalho
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('LOUVORES', 30, 50);
    
    // Data
    const formattedDate = formatDateForDisplay(listDate.value);
    ctx.textAlign = 'right';
    ctx.fillText(`Data: ${formattedDate}`, width - 30, 50);
    
    // Linha horizontal após cabeçalho
    ctx.beginPath();
    ctx.moveTo(0, 80);
    ctx.lineTo(width, 80);
    ctx.stroke();
    
    // Cabeçalho da tabela
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(0, 80, width, 40);
    
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Nº', 100, 108);
    ctx.fillText('Nome do Hino', width / 2, 108);
    
    // Linhas verticais do cabeçalho
    ctx.beginPath();
    ctx.moveTo(180, 80);
    ctx.lineTo(180, 120);
    ctx.stroke();
    
    // Linha horizontal após cabeçalho da tabela
    ctx.beginPath();
    ctx.moveTo(0, 120);
    ctx.lineTo(width, 120);
    ctx.stroke();
    
    // Conteúdo
    ctx.font = '18px Arial';
    selectedSongs.forEach((song, index) => {
        const y = 120 + (index * lineHeight);
        
        // Linhas horizontais
        if (index > 0) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Linha vertical
        ctx.beginPath();
        ctx.moveTo(180, y);
        ctx.lineTo(180, y + lineHeight);
        ctx.stroke();
        
        // Número
        const displayNumber = song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero;
        ctx.textAlign = 'center';
        ctx.fillText(displayNumber, 90, y + 32);
        
        // Título
        ctx.textAlign = 'left';
        const titulo = song.titulo.toUpperCase();
        if (ctx.measureText(titulo).width > (width - 220)) {
            const shortTitle = truncateText(ctx, titulo, width - 230);
            ctx.fillText(shortTitle, 200, y + 32);
        } else {
            ctx.fillText(titulo, 200, y + 32);
        }
    });
    
    imageModal.classList.add('show');
}

// Truncar texto para caber no canvas
function truncateText(ctx, text, maxWidth) {
    let width = ctx.measureText(text).width;
    let ellipsis = '...';
    let ellipsisWidth = ctx.measureText(ellipsis).width;
    
    if (width <= maxWidth) {
        return text;
    }
    
    let len = text.length;
    while (width >= maxWidth - ellipsisWidth && len-- > 0) {
        text = text.substring(0, len);
        width = ctx.measureText(text).width;
    }
    
    return text + ellipsis;
}

// Formatar data para exibição
function formatDateForDisplay(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Baixar imagem
function downloadImage() {
    const link = document.createElement('a');
    link.download = `lista-louvores-${listDate.value}.png`;
    link.href = listCanvas.toDataURL();
    link.click();
    showToast('Imagem baixada!', 'success');
}

// Compartilhar no WhatsApp
function shareOnWhatsApp() {
    listCanvas.toBlob(blob => {
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'lista.png', { type: 'image/png' })] })) {
            const file = new File([blob], 'lista-louvores.png', { type: 'image/png' });
            navigator.share({
                files: [file],
                title: 'Lista de Louvores',
                text: 'Confira a lista de louvores!'
            }).then(() => {
                showToast('Compartilhado com sucesso!', 'success');
            }).catch(err => {
                console.log('Erro ao compartilhar:', err);
                fallbackShare();
            });
        } else {
            fallbackShare();
        }
    });
}

function fallbackShare() {
    const text = generateTextList();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
    showToast('Abrindo WhatsApp...', 'info');
}

// Copiar texto para clipboard
function copyTextToClipboard() {
    const text = generateTextList();
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Texto copiado para a área de transferência!', 'success');
    }).catch(err => {
        console.error('Erro ao copiar:', err);
        showToast('Erro ao copiar texto', 'error');
    });
}

// Gerar lista em texto
function generateTextList() {
    const exportType = document.querySelector('input[name="exportType"]:checked').value;
    const formattedDate = formatDateForDisplay(listDate.value);
    
    let text = `*LOUVORES* - Data: ${formattedDate}\n\n`;
    
    if (exportType === 'titles') {
        selectedSongs.forEach((song, index) => {
            const displayNumber = song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero;
            text += `${index + 1}. ${displayNumber} - ${song.titulo}\n`;
        });
    } else {
        selectedSongs.forEach((song, index) => {
            const displayNumber = song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero;
            text += `\n${'='.repeat(40)}\n`;
            text += `*${displayNumber} - ${song.titulo}*\n`;
            text += `${'='.repeat(40)}\n\n`;
            text += song.letra || 'Letra não disponível';
            text += '\n\n';
        });
    }
    
    return text;
}

// Mostrar modal de letras individuais
function showLyricsModal() {
    lyricsListContainer.innerHTML = '';
    
    selectedSongs.forEach(song => {
        const displayNumber = song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero;
        const item = document.createElement('div');
        item.className = 'lyrics-item';
        item.innerHTML = `
            <div class="lyrics-item-header">${displayNumber} - ${song.titulo}</div>
            <div class="lyrics-item-hint">Clique para copiar a letra</div>
        `;
        
        item.addEventListener('click', () => {
            const text = `*${displayNumber} - ${song.titulo}*\n\n${song.letra || 'Letra não disponível'}`;
            navigator.clipboard.writeText(text).then(() => {
                showToast(`Letra de "${song.titulo}" copiada!`, 'success');
            });
        });
        
        lyricsListContainer.appendChild(item);
    });
    
    lyricsModal.classList.add('show');
}

// Salvar lista
function saveList() {
    const listName = listNameInput.value.trim();
    
    if (!listName) {
        showToast('Digite um nome para a lista', 'warning');
        return;
    }
    
    if (selectedSongs.length === 0) {
        showToast('Adicione louvores antes de salvar', 'warning');
        return;
    }
    
    const savedLists = JSON.parse(localStorage.getItem('savedLists') || '[]');
    
    const newList = {
        id: Date.now(),
        name: listName,
        date: listDate.value,
        songs: selectedSongs,
        createdAt: new Date().toISOString()
    };
    
    savedLists.push(newList);
    localStorage.setItem('savedLists', JSON.stringify(savedLists));
    
    listNameInput.value = '';
    loadSavedLists();
    showToast('Lista salva com sucesso!', 'success');
}

// Carregar listas salvas
function loadSavedLists() {
    const savedLists = JSON.parse(localStorage.getItem('savedLists') || '[]');
    savedListsContainer.innerHTML = '';
    
    if (savedLists.length === 0) {
        savedListsContainer.innerHTML = '<div class="empty-message">Nenhuma lista salva</div>';
        return;
    }
    
    savedLists.reverse().forEach(list => {
        const item = document.createElement('div');
        item.className = 'saved-list-item';
        
        const formattedDate = formatDateForDisplay(list.date);
        
        item.innerHTML = `
            <div class="saved-list-name">${list.name}</div>
            <div class="saved-list-info">
                📅 ${formattedDate}<br>
                🎵 ${list.songs.length} ${list.songs.length === 1 ? 'louvor' : 'louvores'}
            </div>
            <div class="saved-list-actions">
                <button class="btn btn-primary btn-small load-list-btn">Carregar</button>
                <button class="btn btn-danger btn-small delete-list-btn">Excluir</button>
            </div>
        `;
        
        item.querySelector('.load-list-btn').addEventListener('click', () => loadList(list));
        item.querySelector('.delete-list-btn').addEventListener('click', () => deleteList(list.id));
        
        savedListsContainer.appendChild(item);
    });
}

// Carregar lista salva
function loadList(list) {
    selectedSongs = list.songs;
    listDate.value = list.date;
    updateSelectedList();
    showToast(`Lista "${list.name}" carregada!`, 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Excluir lista salva
function deleteList(id) {
    if (!confirm('Deseja realmente excluir esta lista?')) return;
    
    let savedLists = JSON.parse(localStorage.getItem('savedLists') || '[]');
    savedLists = savedLists.filter(list => list.id !== id);
    localStorage.setItem('savedLists', JSON.stringify(savedLists));
    
    loadSavedLists();
    showToast('Lista excluída', 'info');
}

// Mostrar toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    if (type === 'error') {
        toast.style.background = '#f44336';
    } else if (type === 'warning') {
        toast.style.background = '#FF9800';
    } else if (type === 'info') {
        toast.style.background = '#2196F3';
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Mostrar mensagem de erro
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(errorDiv, container.firstChild);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

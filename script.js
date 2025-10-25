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
const saveLocalBtn = document.getElementById('saveLocalBtn');
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

// Drag and drop state
let draggedElement = null;

// Referência Firebase
let dbRefSavedLists = null;

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa Firebase
    if (window.firebaseDb && window.firebaseDb.database) {
        try {
            dbRefSavedLists = window.firebaseDb.ref(window.firebaseDb.database, 'savedLists');
            console.log("Firebase inicializado");
        } catch (error) {
            console.error("Erro ao inicializar Firebase:", error);
            showToast("Erro ao conectar com a base de dados", "error");
        }
    } else {
        console.error("Firebase não encontrado");
        saveListBtn.disabled = true;
        listNameInput.disabled = true;
        savedListsContainer.innerHTML = '<div class="empty-message">Erro ao conectar com Firebase</div>';
    }

    loadSongs();
    setupEventListeners();
    setTodayDate();
    loadCurrentList(); // Carrega lista salva localmente se existir
    updateSelectedList();
    loadSavedLists();
    setupBottomMenu();
});

// --- Menu Inferior ---
function setupBottomMenu() {
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.section');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetSection = item.dataset.section;
            
            // Remove active de todos
            menuItems.forEach(mi => mi.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // Adiciona active no selecionado
            item.classList.add('active');
            document.getElementById(targetSection).classList.add('active');
            
            // Scroll para o topo
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

// --- Funções Básicas ---
function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    listDate.value = today;
}

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

        const processSongs = (data, origem) => data
            .filter(song => song.titulo && (song.numero !== "" || origem === 'Avulsos'))
            .map(song => ({
                ...song,
                numero: String(song.numero || ''),
                origem: origem
            }));

        const igrejaSongs = processSongs(igrejaData, 'Igreja');
        const criancasSongs = processSongs(criancasData, 'CIAS');
        const avulsosSongs = processSongs(avulsosData, 'Avulsos');

        allSongs = [...igrejaSongs, ...criancasSongs, ...avulsosSongs];

        console.log(`${allSongs.length} louvores carregados`);

    } catch (error) {
        console.error('Erro ao carregar louvores:', error);
        showToast('Erro ao carregar coletâneas', 'error');
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    searchInput.addEventListener('input', handleSearch);
    clearListBtn.addEventListener('click', clearList);

    // Listener para mudar tipo de busca
    document.querySelectorAll('input[name="searchType"]').forEach(radio => {
        radio.addEventListener('change', handleSearchTypeChange);
    });

    // Listener para mudança de fonte (esconder opção "Por Número" quando fonte for "Avulsos")
    document.querySelectorAll('input[name="source"]').forEach(radio => {
        radio.addEventListener('change', handleSourceChange);
    });

    document.querySelectorAll('input[name="exportType"]').forEach(radio => {
        radio.addEventListener('change', handleExportTypeChange);
    });

    exportImageBtn.addEventListener('click', generateImage);
    exportTextBtn.addEventListener('click', sendViaWhatsApp);
    exportLyricsBtn.addEventListener('click', showLyricsModal);
    saveLocalBtn.addEventListener('click', saveCurrentList);

    saveListBtn.addEventListener('click', saveList);

    // Fechar Modals
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('show');
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });

    downloadImageBtn.addEventListener('click', downloadImage);
    shareImageBtn.addEventListener('click', shareImageOnWhatsApp);
}

function handleSearchTypeChange() {
    const searchType = document.querySelector('input[name="searchType"]:checked').value;
    
    if (searchType === 'number') {
        searchInput.type = 'number';
        searchInput.placeholder = 'Digite o número...';
        searchInput.inputMode = 'numeric';
        searchInput.pattern = '[0-9]*';
    } else {
        searchInput.type = 'text';
        searchInput.placeholder = 'Digite título ou palavra da letra...';
        searchInput.removeAttribute('inputmode');
        searchInput.removeAttribute('pattern');
    }
    
    searchInput.value = '';
    searchResults.innerHTML = '';
    searchResults.style.display = 'none';
}

function handleSourceChange() {
    const selectedSource = document.querySelector('input[name="source"]:checked').value;
    const searchTypeSelector = document.getElementById('searchTypeSelector');
    const searchByNumber = document.getElementById('searchByNumber');
    const searchByTitleLyrics = document.getElementById('searchByTitleLyrics');
    
    if (selectedSource === 'Avulsos') {
        // Esconde opção "Por Número" e força "Por Título/Letra"
        searchByNumber.closest('.radio-option').style.display = 'none';
        searchByTitleLyrics.checked = true;
        handleSearchTypeChange();
    } else {
        // Mostra opção "Por Número"
        searchByNumber.closest('.radio-option').style.display = 'flex';
    }
    
    searchInput.value = '';
    searchResults.innerHTML = '';
    searchResults.style.display = 'none';
}

function handleExportTypeChange() {
    const exportType = document.querySelector('input[name="exportType"]:checked').value;
    exportLyricsBtn.style.display = (exportType === 'lyrics') ? 'inline-flex' : 'none';
}

// --- Funções de Busca ---
function handleSearch(event) {
    const searchTerm = event.target.value.trim().toLowerCase();
    searchResults.innerHTML = '';
    
    if (searchTerm.length < 1) {
        searchResults.style.display = 'none';
        return;
    }

    const selectedSource = document.querySelector('input[name="source"]:checked').value;
    const searchType = document.querySelector('input[name="searchType"]:checked').value;

    let results = [];

    if (searchType === 'number') {
        // Busca apenas por número
        results = allSongs.filter(song => {
            const numero = song.numero.toLowerCase();
            return numero && numero.includes(searchTerm);
        });
    } else {
        // Busca por título OU letra
        results = allSongs.filter(song => {
            const titulo = song.titulo.toLowerCase();
            const letra = song.letra ? song.letra.toLowerCase() : '';
            return titulo.includes(searchTerm) || letra.includes(searchTerm);
        });
    }

    if (selectedSource !== 'Todas') {
        results = results.filter(song => song.origem === selectedSource);
    }

    // Ordena resultados
    results.sort((a, b) => {
        const numA = parseInt(a.numero, 10);
        const numB = parseInt(b.numero, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
            if (numA !== numB) return numA - numB;
        } else if (!isNaN(numA)) {
            return -1;
        } else if (!isNaN(numB)) {
            return 1;
        }
        return a.titulo.localeCompare(b.titulo);
    });

    displaySearchResults(results, selectedSource);
}

function displaySearchResults(results, selectedSource) {
    searchResults.innerHTML = '';
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="empty-message">Nenhum louvor encontrado</div>';
        searchResults.style.display = 'block';
        return;
    }

    // LIMITE DE 5 RESULTADOS
    const limitedResults = results.slice(0, 5);
    const showOrigin = selectedSource === 'Todas';

    limitedResults.forEach(song => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        
        const displayNumber = song.numero ? (song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero) : '';

        let displayText = '';
        if (displayNumber) {
            displayText += `<span class="song-number">${displayNumber}</span>`;
        }
        if (showOrigin && song.origem !== 'Igreja') {
            displayText += `<span class="song-origin">(${song.origem})</span>`;
        }
        displayText += `<span class="song-title">${song.titulo}</span>`;

        resultItem.innerHTML = displayText;
        resultItem.addEventListener('click', () => addSongToList(song));
        searchResults.appendChild(resultItem);
    });

    if (results.length > 5) {
        const moreMessage = document.createElement('div');
        moreMessage.className = 'empty-message';
        moreMessage.textContent = `Mostrando 5 de ${results.length}. Refine sua busca`;
        moreMessage.style.fontSize = '0.75rem';
        searchResults.appendChild(moreMessage);
    }
    
    searchResults.style.display = 'block';
}

function addSongToList(songData) {
    const uniqueId = `${songData.origem}-${songData.numero || songData.titulo.toLowerCase()}`;
    const isDuplicate = selectedSongs.some(song => 
        `${song.origem}-${song.numero || song.titulo.toLowerCase()}` === uniqueId
    );

    if (isDuplicate) {
        showToast('Louvor já está na lista', 'warning');
        return;
    }
    
    selectedSongs.push(songData);
    updateSelectedList();
    searchInput.value = '';
    searchResults.innerHTML = '';
    searchResults.style.display = 'none';
    showToast(`"${songData.titulo}" adicionado`, 'success');
    
    // Auto-salva a lista localmente
    saveCurrentList();
}

function updateSelectedList() {
    songList.innerHTML = '';
    const count = selectedSongs.length;
    songCounter.textContent = `${count} ${count === 1 ? 'louvor' : 'louvores'}`;

    if (count === 0) {
        songList.innerHTML = '<div class="empty-message">Busque e clique para adicionar</div>';
        exportSection.style.display = 'none';
        return;
    }

    exportSection.style.display = 'block';

    selectedSongs.forEach((song, index) => {
        const listItem = document.createElement('li');
        listItem.draggable = true;
        listItem.dataset.index = index;
        
        const displayNumber = song.numero ? (song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero) : '';
        const originSpan = song.origem !== 'Igreja' ? `<span class="song-origin-list" style="font-size:0.7rem;color:#999;margin-left:4px;">(${song.origem})</span>` : '';

        listItem.innerHTML = `
            <div class="song-info">
                ${displayNumber ? `<span class="song-number">${displayNumber}</span>` : '<span class="song-number no-number"></span>'}
                <span class="song-title">${song.titulo}</span>
                ${originSpan}
            </div>
            <button class="remove-btn" data-index="${index}" title="Remover">&times;</button>
        `;

        listItem.addEventListener('dragstart', handleDragStart);
        listItem.addEventListener('dragover', handleDragOver);
        listItem.addEventListener('drop', handleDrop);
        listItem.addEventListener('dragend', handleDragEnd);

        listItem.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            removeSongFromList(index);
        });

        songList.appendChild(listItem);
    });
}

// --- Drag and Drop ---
function handleDragStart(e) {
    draggedElement = this;
    e.dataTransfer.setData('text/plain', this.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => this.classList.add('dragging'), 0);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    if (draggedElement !== this) {
        const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const targetIndex = parseInt(this.dataset.index, 10);

        const itemToMove = selectedSongs.splice(draggedIndex, 1)[0];
        selectedSongs.splice(targetIndex, 0, itemToMove);

        updateSelectedList();
        
        // Auto-salva após reordenar
        saveCurrentList();
    }
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedElement = null;
}

function removeSongFromList(index) {
    if (index >= 0 && index < selectedSongs.length) {
        const removedSongTitle = selectedSongs[index].titulo;
        selectedSongs.splice(index, 1);
        updateSelectedList();
        showToast(`"${removedSongTitle}" removido`, 'info');
        
        // Auto-salva após remover
        if (selectedSongs.length > 0) {
            saveCurrentList();
        } else {
            // Se ficou vazia, limpa o localStorage
            try {
                localStorage.removeItem('currentList');
            } catch (error) {
                console.error("Erro ao limpar localStorage:", error);
            }
        }
    }
}

function clearList() {
    if (selectedSongs.length === 0) return;
    if (confirm('Limpar toda a lista?')) {
        selectedSongs = [];
        updateSelectedList();
        
        // Limpa também o localStorage
        try {
            localStorage.removeItem('currentList');
        } catch (error) {
            console.error("Erro ao limpar localStorage:", error);
        }
        
        showToast('Lista limpa', 'info');
    }
}

// --- Exportação ---
function generateImage() {
    if (selectedSongs.length === 0) {
        showToast("Adicione louvores antes de gerar imagem", "warning");
        return;
    }

    const canvas = listCanvas;
    const ctx = canvas.getContext('2d');
    const width = 800;
    const lineHeight = 45;
    const headerHeight = 120;
    const contentHeight = selectedSongs.length * lineHeight;
    const totalHeight = headerHeight + contentHeight + 20;

    canvas.width = width;
    canvas.height = totalHeight;

    // Fundo branco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, totalHeight);

    // Título
    ctx.fillStyle = '#1976D2';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('LISTA DE LOUVORES', width / 2, 40);

    // Data
    const formattedDate = formatDateForDisplay(listDate.value);
    ctx.fillStyle = '#666';
    ctx.font = '20px Arial';
    ctx.fillText(formattedDate, width / 2, 70);

    // Linha separadora
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 90);
    ctx.lineTo(width - 50, 90);
    ctx.stroke();

    // Cabeçalho da tabela
    ctx.fillStyle = '#333';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Nº', 60, 115);
    ctx.fillText('TÍTULO', 150, 115);

    // Lista de louvores
    ctx.font = '18px Arial';
    selectedSongs.forEach((song, index) => {
        const y = headerHeight + 20 + (index * lineHeight);
        
        // Número
        ctx.fillStyle = '#1976D2';
        ctx.font = 'bold 18px Arial';
        const displayNumber = song.numero ? (song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero) : '-';
        ctx.fillText(displayNumber, 60, y);

        // Título
        ctx.fillStyle = '#333';
        ctx.font = '18px Arial';
        let titulo = song.titulo;
        if (titulo.length > 50) {
            titulo = titulo.substring(0, 47) + '...';
        }
        ctx.fillText(titulo, 150, y);
    });

    imageModal.classList.add('show');
}

function downloadImage() {
    const link = document.createElement('a');
    const filename = `lista-louvores-${listDate.value}.png`;
    link.download = filename;
    link.href = listCanvas.toDataURL('image/png');
    link.click();
    showToast('Imagem baixada', 'success');
}

function shareImageOnWhatsApp() {
    listCanvas.toBlob((blob) => {
        const file = new File([blob], 'lista-louvores.png', { type: 'image/png' });
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({
                files: [file],
                title: 'Lista de Louvores',
                text: 'Confira a lista de louvores'
            }).catch(err => {
                console.log('Erro ao compartilhar:', err);
                showToast('Erro ao compartilhar', 'error');
            });
        } else {
            showToast('Compartilhamento não disponível. Use "Baixar"', 'warning');
        }
    });
}

function sendViaWhatsApp() {
    if (selectedSongs.length === 0) {
        showToast("Adicione louvores à lista", "warning");
        return;
    }

    const exportType = document.querySelector('input[name="exportType"]:checked').value;
    const dateStr = formatDateForDisplay(listDate.value);
    let message = `*LISTA DE LOUVORES*\n📅 ${dateStr}\n\n`;

    selectedSongs.forEach((song) => {
        const displayNumber = song.numero ? (song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero) : '';
        
        // Apenas o número do hino, sem numeração adicional
        if (displayNumber) {
            message += `${displayNumber} - ${song.titulo}\n`;
        } else {
            message += `${song.titulo}\n`;
        }
        
        if (exportType === 'lyrics' && song.letra) {
            // Formata a letra separando CORO e estrofes
            const formattedLyrics = formatLyricsForWhatsApp(song.letra);
            message += `\n${formattedLyrics}\n\n`;
        }
    });

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    // Abre no mesmo contexto sem abrir nova aba
    window.location.href = whatsappUrl;
}

function formatLyricsForWhatsApp(letra) {
    if (!letra) return '';
    
    // Remove "Índice" do final se existir
    letra = letra.replace(/Índice\s*$/gi, '').trim();
    
    // Separa por linhas
    let lines = letra.split('\n');
    let formattedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        if (line === '') {
            formattedLines.push('');
            continue;
        }
        
        // Identifica CORO
        if (line.toUpperCase() === 'CORO' || line.toUpperCase() === 'CÔRO') {
            formattedLines.push('');
            formattedLines.push('_*CORO*_');
            continue;
        }
        
        // Identifica BIS
        if (line.toUpperCase() === 'BIS' || line.toUpperCase() === '(BIS)') {
            formattedLines.push('_(BIS)_');
            continue;
        }
        
        // Adiciona a linha normal
        formattedLines.push(line);
    }
    
    return formattedLines.join('\n');
}

function showLyricsModal() {
    if (selectedSongs.length === 0) {
        showToast("Adicione louvores à lista", "warning");
        return;
    }

    lyricsListContainer.innerHTML = '';

    selectedSongs.forEach((song, index) => {
        const item = document.createElement('div');
        item.className = 'lyrics-item';
        
        const displayNumber = song.numero ? (song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero) : '';
        const numberStr = displayNumber ? `${displayNumber} - ` : '';
        
        item.innerHTML = `
            <div class="lyrics-item-header">${numberStr}${song.titulo}</div>
            <div class="lyrics-item-hint">Toque para copiar</div>
        `;

        item.addEventListener('click', () => {
            const formattedLyrics = formatLyricsForWhatsApp(song.letra || 'Letra não disponível');
            const textToCopy = `*${numberStr}${song.titulo}*\n\n${formattedLyrics}`;
            
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textToCopy)
                    .then(() => showToast(`"${song.titulo}" copiado`, 'success'))
                    .catch(() => showToast('Erro ao copiar', 'error'));
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = textToCopy;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    showToast(`"${song.titulo}" copiado`, 'success');
                } catch (err) {
                    showToast('Erro ao copiar', 'error');
                }
                document.body.removeChild(textArea);
            }
        });

        lyricsListContainer.appendChild(item);
    });

    lyricsModal.classList.add('show');
}

// --- Salvar Lista Localmente ---
function saveCurrentList() {
    if (selectedSongs.length === 0) {
        showToast("Adicione louvores à lista", "warning");
        return;
    }

    const currentList = {
        date: listDate.value,
        songs: selectedSongs
    };

    try {
        localStorage.setItem('currentList', JSON.stringify(currentList));
        showToast("Lista salva localmente", "success");
    } catch (error) {
        console.error("Erro ao salvar lista:", error);
        showToast("Erro ao salvar lista", "error");
    }
}

function loadCurrentList() {
    try {
        const savedList = localStorage.getItem('currentList');
        if (savedList) {
            const listData = JSON.parse(savedList);
            if (listData.songs && Array.isArray(listData.songs)) {
                selectedSongs = listData.songs;
                if (listData.date) {
                    listDate.value = listData.date;
                }
                console.log("Lista carregada do localStorage");
            }
        }
    } catch (error) {
        console.error("Erro ao carregar lista:", error);
    }
}

// --- Firebase ---
function saveList() {
    if (!window.firebaseDb || !dbRefSavedLists) {
        showToast("Erro de conexão", "error");
        return;
    }

    const listName = listNameInput.value.trim();
    if (!listName) {
        showToast("Digite um nome para a lista", "warning");
        return;
    }

    if (selectedSongs.length === 0) {
        showToast("Adicione louvores à lista", "warning");
        return;
    }

    const newListData = {
        name: listName,
        date: listDate.value,
        songs: selectedSongs,
        createdAt: new Date().toISOString()
    };

    const newListRef = window.firebaseDb.push(dbRefSavedLists);

    window.firebaseDb.set(newListRef, newListData)
        .then(() => {
            listNameInput.value = '';
            showToast(`Lista "${listName}" salva`, 'success');
        })
        .catch((error) => {
            console.error("Erro ao salvar:", error);
            showToast('Erro ao salvar lista', 'error');
        });
}

function loadSavedLists() {
    if (!window.firebaseDb || !dbRefSavedLists) {
        savedListsContainer.innerHTML = '<div class="empty-message">Erro de conexão</div>';
        return;
    }

    window.firebaseDb.onValue(dbRefSavedLists, (snapshot) => {
        savedListsContainer.innerHTML = '';

        if (snapshot.exists()) {
            const listsArray = [];
            snapshot.forEach((childSnapshot) => {
                const listData = childSnapshot.val();
                listData.id = childSnapshot.key;
                listsArray.push(listData);
            });

            listsArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            listsArray.forEach(list => {
                renderSavedListItem(list);
            });
        } else {
            savedListsContainer.innerHTML = '<div class="empty-message">Nenhuma lista salva</div>';
        }
    }, (error) => {
        console.error("Erro ao carregar:", error);
        savedListsContainer.innerHTML = '<div class="empty-message">Erro ao carregar listas</div>';
    });
}

function renderSavedListItem(list) {
    const item = document.createElement('div');
    item.className = 'saved-list-item';
    
    const formattedListDate = formatDateForDisplay(list.date);
    const createdAtDate = list.createdAt ? new Date(list.createdAt) : null;
    const savedDateStr = createdAtDate ? createdAtDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Data indisponível';

    item.innerHTML = `
        <div class="saved-list-name">${list.name}</div>
        <div class="saved-list-info">
            📅 Lista: ${formattedListDate}<br>
            🎵 ${list.songs.length} ${list.songs.length === 1 ? 'louvor' : 'louvores'}<br>
            <small>💾 Salvo: ${savedDateStr}</small>
        </div>
        <div class="saved-list-actions">
            <button class="btn btn-primary btn-small load-list-btn">Carregar</button>
            <button class="btn btn-danger btn-small delete-list-btn">Excluir</button>
        </div>
    `;

    item.querySelector('.load-list-btn').addEventListener('click', () => loadList(list));
    item.querySelector('.delete-list-btn').addEventListener('click', () => deleteList(list.id, list.name));

    savedListsContainer.appendChild(item);
}

function loadList(listData) {
    if (listData && Array.isArray(listData.songs) && listData.date) {
        if (selectedSongs.length > 0) {
            if (!confirm(`Carregar "${listData.name}" substituirá a lista atual. Continuar?`)) {
                return;
            }
        }
        
        selectedSongs = JSON.parse(JSON.stringify(listData.songs));
        listDate.value = listData.date;
        updateSelectedList();
        showToast(`Lista "${listData.name}" carregada`, 'success');
        
        // Volta para a tela de busca
        document.querySelector('.menu-item[data-section="searchSection"]').click();
    } else {
        showToast("Erro ao carregar lista", "error");
    }
}

function deleteList(listId, listName) {
    if (!window.firebaseDb || !dbRefSavedLists) {
        showToast("Erro de conexão", "error");
        return;
    }

    if (!confirm(`Excluir "${listName || 'lista'}"?`)) {
        return;
    }

    const listToDeleteRef = window.firebaseDb.ref(window.firebaseDb.database, `savedLists/${listId}`);

    window.firebaseDb.remove(listToDeleteRef)
        .then(() => {
            showToast(`"${listName}" excluída`, 'info');
        })
        .catch((error) => {
            console.error("Erro ao excluir:", error);
            showToast('Erro ao excluir lista', 'error');
        });
}

// --- Auxiliares ---
function formatDateForDisplay(dateStr) {
    if (!dateStr) return 'Data não definida';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 500);
    }, 3000);
}

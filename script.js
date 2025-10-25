// Estado da aplicação
let currentChurch = null;
let allSongs = [];
let selectedSongs = [];
let churchLists = [];
let touchStartY = 0;
let touchStartX = 0;
let draggedElement = null;
let draggedIndex = -1;

// Elementos do DOM
const churchSelectionScreen = document.getElementById('churchSelectionScreen');
const churchSelect = document.getElementById('churchSelect');
const existingChurches = document.getElementById('existingChurches');
const enterBtn = document.getElementById('enterBtn');
const churchInfo = document.getElementById('churchInfo');
const churchStats = document.getElementById('churchStats');
const mainApp = document.getElementById('mainApp');
const bottomMenu = document.getElementById('bottomMenu');
const currentChurchDisplay = document.getElementById('currentChurchDisplay');
const changeChurchBtn = document.getElementById('changeChurchBtn');

const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const songList = document.getElementById('songList');
const songCounter = document.getElementById('songCounter');
const listDate = document.getElementById('listDate');
const clearListBtn = document.getElementById('clearListBtn');
const exportSection = document.getElementById('exportSection');
const exportImageBtn = document.getElementById('exportImageBtn');
const exportTextBtn = document.getElementById('exportTextBtn');
const saveListBtn = document.getElementById('saveListBtn');
const savedListsContainer = document.getElementById('savedListsContainer');
const reportContent = document.getElementById('reportContent');
const imageModal = document.getElementById('imageModal');
const listCanvas = document.getElementById('listCanvas');
const downloadImageBtn = document.getElementById('downloadImageBtn');
const shareImageBtn = document.getElementById('shareImageBtn');

// Referência Firebase
let dbRefLists = null;
let allLists = [];

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    if (window.firebaseDb && window.firebaseDb.database) {
        try {
            dbRefLists = window.firebaseDb.ref(window.firebaseDb.database, 'lists');
            console.log("Firebase inicializado");
        } catch (error) {
            console.error("Erro ao inicializar Firebase:", error);
            showToast("Erro ao conectar com Firebase", "error");
        }
    }

    loadSongs();
    setupChurchSelection();
    setupEventListeners();
    setTodayDate();
    setupBottomMenu();
    loadAllChurches();
});

// --- Seleção de Igreja ---
function setupChurchSelection() {
    enterBtn.addEventListener('click', selectChurch);
    churchSelect.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            selectChurch();
        }
    });

    churchSelect.addEventListener('input', () => {
        const value = churchSelect.value.trim();
        if (value) {
            checkChurchStats(value);
        } else {
            churchInfo.style.display = 'none';
        }
    });

    changeChurchBtn.addEventListener('click', () => {
        if (confirm('Deseja trocar de igreja? A lista atual será perdida.')) {
            currentChurch = null;
            selectedSongs = [];
            churchSelectionScreen.style.display = 'flex';
            mainApp.style.display = 'none';
            bottomMenu.style.display = 'none';
            churchSelect.value = '';
            churchInfo.style.display = 'none';
        }
    });
}

async function loadAllChurches() {
    if (!window.firebaseDb || !dbRefLists) return;

    try {
        const snapshot = await window.firebaseDb.get(dbRefLists);
        if (!snapshot.exists()) return;

        const churches = new Set();
        snapshot.forEach(child => {
            const list = child.val();
            if (list.churchName) {
                churches.add(list.churchName);
            }
        });

        existingChurches.innerHTML = '';
        Array.from(churches).sort().forEach(church => {
            const option = document.createElement('option');
            option.value = church;
            existingChurches.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar igrejas:', error);
    }
}

async function checkChurchStats(churchName) {
    if (!window.firebaseDb || !dbRefLists) return;

    try {
        const snapshot = await window.firebaseDb.get(dbRefLists);
        if (!snapshot.exists()) {
            churchInfo.style.display = 'none';
            return;
        }

        let count = 0;
        snapshot.forEach(child => {
            const list = child.val();
            if (list.churchName === churchName) {
                count++;
            }
        });

        if (count > 0) {
            churchStats.textContent = `${count} ${count === 1 ? 'lista salva' : 'listas salvas'}`;
            churchInfo.style.display = 'block';
        } else {
            churchInfo.style.display = 'none';
        }
    } catch (error) {
        console.error('Erro ao verificar estatísticas:', error);
    }
}

function selectChurch() {
    const churchName = churchSelect.value.trim();
    
    if (!churchName) {
        showToast('Digite o nome da igreja', 'warning');
        churchSelect.focus();
        return;
    }

    currentChurch = churchName;
    currentChurchDisplay.textContent = `🏛️ ${churchName}`;
    
    churchSelectionScreen.style.display = 'none';
    mainApp.style.display = 'block';
    bottomMenu.style.display = 'flex';
    
    loadChurchData();
    showToast(`Bem-vindo, ${churchName}!`, 'success');
}

async function loadChurchData() {
    if (!window.firebaseDb || !dbRefLists || !currentChurch) return;

    try {
        const snapshot = await window.firebaseDb.get(dbRefLists);
        churchLists = [];

        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const list = child.val();
                if (list.churchName === currentChurch) {
                    list.id = child.key;
                    churchLists.push(list);
                }
            });

            churchLists.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        updateSavedListsDisplay();
        generateReport();
    } catch (error) {
        console.error('Erro ao carregar dados da igreja:', error);
        showToast('Erro ao carregar dados', 'error');
    }
}

// --- Menu Inferior ---
function setupBottomMenu() {
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.section');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetSection = item.dataset.section;
            
            menuItems.forEach(mi => mi.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            item.classList.add('active');
            document.getElementById(targetSection).classList.add('active');
            
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

    document.querySelectorAll('input[name="searchType"]').forEach(radio => {
        radio.addEventListener('change', handleSearchTypeChange);
    });

    document.querySelectorAll('input[name="source"]').forEach(radio => {
        radio.addEventListener('change', handleSourceChange);
    });

    exportImageBtn.addEventListener('click', generateImage);
    exportTextBtn.addEventListener('click', sendViaWhatsApp);
    saveListBtn.addEventListener('click', saveList);

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
    const searchByNumber = document.getElementById('searchByNumber');
    const searchByTitleLyrics = document.getElementById('searchByTitleLyrics');
    
    if (selectedSource === 'Avulsos') {
        searchByNumber.closest('.radio-option').style.display = 'none';
        searchByTitleLyrics.checked = true;
        handleSearchTypeChange();
    } else {
        searchByNumber.closest('.radio-option').style.display = 'flex';
    }
    
    searchInput.value = '';
    searchResults.innerHTML = '';
    searchResults.style.display = 'none';
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
        results = allSongs.filter(song => {
            const numero = song.numero.toLowerCase();
            return numero && numero.includes(searchTerm);
        });
    } else {
        results = allSongs.filter(song => {
            const titulo = song.titulo.toLowerCase();
            const letra = song.letra ? song.letra.toLowerCase() : '';
            return titulo.includes(searchTerm) || letra.includes(searchTerm);
        });
    }

    if (selectedSource !== 'Todas') {
        results = results.filter(song => song.origem === selectedSource);
    }

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

// Verificar se hino foi cantado recentemente (últimos 4 dias)
function checkRecentSong(songData) {
    if (!currentChurch || churchLists.length === 0) return true;

    const currentDate = new Date(listDate.value);
    const fourDaysAgo = new Date(currentDate);
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    const songId = `${songData.origem}-${songData.numero || songData.titulo}`;

    for (const list of churchLists) {
        const listDateObj = new Date(list.date);
        if (listDateObj >= fourDaysAgo && listDateObj < currentDate) {
            const hasSong = list.songs.some(song => 
                `${song.origem}-${song.numero || song.titulo}` === songId
            );
            
            if (hasSong) {
                const daysAgo = Math.floor((currentDate - listDateObj) / (1000 * 60 * 60 * 24));
                const formattedDate = formatDateForDisplay(list.date);
                const message = `Este hino foi cantado há ${daysAgo} ${daysAgo === 1 ? 'dia' : 'dias'} (${formattedDate}).\n\nDeseja adicionar mesmo assim?`;
                return confirm(message);
            }
        }
    }

    return true;
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

    // Verificar se foi cantado recentemente
    const canAdd = checkRecentSong(songData);
    if (!canAdd) return;
    
    selectedSongs.push(songData);
    updateSelectedList();
    searchInput.value = '';
    searchResults.innerHTML = '';
    searchResults.style.display = 'none';
    showToast(`"${songData.titulo}" adicionado`, 'success');
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
        listItem.dataset.index = index;
        
        const displayNumber = song.numero ? (song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero) : '';
        const originSpan = song.origem !== 'Igreja' ? `<span style="font-size:0.7rem;color:#999;margin-left:4px;">(${song.origem})</span>` : '';

        listItem.innerHTML = `
            <div class="song-info">
                ${displayNumber ? `<span class="song-number">${displayNumber}</span>` : '<span class="song-number no-number"></span>'}
                <span class="song-title">${song.titulo}</span>
                ${originSpan}
            </div>
            <button class="remove-btn" data-index="${index}" title="Remover">&times;</button>
        `;

        // Touch events
        listItem.addEventListener('touchstart', handleTouchStart, { passive: false });
        listItem.addEventListener('touchmove', handleTouchMove, { passive: false });
        listItem.addEventListener('touchend', handleTouchEnd, { passive: false });

        // Mouse events
        listItem.draggable = true;
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

// --- Touch Drag ---
function handleTouchStart(e) {
    const touch = e.touches[0];
    touchStartY = touch.clientY;
    touchStartX = touch.clientX;
    draggedElement = this;
    draggedIndex = parseInt(this.dataset.index, 10);
    
    setTimeout(() => {
        if (draggedElement) {
            draggedElement.classList.add('dragging');
        }
    }, 100);
}

function handleTouchMove(e) {
    if (!draggedElement) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const deltaY = Math.abs(touch.clientY - touchStartY);
    
    if (deltaY < 10) return;

    const items = Array.from(songList.children);
    const currentY = touch.clientY;
    
    items.forEach(item => {
        if (item === draggedElement) return;
        const rect = item.getBoundingClientRect();
        if (currentY > rect.top && currentY < rect.bottom) {
            items.forEach(i => i.classList.remove('drag-over'));
            item.classList.add('drag-over');
        }
    });
}

function handleTouchEnd(e) {
    if (!draggedElement) return;
    
    const items = Array.from(songList.children);
    const dragOverItem = items.find(item => item.classList.contains('drag-over'));
    
    if (dragOverItem && draggedElement !== dragOverItem) {
        const targetIndex = parseInt(dragOverItem.dataset.index, 10);
        
        const itemToMove = selectedSongs.splice(draggedIndex, 1)[0];
        selectedSongs.splice(targetIndex, 0, itemToMove);
        
        updateSelectedList();
    }
    
    items.forEach(item => {
        item.classList.remove('dragging');
        item.classList.remove('drag-over');
    });
    
    draggedElement = null;
    draggedIndex = -1;
}

// --- Mouse Drag ---
function handleDragStart(e) {
    draggedElement = this;
    draggedIndex = parseInt(this.dataset.index, 10);
    e.dataTransfer.setData('text/plain', draggedIndex);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => this.classList.add('dragging'), 0);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    this.classList.remove('drag-over');

    if (draggedElement !== this) {
        const targetIndex = parseInt(this.dataset.index, 10);
        const itemToMove = selectedSongs.splice(draggedIndex, 1)[0];
        selectedSongs.splice(targetIndex, 0, itemToMove);
        updateSelectedList();
    }
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('#songList li').forEach(item => item.classList.remove('drag-over'));
    draggedElement = null;
    draggedIndex = -1;
}

function removeSongFromList(index) {
    if (index >= 0 && index < selectedSongs.length) {
        const removedSongTitle = selectedSongs[index].titulo;
        selectedSongs.splice(index, 1);
        updateSelectedList();
        showToast(`"${removedSongTitle}" removido`, 'info');
    }
}

function clearList() {
    if (selectedSongs.length === 0) return;
    if (confirm('Limpar toda a lista?')) {
        selectedSongs = [];
        updateSelectedList();
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
    const headerHeight = 140;
    const contentHeight = selectedSongs.length * lineHeight;
    const totalHeight = headerHeight + contentHeight + 20;

    canvas.width = width;
    canvas.height = totalHeight;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, totalHeight);

    ctx.fillStyle = '#1976D2';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('LISTA DE LOUVORES', width / 2, 40);

    ctx.fillStyle = '#666';
    ctx.font = '20px Arial';
    ctx.fillText(currentChurch, width / 2, 70);

    const formattedDate = formatDateForDisplay(listDate.value);
    ctx.fillText(formattedDate, width / 2, 95);

    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 110);
    ctx.lineTo(width - 50, 110);
    ctx.stroke();

    ctx.fillStyle = '#333';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Nº', 60, 135);
    ctx.fillText('TÍTULO', 150, 135);

    ctx.font = '18px Arial';
    selectedSongs.forEach((song, index) => {
        const y = headerHeight + 20 + (index * lineHeight);
        
        ctx.fillStyle = '#1976D2';
        ctx.font = 'bold 18px Arial';
        const displayNumber = song.numero ? (song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero) : '-';
        ctx.fillText(displayNumber, 60, y);

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
    const filename = `lista-louvores-${currentChurch.replace(/\s+/g, '-')}-${listDate.value}.png`;
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
                text: `Lista de ${currentChurch}`
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

    const dateStr = formatDateForDisplay(listDate.value);
    let message = `*LISTA DE LOUVORES*\n🏛️ ${currentChurch}\n📅 ${dateStr}\n\n`;

    selectedSongs.forEach((song) => {
        const displayNumber = song.numero ? (song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero) : '';
        
        if (displayNumber) {
            message += `${displayNumber} - ${song.titulo}\n`;
        } else {
            message += `${song.titulo}\n`;
        }
    });

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.location.href = whatsappUrl;
}

// --- Firebase ---
function saveList() {
    if (!window.firebaseDb || !dbRefLists) {
        showToast("Erro de conexão com Firebase", "error");
        return;
    }

    if (!currentChurch) {
        showToast("Erro: igreja não selecionada", "error");
        return;
    }

    if (selectedSongs.length === 0) {
        showToast("Adicione louvores à lista", "warning");
        return;
    }

    const newListData = {
        churchName: currentChurch,
        date: listDate.value,
        songs: selectedSongs,
        createdAt: new Date().toISOString()
    };

    const newListRef = window.firebaseDb.push(dbRefLists);

    window.firebaseDb.set(newListRef, newListData)
        .then(() => {
            showToast('Lista salva com sucesso!', 'success');
            loadChurchData();
        })
        .catch((error) => {
            console.error("Erro ao salvar:", error);
            showToast('Erro ao salvar lista', 'error');
        });
}

function updateSavedListsDisplay() {
    savedListsContainer.innerHTML = '';

    if (churchLists.length === 0) {
        savedListsContainer.innerHTML = '<div class="empty-message">Nenhuma lista salva ainda</div>';
        return;
    }

    churchLists.forEach(list => {
        renderSavedListItem(list);
    });
}

function renderSavedListItem(list) {
    const item = document.createElement('div');
    item.className = 'saved-list-item';
    
    const formattedListDate = formatDateForDisplay(list.date);
    const createdAtDate = list.createdAt ? new Date(list.createdAt) : null;
    const savedDateStr = createdAtDate ? createdAtDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Data indisponível';

    item.innerHTML = `
        <div class="saved-list-name">Lista de ${formattedListDate}</div>
        <div class="saved-list-info">
            🎵 ${list.songs.length} ${list.songs.length === 1 ? 'louvor' : 'louvores'}<br>
            <small>💾 Salvo em: ${savedDateStr}</small>
        </div>
        <div class="saved-list-actions">
            <button class="btn btn-primary btn-small load-list-btn">Carregar</button>
            <button class="btn btn-danger btn-small delete-list-btn">Excluir</button>
        </div>
    `;

    item.querySelector('.load-list-btn').addEventListener('click', () => loadList(list));
    item.querySelector('.delete-list-btn').addEventListener('click', () => deleteList(list.id));

    savedListsContainer.appendChild(item);
}

function loadList(listData) {
    if (listData && Array.isArray(listData.songs) && listData.date) {
        if (selectedSongs.length > 0) {
            if (!confirm('Carregar esta lista substituirá a lista atual. Continuar?')) {
                return;
            }
        }
        
        selectedSongs = JSON.parse(JSON.stringify(listData.songs));
        listDate.value = listData.date;
        updateSelectedList();
        showToast('Lista carregada', 'success');
        
        document.querySelector('.menu-item[data-section="searchSection"]').click();
    } else {
        showToast("Erro ao carregar lista", "error");
    }
}

function deleteList(listId) {
    if (!window.firebaseDb || !dbRefLists) {
        showToast("Erro de conexão", "error");
        return;
    }

    if (!confirm('Excluir esta lista permanentemente?')) {
        return;
    }

    const listToDeleteRef = window.firebaseDb.ref(window.firebaseDb.database, `lists/${listId}`);

    window.firebaseDb.remove(listToDeleteRef)
        .then(() => {
            showToast('Lista excluída', 'info');
            loadChurchData();
        })
        .catch((error) => {
            console.error("Erro ao excluir:", error);
            showToast('Erro ao excluir lista', 'error');
        });
}

// --- Relatórios ---
function generateReport() {
    reportContent.innerHTML = '';

    if (churchLists.length === 0) {
        reportContent.innerHTML = '<div class="empty-message">Nenhuma lista salva ainda para gerar relatórios</div>';
        return;
    }

    // Contar hinos
    const songCount = {};
    churchLists.forEach(list => {
        list.songs.forEach(song => {
            const key = `${song.origem}-${song.numero || song.titulo}`;
            if (!songCount[key]) {
                songCount[key] = {
                    song: song,
                    count: 0
                };
            }
            songCount[key].count++;
        });
    });

    const sortedSongs = Object.values(songCount).sort((a, b) => b.count - a.count);
    const top10 = sortedSongs.slice(0, 10);

    // Card Top 10
    const reportCard = document.createElement('div');
    reportCard.className = 'report-card';
    reportCard.innerHTML = '<h3>🏆 Top 10 Mais Cantados</h3>';

    if (top10.length === 0) {
        reportCard.innerHTML += '<div class="empty-message">Nenhum hino encontrado</div>';
    } else {
        const reportList = document.createElement('ul');
        reportList.className = 'report-list';

        top10.forEach((item, index) => {
            const song = item.song;
            const displayNumber = song.numero ? (song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero) : '';

            const reportItem = document.createElement('li');
            reportItem.className = 'report-item';
            reportItem.innerHTML = `
                <div class="report-song-info">
                    <span style="color: #999; margin-right: 8px;">${index + 1}.</span>
                    ${displayNumber ? `<span class="report-song-number">${displayNumber}</span>` : ''}
                    <span class="report-song-title">${song.titulo}</span>
                </div>
                <span class="report-count">${item.count}x</span>
            `;
            reportList.appendChild(reportItem);
        });

        reportCard.appendChild(reportList);
    }

    reportContent.appendChild(reportCard);

    // Card Estatísticas
    const statsCard = document.createElement('div');
    statsCard.className = 'report-card';
    statsCard.innerHTML = `
        <h3>📊 Estatísticas Gerais</h3>
        <div style="padding: 10px;">
            <p style="margin-bottom: 8px;"><strong>Total de listas:</strong> ${churchLists.length}</p>
            <p style="margin-bottom: 8px;"><strong>Hinos diferentes:</strong> ${Object.keys(songCount).length}</p>
            <p><strong>Total de louvores cantados:</strong> ${churchLists.reduce((sum, list) => sum + list.songs.length, 0)}</p>
        </div>
    `;

    reportContent.appendChild(statsCard);
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

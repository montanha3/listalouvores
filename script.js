// Estado da aplicação
let currentChurch = null;
let allSongs = [];
let selectedSongs = [];
let churchLists = [];
let customSongs = [];
let editingSongId = null;

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

// Gerenciar louvores
const newSongTitle = document.getElementById('newSongTitle');
const newSongNumber = document.getElementById('newSongNumber');
const newSongLyrics = document.getElementById('newSongLyrics');
const addCustomSongBtn = document.getElementById('addCustomSongBtn');
const customSongsContainer = document.getElementById('customSongsContainer');

// Modals
const imageModal = document.getElementById('imageModal');
const listCanvas = document.getElementById('listCanvas');
const downloadImageBtn = document.getElementById('downloadImageBtn');
const shareImageBtn = document.getElementById('shareImageBtn');
const editSongModal = document.getElementById('editSongModal');
const editSongTitle = document.getElementById('editSongTitle');
const editSongNumber = document.getElementById('editSongNumber');
const editSongLyrics = document.getElementById('editSongLyrics');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const reorderModal = document.getElementById('reorderModal');
const reorderList = document.getElementById('reorderList');
const saveReorderBtn = document.getElementById('saveReorderBtn');

// Referência Firebase
let dbRefLists = null;
let dbRefCustomSongs = null;

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    if (window.firebaseDb && window.firebaseDb.database) {
        try {
            dbRefLists = window.firebaseDb.ref(window.firebaseDb.database, 'lists');
            dbRefCustomSongs = window.firebaseDb.ref(window.firebaseDb.database, 'customSongs');
            console.log("Firebase inicializado");
        } catch (error) {
            console.error("Erro Firebase:", error);
            showToast("Erro ao conectar", "error");
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
        if (e.key === 'Enter') selectChurch();
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
            if (list.churchName) churches.add(list.churchName);
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
            if (list.churchName === churchName) count++;
        });

        if (count > 0) {
            churchStats.textContent = `${count} ${count === 1 ? 'lista salva' : 'listas salvas'}`;
            churchInfo.style.display = 'block';
        } else {
            churchInfo.style.display = 'none';
        }
    } catch (error) {
        console.error('Erro:', error);
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
    loadCustomSongs();
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
        console.error('Erro:', error);
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
                origem: origem,
                isCustom: false
            }));

        allSongs = [
            ...processSongs(igrejaData, 'Igreja'),
            ...processSongs(criancasData, 'CIAS'),
            ...processSongs(avulsosData, 'Avulsos')
        ];

        console.log(`${allSongs.length} louvores carregados`);
    } catch (error) {
        console.error('Erro:', error);
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
    
    addCustomSongBtn.addEventListener('click', addCustomSong);
    saveEditBtn.addEventListener('click', saveEditedSong);
    cancelEditBtn.addEventListener('click', () => editSongModal.classList.remove('show'));
    saveReorderBtn.addEventListener('click', saveReorder);

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
}

// --- Busca ---
function handleSearch(event) {
    const searchTerm = event.target.value.trim().toLowerCase();
    searchResults.innerHTML = '';
    
    if (searchTerm.length < 1) return;

    const selectedSource = document.querySelector('input[name="source"]:checked').value;
    const searchType = document.querySelector('input[name="searchType"]:checked').value;

    // Combina louvores padrão com personalizados
    const allSongsWithCustom = [...allSongs, ...customSongs];

    let results = [];

    if (searchType === 'number') {
        results = allSongsWithCustom.filter(song => {
            const numero = song.numero.toLowerCase();
            return numero && numero.includes(searchTerm);
        });
    } else {
        results = allSongsWithCustom.filter(song => {
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
        } else if (!isNaN(numA)) return -1;
        else if (!isNaN(numB)) return 1;
        return a.titulo.localeCompare(b.titulo);
    });

    displaySearchResults(results.slice(0, 5), selectedSource);
}

function displaySearchResults(results, selectedSource) {
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="empty-message">Nenhum louvor encontrado</div>';
        return;
    }

    const showOrigin = selectedSource === 'Todas';

    results.forEach(song => {
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
}

/**
 * Verifica se o louvor foi cantado nos últimos 5 dias.
 * Agora usa confirm() para perguntar ao usuário se deseja adicionar.
 * Retorna 'true' se o usuário confirmar ou se não for recente.
 * Retorna 'false' se o usuário cancelar.
 */
function checkRecentSong(songData) {
    if (!currentChurch || churchLists.length === 0) return true; // Se não há listas, permitir adicionar

    const currentDate = new Date(listDate.value);
    // CORREÇÃO 1: Ajustado para 5 dias atrás
    const fiveDaysAgo = new Date(currentDate);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5); 

    // CORREÇÃO 2: Comparação em minúsculas para títulos
    const songId = `${songData.origem}-${songData.numero || songData.titulo.toLowerCase()}`;

    for (const list of churchLists) {
        const listDateObj = new Date(list.date);
        // CORREÇÃO 1 (cont.): Usando a data correta
        if (listDateObj >= fiveDaysAgo && listDateObj < currentDate) {
            
            // CORREÇÃO 2 (cont.): Comparação em minúsculas
            const hasSong = list.songs.some(song => 
                `${song.origem}-${song.numero || song.titulo.toLowerCase()}` === songId
            );
            
            if (hasSong) {
                const daysAgo = Math.floor((currentDate - listDateObj) / (1000 * 60 * 60 * 24));
                const formattedDate = formatDateForDisplay(list.date);
                
                const dayText = daysAgo === 0 ? 'hoje' : daysAgo === 1 ? 'ontem' : `há ${daysAgo} dias`;
                
                // MUDANÇA SOLICITADA: Usar confirm()
                const confirmation = confirm(
                    `ATENÇÃO: Este louvor foi cantado ${dayText} (${formattedDate}).\n\nDeseja adicionar mesmo assim?`
                );
                return confirmation; // Retorna true (adiciona) ou false (cancela)
            }
        }
    }

    return true; // Não encontrou em listas recentes, permitir adicionar
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

    // Agora esta verificação pode retornar 'false' se o usuário cancelar
    if (!checkRecentSong(songData)) {
        return; // Usuário cancelou a adição do louvor recente
    }
    
    selectedSongs.push(songData);
    updateSelectedList();
    searchInput.value = '';
    searchResults.innerHTML = '';
    showToast(`"${songData.titulo}" adicionado`, 'success');
}

function updateSelectedList() {
    songList.innerHTML = '';
    const count = selectedSongs.length;
    songCounter.textContent = `${count} ${count === 1 ? 'louvor' : 'louvores'}`;

    // Remove botão anterior se existir
    const existingReorderBtn = document.getElementById('reorderBtn');
    if (existingReorderBtn) {
        existingReorderBtn.remove();
    }

    if (count === 0) {
        songList.innerHTML = '<div class="empty-message">Busque e adicione louvores</div>';
        exportSection.style.display = 'none';
        return;
    }

    exportSection.style.display = 'block';

    // Botão de reordenar se houver mais de 1
    if (count > 1) {
        const reorderBtn = document.createElement('button');
        reorderBtn.id = 'reorderBtn';
        reorderBtn.className = 'btn btn-secondary';
        reorderBtn.style.marginBottom = '10px';
        reorderBtn.innerHTML = '🔄 Reordenar Lista';
        reorderBtn.addEventListener('click', openReorderModal);
        songList.parentElement.insertBefore(reorderBtn, songList);
    }

    selectedSongs.forEach((song, index) => {
        const listItem = document.createElement('li');
        
        const displayNumber = song.numero ? (song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero) : '';
        const originSpan = song.origem !== 'Igreja' ? `<span style="font-size:0.7rem;color:#999;margin-left:4px;">(${song.origem})</span>` : '';

        listItem.innerHTML = `
            <div class="song-info">
                ${displayNumber ? `<span class="song-number">${displayNumber}</span>` : '<span class="song-number no-number"></span>'}
                <span class="song-title">${song.titulo}</span>
                ${originSpan}
            </div>
            <button class="remove-btn" data-index="${index}">&times;</button>
        `;

        listItem.querySelector('.remove-btn').addEventListener('click', () => {
            removeSongFromList(index);
        });

        songList.appendChild(listItem);
    });
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

// --- Reordenar ---
function openReorderModal() {
    reorderList.innerHTML = '';
    
    selectedSongs.forEach((song, index) => {
        const listItem = document.createElement('li');
        listItem.dataset.index = index;
        
        const displayNumber = song.numero ? (song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero) : '';
        
        listItem.textContent = `${displayNumber ? displayNumber + ' - ' : ''}${song.titulo}`;
        
        listItem.addEventListener('touchstart', handleReorderTouchStart, { passive: false });
        listItem.addEventListener('touchmove', handleReorderTouchMove, { passive: false });
        listItem.addEventListener('touchend', handleReorderTouchEnd);
        
        reorderList.appendChild(listItem);
    });
    
    reorderModal.classList.add('show');
}

let reorderDraggedElement = null;
let reorderDraggedIndex = -1;
let reorderTouchStartY = 0;

function handleReorderTouchStart(e) {
    reorderDraggedElement = this;
    reorderDraggedIndex = parseInt(this.dataset.index, 10);
    reorderTouchStartY = e.touches[0].clientY;
    this.classList.add('dragging');
}

function handleReorderTouchMove(e) {
    if (!reorderDraggedElement) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const currentY = touch.clientY;
    
    const items = Array.from(reorderList.children);
    items.forEach(item => item.classList.remove('drag-over'));
    
    items.forEach(item => {
        if (item === reorderDraggedElement) return;
        const rect = item.getBoundingClientRect();
        if (currentY > rect.top && currentY < rect.bottom) {
            item.classList.add('drag-over');
        }
    });
}

function handleReorderTouchEnd(e) {
    if (!reorderDraggedElement) return;
    
    const items = Array.from(reorderList.children);
    const dragOverItem = items.find(item => item.classList.contains('drag-over'));
    
    if (dragOverItem && reorderDraggedElement !== dragOverItem) {
        const targetIndex = parseInt(dragOverItem.dataset.index, 10);
        const itemToMove = selectedSongs.splice(reorderDraggedIndex, 1)[0];
        selectedSongs.splice(targetIndex, 0, itemToMove);
    }
    
    items.forEach(item => {
        item.classList.remove('dragging');
        item.classList.remove('drag-over');
    });
    
    reorderDraggedElement = null;
    reorderDraggedIndex = -1;
    
    openReorderModal();
}

function saveReorder() {
    reorderModal.classList.remove('show');
    updateSelectedList();
    showToast('Ordem salva', 'success');
}

// --- Louvores Personalizados ---
async function loadCustomSongs() {
    if (!window.firebaseDb || !dbRefCustomSongs || !currentChurch) return;

    try {
        const snapshot = await window.firebaseDb.get(dbRefCustomSongs);
        customSongs = [];

        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const song = child.val();
                if (song.churchName === currentChurch) {
                    song.id = child.key;
                    song.isCustom = true;
                    customSongs.push(song);
                }
            });
        }

        displayCustomSongs();
    } catch (error) {
        console.error('Erro:', error);
    }
}

function addCustomSong() {
    const title = newSongTitle.value.trim();
    
    if (!title) {
        showToast('Digite o título do louvor', 'warning');
        newSongTitle.focus();
        return;
    }

    const newSong = {
        titulo: title,
        numero: newSongNumber.value.trim(),
        letra: newSongLyrics.value.trim(),
        origem: document.querySelector('input[name="newSongType"]:checked').value,
        churchName: currentChurch,
        createdAt: new Date().toISOString()
    };

    const newSongRef = window.firebaseDb.push(dbRefCustomSongs);
    
    window.firebaseDb.set(newSongRef, newSong)
        .then(() => {
            showToast('Louvor adicionado!', 'success');
            newSongTitle.value = '';
            newSongNumber.value = '';
            newSongLyrics.value = '';
            loadCustomSongs();
        })
        .catch(error => {
            console.error('Erro:', error);
            showToast('Erro ao adicionar', 'error');
        });
}

function displayCustomSongs() {
    customSongsContainer.innerHTML = '';

    if (customSongs.length === 0) {
        customSongsContainer.innerHTML = '<div class="empty-message">Nenhum louvor personalizado</div>';
        return;
    }

    customSongs.forEach(song => {
        const item = document.createElement('div');
        item.className = 'custom-song-item';
        
        const displayNumber = song.numero ? ` - Nº ${song.numero}` : '';
        
        item.innerHTML = `
            <div class="custom-song-header">
                <span class="custom-song-title">${song.titulo}${displayNumber}</span>
                <div class="custom-song-actions">
                    <button class="btn btn-primary btn-small edit-custom-btn">Editar</button>
                    <button class="btn btn-danger btn-small delete-custom-btn">Excluir</button>
                </div>
            </div>
            <div class="custom-song-info">
                📚 ${song.origem}
                ${song.letra ? ' • 📝 Com letra' : ''}
            </div>
        `;

        item.querySelector('.edit-custom-btn').addEventListener('click', () => editCustomSong(song));
        item.querySelector('.delete-custom-btn').addEventListener('click', () => deleteCustomSong(song.id, song.titulo));

        customSongsContainer.appendChild(item);
    });
}

function editCustomSong(song) {
    editingSongId = song.id;
    editSongTitle.value = song.titulo;
    editSongNumber.value = song.numero || '';
    editSongLyrics.value = song.letra || '';
    editSongModal.classList.add('show');
}

function saveEditedSong() {
    if (!editingSongId) return;

    const title = editSongTitle.value.trim();
    if (!title) {
        showToast('Digite o título', 'warning');
        return;
    }

    const updateData = {
        titulo: title,
        numero: editSongNumber.value.trim(),
        letra: editSongLyrics.value.trim()
    };

    const songRef = window.firebaseDb.ref(window.firebaseDb.database, `customSongs/${editingSongId}`);
    
    window.firebaseDb.update(songRef, updateData)
        .then(() => {
            showToast('Louvor atualizado!', 'success');
            editSongModal.classList.remove('show');
            editingSongId = null;
            loadCustomSongs();
        })
        .catch(error => {
            console.error('Erro:', error);
            showToast('Erro ao atualizar', 'error');
        });
}

function deleteCustomSong(songId, songTitle) {
    if (!confirm(`Excluir "${songTitle}"?`)) return;

    const songRef = window.firebaseDb.ref(window.firebaseDb.database, `customSongs/${songId}`);
    
    window.firebaseDb.remove(songRef)
        .then(() => {
            showToast('Louvor excluído', 'info');
            loadCustomSongs();
        })
        .catch(error => {
            console.error('Erro:', error);
            showToast('Erro ao excluir', 'error');
        });
}

// --- Exportação ---
function generateImage() {
    if (selectedSongs.length === 0) {
        showToast("Adicione louvores", "warning");
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
    const filename = `lista-${currentChurch.replace(/\s+/g, '-')}-${listDate.value}.png`;
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
                showToast('Erro ao compartilhar', 'error');
            });
        } else {
            showToast('Use "Baixar"', 'warning');
        }
    });
}

function sendViaWhatsApp() {
    if (selectedSongs.length === 0) {
        showToast("Adicione louvores", "warning");
        return;
    }

    const dateStr = formatDateForDisplay(listDate.value);
    let message = `*LISTA DE LOUVORES*\n🏛️ ${currentChurch}\n📅 ${dateStr}\n\n`;

    selectedSongs.forEach((song) => {
        let prefix = '';
        
        if (song.origem === 'Avulsos' && !song.numero) {
            prefix = '*Avulso*';
        } else if (song.numero) {
            const displayNumber = song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero;
            prefix = `*${displayNumber}*`;
        } else {
            prefix = '*—*';
        }
        
        message += `${prefix} - ${song.titulo}\n`;
    });

    const encodedMessage = encodeURIComponent(message);
    window.location.href = `https://wa.me/?text=${encodedMessage}`;
}

// --- Firebase ---
function saveList() {
    if (!window.firebaseDb || !dbRefLists || !currentChurch) {
        showToast("Erro de conexão", "error");
        return;
    }

    if (selectedSongs.length === 0) {
        showToast("Adicione louvores", "warning");
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
            showToast('Lista salva!', 'success');
            loadChurchData();
        })
        .catch(error => {
            console.error("Erro:", error);
            showToast('Erro ao salvar', 'error');
        });
}

function updateSavedListsDisplay() {
    savedListsContainer.innerHTML = '';

    if (churchLists.length === 0) {
        savedListsContainer.innerHTML = '<div class="empty-message">Nenhuma lista salva</div>';
        return;
    }

    churchLists.forEach(list => {
        const item = document.createElement('div');
        item.className = 'saved-list-item';
        
        const formattedDate = formatDateForDisplay(list.date);
        const savedDate = list.createdAt ? new Date(list.createdAt).toLocaleDateString('pt-BR') : '';

        item.innerHTML = `
            <div class="saved-list-name">Lista de ${formattedDate}</div>
            <div class="saved-list-info">
                🎵 ${list.songs.length} louvores<br>
                <small>💾 Salvo: ${savedDate}</small>
            </div>
            <div class="saved-list-actions">
                <button class="btn btn-primary btn-small load-btn">Carregar</button>
                <button class="btn btn-danger btn-small delete-btn">Excluir</button>
            </div>
        `;

        item.querySelector('.load-btn').addEventListener('click', () => loadList(list));
        item.querySelector('.delete-btn').addEventListener('click', () => deleteList(list.id));

        savedListsContainer.appendChild(item);
    });
}

function loadList(listData) {
    if (selectedSongs.length > 0) {
        if (!confirm('Carregar lista substituirá a atual. Continuar?')) return;
    }
    
    selectedSongs = JSON.parse(JSON.stringify(listData.songs));
    listDate.value = listData.date;
    updateSelectedList();
    showToast('Lista carregada', 'success');
    
    document.querySelector('.menu-item[data-section="searchSection"]').click();
}

function deleteList(listId) {
    if (!confirm('Excluir lista?')) return;

    const listRef = window.firebaseDb.ref(window.firebaseDb.database, `lists/${listId}`);

    window.firebaseDb.remove(listRef)
        .then(() => {
            showToast('Lista excluída', 'info');
            loadChurchData();
        })
        .catch(error => {
            console.error("Erro:", error);
            showToast('Erro ao excluir', 'error');
        });
}

// --- Relatórios ---
function generateReport() {
    reportContent.innerHTML = '';

    if (churchLists.length === 0) {
        reportContent.innerHTML = '<div class="empty-message">Nenhuma lista para relatórios</div>';
        return;
    }

    // Separar contagem por origem
    const songCountByOrigin = {
        'Igreja': {},
        'CIAS': {},
        'Avulsos': {}
    };

    churchLists.forEach(list => {
        list.songs.forEach(song => {
            const origin = song.origem;
            const key = `${song.origem}-${song.numero || song.titulo}`;
            
            if (!songCountByOrigin[origin][key]) {
                songCountByOrigin[origin][key] = { song: song, count: 0 };
            }
            songCountByOrigin[origin][key].count++;
        });
    });

    // Criar Top 5 para cada categoria
    const categories = [
        { name: 'Igreja', icon: '⛪', color: '#2196F3' },
        { name: 'CIAS', icon: '👶', color: '#FF9800' },
        { name: 'Avulsos', icon: '📝', color: '#4CAF50' }
    ];

    categories.forEach(category => {
        const songs = Object.values(songCountByOrigin[category.name]);
        
        if (songs.length === 0) return; // Pula se não houver músicas desta categoria
        
        const sortedSongs = songs.sort((a, b) => b.count - a.count);
        const top5 = sortedSongs.slice(0, 5);

        const reportCard = document.createElement('div');
        reportCard.className = 'report-card';
        reportCard.innerHTML = `<h3 style="color: ${category.color}">${category.icon} Top 5 ${category.name}</h3>`;

        const reportList = document.createElement('ul');
        reportList.className = 'report-list';

        top5.forEach((item, index) => {
            const song = item.song;
            const displayNumber = song.numero ? 
                (song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero) : '';

            const reportItem = document.createElement('li');
            reportItem.className = 'report-item';
            reportItem.innerHTML = `
                <div class="report-song-info">
                    <span style="color: #999; margin-right: 8px;">${index + 1}.</span>
                    ${displayNumber ? `<span class="report-song-number">${displayNumber}</span>` : ''}
                    <span class="report-song-title">${song.titulo}</span>
                </div>
                <span class="report-count" style="background: ${category.color}">${item.count}x</span>
            `;
            reportList.appendChild(reportItem);
        });

        reportCard.appendChild(reportList);
        reportContent.appendChild(reportCard);
    });

    // Card Estatísticas Gerais
    const totalSongs = Object.values(songCountByOrigin).reduce((sum, origin) => 
        sum + Object.keys(origin).length, 0
    );

    const statsCard = document.createElement('div');
    statsCard.className = 'report-card';
    statsCard.innerHTML = `
        <h3>📊 Estatísticas Gerais</h3>
        <div style="padding: 10px;">
            <p style="margin-bottom: 8px;"><strong>Total de listas:</strong> ${churchLists.length}</p>
            <p style="margin-bottom: 8px;"><strong>Hinos diferentes:</strong> ${totalSongs}</p>
            <p style="margin-bottom: 8px;"><strong>Igreja:</strong> ${Object.keys(songCountByOrigin['Igreja']).length} hinos</p>
            <p style="margin-bottom: 8px;"><strong>CIAS:</strong> ${Object.keys(songCountByOrigin['CIAS']).length} hinos</p>
            <p style="margin-bottom: 8px;"><strong>Avulsos:</strong> ${Object.keys(songCountByOrigin['Avulsos']).length} hinos</p>
            <p><strong>Total cantados:</strong> ${churchLists.reduce((sum, list) => sum + list.songs.length, 0)}</p>
        </div>
    `;

    reportContent.appendChild(statsCard);
}

// --- Auxiliares ---
function formatDateForDisplay(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function showToast(message, type = 'success', duration = 3000) {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 500);
    }, duration);
}

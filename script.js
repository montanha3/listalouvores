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
const exportTextBtn = document.getElementById('exportTextBtn'); // Botão agora envia para WhatsApp
const exportLyricsBtn = document.getElementById('exportLyricsBtn'); // Botão agora copia letras individuais formatadas
const saveListBtn = document.getElementById('saveListBtn');
const listNameInput = document.getElementById('listNameInput');
const savedListsContainer = document.getElementById('savedListsContainer');

// Modals
const imageModal = document.getElementById('imageModal');
const lyricsModal = document.getElementById('lyricsModal');
const listCanvas = document.getElementById('listCanvas');
const downloadImageBtn = document.getElementById('downloadImageBtn');
const shareImageBtn = document.getElementById('shareImageBtn'); // Compartilha a IMAGEM
const lyricsListContainer = document.getElementById('lyricsListContainer');

// Drag and drop state
let draggedElement = null;

// Referência Firebase (inicializada como null)
let dbRefSavedLists = null;

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa a referência do Firebase APÓS o script do index.html ter sido carregado
    if (window.firebaseDb && window.firebaseDb.database) {
        try {
            dbRefSavedLists = window.firebaseDb.ref(window.firebaseDb.database, 'savedLists');
            console.log("Referência Firebase 'savedLists' inicializada.");
        } catch (error) {
            console.error("Erro ao inicializar referência Firebase:", error);
            showToast("Erro ao conectar com a base de dados.", "error");
        }
    } else {
        console.error("Firebase DB não foi encontrado no objeto window! Verifique o script no index.html.");
        showToast("Erro crítico: Firebase não carregado. Funcionalidades de salvar/carregar desabilitadas.", "error");
        // Desabilitar botões de salvar/carregar se o Firebase falhar
        saveListBtn.disabled = true;
        listNameInput.disabled = true;
        savedListsContainer.innerHTML = '<div class="empty-message">Erro ao conectar com Firebase. Funcionalidade indisponível.</div>';
    }

    loadSongs(); // Carrega os JSONs locais
    setupEventListeners();
    setTodayDate();
    updateSelectedList(); // Renderiza a lista inicial (vazia)
    loadSavedLists(); // Tenta carregar do Firebase (se inicializado)
});

// --- Funções Básicas ---
function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    listDate.value = today;
}

async function loadSongs() {
    try {
        const [igrejaResponse, criancasResponse, avulsosResponse] = await Promise.all([
            fetch('coletanea_igrejas.json').catch(e => { console.error('Falha ao buscar coletanea_igrejas.json', e); return { ok: false }; }),
            fetch('coletanea_criancas.json').catch(e => { console.error('Falha ao buscar coletanea_criancas.json', e); return { ok: false }; }),
            fetch('louvores_avulsos.json').catch(e => { console.error('Falha ao buscar louvores_avulsos.json', e); return { ok: false }; })
        ]);

        if (!igrejaResponse.ok || !criancasResponse.ok || !avulsosResponse.ok) {
            throw new Error('Erro ao carregar um ou mais arquivos JSON de louvores.');
        }

        const igrejaData = await igrejaResponse.json();
        const criancasData = await criancasResponse.json();
        const avulsosData = await avulsosResponse.json();

        // Processa garantindo que numero seja string e tratando itens sem número (avulsos)
        const processSongs = (data, origem) => data
            .filter(song => song.titulo && (song.numero !== "" || origem === 'Avulsos')) // Ignora cabeçalhos, permite avulsos sem número
            .map(song => ({
                ...song,
                numero: String(song.numero || ''), // Garante que numero é string, vazio se não existir
                origem: origem
            }));

        const igrejaSongs = processSongs(igrejaData, 'Igreja');
        const criancasSongs = processSongs(criancasData, 'CIAS');
        const avulsosSongs = processSongs(avulsosData, 'Avulsos'); // Avulsos já são filtrados por título

        allSongs = [...igrejaSongs, ...criancasSongs, ...avulsosSongs];

        console.log(`Total: ${allSongs.length} louvores carregados.`);

    } catch (error) {
        console.error('Erro detalhado ao carregar louvores:', error);
        showToast(`Erro ao carregar coletâneas: ${error.message}`, 'error');
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    searchInput.addEventListener('input', handleSearch);
    clearListBtn.addEventListener('click', clearList);

    // Listener para tipo de exportação (títulos vs letras)
    document.querySelectorAll('input[name="exportType"]').forEach(radio => {
        radio.addEventListener('change', handleExportTypeChange);
    });

    // Botões de exportação
    exportImageBtn.addEventListener('click', generateImage);
    exportTextBtn.addEventListener('click', sendViaWhatsApp); // Ação modificada
    exportLyricsBtn.addEventListener('click', showLyricsModal); // Copiar letras individuais

    // Salvar/Carregar via Firebase
    saveListBtn.addEventListener('click', saveList);

    // Fechar Modals
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('show'); // Fecha o modal pai do botão
        });
    });
    // Fechar clicando fora
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });

    // Ações do Modal de Imagem
    downloadImageBtn.addEventListener('click', downloadImage);
    shareImageBtn.addEventListener('click', shareImageOnWhatsApp); // Ação específica para compartilhar IMAGEM
}

// Atualiza a visibilidade do botão de letras individuais
function handleExportTypeChange() {
    const exportType = document.querySelector('input[name="exportType"]:checked').value;
    exportLyricsBtn.style.display = (exportType === 'lyrics') ? 'inline-flex' : 'none';
    // Renomeia o botão principal para clareza
    exportTextBtn.innerHTML = (exportType === 'lyrics')
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-whatsapp" viewBox="0 0 16 16">...</svg> Enviar Tudo (WhatsApp)`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-whatsapp" viewBox="0 0 16 16">...</svg> Enviar Títulos (WhatsApp)`;
     // Esconde o botão de cópia individual se for só títulos
     exportLyricsBtn.style.display = (exportType === 'lyrics') ? 'inline-flex' : 'none';
}

// --- Funções de Busca e Manipulação da Lista ---
function handleSearch(event) {
    const searchTerm = event.target.value.trim().toLowerCase();
    searchResults.innerHTML = ''; // Limpa sempre
    if (searchTerm.length < 2 && !/^\d+$/.test(searchTerm)) { // Busca só com 2+ letras ou se for número
        return;
    }

    const selectedSource = document.querySelector('input[name="source"]:checked').value;

    let results = allSongs.filter(song => {
        const numero = song.numero.toLowerCase();
        const titulo = song.titulo.toLowerCase();
        // Permite busca por número OU título
        return (numero && numero.includes(searchTerm)) || titulo.includes(searchTerm);
    });

    if (selectedSource !== 'Todas') {
        results = results.filter(song => song.origem === selectedSource);
    }

    // Ordena resultados: primeiro por número (se houver), depois por título
    results.sort((a, b) => {
        const numA = parseInt(a.numero, 10);
        const numB = parseInt(b.numero, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
            if (numA !== numB) return numA - numB;
        } else if (!isNaN(numA)) {
            return -1; // Números vêm antes de avulsos sem número
        } else if (!isNaN(numB)) {
            return 1;
        }
        // Se ambos não têm número ou têm o mesmo número, ordena por título
        return a.titulo.localeCompare(b.titulo);
    });


    displaySearchResults(results, selectedSource);
}

function displaySearchResults(results, selectedSource) {
    searchResults.innerHTML = ''; // Garante limpeza
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="empty-message">Nenhum louvor encontrado</div>';
        searchResults.style.display = 'block'; // Mostra a mensagem
        return;
    }

    const limitedResults = results.slice(0, 50); // Limita para performance
    const showOrigin = selectedSource === 'Todas';

    limitedResults.forEach(song => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        // Formata número corretamente (CIAS ou normal, ou vazio para avulsos sem número)
        const displayNumber = song.numero ? (song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero) : '';

        // Monta o HTML do item de resultado
        let displayText = '';
        if (displayNumber) {
            displayText += `<span class="song-number">${displayNumber}</span>`;
        }
        // Mostra origem se busca for 'Todas' E a origem não for 'Igreja' (para simplificar)
        if (showOrigin && song.origem !== 'Igreja') {
             displayText += `<span class="song-origin">(${song.origem})</span>`;
        }
        displayText += `<span class="song-title">${song.titulo}</span>`;

        resultItem.innerHTML = displayText;
        resultItem.addEventListener('click', () => addSongToList(song));
        searchResults.appendChild(resultItem);
    });

    if (results.length > 50) {
        const moreMessage = document.createElement('div');
        moreMessage.className = 'empty-message';
        moreMessage.textContent = `Mostrando 50 de ${results.length} resultados. Refine sua busca.`;
        searchResults.appendChild(moreMessage);
    }
    searchResults.style.display = 'block'; // Garante que a div de resultados seja visível
}

function addSongToList(songData) {
    // ID único considera origem + (número OU título se não houver número)
    const uniqueId = `${songData.origem}-${songData.numero || songData.titulo.toLowerCase()}`;
    const isDuplicate = selectedSongs.some(song => `${song.origem}-${song.numero || song.titulo.toLowerCase()}` === uniqueId);

    if (isDuplicate) {
        showToast('Este louvor já está na lista!', 'warning');
        return;
    }
    selectedSongs.push(songData);
    updateSelectedList();
    searchInput.value = '';
    searchResults.innerHTML = '';
    searchResults.style.display = 'none'; // Esconde resultados após adicionar
    showToast(`"${songData.titulo}" adicionado!`, 'success');
}

function updateSelectedList() {
    songList.innerHTML = '';
    const count = selectedSongs.length;
    songCounter.textContent = `${count} ${count === 1 ? 'louvor' : 'louvores'}`;

    if (count === 0) {
        songList.innerHTML = '<div class="empty-message">Nenhum louvor selecionado<br>Busque acima e clique para adicionar</div>';
        exportSection.style.display = 'none'; // Esconde opções de exportação
        return;
    }

    exportSection.style.display = 'block'; // Mostra opções de exportação

    selectedSongs.forEach((song, index) => {
        const listItem = document.createElement('li');
        listItem.draggable = true;
        listItem.dataset.index = index; // Guarda o índice para drag and drop e remoção
        // Formata número ou deixa vazio
        const displayNumber = song.numero ? (song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero) : '';

        // Inclui origem (exceto 'Igreja') de forma sutil na lista principal
        const originSpan = song.origem !== 'Igreja' ? `<span class="song-origin-list">(${song.origem})</span>` : '';

        listItem.innerHTML = `
            <div class="song-info">
                ${displayNumber ? `<span class="song-number">${displayNumber}</span>` : '<span class="song-number no-number"></span>'}
                <span class="song-title">${song.titulo}</span>
                ${originSpan}
            </div>
            <div class="list-actions">
                <button class="btn btn-danger btn-small remove-btn" data-index="${index}" title="Remover">&times;</button> </div>
        `;

        // Adiciona listeners de drag and drop
        listItem.addEventListener('dragstart', handleDragStart);
        listItem.addEventListener('dragover', handleDragOver); // Precisa do over para o drop funcionar
        listItem.addEventListener('drop', handleDrop);
        listItem.addEventListener('dragend', handleDragEnd);

        // Listener para o botão de remover
        listItem.querySelector('.remove-btn').addEventListener('click', (e) => {
            // Impedir que o drag comece ao clicar no botão
            e.stopPropagation();
            removeSongFromList(index);
        });

        songList.appendChild(listItem);
    });
}


// --- Funções Drag and Drop ---
function handleDragStart(e) {
    draggedElement = this;
    // Define o dado sendo arrastado (índice)
    e.dataTransfer.setData('text/plain', this.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
    // Adiciona classe para feedback visual (opcional)
    setTimeout(() => this.classList.add('dragging'), 0); // Timeout para garantir que a classe seja aplicada após o início do drag
}

function handleDragOver(e) {
    e.preventDefault(); // Necessário para permitir o drop
    e.dataTransfer.dropEffect = 'move';
    // Adiciona feedback visual sobre onde o item será solto (opcional)
    this.classList.add('drag-over');
}

// Adiciona um listener para remover a classe 'drag-over' quando o item sai da área
songList.addEventListener('dragleave', (e) => {
    if (e.target.tagName === 'LI') {
        e.target.classList.remove('drag-over');
    }
});

function handleDrop(e) {
    e.preventDefault(); // Previne comportamento padrão
    e.stopPropagation(); // Previne que o evento suba para elementos pais

    this.classList.remove('drag-over'); // Remove feedback visual

    if (draggedElement !== this) {
        // Pega o índice do item arrastado (do dataTransfer)
        const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        // Pega o índice do item onde soltou (do dataset do elemento)
        const targetIndex = parseInt(this.dataset.index, 10);

        // Remove o item da posição original e insere na nova posição
        const itemToMove = selectedSongs.splice(draggedIndex, 1)[0];
        selectedSongs.splice(targetIndex, 0, itemToMove);

        // Re-renderiza a lista com a nova ordem
        updateSelectedList();
    }
}

function handleDragEnd(e) {
    // Remove a classe de feedback visual
    this.classList.remove('dragging');
    // Limpa a referência ao elemento arrastado
    draggedElement = null;
    // Remove a classe de feedback visual de todos os itens (garantia)
    document.querySelectorAll('#songList li').forEach(item => item.classList.remove('drag-over'));
}


function removeSongFromList(index) {
    if (index >= 0 && index < selectedSongs.length) {
        const removedSongTitle = selectedSongs[index].titulo;
        selectedSongs.splice(index, 1);
        updateSelectedList(); // Re-renderiza a lista
        showToast(`"${removedSongTitle}" removido`, 'info');
    } else {
        console.error("Índice inválido para remoção:", index);
    }
}

function clearList() {
    if (selectedSongs.length === 0) return; // Não faz nada se a lista já está vazia
    if (confirm('Deseja realmente limpar toda a lista selecionada?')) {
        selectedSongs = [];
        updateSelectedList();
        showToast('Lista limpa', 'info');
    }
}

// --- Funções de Exportação ---

// Gerar Imagem (Canvas)
function generateImage() {
    if (selectedSongs.length === 0) {
        showToast("Adicione louvores à lista antes de gerar a imagem.", "warning");
        return;
    }
    // Lógica de desenho no canvas (mantida da resposta anterior)
    const canvas = listCanvas;
    const ctx = canvas.getContext('2d');
    const width = 800;
    const lineHeight = 45; // Um pouco menos espaço vertical
    const headerHeight = 120; // Espaço para Título, Data, Linha, Cabeçalho da Tabela
    const contentHeight = selectedSongs.length * lineHeight;
    const totalHeight = headerHeight + contentHeight + 20; // Pequena margem inferior

    canvas.width = width;
    canvas.height = totalHeight;

    // Fundo branco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, totalHeight);

    // Cabeçalho Principal
    ctx.fillStyle = '#333333'; // Cor escura para texto
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('LOUVORES', 30, 45);

    // Data
    const formattedDate = formatDateForDisplay(listDate.value);
    ctx.font = '22px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Data: ${formattedDate}`, width - 30, 45);

    // Linha separadora
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 75);
    ctx.lineTo(width - 20, 75);
    ctx.stroke();

    // Cabeçalho da Tabela
    ctx.fillStyle = '#E0E0E0'; // Cinza claro para fundo do cabeçalho
    ctx.fillRect(20, 80, width - 40, 40); // Desenha o retângulo do cabeçalho
    ctx.fillStyle = '#000000'; // Cor preta para o texto do cabeçalho
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Nº', 100, 100); // Posição X ajustada
    ctx.fillText('Nome do Hino', (width + 160) / 2, 100); // Posição X ajustada

    // Linha vertical do cabeçalho
    ctx.beginPath();
    ctx.moveTo(160, 80); // Ajuste X
    ctx.lineTo(160, 120);
    ctx.stroke();

    // Linha inferior do cabeçalho
    ctx.beginPath();
    ctx.moveTo(20, 120);
    ctx.lineTo(width - 20, 120);
    ctx.stroke();

    // Conteúdo da Lista (Itens)
    ctx.font = '16px Arial'; // Fonte menor para os itens
    ctx.fillStyle = '#333333';
    ctx.textBaseline = 'middle'; // Garante alinhamento vertical

    selectedSongs.forEach((song, index) => {
        const yBase = 120 + (index * lineHeight);
        const yText = yBase + lineHeight / 2;

        // Linhas horizontais entre itens
        if (index > 0) {
            ctx.strokeStyle = '#DDDDDD'; // Linha mais clara
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(20, yBase);
            ctx.lineTo(width - 20, yBase);
            ctx.stroke();
        }

        // Linha vertical entre colunas
        ctx.strokeStyle = '#AAAAAA'; // Linha média
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(160, yBase); // Ajuste X
        ctx.lineTo(160, yBase + lineHeight);
        ctx.stroke();

        // Número
        const displayNumber = song.numero ? (song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero) : '';
        ctx.textAlign = 'center';
        if (displayNumber) {
            ctx.fillText(displayNumber, 90, yText); // Ajuste X
        }

        // Título (truncado se necessário)
        ctx.textAlign = 'left';
        const titulo = song.titulo.toUpperCase(); // Mantém maiúsculo
        const maxTitleWidth = width - 160 - 30 - 10; // Coluna Nº - Margem Direita - Espaçamento
        const shortTitle = truncateText(ctx, titulo, maxTitleWidth);
        ctx.fillText(shortTitle, 175, yText); // Ajuste X
    });

     // Linha inferior do último item
    const lastY = 120 + selectedSongs.length * lineHeight;
    ctx.strokeStyle = '#DDDDDD';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, lastY);
    ctx.lineTo(width - 20, lastY);
    ctx.stroke();

    // Bordas externas da tabela (opcional, mas dá acabamento)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 80, width - 40, contentHeight + 40); // Retângulo englobando cabeçalho e itens


    imageModal.classList.add('show'); // Mostra o modal com o canvas
}


// Truncar texto para caber no Canvas
function truncateText(ctx, text, maxWidth) {
    let width = ctx.measureText(text).width;
    const ellipsis = '...';
    const ellipsisWidth = ctx.measureText(ellipsis).width;
    if (width <= maxWidth || width <= ellipsisWidth) {
        return text;
    }
    let len = text.length;
    // Reduz o texto até caber com a elipse
    while (width >= maxWidth - ellipsisWidth && len-- > 0) {
        text = text.slice(0, len);
        width = ctx.measureText(text).width;
    }
    return text + ellipsis;
}


// Formatar Data (DD/MM/AAAA)
function formatDateForDisplay(dateString) {
    // Tenta criar data considerando fuso local para evitar problemas de dia +/- 1
    const parts = dateString.split('-');
    if (parts.length === 3) {
        // Ano, Mês (0-11), Dia
        const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        // Verifica se a data é válida
        if (!isNaN(date.getTime())) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0'); // Mês é 0-indexado
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }
    }
    return dateString; // Retorna original se formato inválido
}


// Baixar Imagem Gerada
function downloadImage() {
    const link = document.createElement('a');
    link.download = `lista-louvores-${listDate.value || 'sem-data'}.png`; // Nome do arquivo
    link.href = listCanvas.toDataURL("image/png").replace("image/png", "image/octet-stream"); // Força download
    document.body.appendChild(link); // Necessário para Firefox
    link.click();
    document.body.removeChild(link); // Limpa o link
    showToast('Imagem baixada!', 'success');
}

// Compartilhar Imagem via WhatsApp (Web Share API se disponível, senão fallback)
function shareImageOnWhatsApp() {
    listCanvas.toBlob(blob => {
        if (!blob) {
            showToast('Erro ao gerar imagem para compartilhar.', 'error');
            return;
        }
        const file = new File([blob], `lista-louvores-${listDate.value}.png`, { type: 'image/png' });
        const shareData = {
            files: [file],
            title: 'Lista de Louvores',
            text: `Lista de Louvores - ${formatDateForDisplay(listDate.value)}`,
        };

        // Verifica se o navegador suporta compartilhar ARQUIVOS
        if (navigator.canShare && navigator.canShare(shareData)) {
            navigator.share(shareData)
                .then(() => showToast('Imagem compartilhada!', 'success'))
                .catch((error) => {
                    // Não mostra erro se o usuário cancelar, apenas se houver falha real
                    if (error.name !== 'AbortError') {
                        console.error('Erro ao compartilhar imagem via Web Share API:', error);
                        showToast('Não foi possível compartilhar a imagem.', 'warning');
                        // Tenta fallback para texto como alternativa se falhar
                        fallbackShareTextViaWhatsApp();
                    }
                });
        } else {
            // Se não suportar compartilhar arquivos, usa o fallback de texto
            console.warn("Compartilhamento de arquivos não suportado. Usando fallback de texto.");
            fallbackShareTextViaWhatsApp();
        }
    }, 'image/png'); // Garante Blob como PNG
}


// Fallback: Abrir WhatsApp com TEXTO formatado
function fallbackShareTextViaWhatsApp() {
    const text = generateTextList(); // Gera o texto da lista
    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
    showToast('Abrindo WhatsApp com o texto...', 'info');
}

// Enviar Lista (Texto) via WhatsApp
function sendViaWhatsApp() {
    if (selectedSongs.length === 0) {
        showToast("Lista vazia. Adicione louvores para enviar.", "warning");
        return;
    }
    fallbackShareTextViaWhatsApp(); // Usa a mesma lógica do fallback
}

// Gerar Texto Formatado para WhatsApp/Cópia
function generateTextList() {
    const exportType = document.querySelector('input[name="exportType"]:checked').value;
    const formattedDate = formatDateForDisplay(listDate.value);
    const datePart = formattedDate ? `📅 Data: ${formattedDate}\n\n` : ''; // Inclui data se disponível

    let text = `*🎵 Lista de Louvores 🎵*\n${datePart}`; // Título e Data

    if (exportType === 'titles') {
        selectedSongs.forEach((song) => {
            const displayNumber = song.numero ? (song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero) : '';
            if (displayNumber) {
                 text += `*${displayNumber}* - _${song.titulo}_\n`; // Nº e Título formatados
            } else {
                 text += `*${song.titulo}*\n`; // Apenas Título (Avulsos sem nº)
            }
        });
    } else { // Com letras
        selectedSongs.forEach((song) => {
             const displayNumber = song.numero ? (song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero) : '';
             text += `\n${'_'.repeat(25)}\n`; // Separador mais curto
             if (displayNumber) {
                 text += `*${displayNumber} - ${song.titulo}*\n`;
             } else {
                 text += `*${song.titulo}*\n`;
             }
             text += `${'-'.repeat(25)}\n\n`;
             text += song.letra ? song.letra.trim() : '_Letra não disponível_'; // Usa itálico para aviso
             text += '\n'; // Espaço antes do próximo separador
        });
    }

    return text.trim(); // Remove espaços extras no início/fim
}


// Mostrar Modal para Copiar Letras Individuais
function showLyricsModal() {
    lyricsListContainer.innerHTML = ''; // Limpa container

    if (selectedSongs.length === 0) {
        lyricsListContainer.innerHTML = '<div class="empty-message">Nenhum louvor na lista.</div>';
        lyricsModal.classList.add('show');
        return;
    }

    selectedSongs.forEach(song => {
        const displayNumber = song.numero ? (song.origem === 'CIAS' ? `CIAS-${song.numero}` : song.numero) : '';
        const item = document.createElement('div');
        item.className = 'lyrics-item';

        let headerText = displayNumber ? `${displayNumber} - ${song.titulo}` : song.titulo;

        item.innerHTML = `
            <div class="lyrics-item-header">${headerText}</div>
            <div class="lyrics-item-hint">Clique para copiar título e letra</div>
        `;

        item.addEventListener('click', () => {
             // Formatação para WhatsApp
             const textToCopy = `*${headerText}*\n\n${song.letra ? song.letra.trim() : '_Letra não disponível_'}`;
             navigator.clipboard.writeText(textToCopy).then(() => {
                 showToast(`"${song.titulo}" copiado!`, 'success');
             }).catch(err => {
                 showToast('Erro ao copiar letra', 'error');
                 console.error("Erro ao copiar letra: ", err);
             });
        });
        lyricsListContainer.appendChild(item);
    });
    lyricsModal.classList.add('show');
}


// --- Funções Firebase (Salvar/Carregar/Excluir) ---

function saveList() {
    // Verifica se o Firebase está disponível
    if (!window.firebaseDb || !dbRefSavedLists) {
        showToast("Erro: Conexão com Firebase não disponível.", "error");
        return;
    }

    const listName = listNameInput.value.trim();
    if (!listName) {
        showToast('Digite um nome para a lista', 'warning');
        listNameInput.focus(); // Foca no input
        return;
    }
    if (selectedSongs.length === 0) {
        showToast('Adicione louvores à lista antes de salvar', 'warning');
        return;
    }

    // Cria o objeto de dados da lista
    const newListData = {
        name: listName,
        date: listDate.value || new Date().toISOString().split('T')[0], // Usa data atual se não definida
        songs: selectedSongs, // Salva a lista atual
        createdAt: new Date().toISOString() // Timestamp para ordenação
    };

    // Gera uma nova chave única no Firebase (/savedLists/newKey)
    const newListRef = window.firebaseDb.push(dbRefSavedLists);

    // Salva os dados nessa nova chave
    window.firebaseDb.set(newListRef, newListData)
        .then(() => {
            listNameInput.value = ''; // Limpa o input
            showToast(`Lista "${listName}" salva com sucesso!`, 'success');
            // A UI será atualizada pelo listener onValue
        })
        .catch((error) => {
            console.error("Erro ao salvar lista no Firebase:", error);
            showToast('Erro ao salvar lista no Firebase', 'error');
        });
}

function loadSavedLists() {
    // Só executa se Firebase estiver pronto
    if (!window.firebaseDb || !dbRefSavedLists) {
        savedListsContainer.innerHTML = '<div class="empty-message">Erro de conexão. Listas salvas indisponíveis.</div>';
        console.warn("Tentativa de carregar listas sem Firebase inicializado.");
        return;
    }

    console.log("Configurando listener onValue para savedLists..."); // Log para depuração

    // Usa onValue para ouvir mudanças em tempo real
    window.firebaseDb.onValue(dbRefSavedLists, (snapshot) => {
        savedListsContainer.innerHTML = ''; // Limpa a lista na UI antes de redesenhar
        console.log("Recebido snapshot do Firebase:", snapshot.val()); // Log para depuração

        if (snapshot.exists()) {
            const listsArray = [];
            // Itera sobre cada filho (cada lista salva)
            snapshot.forEach((childSnapshot) => {
                const listData = childSnapshot.val();
                listData.id = childSnapshot.key; // Adiciona a chave do Firebase como ID
                listsArray.push(listData);
            });

            // Ordena as listas pela data de criação (mais recentes primeiro)
            listsArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            // Renderiza cada item da lista na UI
            listsArray.forEach(list => {
                renderSavedListItem(list);
            });
        } else {
            savedListsContainer.innerHTML = '<div class="empty-message">Nenhuma lista salva ainda.</div>';
        }
    }, (error) => {
         // Trata erros na leitura do Firebase
         console.error("Erro ao carregar listas do Firebase:", error);
         savedListsContainer.innerHTML = '<div class="empty-message">Erro ao carregar listas salvas do servidor.</div>';
         showToast("Erro ao carregar listas salvas", "error");
    });
}

// Renderiza um item na seção de listas salvas
function renderSavedListItem(list) {
     const item = document.createElement('div');
     item.className = 'saved-list-item';
     // Formata data da lista e data de salvamento
     const formattedListDate = formatDateForDisplay(list.date);
     const createdAtDate = list.createdAt ? new Date(list.createdAt) : null;
     const savedDateStr = createdAtDate ? createdAtDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Data indisponível';

     item.innerHTML = `
         <div class="saved-list-name">${list.name}</div>
         <div class="saved-list-info">
             <span>📅 Lista para: ${formattedListDate}</span><br>
             <span>🎵 ${list.songs.length} ${list.songs.length === 1 ? 'louvor' : 'louvores'}</span><br>
             <small>💾 Salvo em: ${savedDateStr}</small>
         </div>
         <div class="saved-list-actions">
             <button class="btn btn-primary btn-small load-list-btn" title="Carregar esta lista">Carregar</button>
             <button class="btn btn-danger btn-small delete-list-btn" title="Excluir esta lista">Excluir</button>
         </div>
     `;

     // Adiciona listeners aos botões Carregar e Excluir
     item.querySelector('.load-list-btn').addEventListener('click', () => loadList(list));
     item.querySelector('.delete-list-btn').addEventListener('click', () => deleteList(list.id, list.name)); // Passa ID e nome

     savedListsContainer.appendChild(item);
}


// Carrega uma lista salva na interface principal
function loadList(listData) {
    // Verifica se os dados necessários existem
    if (listData && Array.isArray(listData.songs) && listData.date) {
        // Confirma antes de sobrescrever, apenas se houver algo na lista atual
        if (selectedSongs.length > 0) {
            if (!confirm(`Carregar a lista "${listData.name}" substituirá a lista atual na tela. Deseja continuar?`)) {
                return; // Cancela se o usuário não confirmar
            }
        }
        // Atualiza o estado da aplicação com os dados carregados
        // Cria uma cópia profunda para evitar referências indesejadas
        selectedSongs = JSON.parse(JSON.stringify(listData.songs));
        listDate.value = listData.date; // Define a data
        updateSelectedList(); // Re-renderiza a lista principal
        showToast(`Lista "${listData.name}" carregada!`, 'success');
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo para ver a lista carregada
    } else {
        console.error("Dados da lista inválidos para carregar:", listData);
        showToast("Erro: Não foi possível carregar os dados desta lista.", "error");
    }
}


// Exclui uma lista do Firebase
function deleteList(listId, listName) {
    // Verifica Firebase e ID
    if (!window.firebaseDb || !dbRefSavedLists) {
        showToast("Erro: Conexão com Firebase não disponível.", "error");
        return;
    }
    if (!listId) {
        showToast("Erro: ID da lista inválido para exclusão.", "error");
        return;
    }

    // Confirmação do usuário
    if (!confirm(`Deseja realmente excluir a lista "${listName || 'selecionada'}" permanentemente?`)) {
        return; // Cancela se o usuário não confirmar
    }

    // Cria a referência para o nó específico da lista a ser removida
    const listToDeleteRef = window.firebaseDb.ref(window.firebaseDb.database, `savedLists/${listId}`);

    // Remove o nó do Firebase
    window.firebaseDb.remove(listToDeleteRef)
        .then(() => {
            showToast(`Lista "${listName || ''}" excluída com sucesso.`, 'info');
            // A UI será atualizada automaticamente pelo listener onValue em loadSavedLists
        })
        .catch((error) => {
            console.error("Erro ao excluir lista no Firebase:", error);
            showToast('Erro ao excluir a lista do Firebase.', 'error');
        });
}


// --- Funções Auxiliares ---
// Mostrar toast notification
function showToast(message, type = 'success') {
    // Remove toast existente se houver
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`; // Adiciona classe de tipo
    toast.textContent = message;

    // Define cor baseada no tipo (redundante se usar CSS, mas garante)
    if (type === 'error') {
        toast.style.backgroundColor = '#f44336'; // Vermelho
    } else if (type === 'warning') {
        toast.style.backgroundColor = '#FF9800'; // Laranja
    } else if (type === 'info') {
        toast.style.backgroundColor = '#2196F3'; // Azul
    } else { // 'success' ou padrão
        toast.style.backgroundColor = '#4CAF50'; // Verde
    }

    document.body.appendChild(toast);

    // Fade out e remove após 3 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) { // Verifica se ainda existe antes de remover
                 toast.remove();
            }
        }, 500); // Tempo para a animação de fade out
    }, 3000);
}

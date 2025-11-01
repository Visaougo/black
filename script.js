/* --- DOCUMENTAÇÃO E LÓGICA DO JOGO --- */

// I. DEFINIÇÃO DAS VARIÁVEIS GLOBAIS

const setupScreenEl = document.getElementById('setup-screen');
const gameAreaEl = document.getElementById('game-area');
const playerCountSelectEl = document.getElementById('player-count');
const playerNamesContainerEl = document.getElementById('player-names-container');
const btnSetupStartEl = document.getElementById('btn-setup-start');

const dealerPointsEl = document.getElementById('dealer-points');
const dealerHandEl = document.getElementById('dealer-hand');
const playersContainerEl = document.getElementById('players-container');
const gameStatusEl = document.getElementById('game-status');
const btnNextActionEl = document.getElementById('btn-next-action');
const deckEl = document.getElementById('deck'); // NOVO: O baralho

const STARTING_BALANCE = 1000;
const MINIMUM_BET = 10;
const DEAL_DELAY_MS = 300; // Tempo em ms entre as cartas
const ANIMATION_DURATION_MS = 500; // Deve bater com a transição do CSS

let players = [];
let dealer = { points: 0, hand: [] };
let deck = [];
let currentPlayerIndex = 0;

// II. LÓGICA DA TELA DE CONFIGURAÇÃO (SETUP)

function updatePlayerNameInputs() {
    const count = parseInt(playerCountSelectEl.value);
    playerNamesContainerEl.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.innerHTML = `
            <label for="player-name-${i}">Nome do Jogador ${i}:</label>
            <input type="text" id="player-name-${i}" placeholder="Jogador ${i}">
        `;
        playerNamesContainerEl.appendChild(div);
    }
}

function initializeGame() {
    players = [];
    playersContainerEl.innerHTML = ''; 
    const count = parseInt(playerCountSelectEl.value);

    for (let i = 1; i <= count; i++) {
        let playerName = document.getElementById(`player-name-${i}`).value || `Jogador ${i}`;
        
        const playerArea = document.createElement('div');
        playerArea.id = `player${i}-area`;
        playerArea.classList.add('player-area');
        
        playerArea.innerHTML = `
            <h2>${playerName}</h2> 
            <p>Pontos: <span id="player${i}-points">0</span></p>
            
            <div class="balance-info">
                Saldo: R$ <span id="player${i}-balance">${STARTING_BALANCE}</span>
            </div>
            <p class="current-bet">Aposta: R$ <span id="player${i}-bet">0</span></p>
            
            <div id="player${i}-hand" class="hand"></div>
            
            <div class="betting-controls" id="player${i}-betting-controls">
                <button class="chip" data-value="10">R$10</button>
                <button class="chip" data-value="25">R$25</button>
                <button class="chip" data-value="100">R$100</button>
                <button class="chip" data-value="500">R$500</button>
                <button class="btn-clear-bet">Limpar Aposta</button>
            </div>
            
            <div class="controls" id="player${i}-controls" style="display: none;">
                <button class="btn-hit">Pedir (Hit)</button>
                <button class="btn-stand">Parar (Stand)</button>
                <button class="btn-double">Dobrar (Double)</button>
            </div>
        `;
        playersContainerEl.appendChild(playerArea);
        
        players.push({
            id: i,
            name: playerName,
            balance: STARTING_BALANCE,
            bet: 0,
            points: 0,
            hand: [],
            status: 'betting', 
            
            areaEl: playerArea,
            pointsEl: document.getElementById(`player${i}-points`),
            handEl: document.getElementById(`player${i}-hand`),
            controlsEl: document.getElementById(`player${i}-controls`),
            bettingControlsEl: document.getElementById(`player${i}-betting-controls`),
            balanceEl: document.getElementById(`player${i}-balance`),
            betEl: document.getElementById(`player${i}-bet`),
        });
    }
    
    addGameListeners(); 
    setupScreenEl.style.display = 'none';
    gameAreaEl.style.display = 'block';

    btnNextActionEl.textContent = "Confirmar Apostas e Distribuir";
    btnNextActionEl.onclick = startDealingRound; // AGORA É ASYNC
}

function addGameListeners() {
    players.forEach((player, index) => {
        // Listeners de Jogo
        player.controlsEl.querySelector('.btn-hit').addEventListener('click', () => {
            if (index === currentPlayerIndex) playerHit(); // AGORA É ASYNC
        });
        player.controlsEl.querySelector('.btn-stand').addEventListener('click', () => {
            if (index === currentPlayerIndex) playerStand();
        });
        player.controlsEl.querySelector('.btn-double').addEventListener('click', () => {
            if (index === currentPlayerIndex) playerDoubleDown(); // AGORA É ASYNC
        });

        // Listeners de Aposta
        player.bettingControlsEl.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const value = parseInt(chip.dataset.value);
                if (player.balance >= value) {
                    player.bet += value;
                    player.balance -= value;
                    player.betEl.textContent = player.bet;
                    player.balanceEl.textContent = player.balance;
                } else {
                    gameStatusEl.textContent = `${player.name} não tem saldo suficiente!`;
                    setTimeout(() => { gameStatusEl.textContent = 'Aguardando apostas...'; }, 1500);
                }
            });
        });

        player.bettingControlsEl.querySelector('.btn-clear-bet').addEventListener('click', () => {
            player.balance += player.bet;
            player.bet = 0;
            player.betEl.textContent = player.bet;
            player.balanceEl.textContent = player.balance;
        });
    });
}

// III. FUNÇÕES PRINCIPAIS DO JOGO

// NOVO: Função de utilidade para pausas
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function setupNewRound() {
    gameStatusEl.textContent = "Façam suas apostas para a próxima rodada!";
    
    dealer.hand = [];
    dealer.points = 0;
    dealerHandEl.innerHTML = ''; // Limpa as cartas da rodada anterior
    dealerPointsEl.textContent = '0';
    
    players.forEach(player => {
        player.hand = [];
        player.points = 0;
        player.bet = 0;
        
        player.handEl.innerHTML = ''; // Limpa as cartas da rodada anterior
        player.pointsEl.textContent = '0';
        player.betEl.textContent = '0';
        player.balanceEl.textContent = player.balance;
        
        player.areaEl.classList.remove('busted-effect', 'win-effect', 'lose-effect');

        if (player.balance < MINIMUM_BET) {
            player.status = 'out';
            player.areaEl.style.opacity = '0.5';
            player.bettingControlsEl.style.display = 'none';
            player.controlsEl.style.display = 'none';
        } else {
            player.status = 'betting';
            player.areaEl.style.opacity = '1';
            player.bettingControlsEl.style.display = 'flex';
            player.controlsEl.style.display = 'none';
        }
    });

    btnNextActionEl.textContent = "Confirmar Apostas e Distribuir";
    btnNextActionEl.onclick = startDealingRound;
    btnNextActionEl.disabled = false;
}

/**
 * REESCRITO: Agora usa async/await e a nova função de animação.
 */
async function startDealingRound() {
    btnNextActionEl.disabled = true;
    
    let allBetsValid = true;
    for (const player of players) {
        if (player.status === 'betting') {
            if (player.bet < MINIMUM_BET) {
                gameStatusEl.textContent = `${player.name} deve apostar pelo menos R$ ${MINIMUM_BET}!`;
                allBetsValid = false;
                break;
            }
        }
    }

    if (!allBetsValid) {
        btnNextActionEl.disabled = false;
        return;
    }

    players.forEach(player => {
        if (player.status === 'betting') {
            player.status = 'playing';
            player.bettingControlsEl.style.display = 'none';
            player.controlsEl.style.display = 'flex';
        }
    });

    createDeck();
    shuffleDeck();

    // Loop de distribuição (2 rodadas)
    for (let i = 0; i < 2; i++) {
        // Para os jogadores
        for (let j = 0; j < players.length; j++) {
            if (players[j].status === 'playing') {
                const player = players[j];
                const card = drawCard();
                player.hand.push(card);
                await animateCardDeal(player.handEl, card); // Anima
                player.points = calculatePoints(player.hand);
                updatePoints();
                await delay(DEAL_DELAY_MS); // Pausa
            }
        }
        
        // Para o Dealer
        const card = drawCard();
        dealer.hand.push(card);
        const hideCard = (i === 1); // Esconde a segunda carta
        await animateCardDeal(dealerHandEl, card, hideCard); // Anima
        updatePoints(); // Atualiza pontos (só da visível)
        await delay(DEAL_DELAY_MS); // Pausa
    }
    
    checkInitialBlackjacks(); // Checa Blackjacks
}


// IV. FUNÇÕES DE LÓGICA DO JOGO

function createDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    deck = [];
    for (let suit of suits) {
        for (let value of values) {
            deck.push({ suit, value });
        }
    }
}

function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function drawCard() {
    return deck.pop();
}

function calculatePoints(hand) {
    let points = 0;
    let aceCount = 0;
    for (let card of hand) {
        if (card.value === 'J' || card.value === 'Q' || card.value === 'K') points += 10;
        else if (card.value === 'A') { aceCount += 1; points += 11; }
        else points += parseInt(card.value);
    }
    while (points > 21 && aceCount > 0) { points -= 10; aceCount -= 1; }
    return points;
}

/**
 * NOVO: Cria o elemento da carta e anexa na mão.
 * Esta função apenas CRIA a carta, não a anima.
 */
function addCardToHand(targetHandEl, cardData, isHidden = false) {
    const cardEl = document.createElement('div');
    cardEl.classList.add('card');
    
    // Calcula o deslocamento (empilhamento)
    const cardOffset = targetHandEl.children.length * 30; // 30px por carta
    cardEl.style.left = `${cardOffset}px`;
    
    if (isHidden) {
        cardEl.classList.add('hidden');
        cardEl.innerHTML = '?';
    } else {
        if (cardData.suit === '♥' || cardData.suit === '♦') cardEl.style.color = 'red';
        cardEl.innerHTML = `${cardData.value}<br>${cardData.suit}`;
    }
    
    targetHandEl.appendChild(cardEl);
    return cardEl;
}

/**
 * NOVO: Função principal da animação.
 */
function animateCardDeal(targetHandEl, cardData, isHidden = false) {
    return new Promise(resolve => {
        // 1. Cria a carta na mão, mas escondida (para calcular posição final)
        const cardEl = addCardToHand(targetHandEl, cardData, isHidden);
        cardEl.style.opacity = '0'; // Começa invisível
        
        // 2. Pega as coordenadas de INÍCIO (baralho) e FIM (carta)
        const deckRect = deckEl.getBoundingClientRect();
        const cardRect = cardEl.getBoundingClientRect();
        
        // 3. Calcula a diferença (quanto a carta precisa "viajar")
        const translateX = deckRect.left - cardRect.left;
        const translateY = deckRect.top - cardRect.top;
        
        // 4. Move a carta (invisível) para a posição do baralho
        cardEl.style.transform = `translate(${translateX}px, ${translateY}px)`;
        
        // 5. Força o navegador a aplicar o 'transform'
        cardEl.getBoundingClientRect(); 
        
        // 6. Inicia a animação (Move de volta para 0,0 e aparece)
        cardEl.style.opacity = '1';
        cardEl.style.transform = 'translate(0, 0)';
        
        // 7. Resolve a Promise quando a animação termina
        setTimeout(resolve, ANIMATION_DURATION_MS);
    });
}


function updatePoints() {
    // Lógica para pontos do dealer (só cartas visíveis)
    let dealerVisiblePoints = 0;
    if (dealer.hand.length > 0) {
        const visibleHand = [];
        // A segunda carta (índice 1) está escondida?
        if (dealerHandEl.querySelector('.hidden')) {
            visibleHand.push(dealer.hand[0]); // Só a primeira
        } else {
            visibleHand.push(...dealer.hand); // Todas
        }
        dealerVisiblePoints = calculatePoints(visibleHand);
    }
    dealerPointsEl.textContent = dealerVisiblePoints;
    
    // Atualiza pontos dos jogadores
    players.forEach(player => {
        player.pointsEl.textContent = player.points;
    });
}

function disableAllPlayerControls() {
    players.forEach(player => {
        player.controlsEl.querySelectorAll('button').forEach(btn => btn.disabled = true);
    });
}

function enableCurrentPlayerControls() {
    disableAllPlayerControls();
    if (currentPlayerIndex < players.length) {
        while (currentPlayerIndex < players.length && players[currentPlayerIndex].status !== 'playing') {
            currentPlayerIndex++;
        }
        if (currentPlayerIndex < players.length) {
            const player = players[currentPlayerIndex];
            
            player.controlsEl.querySelector('.btn-hit').disabled = false;
            player.controlsEl.querySelector('.btn-stand').disabled = false;

            const doubleBtn = player.controlsEl.querySelector('.btn-double');
            if (player.hand.length === 2 && player.balance >= player.bet) {
                doubleBtn.disabled = false;
            } else {
                doubleBtn.disabled = true;
            }
            
            gameStatusEl.textContent = `Vez de ${player.name}.`;
        } else {
            dealerTurn(); // AGORA É ASYNC
        }
    } else {
        dealerTurn(); // AGORA É ASYNC
    }
}

function checkInitialBlackjacks() {
    let dealerHasBlackjack = (calculatePoints(dealer.hand) === 21);
    
    players.forEach(player => {
        if (player.status === 'playing' && player.points === 21) {
            player.status = 'blackjack';
            gameStatusEl.textContent = `${player.name} tem BLACKJACK!`;
        }
    });

    if (dealerHasBlackjack) {
        gameStatusEl.textContent = "Dealer tem Blackjack! Fim da rodada.";
        setTimeout(dealerTurn, 1000); // Pula para o dealer
    } else {
        currentPlayerIndex = 0;
        enableCurrentPlayerControls();
    }
}

/**
 * REESCRITO: Agora usa async/await
 */
async function playerHit() {
    const player = players[currentPlayerIndex];
    if (player.status !== 'playing') return;

    player.controlsEl.querySelector('.btn-double').disabled = true;

    const card = drawCard();
    player.hand.push(card);
    await animateCardDeal(player.handEl, card); // Anima
    
    player.points = calculatePoints(player.hand);
    updatePoints();

    if (player.points > 21) {
        player.status = 'bust';
        gameStatusEl.textContent = `${player.name} ESTOUROU!`;
        player.areaEl.classList.add('busted-effect');
        setTimeout(nextPlayerTurn, 1000);
    }
}

function playerStand() {
    const player = players[currentPlayerIndex];
    if (player.status !== 'playing') return;

    player.status = 'stand';
    gameStatusEl.textContent = `${player.name} parou.`;
    setTimeout(nextPlayerTurn, 1000);
}

/**
 * REESCRITO: Agora usa async/await
 */
async function playerDoubleDown() {
    const player = players[currentPlayerIndex];
    if (player.status !== 'playing' || player.hand.length !== 2 || player.balance < player.bet) {
        return;
    }

    player.balance -= player.bet;
    player.bet *= 2;
    player.balanceEl.textContent = player.balance;
    player.betEl.textContent = player.bet;

    const card = drawCard();
    player.hand.push(card);
    await animateCardDeal(player.handEl, card); // Anima

    player.points = calculatePoints(player.hand);
    updatePoints();

    if (player.points > 21) {
        player.status = 'bust';
        gameStatusEl.textContent = `${player.name} Dobrou e ESTOUROU!`;
        player.areaEl.classList.add('busted-effect');
    } else {
        player.status = 'stand';
        gameStatusEl.textContent = `${player.name} Dobrou e parou com ${player.points}.`;
    }
    
    setTimeout(nextPlayerTurn, 1500);
}


function nextPlayerTurn() {
    currentPlayerIndex++;
    if (currentPlayerIndex < players.length) {
        enableCurrentPlayerControls();
    } else {
        disableAllPlayerControls();
        setTimeout(dealerTurn, 1000);
    }
}

/**
 * REESCRITO: Agora usa async/await e revela a carta
 */
async function dealerTurn() {
    gameStatusEl.textContent = "Vez do Dealer...";
    
    // 1. Revela a carta escondida
    const hiddenCardEl = dealerHandEl.querySelector('.hidden');
    if (hiddenCardEl) {
        hiddenCardEl.classList.remove('hidden');
        hiddenCardEl.classList.add('flip-reveal');
        
        const cardData = dealer.hand[1]; // Pega os dados da 2ª carta
        if (cardData.suit === '♥' || cardData.suit === '♦') hiddenCardEl.style.color = 'red';
        hiddenCardEl.innerHTML = `${cardData.value}<br>${cardData.suit}`;
        
        await delay(ANIMATION_DURATION_MS); // Espera o flip
    }

    dealer.points = calculatePoints(dealer.hand);
    updatePoints();
    await delay(1000); // Pausa dramática

    // 2. Loop de compra do Dealer
    while (dealer.points < 17) {
        gameStatusEl.textContent = "Dealer compra...";
        const card = drawCard();
        dealer.hand.push(card);
        await animateCardDeal(dealerHandEl, card); // Anima

        dealer.points = calculatePoints(dealer.hand);
        updatePoints();
        await delay(1000); // Pausa entre as cartas
    }
    
    setTimeout(endGame, 1000); // Finaliza o jogo
}

function endGame() {
    let finalMessage = "Fim da Rodada! ";
    const dealerPoints = dealer.points;
    const dealerBust = dealerPoints > 21;

    if (dealerBust) finalMessage += `Dealer ESTOUROU com ${dealerPoints}. `;
    else finalMessage += `Dealer parou com ${dealerPoints}. `;

    players.forEach(player => {
        if (player.status === 'out') return;
        
        let payout = 0;
        let resultStatus = 'lose';

        if (player.status === 'bust') {
            finalMessage += `| ${player.name} perdeu (Estourou). `;
            payout = 0;
            resultStatus = 'lose';
        } 
        else if (player.status === 'blackjack') {
            if (dealer.points === 21 && dealer.hand.length === 2) {
                finalMessage += `| ${player.name} empatou (Push). `;
                payout = player.bet;
                resultStatus = 'push';
            } else {
                finalMessage += `| ${player.name} ganhou com BLACKJACK! (3:2). `;
                payout = player.bet + (player.bet * 1.5);
                resultStatus = 'win';
            }
        } 
        else if (dealerBust) {
            finalMessage += `| ${player.name} ganhou (Dealer estourou). `;
            payout = player.bet * 2;
            resultStatus = 'win';
        } 
        else if (player.points > dealerPoints) {
            finalMessage += `| ${player.name} ganhou (${player.points} vs ${dealerPoints}). `;
            payout = player.bet * 2;
            resultStatus = 'win';
        } 
        else if (player.points < dealerPoints) {
            finalMessage += `| ${player.name} perdeu (${player.points} vs ${dealerPoints}). `;
            payout = 0;
            resultStatus = 'lose';
        } 
        else {
            finalMessage += `| ${player.name} empatou (${player.points}). `;
            payout = player.bet;
            resultStatus = 'push';
        }

        player.balance += payout;
        player.bet = 0;
        
        if (resultStatus === 'win') player.areaEl.classList.add('win-effect');
        if (resultStatus === 'lose') player.areaEl.classList.add('lose-effect');
        
        player.balanceEl.textContent = player.balance;
        player.betEl.textContent = '0';
    });

    gameStatusEl.textContent = finalMessage;
    
    btnNextActionEl.textContent = "Jogar Nova Rodada";
    btnNextActionEl.onclick = setupNewRound;
    btnNextActionEl.disabled = false;
}


// V. EVENT LISTENERS (Iniciais)

playerCountSelectEl.addEventListener('change', updatePlayerNameInputs);
btnSetupStartEl.addEventListener('click', initializeGame);
updatePlayerNameInputs();
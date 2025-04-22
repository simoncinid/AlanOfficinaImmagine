class ChatApp {
    constructor() {
        this.threadId = null;
        this.messages = [];
        this.serverUrl = 'https://test2-lnlb.onrender.com';
        this.userData = null;
        this.initializeElements();
        this.initializeEventListeners();
    }

    initializeElements() {
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatMessages = document.getElementById('chatMessages');
    }

    initializeEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Aggiungi il messaggio dell'utente alla chat
        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';

        // Mostra l'indicatore di digitazione
        this.showTypingIndicator();

        try {
            const response = await fetch(`${this.serverUrl}/api/conversation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    threadId: this.threadId,
                    message: message
                })
            });

            const data = await response.json();
            this.threadId = data.threadId;
            
            // Rimuovi l'indicatore di digitazione
            this.removeTypingIndicator();
            
            // Aggiungi la risposta dell'assistente
            const lastMessage = data.messages[0];
            if (lastMessage && lastMessage.role === 'assistant') {
                this.addMessage(lastMessage.content[0].text.value, 'assistant');
            }

            // Se l'analisi è completa, mostra il form di conferma
            if (data.analysis && data.analysis.isComplete) {
                this.showConfirmationForm(data.analysis);
            }
        } catch (error) {
            console.error('Errore durante l\'invio del messaggio:', error);
            this.removeTypingIndicator();
            this.addMessage('Mi dispiace, si è verificato un errore. Riprova più tardi.', 'assistant');
        }
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.textContent = text;
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        
        // Salva il messaggio per l'analisi
        this.messages.push({
            role: sender,
            content: text
        });
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typingIndicator';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'typing-dot';
            typingDiv.appendChild(dot);
        }
        
        this.chatMessages.appendChild(typingDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    removeTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async analyzeConversation() {
        if (this.messages.length === 0) {
            alert('Non ci sono messaggi da analizzare');
            return;
        }

        try {
            const response = await fetch(`${this.serverUrl}/api/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: this.messages
                })
            });

            const data = await response.json();
            this.userData = data;
            
            if (data.isComplete) {
                this.showConfirmationForm(data);
            } else {
                this.addMessage('Mi dispiace, non ho raccolto tutte le informazioni necessarie. Potresti fornirmi nome, telefono e descrizione di cosa vorresti fare?', 'assistant');
            }
        } catch (error) {
            console.error('Errore durante l\'analisi:', error);
            this.addMessage('Si è verificato un errore durante l\'analisi della conversazione', 'assistant');
        }
    }

    showConfirmationForm(data) {
        // Se il form è già presente, non mostrarlo di nuovo
        if (document.querySelector('.confirmation-form')) {
            return;
        }

        const formHtml = `
            <div class="confirmation-form">
                <h3>Conferma i tuoi dati</h3>
                <div class="form-group">
                    <label>Nome e Cognome</label>
                    <input type="text" id="fullName" value="${data.fullName || ''}" placeholder="Nome e Cognome">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="emailAddress" value="${data.emailAddress || ''}" placeholder="Email">
                </div>
                <div class="form-group">
                    <label>Telefono</label>
                    <input type="tel" id="phoneNumber" value="${data.phoneNumber || ''}" placeholder="Telefono">
                </div>
                <div class="form-group">
                    <label>Descrizione</label>
                    <textarea id="description" placeholder="Descrizione">${data.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Tipo Cliente</label>
                    <input type="text" id="userType" value="${data.userType || ''}" placeholder="Tipo Cliente">
                </div>
                <button class="confirm-btn" id="confirmData">Conferma Dati</button>
            </div>
        `;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant-message';
        messageDiv.innerHTML = formHtml;
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

        // Aggiungi l'event listener per il pulsante di conferma
        document.getElementById('confirmData').addEventListener('click', () => this.confirmUserData());
    }

    confirmUserData() {
        // Aggiorna i dati con i valori modificati dall'utente
        this.userData = {
            fullName: document.getElementById('fullName').value,
            emailAddress: document.getElementById('emailAddress').value,
            phoneNumber: document.getElementById('phoneNumber').value,
            description: document.getElementById('description').value,
            userType: document.getElementById('userType').value
        };

        // Rimuovi il form di conferma
        const confirmationForm = document.querySelector('.confirmation-form');
        if (confirmationForm) {
            confirmationForm.remove();
        }

        // Aggiungi il messaggio di ringraziamento
        this.addMessage('Grazie per aver confermato i tuoi dati! Ti contatteremo presto per procedere con la tua richiesta.', 'assistant');
    }

    displayAnalysisResults(data) {
        this.analysisResult.innerHTML = `
            <div class="analysis-item">
                <h3>Nome Completo</h3>
                <p>${data.fullName || 'Non specificato'}</p>
            </div>
            <div class="analysis-item">
                <h3>Email</h3>
                <p>${data.emailAddress || 'Non specificato'}</p>
            </div>
            <div class="analysis-item">
                <h3>Telefono</h3>
                <p>${data.phoneNumber || 'Non specificato'}</p>
            </div>
            <div class="analysis-item">
                <h3>Descrizione</h3>
                <p>${data.description || 'Non specificato'}</p>
            </div>
            <div class="analysis-item">
                <h3>Tipo Utente</h3>
                <p>${data.userType || 'Non specificato'}</p>
            </div>
        `;
        
        this.analysisModal.style.display = 'flex';
    }

    closeAnalysisModal() {
        this.analysisModal.style.display = 'none';
    }
}

// Inizializza l'app quando il DOM è completamente caricato
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
}); 
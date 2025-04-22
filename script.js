class ChatApp {
    constructor() {
        this.threadId = null;
        this.messages = [];
        this.initializeElements();
        this.initializeEventListeners();
    }

    initializeElements() {
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatMessages = document.getElementById('chatMessages');
        this.analyzeBtn = document.getElementById('analyzeBtn');
        this.analysisModal = document.getElementById('analysisModal');
        this.closeModal = document.getElementById('closeModal');
        this.analysisResult = document.getElementById('analysisResult');
    }

    initializeEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.analyzeBtn.addEventListener('click', () => this.analyzeConversation());
        this.closeModal.addEventListener('click', () => this.closeAnalysisModal());
        this.analysisModal.addEventListener('click', (e) => {
            if (e.target === this.analysisModal) this.closeAnalysisModal();
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
            const response = await fetch('/api/conversation', {
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
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: this.messages
                })
            });

            const data = await response.json();
            this.displayAnalysisResults(data);
        } catch (error) {
            console.error('Errore durante l\'analisi:', error);
            alert('Si è verificato un errore durante l\'analisi della conversazione');
        }
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
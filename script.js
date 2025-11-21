// --- INICIALIZAÇÃO FIREBASE ---
// É CRÍTICO que estas configurações estejam corretas e que os scripts 
// do firebase-app.js e firebase-firestore.js estejam no seu HTML.
const firebaseConfig = {
    apiKey: "AIzaSyAqE58H0UriOexZpsDAODfNFSsi5Co4nac",
    authDomain: "churrasco-com-amigosecreto.firebaseapp.com",
    projectId: "churrasco-com-amigosecreto",
    storageBucket: "churrasco-com-amigosecreto.firebasestorage.app",
    messagingSenderId: "780934998934",
    appId: "1:780934998934:web:fc30e057ef1b31b3438bb7"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); 

// Ativa logs de depuração para ver erros no console do navegador
firebase.firestore.setLogLevel('debug');


// --- LOCALIZAÇÃO DE ELEMENTOS HTML ---
const listaPresenca = document.getElementById('lista-presenca');
const listaAmigoSecreto = document.getElementById('lista-amigo-secreto');
const totalConfirmadosSpan = document.getElementById('total-confirmados');
const totalAmigoSecretoSpan = document.getElementById('total-amigo-secreto');

// Elementos do Formulário
const confirmacaoForm = document.getElementById('confirmacao-form');
const nomeInput = document.getElementById('nome');
const acompanhantesInput = document.getElementById('acompanhantes');
const participaAmigoSecretoCheckbox = document.getElementById('participa-amigo-secreto');
const valorDisplay = document.getElementById('valor-display');
const mensagemStatus = document.getElementById('mensagem-status');
const nomesAcompanhantesWrapper = document.getElementById('nomes-acompanhantes-wrapper');

// ⭐️ ID DA FESTA (Deve corresponder ao seu HTML: uzppMbpJjucjqzJEZQLNZKHSVcI2 ou CONFRATERNIZACAO_NATAL) ⭐️
// Estou mantendo o ID da festa original (churrasco) que estava no seu DB para evitar confusão,
// mas se você estiver usando o código HTML do Natal, mude esta linha para: 
// const ID_FESTA = 'CONFRATERNIZACAO_NATAL';
const ID_FESTA = 'uzppMbpJjucjqzJEZQLNZKHSVcI2'; 

const colecaoParticipantes = db.collection('festas').doc(ID_FESTA).collection('participantes');

// --- FUNÇÕES DE LÓGICA DE NEGÓCIO ---

function calcularValor() {
    // Mantém o valor fixo conforme o design do seu formulário
    valorDisplay.textContent = 'R$ 50,00'; 
}

function salvarConfirmacao(e) {
    e.preventDefault();

    mensagemStatus.textContent = "Salvando...";
    mensagemStatus.style.backgroundColor = '#fff3e0'; 
    mensagemStatus.style.color = '#ff9800'; 

    const nome = nomeInput.value.trim();
    const acompanhantes = parseInt(acompanhantesInput.value) || 0;
    const participaASPrincipal = participaAmigoSecretoCheckbox.checked;

    if (!nome) {
        mensagemStatus.textContent = "Por favor, preencha seu nome.";
        mensagemStatus.style.backgroundColor = '#ffebee';
        mensagemStatus.style.color = '#d32f2f';
        return;
    }

    // ⭐️ NOVO: COLETANDO DADOS DOS ACOMPANHANTES PARA O AMIGO SECRETO ⭐️
    let nomesAmigoSecreto = [];
    
    // 1. Adiciona o participante principal, se ele for participar do AS
    if (participaASPrincipal) {
        nomesAmigoSecreto.push(nome);
    }
    
    // 2. Coleta dados dos acompanhantes dinâmicos
    const inputsAcompanhantes = nomesAcompanhantesWrapper.querySelectorAll('.acompanhante-item');
    let hasEmptyName = false;
    inputsAcompanhantes.forEach(item => {
        const nomeAcompInput = item.querySelector('input[type="text"]');
        const participaAcompCheckbox = item.querySelector('input[type="checkbox"]');
        
        const nomeAcomp = nomeAcompInput.value.trim();
        const participaAS = participaAcompCheckbox ? participaAcompCheckbox.checked : false;

        if (nomeAcomp) {
            // Adiciona o acompanhante na lista do Amigo Secreto APENAS se o checkbox estiver marcado
            if (participaAS) {
                nomesAmigoSecreto.push(nomeAcomp);
            }
        } else {
            hasEmptyName = true;
        }
    });
    
    if (hasEmptyName && acompanhantes > 0) {
        mensagemStatus.textContent = "Por favor, preencha o nome de todos os acompanhantes.";
        mensagemStatus.style.backgroundColor = '#ffebee';
        mensagemStatus.style.color = '#d32f2f';
        return;
    }


    const dados = {
        nome: nome,
        acompanhantes: acompanhantes,
        participaAS: participaASPrincipal, 
        nomesAmigoSecreto: nomesAmigoSecreto, // Lista UNIFICADA de todos que participarão do AS
        valorPago: 50,
        contribuir: true, 
        timestamp: new firebase.firestore.Timestamp.now()
    };

    colecaoParticipantes.add(dados)
        .then(() => {
            mensagemStatus.textContent = "Presença confirmada com sucesso!";
            mensagemStatus.style.backgroundColor = '#e8f5e9'; 
            mensagemStatus.style.color = '#388e3c'; 
            confirmacaoForm.reset();
            calcularValor();
            // Limpa e esconde os campos dinâmicos
            nomesAcompanhantesWrapper.innerHTML = '<h3>Nomes dos Acompanhantes:</h3>';
            nomesAcompanhantesWrapper.style.display = 'none';
        })
        .catch(error => {
            console.error("Erro ao salvar no Firestore: ", error);
            mensagemStatus.textContent = "Erro ao confirmar presença. Verifique as Regras do Firebase.";
            mensagemStatus.style.backgroundColor = '#ffebee'; 
            mensagemStatus.style.color = '#d32f2f'; 
        });
}

// --- FUNÇÕES DE RENDERIZAÇÃO E CARREGAMENTO ---

function renderizarListas(participantes) {
    listaPresenca.innerHTML = '';
    if (listaAmigoSecreto) { 
        listaAmigoSecreto.innerHTML = '';
    }

    let totalPessoas = 0;
    let totalAmigoSecreto = 0;

    participantes.forEach(doc => {
        const dados = doc.data();
        const nomeParticipante = dados.nome || 'Participante Desconhecido';
        const numAcompanhantes = dados.acompanhantes || 0;
        const nomesAS = dados.nomesAmigoSecreto || []; // Lista unificada de quem fará o AS
        
        totalPessoas += (1 + numAcompanhantes); 
        totalAmigoSecreto += nomesAS.length; // Conta todos na lista do AS

        // 1. Renderiza a Lista de Presença Completa
        const liPresenca = document.createElement('li');
        let textoPresenca = `${nomeParticipante} (P + ${numAcompanhantes} Acompanhante${numAcompanhantes === 1 ? '' : 's'})`;
        
        if (nomesAS.length > 0) {
            textoPresenca += ` - 🎁 **${nomesAS.length} no Amigo Secreto**`;
        } else {
            textoPresenca += ' - Amigo Secreto Não';
        }
        
        liPresenca.innerHTML = textoPresenca;
        listaPresenca.appendChild(liPresenca);

        // 2. Renderiza na Lista de Amigo Secreto
        if (listaAmigoSecreto) {
            // Itera a lista unificada de nomes do AS
            nomesAS.forEach(nomeAS => {
                const liAmigoSecreto = document.createElement('li');
                // 🛑 CORREÇÃO APLICADA: Removendo o tag "(Acomp.)"
                liAmigoSecreto.textContent = nomeAS; 
                listaAmigoSecreto.appendChild(liAmigoSecreto);
            });
        }
    });

    totalConfirmadosSpan.textContent = totalPessoas;
    if (totalAmigoSecretoSpan) {
        totalAmigoSecretoSpan.textContent = totalAmigoSecreto;
    }
}

// Configura o Listener em tempo real do Firestore
function carregarParticipantes() {
    colecaoParticipantes.onSnapshot(snapshot => {
        mensagemStatus.textContent = ''; 
        renderizarListas(snapshot.docs);
    }, error => {
        console.error("Erro ao buscar participantes: ", error);
        listaPresenca.innerHTML = '<li>Erro ao carregar participantes. Verifique as Regras do Firebase.</li>';
        if (listaAmigoSecreto) {
            listaAmigoSecreto.innerHTML = '<li>Erro ao carregar participantes. Verifique as Regras do Firebase.</li>';
        }
    });
}

// --- CONTROLES DE FORMULÁRIO (GERA OS CAMPOS DINÂMICOS) ---
function gerenciarCamposAmigoSecreto() {
    // Limpa a área
    nomesAcompanhantesWrapper.innerHTML = '<h3>Nomes dos Acompanhantes:</h3>';
    nomesAcompanhantesWrapper.style.display = 'none';

    const numAcompanhantes = parseInt(acompanhantesInput.value) || 0;
    
    if (numAcompanhantes > 0) {
        nomesAcompanhantesWrapper.style.display = 'block';
        
        for (let i = 1; i <= numAcompanhantes; i++) {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('acompanhante-item');
            
            // Estilos para visualização
            itemDiv.style.marginBottom = '15px';
            itemDiv.style.border = '1px dashed #ddd';
            itemDiv.style.padding = '10px';
            itemDiv.style.borderRadius = '4px';

            // 1. Input para o Nome
            const labelNome = document.createElement('label');
            labelNome.textContent = `Nome do Acompanhante ${i}:`;
            labelNome.style.fontWeight = 'normal';
            
            const inputNome = document.createElement('input');
            inputNome.type = 'text';
            inputNome.placeholder = `Nome do Acompanhante ${i}`;
            inputNome.required = true;

            // 2. Checkbox para o Amigo Secreto
            const divAS = document.createElement('div');
            divAS.style.display = 'flex';
            divAS.style.alignItems = 'center';
            divAS.style.marginTop = '10px';
            
            const checkboxAS = document.createElement('input');
            checkboxAS.type = 'checkbox';
            checkboxAS.id = `participa-acompanhante-${i}`;
            checkboxAS.style.width = 'auto';
            checkboxAS.style.marginRight = '10px';
            
            const labelAS = document.createElement('label');
            labelAS.setAttribute('for', `participa-acompanhante-${i}`);
            labelAS.textContent = 'Participa do Amigo Secreto (Opcional)';
            labelAS.style.marginBottom = '0';
            labelAS.style.fontWeight = 'bold';
            
            divAS.appendChild(checkboxAS);
            divAS.appendChild(labelAS);
            
            itemDiv.appendChild(labelNome);
            itemDiv.appendChild(inputNome);
            itemDiv.appendChild(divAS);
            
            nomesAcompanhantesWrapper.appendChild(itemDiv);
        }
    }
}

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    carregarParticipantes();
    calcularValor(); 
});

confirmacaoForm.addEventListener('submit', salvarConfirmacao);
// Acompanhantes e o checkbox do AS principal controlam os campos dinâmicos
acompanhantesInput.addEventListener('input', gerenciarCamposAmigoSecreto); 
participaAmigoSecretoCheckbox.addEventListener('change', gerenciarCamposAmigoSecreto);

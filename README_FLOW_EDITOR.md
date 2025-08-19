# Flow Editor - Sistema CRUD para Nós FreeSWITCH

## Visão Geral

O Flow Editor é um sistema completo para criar, editar e gerenciar fluxos IVR (Interactive Voice Response) que são automaticamente convertidos para XML do FreeSWITCH. Cada nó do flow representa uma ação específica do FreeSWITCH e pode ser completamente configurado através de uma interface intuitiva.

## Funcionalidades Principais

### 1. CRUD Completo para Cada Nó

Cada nó do flow possui:
- **Configuração**: Campos editáveis baseados no tipo de nó
- **Duplicação**: Botão para copiar um nó existente
- **Exclusão**: Remoção segura do nó e suas conexões
- **Validação**: Verificação automática de campos obrigatórios

### 2. Tipos de Nós Disponíveis

#### Inbound Connector
- **Start**: Ponto de entrada da chamada - OBRIGATÓRIO e deve ser o primeiro nó. Define automaticamente `organizationID=${domain_uuid}` no XML do FreeSWITCH.

#### Call Control
- **Answer**: Atende a chamada
- **Set Defaults**: Define variáveis padrão do canal

#### Audio
- **Playback**: Toca arquivo de áudio
- **Collect Digits**: Coleta dígitos do usuário
- **Feedback While Validating**: Áudio durante validação

#### Data Processing
- **Sanitize Digits**: Remove caracteres não numéricos
- **Validate With Script**: Valida dados com Lua/Python

#### Flow Control
- **Branch By Status**: Ramifica baseado no status
- **Route Result**: Roteia baseado no resultado
- **Offer Fallback**: Oferece opção de fallback

#### Actions
- **Transfer**: Transfere a chamada
- **Bridge**: Conecta a chamada
- **Call Center**: Envia para fila de atendimento
- **Hangup**: Encerra a chamada

### 3. Pré-visualização XML em Tempo Real

- **Tab Configuração**: Edita parâmetros do nó
- **Tab XML**: Mostra XML gerado para o nó
- **Tab Pré-visualização**: Visualização formatada do XML

### 4. Geração Automática de XML

O sistema gera automaticamente XML válido do FreeSWITCH baseado em:
- Configuração de cada nó
- Ordem dos nós no flow
- Conexões entre nós
- Parâmetros específicos de cada tipo

## Como Usar

### 0. Regras Importantes do Nó Start

- **OBRIGATÓRIO**: Todo flow deve ter um nó Start
- **PRIMEIRO**: O nó Start deve ser sempre o primeiro nó do flow
- **ÚNICO**: Apenas um nó Start é permitido por flow
- **AUTOMÁTICO**: Gera automaticamente `<action application="set" data="organizationID=${domain_uuid}"/>`

### 1. Criar um Novo Flow

1. Clique em "Criar Novo Flow"
2. Digite o nome do flow
3. Clique em "Criar Flow"

### 2. Adicionar Nós

1. Arraste nós da barra lateral para o canvas
2. Posicione os nós conforme necessário
3. Conecte os nós arrastando de um ponto de conexão para outro

### 3. Configurar um Nó

1. Clique em um nó para selecioná-lo
2. Use o painel direito para configurar:
   - **Configuração**: Edite parâmetros específicos
   - **XML**: Veja o XML gerado
   - **Pré-visualização**: Visualize o resultado

### 4. Pré-visualizar XML Completo

1. Clique em "Pré-visualizar XML" no header
2. Visualize o XML completo do flow
3. Use os botões para:
   - Copiar XML para clipboard
   - Download do arquivo XML
   - Deployar no FreeSWITCH

### 5. Deployar no FreeSWITCH

1. Configure todos os nós necessários
2. Clique em "Deployar no FreeSWITCH"
3. O XML será salvo automaticamente no servidor

## Estrutura do XML Gerado

```xml
<context name="default">
  <extension name="nome_do_flow-flow">
    <condition field="destination_number" expression="^7000$">
      
      <!-- Answer -->
      <action application="answer"/>
      
      <!-- Set Defaults -->
      <action application="set" data="organizationID=${organizationID}"/>
      <action application="set" data="AUDIO_BASE=/usr/local/freeswitch/recordings/${organizationID}"/>
      
      <!-- Playback -->
      <action application="playback" data="${AUDIO_BASE}/prompt.wav"/>
      
      <!-- Collect Digits -->
      <action application="play_and_get_digits" data="1 11 3 7000 # ${AUDIO_BASE}/prompt.wav ${AUDIO_BASE}/invalid.wav INPUT"/>
      
      <!-- Transfer -->
      <action application="transfer" data="3000 XML default"/>
      
    </condition>
  </extension>
</context>
```

## Validação Automática

O sistema valida automaticamente:
- Nome do flow obrigatório
- **Presença obrigatória do nó Start**
- **Nó Start deve ser o primeiro do flow**
- **Apenas um nó Start por flow**
- Presença de pelo menos um nó
- Campos obrigatórios em cada nó
- Conectividade entre nós
- Sintaxe XML gerada

## Integração com FreeSWITCH

### Salvamento Automático
- XML é salvo em `/etc/freeswitch/dialplan/default.xml`
- Configurações são persistidas no banco de dados
- Deploy automático ao salvar

### Compatibilidade
- Segue padrões oficiais do FreeSWITCH
- Suporta todas as aplicações principais
- Compatível com versões recentes

## Arquitetura Técnica

### Componentes
- `NodeConfigPanel`: Configuração individual de nós
- `FlowXMLPreview`: Pré-visualização XML completa
- `FlowEditor`: Editor principal com canvas
- `nodeTypes`: Definição de tipos de nós

### Estado
- Nós e conexões gerenciados pelo ReactFlow
- Configurações salvas em tempo real
- XML gerado dinamicamente

### Persistência
- Supabase para dados do flow
- FreeSWITCH para XML de execução
- Backup automático de versões

## Exemplos de Uso

### IVR Simples
1. Start → Answer → Playback → Collect Digits → Transfer

### IVR com Validação
1. Start → Answer → Set Defaults → Playback → Collect Digits → Sanitize Digits → Validate Script → Route Result

### IVR com Fallback
1. Start → Answer → Playback → Collect Digits → Branch By Status → Offer Fallback → Call Center

## Troubleshooting

### Problemas Comuns
- **Nó não configurado**: Verifique campos obrigatórios
- **XML inválido**: Valide sintaxe e parâmetros
- **Deploy falhou**: Verifique permissões do FreeSWITCH

### Logs
- Console do navegador para erros de interface
- Logs do FreeSWITCH para erros de execução
- Validação em tempo real no painel

## Próximos Passos

- [ ] Suporte a mais tipos de nós
- [ ] Templates de flows pré-configurados
- [ ] Teste de chamadas em tempo real
- [ ] Versionamento de flows
- [ ] Colaboração em tempo real
- [ ] Integração com sistemas externos

## Suporte

Para dúvidas ou problemas:
1. Verifique a documentação do FreeSWITCH
2. Consulte os logs de validação
3. Teste com flows simples primeiro
4. Valide sintaxe XML gerada

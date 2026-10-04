# 🌊 Controle de Marés - Areia Branca & Macau (RN)
### INTERSAL • Sala de Operação Náutica e Portuária

[![React](https://img.shields.io/badge/React-19-blue.svg?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite)](https://vitejs.dev/)
[![PWA](https://img.shields.io/badge/PWA-Ready-green?logo=pwa)](https://web.dev/progressive-web-apps/)
[![DHN 2026](https://img.shields.io/badge/DHN-Tábua_2026-016836)](https://www.marinha.mil.br/dhn/)

> Aplicação web progressiva (PWA) de alto desempenho para monitoramento em tempo real de marés, condições meteorológicas, carta náutica e operações de embarque de sal nos portos de **Areia Branca (TERMISA)** e **Macau - RN**.

---

## 📌 Principais Funcionalidades

- **🌊 Monitoramento em Tempo Real:** Cálculo dinâmico do nível da maré atual, tendência (enchente/vazante), taxa de variação (cm/h) e contagem regressiva para os próximos estofos.
- **📊 Curva Harmônica & Gráfico Interativo:** Visualização de 24h/48h com interpolação senoidal náutica precisa, destacando preamares e baixamares.
- **📅 Tábua Oficial DHN 2026:** Consulta completa dos 365 dias do ano, identificando fases lunares, marés de sizígia e quadratura.
- **🗺️ Carta Náutica & Mapa Satélite (Leaflet):** Georreferenciamento de pontos de interesse (Terminal Salineiro Intersal, Bóias, Barra de Macau) com suporte a GPS e geolocalização do operador.
- **💨 Meteorologia & Condições Marítimas:** Integração em tempo real com dados de ventos (alísios e rajadas), pressão atmosférica, temperatura e previsão semanal.
- **🚢 Gestão de Embarques INTERSAL:** Painel analítico de line-up de navios, movimentação de sal (tonelagens), gráficos de produtividade e histórico operacional.
- **🔔 Central de Alertas:** Configuração de limiares operacionais de maré crítica, calado seguro e notificações no dispositivo.
- **📱 Suporte PWA Offline:** Instalável no smartphone (Android/iOS) e desktop, com service worker ativo para respostas ultrarrápidas.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Motion (Framer Motion)
- **Mapas:** Leaflet & React-Leaflet
- **Ícones:** Lucide React
- **Build Tool:** Vite 6
- **Servidor Web / Produção:** Apache / Nginx com suporte a `.htaccess` e roteamento SPA

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [npm](https://www.npmjs.com/) ou [bun](https://bun.sh/)

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/mares-intersal.git
   cd mares-intersal
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse a aplicação no navegador em: `http://localhost:3000`

4. **Gerar a build de produção:**
   ```bash
   npm run build
   ```
   Os arquivos finais otimizados serão gerados nas pastas `dist/` e `production/`.

---

## 📂 Estrutura do Projeto

```text
├── public/                # Arquivos estáticos (ícones, manifest, sw.js, .htaccess)
├── src/
│   ├── components/        # Componentes modulares de UI (gráficos, tabelas, mapa, etc.)
│   ├── data/              # Dados das tábuas de marés DHN 2026 e históricos
│   ├── services/          # Serviços de API (meteorologia, marés, dados)
│   ├── types/             # Definições de tipos TypeScript
│   ├── utils/             # Funções de cálculo harmônico e formatação
│   ├── App.tsx            # Componente raiz da aplicação
│   └── main.tsx           # Ponto de entrada React
├── production/            # Build compilada pronta para produção
├── .htaccess              # Configuração Apache para MIME types e SPA Routing
├── vite.config.ts         # Configuração do Vite e Tailwind CSS
└── package.json           # Dependências e scripts do projeto
```

---

## 🚢 Sincronização Automática do Line-Up (Intersal)

O projeto conta com monitoramento automatizado do boletim oficial da Intersal (`http://intersal.com.br/assets/arquivos/programacao-navios.pdf`):

- **Script de Sincronização:** `scripts/sync-intersal.js`
  - Faz requisições HTTP `HEAD` leves para verificar `Last-Modified` e `ETag` sem transferir o PDF desnecessariamente.
  - Ao identificar nova edição, efetua o download, extrai a tabela completa de navios (LOA, DWT, ETAs, volumes e status) e atualiza `src/data/saltShipmentsData.ts`.
  - Salva uma cópia pública do PDF oficial em `public/programacao-navios.pdf`.
  - Registra o estado da última checagem em `scripts/last_sync.json`.

- **Comandos via Terminal:**
  ```bash
  # Verificar se há nova edição e atualizar se necessário
  npm run sync:lineup

  # Forçar download e reprocessamento do PDF
  npm run sync:lineup:force
  ```

- **Automação no GitHub Actions (`.github/workflows/monitor-lineup.yml`):**
  - Roda automaticamente nos horários operacionais do porto (segunda a sexta às 06h, 09h, 12h, 15h e 18h de Brasília; finais de semana às 09h e 15h).
  - Pode ser disparado manualmente a qualquer momento pela aba **Actions** no GitHub (*Run workflow*).
  - Se houver novos dados, realiza o commit e push com o carimbo oficial da atualização, disparando o deploy contínuo da aplicação.

---

## 🌐 Deploy em Servidor Web (Apache / cPanel / Hospedagem)

Para publicar em um servidor web:

1. Execute `npm run build`
2. Envie todo o conteúdo da pasta **`production/`** para o diretório raiz ou subdiretório do servidor:
   - 📁 `assets/` *(arquivos .js e .css compilados)*
   - 📄 `index.html`
   - 📄 `.htaccess`
   - 📄 `manifest.webmanifest` e imagens/ícones
3. O arquivo `.htaccess` incluso já está configurado com regras de rewrite SPA e cabeçalhos MIME corretos para JavaScript ES Modules.

---

## 📄 Licença

Projeto desenvolvido para a **INTERSAL - Sala de Operação**. Todos os direitos reservados.

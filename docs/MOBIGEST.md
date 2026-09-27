# MobiGest — Mapa funcional

## Objectivo
Sistema municipal para gestão e registo de **motorizadas, carros e bicicletas**, com organização por município e posto administrativo.

Esta fase é exclusivamente de **produto e interface**. Os dados apresentados na interface são demonstrações e não devem ser tratados como dados reais.

## Módulos desenhados

### 1. Entrada e acesso
- Página institucional
- Login
- Recuperação de palavra-passe
- Nova palavra-passe
- Área reservada

### 2. Dashboard
- Visão geral
- Motorizadas
- Carros
- Bicicletas
- Estados
- Registos recentes
- Indicadores mensais
- Acesso por tipo e estado

### 3. Veículos
- Lista geral
- Pesquisa e filtros
- Novo registo por tipo
- Ficha individual
- Documentação
- QR Code
- Impressão
- Histórico
- Transferência de propriedade

### 4. Proprietários
- Lista e pesquisa
- Novo proprietário
- Perfil
- Veículos associados
- Histórico de propriedade
- Contactos adicionais

### 5. Estados e transições
- Activa
- Suspensa
- Roubada
- Apreendida
- Cancelada
- Pendente de validação pertence ao processo de registo
- À venda é situação comercial
- Transferência é uma operação histórica

### 6. Numeração MobiGest
Formato: **MOBI-{CÓDIGO_MUNICÍPIO}-{SEQUÊNCIA_DE_6_DÍGITOS}**. Exemplo: **MOBI-LIC-000001**.
A sequência é por município, começa em 000001, é independente do tipo de veículo, só é atribuída após aprovação, é permanente, não é reutilizada após cancelamento e deve ser gerada atomicamente no servidor com restrição de unicidade.

### 7. Estrutura territorial
**Município → Posto Administrativo → Localidade/Bairro → Registo**.

### 8. Consulta pública
A consulta pública mostra apenas o mínimo necessário: número MobiGest, tipo, marca, modelo, cor, ano quando disponível, município e estado. Dados pessoais, documentos, contactos, chassis, motor, pagamentos e histórico de fiscalização ficam protegidos.

### 9. Fiscalização
Consulta por MobiGest/QR, nova fiscalização, resultados configuráveis, ocorrências, evidências, histórico e integração com estados do veículo, sempre respeitando município e permissões.

### 10. Financeiro
Taxas municipais, cobranças, pagamentos, recibos, isenções, reembolsos e relatórios financeiros. Os valores e regras são definidos por município; os valores aplicados ficam preservados na cobrança histórica.

### 11. Auditoria e rastreabilidade
O MobiGest deve manter um histórico das acções relevantes realizadas pelos utilizadores.

Cada evento de auditoria deve, quando aplicável, guardar:
- utilizador;
- perfil;
- município;
- data e hora;
- acção;
- módulo/área;
- entidade afectada;
- identificador da entidade;
- resultado;
- referência relacionada;
- valor anterior;
- valor novo;
- observação;
- origem da operação.

Acções a auditar incluem, entre outras:
- criação de registo;
- alteração de dados;
- aprovação/rejeição;
- alteração de estado;
- transferência de propriedade;
- geração de QR;
- criação/alteração de taxas;
- confirmação de pagamento;
- isenção;
- reembolso;
- criação/alteração de utilizadores e permissões;
- fiscalizações e ocorrências.

Os eventos de auditoria devem ser tratados como histórico imutável: não devem ser apagados nem alterados silenciosamente.

A consulta da auditoria deve permitir pesquisa e filtros por:
- período;
- utilizador;
- município;
- módulo;
- acção;
- entidade;
- referência.

O acesso à auditoria deve ser limitado às permissões já definidas. O isolamento entre municípios deverá ser aplicado com RLS no Supabase.

A auditoria funcional do MobiGest é distinta dos logs internos do Supabase. O Supabase também disponibiliza Audit Logs para eventos de autenticação e mecanismos de logging da plataforma; estes serão complementares ao histórico funcional do MobiGest. 

### 12. Relatórios
- Veículos por período
- Veículos por tipo
- Veículos por estado
- Proprietários
- Transferências
- Fiscalização
- Veículos roubados
- Receitas
- Indicadores de auditoria

### 13. Utilizadores, perfis e segurança
Cinco perfis: Super Administrador, Administrador Municipal, Técnico, Fiscal e Financeiro. O controlo efectivo será aplicado posteriormente com Auth, RLS e autorização no servidor.

### 14. Impressão
- Ficha do veículo
- QR Code
- Identificação MobiGest
- Recibo financeiro

## Fluxos principais

### Registo
Novo registo → Tipo → Proprietário → Veículo → Localização → Documentação → Confirmação → Número MobiGest → QR

### Consulta pública
QR/Número → Veículo → Estado público → Dados não sensíveis

### Fiscalização
Pesquisar/QR → Confirmar veículo → Verificar situação → Registar fiscalização → Ocorrência, quando necessária → Histórico

### Financeiro
Serviço → Taxa aplicável → Cobrança → Pagamento → Recibo → Auditoria

### Transferência
Veículo → Proprietário actual → Novo proprietário → Documentação → Confirmação → Histórico → Auditoria

### Estado
Veículo → Alterar estado → Motivo/ocorrência → Utilizador → Data/hora → Histórico → Auditoria

## Preparação para Supabase

Antes da implementação definitiva:
1. Criar entidades e relações.
2. Definir campos obrigatórios.
3. Criar constraints e índices.
4. Aplicar RLS a todas as tabelas expostas.
5. Criar políticas por município e perfil.
6. Criar testes de RLS.
7. Implementar auditoria funcional.
8. Ligar autenticação e perfis.
9. Configurar armazenamento de documentos/evidências.
10. Validar fluxos ponta a ponta.

A RLS deve ser aplicada às tabelas expostas e testada para operações permitidas e negadas. O Supabase recomenda habilitar RLS e criar políticas por operação. 

## Nota
Os requisitos municipais e valores de taxas devem ser confirmados antes de serem tratados como regras oficiais do sistema.


### 18. Administrador Municipal
O Super Administrador dispõe de um fluxo próprio para preparar o Administrador Municipal a partir da ficha do município.

O processo está organizado em quatro etapas:
1. **Dados** — identificação e contacto;
2. **Acesso** — email institucional e perfil fixo de Administrador Municipal;
3. **Âmbito** — município, código MobiGest, posto administrativo opcional e estado;
4. **Revisão** — confirmação dos dados antes da criação.

Regras funcionais:
- o município é definido pelo contexto de criação e não é alterado no formulário;
- o perfil é **Administrador Municipal**;
- o posto administrativo pode restringir o âmbito territorial quando aplicável;
- o Super Administrador pode preparar o vínculo globalmente;
- a criação real da conta, convite de acesso, autenticação e políticas RLS dependem da integração com Supabase;
- a preparação do administrador deve ficar registada na auditoria quando a persistência real for implementada.


### 19. Perfis e permissões detalhados
A autorização do MobiGest é composta por duas camadas:

**1. Operação**
- Consultar
- Criar
- Editar
- Validar
- Alterar estado
- Transferir
- Operações financeiras
- Gestão de utilizadores

**2. Âmbito**
- Super Administrador: toda a plataforma;
- Administrador Municipal: município atribuído;
- Técnico: município e, quando definido, posto administrativo;
- Fiscal: município e, quando definido, posto administrativo;
- Financeiro: município.

Perfis funcionais:
- **Super Administrador:** administração global, municípios, utilizadores, configurações, auditoria e operações globais.
- **Administrador Municipal:** gestão operacional do município, incluindo utilizadores municipais, registos, veículos, proprietários, documentos e configurações permitidas.
- **Técnico:** criação/edição de registos, proprietários, veículos e documentos, incluindo validação quando atribuída.
- **Fiscal:** consulta e fiscalização, incluindo registo de ocorrências e alterações de estado autorizadas.
- **Financeiro:** consulta dos processos necessários e gestão de taxas, cobranças, pagamentos e informação financeira.

Princípios:
- o perfil não deve, por si só, conceder acesso a todos os dados;
- o município limita o conjunto de dados acessíveis;
- o posto administrativo pode restringir ainda mais o âmbito;
- permissões de maior impacto devem ser auditadas;
- alterações de perfil, município ou permissões devem gerar evento de auditoria;
- o controlo real será implementado com Supabase Auth, perfil funcional, autorização no servidor e RLS.

A matriz apresentada na interface é a referência funcional do produto e deverá ser convertida em políticas testáveis antes da entrada em produção.


### 20. Licenças de utilização do MobiGest
A área de Licenças do Super Administrador controla a **licença de utilização do software MobiGest** atribuída a cada município. Esta licença é distinta das licenças, taxas ou autorizações municipais aplicadas aos veículos.

Cada licença deverá guardar, no mínimo:
- município;
- plano;
- identificador da licença;
- data de início;
- data de fim;
- estado;
- limites de utilizadores;
- limites de veículos;
- módulos incluídos;
- referência/observação;
- histórico de alterações e renovações.

Estados previstos:
- **Em configuração**
- **Activa**
- **Suspensa**
- **Expirada**
- **Cancelada**

Regras:
- uma licença pertence a um município;
- o município não deve ter duas licenças activas concorrentes sem uma regra explícita de transição;
- suspender uma licença não apaga dados;
- expiração não elimina histórico;
- renovação deve preservar o histórico da licença anterior;
- alterações de plano, limites, período e estado devem gerar auditoria;
- limites e módulos são definidos pelo plano e podem ser configuráveis;
- preços definitivos ainda não estão fixados no produto e serão definidos pela Ubuntu Service.

Planos inicialmente desenhados:
- Inicial;
- Profissional;
- Enterprise;
- Demonstração.

Na integração com Supabase, a licença deverá participar das regras de acesso da plataforma. A verificação deverá considerar, pelo menos, utilizador, município, perfil e estado/validade da licença, sem substituir as políticas RLS.


### 21. Notificações do Super Administrador
A plataforma terá um centro próprio de notificações para o Super Administrador, separado das notificações operacionais de cada município.

Tipos de alerta previstos:
- licenças próximas da renovação;
- licenças suspensas ou expiradas;
- municípios em configuração;
- criação ou alteração de Administradores Municipais;
- alterações relevantes de utilizadores e permissões;
- eventos de segurança;
- actividades críticas de auditoria;
- falhas ou situações operacionais que exijam acompanhamento.

Cada notificação deverá guardar:
- utilizador destinatário;
- tipo/categoria;
- título;
- mensagem;
- severidade;
- município relacionado, quando aplicável;
- entidade e referência relacionadas, quando aplicável;
- data/hora;
- estado lida/não lida;
- data de leitura.

Regras:
- notificações são alertas e não substituem a auditoria;
- o conteúdo deve permitir navegar para o contexto relacionado quando aplicável;
- cada utilizador vê apenas as suas notificações;
- eventos globais podem ser destinados aos Super Administradores;
- na integração com Supabase, a criação e leitura serão persistidas e protegidas por RLS;
- alertas críticos devem permanecer no histórico de notificações mesmo depois de marcados como lidos.

Na interface actual estão previstos pesquisa, filtro por categoria, filtro de não lidas e marcação individual ou global como lida.


### 22. Saúde da plataforma
A área **Saúde da plataforma** pertence ao Super Administrador e acompanha a preparação técnica do MobiGest.

Componentes acompanhados:
- aplicação web;
- Supabase;
- autenticação;
- RLS e isolamento por município;
- base de dados;
- armazenamento de documentos;
- integrações externas;
- CI/testes automáticos.

Estados funcionais:
- **Configurado** — componente preparado no projecto;
- **Pendente** — existe desenho ou configuração inicial, mas falta implementação;
- **Não configurado** — ainda não foi preparado.

A página também mantém um checklist de produção, incluindo:
- modelo de dados;
- Auth e perfis;
- RLS;
- Storage;
- numeração atómica;
- auditoria persistente;
- testes de segurança e RLS.

Importante: nesta fase, a página é um **painel de preparação técnica**, não um monitor de uptime. Não deve apresentar disponibilidade em tempo real sem uma verificação efectiva do backend. Depois da integração com Supabase e de uma camada de health checks, os estados poderão ser alimentados automaticamente.

Antes da entrada em produção, o Super Administrador deverá conseguir identificar claramente:
- serviços indisponíveis;
- erros de integração;
- falhas de autenticação;
- problemas de base de dados;
- falhas de Storage;
- problemas de RLS;
- tarefas técnicas pendentes.


### 23. Relatórios globais do Super Administrador
A área **Relatórios globais** permite ao Super Administrador consultar uma visão consolidada da plataforma MobiGest.

Áreas previstas:
- veículos;
- proprietários;
- registos;
- utilizadores;
- fiscalização;
- financeiro;
- licenças;
- auditoria;
- visão geral da plataforma.

Filtros globais:
- município;
- tipo de relatório;
- período inicial;
- período final.

A área global pode consolidar dados de vários municípios. Os relatórios municipais continuam sujeitos ao âmbito do município e às permissões do utilizador.

A interface prevê:
- indicadores consolidados;
- resumo por município;
- impressão;
- exportação CSV;
- indicação clara de dados demonstrativos enquanto o backend não estiver ligado.

Quando o Supabase for integrado:
- os indicadores serão calculados a partir dos dados persistidos;
- as consultas globais serão reservadas ao Super Administrador;
- as consultas municipais serão limitadas pelo âmbito e pelas políticas RLS;
- valores financeiros históricos deverão respeitar os valores efectivamente registados nas cobranças;
- exportações deverão ser auditadas quando envolverem informação sensível ou operações de elevado impacto.

Os números apresentados actualmente são apenas dados de demonstração e não representam estatísticas reais dos municípios.


### 24. Acesso controlado à Área Municipal
O Super Administrador terá acesso à área operacional dos municípios através de um fluxo controlado, e não por uma ligação directa para o dashboard municipal.

Fluxo:
1. seleccionar o município;
2. confirmar o contexto;
3. escolher o modo de acesso;
4. indicar a duração;
5. indicar o motivo;
6. iniciar uma sessão temporária;
7. regressar à área global quando a sessão terminar.

Modos previstos:
- **Consulta** — leitura e acompanhamento;
- **Assistência** — apoio operacional sujeito às permissões aplicáveis.

Regras de segurança:
- o município deve ser explícito;
- o motivo do acesso é obrigatório;
- a sessão deve ter duração limitada;
- início e fim devem ser registados;
- as operações realizadas durante o acesso devem manter o contexto do município;
- o acesso não deve alterar permanentemente o perfil do Super Administrador;
- o Super Administrador não deve receber acesso municipal através de uma simples alteração no frontend;
- a autorização efectiva será aplicada no backend com Auth, autorização por contexto e RLS.

Na interface actual, o fluxo está preparado como protótipo. O botão de início ainda não cria uma sessão real nem concede permissões, porque essa parte depende da integração com Supabase.

Quando for implementado no backend, recomenda-se guardar um registo de sessão de acesso com:
- utilizador global;
- município;
- modo;
- motivo;
- início;
- expiração;
- fim efectivo;
- IP/metadados de segurança, quando apropriado;
- estado;
- referência de auditoria.

O contexto municipal deve acompanhar consultas, alterações e exportações feitas durante a sessão, permitindo rastrear claramente que o Super Administrador actuou dentro de determinado município.


## 25. Autenticação e controlo inicial de acesso

A primeira camada de acesso do MobiGest utiliza o Supabase Auth.

### Implementado
- Login por email e palavra-passe com `signInWithPassword`.
- Remoção do antigo modo de demonstração no login.
- Protecção global das rotas internas através do componente `RequireAuth`.
- Redireccionamento de utilizadores sem sessão para `/login`, preservando a rota de destino.
- Logout real da sessão actual com `signOut({ scope: "local" })`.
- Recuperação de palavra-passe com `resetPasswordForEmail`.
- Definição de nova palavra-passe com `updateUser`.
- Consulta pública continua acessível sem autenticação em `/consulta/*` e `/q/*`.

### Próxima camada
A autenticação confirma que o utilizador possui uma sessão válida. A autorização por perfil, município e posto será implementada depois da criação das tabelas de perfis e municípios e das respectivas políticas RLS.

Por isso, nesta fase, a existência de uma sessão não deve ser interpretada como autorização para todas as operações do MobiGest.


### 26. Arquitectura da Base de Dados Supabase

A Fase 3 criou a arquitectura relacional inicial em:

`supabase/migrations/20260927000000_mobigest_initial_schema.sql`

Também foi criada a documentação técnica detalhada em `docs/MOBIGEST_BD.md`.

O modelo inclui:
- municípios, postos e localidades;
- perfis, permissões e âmbito territorial;
- planos e licenças MobiGest;
- proprietários e contactos adicionais;
- veículos;
- processos de registo e decisões de validação;
- documentos e requisitos documentais;
- histórico de estados;
- histórico de propriedade/transferências;
- contador de numeração por município;
- fiscalização e evidências;
- taxas, cobranças e pagamentos;
- notificações;
- auditoria;
- sessões temporárias de acesso municipal do Super Administrador.

A migration já activa RLS nas tabelas públicas criadas, mas **não cria ainda as políticas de acesso**. Isso será tratado na Fase 4, depois de confirmar as regras de perfil, município e posto.

A migration não contém dados de demonstração nem credenciais.

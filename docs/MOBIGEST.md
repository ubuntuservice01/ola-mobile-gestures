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

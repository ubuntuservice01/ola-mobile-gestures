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

### 4. Estados
A interface está preparada para Activa, À venda, Roubada, Apreendida, Pendente, Transferida e Cancelada. Os estados e regras definitivos deverão ser confirmados antes da base de dados.

### 5. Proprietários
- Lista e pesquisa
- Novo proprietário
- Perfil
- Veículos associados
- Histórico de propriedade

### 6. Estrutura territorial
- Municípios
- Postos administrativos
- Localidades/bairros
- Distribuição de veículos por posto

### 7. Fiscalização
- Pesquisa por número MobiGest
- Consulta por QR Code
- Registo de fiscalização
- Infração
- Apreensão
- Roubo
- Recuperação
- Histórico de ocorrências

### 8. Consulta pública
- Pesquisa por número MobiGest
- Resultado público
- Consulta por QR
- Protecção de dados pessoais
- Estado público do veículo

### 9. Financeiro
Interface preparada para taxas, registos, transferências, pagamentos, pendentes, recibos e relatórios de receita. Valores e regras deverão ser definidos antes da base de dados.

### 10. Relatórios
- Veículos por período
- Veículos por tipo
- Veículos por estado
- Proprietários
- Transferências
- Fiscalização
- Veículos roubados
- Receitas

### 11. Utilizadores e segurança
- Utilizadores
- Perfis
- Permissões
- Auditoria
- Área municipal

A aplicação está preparada para posteriormente aplicar isolamento por município e RLS no Supabase.

### 12. Impressão
- Ficha do veículo
- QR Code
- Identificação MobiGest

## Fluxos principais

### Registo
Novo registo → Tipo → Proprietário → Veículo → Localização → Documentação → Confirmação → Número MobiGest → QR

### Consulta pública
QR/Número → Veículo → Estado público → Dados não sensíveis

### Fiscalização
Pesquisar/QR → Confirmar veículo → Registar ocorrência → Actualizar histórico

### Transferência
Veículo → Proprietário actual → Novo proprietário → Documentação → Confirmação → Histórico

### Estado
Veículo → Alterar estado → Motivo/ocorrência → Utilizador → Data/hora → Histórico

## Próxima fase: Supabase

Antes de criar tabelas, confirmar:
1. Campos obrigatórios de cada entidade.
2. Formato definitivo do número MobiGest.
3. Municípios e postos administrativos.
4. Estados e transições permitidas.
5. Regras de transferência.
6. Documentos obrigatórios por tipo de veículo.
7. Informação visível na consulta pública.
8. Taxas e pagamentos.
9. Perfis e permissões definitivos.
10. Política de auditoria.
11. Regras de isolamento entre municípios.

Só depois destes pontos será criada a estrutura SQL, relações, índices, triggers, funções e RLS.
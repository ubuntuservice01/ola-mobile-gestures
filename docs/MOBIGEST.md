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

### 3.1 Documentação e requisitos
A documentação é configurável por **município + tipo de veículo**, mantendo uma matriz base.

### 4. Estados e transições
O modelo funcional usa cinco estados principais: **Activa, Suspensa, Roubada, Apreendida e Cancelada**. Pendente de validação pertence ao processo de registo; à venda é situação comercial; transferência é uma operação que fica no histórico.

### 5. Proprietários
- Lista e pesquisa
- Novo proprietário
- Perfil
- Veículos associados
- Histórico de propriedade
- Contactos adicionais

### 6. Numeração MobiGest
Formato: **MOBI-{CÓDIGO_MUNICÍPIO}-{SEQUÊNCIA_DE_6_DÍGITOS}**. Exemplo: **MOBI-LIC-000001**.

A sequência é por município, começa em 000001, é independente do tipo de veículo, só é atribuída após aprovação, é permanente, não é reutilizada após cancelamento e deve ser gerada atomicamente no servidor com restrição de unicidade.

### 7. Estrutura territorial
**Município → Posto Administrativo → Localidade/Bairro → Registo**.

### 8. Consulta pública
A consulta pública mostra apenas o mínimo necessário: número MobiGest, tipo, marca, modelo, cor, ano quando disponível, município e estado. Dados pessoais, documentos, contactos, chassis, motor, pagamentos e histórico de fiscalização ficam protegidos.

### 9. Fiscalização

O módulo de fiscalização permite verificar veículos no terreno, registar actos de fiscalização e acompanhar ocorrências, respeitando município e permissões do utilizador.

#### 9.1 Consulta rápida
O fiscal pode pesquisar por:
- número MobiGest;
- QR Code;
- outros identificadores permitidos pelo perfil.

A consulta apresenta, conforme permissões:
- número MobiGest;
- tipo;
- marca/modelo;
- cor;
- ano;
- município;
- estado actual;
- situação documental necessária à fiscalização.

Não apresenta por defeito dados pessoais, financeiros ou informação interna.

#### 9.2 Nova fiscalização
Fluxo:
**Identificar veículo → Confirmar veículo → Verificar registo/documentação → Registar resultado → Observação → Evidência opcional → Finalizar**

Cada fiscalização deve guardar:
- veículo;
- proprietário, quando necessário;
- município;
- posto administrativo;
- localidade/bairro;
- local;
- data/hora;
- fiscal responsável;
- resultado;
- observação;
- evidências, quando existirem.

#### 9.3 Resultados
Resultados iniciais configuráveis:
- Regular;
- Irregularidade documental;
- Registo suspenso;
- Veículo reportado como roubado;
- Veículo apreendido;
- Dados divergentes;
- QR Code inválido;
- Registo inexistente;
- Outro.

Um resultado de fiscalização não significa automaticamente multa, apreensão ou alteração de estado.

#### 9.4 Ocorrências
Uma fiscalização pode gerar uma ocorrência:
- Aberta;
- Em análise;
- Resolvida;
- Cancelada.

A ocorrência deve manter histórico e não pode ser apagada silenciosamente.

#### 9.5 Evidências
Podem ser anexados, quando configurado:
- fotografia;
- documento;
- outro ficheiro.

Cada evidência deve guardar tipo, nome, data, utilizador e ocorrência relacionada.

#### 9.6 Estado do veículo
A fiscalização não deve contornar o fluxo de alteração de estado. Quando necessário, deve usar a operação de alteração de estado já definida, guardando estado anterior, novo estado, motivo, utilizador, data/hora e referência da ocorrência.

#### 9.7 Histórico
Cada fiscalização deve aparecer no histórico do veículo e no histórico geral de fiscalização. O histórico deve ser pesquisável por número MobiGest e filtrável por município, tipo, resultado e período.

#### 9.8 Perfis
O Fiscal pode consultar veículos, ler QR Code, registar fiscalizações, criar ocorrências e adicionar evidências dentro do seu âmbito. Não pode gerir utilizadores, municípios, taxas ou apagar histórico. Alterações de estado dependem das permissões já definidas.

#### 9.9 Auditoria e isolamento
Toda fiscalização deve guardar utilizador, perfil, município, data/hora, veículo, acção e resultado. Os dados devem ficar isolados por município e preparados para RLS no Supabase.

### 10. Financeiro
Interface preparada para taxas, registos, transferências, pagamentos, pendentes, recibos e relatórios de receita. Valores e regras deverão ser definidos por município.

### 11. Relatórios
- Veículos por período
- Veículos por tipo
- Veículos por estado
- Proprietários
- Transferências
- Fiscalização
- Veículos roubados
- Receitas

### 12. Utilizadores, perfis e segurança
Cinco perfis: Super Administrador, Administrador Municipal, Técnico, Fiscal e Financeiro. O controlo efectivo será aplicado posteriormente com Auth, RLS e autorização no servidor.

### 13. Impressão
- Ficha do veículo
- QR Code
- Identificação MobiGest

## Fluxos principais

### Registo
Novo registo → Tipo → Proprietário → Veículo → Localização → Documentação → Confirmação → Número MobiGest → QR

### Consulta pública
QR/Número → Veículo → Estado público → Dados não sensíveis

### Fiscalização
Pesquisar/QR → Confirmar veículo → Verificar situação → Registar fiscalização → Ocorrência, quando necessária → Histórico

### Transferência
Veículo → Proprietário actual → Novo proprietário → Documentação → Confirmação → Histórico

### Estado
Veículo → Alterar estado → Motivo/ocorrência → Utilizador → Data/hora → Histórico

## Próxima fase: Supabase

Antes de criar tabelas, confirmar:
1. Campos obrigatórios de cada entidade.
2. Formato do número MobiGest.
3. Municípios e postos administrativos.
4. Estados e transições.
5. Regras de transferência.
6. Documentos obrigatórios por tipo.
7. Informação visível na consulta pública.
8. Taxas e pagamentos.
9. Perfis e permissões.
10. Política de auditoria.
11. Regras de isolamento entre municípios.
12. Estrutura de fiscalização, ocorrências e evidências.

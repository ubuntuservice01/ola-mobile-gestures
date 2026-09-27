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

#### Matriz base

| Documento/requisito | Motorizada | Carro | Bicicleta |
|---|---|---|---|
| Identificação do proprietário | Obrigatório | Obrigatório | Obrigatório |
| Documento/título do veículo ou comprovativo de propriedade | Obrigatório | Obrigatório | Configurável |
| Fotografia do veículo | Obrigatório | Obrigatório | Obrigatório |
| Comprovativo de aquisição/propriedade | Configurável | Configurável | Configurável |
| Número de chassis | Obrigatório | Obrigatório | Não aplicável |
| Número do quadro | Quando aplicável | Não aplicável | Obrigatório quando existente |
| Número do motor | Configurável | Configurável | Não aplicável |
| Matrícula | Configurável | Configurável | Não aplicável |
| Inspecção/regularidade | Configurável | Configurável | Configurável |
| Representação/autorização | Condicional | Condicional | Condicional |
| Outros documentos municipais | Configurável | Configurável | Configurável |

**Nota:** esta é uma matriz funcional do produto. Não deve ser tratada como lista definitiva de requisitos legais nacionais. Cada município deverá confirmar os requisitos que serão efectivamente exigidos.

#### Estados dos documentos
- Não apresentado
- Em validação
- Validado
- Rejeitado
- Expirado

Cada documento deverá guardar, no mínimo:
- tipo;
- entidade a que pertence;
- ficheiro;
- número/referência, quando existir;
- data de emissão, quando aplicável;
- data de validade, quando aplicável;
- estado;
- motivo de rejeição, quando aplicável;
- utilizador que validou;
- data/hora da validação.

**Regra de aprovação:** um processo não deve ser aprovado enquanto existir documento obrigatório em falta, rejeitado ou, quando aplicável, expirado.

### 4. Estados e transições

O modelo funcional fica fechado com **cinco estados principais do registo do veículo**:

1. **Activa** — registo válido e veículo autorizado para circulação.
2. **Suspensa** — registo temporariamente suspenso por decisão administrativa.
3. **Roubada** — veículo declarado como roubado.
4. **Apreendida** — veículo retido pelas autoridades competentes.
5. **Cancelada** — registo cancelado administrativamente; não volta directamente a Activa.

**Importante:**
- **Pendente de validação** é estado do processo de registo, não estado permanente do veículo.
- **À venda** é uma situação comercial que pode coexistir com um veículo Activo; não substitui o estado principal.
- **Transferida** é uma operação/evento de mudança de proprietário. Depois da transferência concluída, o veículo mantém o seu estado operacional (normalmente Activa) e o histórico conserva a transferência.

### Regras de transição

| Estado actual | Transições permitidas |
|---|---|
| Activa | Suspensa, Roubada, Apreendida, Cancelada |
| Suspensa | Activa, Cancelada |
| Roubada | Activa, Cancelada |
| Apreendida | Activa, Cancelada |
| Cancelada | Nenhuma transição directa |

Toda alteração deve guardar **estado anterior, novo estado, motivo, utilizador, data/hora e referência da ocorrência/processo**.

Uma transferência deve preservar o proprietário anterior e criar o novo proprietário no histórico. A transferência não deve ser permitida enquanto existirem situações que legalmente impeçam a mudança de titularidade.

### 5. Proprietários
- Lista e pesquisa
- Novo proprietário
- Perfil
- Veículos associados
- Histórico de propriedade

### 6. Estrutura territorial

A estrutura territorial do MobiGest fica organizada em quatro níveis funcionais:

**Município → Posto Administrativo → Localidade/Bairro → Registo**

#### Município
É o nível principal de gestão territorial e de isolamento dos dados.

Cada município terá, entre outros:
- nome;
- código;
- província;
- estado;
- configuração de numeração MobiGest;
- postos administrativos associados.

#### Posto Administrativo
Pertence a um único município.

É usado para:
- organizar atendimento e operação;
- limitar o âmbito de determinados utilizadores;
- distribuir registos;
- produzir relatórios territoriais.

#### Localidade/Bairro
Pertence a um único posto administrativo.

No registo de um veículo, a localização administrativa deverá permitir seleccionar:
**Município → Posto Administrativo → Localidade/Bairro**.

O sistema não deve permitir seleccionar um posto de outro município nem uma localidade pertencente a outro posto.

#### Âmbito dos utilizadores
- Super Administrador: acesso global.
- Administrador Municipal: município atribuído.
- Técnico/Fiscal/Financeiro: município atribuído e, quando configurado, posto administrativo atribuído.

#### Âmbito dos registos
Cada veículo, proprietário, fiscalização, processo e operação relevante deverá ficar associado ao município. Quando aplicável, o registo deverá também guardar posto administrativo e localidade/bairro.

A estrutura territorial será a base para filtros, dashboards, relatórios e RLS no Supabase.

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

### 11. Utilizadores, perfis e segurança

O modelo funcional fica fechado com cinco perfis:

1. **Super Administrador** — acesso global, incluindo municípios, configuração geral, utilizadores e auditoria.
2. **Administrador Municipal** — gere a operação do município atribuído e os utilizadores desse município.
3. **Técnico** — regista, actualiza e valida processos dentro do seu âmbito.
4. **Fiscal** — consulta veículos e proprietários dentro das permissões atribuídas e regista actos de fiscalização.
5. **Financeiro** — gere taxas, pagamentos e informação financeira, com acesso de consulta aos dados necessários.

### Âmbito territorial

- Super Administrador: global.
- Outros perfis: município obrigatório.
- Quando aplicável, o utilizador pode ficar limitado a um posto administrativo.
- Um utilizador não pode consultar ou alterar dados de outro município apenas por conhecer o identificador do registo.

### Operações críticas

As permissões deverão distinguir pelo menos:
- consultar;
- criar;
- editar;
- validar;
- alterar estado;
- transferir propriedade;
- gerir utilizadores;
- gerir municípios;
- gerir financeiro;
- consultar auditoria.

A interface apresenta a matriz funcional; o controlo efectivo será aplicado no Supabase com Auth, RLS e regras de autorização no servidor.

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
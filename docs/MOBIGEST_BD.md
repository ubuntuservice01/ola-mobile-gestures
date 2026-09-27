# MobiGest — Arquitectura da Base de Dados

## Fase 3 — Modelo relacional inicial

Esta fase transforma o mapa funcional do MobiGest num modelo relacional preparado para Supabase/PostgreSQL. A migration está em:

`supabase/migrations/20260927000000_mobigest_initial_schema.sql`

A migration **não cria dados de demonstração**. Municípios como Lichinga ou Pemba continuam apenas como dados visuais da interface até serem criados através do sistema.

## 1. Princípio de arquitectura

O MobiGest é multi-município.

A regra central é:

**Município → Posto Administrativo → Localidade/Bairro → operação/registo**

As entidades operacionais guardam `municipality_id` para permitir isolamento por município com RLS.

A autenticação continua no Supabase Auth. A tabela `public.profiles` liga cada utilizador autenticado ao seu perfil funcional, município e, quando aplicável, posto administrativo. A documentação do Supabase recomenda manter uma tabela própria no schema `public` referenciada a `auth.users`, protegida por RLS. citeturn0search2

## 2. Núcleo institucional

### `municipalities`
Representa cada município que utiliza o MobiGest.

Principais dados:
- nome;
- código único;
- província;
- área;
- contactos;
- endereço;
- estado.

### `administrative_posts`
Postos administrativos pertencentes a um município.

### `localities`
Localidades, bairros, povoações ou outras divisões territoriais ligadas a um posto.

## 3. Utilizadores e autorização

### `profiles`
Perfil funcional associado directamente ao utilizador do Supabase Auth.

Perfis previstos:
- `super_admin`
- `admin_municipal`
- `tecnico`
- `fiscal`
- `financeiro`

O perfil guarda também:
- município;
- posto administrativo opcional;
- estado;
- contacto.

### `permissions` e `role_permissions`
Preparam a matriz de permissões desenhada no Super Admin.

A autorização terá duas dimensões:
1. **o que** o utilizador pode fazer;
2. **onde** pode fazer — plataforma, município e eventualmente posto.

A RLS será a camada efectiva de isolamento. O Supabase recomenda políticas por operação e RLS nas tabelas expostas. citeturn0search0turn0search5

## 4. Licenças do MobiGest

### `license_plans`
Define planos e limites de utilização.

### `licenses`
Liga um plano a um município e guarda:
- período;
- estado;
- limites;
- observações;
- utilizador responsável pela criação.

A licença do software é separada das taxas municipais cobradas aos proprietários.

## 5. Proprietários

### `owners`
Regista o proprietário e os seus dados principais.

### `owner_contacts`
Permite guardar os **contactos adicionais** pedidos no formulário de registo:
- nome;
- relação;
- contacto principal;
- contacto alternativo;
- indicação de contacto principal;
- observação.

## 6. Veículos

### `vehicles`
Suporta:
- motorizada;
- carro;
- bicicleta.

Guarda:
- município;
- posto/localidade;
- proprietário actual;
- número MobiGest;
- QR;
- matrícula quando aplicável;
- chassis/quadro/motor;
- marca/modelo/cor/ano;
- situação comercial;
- estado operacional.

Estados operacionais:
- Activa;
- Suspensa;
- Roubada;
- Apreendida;
- Cancelada.

**Pendente de validação não é estado permanente do veículo**; pertence ao processo de registo.

### `vehicle_status_history`
Mantém o histórico de alterações de estado, com motivo, utilizador, ocorrência e data.

## 7. Registos e validação

### `registrations`
Representa o processo de registo.

Estados:
- Pendente;
- Em validação;
- Correcção;
- Aprovada;
- Rejeitada;
- Cancelada.

### `registration_decisions`
Guarda cada decisão de validação, incluindo observação, responsável e data.

O veículo pode existir sem número MobiGest enquanto o processo estiver pendente. O número definitivo será atribuído na aprovação.

## 8. Documentos

### `documents`
Modelo único para documentos ligados a:
- proprietário;
- veículo;
- processo de registo.

Cada documento guarda tipo, ficheiro, referência, datas, estado e validação.

Estados:
- Não apresentado;
- Em validação;
- Validado;
- Rejeitado;
- Expirado.

### `document_requirements`
Permite configurar, por município e tipo de veículo, quais documentos são obrigatórios e se exigem validade.

Isto evita transformar requisitos locais numa regra fixa do código.

## 9. Numeração MobiGest

### `numbering_counters`
Mantém o contador por município.

Regra funcional definida:
**MOBI-{CÓDIGO_MUNICÍPIO}-{SEQUÊNCIA_DE_6_DÍGITOS}**

Exemplo:
**MOBI-LIC-000001**

A geração atómica será implementada na Fase 7 através de função PostgreSQL/transacção. O contador não será incrementado pelo frontend.

## 10. Propriedade e transferências

### `ownership_history`
Mantém a sequência de proprietários do veículo.

Suporta:
- registo inicial;
- transferência.

A transferência não altera o número MobiGest do veículo.

## 11. Fiscalização

### `fiscalizations`
Regista fiscalizações associadas a veículo, município e localização.

### `fiscalization_evidence`
Guarda referências para evidências no Storage.

O Storage e as políticas de acesso serão configurados numa fase posterior.

## 12. Financeiro

### `fee_configs`
Configuração das taxas de cada município.

### `charges`
Cobranças concretas, preservando o valor aplicado no momento da cobrança.

### `payments`
Pagamentos, método, valor, referência e recibo.

Os valores das taxas não são fixados nesta migration porque dependem das regras aprovadas por cada município.

## 13. Notificações

### `notifications`
Notificações dirigidas a utilizadores específicos.

Permite:
- categoria;
- severidade;
- município;
- entidade relacionada;
- leitura/não leitura.

## 14. Auditoria

### `audit_logs`
Estrutura para a auditoria funcional do MobiGest.

Guarda:
- utilizador;
- perfil;
- município;
- módulo;
- acção;
- entidade;
- resultado;
- referência;
- valor anterior;
- valor novo;
- observação;
- origem;
- data/hora.

A implementação de gravação automática e a política de imutabilidade serão fechadas na fase de Auditoria real.

## 15. Acesso temporário do Super Administrador

### `municipal_access_sessions`
Prepara o acesso controlado do Super Administrador à área municipal.

Guarda:
- Super Admin;
- município;
- modo;
- motivo;
- início;
- expiração;
- fim efectivo;
- estado;
- referência de auditoria.

A sessão real e a autorização contextual serão implementadas com Auth/RLS.

## 16. Integridade e índices

A migration inclui:
- chaves primárias UUID;
- chaves estrangeiras;
- unicidade de códigos;
- restrições de estados;
- índices para município, proprietário, veículo, estado, documentos, auditoria e datas;
- `updated_at` automático;
- contador separado por município.

As constraints devem proteger a integridade no PostgreSQL em vez de depender apenas do frontend. PostgreSQL suporta constraints, foreign keys e índices como parte do próprio modelo relacional. citeturn1search2

## 17. RLS

A migration **já activa RLS em todas as tabelas públicas criadas**.

Nesta Fase 3 não são abertas políticas de acesso.

Isso é intencional: até a Fase 4, o backend fica fechado por defeito. Depois serão criadas políticas para:
- Super Administrador;
- Administrador Municipal;
- Técnico;
- Fiscal;
- Financeiro;
- consulta pública controlada.

O Supabase recomenda habilitar RLS nas tabelas expostas e criar políticas específicas por operação. citeturn0search0

## 18. Ordem de implementação depois da migration

1. **Fase 4:** perfis + municípios + RLS;
2. **Fase 5:** veículos + proprietários reais;
3. **Fase 6:** registo e validação reais;
4. **Fase 7:** numeração atómica PostgreSQL;
5. **Fase 8:** QR e consulta pública real;
6. **Fase 9:** fiscalização, financeiro e auditoria reais.

## 19. Segurança

O frontend usa apenas a chave pública/publishable do Supabase.

A chave secreta/service role **não deve ser colocada no frontend nem no GitHub**. O Supabase documenta que a publishable key pode ser usada no frontend quando RLS está correctamente configurada, enquanto chaves secret/service role devem permanecer no backend. citeturn0search9

A migration não contém qualquer credencial.

## Estado da Fase 3

**Arquitectura da BD: preparada no código.**

Ainda falta executar esta migration no projecto Supabase e, principalmente, construir e testar as políticas RLS da Fase 4 antes de permitir operações reais pela aplicação.

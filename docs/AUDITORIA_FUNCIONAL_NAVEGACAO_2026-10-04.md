# Auditoria funcional de navegação e acções — MobiGest

Data: 2026-10-04
Fonte de verdade: branch `main` do repositório `ubuntuservice01/ola-mobile-gestures`

## Regra de aceitação

Uma funcionalidade só pode ser marcada como concluída quando:
1. a rota existe;
2. o clique navega para o destino correcto;
3. o perfil tem autorização coerente no frontend e no RLS;
4. a página usa dados reais quando a operação é de produção;
5. guardar/emitir/alterar executa a operação no Supabase;
6. erros são tratados;
7. o build automatizado passa.

## Críticos

### Autorização e entrada
- [x] Login consulta `public.profiles`.
- [x] Super Admin é direccionado para `/super-admin`.
- [x] Perfis municipais são direccionados para `/dashboard`.
- [x] Super Admin não entra directamente na área municipal sem fluxo específico.
- [x] Utilizador municipal não entra em `/super-admin`.
- [ ] Confirmar no deployment/preview que a versão actual do `main` está publicada.

### Navegação principal
- [x] Menu municipal usa TanStack Router em vez de reload por `<a href>`.
- [x] Acções `PageHeader` usam navegação interna.
- [x] `/veiculos/novo` abre o formulário correcto para motorizada/carro/bicicleta.
- [x] Corrigidos atalhos plurais `/veiculos/novo/carros` e `/veiculos/novo/bicicletas`.

## Área municipal — problemas encontrados

### Dashboard
- [ ] Dashboard geral ainda contém estatísticas e registos demonstrativos.
- [ ] Dashboards de motorizadas/carros/bicicletas ainda contêm dados demonstrativos.
- [ ] Página `/dashboard/$tipo/$status` contém botões de posto sem filtro implementado.

### Veículos
- [ ] Lista `/veiculos` ainda usa dados demonstrativos.
- [ ] Formulário `/veiculos/novo/$tipo` não persiste proprietário/veículo/registo.
- [ ] `Seleccionar ficheiros` não abre upload real.
- [ ] `Enviar para validação` apenas navega; não cria registo no banco.
- [ ] Botão `Editar` da ficha do veículo não tem acção.
- [ ] `Guardar alteração` do estado não tem acção.
- [ ] `Confirmar transferência` não tem acção.
- [ ] Gestão documental do veículo possui acções visuais ainda sem persistência.

### Proprietários
- [ ] Lista usa dados demonstrativos.
- [ ] `Guardar proprietário` não persiste no Supabase.
- [ ] Algumas acções da ficha são apenas visuais.

### Taxistas/Condutores
- [ ] Lista ainda é demonstrativa.
- [ ] Pesquisa não consulta banco.
- [ ] Botões QR e ficha não navegam.
- [ ] `Guardar e gerar referência` não persiste nem chama numeração/QR.

### Fiscalização
- [ ] Consulta por número/chassis/QR não consulta banco.
- [ ] Leitura de QR não está implementada.
- [ ] `Verificar`, `Adicionar evidência` e `Registar fiscalização` não persistem.
- [ ] Histórico ainda é demonstrativo.

### Multas
- [ ] Lista é demonstrativa.
- [ ] `Consultar` condutor não consulta banco.
- [ ] `Emitir multa` não cria multa/cobrança.
- [ ] `Guardar` tipo de multa não persiste.
- [x] Matriz visual de permissões de Multas corrigida para Fiscal/Financeiro.
- [x] Tabelas, RLS, funções, triggers e permissões da Migration 3 validados no Supabase.

### Registos
- [ ] Lista e detalhes ainda não estão ligados ao Supabase.
- [ ] Fluxo de validação é visual.
- [ ] `Enviar solicitação` de correcção não persiste.
- [ ] `Confirmar rejeição` não persiste.

### Financeiro
- [ ] Interface ainda não usa a base institucional como fonte única.
- [ ] É necessário ligar cobranças, pagamentos, recibos e multas de forma transaccional.

### Utilizadores municipais
- [ ] Lista é demonstrativa.
- [ ] `Criar utilizador` não cria Auth + profile de forma segura.

### Estrutura territorial
- [ ] `+ Novo posto` aponta actualmente para a própria página.
- [ ] Localidades não têm fluxo completo de criação.
- [ ] Listas ainda são demonstrativas.

### Definições
- [ ] Geral aponta para `/definicoes` (auto-link).
- [ ] QR Code aponta para `/definicoes` (auto-link).
- [ ] Notificações aponta para `/definicoes` (auto-link).
- [ ] Segurança aponta para `/definicoes` (auto-link).
- [ ] Numeração/Taxas/Documentos têm páginas, mas ainda precisam de fonte real e operações persistentes.

### Auditoria municipal
- [ ] Filtros sem acção.
- [ ] Exportar sem acção.
- [ ] Ver detalhes sem acção.

## Super Admin — problemas encontrados

### Dashboard
- [x] Dashboard principal já consulta contagem real de municípios, perfis, registos e auditoria.
- [x] Removidos números fictícios do dashboard principal.
- [x] Dashboard global inclui contagens reais de municípios, utilizadores, veículos, registos, motorizadas, carros, bicicletas e auditoria.
- [ ] Outros ecrãs Super Admin ainda usam dados demonstrativos.

### Municípios
- [x] Lista `/super-admin/municipios` ligada a dados reais do Supabase.
- [ ] Criação de município ainda não está ligada ao botão; RPC auditada já preparada na migration `20261004100000_super_admin_municipality_ops.sql`.
- [ ] Detalhe do município usa valores demonstrativos.
- [ ] `Suspender` ainda não está ligado ao botão; RPC auditada de alteração de estado já preparada.
- [ ] `Guardar alterações` não persiste.
- [ ] Links de estrutura territorial/configurações apontam para área municipal, incompatível com a regra de acesso global sem sessão municipal auditada.

### Utilizadores globais
- [ ] Lista/detalhe/criação ainda são demonstrativos.
- [ ] Editar/Suspender ainda não executam operações reais.

### Licenças
- [ ] Gestão de licenças é demonstrativa.
- [ ] Editar/Suspender/Renovar/Configurar planos sem persistência.

### Perfis e permissões
- [ ] UI ainda não lê a matriz real do Supabase.

### Acesso municipal do Super Admin
- [ ] Selecção/configuração é demonstrativa.
- [ ] `Iniciar acesso municipal` não cria `municipal_access_sessions`.
- [ ] Ainda falta contexto temporário/auditado de município no frontend.

### Auditoria, relatórios, notificações e saúde
- [ ] Ainda não estão integralmente ligados a dados reais.
- [ ] Saúde da plataforma contém texto desactualizado sobre RLS/CI.
- [ ] Botão de actualizar saúde não executa verificação real.

## Infraestrutura e segurança

- [x] Auth Supabase ligado.
- [x] Perfil inicial Super Admin criado e auditado.
- [x] RLS base aplicado.
- [x] Drivers/Multas: RLS, triggers, políticas e permissões validados.
- [x] Migration de endurecimento de identidade criada.
- [x] CI corrigido.
- [x] CI executa geração de rotas e build Vite.
- [ ] Confirmar aplicação da migration de endurecimento no remoto sempre que houver nova base.
- [ ] Adicionar testes comportamentais de RLS com utilizadores reais de municípios distintos.
- [ ] Remover `.env` do controlo de versão e garantir política de segredos.
- [ ] Implementar Storage com políticas para documentos/evidências.
- [ ] Implementar operações transaccionais para fluxos críticos.

## Ordem de correcção

1. Navegação e autorização.
2. Super Admin real: municípios e utilizadores.
3. Estrutura territorial real.
4. Proprietários + veículos + registos.
5. Taxistas/condutores.
6. Fiscalização + multas + financeiro.
7. Documentos/Storage/QR.
8. Relatórios/auditoria/notificações.
9. Testes multi-município e testes de regressão end-to-end.
10. Preparação para produção.

## Controlo automático acrescentado

- [x] Script `scripts/audit-routes.mjs` valida links internos literais contra a árvore de rotas.
- [x] CI executa `npm run audit-routes` antes do build.
- [x] Auditoria automática reconhece 84 rotas e não encontrou links literais sem rota após as correcções.
- [ ] Permanecem botões sem handler/submit; o CI lista-os como aviso para correcção sistemática.


## Correcção estrutural de rotas aninhadas

Problema identificado: o URL mudava para uma subrota, mas a rota-pai continuava a renderizar a sua própria página porque não existia um boundary/Outlet para os filhos.

Correcções aplicadas:
- [x] `/super-admin` → municípios, utilizadores, licenças, permissões, auditoria, relatórios, notificações, saúde e acesso municipal.
- [x] `/super-admin/municipios` → novo município e detalhe.
- [x] `/super-admin/municipios/$id` → editar e criar administrador municipal.
- [x] `/super-admin/utilizadores` → novo utilizador e detalhe.
- [x] `/super-admin/licencas` → novo, planos e detalhe.
- [x] `/super-admin/permissoes` → detalhe por perfil.
- [x] `/super-admin/acesso-municipal` → preparação de acesso por município.
- [x] `/dashboard` → motorizadas, carros, bicicletas e detalhe por estado.
- [x] `/veiculos` → novo veículo e detalhe.
- [x] `/veiculos/novo` → formulário por tipo.
- [x] `/veiculos/$id` → documentos, estado, histórico e transferência.
- [x] `/proprietarios` → novo proprietário e detalhe.
- [x] `/proprietarios/$id` → editar e documentos.
- [x] `/fiscalizacao` → nova fiscalização e histórico.
- [x] `/multas` → nova multa e tipos.
- [x] `/registos` → detalhe, validação, aprovação, correcção e rejeição.
- [x] `/utilizadores` → novo e detalhe.
- [x] `/taxistas` → novo taxista.
- [x] `/definicoes` → documentos, numeração e taxas.
- [x] `/consulta` → consulta por código.
- [x] `/localidades`, `/municipios` e `/postos-administrativos` → respectivos detalhes.
- [x] `/financeiro` já possuía Outlet próprio e foi mantido.

Protecção permanente:
- [x] O CI agora falha quando uma rota-pai tem filhos mas não consegue renderizá-los.
- [x] Dashboard global e municipal usam estado activo exacto no menu para não ficar seleccionado simultaneamente com uma subpágina.

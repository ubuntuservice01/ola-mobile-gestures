# MobiGest — Base do projecto

## Escopo

O MobiGest é um sistema municipal para registar e gerir três categorias principais de meios de transporte:

1. Motorizadas
2. Carros
3. Bicicletas

## Princípios

- Multi-tenant por município.
- Segurança baseada em autenticação e permissões.
- Dados isolados entre municípios.
- Identificação única dos registos.
- Preparação para QR Code.
- Interface simples para técnicos municipais.
- Português de Moçambique na interface.

## Primeira fase técnica

1. Estrutura visual base.
2. Navegação e layout administrativo.
3. Autenticação.
4. Estrutura de municípios e perfis.
5. Proprietários.
6. Veículos.
7. Numeração/identificação.
8. Consulta pública.
9. QR Code.
10. Relatórios e módulos financeiros/fiscalização.

## Backend

O projecto deverá usar um novo projecto Supabase próprio do MobiGest. Nenhum projecto Supabase de aplicações anteriores deve ser reutilizado sem confirmação explícita.
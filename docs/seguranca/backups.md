# Backups e restauração — procedimento a validar

Responsável: [NOME/FUNÇÃO]. Projeto Supabase: `sltohhqejguauhanjhfj`. Este documento não afirma que backups estejam ativos: a disponibilidade e frequência dependem do plano e das opções contratadas no Supabase.

1. No painel Supabase, verificar **Database → Backups** e registrar plano, frequência, retenção e último backup íntegro. Confirmar separadamente a proteção das imagens no Storage; backup do banco pode não incluir arquivos.
2. Antes de um teste, exportar a lista de migrações e configurações de Auth/Storage/RLS. Guardar cópias em armazenamento controlado, com acesso restrito e criptografia.
3. Restaurar um backup em um projeto de teste isolado, nunca diretamente sobre o projeto de produção durante o ensaio.
4. Comparar contagens de produtos, pedidos e imagens, conferir políticas RLS e executar `tests/rls.sql` no projeto isolado.
5. Documentar data, responsável, tempo de recuperação, divergências e decisão de correção. Repetir o ensaio periodicamente.

Em incidente real, preservar evidências e avaliar impacto antes de restaurar. Confirmar com o suporte/documentação atual do Supabase o método exato de restauração disponível no plano contratado.

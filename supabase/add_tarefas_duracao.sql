-- Tempo de duração da tarefa: quantidade de dias necessários para executar. Opcional.
alter table public.tarefas
  add column if not exists duracao_dias integer
  check (duracao_dias is null or (duracao_dias >= 1 and duracao_dias <= 365));

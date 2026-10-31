export type Role = "admin" | "equipe" | "cliente";

export type User = {
  id: string;
  nome: string;
  email: string;
  role: Role;
  senhaDefinida: boolean;
};

export type NotificacaoTipo =
  | "obra_criada"
  | "proposta_criada"
  | "orcamento_efetivado"
  | "lancamentos"
  | "fotos"
  | "documentos"
  | "parcela_vence"
  | "conta_pagar"
  | "data_importante"
  | "tarefa";

export type NotificacaoItem = {
  id: string;
  tipo: NotificacaoTipo;
  titulo: string;
  descricao: string;
  obraNome: string | null;
  link: string | null;
  quando: string; // ISO
  lida: boolean;
  propria: boolean; // ação feita pela própria pessoa (aparece na linha do tempo, mas nunca como não lida)
};

export const OBRA_STATUS = [
  { id: "planejamento", label: "Planejamento" },
  { id: "em_andamento", label: "Em andamento" },
  { id: "concluida", label: "Concluída" },
  { id: "pausada", label: "Pausada" },
] as const;
export type ObraStatus = (typeof OBRA_STATUS)[number]["id"];

export const REGIOES = ["Balneário Camboriú", "Florianópolis", "São Paulo"] as const;
export type Regiao = (typeof REGIOES)[number];

export const PIPELINE_STATUS = [
  { id: "em_andamento", label: "Em andamento" },
  { id: "efetivado", label: "Efetivado" },
  { id: "negado", label: "Negado" },
] as const;
export type PipelineStatus = (typeof PIPELINE_STATUS)[number]["id"];

export type Obra = {
  id: string;
  nome: string;
  endereco: string;
  clienteNome: string;
  regiao: Regiao;
  valorVenda: number;
  valorAditivos: number;
  status: ObraStatus;
  pipelineStatus: PipelineStatus | null;
  dataInicio: string; // ISO date
  createdBy: string;
  createdAt: string;
};

export type Categoria = {
  id: string;
  nome: string;
};

export type ObraAditivo = {
  id: string;
  obraId: string;
  descricao: string;
  valor: number;
  data: string; // ISO date
  arquivoId: string | null; // orçamento relacionado ao aditivo
  createdBy: string;
  createdAt: string;
};

export type Lancamento = {
  id: string;
  obraId: string;
  categoriaId: string;
  fornecedor: string | null;
  setor: string | null; // só para a categoria "Mão de obra"
  valor: number;
  descricao: string;
  data: string; // ISO date
  lancadoPor: string;
  createdAt: string;
};

export const CATEGORIA_MAO_DE_OBRA = "Mão de obra";
export const SETORES_MAO_DE_OBRA = [
  "Civil",
  "Elétrica",
  "Hidráulica",
  "Pintura",
  "Gesso",
  "Climatização",
  "Marcenaria",
  "Engenharia",
  "Outros",
] as const;

export type Etapa = {
  id: string;
  obraId: string;
  nome: string;
  dataInicio: string; // ISO date
  dataFim: string; // ISO date
  progresso: number; // 0-100
  ordem: number;
  createdAt: string;
};

export const ARQUIVO_CATEGORIAS = [
  { id: "projeto", label: "Projeto (plantas, memorial)" },
  { id: "contrato", label: "Contrato" },
  { id: "cronograma", label: "Cronograma (feito fora do sistema)" },
  { id: "foto", label: "Foto" },
  { id: "relatorio", label: "Relatório" },
  { id: "registro", label: "Registro de obra" },
  { id: "documento", label: "Documento (ART, alvará, licença)" },
  { id: "nota_fiscal", label: "Nota fiscal / cupom" },
] as const;
export type ArquivoCategoria = (typeof ARQUIVO_CATEGORIAS)[number]["id"];

// Financeiro/orçamento NUNCA entram aqui de propósito — a Área do Cliente
// não deve ter como mostrar margens/custos internos, nem por engano.
export const ABAS_CLIENTE = [
  { id: "cronograma", label: "Cronograma" },
  { id: "diario", label: "Relatório de obra" },
  { id: "fotos", label: "Fotos/Vídeos" },
  { id: "documentos", label: "Documentos" },
] as const;
export type AbaCliente = (typeof ABAS_CLIENTE)[number]["id"];

export type Arquivo = {
  id: string;
  obraId: string;
  categoria: ArquivoCategoria;
  nomeOriginal: string;
  caminhoArmazenado: string;
  tamanhoBytes: number;
  mimeType: string;
  enviadoPor: string;
  visivelCliente: boolean;
  legenda: string | null;
  createdAt: string;
};

export const ORCAMENTO_TIPOS = [
  { id: "material", label: "Material" },
  { id: "mao_de_obra", label: "Mão de obra" },
] as const;
export type OrcamentoTipo = (typeof ORCAMENTO_TIPOS)[number]["id"];

// Uma obra/proposta pode ter mais de uma planilha de orçamento nomeada
// (ex: "Opção 1", "Opção 2 - com piscina") — cada uma com seus próprios
// itens, parâmetros de precificação e escopo gerado.
export type Orcamento = {
  id: string;
  obraId: string;
  nome: string;
  ordem: number;
  createdAt: string;
};

export type OrcamentoItem = {
  id: string;
  orcamentoId: string;
  tipo: OrcamentoTipo;
  etapa: string;
  descricao: string;
  valorUnitario: number;
  quantidade: number;
  unidade: string;
  valorTotal: number;
  observacao: string;
  negrito: boolean; // formatação da descrição na planilha
  cor: string | null; // cor do texto (hex) ou null = padrão
  ordem: number;
  createdAt: string;
};

export const CORES_ORCAMENTO = [
  { id: "#dc2626", label: "Vermelho" },
  { id: "#ea580c", label: "Laranja" },
  { id: "#16a34a", label: "Verde" },
  { id: "#2563eb", label: "Azul" },
  { id: "#9333ea", label: "Roxo" },
  { id: "#6b7280", label: "Cinza" },
] as const;

export type OrcamentoParametros = {
  orcamentoId: string;
  margemVekio: number; // %
  rt: number; // %
  imposto: number; // %
  lucratividadeEsperada: number; // %
  updatedAt: string;
};

export type EscopoEtapa = {
  nome: string;
  itens: string[];
};

export type OrcamentoEscopo = {
  orcamentoId: string;
  etapas: EscopoEtapa[];
  prazoEstimado: string | null;
  condicoes: string;
  valorObra: number;
  tributacao: number;
  totalComTributacao: number;
  geradoPor: string;
  geradoEm: string;
};

export type DataImportante = {
  id: string;
  titulo: string;
  descricao: string;
  data: string; // ISO date
  alertaDiasAntes: number;
  alertaEnviado: boolean;
  recorrente: boolean;
  createdBy: string;
  createdAt: string;
};

export type Pagamento = {
  id: string;
  obraId: string;
  descricao: string;
  valor: number;
  dataPrevista: string; // ISO date
  recebido: boolean;
  arquivoId: string | null;
  createdBy: string;
  createdAt: string;
};

export type Lembrete = {
  id: string;
  userId: string;
  titulo: string;
  conteudo: string;
  createdAt: string;
  updatedAt: string;
};

export type RelatorioObra = {
  id: string;
  obraId: string;
  data: string; // ISO date
  texto: string;
  createdBy: string;
  createdAt: string;
};

export const CUSTO_FIXO_STATUS = [
  { id: "pendente", label: "Pendente" },
  { id: "pago", label: "Pago" },
] as const;
export type CustoFixoStatus = (typeof CUSTO_FIXO_STATUS)[number]["id"];

export type CustoFixo = {
  id: string;
  nome: string;
  regiao: Regiao;
  valor: number;
  dataVencimento: string; // ISO date
  status: CustoFixoStatus;
  observacao: string;
  recorrente: boolean;
  diaRecorrencia: number | null;
  createdBy: string;
  createdAt: string;
};

// Sugestões do campo "Fornecedor" nos lançamentos de gasto. O campo continua
// aceitando texto livre — a lista só ajuda a autocompletar.
export const FORNECEDORES_SUGERIDOS = [
  "Casas d'Água",
  "Ms Entulhos",
  "Completa",
  "Stecanela",
  "Construcolor",
  "Joacir Empreiteiro",
  "Vitor Rubi Gesseiro",
  "Philipe Eletricista",
  "JotaJota",
  "Reni Impermeabilizantes",
  "B. Brasil",
  "Proffato",
  "Jorge Entulho",
  "Freddy Instaladora",
  "Cassol",
  "Raul Ary Koch Ltda",
  "Rossi",
  "HIDROWOLT",
  "Instaladora Palestina",
  "Digital SAT",
  "Corema",
  "Juliano Dressler Empreiteiro",
  "Alexandre Empreiteiro",
  "Djair Encanador",
  "Juarez Encanador",
  "João Pintor",
  "Jean Gesseiro",
  "João Antonio Gesseiro",
  "Elton Ilumitech Eletricista",
  "Alan Caçamba Entulho",
  "Baron Revestimentos",
] as const;


export const TAREFA_STATUS = [
  { id: "a_fazer", label: "A fazer" },
  { id: "fazendo", label: "Fazendo" },
  { id: "concluida", label: "Concluída" },
] as const;
export type TarefaStatus = (typeof TAREFA_STATUS)[number]["id"];

export const TAREFA_PRIORIDADES = [
  { id: "urgente", label: "Urgente" },
  { id: "alta", label: "Alta" },
  { id: "normal", label: "Normal" },
  { id: "baixa", label: "Baixa" },
] as const;
export type TarefaPrioridade = (typeof TAREFA_PRIORIDADES)[number]["id"];

export const TAREFA_RECORRENCIAS = [
  { id: "nenhuma", label: "Não repete" },
  { id: "diaria", label: "Todo dia" },
  { id: "semanal", label: "Toda semana" },
  { id: "quinzenal", label: "A cada 15 dias" },
  { id: "mensal", label: "Todo mês" },
] as const;
export type TarefaRecorrencia = (typeof TAREFA_RECORRENCIAS)[number]["id"];

export type Tarefa = {
  id: string;
  obraId: string | null;
  obraNome: string | null;
  titulo: string;
  descricao: string;
  status: TarefaStatus;
  prioridade: TarefaPrioridade;
  responsavelId: string | null;
  responsavelNome: string | null;
  prazo: string | null; // YYYY-MM-DD
  recorrencia: TarefaRecorrencia;
  criadoPor: string | null;
  concluidaEm: string | null;
  createdAt: string;
  checklistTotal: number;
  checklistFeitos: number;
  comentarios: number;
  anexos: number;
};

export type TarefaChecklistItem = { id: string; texto: string; feito: boolean };
export type TarefaComentario = {
  id: string;
  autorId: string | null;
  autorNome: string;
  texto: string;
  createdAt: string;
};
export type TarefaAnexo = {
  id: string;
  nomeOriginal: string;
  tamanhoBytes: number;
  mimeType: string;
  createdAt: string;
};
export type TarefaDetalhe = {
  tarefa: Tarefa;
  checklist: TarefaChecklistItem[];
  comentarios: TarefaComentario[];
  anexos: TarefaAnexo[];
};

export type MembroEquipe = { id: string; nome: string };

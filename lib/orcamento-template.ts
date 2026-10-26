import type { OrcamentoTipo } from "./types";

export type OrcamentoTemplateItem = {
  tipo: OrcamentoTipo;
  etapa: string;
  descricao: string;
  valorUnitario: number;
  quantidade: number;
  unidade: string;
  observacao: string;
};

// Base padrão de orçamento, extraída da planilha oficial da Vekio.
// Serve como ponto de partida editável ao elaborar um novo orçamento.
export const ORCAMENTO_BASE_TEMPLATE: OrcamentoTemplateItem[] = [
  {
    "tipo": "material",
    "etapa": "Pré + Rotina de Obra",
    "descricao": "Documentação",
    "valorUnitario": 100,
    "quantidade": 3,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Pré + Rotina de Obra",
    "descricao": "Entulho",
    "valorUnitario": 500,
    "quantidade": 15,
    "unidade": "und",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Pré + Rotina de Obra",
    "descricao": "Insumos de obra",
    "valorUnitario": 100,
    "quantidade": 4,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Pré + Rotina de Obra",
    "descricao": "Andaime",
    "valorUnitario": 750,
    "quantidade": 0,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Pré + Rotina de Obra",
    "descricao": "Salva piso",
    "valorUnitario": 2500,
    "quantidade": 1,
    "unidade": "und",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Pré + Rotina de Obra",
    "descricao": "Seguro de obra",
    "valorUnitario": 800,
    "quantidade": 1,
    "unidade": "und",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Pré + Rotina de Obra",
    "descricao": "Extra",
    "valorUnitario": 100,
    "quantidade": 2,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Demolição",
    "descricao": "Insumos",
    "valorUnitario": 100,
    "quantidade": 5,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Demolição",
    "descricao": "Extra",
    "valorUnitario": 100,
    "quantidade": 0,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "mao_de_obra",
    "etapa": "Demolição",
    "descricao": "Mão de Obra",
    "valorUnitario": 500,
    "quantidade": 40,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "mao_de_obra",
    "etapa": "Hidraulica",
    "descricao": "Mo encanador",
    "valorUnitario": 1000,
    "quantidade": 7,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Hidraulica",
    "descricao": "Material AF",
    "valorUnitario": 100,
    "quantidade": 15,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Hidraulica",
    "descricao": "Material AQ",
    "valorUnitario": 100,
    "quantidade": 20,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Hidraulica",
    "descricao": "Material Esg",
    "valorUnitario": 100,
    "quantidade": 15,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Hidraulica",
    "descricao": "Base registro",
    "valorUnitario": 70,
    "quantidade": 6,
    "unidade": "und",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Hidraulica",
    "descricao": "Extra",
    "valorUnitario": 100,
    "quantidade": 5,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "mao_de_obra",
    "etapa": "Elétrico",
    "descricao": "Mão de obra",
    "valorUnitario": 1000,
    "quantidade": 16,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Elétrico",
    "descricao": "Infraestrutura",
    "valorUnitario": 120,
    "quantidade": 20,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Elétrico",
    "descricao": "Fio 1.5 mm",
    "valorUnitario": 160,
    "quantidade": 15,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Elétrico",
    "descricao": "Fio 2.5 mm",
    "valorUnitario": 260,
    "quantidade": 15,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Elétrico",
    "descricao": "Fio 4mm",
    "valorUnitario": 450,
    "quantidade": 6,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Elétrico",
    "descricao": "cat 5",
    "valorUnitario": 4,
    "quantidade": 0,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Elétrico",
    "descricao": "Extra",
    "valorUnitario": 200,
    "quantidade": 4,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "mao_de_obra",
    "etapa": "Gás / PRV",
    "descricao": "Material + mão de obra",
    "valorUnitario": 500,
    "quantidade": 2.5,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Gás / PRV",
    "descricao": "Extra",
    "valorUnitario": 100,
    "quantidade": 0,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Climatização",
    "descricao": "Infraestrutura",
    "valorUnitario": 1000,
    "quantidade": 9,
    "unidade": "und",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Climatização",
    "descricao": "Extra",
    "valorUnitario": 200,
    "quantidade": 3,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "mao_de_obra",
    "etapa": "Construção Civil",
    "descricao": "Mão de obra",
    "valorUnitario": 500,
    "quantidade": 20,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Construção Civil",
    "descricao": "Material civil",
    "valorUnitario": 1000,
    "quantidade": 5,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Construção Civil",
    "descricao": "Extra",
    "valorUnitario": 100,
    "quantidade": 5,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "mao_de_obra",
    "etapa": "Gesso",
    "descricao": "Forro e cortineiro",
    "valorUnitario": 140,
    "quantidade": 250,
    "unidade": "m²",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Gesso",
    "descricao": "Corte perfil led",
    "valorUnitario": 60,
    "quantidade": 40,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Gesso",
    "descricao": "reforços",
    "valorUnitario": 50,
    "quantidade": 0,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Gesso",
    "descricao": "Extra / fechamento buracos",
    "valorUnitario": 50,
    "quantidade": 50,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "mao_de_obra",
    "etapa": "Revestimentos",
    "descricao": "Instalação mármore",
    "valorUnitario": 1000,
    "quantidade": 70,
    "unidade": "ml",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Revestimentos",
    "descricao": "material para mármore",
    "valorUnitario": 45,
    "quantidade": 150,
    "unidade": "ml",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Revestimentos",
    "descricao": "acessorios",
    "valorUnitario": 90,
    "quantidade": 5,
    "unidade": "m²",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Revestimentos",
    "descricao": "Extra",
    "valorUnitario": 500,
    "quantidade": 2,
    "unidade": "m²",
    "observacao": ""
  },
  {
    "tipo": "mao_de_obra",
    "etapa": "Pintura",
    "descricao": "mo pintura",
    "valorUnitario": 50,
    "quantidade": 500,
    "unidade": "m²",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Pintura",
    "descricao": "Material",
    "valorUnitario": 500,
    "quantidade": 13,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Pintura",
    "descricao": "Extra",
    "valorUnitario": 200,
    "quantidade": 0,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Esquadrias",
    "descricao": "Ajuste esquadria",
    "valorUnitario": 500,
    "quantidade": 0,
    "unidade": "und",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Esquadrias",
    "descricao": "Rodapés",
    "valorUnitario": 22,
    "quantidade": 0,
    "unidade": "m",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Esquadrias",
    "descricao": "Extras",
    "valorUnitario": 500,
    "quantidade": 0,
    "unidade": "m",
    "observacao": ""
  },
  {
    "tipo": "mao_de_obra",
    "etapa": "Extras",
    "descricao": "Limpeza pós obra",
    "valorUnitario": 500,
    "quantidade": 4,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "mao_de_obra",
    "etapa": "Extras",
    "descricao": "limpeza semanal",
    "valorUnitario": 200,
    "quantidade": 10,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "mao_de_obra",
    "etapa": "Extras",
    "descricao": "Instalação metais e eletros",
    "valorUnitario": 1000,
    "quantidade": 5,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "mao_de_obra",
    "etapa": "Engenharia",
    "descricao": "Equipe",
    "valorUnitario": 3000,
    "quantidade": 5,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Engenharia",
    "descricao": "Juridico",
    "valorUnitario": 1250,
    "quantidade": 1,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Engenharia",
    "descricao": "Financeiro",
    "valorUnitario": 400,
    "quantidade": 1,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Engenharia",
    "descricao": "Software",
    "valorUnitario": 375,
    "quantidade": 1,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Engenharia",
    "descricao": "Europa",
    "valorUnitario": 1000,
    "quantidade": 2,
    "unidade": "-",
    "observacao": ""
  },
  {
    "tipo": "material",
    "etapa": "Engenharia",
    "descricao": "Custo Vekio",
    "valorUnitario": 1000,
    "quantidade": 3,
    "unidade": "-",
    "observacao": ""
  }
];

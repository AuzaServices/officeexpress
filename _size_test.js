const dados = {
  nome: "Maria da Silva",
  email: "maria@email.com",
  telefone: ["(11) 99999-9999", "(11) 98888-8888"],
  endereco: "Rua das Flores",
  numero: "123",
  bairro: "Centro",
  cidade: "São Paulo",
  estado: "SP",
  objetivo: "Busco uma posição como Analista, onde possa aplicar minha experiência em gestão de projetos.",
  formacao: "Graduação em Administração - Universidade X (2015-2019)",
  habilidades: "Excel, Pacote Office, Comunicação, Liderança, Inglês avançado",
  hobbies: "Leitura, esportes, cinema",
  infoAdicional: "CNH B, disponibilidade imediata",
  primeiroEmprego: false,
  curso: ["Pacote Office", "Gestão de Projetos", "Excel Avançado"],
  instituicao: ["SENAI", "FGV", "Alura"],
  carga: ["40h", "60h", "20h"],
  empresa: ["Empresa Alpha", "Empresa Beta", "Empresa Gama"],
  cargo: ["Analista Jr.", "Assistente", "Estagiário"],
  periodo_inicio: ["01/2018", "01/2015", "01/2013"],
  periodo_fim: ["01/2020", "12/2017", "12/2014"],
  atividades: ["Criação de relatórios gerenciais.", "Atendimento a clientes.", "Suporte administrativo."]
};
const bytes = Buffer.byteLength(JSON.stringify(dados));
console.log("JSON sem foto: " + bytes + " bytes = " + (bytes / 1024).toFixed(1) + " KB");

// Com foto base64 típica (300px jpeg ~ 20-40KB)
const foto = "data:image/jpeg;base64," + "A".repeat(50000);
const dadosComFoto = { ...dados, foto };
const bytes2 = Buffer.byteLength(JSON.stringify(dadosComFoto));
console.log("JSON com foto (~50KB base64): " + bytes2 + " bytes = " + (bytes2 / 1024).toFixed(1) + " KB");

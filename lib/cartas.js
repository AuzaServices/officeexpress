const PDFDocument = require("pdfkit");

// Motor local de escrita: os textos fornecidos pela pessoa são preservados e
// organizados com uma linguagem adequada ao objetivo de cada modelo.
const PERFIS = {
  executiva: {
    nome: "Executiva", descricao: "Direta, estratégica e orientada a resultados.", cor: "#00324a", corSuave: "#e6f0f3", layout: "faixa", fonte: "sans", rotulo: "Posicionamento estratégico",
    orientacao: { foco: "prioridades, resultados e impacto para o negócio", motivacao: "Que desafio da vaga ou da empresa você quer ajudar a resolver?", experiencia: "Descreva uma entrega, decisão ou melhoria e, se puder, o resultado alcançado.", diferenciais: "Destaque visão de negócio, organização, negociação ou capacidade de execução." },
    abertura: (c) => `Apresento minha candidatura ${c.oportunidade}. ${c.motivacao ? `A decisão de me candidatar parte de uma motivação objetiva: ${c.motivacao}` : "Busco um contexto em que eu possa transformar prioridades em entregas consistentes e geração de valor."}`,
    experiencia: (c) => `Uma experiência que sintetiza meu modo de atuar é esta: ${c.experiencia} ${c.ponte("prioridades, impacto e execução")}`,
    semExperiencia: () => "Minha trajetória vem sendo construída com senso de responsabilidade, organização e atenção ao impacto de cada entrega.",
    diferenciais: (c) => `Também levo uma combinação de competências que considero estratégica: ${c.diferenciais} ${c.ponteDiferenciais("clareza de prioridades e decisões bem fundamentadas")}`,
    semDiferenciais: () => "Atuo com clareza de prioridades, senso de responsabilidade e atenção à qualidade das decisões.",
    fechamento: (c) => `Acredito que posso somar uma perspectiva objetiva aos desafios ${c.referenciaOportunidade}. Fico à disposição para conversar sobre como essa experiência pode apoiar os próximos resultados.`,
  },
  moderna: {
    nome: "Moderna", descricao: "Clara, segura e com linguagem atual.", cor: "#0e7490", corSuave: "#e6f6f8", layout: "linha", fonte: "sans", rotulo: "Clara e contemporânea",
    orientacao: { foco: "contribuição prática, colaboração e aprendizado contínuo", motivacao: "Explique por que a oportunidade faz sentido para o seu próximo passo.", experiencia: "Conte um projeto ou situação em que você fez diferença na prática.", diferenciais: "Inclua habilidades técnicas e comportamentais que você realmente usa no dia a dia." },
    abertura: (c) => `Gostaria de me candidatar ${c.oportunidade}. ${c.motivacao ? `O que torna essa oportunidade especialmente interessante para mim é: ${c.motivacao}` : "Vejo nela a chance de contribuir de forma prática, aprender com bons desafios e evoluir junto à equipe."}`,
    experiencia: (c) => `Na prática, uma vivência que conversa diretamente com essa oportunidade foi: ${c.experiencia} ${c.ponte("colaboração, aprendizado e entregas consistentes")}`,
    semExperiencia: () => "Tenho construído meu repertório com curiosidade, responsabilidade e disposição para transformar desafios em soluções úteis.",
    diferenciais: (c) => `Entre os diferenciais que levo para a equipe, destaco: ${c.diferenciais} ${c.ponteDiferenciais("uma atuação próxima, adaptável e confiável")}`,
    semDiferenciais: () => "Levo uma postura colaborativa, abertura para aprender e cuidado com a qualidade do que entrego.",
    fechamento: (c) => `Será um prazer conversar sobre como posso contribuir ${c.referenciaOportunidade} e seguir desenvolvendo um trabalho de qualidade com a equipe.`,
  },
  criativa: {
    nome: "Criativa", descricao: "Autêntica para comunicação, design e marketing.", cor: "#ea580c", corSuave: "#fff1e8", layout: "bloco", fonte: "sans", rotulo: "Ideias com intenção",
    orientacao: { foco: "repertório, ideias, comunicação e impacto no público", motivacao: "Conte o que desperta seu interesse criativo nessa empresa ou desafio.", experiencia: "Fale de uma campanha, peça, projeto ou solução e do efeito que ela gerou.", diferenciais: "Mostre seu repertório, capacidade de transformar briefing em solução e colaboração." },
    abertura: (c) => `Vejo ${c.oportunidade} como a possibilidade de transformar repertório, escuta e boas ideias em trabalho com intenção. ${c.motivacao ? `Minha motivação para dar esse passo é: ${c.motivacao}` : "Procuro um desafio em que criatividade esteja conectada a pessoas, contexto e resultado."}`,
    experiencia: (c) => `Um recorte do meu percurso que ajuda a contar essa história é: ${c.experiencia} ${c.ponte("repertório, comunicação e soluções que façam sentido para o público")}`,
    semExperiencia: () => "Gosto de partir de uma boa pergunta, entender o contexto e construir soluções que sejam claras, relevantes e memoráveis.",
    diferenciais: (c) => `Também quero destacar o que sustenta minha forma de criar: ${c.diferenciais} ${c.ponteDiferenciais("ideias viáveis, bem comunicadas e alinhadas ao objetivo")}`,
    semDiferenciais: () => "Trago curiosidade, escuta ativa e vontade de transformar referências em soluções viáveis.",
    fechamento: (c) => `Acredito que uma conversa pode revelar boas conexões entre meu repertório e os desafios ${c.referenciaOportunidade}. Fico à disposição para aprofundar essa troca.`,
  },
  tecnica: {
    nome: "Técnica", descricao: "Foco em projetos, método e especialidade.", cor: "#0e7490", corSuave: "#e5f5f7", layout: "lateral", fonte: "sans", rotulo: "Método e especialidade",
    orientacao: { foco: "método, ferramentas, qualidade e solução de problemas", motivacao: "Relacione a vaga com um problema técnico ou processo que você gosta de resolver.", experiencia: "Explique o contexto, sua responsabilidade, ferramentas ou método usado e resultado.", diferenciais: "Priorize conhecimentos técnicos, análise, documentação, precisão e melhoria contínua." },
    abertura: (c) => `Tenho interesse ${c.oportunidade} pela possibilidade de aplicar uma atuação estruturada, cuidadosa e orientada à solução de problemas. ${c.motivacao ? `Meu interesse está ligado a um ponto específico: ${c.motivacao}` : "Procuro um ambiente em que método, qualidade e aprendizado técnico façam diferença nas entregas."}`,
    experiencia: (c) => `A experiência mais relevante para demonstrar essa aderência é: ${c.experiencia} ${c.ponte("método, precisão e resolução consistente de problemas")}`,
    semExperiencia: () => "Tenho desenvolvido uma forma de trabalhar baseada em organização, investigação e atenção aos detalhes que sustentam uma boa entrega.",
    diferenciais: (c) => `Complementam essa experiência os seguintes diferenciais: ${c.diferenciais} ${c.ponteDiferenciais("processos confiáveis, qualidade e evolução contínua")}`,
    semDiferenciais: () => "Valorizo documentação, raciocínio estruturado, aprendizado técnico e cuidado com a qualidade final.",
    fechamento: (c) => `Fico à disposição para detalhar como posso aplicar esse repertório aos desafios ${c.referenciaOportunidade}, com método e senso de responsabilidade.`,
  },
  lideranca: {
    nome: "Liderança", descricao: "Posicionamento para gestão e cargos seniores.", cor: "#1e3a5f", corSuave: "#e8eef5", layout: "faixa", fonte: "sans", rotulo: "Gestão que mobiliza",
    orientacao: { foco: "pessoas, decisões, direção e resultados sustentáveis", motivacao: "Mostre que tipo de desafio de gestão ou transformação atrai você.", experiencia: "Conte uma situação em que coordenou pessoas, influenciou decisões ou melhorou um processo.", diferenciais: "Destaque comunicação, desenvolvimento de pessoas, visão sistêmica e capacidade de priorização." },
    abertura: (c) => `Apresento minha candidatura ${c.oportunidade} com interesse em contribuir para uma direção clara, equipes engajadas e resultados sustentáveis. ${c.motivacao ? `O que me mobiliza nesse desafio é: ${c.motivacao}` : "Procuro uma posição em que liderança signifique dar contexto, remover obstáculos e ampliar a capacidade do time."}`,
    experiencia: (c) => `Uma situação que representa minha forma de liderar é: ${c.experiencia} ${c.ponte("pessoas, decisões e execução com propósito")}`,
    semExperiencia: () => "Minha forma de atuar combina escuta, clareza de prioridades e responsabilidade por criar condições para que as pessoas entreguem seu melhor.",
    diferenciais: (c) => `Levo ainda diferenciais importantes para esse tipo de desafio: ${c.diferenciais} ${c.ponteDiferenciais("confiança, alinhamento e resultados que se sustentam")}`,
    semDiferenciais: () => "Valorizo comunicação transparente, desenvolvimento de pessoas, visão sistêmica e acompanhamento próximo das entregas.",
    fechamento: (c) => `Terei satisfação em conversar sobre como essa experiência pode fortalecer pessoas, prioridades e resultados ${c.referenciaOportunidade}.`,
  },
  "primeiro-emprego": {
    nome: "Primeiro emprego", descricao: "Valoriza potencial, formação e atitude.", cor: "#16a34a", corSuave: "#ebf8ef", layout: "linha", fonte: "sans", rotulo: "Potencial em movimento",
    orientacao: { foco: "formação, iniciativa, aprendizado rápido e responsabilidade", motivacao: "Explique o que você espera aprender e como pretende contribuir desde o início.", experiencia: "Vale projeto de curso, voluntariado, trabalho informal, atividade em grupo ou conquista pessoal.", diferenciais: "Fale de organização, comprometimento, comunicação, curiosidade e vontade de aprender." },
    abertura: (c) => `Estou em busca da minha primeira oportunidade profissional ${c.oportunidade} e quero iniciar essa etapa com compromisso, curiosidade e disposição para aprender. ${c.motivacao ? `Minha motivação é: ${c.motivacao}` : "Quero transformar minha formação e minha vontade de crescer em uma contribuição real para a equipe."}`,
    experiencia: (c) => `Mesmo no início da trajetória, já tive uma vivência importante para essa oportunidade: ${c.experiencia} ${c.ponte("aprendizado rápido, responsabilidade e iniciativa")}`,
    semExperiencia: () => "Embora esteja no início da trajetória formal, venho construindo repertório por meio da formação, de projetos e de experiências que exigem responsabilidade.",
    diferenciais: (c) => `Acredito que meu potencial aparece especialmente nestes pontos: ${c.diferenciais} ${c.ponteDiferenciais("atitude, consistência e abertura para aprender")}`,
    semDiferenciais: () => "Trago disposição para aprender rápido, cuidado com combinados e energia para participar ativamente da rotina da equipe.",
    fechamento: (c) => `Ficarei feliz em explicar como posso aprender com a equipe e contribuir desde o primeiro dia ${c.referenciaOportunidade}.`,
  },
  transicao: {
    nome: "Transição de carreira", descricao: "Conecta experiências transferíveis ao novo objetivo.", cor: "#7c3aed", corSuave: "#f1ebff", layout: "lateral", fonte: "sans", rotulo: "Experiência que se conecta",
    orientacao: { foco: "competências transferíveis, intenção e novo direcionamento", motivacao: "Explique por que está mudando de área e o que conecta sua história à nova direção.", experiencia: "Escolha uma experiência anterior cujas habilidades também sejam úteis na vaga desejada.", diferenciais: "Destaque competências transferíveis: gestão, atendimento, análise, comunicação, organização ou negociação." },
    abertura: (c) => `Estou em um movimento consciente de transição profissional e apresento minha candidatura ${c.oportunidade} com uma base de experiências que pode contribuir desde o início. ${c.motivacao ? `A razão dessa nova direção é: ${c.motivacao}` : "Busco aproximar meu repertório acumulado de uma área em que eu possa seguir crescendo e gerando valor."}`,
    experiencia: (c) => `A experiência que melhor evidencia essa ponte é: ${c.experiencia} ${c.ponte("competências transferíveis, adaptação e capacidade de aprender")}`,
    semExperiencia: () => "Levo experiências anteriores que fortaleceram minha responsabilidade, comunicação e capacidade de aprender em contextos novos.",
    diferenciais: (c) => `Para essa nova etapa, considero especialmente relevantes estes diferenciais: ${c.diferenciais} ${c.ponteDiferenciais("uma transição bem preparada e conectada à realidade da vaga")}`,
    semDiferenciais: () => "Trago maturidade profissional, adaptabilidade e disposição para transformar repertório anterior em valor para a nova área.",
    fechamento: (c) => `Agradeço a oportunidade de apresentar essa transição e fico à disposição para mostrar, em uma conversa, como meu repertório se conecta aos desafios ${c.referenciaOportunidade}.`,
  },
  estagio: {
    nome: "Estágio", descricao: "Profissional sem perder autenticidade.", cor: "#0284c7", corSuave: "#e6f5fc", layout: "linha", fonte: "sans", rotulo: "Aprendizado aplicado",
    orientacao: { foco: "formação aplicada, curiosidade e evolução prática", motivacao: "Diga o que você quer aprender na prática e por que esse ambiente é importante.", experiencia: "Use trabalhos acadêmicos, extensão, projetos, monitoria ou atividades que mostrem seu envolvimento.", diferenciais: "Mostre disciplina, curiosidade, boa comunicação e capacidade de colocar conhecimento em prática." },
    abertura: (c) => `Tenho interesse ${c.oportunidade} porque quero aproximar minha formação de desafios reais, aprender com uma equipe experiente e contribuir com dedicação. ${c.motivacao ? `Em especial, busco: ${c.motivacao}` : "Procuro um ambiente em que eu possa transformar conhecimento em prática e evoluir de forma consistente."}`,
    experiencia: (c) => `Uma experiência que demonstra meu envolvimento e minha capacidade de aprender fazendo foi: ${c.experiencia} ${c.ponte("formação aplicada, curiosidade e responsabilidade")}`,
    semExperiencia: () => "Minha formação tem sido acompanhada de interesse genuíno em aprender, testar conhecimentos e assumir responsabilidades de forma gradual e consistente.",
    diferenciais: (c) => `Acredito que posso agregar à rotina da equipe por meio de: ${c.diferenciais} ${c.ponteDiferenciais("uma aprendizagem rápida e uma participação cuidadosa")}`,
    semDiferenciais: () => "Trago curiosidade, disciplina para aprender e disposição para colaborar com cuidado nas atividades da equipe.",
    fechamento: (c) => `Fico à disposição para conversar sobre como posso aprender e contribuir ${c.referenciaOportunidade}, com comprometimento e abertura para feedback.`,
  },
  academica: {
    nome: "Acadêmica", descricao: "Ideal para pesquisa, bolsas e universidades.", cor: "#7f1d1d", corSuave: "#faecec", layout: "classico", fonte: "serif", rotulo: "Rigor e investigação",
    orientacao: { foco: "pesquisa, formação, método e produção de conhecimento", motivacao: "Relacione a oportunidade ao seu tema de interesse, formação ou pergunta de pesquisa.", experiencia: "Descreva iniciação científica, TCC, extensão, monitoria, publicação ou projeto relevante.", diferenciais: "Destaque leitura crítica, método, escrita, organização, curiosidade e autonomia." },
    abertura: (c) => `Escrevo para apresentar meu interesse ${c.oportunidade}, por reconhecer nessa oportunidade um espaço relevante para aprofundar minha formação e contribuir com seriedade. ${c.motivacao ? `Meu interesse está ancorado em: ${c.motivacao}` : "Busco um contexto que valorize investigação, troca de conhecimento e construção cuidadosa de resultados."}`,
    experiencia: (c) => `No meu percurso, a experiência que mais se aproxima desse objetivo é: ${c.experiencia} ${c.ponte("método, leitura crítica e consistência na construção do conhecimento")}`,
    semExperiencia: () => "Venho construindo uma trajetória pautada por curiosidade intelectual, organização e compromisso com a qualidade do processo de aprendizagem.",
    diferenciais: (c) => `Somam-se a esse percurso os seguintes diferenciais: ${c.diferenciais} ${c.ponteDiferenciais("rigor, autonomia e disposição para colaborar")}`,
    semDiferenciais: () => "Valorizo método, escrita clara, leitura crítica e responsabilidade com os processos de pesquisa e aprendizagem.",
    fechamento: (c) => `Agradeço a consideração da minha candidatura e fico à disposição para detalhar como meu percurso pode contribuir ${c.referenciaOportunidade}.`,
  },
  comercial: {
    nome: "Comercial", descricao: "Persuasiva, objetiva e orientada ao cliente.", cor: "#d97706", corSuave: "#fff5df", layout: "lateral", fonte: "sans", rotulo: "Cliente, negócio e resultado",
    orientacao: { foco: "cliente, metas, relacionamento e geração de receita", motivacao: "Explique por que gosta de trabalhar próximo a clientes, metas ou desenvolvimento de negócios.", experiencia: "Conte uma venda, negociação, atendimento, prospecção ou melhoria de relacionamento e seu resultado.", diferenciais: "Priorize comunicação, escuta, negociação, organização de funil e foco em resultados." },
    abertura: (c) => `Apresento minha candidatura ${c.oportunidade} com entusiasmo por atuar próxima a clientes, oportunidades e resultados de negócio. ${c.motivacao ? `O que me atrai nessa posição é: ${c.motivacao}` : "Busco um desafio em que escuta, relacionamento e execução comercial possam gerar valor concreto."}`,
    experiencia: (c) => `Uma experiência que demonstra essa forma de atuar foi: ${c.experiencia} ${c.ponte("relacionamento, conversão de oportunidades e foco no cliente")}`,
    semExperiencia: () => "Tenho desenvolvido uma atuação comunicativa, organizada e atenta a necessidades reais, com disposição para acompanhar oportunidades até a melhor solução.",
    diferenciais: (c) => `Para apoiar a equipe comercial, levo principalmente: ${c.diferenciais} ${c.ponteDiferenciais("relações de confiança e resultados acompanhados de perto")}`,
    semDiferenciais: () => "Trago escuta ativa, comunicação clara, organização e compromisso em transformar necessidades de clientes em boas soluções.",
    fechamento: (c) => `Fico à disposição para conversar sobre como posso apoiar o relacionamento com clientes e os resultados ${c.referenciaOportunidade}.`,
  },
  startup: {
    nome: "Startup", descricao: "Enérgica, flexível e focada em impacto.", cor: "#db2777", corSuave: "#fdeaf3", layout: "bloco", fonte: "sans", rotulo: "Ritmo, autonomia e impacto",
    orientacao: { foco: "autonomia, experimentação, adaptação e impacto", motivacao: "Conte o que anima você em ambientes dinâmicos, de crescimento ou construção.", experiencia: "Mostre uma situação em que precisou aprender rápido, testar, resolver ou fazer acontecer.", diferenciais: "Destaque autonomia, curiosidade, senso de dono, priorização e colaboração multidisciplinar." },
    abertura: (c) => `Tenho interesse ${c.oportunidade} pela chance de contribuir em um contexto de construção, aprendizado rápido e impacto visível. ${c.motivacao ? `O que mais me mobiliza nesse ambiente é: ${c.motivacao}` : "Gosto de desafios em que é preciso priorizar bem, testar caminhos e transformar ideias em ação."}`,
    experiencia: (c) => `Uma situação que mostra minha disposição para fazer acontecer foi: ${c.experiencia} ${c.ponte("autonomia, adaptação e impacto prático")}`,
    semExperiencia: () => "Sinto-me à vontade em contextos de mudança, em que curiosidade, colaboração e capacidade de execução precisam caminhar juntas.",
    diferenciais: (c) => `Também levo para esse ritmo de trabalho: ${c.diferenciais} ${c.ponteDiferenciais("aprendizado rápido, senso de dono e execução")}`,
    semDiferenciais: () => "Trago curiosidade, autonomia para buscar soluções e disposição para colaborar em frentes diferentes quando necessário.",
    fechamento: (c) => `Será ótimo conversar sobre como posso transformar esse repertório em entregas relevantes ${c.referenciaOportunidade}.`,
  },
  formal: {
    nome: "Formal", descricao: "Clássica para empresas tradicionais.", cor: "#334155", corSuave: "#eef1f4", layout: "classico", fonte: "serif", rotulo: "Clássica e institucional",
    orientacao: { foco: "profissionalismo, consistência, responsabilidade e aderência à vaga", motivacao: "Explique de maneira objetiva por que sua experiência combina com a posição.", experiencia: "Descreva uma responsabilidade ou conquista relevante com clareza e dados, se houver.", diferenciais: "Destaque ética, organização, disciplina, confiabilidade e conhecimentos pertinentes." },
    abertura: (c) => `Venho por meio desta apresentar minha candidatura ${c.oportunidade}. ${c.motivacao ? `O interesse pela posição decorre do seguinte aspecto: ${c.motivacao}` : "Considero que meu perfil profissional pode contribuir de forma responsável e consistente para as atividades da posição."}`,
    experiencia: (c) => `Destaco, em minha trajetória, a seguinte experiência pertinente: ${c.experiencia} ${c.ponte("responsabilidade, consistência e qualidade profissional")}`,
    semExperiencia: () => "Minha trajetória tem sido pautada por responsabilidade, organização e compromisso com a boa execução das atividades sob minha responsabilidade.",
    diferenciais: (c) => `Acrescento como diferenciais profissionais: ${c.diferenciais} ${c.ponteDiferenciais("confiabilidade, discrição e qualidade nas entregas")}`,
    semDiferenciais: () => "Mantenho uma postura profissional, organizada e comprometida com a qualidade, os prazos e os acordos estabelecidos.",
    fechamento: (c) => `Agradeço a atenção dispensada e coloco-me à disposição para prestar informações adicionais sobre minha contribuição ${c.referenciaOportunidade}.`,
  },
  internacional: {
    nome: "Internacional", descricao: "Estrutura profissional para vagas globais.", cor: "#2563eb", corSuave: "#eaf1ff", layout: "linha", fonte: "sans", rotulo: "Profissional e global",
    orientacao: { foco: "clareza, adaptação, colaboração multicultural e impacto", motivacao: "Explique a conexão com a oportunidade e, se relevante, seu interesse em ambientes globais ou diversos.", experiencia: "Conte um projeto que mostre colaboração, autonomia, comunicação ou adaptação a novos contextos.", diferenciais: "Destaque comunicação, idiomas, visão ampla, organização e facilidade para trabalhar com pessoas diversas." },
    abertura: (c) => `Apresento minha candidatura ${c.oportunidade} com uma comunicação clara, abertura para novos contextos e interesse em contribuir em equipes conectadas a objetivos comuns. ${c.motivacao ? `Minha motivação é: ${c.motivacao}` : "Busco uma oportunidade em que colaboração, adaptação e qualidade de entrega sejam valorizadas."}`,
    experiencia: (c) => `Uma experiência que demonstra minha capacidade de atuar com esse olhar é: ${c.experiencia} ${c.ponte("comunicação clara, adaptação e colaboração entre diferentes perspectivas")}`,
    semExperiencia: () => "Tenho desenvolvido uma atuação flexível, organizada e aberta à troca com pessoas, rotinas e desafios diferentes.",
    diferenciais: (c) => `Acredito que posso agregar por meio de: ${c.diferenciais} ${c.ponteDiferenciais("confiança, clareza e colaboração em diferentes contextos")}`,
    semDiferenciais: () => "Trago comunicação clara, organização, abertura cultural e disposição para aprender com diferentes perspectivas.",
    fechamento: (c) => `Fico à disposição para conversar sobre como esse repertório pode contribuir ${c.referenciaOportunidade} e em seus próximos desafios.`,
  },
  recolocacao: {
    nome: "Recolocação", descricao: "Reposiciona sua experiência com confiança.", cor: "#059669", corSuave: "#e8f7f1", layout: "lateral", fonte: "sans", rotulo: "Experiência reposicionada",
    orientacao: { foco: "maturidade, atualização, valor acumulado e próximo passo", motivacao: "Explique por que esta oportunidade é o próximo passo certo para você.", experiencia: "Escolha uma experiência que mostre a profundidade do seu repertório e uma contribuição concreta.", diferenciais: "Destaque experiência, capacidade de adaptação, atualização e confiança para assumir novos desafios." },
    abertura: (c) => `Estou em um momento de recolocação profissional e apresento minha candidatura ${c.oportunidade} com confiança no valor que minha trajetória pode agregar. ${c.motivacao ? `Busco esse próximo passo porque: ${c.motivacao}` : "Procuro um desafio em que eu possa colocar repertório, maturidade e disposição para aprender a serviço de uma nova etapa."}`,
    experiencia: (c) => `Um exemplo que representa esse repertório é: ${c.experiencia} ${c.ponte("experiência acumulada, adaptação e contribuição prática")}`,
    semExperiencia: () => "Minha trajetória me deu uma base sólida de responsabilidade, adaptação e compreensão sobre o que torna uma entrega realmente útil.",
    diferenciais: (c) => `Para esta nova etapa, levo diferenciais como: ${c.diferenciais} ${c.ponteDiferenciais("maturidade profissional e energia para novos desafios")}`,
    semDiferenciais: () => "Trago maturidade profissional, capacidade de adaptação e interesse genuíno em seguir aprendendo e contribuindo.",
    fechamento: (c) => `Terei satisfação em detalhar como minha experiência pode ser reposicionada em favor dos desafios ${c.referenciaOportunidade}.`,
  },
  networking: {
    nome: "Networking", descricao: "Apresentação curta para abrir conversas.", cor: "#9333ea", corSuave: "#f5edff", layout: "bloco", fonte: "sans", rotulo: "Conexão profissional",
    orientacao: { foco: "apresentação objetiva, afinidade e abertura para conversa", motivacao: "Explique por que você gostaria de se conectar com essa empresa ou pessoa.", experiencia: "Resuma a experiência que melhor explica o tipo de contribuição que você oferece.", diferenciais: "Use poucas habilidades fortes que ajudem alguém a entender rapidamente seu perfil." },
    abertura: (c) => `Escrevo para iniciar uma conversa profissional ${c.oportunidade}. ${c.motivacao ? `O motivo do meu contato é: ${c.motivacao}` : "Tenho interesse em conhecer melhor os desafios dessa frente e compartilhar, de forma objetiva, o que posso oferecer."}`,
    experiencia: (c) => `Em poucas palavras, a experiência que melhor representa meu percurso é: ${c.experiencia} ${c.ponte("conexões úteis, colaboração e contribuição prática")}`,
    semExperiencia: () => "Meu percurso tem sido guiado por curiosidade, construção de relações profissionais e busca por oportunidades de contribuição concreta.",
    diferenciais: (c) => `Acredito que meu perfil se destaca por: ${c.diferenciais} ${c.ponteDiferenciais("uma conversa profissional produtiva e objetiva")}`,
    semDiferenciais: () => "Trago comunicação clara, curiosidade profissional e disposição para construir relações de confiança.",
    fechamento: (c) => `Se fizer sentido, ficarei contente em marcar uma conversa breve para trocar ideias sobre os desafios ${c.referenciaOportunidade}.`,
  },
};

const CARTAS = Object.entries(PERFIS).map(([id, perfil]) => ({
  id,
  nome: perfil.nome,
  descricao: perfil.descricao,
  estilo: { cor: perfil.cor, corSuave: perfil.corSuave, layout: perfil.layout, fonte: perfil.fonte, rotulo: perfil.rotulo },
  orientacao: perfil.orientacao,
}));

function textoLimpo(valor, limite = 900) {
  if (typeof valor !== "string" && typeof valor !== "number") return "";
  return String(valor)
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limite);
}

function frase(valor) {
  const texto = textoLimpo(valor);
  if (!texto) return "";
  return /[.!?…]$/.test(texto) ? texto : `${texto}.`;
}

function formatarData(valor) {
  const dataInformada = textoLimpo(valor, 10);
  const data = /^\d{4}-\d{2}-\d{2}$/.test(dataInformada) ? new Date(`${dataInformada}T12:00:00`) : new Date();
  const valida = !Number.isNaN(data.getTime());
  const segura = valida ? data : new Date();
  return { iso: segura.toISOString().slice(0, 10), exibicao: segura.toLocaleDateString("pt-BR") };
}

function detectarSinais(...valores) {
  const texto = valores.join(" ").toLocaleLowerCase("pt-BR");
  return {
    resultado: /\b(\d+[,.]?\d*\s?%|meta[s]?|resultado[s]?|indicador(?:es)?|aument\w*|reduz\w*|cresci\w*|economi\w*|receita|convers[aã]o|venda[s]?)\b/.test(texto),
    tecnico: /\b(excel|sql|python|javascript|sistema[s]?|dados|processo[s]?|planilha[s]?|programa[cç][aã]o|autom[aá]t|an[aá]lis\w*|qualidade|documenta[cç][aã]o)\b/.test(texto),
    pessoas: /\b(equipe|time|lider\w*|pessoa[s]?|trein\w*|gest[aã]o|coordena\w*|mentoria)\b/.test(texto),
    cliente: /\b(cliente[s]?|atendimento|relacionamento|prospec[cç][aã]o|negocia\w*|venda[s]?|consumidor\w*)\b/.test(texto),
    criativo: /\b(criativ\w*|design|conte[uú]do|campanha|marca|comunica[cç][aã]o|redes sociais|briefing)\b/.test(texto),
    pesquisa: /\b(pesquisa|artigo|tcc|inicia[cç][aã]o cient[ií]fica|metodologia|universidade|estudo[s]?)\b/.test(texto),
  };
}

function criarPonte(sinais, foco) {
  if (sinais.resultado) return "O relato também evidencia atenção a resultado concreto e acompanhamento do impacto gerado.";
  if (sinais.tecnico) return "Essa vivência reforçou uma forma de trabalhar estruturada, com atenção a método, processo e qualidade.";
  if (sinais.pessoas) return "A experiência mostra a importância que dou à colaboração, ao alinhamento e à construção de bons resultados com outras pessoas.";
  if (sinais.cliente) return "Esse percurso fortaleceu minha escuta e minha capacidade de transformar necessidades reais em uma contribuição útil.";
  if (sinais.criativo) return "A vivência ampliou meu repertório para conectar contexto, comunicação e soluções relevantes.";
  if (sinais.pesquisa) return "O percurso reforçou meu cuidado com investigação, consistência e construção fundamentada de respostas.";
  return `Essa vivência se conecta diretamente ao foco em ${foco}.`;
}

function criarPonteDiferenciais(sinais, foco) {
  if (sinais.resultado) return "São pontos que ajudam a transformar intenção em impacto acompanhado de perto.";
  if (sinais.tecnico) return "Essas características apoiam uma execução cuidadosa, organizada e confiável.";
  if (sinais.pessoas) return "Elas ajudam a criar relações de trabalho claras e produtivas.";
  if (sinais.cliente) return "Elas sustentam relações de confiança e decisões mais conectadas a quem será atendido.";
  if (sinais.criativo) return "Elas ajudam a unir repertório, intenção e qualidade de execução.";
  if (sinais.pesquisa) return "Elas sustentam uma contribuição rigorosa, curiosa e bem estruturada.";
  return `São pontos que reforçam ${foco}.`;
}

function montarCarta(modeloId, dadosBrutos = {}) {
  const id = PERFIS[modeloId] ? modeloId : "moderna";
  const perfil = PERFIS[id];
  const dados = dadosBrutos && typeof dadosBrutos === "object" ? dadosBrutos : {};
  const nome = textoLimpo(dados.nome, 120) || "Seu nome";
  const empresa = textoLimpo(dados.empresa, 160);
  const cargo = textoLimpo(dados.cargo, 160);
  const destinatario = textoLimpo(dados.destinatario, 120);
  const motivacao = frase(dados.motivacao);
  const experiencia = frase(dados.experiencia);
  const diferenciais = frase(dados.diferenciais);
  const sinais = detectarSinais(motivacao, experiencia, diferenciais, cargo);
  const data = formatarData(dados.dataCarta);
  const oportunidade = cargo && empresa ? `à oportunidade de ${cargo} na ${empresa}` : cargo ? `à posição de ${cargo}` : empresa ? `para integrar a equipe da ${empresa}` : "para a oportunidade em aberto";
  const referenciaOportunidade = empresa ? `na ${empresa}` : "nesta oportunidade";
  const contexto = {
    nome, empresa, cargo, motivacao, experiencia, diferenciais, oportunidade, referenciaOportunidade,
    ponte: (foco) => criarPonte(sinais, foco),
    ponteDiferenciais: (foco) => criarPonteDiferenciais(sinais, foco),
  };
  const paragrafos = [
    perfil.abertura(contexto),
    experiencia ? perfil.experiencia(contexto) : perfil.semExperiencia(contexto),
    diferenciais ? perfil.diferenciais(contexto) : perfil.semDiferenciais(contexto),
  ].filter(Boolean).map((texto, indice) => ({ tipo: ["abertura", "experiencia", "diferenciais"][indice], texto: frase(texto) }));
  const contato = [textoLimpo(dados.email, 160), textoLimpo(dados.telefone, 60), textoLimpo(dados.cidade, 120)].filter(Boolean);
  return {
    modelo: { id, nome: perfil.nome, descricao: perfil.descricao, estilo: { cor: perfil.cor, corSuave: perfil.corSuave, layout: perfil.layout, fonte: perfil.fonte, rotulo: perfil.rotulo } },
    nome, contato, data: data.exibicao, dataISO: data.iso,
    assunto: cargo && empresa ? `Candidatura — ${cargo} | ${empresa}` : cargo ? `Candidatura — ${cargo}` : "Apresentação profissional",
    saudacao: destinatario ? `Prezado(a) ${destinatario},` : "Prezado(a) recrutador(a),",
    paragrafos,
    encerramento: frase(perfil.fechamento(contexto)),
    despedida: id === "networking" ? "Cordialmente," : "Atenciosamente,",
    assinatura: nome,
  };
}

function montarTexto(dados, modeloId = "moderna") {
  return montarCarta(modeloId, dados);
}

function fontePdf(estilo) { return estilo.fonte === "serif" ? "Times-Roman" : "Helvetica"; }
function fontePdfNegrito(estilo) { return estilo.fonte === "serif" ? "Times-Bold" : "Helvetica-Bold"; }

function desenharCabecalhoPDF(doc, carta) {
  const { estilo } = carta.modelo;
  const largura = doc.page.width;
  const altura = doc.page.height;
  const margem = 64;
  const fonte = fontePdf(estilo);
  const negrito = fontePdfNegrito(estilo);
  const contato = carta.contato.join("  |  ");
  if (estilo.layout === "faixa") {
    doc.save().rect(0, 0, largura, 112).fill(estilo.cor).restore();
    doc.font(negrito).fontSize(23).fillColor("#ffffff").text(carta.nome, margem, 34, { width: largura - (margem * 2) });
    doc.font(fonte).fontSize(9).fillColor("#dbeef2").text(contato, margem, 73, { width: largura - (margem * 2) });
    doc.y = 139;
  } else if (estilo.layout === "lateral") {
    doc.save().rect(0, 0, 18, altura).fill(estilo.cor).restore();
    doc.font(negrito).fontSize(22).fillColor(estilo.cor).text(carta.nome, margem, 46);
    doc.font(fonte).fontSize(9).fillColor("#64748b").text(contato, margem, 78, { width: largura - margem - 45 });
    doc.y = 123;
  } else if (estilo.layout === "bloco") {
    doc.save().roundedRect(margem, 38, largura - (margem * 2), 62, 7).fill(estilo.corSuave).restore();
    doc.font(negrito).fontSize(21).fillColor(estilo.cor).text(carta.nome, margem + 16, 52);
    doc.font(fonte).fontSize(9).fillColor("#475569").text(contato, margem + 16, 78, { width: largura - (margem * 2) - 32 });
    doc.y = 128;
  } else {
    doc.font(negrito).fontSize(23).fillColor(estilo.cor).text(carta.nome, margem, 48);
    doc.moveDown(0.25).font(fonte).fontSize(9).fillColor("#64748b").text(contato);
    doc.moveDown(1.4);
  }
}

function gerarCartaPDF(modeloId, dados) {
  const carta = montarCarta(modeloId, dados);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 64 });
    const chunks = [];
    const fonte = fontePdf(carta.modelo.estilo);
    const negrito = fontePdfNegrito(carta.modelo.estilo);
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    desenharCabecalhoPDF(doc, carta);
    doc.font(fonte).fontSize(10).fillColor("#64748b").text(carta.data);
    doc.moveDown(0.55);
    doc.font(negrito).fontSize(9).fillColor(carta.modelo.estilo.cor).text(carta.assunto.toUpperCase());
    doc.moveDown(1.15);
    doc.font(fonte).fontSize(11).fillColor("#1f2937").text(carta.saudacao);
    doc.moveDown(0.8);
    carta.paragrafos.forEach((paragrafo) => {
      doc.font(fonte).fontSize(11).fillColor("#1f2937").text(paragrafo.texto, { lineGap: 5, align: "justify" });
      doc.moveDown(0.75);
    });
    doc.font(fonte).fontSize(11).fillColor("#1f2937").text(carta.encerramento, { lineGap: 5, align: "justify" });
    doc.moveDown(1.2);
    doc.font(fonte).fontSize(11).text(carta.despedida);
    doc.moveDown(1.15);
    doc.font(negrito).fontSize(11).fillColor(carta.modelo.estilo.cor).text(carta.assinatura);
    doc.end();
  });
}

module.exports = { CARTAS, montarCarta, montarTexto, gerarCartaPDF };

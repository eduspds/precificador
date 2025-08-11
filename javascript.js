// =============== BANCO DE DADOS E ESTADO DA APLICAÇÃO ===============
let estoque = [];
let receitaAtual = [];
let outrosCustos = [];
let receitasSalvas = [];

// Carrega tudo do LocalStorage ao iniciar
carregarDadosGerais();

// =============== LÓGICA DE CONVERSÃO ===============
const FATOR_CONVERSAO = {
  g: { base: "g", fator: 1 },
  kg: { base: "g", fator: 1000 },
  ml: { base: "ml", fator: 1 },
  l: { base: "ml", fator: 1000 },
  un: { base: "un", fator: 1 },
  dúzia: { base: "un", fator: 12 },
};

function getPrecoBase(precoTotal, quantidade, unidade) {
  if (!FATOR_CONVERSAO[unidade]) return null;
  const { base, fator } = FATOR_CONVERSAO[unidade];
  const quantidadeBase = quantidade * fator;
  const precoPorUnidadeBase = precoTotal / quantidadeBase;
  return { precoPorUnidadeBase, unidadeBase: base };
}

function converterUnidadeParaBase(quantidade, unidade) {
  return quantidade * (FATOR_CONVERSAO[unidade]?.fator || 0);
}

// =============== GESTÃO DE DADOS (LocalStorage) ===============
function salvarDadosGerais() {
  localStorage.setItem("precificador.estoque", JSON.stringify(estoque));
  localStorage.setItem(
    "precificador.receitasSalvas",
    JSON.stringify(receitasSalvas)
  );
}

function carregarDadosGerais() {
  estoque = JSON.parse(localStorage.getItem("precificador.estoque")) || [];
  receitasSalvas =
    JSON.parse(localStorage.getItem("precificador.receitasSalvas")) || [];
}

// =============== FUNÇÕES DE ESTOQUE ===============
function adicionarIngrediente() {
  const nome = document.getElementById("nomeIngrediente").value.trim();
  const precoTotal = parseFloat(document.getElementById("precoTotal").value);
  const qtd = parseFloat(document.getElementById("quantidadeCompra").value);
  const unidade = document.getElementById("unidadeCompra").value;
  if (!nome || isNaN(precoTotal) || isNaN(qtd) || qtd <= 0) {
    alert("Preencha nome, quantidade e um dos campos de preço corretamente.");
    return;
  }
  const { precoPorUnidadeBase, unidadeBase } = getPrecoBase(
    precoTotal,
    qtd,
    unidade
  );
  estoque.push({ id: Date.now(), nome, precoPorUnidadeBase, unidadeBase });
  salvarDadosGerais();
  renderizarEstoque();
  [
    "nomeIngrediente",
    "precoTotal",
    "quantidadeCompra",
    "precoUnitario",
  ].forEach((id) => (document.getElementById(id).value = ""));
}

function removerIngrediente(id) {
  if (
    !confirm(
      "Tem certeza que deseja remover este ingrediente do estoque? Isso pode afetar receitas salvas."
    )
  )
    return;
  estoque = estoque.filter((item) => item.id !== id);
  salvarDadosGerais();
  renderizarEstoque();
}

// =============== FUNÇÕES DA RECEITA ATUAL ===============
function adicionarIngredienteReceita() {
  const idIngrediente = parseInt(
    document.getElementById("ingredienteSelect").value
  );
  const qtdUsada = parseFloat(document.getElementById("quantidadeUsada").value);
  const unidadeUsada = document.getElementById("unidadeUsada").value;

  if (isNaN(idIngrediente) || isNaN(qtdUsada) || qtdUsada <= 0) {
    alert("Selecione um ingrediente e informe uma quantidade válida.");
    return;
  }

  const ingredienteEstoque = estoque.find((item) => item.id === idIngrediente);
  if (!ingredienteEstoque) {
    alert(
      "Ingrediente não encontrado no estoque. Por favor, recarregue a página se acabou de importá-lo."
    );
    return;
  }

  if (FATOR_CONVERSAO[unidadeUsada].base !== ingredienteEstoque.unidadeBase) {
    alert(
      `Erro de conversão: não é possível usar a unidade "${unidadeUsada}" para um ingrediente medido em "${ingredienteEstoque.unidadeBase}".`
    );
    return;
  }

  const qtdConvertida = converterUnidadeParaBase(qtdUsada, unidadeUsada);
  const custo = qtdConvertida * ingredienteEstoque.precoPorUnidadeBase;

  receitaAtual.push({
    id: Date.now(),
    idEstoque: ingredienteEstoque.id,
    nome: ingredienteEstoque.nome,
    quantidadeUsada: `${qtdUsada} ${unidadeUsada}`,
    custo,
  });
  renderizarReceita();
}

function removerItemReceita(id) {
  if (!confirm("Tem certeza que deseja remover este item da receita?")) return;
  receitaAtual = receitaAtual.filter((item) => item.id !== id);
  renderizarReceita();
}

function adicionarOutroCusto() {
  const nome = document.getElementById("nomeCusto").value.trim();
  const precoTotal = parseFloat(
    document.getElementById("precoTotalCusto").value
  );
  const qtdTotal = parseFloat(document.getElementById("qtdTotalCusto").value);
  const qtdUsada = parseFloat(document.getElementById("qtdUsadaCusto").value);

  if (
    !nome ||
    isNaN(precoTotal) ||
    isNaN(qtdTotal) ||
    isNaN(qtdUsada) ||
    qtdTotal <= 0
  ) {
    alert("Preencha todos os campos de 'Outros Custos' corretamente.");
    return;
  }
  const custo = (precoTotal / qtdTotal) * qtdUsada;
  outrosCustos.push({ id: Date.now(), nome, custo });
  renderizarOutrosCustos();
  ["nomeCusto", "precoTotalCusto", "qtdTotalCusto", "qtdUsadaCusto"].forEach(
    (id) => (document.getElementById(id).value = "")
  );
}

function removerOutroCusto(id) {
  if (!confirm("Tem certeza que deseja remover este custo da receita?")) return;
  outrosCustos = outrosCustos.filter((item) => item.id !== id);
  renderizarOutrosCustos();
}

// =============== FUNÇÕES DO LIVRO DE RECEITAS (FICHAS TÉCNICAS) ===============
function salvarReceita() {
  const nome = document.getElementById("nomeReceita").value.trim();
  if (!nome) {
    alert("Por favor, dê um nome à receita antes de salvar.");
    return;
  }

  const maoDeObra = parseFloat(document.getElementById("maoDeObra").value) || 0;
  const lucro = parseFloat(document.getElementById("lucro").value) || 100;
  const rendimento =
    parseInt(document.getElementById("rendimentoReceita").value) || 1;

  const novaReceitaSalva = {
    id: Date.now(),
    nome,
    ingredientes: JSON.parse(JSON.stringify(receitaAtual)), // Cria uma cópia profunda
    outrosCustos: JSON.parse(JSON.stringify(outrosCustos)), // Cria uma cópia profunda
    modoPreparo: document.getElementById("modoPreparo").value,
    maoDeObra,
    lucro,
    rendimento,
  };

  const indexExistente = receitasSalvas.findIndex(
    (r) => r.nome.toLowerCase() === nome.toLowerCase()
  );
  if (indexExistente > -1) {
    if (
      confirm(`Já existe uma receita chamada "${nome}". Deseja sobrescrevê-la?`)
    ) {
      novaReceitaSalva.id = receitasSalvas[indexExistente].id;
      receitasSalvas[indexExistente] = novaReceitaSalva;
    } else {
      return;
    }
  } else {
    receitasSalvas.push(novaReceitaSalva);
  }

  salvarDadosGerais();
  renderizarReceitasSalvas();
  alert(`Receita "${nome}" salva com sucesso!`);
}

function carregarReceita(id) {
  const receita = receitasSalvas.find((r) => r.id === id);
  if (!receita) return;

  document.getElementById("nomeReceita").value = receita.nome;
  receitaAtual = JSON.parse(JSON.stringify(receita.ingredientes));
  outrosCustos = JSON.parse(JSON.stringify(receita.outrosCustos));
  document.getElementById("modoPreparo").value = receita.modoPreparo;
  document.getElementById("maoDeObra").value = receita.maoDeObra;
  document.getElementById("lucro").value = receita.lucro;
  document.getElementById("rendimentoReceita").value = receita.rendimento;

  renderizarReceita();
  renderizarOutrosCustos();
  window.scrollTo(0, document.body.scrollHeight); // Rola para o final
  alert(`Receita "${receita.nome}" carregada nos campos de edição.`);
}

function excluirReceita(id) {
  if (!confirm("Tem certeza que deseja excluir esta receita permanentemente?"))
    return;
  receitasSalvas = receitasSalvas.filter((r) => r.id !== id);
  salvarDadosGerais();
  renderizarReceitasSalvas();
}

function limparTudo() {
  if (
    !confirm(
      "Tem certeza que deseja limpar todos os campos da receita atual e dos formulários de cadastro?"
    )
  )
    return;

  // Limpa os dados da receita atual
  receitaAtual = [];
  outrosCustos = [];

  // Limpa os campos de texto e reseta os valores numéricos
  document.getElementById("nomeReceita").value = "";
  document.getElementById("modoPreparo").value = "";
  document.getElementById("maoDeObra").value = 0;
  document.getElementById("lucro").value = 100;
  document.getElementById("rendimentoReceita").value = 1;

  // --- ADIÇÃO ---
  // Limpa os campos do formulário de Estoque
  document.getElementById("nomeIngrediente").value = "";
  document.getElementById("quantidadeCompra").value = "";
  document.getElementById("precoUnitario").value = "";
  document.getElementById("precoTotal").value = "";

  // Limpa os campos do formulário de Outros Custos
  document.getElementById("nomeCusto").value = "";
  document.getElementById("precoTotalCusto").value = "";
  document.getElementById("qtdTotalCusto").value = "";
  document.getElementById("qtdUsadaCusto").value = "";

  // Limpa os campos do formulário de Ingredientes da Receita
  document.getElementById("quantidadeUsada").value = "";

  // Renderiza novamente as tabelas vazias e recalcula os totais (que serão zero)
  renderizarReceita();
  renderizarOutrosCustos();
}

// =============== CÁLCULO FINAL ===============
function calcularPrecoFinal() {
  const custoIngredientes = receitaAtual.reduce(
    (acc, item) => acc + item.custo,
    0
  );
  const custoAdicionais = outrosCustos.reduce(
    (acc, item) => acc + item.custo,
    0
  );
  const maoDeObra = parseFloat(document.getElementById("maoDeObra").value) || 0;
  const lucroPercentual =
    parseFloat(document.getElementById("lucro").value) || 0;
  const rendimento =
    parseInt(document.getElementById("rendimentoReceita").value) || 1;

  const custoTotalProducao = custoIngredientes + custoAdicionais + maoDeObra;
  const precoFinal = custoTotalProducao * (1 + lucroPercentual / 100);
  const valorUnidade = rendimento > 0 ? precoFinal / rendimento : 0;

  document.getElementById(
    "custoProducao"
  ).innerText = `R$ ${custoTotalProducao.toFixed(2)}`;
  document.getElementById("precoVenda").innerText = `R$ ${precoFinal.toFixed(
    2
  )}`;
  document.getElementById(
    "valorPorUnidade"
  ).innerText = `R$ ${valorUnidade.toFixed(2)}`;
}

// =============== RENDERIZAÇÃO (VISUAL) ===============
function renderizarTabela(tbodyId, data, colunas, funcaoRemover) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = "";
  data.forEach((item) => {
    const tr = document.createElement("tr");
    colunas.forEach((col) => {
      const td = document.createElement("td");
      td.innerHTML = typeof col === "function" ? col(item) : item[col];
      tr.appendChild(td);
    });
    const acaoTd = document.createElement("td");
    const botaoRemover = document.createElement("button");
    botaoRemover.className = "danger";
    botaoRemover.innerText = "Remover";
    botaoRemover.onclick = () => funcaoRemover(item.id);
    acaoTd.appendChild(botaoRemover);
    tr.appendChild(acaoTd);
    tbody.appendChild(tr);
  });
}

function renderizarEstoque() {
  const select = document.getElementById("ingredienteSelect");
  select.innerHTML = '<option selected disabled value="">Selecione...</option>';
  estoque
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .forEach((ing) => {
      select.innerHTML += `<option value="${ing.id}">${ing.nome}</option>`;
    });
  renderizarTabela(
    "listaIngredientes",
    estoque,
    [
      "nome",
      (item) =>
        `R$ ${item.precoPorUnidadeBase.toFixed(4)} / ${item.unidadeBase}`,
    ],
    removerIngrediente
  );
}

function renderizarReceita() {
  renderizarTabela(
    "listaReceita",
    receitaAtual,
    ["nome", "quantidadeUsada", (item) => `R$ ${item.custo.toFixed(2)}`],
    removerItemReceita
  );
  calcularPrecoFinal();
}

function renderizarOutrosCustos() {
  renderizarTabela(
    "listaOutrosCustos",
    outrosCustos,
    ["nome", (item) => `R$ ${item.custo.toFixed(2)}`],
    removerOutroCusto
  );
  calcularPrecoFinal();
}

function renderizarReceitasSalvas() {
  const tbody = document.getElementById("listaReceitasSalvas");
  tbody.innerHTML = "";
  if (receitasSalvas.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="2">Nenhuma receita salva ainda.</td></tr>';
    return;
  }
  receitasSalvas
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .forEach((receita) => {
      const tr = document.createElement("tr");
      const tdNome = document.createElement("td");
      tdNome.textContent = receita.nome;
      tr.appendChild(tdNome);

      const tdAcoes = document.createElement("td");

      const btnCarregar = document.createElement("button");
      btnCarregar.textContent = "Carregar";
      btnCarregar.onclick = () => carregarReceita(receita.id);

      const btnVisualizar = document.createElement("button");
      btnVisualizar.textContent = "Visualizar";
      btnVisualizar.className = "secondary";
      btnVisualizar.style.marginLeft = "5px";
      btnVisualizar.onclick = () => visualizarFichaTecnica(receita.id);

      const btnExcluir = document.createElement("button");
      btnExcluir.textContent = "Excluir";
      btnExcluir.className = "danger";
      btnExcluir.style.marginLeft = "5px";
      btnExcluir.onclick = () => excluirReceita(receita.id);

      tdAcoes.appendChild(btnCarregar);
      tdAcoes.appendChild(btnVisualizar);
      tdAcoes.appendChild(btnExcluir);
      tr.appendChild(tdAcoes);
      tbody.appendChild(tr);
    });
}

// =============== FICHA TÉCNICA / IMPRESSÃO ===============
function gerarFichaTecnica() {
  visualizarFichaTecnica(null);
}

function visualizarFichaTecnica(id) {
  let receita;
  if (id === null) {
    receita = {
      nome: document.getElementById("nomeReceita").value || "Receita sem nome",
      ingredientes: receitaAtual,
      outrosCustos,
      modoPreparo: document.getElementById("modoPreparo").value,
      maoDeObra: parseFloat(document.getElementById("maoDeObra").value) || 0,
      lucro: parseFloat(document.getElementById("lucro").value) || 100,
      rendimento:
        parseInt(document.getElementById("rendimentoReceita").value) || 1,
    };
  } else {
    receita = receitasSalvas.find((r) => r.id === id);
  }

  if (!receita) return;

  const custoIngredientes = receita.ingredientes.reduce(
    (acc, item) => acc + item.custo,
    0
  );
  const custoAdicionais = receita.outrosCustos.reduce(
    (acc, item) => acc + item.custo,
    0
  );
  const custoTotalProducao =
    custoIngredientes + custoAdicionais + receita.maoDeObra;
  const precoFinal = custoTotalProducao * (1 + receita.lucro / 100);
  const valorUnidade =
    receita.rendimento > 0 ? precoFinal / receita.rendimento : 0;

  let html = `<style>body{font-family:sans-serif;margin:20px}h1,h2{color:#333;border-bottom:2px solid #eee;padding-bottom:5px}table{width:100%;border-collapse:collapse;margin-bottom:20px}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background-color:#f2f2f2}.total{font-weight:bold}.preparo{white-space:pre-wrap;word-wrap:break-word}@media print{button{display:none}}</style><h1>Ficha Técnica: ${
    receita.nome
  }</h1><button onclick="window.print()">Imprimir</button><h2>Ingredientes</h2><table><thead><tr><th>Item</th><th>Quantidade</th><th>Custo</th></tr></thead><tbody>${receita.ingredientes
    .map(
      (item) =>
        `<tr><td>${item.nome}</td><td>${
          item.quantidadeUsada
        }</td><td>R$ ${item.custo.toFixed(2)}</td></tr>`
    )
    .join(
      ""
    )}<tr class="total"><td colspan="2">Custo Total de Ingredientes:</td><td>R$ ${custoIngredientes.toFixed(
    2
  )}</td></tr></tbody></table><h2>Outros Custos</h2><table><thead><tr><th>Item</th><th>Custo</th></tr></thead><tbody>${receita.outrosCustos
    .map(
      (item) =>
        `<tr><td>${item.nome}</td><td>R$ ${item.custo.toFixed(2)}</td></tr>`
    )
    .join(
      ""
    )}<tr class="total"><td colspan="1">Custo Total Adicional:</td><td>R$ ${custoAdicionais.toFixed(
    2
  )}</td></tr></tbody></table><h2>Modo de Preparo</h2><p class="preparo">${
    receita.modoPreparo || "Não informado."
  }</p><h2>Resumo Financeiro</h2><table><tr><td>Custo de Ingredientes:</td><td>R$ ${custoIngredientes.toFixed(
    2
  )}</td></tr><tr><td>Outros Custos:</td><td>R$ ${custoAdicionais.toFixed(
    2
  )}</td></tr><tr><td>Mão de Obra:</td><td>R$ ${receita.maoDeObra.toFixed(
    2
  )}</td></tr><tr class="total"><td>CUSTO TOTAL DE PRODUÇÃO:</td><td>R$ ${custoTotalProducao.toFixed(
    2
  )}</td></tr><tr><td>Margem de Lucro:</td><td>${
    receita.lucro
  }%</td></tr><tr class="total"><td>PREÇO FINAL DE VENDA:</td><td>R$ ${precoFinal.toFixed(
    2
  )}</td></tr><tr><td>Rendimento da Receita:</td><td>${
    receita.rendimento
  } unidades/fatias</td></tr><tr class="total"><td>PREÇO POR UNIDADE/FATIA:</td><td>R$ ${valorUnidade.toFixed(
    2
  )}</td></tr></table>`;
  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
}

// =============== BACKUP (Importar/Exportar) ===============
function exportarDados() {
  const backup = { estoque, receitasSalvas };
  const jsonString = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const dataHoje = new Date().toISOString().slice(0, 10);
  a.download = `backup-precificador-${dataHoje}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  alert("Backup exportado com sucesso! Verifique sua pasta de Downloads.");
}

function importarDados() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target.result);
        if (
          backup &&
          Array.isArray(backup.estoque) &&
          Array.isArray(backup.receitasSalvas)
        ) {
          estoque = backup.estoque;
          receitasSalvas = backup.receitasSalvas;
          salvarDadosGerais();
          renderizarTudo();
          alert("Backup importado com sucesso!");
        } else {
          alert("Erro: Arquivo de backup inválido ou corrompido.");
        }
      } catch (error) {
        alert(
          "Erro ao ler o arquivo de backup. Verifique se o arquivo não está corrompido."
        );
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// =============== INICIALIZAÇÃO E EVENTOS DINÂMICOS ===============
function renderizarTudo() {
  renderizarEstoque();
  renderizarReceita();
  renderizarOutrosCustos();
  renderizarReceitasSalvas();
}

function setupEventListeners() {
  const qtdInput = document.getElementById("quantidadeCompra");
  const unitarioInput = document.getElementById("precoUnitario");
  const totalInput = document.getElementById("precoTotal");
  let isCalculating = false;

  function calcularTotal() {
    if (isCalculating) return;
    isCalculating = true;
    const qtd = parseFloat(qtdInput.value) || 0;
    const unitario = parseFloat(unitarioInput.value) || 0;
    totalInput.value =
      qtd > 0 && unitario > 0 ? (qtd * unitario).toFixed(2) : "";
    isCalculating = false;
  }

  function calcularUnitario() {
    if (isCalculating) return;
    isCalculating = true;
    const qtd = parseFloat(qtdInput.value) || 0;
    const total = parseFloat(totalInput.value) || 0;
    unitarioInput.value = qtd > 0 && total > 0 ? (total / qtd).toFixed(2) : "";
    isCalculating = false;
  }

  qtdInput.addEventListener("input", calcularTotal);
  unitarioInput.addEventListener("input", calcularTotal);
  totalInput.addEventListener("input", calcularUnitario);
}

function init() {
  renderizarTudo();
  setupEventListeners();
}

window.onload = init;

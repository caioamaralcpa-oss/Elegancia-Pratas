const lista = document.querySelector('#produtos');
const status = document.querySelector('#catalogo-status');

fetch('catalogo.json')
  .then(response => {
    if (!response.ok) throw new Error('Falha ao carregar catálogo');
    return response.json();
  })
  .then(produtos => {
    if (!Array.isArray(produtos)) throw new Error('Catálogo inválido');
    if (produtos.length === 0) {
      status.textContent = 'Estamos preparando a coleção. Volte em breve.';
      return;
    }
    status.hidden = true;
    const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    for (const produto of produtos) {
      const card = document.createElement('article');
      card.className = 'produto';
      const imagem = document.createElement('img');
      imagem.src = produto.imagem;
      imagem.alt = produto.nome;
      imagem.loading = 'lazy';
      const nome = document.createElement('h3');
      nome.textContent = produto.nome;
      const preco = document.createElement('p');
      preco.textContent = moeda.format(produto.preco);
      card.append(imagem, nome, preco);
      lista.append(card);
    }
  })
  .catch(() => { status.textContent = 'Não foi possível carregar os produtos agora.'; });

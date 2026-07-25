// Nome de pessoa (brasileiro) — nome + sobrenomes, determinístico.
// Listas estáticas embutidas; sem gênero explícito (mistura comum).

const PRIMEIROS = [
  "Ana", "João", "Maria", "Pedro", "Lucas", "Julia", "Carlos", "Beatriz",
  "Rafael", "Mariana", "Gabriel", "Fernanda", "Bruno", "Camila", "Felipe",
  "Larissa", "Rodrigo", "Patrícia", "Thiago", "Amanda", "Marcos", "Aline",
  "Diego", "Vanessa", "Gustavo", "Priscila", "André", "Renata", "Leonardo",
  "Débora", "Vinícius", "Carla", "Eduardo", "Bianca", "Matheus", "Sabrina",
];

const SOBRENOMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa",
  "Rodrigues", "Almeida", "Nascimento", "Carvalho", "Araújo", "Ribeiro",
  "Gomes", "Martins", "Rocha", "Barbosa", "Alves", "Monteiro", "Cardoso",
  "Correia", "Teixeira", "Fernandes", "Moreira", "Mendes", "Freitas",
];

/**
 * Gera um nome completo determinístico.
 * @param {object} rng
 * @param {{sobrenomes?: number}} [opcoes] - quantidade de sobrenomes (padrão 2)
 */
export function gerarNome(rng, { sobrenomes = 2 } = {}) {
  const partes = [rng.escolher(PRIMEIROS)];
  for (let i = 0; i < Math.max(1, sobrenomes); i++) {
    partes.push(rng.escolher(SOBRENOMES));
  }
  return partes.join(" ");
}

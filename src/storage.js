// Adaptador de persistência sobre chrome.storage — compartilhado por popup e
// service worker. Toda a validação vive em core/config.js (testável); aqui só
// fica a ponte com o chrome.
//
// - Config em chrome.storage.sync (acompanha o usuário entre máquinas).
// - Histórico em chrome.storage.local (volumoso e efêmero; não polui o sync).

import { garantirConfig, normalizarConfig } from "./core/config.js";

const CHAVE_CONFIG = "config";
const CHAVE_HIST = "historico";
const MAX_HIST = 50;

/** Carrega a config, garantindo uma seed válida (persiste se gerar uma nova). */
export async function carregarConfig() {
  const dados = await chrome.storage.sync.get(CHAVE_CONFIG);
  const { config, seedNova } = garantirConfig(dados[CHAVE_CONFIG]);
  if (seedNova) await chrome.storage.sync.set({ [CHAVE_CONFIG]: config });
  return config;
}

/** Salva a config (normalizada) e devolve a versão efetivamente gravada. */
export async function salvarConfig(config) {
  const limpa = normalizarConfig(config);
  await chrome.storage.sync.set({ [CHAVE_CONFIG]: limpa });
  return limpa;
}

/** Atualiza só o contador, preservando o resto da config. */
export async function persistirContador(proximoContador) {
  const cfg = await carregarConfig();
  cfg.contador = proximoContador;
  await chrome.storage.sync.set({ [CHAVE_CONFIG]: cfg });
}

export async function carregarHistorico() {
  const d = await chrome.storage.local.get(CHAVE_HIST);
  return Array.isArray(d[CHAVE_HIST]) ? d[CHAVE_HIST] : [];
}

/** Prepende um item ao histórico, mantendo no máximo MAX_HIST. */
export async function adicionarHistorico(item) {
  const hist = await carregarHistorico();
  hist.unshift(item);
  const cortado = hist.slice(0, MAX_HIST);
  await chrome.storage.local.set({ [CHAVE_HIST]: cortado });
  return cortado;
}

export async function limparHistorico() {
  await chrome.storage.local.set({ [CHAVE_HIST]: [] });
}

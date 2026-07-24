// Geração de texto em 9 idiomas — cada um existe para expor um problema real
// de internacionalização. Arrays estáticos embutidos (sem biblioteca externa).
//
// Por que cada idioma está aqui:
//   pt (português) — baseline latino com acentos/cedilha (NFC vs NFD).
//   es (espanhol)  — 'ñ' e '¿¡'; quebra de palavras e ordenação (ll, ñ).
//   ar (árabe)     — RTL e SHAPING: letras mudam de forma conforme a posição;
//                    quebra layout que assume da esquerda p/ direita.
//   tr (turco)     — 'ı'/'İ' (i sem/ com ponto): toUpperCase()/toLowerCase()
//                    ingênuos corrompem o texto ("i".toUpperCase() != "İ").
//   ru (russo)     — HOMOGLIFOS cirílicos: 'а','е','о','р','с' parecem latinos
//                    mas têm outro code point (pega validação/dedupe frágil).
//   zh (chinês)    — CJK de largura dupla e SEM espaço entre palavras; quebra
//                    truncamento por espaço e cálculo de largura.
//   hi (híndi)     — Devanágari com marcas combinantes (matras): 1 grafema
//                    feito de vários code points; conta/rendering ingênuos falham.
//   ja (japonês)   — mistura kanji/kana, largura dupla, sem espaços.
//   he (hebraico)  — RTL, sem maiúsculas, com niqqud (pontos vocálicos) opcional.

export const IDIOMAS = {
  pt: {
    rotulo: "Português",
    palavras: ["ação", "coração", "manhã", "português", "informação", "você", "não", "então", "após", "código"],
    frases: ["A rápida raposa marrom.", "Configuração salva com sucesso.", "Não foi possível concluir a ação."],
  },
  es: {
    rotulo: "Español",
    palavras: ["niño", "español", "corazón", "acción", "mañana", "señor", "pequeño", "año", "¿qué?", "cigüeña"],
    frases: ["El niño comió una manzana.", "¿Está seguro de continuar?", "¡La operación falló!"],
  },
  ar: {
    rotulo: "العربية",
    palavras: ["مرحبا", "اختبار", "بيانات", "تطبيق", "مستخدم", "كلمة", "صفحة", "خطأ", "تحميل", "إعدادات"],
    frases: ["مرحبا بك في التطبيق.", "تم حفظ الإعدادات بنجاح.", "حدث خطأ غير متوقع."],
  },
  tr: {
    rotulo: "Türkçe",
    palavras: ["kırmızı", "işlem", "İstanbul", "değişiklik", "günaydın", "üzgünüm", "şifre", "ığdır", "açık", "yıl"],
    frases: ["İşlem başarıyla tamamlandı.", "Kırmızı ışıkta durun.", "Şifreniz değiştirildi."],
  },
  ru: {
    rotulo: "Русский",
    palavras: ["привет", "тест", "данные", "ошибка", "страница", "пользователь", "настройки", "загрузка", "пароль", "успех"],
    frases: ["Добро пожаловать в приложение.", "Настройки успешно сохранены.", "Произошла непредвиденная ошибка."],
  },
  zh: {
    rotulo: "中文",
    palavras: ["测试", "数据", "用户", "错误", "页面", "设置", "加载", "成功", "密码", "应用"],
    frases: ["欢迎使用本应用程序。", "设置已成功保存。", "发生了意外错误。"],
  },
  hi: {
    rotulo: "हिन्दी",
    palavras: ["परीक्षण", "डेटा", "उपयोगकर्ता", "त्रुटि", "पृष्ठ", "सेटिंग्स", "लोड", "सफलता", "पासवर्ड", "अनुप्रयोग"],
    frases: ["एप्लिकेशन में आपका स्वागत है।", "सेटिंग्स सफलतापूर्वक सहेजी गईं।", "एक अनपेक्षित त्रुटि हुई।"],
  },
  ja: {
    rotulo: "日本語",
    palavras: ["テスト", "データ", "ユーザー", "エラー", "ページ", "設定", "読み込み", "成功", "パスワード", "アプリ"],
    frases: ["アプリケーションへようこそ。", "設定が正常に保存されました。", "予期しないエラーが発生しました。"],
  },
  he: {
    rotulo: "עברית",
    palavras: ["שלום", "בדיקה", "נתונים", "משתמש", "שגיאה", "עמוד", "הגדרות", "טעינה", "סיסמה", "הצלחה"],
    frases: ["ברוכים הבאים ליישום.", "ההגדרות נשמרו בהצלחה.", "אירעה שגיאה בלתי צפויה."],
  },
};

export const CODIGOS_IDIOMA = Object.keys(IDIOMAS);

/** Idiomas escritos da direita para a esquerda (útil para a UI marcar dir). */
export const RTL = new Set(["ar", "he"]);

function idiomaValido(codigo) {
  const idioma = IDIOMAS[codigo];
  if (!idioma) throw new Error(`Idioma desconhecido: ${codigo}`);
  return idioma;
}

/**
 * Gera N palavras de um idioma, separadas por espaço, de forma determinística.
 * (Chinês/japonês normalmente não usam espaço; aqui separamos para a massa
 * ficar legível na UI — o teste de "sem espaço" continua possível via palavra.)
 */
export function gerarPalavras(rng, codigo, quantidade = 5) {
  const idioma = idiomaValido(codigo);
  const saida = [];
  for (let i = 0; i < quantidade; i++) {
    saida.push(rng.escolher(idioma.palavras));
  }
  return saida.join(" ");
}

/** Escolhe uma frase pronta do idioma, de forma determinística. */
export function gerarFrase(rng, codigo) {
  const idioma = idiomaValido(codigo);
  return rng.escolher(idioma.frases);
}

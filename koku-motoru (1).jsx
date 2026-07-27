import React, { useState } from "react";

const NOTE_TYPES = [
  "Tümü", "Curiosity Tweet", "Hot Take", "Thread Açılışı", "Myth vs Reality",
  "Unpopular Opinion", "Hidden Detail", "Fragrance Psychology", "Luxury Marketing",
  "Designer vs Niche", "Blind Buy Risk", "Compliment Analysis", "Longevity Truth",
  "Projection Myth", "Batch Discussion", "Reformulation", "History",
  "Ingredient Story", "Community Debate", "Best Season", "Who Should Wear It",
  "Who Should Avoid It", "Value for Money", "Comparison Tweet", "Layering Idea",
  "One Interesting Fact", "Did You Know", "Expectation vs Reality",
  "Top 3 Reasons", "Worst Mistake", "Collector Perspective"
];

const SCORE_KEYS = [
  { key: "merak", label: "Merak" },
  { key: "paylasilma", label: "Paylaşılma" },
  { key: "kaydedilme", label: "Kaydedilme" },
  { key: "yorum", label: "Yorum" },
  { key: "takip", label: "Takip" }
];

const BATCH_SIZE = 5;

function buildSystemPrompt() {
  return `Sen bir parfüm içerik stratejistisin. Görevin, verilen ham parfüm verilerinden (Fragrantica, Parfumo, kullanıcı yorumları, Reddit, Basenotes, kişisel notlar) X (Twitter) için yüksek etkileşim alma ihtimali olan ÖZGÜN tweet fikirleri üretmek.

MUTLAK KURAL: Fragrantica veya Parfumo'daki cümleleri asla birebir veya yakın parafraz olarak yeniden yazma. Sadece oradaki bilgileri, iddiaları ve kalıpları analiz edip kendi cümlelerinle, tamamen farklı bir yapıda anlat.

AMAÇ: Tweet insanlara bilgi vermek için değil, insanların timeline'da durup okuması için yazılır. Okuyan kişi "devamını okuyayım", "bu ilginçmiş", "katılmıyorum", "bunu kaydedeyim" ya da "takip edeyim" demeli.

YAZIM KURALLARI:
- Kısa, akıcı, doğal cümleler. Konuşma dili.
- Yapay zeka gibi görünmemeli, satış kokmamalı, ucuz clickbait olmamalı ama merak oluşturmalı.
- Boş övgü YASAK: "harika", "mükemmel", "şaheser", "mutlaka deneyin" gibi ifadeler kullanma.
- Her cümlenin bir işlevi olsun.

PSİKOLOJİK TETİKLEYİCİLER (her tweette bir veya birkaçını kullan, tekrar etme):
- Curiosity Gap: ilk cümle cevabı vermesin, merak yaratsın.
- Unexpected Facts: DNA benzerlikleri, formül değişiklikleri, yasaklı hammaddeler, batch farkları gibi az bilinen detaylar.
- Controversy: topluluğun ikiye bölündüğü konular.
- Cognitive Dissonance: yaygın algıyı tersine çeviren bilgi.
- Storytelling: doğuş hikayesi, parfümörün niyeti, ilk tepki, reformülasyon, topluluk algısı.
- Social Proof: tek tek yorum aktarma, ortak noktayı analiz ederek özetle (örn. "yüzlerce yorumda ortak olan nokta...").
- Authority: parfüm tarihi, rakip karşılaştırmaları, önemini açıkla.

Her tweet için ayrıca şu formatta üç parça üret:
- hook: ilk cümle, en kritik kısım, merak veya iddia içerir.
- govde: asıl içerik, analiz veya hikaye.
- kapanis: insanların yanıt yazmasını sağlayacak doğal bir soru veya çıkarım (satış içermez).

Her tweet için 1-10 arası tahmini skorlar ver: merak, paylasilma, kaydedilme, yorum, takip. Ayrıca "aciklama" alanında bu skorları neden verdiğini kısaca açıkla.

Aynı parfüm için üretilen tweetler birbirine ASLA benzemesin, her biri farklı bir tetikleyici ve farklı bir açıdan yazılsın.

ÇIKTI FORMATI: Sadece geçerli JSON döndür, başka hiçbir açıklama, markdown işareti veya ön/son yazı ekleme. Şu şemaya uy:
{"tweets":[{"tip":"<NOTE_TYPES içinden bir tür>","hook":"...","govde":"...","kapanis":"...","puanlar":{"merak":0,"paylasilma":0,"kaydedilme":0,"yorum":0,"takip":0},"aciklama":"..."}]}`;
}

function buildUserPrompt(data, count, existingHooks) {
  const lines = [
    `Parfüm adı: ${data.name || "-"}`,
    `Marka: ${data.brand || "-"}`,
    `Notalar: ${data.notes || "-"}`,
    `Çıkış yılı: ${data.year || "-"}`,
    `Parfümör: ${data.perfumer || "-"}`,
    `Fragrantica bilgileri: ${data.fragrantica || "-"}`,
    `Parfumo bilgileri: ${data.parfumo || "-"}`,
    `Kullanıcı yorumları: ${data.userComments || "-"}`,
    `Reddit yorumları: ${data.reddit || "-"}`,
    `Basenotes yorumları: ${data.basenotes || "-"}`,
    `Kişisel notlar: ${data.personalNotes || "-"}`
  ].join("\n");

  let prompt = `Aşağıdaki parfüm verilerinden ${count} adet FARKLI tweet fikri üret.\n\n${lines}`;

  if (existingHooks.length > 0) {
    prompt += `\n\nDaha önce şu hook'lar üretildi, bunlarla benzer veya aynı olmasın:\n- ${existingHooks.join("\n- ")}`;
  }

  return prompt;
}

function buildAutoFillSystemPrompt() {
  return `Sen bir parfüm araştırmacısısın. Sana verilen parfüm adı için webde araştırma yapıp (Fragrantica, Parfumo, Reddit, Basenotes ve diğer güvenilir kaynaklar) temel bilgileri ve topluluk algısını ÖZETLEYEREK çıkarıyorsun.

KESİN KURAL: Hiçbir kaynaktan cümleleri birebir veya yakın parafraz olarak kopyalama. Her şeyi kendi cümlelerinle, kısa ve öz şekilde özetle. Tek bir kaynaktan en fazla 15 kelimelik tek bir alıntı kullanabilirsin, o da gerçekten gerekliyse; aksi halde tamamen kendi ifaden.

Marka, notalar, çıkış yılı ve parfümörü doğru ve net bul. Fragrantica ve Parfumo özetlerinde o sitelerdeki genel izlenimi, oy dağılımını (kalıcılık/sillage gibi) ve öne çıkan iddiaları kendi cümlelerinle anlat. Yorum özetinde kullanıcı/Reddit/Basenotes yorumlarında tekrar eden ortak noktaları analiz ederek özetle, tek tek yorum aktarma.

Emin olmadığın bir alanı boş bırak, uydurma bilgi verme.

ÇIKTI FORMATI: Sadece geçerli JSON döndür, başka hiçbir açıklama, markdown işareti veya ön/son yazı ekleme. Şu şemaya uy:
{"marka":"","notalar":"","yil":"","parfumor":"","fragrantica_ozet":"","parfumo_ozet":"","yorum_ozeti":""}`;
}

function buildAutoFillUserPrompt(name) {
  return `Parfüm adı: ${name}\n\nBu parfümü webde araştır ve yukarıdaki şemaya uygun JSON üret.`;
}

async function callClaude(systemPrompt, userPrompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const message = (data.error && data.error.message) || `HTTP ${response.status}`;
    throw new Error(`API hatası: ${message}`);
  }

  const textBlocks = (data.content || []).filter((b) => b.type === "text");
  if (textBlocks.length === 0) throw new Error("Yanıt alınamadı");

  const combined = textBlocks.map((b) => b.text).join("\n");
  const match = combined.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Yanıt JSON formatında değildi.");

  return JSON.parse(match[0]);
}

async function callClaudeWithSearch(systemPrompt, userPrompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }]
    })
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const message = (data.error && data.error.message) || `HTTP ${response.status}`;
    throw new Error(`API hatası: ${message}`);
  }

  const textBlocks = (data.content || []).filter((b) => b.type === "text");
  if (textBlocks.length === 0) {
    throw new Error("Model metin döndürmedi (yalnızca arama adımları geldi).");
  }

  const combined = textBlocks.map((b) => b.text).join("\n");
  const match = combined.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("Yanıt JSON formatında değildi.");
  }

  try {
    return JSON.parse(match[0]);
  } catch (e) {
    throw new Error("JSON ayrıştırılamadı: " + e.message);
  }
}

function ScoreStrip({ puanlar }) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
      {SCORE_KEYS.map(({ key, label }) => {
        const val = Math.max(0, Math.min(10, Number(puanlar?.[key]) || 0));
        return (
          <div key={key} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 34 }}>
            <div
              style={{
                width: 14,
                height: 46,
                borderRadius: 3,
                background: "rgba(199,154,61,0.14)",
                border: "1px solid rgba(199,154,61,0.35)",
                display: "flex",
                alignItems: "flex-end",
                overflow: "hidden"
              }}
              title={`${label}: ${val}/10`}
            >
              <div
                style={{
                  width: "100%",
                  height: `${val * 10}%`,
                  background: "linear-gradient(180deg, #E0B65C, #C79A3D)"
                }}
              />
            </div>
            <span style={{ fontSize: 10, color: "#8C8371", marginTop: 4 }}>{label[0]}</span>
            <span style={{ fontSize: 10, color: "#C79A3D", fontWeight: 600 }}>{val}</span>
          </div>
        );
      })}
    </div>
  );
}

function TweetCard({ tweet, onCopy }) {
  const fullText = `${tweet.hook}\n\n${tweet.govde}\n\n${tweet.kapanis}`;
  return (
    <div
      style={{
        background: "#1F1B15",
        border: "1px solid #35301F",
        borderRadius: 10,
        padding: "16px 18px",
        marginBottom: 14
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span
          style={{
            fontSize: 11,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "#C79A3D",
            border: "1px solid rgba(199,154,61,0.4)",
            borderRadius: 20,
            padding: "3px 10px"
          }}
        >
          {tweet.tip}
        </span>
        <button
          onClick={() => onCopy(fullText)}
          style={{
            background: "transparent",
            border: "1px solid #48412C",
            color: "#D8CDB0",
            borderRadius: 6,
            fontSize: 12,
            padding: "4px 10px",
            cursor: "pointer"
          }}
        >
          Kopyala
        </button>
      </div>

      <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 17, lineHeight: 1.5, color: "#F1E9DC", margin: "0 0 8px" }}>
        {tweet.hook}
      </p>
      <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "#D8CDB0", margin: "0 0 8px", whiteSpace: "pre-wrap" }}>
        {tweet.govde}
      </p>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: "#A69C89", fontStyle: "italic", margin: 0 }}>
        {tweet.kapanis}
      </p>

      <ScoreStrip puanlar={tweet.puanlar} />

      {tweet.aciklama && (
        <p style={{ fontSize: 12.5, color: "#7C7462", marginTop: 10, lineHeight: 1.5, borderTop: "1px solid #2C2819", paddingTop: 8 }}>
          {tweet.aciklama}
        </p>
      )}
    </div>
  );
}

export default function KokuMotoru() {
  const [form, setForm] = useState({
    name: "", brand: "", notes: "", year: "", perfumer: "",
    fragrantica: "", parfumo: "", userComments: "", reddit: "", basenotes: "", personalNotes: ""
  });
  const [count, setCount] = useState(25);
  const [tweets, setTweets] = useState([]);
  const [filterType, setFilterType] = useState("Tümü");
  const [status, setStatus] = useState({ loading: false, done: 0, total: 0, error: "" });
  const [copiedFlash, setCopiedFlash] = useState(false);
  const [autoFill, setAutoFill] = useState({ loading: false, error: "" });

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const canGenerate = form.name.trim().length > 0 && !status.loading;
  const canAutoFill = form.name.trim().length > 0 && !autoFill.loading;

  async function handleAutoFill() {
    setAutoFill({ loading: true, error: "" });
    try {
      const result = await callClaudeWithSearch(buildAutoFillSystemPrompt(), buildAutoFillUserPrompt(form.name));
      setForm((f) => ({
        ...f,
        brand: result.marka || f.brand,
        notes: result.notalar || f.notes,
        year: result.yil || f.year,
        perfumer: result.parfumor || f.perfumer,
        fragrantica: result.fragrantica_ozet || f.fragrantica,
        parfumo: result.parfumo_ozet || f.parfumo,
        userComments: result.yorum_ozeti || f.userComments
      }));
      setAutoFill({ loading: false, error: "" });
    } catch (err) {
      console.error("Bilgileri getir hatası:", err);
      setAutoFill({ loading: false, error: err.message || "Bilgiler getirilemedi, alanları elle doldurabilirsin." });
    }
  }

  async function handleGenerate() {
    setTweets([]);
    setStatus({ loading: true, done: 0, total: count, error: "" });

    const systemPrompt = buildSystemPrompt();
    const collected = [];
    const batches = Math.ceil(count / BATCH_SIZE);

    for (let i = 0; i < batches; i++) {
      const remaining = count - collected.length;
      const thisBatch = Math.min(BATCH_SIZE, remaining);
      if (thisBatch <= 0) break;

      const existingHooks = collected.map((t) => t.hook);
      const userPrompt = buildUserPrompt(form, thisBatch, existingHooks);

      try {
        const result = await callClaude(systemPrompt, userPrompt);
        const batchTweets = Array.isArray(result.tweets) ? result.tweets : [];
        collected.push(...batchTweets);
        setTweets([...collected]);
        setStatus({ loading: true, done: collected.length, total: count, error: "" });
      } catch (err) {
        console.error("Tweet üretme hatası:", err);
        setStatus({ loading: false, done: collected.length, total: count, error: (err.message || "Bir grup üretilirken hata oluştu") + " — mevcut sonuçlarla devam edebilirsin." });
        return;
      }
    }

    setStatus({ loading: false, done: collected.length, total: count, error: "" });
  }

  function handleCopy(text) {
    navigator.clipboard.writeText(text);
    setCopiedFlash(true);
    setTimeout(() => setCopiedFlash(false), 1400);
  }

  function handleCopyAll() {
    const all = tweets.map((t) => `[${t.tip}]\n${t.hook}\n\n${t.govde}\n\n${t.kapanis}`).join("\n\n---\n\n");
    navigator.clipboard.writeText(all);
    setCopiedFlash(true);
    setTimeout(() => setCopiedFlash(false), 1400);
  }

  const visibleTweets = filterType === "Tümü" ? tweets : tweets.filter((t) => t.tip === filterType);

  const inputStyle = {
    width: "100%",
    background: "#171310",
    border: "1px solid #35301F",
    borderRadius: 6,
    color: "#F1E9DC",
    fontSize: 13.5,
    padding: "8px 10px",
    marginTop: 4,
    boxSizing: "border-box",
    fontFamily: "inherit"
  };

  const labelStyle = { fontSize: 12, color: "#A69C89", letterSpacing: "0.02em" };

  return (
    <div
      style={{
        fontFamily: "'Inter', -apple-system, sans-serif",
        background: "#15130F",
        color: "#F1E9DC",
        padding: "32px 28px",
        borderRadius: 14,
        maxWidth: 760,
        margin: "0 auto"
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500&family=Inter:wght@400;500;600&display=swap');
      `}</style>

      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#C79A3D", marginBottom: 6 }}>
          Koku Motoru
        </div>
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500, fontSize: 28, margin: 0, color: "#F1E9DC" }}>
          Parfüm başına 20-30 tweet fikri
        </h1>
        <p style={{ fontSize: 13.5, color: "#8C8371", marginTop: 8, lineHeight: 1.6 }}>
          Sadece parfüm adını yaz ve "Bilgileri getir"e bas — marka, notalar, yıl ve kaynak özetleri otomatik dolar, istersen elle düzenlersin. Fragrantica ve Parfumo'yu asla birebir yazmaz. Paylaşım yok — sadece üretim.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 12 }}>
        <label style={{ ...labelStyle, flex: 1 }}>
          Parfüm adı
          <input style={inputStyle} value={form.name} onChange={update("name")} placeholder="Aventus" />
        </label>
        <button
          onClick={handleAutoFill}
          disabled={!canAutoFill}
          style={{
            height: 34,
            background: "transparent",
            border: "1px solid rgba(199,154,61,0.5)",
            color: canAutoFill ? "#C79A3D" : "#5A5340",
            borderRadius: 6,
            fontSize: 13,
            padding: "0 14px",
            cursor: canAutoFill ? "pointer" : "not-allowed",
            whiteSpace: "nowrap"
          }}
        >
          {autoFill.loading ? "Araştırılıyor…" : "Bilgileri getir"}
        </button>
      </div>
      {autoFill.error && (
        <p style={{ color: "#D4756B", fontSize: 12.5, marginTop: -6, marginBottom: 10 }}>{autoFill.error}</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <label style={labelStyle}>
          Marka
          <input style={inputStyle} value={form.brand} onChange={update("brand")} placeholder="Creed" />
        </label>
        <label style={labelStyle}>
          Notalar
          <input style={inputStyle} value={form.notes} onChange={update("notes")} placeholder="Ananas, huş ağacı, meşe yosunu..." />
        </label>
        <label style={labelStyle}>
          Çıkış yılı
          <input style={inputStyle} value={form.year} onChange={update("year")} placeholder="2010" />
        </label>
        <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
          Parfümör
          <input style={inputStyle} value={form.perfumer} onChange={update("perfumer")} placeholder="Olivier Creed, Erwin Creed" />
        </label>
      </div>

      <label style={labelStyle}>
        Fragrantica bilgileri
        <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.fragrantica} onChange={update("fragrantica")} placeholder="Fragrantica sayfasından notlar, açıklama, kalıcılık/sillage oyları..." />
      </label>
      <div style={{ height: 10 }} />
      <label style={labelStyle}>
        Parfumo bilgileri
        <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.parfumo} onChange={update("parfumo")} placeholder="Parfumo verileri, topluluk notları..." />
      </label>
      <div style={{ height: 10 }} />
      <label style={labelStyle}>
        Kullanıcı yorumları
        <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.userComments} onChange={update("userComments")} placeholder="Fragrantica/Parfumo yorumlarından öne çıkanlar..." />
      </label>
      <div style={{ height: 10 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={labelStyle}>
          Reddit yorumları (opsiyonel)
          <textarea style={{ ...inputStyle, minHeight: 50, resize: "vertical" }} value={form.reddit} onChange={update("reddit")} />
        </label>
        <label style={labelStyle}>
          Basenotes yorumları (opsiyonel)
          <textarea style={{ ...inputStyle, minHeight: 50, resize: "vertical" }} value={form.basenotes} onChange={update("basenotes")} />
        </label>
      </div>
      <div style={{ height: 10 }} />
      <label style={labelStyle}>
        Kişisel notların (opsiyonel)
        <textarea style={{ ...inputStyle, minHeight: 50, resize: "vertical" }} value={form.personalNotes} onChange={update("personalNotes")} />
      </label>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 20, marginBottom: 6 }}>
        <label style={labelStyle}>
          Tweet sayısı
          <select style={{ ...inputStyle, width: 90, marginTop: 4 }} value={count} onChange={(e) => setCount(Number(e.target.value))}>
            <option value={20}>20</option>
            <option value={25}>25</option>
            <option value={30}>30</option>
          </select>
        </label>

        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          style={{
            marginTop: 18,
            background: canGenerate ? "linear-gradient(180deg, #E0B65C, #C79A3D)" : "#3A3424",
            color: canGenerate ? "#15130F" : "#8C8371",
            border: "none",
            borderRadius: 7,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            cursor: canGenerate ? "pointer" : "not-allowed"
          }}
        >
          {status.loading ? `Üretiliyor… (${status.done}/${status.total})` : "Tweetleri üret"}
        </button>

        {tweets.length > 0 && (
          <button
            onClick={handleCopyAll}
            style={{
              marginTop: 18,
              background: "transparent",
              border: "1px solid #48412C",
              color: "#D8CDB0",
              borderRadius: 7,
              padding: "10px 16px",
              fontSize: 13,
              cursor: "pointer"
            }}
          >
            {copiedFlash ? "Kopyalandı" : "Tümünü kopyala"}
          </button>
        )}
      </div>

      {status.error && (
        <p style={{ color: "#D4756B", fontSize: 13, marginTop: 6 }}>{status.error}</p>
      )}

      {tweets.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "24px 0 12px", borderTop: "1px solid #2C2819", paddingTop: 20 }}>
            <span style={{ fontSize: 12, color: "#8C8371" }}>Filtrele</span>
            <select style={{ ...inputStyle, width: 200, marginTop: 0 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              {NOTE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: "#8C8371", marginLeft: "auto" }}>{visibleTweets.length} tweet</span>
          </div>

          {visibleTweets.map((t, i) => (
            <TweetCard key={i} tweet={t} onCopy={handleCopy} />
          ))}
        </>
      )}
    </div>
  );
}

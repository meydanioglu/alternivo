# Alternivo gelir modeli

## Rakipler

| Platform | Ana gelir | Not |
|---|---|---|
| Product Hunt | Sponsorlu lansman/ana sayfa reklamı, newsletter sponsorluğu | Ücretsiz lansman; görünürlük satılıyor |
| There's An AI For That | Featured listing (aylık), hızlı onay, newsletter, sponsorlu kategori | AI dizinlerinde en yaygın model |
| Futurepedia | Ücretli submit / verified, featured, newsletter | |
| AlternativeTo | Display reklam, (eskiden) sponsorlu alternatif | Topluluk sıralaması korunur |
| altern.ai | Ücretsiz submit + Buildboard, makerlar için ücretli öne çıkarma | |
| G2 / Capterra | Satıcı profilleri, lead satışı, PPC | Kurumsal ölçek |

## Alternivo için seçilen model (faz 1, kuruldu)

Ödemeler Freemius üzerinden (merchant of record: KDV/faturalar Freemius'ta). Tüm ücretli yerleşimler etiketlidir ve oyları/puanları değiştirmez.

| Paket | Fiyat (öneri) | Tür | Etkisi |
|---|---|---|---|
| Fast track review | $19 | tek seferlik | Gönderi moderasyon kuyruğunun başına geçer ("Fast track") |
| Launch boost | $29 | tek seferlik | Buildboard haftasında en üste sabitlenir ("Sponsored") |
| Featured listing | $49/ay | abonelik | "Featured" rozeti + ana sayfa featured şeridi |

Submit, açılışa özel ücretsiz kalır; ücretli paketler isteğe bağlıdır.

## Sonraki fazlar

1. Newsletter sponsorluğu (haftalık "yeni AI'lar" e-postası).
2. Sponsorlu kategori sayfası (kategori başına tek, etiketli).
3. Doğrulanmış satıcı profili (claim + analytics) — aylık.
4. Affiliate linkleri (açıkça belirtilmiş).
5. Submit ücretlendirmesi (açılış dönemi bittikten sonra, ör. $9).

## Teknik akış

1. Maker `/maker` sayfasında paketi seçer → Freemius checkout (e-posta hesaba kilitli).
2. Freemius webhook → `https://alternivo.com/bff/billing/freemius` → API imzayı (HMAC-SHA256) doğrular, lisansı `BillingEntitlements` tablosuna yazar.
3. Maker satın alımı kendi ürününe/gönderisine atar; iptal/sona ermede etki otomatik kalkar.

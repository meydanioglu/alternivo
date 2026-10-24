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

## Alternivo için seçilen model (kuruldu, 25 Ekim 2026)

Arayan kullanıcılar için site tamamen ücretsiz. Gelir yazılım üreticilerinden; ödemeler Freemius üzerinden (merchant of record).

| Plan | Fiyat | Tür | Ne sağlar |
|---|---|---|---|
| Free | $0 | sonsuza dek | Ücretsiz gönderim, 15 güne kadar standart inceleme |
| Fast Review | $5 | tek seferlik, gönderi başına | Ödeme onayından itibaren 24 saat içinde inceleme; onay garantisi yok |
| Featured | $9/ay | abonelik | Featured rozeti, kategori sayfalarında sponsorlu rotasyon, ana sayfa şeridi, analitik |
| Growth | $19/ay | abonelik | Featured + rakiplerin alternatif sayfalarında "Sponsored alternative" |

Kampanyalar (sınırlı envanter, admin onaylı):

| Yerleşim | Fiyat | Süre | Aynı anda |
|---|---|---|---|
| Homepage Spotlight | $5 | 7 gün | 3 (site geneli) |
| Category Sponsorship | $7 | 7 gün | kategori başına 2 |
| Competitor Page Sponsorship | $9 | 7 gün | rakip sayfa başına 1 |
| Sponsored Alternative Card | $15 | 30 gün | rakip sayfa başına 1 |
| Custom Promotion | $29'dan | elle teklif | — |

İlk 100 Featured/Growth müşterisi "founding vendor" olarak kaydedilir; abonelik kesintisiz sürdükçe fiyat Freemius'ta sabit kalır.

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

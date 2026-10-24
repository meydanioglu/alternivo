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

Arayan kullanıcılar için site tamamen ücretsiz. Gelir yazılım üreticilerinden; ödemeler PayTR iFrame API ile (kartla tek seferlik ödeme).

| Plan | Fiyat | Tür | Ne sağlar |
|---|---|---|---|
| Free | $0 | sonsuza dek | Ücretsiz gönderim, 15 güne kadar standart inceleme |
| Fast Review | $5 | tek seferlik, gönderi başına | Ödeme onayından itibaren 24 saat içinde inceleme; onay garantisi yok |
| Featured | $9 / 30 gün | ön ödemeli dönem (otomatik yenilenmez) | Featured rozeti, kategori sayfalarında sponsorlu rotasyon, ana sayfa şeridi, analitik |
| Growth | $19 / 30 gün | ön ödemeli dönem (otomatik yenilenmez) | Featured + rakiplerin alternatif sayfalarında "Sponsored alternative" |

Kampanyalar (sınırlı envanter, admin onaylı):

| Yerleşim | Fiyat | Süre | Aynı anda |
|---|---|---|---|
| Homepage Spotlight | $5 | 7 gün | 3 (site geneli) |
| Category Sponsorship | $7 | 7 gün | kategori başına 2 |
| Competitor Page Sponsorship | $9 | 7 gün | rakip sayfa başına 1 |
| Sponsored Alternative Card | $15 | 30 gün | rakip sayfa başına 1 |
| Custom Promotion | $29'dan | elle teklif | — |

İlk 100 Featured/Growth müşterisi "founding vendor" olarak kaydedilir; dönemler kesintisiz yenilendikçe kaydı korunur. Fiyatlar ve para birimi Admin → Ayarlar'dan belirlenir.

## Sonraki fazlar

1. Newsletter sponsorluğu (haftalık "yeni AI'lar" e-postası).
2. Sponsorlu kategori sayfası (kategori başına tek, etiketli).
3. Doğrulanmış satıcı profili (claim + analytics) — aylık.
4. Affiliate linkleri (açıkça belirtilmiş).
5. Submit ücretlendirmesi (açılış dönemi bittikten sonra, ör. $9).

## Teknik akış (PayTR)

1. Maker satın almayı başlatır → API sahiplik/uygunluk ve fiyatı sunucuda doğrular, `PaymentOrders` kaydı (merchant_oid) oluşturur, PayTR `get-token` ile iFrame token alır.
2. `/maker/pay/{orderId}` sayfasında PayTR iFrame'i açılır; kart bilgisi yalnızca PayTR'ye gider.
3. PayTR Bildirim URL → `https://alternivo.com/bff/billing/paytr` → API hash'i doğrular (HMAC-SHA256), siparişi bir kez "Paid" yapar ve "OK" döner; tekrarlanan bildirimler etkisizdir.
4. Ödenen siparişten hak (entitlement) oluşur: Fast Review öncelik + 24 saat, Featured/Growth 30 gün (uzatılabilir), kampanya → admin onayı.
5. İade PayTR panelinden yapılır, sonra Admin → Ödemeler'de "İade edildi" işaretlenir.

Not: PayTR'nin standart iFrame API'sinde otomatik aylık tahsilat yok; gerekirse PayTR "Kart Saklama / Tekrarlayan Ödeme" API'si ayrıca başvurulup eklenebilir.

import React from 'react';
import { ArrowLeft, ShieldCheck, FileText } from 'lucide-react';

interface LegalPageProps {
  page: 'privacy' | 'terms';
  onBack: () => void;
  onSwitchPage: (page: 'privacy' | 'terms') => void;
}

export const LegalPages: React.FC<LegalPageProps> = ({
  page,
  onBack,
  onSwitchPage,
}) => {
  const isPrivacy = page === 'privacy';

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#0B0E14]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#161B26] px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-white/20 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>VidPro Paneline Dön</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSwitchPage('privacy')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                isPrivacy
                  ? 'bg-[#2563EB]/20 text-[#38BDF8] border border-[#38BDF8]/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Gizlilik Politikası
            </button>
            <button
              type="button"
              onClick={() => onSwitchPage('terms')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                !isPrivacy
                  ? 'bg-[#2563EB]/20 text-[#38BDF8] border border-[#38BDF8]/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Hizmet Şartları
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <article className="rounded-xl border border-white/[0.08] bg-[#161922] p-6 sm:p-10 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/[0.08] pb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563EB]/15 text-[#38BDF8]">
              {isPrivacy ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white">
                {isPrivacy ? 'VidPro Gizlilik Politikası (Privacy Policy)' : 'VidPro Hizmet Şartları (Terms of Service)'}
              </h1>
              <p className="mt-0.5 text-xs text-slate-400">
                Son güncelleme: 25 Kasım 2026 · https://vidpro-two.vercel.app
              </p>
            </div>
          </div>

          {isPrivacy ? (
            <div className="space-y-5 text-sm leading-relaxed text-slate-300">
              <section className="space-y-2">
                <h2 className="font-display text-base font-bold text-white">1. Genel Bakış</h2>
                <p>
                  VidPro (&quot;Uygulama&quot;), YouTube içerik üreticilerinin kanal performanslarını, anahtar kelime fırsatlarını, video SEO metriklerini ve içerik stratejilerini analiz etmelerine yardımcı olan bir analiz platformudur. Kullanıcı gizliliği ve veri güvenliği önceliğimizdir.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="font-display text-base font-bold text-white">2. Toplanan ve Erişilen Veriler</h2>
                <p>
                  Google ile giriş yaptığınızda yalnızca açık onayınızla aşağıdaki salt okunur (read-only) izinlere erişilir:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                  <li>Google temel profil bilgileri (ad, e-posta adresi, profil fotoğrafı).</li>
                  <li>YouTube Data API v3 (`youtube.readonly`): Bağlı kanalınızın adı, abone sayısı, video listesi ve istatistikleri.</li>
                  <li>YouTube Analytics API (`yt-analytics.readonly`): Son 28 günlük izlenme, izlenme süresi ve abone değişim verileri.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="font-display text-base font-bold text-white">3. Verilerin Kullanımı ve Saklanması</h2>
                <p>
                  Erişilen YouTube kanal verileri yalnızca sizin oturumunuz boyunca VidPro paneli içinde analizlerin ve grafiklerin görüntülenmesi amacıyla kullanılır. Kaydedilen video fikirleri ve rakip kanal listeleri yalnızca kendi tarayıcınızın yerel depolamasında (`localStorage`) tutulur. Verileriniz üçüncü taraflara satılmaz, kiralanmaz ve reklam hedeflemesi için kullanılmaz.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="font-display text-base font-bold text-white">4. Google API Hizmetleri Kullanıcı Veri Politikası (Limited Use)</h2>
                <p>
                  VidPro&apos;nun Google API&apos;lerinden elde ettiği bilgilerin kullanımı ve başka uygulamalara aktarımı, Sınırlı Kullanım (Limited Use) gereklilikleri de dahil olmak üzere{' '}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#38BDF8] underline hover:text-white"
                  >
                    Google API Services User Data Policy
                  </a>{' '}
                  kurallarına tamamen uygundur.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="font-display text-base font-bold text-white">5. İzinleri Kaldırma ve İletişim</h2>
                <p>
                  VidPro&apos;nun Google ve YouTube hesabınıza erişimini istediğiniz zaman{' '}
                  <a
                    href="https://myaccount.google.com/permissions"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#38BDF8] underline hover:text-white"
                  >
                    Google Hesap İzinleri
                  </a>{' '}
                  sayfasından iptal edebilirsiniz. Sorularınız için{' '}
                  <a href="mailto:zefircraftmc@gmail.com" className="text-[#38BDF8] underline hover:text-white">
                    zefircraftmc@gmail.com
                  </a>{' '}
                  adresinden bize ulaşabilirsiniz.
                </p>
              </section>
            </div>
          ) : (
            <div className="space-y-5 text-sm leading-relaxed text-slate-300">
              <section className="space-y-2">
                <h2 className="font-display text-base font-bold text-white">1. Hizmetin Kapsamı</h2>
                <p>
                  VidPro, YouTube içerik üreticileri için kanal istatistikleri, anahtar kelime araştırması, SEO optimizasyonu ve video fikri üretimi araçları sunar. Uygulamayı kullanarak bu hizmet şartlarını kabul etmiş olursunuz.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="font-display text-base font-bold text-white">2. YouTube Hizmet Şartları Uyumu</h2>
                <p>
                  VidPro, YouTube API Hizmetlerini kullanmaktadır. Bu uygulamayı kullanarak{' '}
                  <a
                    href="https://www.youtube.com/t/terms"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#38BDF8] underline hover:text-white"
                  >
                    YouTube Hizmet Şartları (YouTube Terms of Service)
                  </a>{' '}
                  ile{' '}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#38BDF8] underline hover:text-white"
                  >
                    Google Gizlilik Politikası
                  </a>{' '}
                  hükümlerine de tabi olursunuz.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="font-display text-base font-bold text-white">3. Kullanıcı Sorumlulukları</h2>
                <p>
                  Kullanıcılar, VidPro üzerinden elde ettikleri analiz ve içerik önerilerini kendi sorumluluklarında kullanır ve YouTube Topluluk Kuralları ile telif haklarına uymakla yükümlüdür. Uygulama kanalınız adına otomatik video yükleme, silme veya değişiklik yapmaz.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="font-display text-base font-bold text-white">4. Sorumluluk Reddi ve Değişiklikler</h2>
                <p>
                  VidPro, YouTube API hizmetlerindeki kesintilerden veya üçüncü taraf veri gecikmelerinden kaynaklanabilecek durumlardan sorumlu değildir. Hizmet şartları gerektiğinde güncellenebilir.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="font-display text-base font-bold text-white">5. İletişim</h2>
                <p>
                  Hizmet şartları ile ilgili her türlü talep için{' '}
                  <a href="mailto:zefircraftmc@gmail.com" className="text-[#38BDF8] underline hover:text-white">
                    zefircraftmc@gmail.com
                  </a>{' '}
                  üzerinden iletişime geçebilirsiniz.
                </p>
              </section>
            </div>
          )}
        </article>
      </main>
    </div>
  );
};

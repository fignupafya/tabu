const RULES = [
  'Takımlar sırayla oynar; her takımın sırasında oyuncularından biri anlatır, takım arkadaşları tahmin eder. Anlatıcı her sırada değişir. Bütün takımlar birer kez oynayınca bir tur tamamlanır.',
  'Anlatıcı kartın üstündeki kelimeyi, altındaki yasaklı kelimeleri kullanmadan anlatır. Kelimenin kendisi ve yasaklıların türevleri de yasaktır.',
  'El kol hareketi, ses taklidi, "… ile başlar / kafiyelidir" gibi ipuçları ve başka dilde söylemek yasaktır.',
  'Karşı takımdan biri kartı anlatıcıyla birlikte görür ve yasaklı kelime söylenirse "Tabu!" der.',
  'Doğru tahmin bir doğru, yasaklı kelime bir yanlış (tabu) olarak ayrı ayrı sayılır. Pas puanı etkilemez ama pas hakkı sınırlıdır.',
  'Süre bitince özet ekranı açılır: son saniyede bilinen ya da yanlış işaretlenen kartı orada düzeltebilirsiniz.',
  'Tüm turlar bitince toplam skoru (doğru − yanlış) en yüksek olan takım kazanır.',
];

export function Rules() {
  return (
    <details className="group mt-10 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <summary className="cursor-pointer list-none text-lg font-black">
        Nasıl oynanır? <span className="text-slate-400 group-open:hidden">+</span>
      </summary>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {RULES.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ol>
    </details>
  );
}

/** Plain explanation of where data lives and what browser storage can't promise. */
export function PrivacyNote() {
  return (
    <div className="privacy-note">
      <p>
        <strong>Semua date kesimpan di perangkat ini aja.</strong> Nggak ada akun, server, atau data yang dikirim ke mana-mana.
        Google Maps baru kebuka kalau kamu tekan tombolnya.
      </p>
      <p className="eyebrow">Yang perlu kamu tahu</p>
      <ul>
        <li>Datanya cuma ada di browser & HP ini, nggak sinkron ke perangkat lain.</li>
        <li>Hapus data browser atau mode incognito = datanya ikut hilang.</li>
        <li>Beberapa browser (misalnya Safari) bisa menghapus data situs yang lama nggak dibuka.</li>
        <li>Kapasitasnya terbatas (sekitar 5 MB).</li>
      </ul>
      <p>Rajin-rajin simpan cadangan ya ♡</p>
    </div>
  );
}
